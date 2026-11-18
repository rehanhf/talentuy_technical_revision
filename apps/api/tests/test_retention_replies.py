"""Uji retensi data nyata (relevan 90 hari / tidak relevan 14 hari) dan balasan (induk_id)."""

from __future__ import annotations

from datetime import datetime, timedelta

import httpx
from sqlalchemy import select

from app.config import settings
from app.connectors import official_x
from app.connectors import twitterapi_io as tio
from app.connectors.base import RawPost
from app.connectors.official_x import OfficialXApiConnector
from app.connectors.twitterapi_io import TwitterApiIoConnector
from app.database import SessionLocal
from app.ingest import ingest_posts
from app.models import AuditLog, Post, PostAnalysis, Topic
from app.retention import run_retention
from app.timeutil import utcnow


def _real(ext_id: str, *, parent: str | None = None, replies: int = 0) -> RawPost:
    return RawPost(
        external_post_id=ext_id,
        text="Info lowongan admin gudang, gaji telat terus",
        created_at_source=utcnow() - timedelta(days=1),
        is_synthetic=False,
        source="import",
        reply_count=replies,
        in_reply_to_external_id=parent,
    )


# ------------------------------------------------------------------ retensi


IRRELEVANT_TEXT = "nonton bola semalam seru banget, skornya imbang"


def _age(db, ext_id: str, days: float, now) -> str:
    post = db.scalar(select(Post).where(Post.external_post_id == ext_id))
    post.ingested_at = now - timedelta(days=days)
    db.commit()
    return post.id


def _exists(db, post_id: str) -> bool:
    db.expunge_all()
    return db.get(Post, post_id) is not None


def test_irrelevant_post_erased_14_days_after_ingestion():
    now = utcnow()
    with SessionLocal() as db:
        off_topic = _real("ret-irrelevant")
        off_topic.text = IRRELEVANT_TEXT
        ingest_posts(db, [off_topic, _real("ret-relevant-young")], source="import")
        irrelevant = db.scalar(select(Post).where(Post.external_post_id == "ret-irrelevant"))
        assert irrelevant.analysis.topic_id is None, "teks uji harus gagal filter relevansi"
        relevant = db.scalar(select(Post).where(Post.external_post_id == "ret-relevant-young"))
        assert relevant.analysis.topic_id is not None, "teks uji harus lolos filter relevansi"

        # 13 hari: keduanya masih ada.
        irr_id = _age(db, "ret-irrelevant", settings.retention_irrelevant_days - 1, now)
        rel_id = _age(db, "ret-relevant-young", settings.retention_irrelevant_days + 1, now)
        run_retention(db, now=now)
        assert _exists(db, irr_id)

        # Tepat 14 hari: yang tidak relevan terhapus permanen; yang relevan (15 hari) tetap.
        irr_id = _age(db, "ret-irrelevant", settings.retention_irrelevant_days, now)
        summary = run_retention(db, now=now)
        assert summary["erased_irrelevant"] >= 1
        assert not _exists(db, irr_id)
        assert db.scalar(select(PostAnalysis).where(PostAnalysis.post_id == irr_id)) is None
        assert _exists(db, rel_id)


def test_relevant_post_erased_at_exactly_90_days_without_grace():
    now = utcnow()
    with SessionLocal() as db:
        ingest_posts(db, [_real("ret-relevant-89"), _real("ret-relevant-90")], source="import")
        young = _age(db, "ret-relevant-89", settings.retention_raw_days - 1, now)
        old = _age(db, "ret-relevant-90", settings.retention_raw_days, now)

        demo = db.scalar(select(Post).where(Post.is_synthetic.is_(True)))
        demo_id, demo_ingested = demo.id, demo.ingested_at
        demo.ingested_at = now - timedelta(days=400)  # data demo tidak boleh tersentuh
        db.commit()

        summary = run_retention(db, now=now)
        assert summary["erased_relevant"] >= 1
        assert not _exists(db, old), "relevan dihapus permanen tepat 90 hari, tanpa +14"
        assert _exists(db, young)
        assert _exists(db, demo_id)

        actions = db.scalars(select(AuditLog.action).where(AuditLog.action == "retention.run")).all()
        assert actions, "putaran retensi yang menghapus data harus tercatat di audit log"

        demo_row = db.get(Post, demo_id)
        demo_row.ingested_at = demo_ingested
        db.commit()


def test_manual_topic_correction_makes_post_relevant(client, analyst_headers):
    now = utcnow()
    with SessionLocal() as db:
        off_topic = _real("ret-corrected")
        off_topic.text = IRRELEVANT_TEXT
        ingest_posts(db, [off_topic], source="import")
        post_id = _age(db, "ret-corrected", settings.retention_irrelevant_days + 2, now)
        topic_slug = db.scalar(select(Topic.slug))
    response = client.patch(f"/posts/{post_id}/labels", json={"topic_slug": topic_slug},
                            headers=analyst_headers)
    assert response.status_code == 200
    with SessionLocal() as db:
        run_retention(db, now=now)
        assert _exists(db, post_id), "post yang dikoreksi masuk kelompok isu dianggap relevan"


def test_reply_inherits_parent_relevance_for_retention_only():
    now = utcnow()
    noise = "iya bener banget"
    with SessionLocal() as db:
        child = _real("inh-child", parent="inh-parent")
        child.text = noise
        orphan = _real("inh-orphan", parent="inh-off-parent")
        orphan.text = noise
        off_parent = _real("inh-off-parent", replies=1)
        off_parent.text = IRRELEVANT_TEXT
        ingest_posts(db, [_real("inh-parent", replies=1), child, off_parent, orphan],
                     source="import")

        reply = db.scalar(select(Post).where(Post.external_post_id == "inh-child"))
        # Label dan perhitungan: balasan tetap memakai teksnya sendiri (tanpa topik),
        # sehingga tidak ikut volume mingguan isu induknya.
        assert reply.induk_id is not None and reply.analysis.topic_id is None

        parent_id = _age(db, "inh-parent", 30, now)
        child_id = _age(db, "inh-child", 30, now)
        orphan_id = _age(db, "inh-orphan", 30, now)
        off_parent_id = _age(db, "inh-off-parent", 5, now)

        run_retention(db, now=now)
        # Induk relevan → balasan bertahan melewati 14 hari.
        assert _exists(db, parent_id) and _exists(db, child_id)
        # Induk tidak relevan → balasan tidak relevan dinilai sendiri dan terhapus.
        assert not _exists(db, orphan_id)
        assert _exists(db, off_parent_id)

        # Induk mencapai 90 hari dan terhapus; balasannya menyusul pada putaran berikutnya.
        _age(db, "inh-parent", settings.retention_raw_days, now)
        run_retention(db, now=now)
        assert not _exists(db, parent_id)
        run_retention(db, now=now)
        assert not _exists(db, child_id)


def test_retention_windows_and_score_threshold_are_configurable(monkeypatch):
    now = utcnow()
    with SessionLocal() as db:
        ingest_posts(db, [_real("ret-config-days"), _real("ret-config-score")], source="import")
        days_id = _age(db, "ret-config-days", 6, now)
        score_id = _age(db, "ret-config-score", 3, now)

        monkeypatch.setattr(settings, "retention_raw_days", 5)
        run_retention(db, now=now)
        assert not _exists(db, days_id)

        # Ambang skor relevansi di atas skor post: post dianggap tidak relevan.
        monkeypatch.setattr(settings, "retention_irrelevant_days", 2)
        monkeypatch.setattr(settings, "retention_relevance_min_score", 1.01)
        run_retention(db, now=now)
        assert not _exists(db, score_id)


def test_erasing_parent_keeps_replies_but_unlinks_them():
    now = utcnow()
    with SessionLocal() as db:
        ingest_posts(db, [_real("ret-parent", replies=1), _real("ret-child", parent="ret-parent")],
                     source="import")
        parent = db.scalar(select(Post).where(Post.external_post_id == "ret-parent"))
        child = db.scalar(select(Post).where(Post.external_post_id == "ret-child"))
        assert child.induk_id == parent.id
        parent_id, child_id = parent.id, child.id
        parent.ingested_at = now - timedelta(days=settings.retention_raw_days)
        db.commit()
        run_retention(db, now=now)
        db.expunge_all()
        assert db.get(Post, parent_id) is None
        kept = db.get(Post, child_id)
        assert kept is not None and kept.induk_id is None
        assert kept.induk_external_id == "ret-parent"


# ------------------------------------------------------------------ balasan


def test_replies_link_to_parent_in_either_order():
    with SessionLocal() as db:
        # Balasan datang lebih dulu, induk menyusul pada impor berikutnya.
        ingest_posts(db, [_real("rep-child-first", parent="rep-parent-late")], source="import")
        child = db.scalar(select(Post).where(Post.external_post_id == "rep-child-first"))
        assert child.induk_id is None and child.induk_external_id == "rep-parent-late"

        ingest_posts(db, [_real("rep-parent-late")], source="import")
        db.expire_all()
        parent = db.scalar(select(Post).where(Post.external_post_id == "rep-parent-late"))
        assert db.get(Post, child.id).induk_id == parent.id


def test_twitterapi_io_fetch_replies_maps_parent_and_ignores_username(monkeypatch):
    calls = []

    def handler(request):
        calls.append(request)
        assert request.url.path.endswith("/twitter/tweet/replies")
        assert request.url.params["tweetId"] == "900"
        reply = {"id": "901", "text": "sama, gaji saya juga telat", "createdAt": "2026-11-17T02:00:00Z",
                 "lang": "in", "inReplyToId": "900", "inReplyToUsername": "jangan_disimpan",
                 "author": {"userName": "jangan_disimpan"}}
        return httpx.Response(200, json={"tweets": [reply], "has_next_page": False})

    monkeypatch.setattr(settings, "twitterapi_io_key", "test-key")
    original = httpx.Client
    monkeypatch.setattr(tio.httpx, "Client",
                        lambda **kw: original(transport=httpx.MockTransport(handler), **kw))
    replies = TwitterApiIoConnector().fetch_replies("900")
    assert len(calls) == 1
    assert [r.external_post_id for r in replies] == ["901"]
    assert replies[0].in_reply_to_external_id == "900"
    assert replies[0].author_public_id is None
    assert "jangan_disimpan" not in repr(replies[0])


def test_official_x_parses_replied_to_and_queries_conversation(monkeypatch):
    seen = []

    def handler(request):
        seen.append(request.url.params["query"])
        assert "referenced_tweets" in request.url.params["tweet.fields"]
        return httpx.Response(200, json={"data": [{
            "id": "801", "text": "balasan", "created_at": "2026-11-17T02:00:00Z", "lang": "id",
            "referenced_tweets": [{"type": "replied_to", "id": "800"}],
        }]})

    monkeypatch.setattr(settings, "x_api_bearer_token", "official-test")
    original = httpx.Client
    monkeypatch.setattr(official_x.httpx, "Client",
                        lambda **kw: original(transport=httpx.MockTransport(handler), **kw))
    replies = OfficialXApiConnector().fetch_replies("800")
    assert seen == ["conversation_id:800 is:reply"]
    assert replies[0].in_reply_to_external_id == "800"


def test_fetch_live_fetches_and_links_replies(client, admin_headers, monkeypatch):
    monkeypatch.setattr(settings, "x_api_provider", "twitterapi_io")
    monkeypatch.setattr(settings, "twitterapi_io_key", "test-key")
    stamp = utcnow() - timedelta(days=1)
    parents = [
        RawPost(external_post_id="live-parent", text="gaji belum cair, ada yang sama?",
                created_at_source=stamp, source="twitterapi_io", is_synthetic=False, reply_count=4),
        RawPost(external_post_id="live-no-replies", text="info loker gudang",
                created_at_source=stamp, source="twitterapi_io", is_synthetic=False),
    ]
    asked = []

    def fake_replies(self, parent_external_id, *, max_results=20):
        asked.append(parent_external_id)
        return [RawPost(external_post_id="live-reply", text="iya, saya juga belum gajian",
                        created_at_source=stamp, source="twitterapi_io", is_synthetic=False,
                        in_reply_to_external_id=parent_external_id)]

    monkeypatch.setattr(TwitterApiIoConnector, "fetch", lambda self, **kw: parents)
    monkeypatch.setattr(TwitterApiIoConnector, "fetch_replies", fake_replies)
    result = client.post("/data/fetch-live", params={"query": "gaji"}, headers=admin_headers)
    assert result.status_code == 200, result.text
    assert asked == ["live-parent"], "hanya post yang punya balasan yang ditanyakan"
    assert result.json()["records_processed"] == 3

    with SessionLocal() as db:
        parent = db.scalar(select(Post).where(Post.external_post_id == "live-parent"))
        reply = db.scalar(select(Post).where(Post.external_post_id == "live-reply"))
        assert reply.induk_id == parent.id
        parent_id, reply_id = parent.id, reply.id

    thread = client.get(f"/posts/{parent_id}/thread", headers=admin_headers).json()
    assert [r["id"] for r in thread["balasan"]] == [reply_id]
    detail = client.get(f"/posts/{reply_id}", headers=admin_headers).json()
    assert detail["is_reply"] is True and detail["induk_id"] == parent_id
    reply_thread = client.get(f"/posts/{reply_id}/thread", headers=admin_headers).json()
    assert reply_thread["induk"]["id"] == parent_id

    # Opsi dimatikan: tidak ada permintaan balasan.
    asked.clear()
    client.post("/data/fetch-live", params={"query": "gaji", "include_replies": "false"},
                headers=admin_headers)
    assert asked == []


def test_csv_import_accepts_parent_column(client, admin_headers):
    content = (
        "external_post_id,text,created_at_source,is_synthetic,induk_external_id\n"
        "csv-parent,lowongan admin gudang,2026-11-10,false,\n"
        "csv-child,gajinya berapa kak?,2026-11-11,false,csv-parent\n"
    ).encode()
    response = client.post("/data/import", files={"file": ("balasan.csv", content, "text/csv")},
                           headers=admin_headers)
    assert response.status_code in (200, 201), response.text
    with SessionLocal() as db:
        parent = db.scalar(select(Post).where(Post.external_post_id == "csv-parent"))
        child = db.scalar(select(Post).where(Post.external_post_id == "csv-child"))
        assert child.induk_id == parent.id


# ------------------------------------------------------------- reseed demo


def test_reseed_demo_keeps_real_data_and_ends_today_with_current_week_spike():
    from app import analytics
    from app.filters import FilterSet
    from app.seed import run_seed

    with SessionLocal() as db:
        ingest_posts(db, [_real("reseed-keep-real")], source="import")
        real_before = db.query(Post).filter(Post.is_synthetic.is_(False)).count()
        audit_before = db.query(AuditLog).count()

    summary = run_seed(reseed_demo=True, count=400, days=60)
    assert summary["removed_demo_posts"] > 0 and summary["inserted_posts"] == 400

    with SessionLocal() as db:
        assert db.query(Post).filter(Post.is_synthetic.is_(False)).count() == real_before
        assert db.scalar(select(Post).where(Post.external_post_id == "reseed-keep-real"))
        assert db.query(AuditLog).count() > audit_before, "audit lama tetap, reseed tercatat"

        last_demo = db.scalar(
            select(Post.created_at_source).where(Post.is_synthetic.is_(True))
            .order_by(Post.created_at_source.desc())
        )
        today = utcnow().date()
        assert last_demo.date() == today, "data demo harus berakhir pada hari seed"

        monday = analytics.week_start(today)
        filters = FilterSet(
            date_from=datetime.combine(monday, datetime.min.time()),
            date_to=datetime.combine(today, datetime.max.time()).replace(microsecond=0),
            data_type="demo",
        )
        spikes = analytics.detect_issue_spikes(db, filters)
        assert any(s["week_start"] == monday.isoformat() for s in spikes), \
            "minggu berjalan harus memuat lonjakan isu pada data demo"
