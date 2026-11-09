"""OfficialXApiConnector — hanya aktif bila bearer token tersedia di server.

Connector ini memanggil endpoint pencarian resmi X API v2. Tidak ada scraping
dan token tidak pernah dikirim ke frontend. Bila credential tidak tersedia,
aplikasi tetap berjalan penuh memakai MockXConnector.
"""

from __future__ import annotations

from datetime import datetime, timedelta

import httpx

from app.timeutil import utcnow
from app.config import settings
from app.connectors.base import RawPost, SocialDataConnector

SEARCH_ENDPOINT = "https://api.x.com/2/tweets/search/recent"


class ConnectorUnavailable(Exception):
    pass


class OfficialXApiConnector(SocialDataConnector):
    name = "official_x_api"
    label = "X API Resmi"
    description = (
        "Terhubung ke endpoint pencarian resmi X. Aktif hanya jika "
        "X_API_BEARER_TOKEN diisi pada environment server."
    )

    @property
    def is_available(self) -> bool:
        return bool(settings.x_api_bearer_token)

    def fetch(
        self,
        *,
        query: str = "",
        max_results: int = 100,
        days: int = 7,
        **_kwargs,
    ) -> list[RawPost]:
        if not self.is_available:
            raise ConnectorUnavailable(
                "Credential X API belum tersedia. Aplikasi tetap dapat digunakan "
                "pada mode demo."
            )
        if not query.strip():
            raise ConnectorUnavailable("Query pencarian wajib diisi untuk mode live.")

        start_time = (utcnow() - timedelta(days=min(days, 7))).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
        params = {
            "query": f"({query.strip()}) lang:id -is:retweet",
            "max_results": str(min(max(max_results, 10), 100)),
            "start_time": start_time,
            "tweet.fields": "created_at,public_metrics,lang",
        }
        headers = {"Authorization": f"Bearer {settings.x_api_bearer_token}"}

        with httpx.Client(timeout=20.0) as client:
            response = client.get(SEARCH_ENDPOINT, params=params, headers=headers)
        if response.status_code != 200:
            raise ConnectorUnavailable(
                f"X API menolak permintaan (HTTP {response.status_code})."
            )

        payload = response.json().get("data", [])
        posts: list[RawPost] = []
        for item in payload:
            metrics = item.get("public_metrics", {})
            posts.append(
                RawPost(
                    external_post_id=str(item["id"]),
                    text=item.get("text", ""),
                    created_at_source=datetime.fromisoformat(
                        item["created_at"].replace("Z", "+00:00")
                    ).replace(tzinfo=None),
                    language=item.get("lang", "id"),
                    # Username sengaja tidak disimpan (minimalisasi data pribadi).
                    author_public_id=None,
                    like_count=int(metrics.get("like_count", 0)),
                    repost_count=int(metrics.get("retweet_count", 0)),
                    reply_count=int(metrics.get("reply_count", 0)),
                    quote_count=int(metrics.get("quote_count", 0)),
                    url=None,
                    is_synthetic=False,
                    source="x_api",
                )
            )
        return posts


def available_connectors() -> list[SocialDataConnector]:
    from app.connectors.csv_import import CsvImportConnector
    from app.connectors.mock_x import MockXConnector
    from app.connectors.x_public_embed import XPublicEmbedConnector

    from app.connectors.twitterapi_io import TwitterApiIoConnector

    return [
        TwitterApiIoConnector(),
        MockXConnector(),
        CsvImportConnector(),
        XPublicEmbedConnector(),
        OfficialXApiConnector(),
    ]
