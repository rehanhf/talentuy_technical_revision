from datetime import datetime

import httpx
import pytest

from app.config import settings
from app.connectors import twitterapi_io as module
from app.connectors.official_x import ConnectorUnavailable
from app.connectors.twitterapi_io import TwitterApiIoConnector
from app.database import SessionLocal
from app.models import Post
from sqlalchemy import select


def tweet(i):
    return {"id": str(i), "text": "Lowongan kerja admin gudang", "createdAt": "Wed Sep 23 02:00:00 +0000 2026",
            "lang": "in", "likeCount": 5, "retweetCount": 2, "replyCount": 1, "quoteCount": 0,
            "author": {"userName": "not_stored"}}


def mock_provider(monkeypatch, handler):
    monkeypatch.setattr(settings, "twitterapi_io_key", "test-key")
    original = httpx.Client
    monkeypatch.setattr(module.httpx, "Client", lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))


def test_one_page_mapping_and_request(monkeypatch):
    calls = []
    def handler(request):
        calls.append(request)
        assert request.headers["X-API-Key"] == "test-key"
        assert request.url.params["queryType"] == "Latest"
        assert "(loker OR gudang) lang:in -filter:retweets since_time:" in request.url.params["query"]
        return httpx.Response(200, json={"tweets": [tweet(i) for i in range(20)], "has_next_page": True, "next_cursor": "next"})
    mock_provider(monkeypatch, handler)
    posts = TwitterApiIoConnector().fetch(query="loker OR gudang")
    assert len(calls) == 1
    assert len(posts) == 20
    assert posts[0].created_at_source == datetime(2026, 9, 23, 2)
    assert posts[0].source == "twitterapi_io"
    assert posts[0].is_synthetic is False
    assert posts[0].author_public_id is None
    assert posts[0].like_count == 5
    assert posts[0].language == "id"


def test_short_pages_are_bounded_and_duplicates_removed(monkeypatch):
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(200, json={"tweets": [tweet(1)], "has_next_page": True, "next_cursor": str(len(calls))})
    mock_provider(monkeypatch, handler)
    assert len(TwitterApiIoConnector().fetch(query="loker", max_results=50)) == 1
    assert len(calls) == 3
    assert calls[1].url.params["cursor"] == "1"


@pytest.mark.parametrize("status", [401, 402, 403, 429, 500])
def test_provider_errors_do_not_leak_body_or_retry(monkeypatch, status):
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(status, text="secret-provider-body")
    mock_provider(monkeypatch, handler)
    with pytest.raises(ConnectorUnavailable) as exc:
        TwitterApiIoConnector().fetch(query="loker")
    assert str(status) in str(exc.value)
    assert "secret-provider-body" not in str(exc.value)
    assert len(calls) == 1


def test_invalid_response(monkeypatch):
    mock_provider(monkeypatch, lambda request: httpx.Response(200, json={"unexpected": []}))
    with pytest.raises(ConnectorUnavailable, match="Format"):
        TwitterApiIoConnector().fetch(query="loker")


def test_provider_selection_and_ingestion(client, admin_headers, monkeypatch):
    monkeypatch.setattr(settings, "x_api_provider", "twitterapi_io")
    monkeypatch.setattr(settings, "twitterapi_io_key", None)
    monkeypatch.setattr(settings, "x_api_bearer_token", "official-only")
    assert settings.live_mode_available is False
    assert client.post('/data/fetch-live', params={'query': 'loker'}, headers=admin_headers).status_code == 409
    monkeypatch.setattr(settings, "twitterapi_io_key", "test-key")
    posts = [module.RawPost(external_post_id="provider-integration-test", text="lowongan admin gudang", created_at_source=datetime(2026, 9, 23), source="twitterapi_io", is_synthetic=False)]
    monkeypatch.setattr(TwitterApiIoConnector, "fetch", lambda self, **kwargs: posts)
    for expected in [1, 0]:
        result = client.post('/data/fetch-live', params={'query': 'loker'}, headers=admin_headers)
        assert result.status_code == 200
        assert result.json()['records_processed'] == expected
    with SessionLocal() as db:
        post = db.scalar(select(Post).where(Post.external_post_id == "provider-integration-test"))
        assert post.source == "twitterapi_io"
        assert post.is_synthetic is False
        assert post.analysis is not None
    response = client.get('/data/connectors', headers=admin_headers)
    assert response.json()['provider'] == 'twitterapi_io'
    assert response.json()['live_available'] is True
    assert 'test-key' not in response.text

    # Real and demo data must remain separable even when the application runs in demo mode.
    params = {'date_from': '2026-09-01', 'date_to': '2026-09-30', 'data_type': 'twitterapi_io'}
    result = client.get('/posts', params=params, headers=admin_headers)
    assert result.status_code == 200
    assert result.json()['total'] == 1
    assert all(p['source'] == 'twitterapi_io' and not p['is_synthetic'] for p in result.json()['items'])
    assert result.json()['meta']['is_synthetic'] is False
    assert result.json()['meta']['applied_filters']['data_type'] == 'twitterapi_io'
    real = client.get('/posts', params={**params, 'data_type': 'real'}, headers=admin_headers).json()
    assert all(not p['is_synthetic'] for p in real['items'])
    demo = client.get('/posts', params={**params, 'data_type': 'demo'}, headers=admin_headers).json()
    assert all(p['is_synthetic'] for p in demo['items'])
    overview = client.get('/dashboard/overview', params=params, headers=admin_headers)
    assert overview.status_code == 200
    assert overview.json()['meta']['record_count'] == 1
    assert overview.json()['meta']['is_synthetic'] is False
    assert client.get('/posts', params={'data_type': 'invalid'}, headers=admin_headers).status_code == 422


def test_official_connector_groups_or_query_before_filters(monkeypatch):
    """Tanpa kurung, X membaca `a OR b lang:id` sebagai `a OR (b lang:id)`."""
    from app.connectors import official_x
    from app.connectors.official_x import OfficialXApiConnector

    seen = []

    def handler(request):
        seen.append(request.url.params["query"])
        return httpx.Response(200, json={"data": []})

    monkeypatch.setattr(settings, "x_api_bearer_token", "official-test")
    original = httpx.Client
    monkeypatch.setattr(
        official_x.httpx,
        "Client",
        lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs),
    )
    OfficialXApiConnector().fetch(query='"gaji telat" OR "potong gaji"')
    assert seen == ['("gaji telat" OR "potong gaji") lang:id -is:retweet']
