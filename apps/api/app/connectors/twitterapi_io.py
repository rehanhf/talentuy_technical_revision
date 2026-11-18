"""Read public posts through twitterapi.io with a bounded request budget."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from math import ceil

import httpx

from app.config import settings
from app.connectors.base import RawPost, SocialDataConnector
from app.connectors.official_x import ConnectorUnavailable

SEARCH_ENDPOINT = "https://api.twitterapi.io/twitter/tweet/advanced_search"
REPLIES_ENDPOINT = "https://api.twitterapi.io/twitter/tweet/replies"

_HTTP_HINTS = {401: "API key tidak valid.", 403: "Akses ditolak.",
               402: "Kredit tidak cukup.", 429: "Batas permintaan tercapai; coba lagi nanti."}


def _to_raw_post(item: dict) -> RawPost:
    """Ubah satu objek tweet twitterapi.io menjadi RawPost.

    Hanya ID post induk (``inReplyToId``) yang diambil untuk balasan; field
    ``inReplyToUsername`` sengaja diabaikan agar username tidak tersimpan.
    """
    post_id = str(item["id"])
    created = item["createdAt"]
    try:
        timestamp = datetime.fromisoformat(created.replace("Z", "+00:00"))
    except ValueError:
        timestamp = parsedate_to_datetime(created)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    parent = item.get("inReplyToId")
    return RawPost(
        external_post_id=post_id,
        text=item["text"],
        created_at_source=timestamp.astimezone(timezone.utc).replace(tzinfo=None),
        language="id" if item.get("lang") in ("in", "id", None, "") else item["lang"],
        author_public_id=None,
        like_count=max(0, int(item.get("likeCount") or 0)),
        repost_count=max(0, int(item.get("retweetCount") or 0)),
        reply_count=max(0, int(item.get("replyCount") or 0)),
        quote_count=max(0, int(item.get("quoteCount") or 0)),
        url=f"https://x.com/i/status/{post_id}",
        is_synthetic=False,
        source="twitterapi_io",
        in_reply_to_external_id=str(parent) if parent else None,
    )


def _raise_for_status(response: httpx.Response) -> None:
    if response.status_code != 200:
        raise ConnectorUnavailable(
            f"twitterapi.io HTTP {response.status_code}. "
            + _HTTP_HINTS.get(response.status_code, "Provider belum dapat melayani permintaan."))


class TwitterApiIoConnector(SocialDataConnector):
    name = "twitterapi_io"
    label = "twitterapi.io (pihak ketiga)"
    description = "Pencarian post X melalui twitterapi.io. Credential hanya disimpan di server."
    supports_replies = True

    @property
    def is_available(self) -> bool:
        return bool(settings.twitterapi_io_key)

    def _paginate(self, endpoint: str, params: dict, limit: int,
                  *, skip_id: str | None = None) -> list[RawPost]:
        posts: list[RawPost] = []
        seen_ids: set[str] = set()
        seen_cursors: set[str] = set()
        try:
            with httpx.Client(timeout=25.0) as client:
                # No retries: each page can consume credits, even when it is short.
                for _ in range(ceil(limit / 20)):
                    response = client.get(endpoint, params=params,
                                          headers={"X-API-Key": settings.twitterapi_io_key})
                    _raise_for_status(response)
                    payload = response.json()
                    items = payload.get("tweets") if isinstance(payload, dict) else None
                    if items is None and isinstance(payload, dict):
                        items = payload.get("replies")
                    if not isinstance(items, list):
                        raise ValueError("Invalid tweets response")
                    for item in items:
                        raw = _to_raw_post(item)
                        if raw.external_post_id in seen_ids or raw.external_post_id == skip_id:
                            continue
                        posts.append(raw)
                        seen_ids.add(raw.external_post_id)
                        if len(posts) >= limit:
                            return posts
                    cursor = payload.get("next_cursor")
                    if not payload.get("has_next_page") or not cursor or cursor in seen_cursors:
                        break
                    seen_cursors.add(cursor)
                    params["cursor"] = cursor
        except httpx.RequestError:
            raise ConnectorUnavailable("Tidak dapat terhubung ke twitterapi.io. Coba lagi nanti.") from None
        except (ValueError, TypeError, KeyError, AttributeError, OverflowError):
            raise ConnectorUnavailable("Format respons twitterapi.io tidak valid; data belum diimpor.") from None
        return posts

    def fetch(self, *, query: str = "", max_results: int = 20, days: int = 7, **_kwargs) -> list[RawPost]:
        if not self.is_available:
            raise ConnectorUnavailable("TWITTERAPI_IO_KEY belum tersedia pada server.")
        if not query.strip():
            raise ConnectorUnavailable("Query pencarian wajib diisi.")
        limit = min(max(max_results, 1), 100)
        since = int((datetime.now(timezone.utc) - timedelta(days=min(max(days, 1), 7))).timestamp())
        params = {
            "query": f"({query.strip()}) lang:in -filter:retweets since_time:{since}",
            "queryType": "Latest",
            "cursor": "",
        }
        return self._paginate(SEARCH_ENDPOINT, params, limit)

    def fetch_replies(self, parent_external_id: str, *, max_results: int = 20) -> list[RawPost]:
        """Balasan publik untuk satu post; setiap balasan menyimpan ID induknya."""
        if not self.is_available:
            raise ConnectorUnavailable("TWITTERAPI_IO_KEY belum tersedia pada server.")
        limit = min(max(max_results, 1), 100)
        params = {"tweetId": parent_external_id, "cursor": ""}
        replies = self._paginate(REPLIES_ENDPOINT, params, limit, skip_id=parent_external_id)
        for reply in replies:
            # Endpoint balasan menjamin relasi ini walau inReplyToId kosong.
            reply.in_reply_to_external_id = reply.in_reply_to_external_id or parent_external_id
        return replies
