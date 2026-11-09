"""Uji endpoint API: auth, filter, search, monitor, insight, dan ekspor."""

from __future__ import annotations

from datetime import datetime, timedelta


def test_health_reports_seeded_database(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["seeded"] is True
    assert body["post_count"] > 0


def test_login_rejects_wrong_password(client):
    response = client.post(
        "/auth/login", json={"email": "dimas@talentpulse.local", "password": "salah"}
    )
    assert response.status_code == 401
    assert "tidak sesuai" in response.json()["detail"]


def test_protected_endpoint_requires_token(client):
    assert client.get("/dashboard/overview").status_code == 401


def test_overview_returns_all_sections_with_meta(client, analyst_headers):
    body = client.get("/dashboard/overview", headers=analyst_headers).json()
    for key in (
        "kpis", "volume_series", "peaks", "topics", "heatmap",
        "attention_issues", "top_questions", "limitations", "meta",
    ):
        assert key in body

    meta = body["meta"]
    assert meta["data_source_mode"] == "demo"
    assert meta["is_synthetic"] is True  # badge DATA DEMO
    assert meta["record_count"] == body["kpis"]["total_posts"]["value"]
    assert meta["model_version"]
    assert meta["comparison_start"] < meta["period_start"]


def test_overview_respects_job_role_filter(client, analyst_headers):
    everything = client.get("/dashboard/overview", headers=analyst_headers).json()
    filtered = client.get(
        "/dashboard/overview", headers=analyst_headers, params={"job_roles": ["Staf Gudang"]}
    ).json()
    assert filtered["kpis"]["total_posts"]["value"] <= everything["kpis"]["total_posts"]["value"]
    assert filtered["meta"]["applied_filters"]["job_roles"] == ["Staf Gudang"]


def test_trends_weekly_and_annotations(client, analyst_headers):
    body = client.get(
        "/dashboard/trends",
        headers=analyst_headers,
        params={"granularity": "weekly", "breakdown": "sentiment"},
    ).json()
    assert body["granularity"] == "weekly"
    assert body["breakdown_type"] == "sentiment"
    assert all("indexed" in point for point in body["series"])
    for annotation in body["annotations"]:
        # Anotasi tidak boleh mengklaim penyebab.
        assert "Lonjakan terdeteksi" in annotation["label"]


def test_topic_detail_share_is_relative_to_all_conversations(client, analyst_headers):
    topics = client.get("/dashboard/topics", headers=analyst_headers).json()["topics"]
    slug = topics[0]["slug"]
    detail = client.get(f"/dashboard/topics/{slug}", headers=analyst_headers).json()
    assert detail["topic"]["share"] < 100.0
    assert detail["suggested_summary"]


def test_post_search_sorting_and_pagination(client, analyst_headers):
    first = client.get(
        "/posts", headers=analyst_headers, params={"sort": "recent", "page_size": 10}
    ).json()
    assert first["page"] == 1
    assert len(first["items"]) <= 10
    dates = [item["created_at_source"] for item in first["items"]]
    assert dates == sorted(dates, reverse=True)

    second = client.get(
        "/posts", headers=analyst_headers, params={"sort": "recent", "page": 2, "page_size": 10}
    ).json()
    assert {i["id"] for i in first["items"]}.isdisjoint({i["id"] for i in second["items"]})


def test_post_search_engagement_sorting(client, analyst_headers):
    body = client.get(
        "/posts", headers=analyst_headers, params={"sort": "engagement", "page_size": 20}
    ).json()
    scores = [item["engagement_score"] for item in body["items"]]
    assert scores == sorted(scores, reverse=True)


def test_post_search_boolean_exclusion(client, analyst_headers):
    body = client.get(
        "/posts", headers=analyst_headers, params={"q": "gaji -penipuan", "page_size": 20}
    ).json()
    assert body["highlight_terms"] == ["gaji"]
    assert all("penipuan" not in item["text"].lower() for item in body["items"])


def test_post_search_no_result_state(client, analyst_headers):
    body = client.get(
        "/posts", headers=analyst_headers, params={"q": "qqqzzzxxx"}
    ).json()
    assert body["total"] == 0
    assert body["items"] == []
    assert body["total_pages"] == 1


def test_invalid_sort_is_rejected(client, analyst_headers):
    response = client.get("/posts", headers=analyst_headers, params={"sort": "populer"})
    assert response.status_code == 422


def test_confidence_visible_for_all_logged_users(client, viewer_headers, analyst_headers):
    viewer_item = client.get(
        "/posts", headers=viewer_headers, params={"page_size": 5}
    ).json()["items"][0]
    analyst_item = client.get(
        "/posts", headers=analyst_headers, params={"page_size": 5}
    ).json()["items"][0]
    assert viewer_item["sentiment_confidence"] is not None
    assert analyst_item["sentiment_confidence"] is not None


def test_viewer_can_write_query(client, viewer_headers):
    response = client.post(
        "/queries",
        headers=viewer_headers,
        json={
            "name": "uji",
            "query_text": "",
            "include_keywords": ["gaji"],
            "exclude_keywords": [],
            "job_roles": [],
            "topics": [],
            "sentiments": [],
            "intents": [],
        },
    )
    assert response.status_code == 201


def test_logged_in_user_can_read_audit_log(client, analyst_headers):
    assert client.get("/data/audit", headers=analyst_headers).status_code == 200


def test_viewer_can_read_audit_log(client, viewer_headers):
    assert client.get("/data/audit", headers=viewer_headers).status_code == 200


def test_saved_query_and_monitor_lifecycle(client, analyst_headers):
    created = client.post(
        "/queries",
        headers=analyst_headers,
        json={
            "name": "Uji Monitor Shift",
            "query_text": "",
            "include_keywords": ["shift", "jam kerja"],
            "exclude_keywords": [],
            "job_roles": [],
            "topics": [],
            "sentiments": [],
            "intents": [],
        },
    )
    assert created.status_code == 201
    query_id = created.json()["id"]

    monitor = client.post(
        "/monitors",
        headers=analyst_headers,
        json={"name": "Monitor Shift", "source_query_id": query_id, "comparison_window": 7},
    )
    assert monitor.status_code == 201
    body = monitor.json()
    assert body["trend_direction"] in {"naik", "turun", "stabil", "tidak cukup data"}
    assert len(body["sparkline"]) == 7

    duplicated = client.post(
        f"/monitors/{body['id']}/duplicate", headers=analyst_headers
    )
    assert duplicated.status_code == 201
    assert duplicated.json()["name"].endswith("(salinan)")

    archived = client.patch(
        f"/monitors/{body['id']}", headers=analyst_headers, json={"is_archived": True}
    )
    assert archived.json()["is_archived"] is True
    listed = client.get("/monitors", headers=analyst_headers).json()
    assert body["id"] not in {m["id"] for m in listed}


def test_monitor_requires_valid_query(client, analyst_headers):
    response = client.post(
        "/monitors",
        headers=analyst_headers,
        json={"name": "Tanpa query", "source_query_id": "tidak-ada"},
    )
    assert response.status_code == 422


def test_insight_workflow_and_report_export(
    client, analyst_headers, admin_headers, viewer_headers
):
    suggestion = client.get(
        "/dashboard/insight-suggestions", headers=analyst_headers
    ).json()["suggestions"][0]

    insight = client.post(
        "/insights",
        headers=analyst_headers,
        json={
            "title": suggestion["title"],
            "summary": suggestion["summary"],
            "evidence_filters": suggestion["evidence_filters"],
            "metric_snapshot": suggestion["metric_snapshot"],
        },
    ).json()
    assert insight["human_status"] == "draft"
    assert insight["is_synthetic_data"] is True

    noted = client.patch(
        f"/insights/{insight['id']}",
        headers=viewer_headers,
        json={"human_note": "Sudah diperiksa."},
    )
    assert noted.status_code == 200

    reviewed = client.patch(
        f"/insights/{insight['id']}",
        headers=admin_headers,
        json={"human_status": "approved"},
    ).json()
    assert reviewed["human_status"] == "approved"

    end = datetime.utcnow()
    report = client.post(
        "/reports",
        headers=analyst_headers,
        json={
            "title": "Laporan Uji",
            "period_start": (end - timedelta(days=30)).isoformat(),
            "period_end": end.isoformat(),
            "insight_ids": [insight["id"]],
            "charts": ["volume", "topics", "sentiment"],
            "notes": "Catatan uji.",
        },
    )
    assert report.status_code == 201
    report_id = report.json()["id"]

    pdf = client.get(f"/reports/{report_id}/export", headers=analyst_headers, params={"format": "pdf"})
    assert pdf.status_code == 200
    assert pdf.content.startswith(b"%PDF")

    csv_export = client.get(
        f"/reports/{report_id}/export", headers=analyst_headers, params={"format": "csv"}
    )
    assert csv_export.status_code == 200
    text = csv_export.content.decode("utf-8-sig")
    assert "DATA SINTETIS — BUKAN TEMUAN AKTUAL" in text

    posts_export = client.get(
        f"/reports/{report_id}/export", headers=analyst_headers, params={"format": "posts"}
    )
    body = posts_export.content.decode("utf-8-sig")
    # Ekspor post-level dibatasi: hanya ID dan metadata minimum.
    assert "external_post_id" in body
    assert "text" not in body.split("\n")[2]


def test_report_rejects_unknown_insight(client, analyst_headers):
    end = datetime.utcnow()
    response = client.post(
        "/reports",
        headers=analyst_headers,
        json={
            "title": "Gagal",
            "period_start": (end - timedelta(days=7)).isoformat(),
            "period_end": end.isoformat(),
            "insight_ids": ["tidak-ada"],
        },
    )
    assert response.status_code == 422


def test_insight_author_cannot_self_approve(client, analyst_headers):
    suggestion = client.get(
        "/dashboard/insight-suggestions", headers=analyst_headers
    ).json()["suggestions"][0]
    insight = client.post(
        "/insights",
        headers=analyst_headers,
        json={
            "title": suggestion["title"],
            "summary": suggestion["summary"],
            "evidence_filters": suggestion["evidence_filters"],
            "metric_snapshot": suggestion["metric_snapshot"],
        },
    ).json()

    response = client.patch(
        f"/insights/{insight['id']}", headers=analyst_headers, json={"human_status": "approved"}
    )
    assert response.status_code == 403


def test_insight_can_be_approved_by_other_user(client, analyst_headers, admin_headers):
    suggestion = client.get(
        "/dashboard/insight-suggestions", headers=analyst_headers
    ).json()["suggestions"][0]
    insight = client.post(
        "/insights",
        headers=analyst_headers,
        json={
            "title": suggestion["title"],
            "summary": suggestion["summary"],
            "evidence_filters": suggestion["evidence_filters"],
            "metric_snapshot": suggestion["metric_snapshot"],
        },
    ).json()

    response = client.patch(
        f"/insights/{insight['id']}", headers=admin_headers, json={"human_status": "approved"}
    )
    assert response.status_code == 200
    assert response.json()["human_status"] == "approved"


def test_editing_approved_insight_resets_to_draft(client, analyst_headers, admin_headers):
    suggestion = client.get(
        "/dashboard/insight-suggestions", headers=analyst_headers
    ).json()["suggestions"][0]
    insight = client.post(
        "/insights",
        headers=analyst_headers,
        json={
            "title": suggestion["title"],
            "summary": suggestion["summary"],
            "evidence_filters": suggestion["evidence_filters"],
            "metric_snapshot": suggestion["metric_snapshot"],
        },
    ).json()
    approved = client.patch(
        f"/insights/{insight['id']}", headers=admin_headers, json={"human_status": "approved"}
    ).json()
    assert approved["human_status"] == "approved"

    edited = client.patch(
        f"/insights/{insight['id']}", headers=admin_headers, json={"summary": "Ringkasan baru"}
    ).json()
    assert edited["human_status"] == "draft"


def test_deleting_approved_insight_returns_conflict(client, analyst_headers, admin_headers):
    suggestion = client.get(
        "/dashboard/insight-suggestions", headers=analyst_headers
    ).json()["suggestions"][0]
    insight = client.post(
        "/insights",
        headers=analyst_headers,
        json={
            "title": suggestion["title"],
            "summary": suggestion["summary"],
            "evidence_filters": suggestion["evidence_filters"],
            "metric_snapshot": suggestion["metric_snapshot"],
        },
    ).json()
    client.patch(
        f"/insights/{insight['id']}", headers=admin_headers, json={"human_status": "approved"}
    )

    response = client.delete(f"/insights/{insight['id']}", headers=admin_headers)
    assert response.status_code == 409


def test_csv_import_validation(client, admin_headers):
    missing_columns = client.post(
        "/data/import", headers=admin_headers, files={"file": ("x.csv", b"a,b\n1,2", "text/csv")}
    )
    assert missing_columns.status_code == 422
    assert "Kolom wajib tidak ditemukan" in missing_columns.json()["detail"]

    payload = (
        "external_post_id,text,created_at_source,like_count\n"
        "uji_0001,berapa gaji staf gudang sekarang?,2026-08-01,4\n"
        "uji_0002,,2026-08-02,1\n"
        "uji_0003,tanggal salah,bukan-tanggal,1\n"
    ).encode()
    result = client.post(
        "/data/import", headers=admin_headers, files={"file": ("data.csv", payload, "text/csv")}
    ).json()
    assert result["records_processed"] == 1
    assert result["records_failed"] == 2
    assert result["status"] == "partial"


def test_import_is_allowed_for_logged_in_user(client, analyst_headers):
    response = client.post(
        "/data/import",
        headers=analyst_headers,
        files={"file": ("x.csv", b"external_post_id,text,created_at_source\n", "text/csv")},
    )
    assert response.status_code == 422


def test_import_public_x_validates_url(client, admin_headers):
    response = client.post(
        "/data/import-public-x",
        headers=admin_headers,
        json={"url": "https://example.com/user/status/1234567890"},
    )
    assert response.status_code == 422
    assert "x.com atau twitter.com" in response.json()["detail"]


def test_import_public_x_ingests_real_post(client, admin_headers, db, monkeypatch):
    from sqlalchemy import select

    from app.connectors.base import RawPost
    from app.connectors.x_public_embed import XPublicEmbedConnector
    from app.models import Post

    sample = RawPost(
        external_post_id="1566952453937205248",
        text="Baru dapat offering letter, tetapi gaji yang ditawarkan 5 juta.",
        created_at_source=datetime(2022, 9, 6),
        language="id",
        author_public_id="hrdbacot",
        url="https://x.com/hrdbacot/status/1566952453937205248",
        is_synthetic=False,
        source="x_public_embed",
    )
    monkeypatch.setattr(XPublicEmbedConnector, "fetch", lambda self, **kwargs: [sample])

    try:
        response = client.post(
            "/data/import-public-x",
            headers=admin_headers,
            json={"url": sample.url},
        )
        assert response.status_code == 200, response.text
        assert response.json()["records_processed"] == 1

        post = db.scalar(select(Post).where(Post.external_post_id == sample.external_post_id))
        assert post is not None
        assert post.source == "x_public_embed"
        assert post.is_synthetic is False
        assert post.analysis is not None
    finally:
        post = db.scalar(select(Post).where(Post.external_post_id == sample.external_post_id))
        if post is not None:
            db.delete(post)
            db.commit()


def test_fetch_live_is_accessible_for_logged_in_user(client, analyst_headers):
    response = client.post(
        "/data/fetch-live", params={"query": "loker gudang"}, headers=analyst_headers
    )
    assert response.status_code in {409, 503, 200}


def test_fetch_live_rejected_without_credential(client, admin_headers):
    """Tanpa X_API_BEARER_TOKEN, mode live ditolak dengan pesan yang jelas."""
    response = client.post(
        "/data/fetch-live", params={"query": "loker gudang"}, headers=admin_headers
    )
    assert response.status_code == 409
    assert "X_API_BEARER_TOKEN" in response.json()["detail"]


def test_fetch_live_ingests_real_posts(client, admin_headers, db, monkeypatch):
    """Post dari connector resmi masuk lewat pipeline yang sama dan bukan sintetis."""
    from sqlalchemy import select

    from app.connectors.base import RawPost
    from app.connectors.official_x import OfficialXApiConnector
    from app.models import Post

    sample = [
        RawPost(
            external_post_id="live-uji-0001",
            text="berapa gaji staf gudang di kawasan industri sekarang?",
            created_at_source=datetime.utcnow() - timedelta(days=1),
            language="id",
            like_count=5,
            repost_count=1,
            is_synthetic=False,
            source="x_api",
        )
    ]
    monkeypatch.setattr(
        OfficialXApiConnector, "is_available", property(lambda self: True)
    )
    monkeypatch.setattr(OfficialXApiConnector, "fetch", lambda self, **kwargs: sample)

    try:
        result = client.post(
            "/data/fetch-live",
            params={"query": "gaji gudang", "days": 7},
            headers=admin_headers,
        )
        assert result.status_code == 200, result.text
        assert result.json()["records_processed"] == 1

        post = db.scalar(
            select(Post).where(Post.external_post_id == "live-uji-0001")
        )
        assert post is not None
        assert post.is_synthetic is False
        assert post.source == "x_api"
        assert post.analysis is not None  # pipeline NLP tetap dijalankan

        runs = client.get("/data/runs", headers=admin_headers).json()
        assert any(run["source"] == "x_api" for run in runs)

        audit = client.get("/data/audit", headers=admin_headers).json()["items"]
        assert any(entry["action"] == "data.fetch_live" for entry in audit)
    finally:
        # Korpus uji dikembalikan agar pengujian lain tidak terpengaruh.
        stale = db.scalar(select(Post).where(Post.external_post_id == "live-uji-0001"))
        if stale is not None:
            db.delete(stale)
            db.commit()


def test_seed_blocked_when_system_ops_disabled(client, admin_headers):
    response = client.post("/data/seed", headers=admin_headers)
    assert response.status_code == 403


def test_reanalyze_blocked_when_system_ops_disabled(client, admin_headers):
    response = client.post("/data/reanalyze", headers=admin_headers)
    assert response.status_code == 403


def test_label_correction_marks_manual_review(client, analyst_headers):
    post = client.get("/posts", headers=analyst_headers, params={"page_size": 5}).json()["items"][0]
    response = client.patch(
        f"/posts/{post['id']}/labels",
        headers=analyst_headers,
        json={"sentiment_label": "Netral", "topic_slug": "gaji-benefit"},
    )
    assert response.status_code == 200

    updated = client.get(f"/posts/{post['id']}", headers=analyst_headers).json()
    assert updated["sentiment_label"] == "Netral"
    assert updated["topic_slug"] == "gaji-benefit"
    assert updated["sentiment_confidence"] == 1.0
    assert "koreksi-manual" in updated["model_version"]


def test_label_correction_rejects_unknown_topic(client, analyst_headers):
    post = client.get("/posts", headers=analyst_headers, params={"page_size": 5}).json()["items"][0]
    response = client.patch(
        f"/posts/{post['id']}/labels", headers=analyst_headers, json={"topic_slug": "tidak-ada"}
    )
    assert response.status_code == 422


def test_post_detail_returns_classification_basis(client, viewer_headers):
    post = client.get("/posts", headers=viewer_headers, params={"page_size": 5}).json()["items"][0]
    detail = client.get(f"/posts/{post['id']}", headers=viewer_headers).json()
    assert set(detail["explanation"]) == {"topic", "sentiment", "intent", "job_role"}
    assert all(entry["rule"] for entry in detail["explanation"].values())


def test_label_correction_records_previous_rule(client, analyst_headers):
    post = client.get("/posts", headers=analyst_headers, params={"page_size": 5}).json()["items"][1]
    auto_rule = post["explanation"]["job_role"]["rule"]
    response = client.patch(
        f"/posts/{post['id']}/labels", headers=analyst_headers, json={"job_role": "Kasir"}
    )
    assert response.status_code == 200

    entry = client.get(f"/posts/{post['id']}", headers=analyst_headers).json()["explanation"][
        "job_role"
    ]
    assert entry["corrected"] is True
    assert entry["auto_rule"] == auto_rule
    assert post["job_role"] in entry["rule"]


def test_label_correction_rejects_unknown_job_role(client, analyst_headers):
    post = client.get("/posts", headers=analyst_headers, params={"page_size": 5}).json()["items"][0]
    response = client.patch(
        f"/posts/{post['id']}/labels", headers=analyst_headers, json={"job_role": "Operator"}
    )
    assert response.status_code == 422


def test_viewer_can_correct_labels_directly(client, viewer_headers):
    post = client.get("/posts", headers=viewer_headers, params={"page_size": 5}).json()["items"][2]
    response = client.patch(
        f"/posts/{post['id']}/labels",
        headers=viewer_headers,
        json={"needs_review": True, "sentiment_label": "Netral"},
    )
    assert response.status_code == 200
    updated = client.get(f"/posts/{post['id']}", headers=viewer_headers).json()
    assert updated["needs_review"] is True


def test_keyword_presets_seeded_for_every_topic(client, viewer_headers):
    presets = client.get("/data/keyword-presets", headers=viewer_headers).json()
    topics = client.get("/data/taxonomy", headers=viewer_headers).json()["topics"]
    assert {p["topic_slug"] for p in presets} == {t["slug"] for t in topics}
    assert all(p["query_text"] for p in presets)


def test_keyword_preset_query_returns_posts(client, viewer_headers):
    preset = client.get("/data/keyword-presets", headers=viewer_headers).json()[0]
    result = client.get("/posts", headers=viewer_headers, params={"q": preset["query_text"]})
    assert result.status_code == 200
    assert result.json()["total"] > 0


def test_keyword_preset_crud_for_logged_in_users(client, admin_headers, analyst_headers):
    body = {"topic_slug": "gaji-benefit", "label": "Uji preset", "query_text": "bonus OR insentif"}
    created = client.post("/data/keyword-presets", headers=analyst_headers, json=body)
    assert created.status_code == 201
    preset_id = created.json()["id"]

    updated = client.patch(
        f"/data/keyword-presets/{preset_id}",
        headers=admin_headers,
        json={"label": "Bonus dan insentif", "topic_slug": "kontrak-status"},
    ).json()
    assert updated["label"] == "Bonus dan insentif"
    assert updated["topic_slug"] == "kontrak-status"

    bad = client.post(
        "/data/keyword-presets", headers=admin_headers, json={**body, "topic_slug": "tidak-ada"}
    )
    assert bad.status_code == 422

    assert (
        client.delete(f"/data/keyword-presets/{preset_id}", headers=analyst_headers).status_code
        == 204
    )
    actions = {e["action"] for e in client.get("/data/audit", headers=admin_headers).json()["items"]}
    assert {"preset.create", "preset.update", "preset.delete"} <= actions


def test_topics_expose_topic_by_role_partitions(client, analyst_headers):
    body = client.get("/dashboard/topics", headers=analyst_headers).json()
    partitions = body["partitions"]
    assert partitions
    assert sum(p["count"] for p in partitions) == body["total_posts"]
    first = partitions[0]
    drilled = client.get(
        "/posts",
        headers=analyst_headers,
        params={"topics": [first["topic_slug"]], "job_roles": [first["job_role"]]},
    ).json()
    assert drilled["total"] == first["count"]


def test_methodology_exposes_limitations(client):
    body = client.get("/methodology").json()
    assert body["is_synthetic"] is True
    assert len(body["limitations"]) >= 5
    assert any("tidak berafiliasi resmi" in item for item in body["ethics"])


def test_connectors_never_expose_credentials(client, analyst_headers, monkeypatch):
    """Nilai credential tidak boleh bocor ke response, bahkan saat mode live."""
    from app.config import settings

    body = client.get("/data/connectors", headers=analyst_headers).json()
    assert body["mode"] == "demo"
    assert body["live_available"] is False

    sentinel = "RAHASIA-TOKEN-JANGAN-BOCOR"
    monkeypatch.setattr(settings, "x_api_bearer_token", sentinel)
    live_body = client.get("/data/connectors", headers=analyst_headers).json()
    assert sentinel not in str(live_body)
    assert live_body["live_available"] is True


def test_data_quality_reports_synthetic_share(client, analyst_headers):
    body = client.get("/data/quality", headers=analyst_headers).json()
    assert body["total_posts"] > 0
    assert body["coverage_percent"] == 100.0
    assert body["synthetic_percent"] > 0


def test_usability_event_logging_is_privacy_preserving(client, analyst_headers):
    response = client.post(
        "/usability/events",
        headers=analyst_headers,
        json={
            "session_key": "sesi-uji-1",
            "task_code": "T1",
            "event_type": "task_complete",
            "step_count": 6,
            "duration_ms": 45000,
            "filter_keys": ["job_roles", "topics"],
        },
    )
    assert response.status_code == 201
    summary = client.get("/usability/summary", headers=analyst_headers).json()
    assert any(item["task_code"] == "T1" for item in summary["items"])


def _create_insight(client, headers) -> dict:
    response = client.post(
        "/insights", headers=headers, json={"title": "Uji aturan", "summary": "Ringkasan awal"}
    )
    assert response.status_code == 201
    return response.json()


def _patch(client, insight_id, headers, body):
    return client.patch(f"/insights/{insight_id}", headers=headers, json=body)


def _audit_detail(client, headers, insight_id) -> dict:
    items = client.get("/data/audit", headers=headers, params={"limit": 200}).json()["items"]
    entry = next(
        e for e in items if e["action"] == "insight.update" and e["entity_id"] == insight_id
    )
    return entry["detail"]


def test_edit_and_approve_in_one_request_is_rejected(client, analyst_headers, admin_headers):
    insight = _create_insight(client, analyst_headers)
    response = _patch(
        client, insight["id"], admin_headers, {"summary": "Isi diubah", "human_status": "approved"}
    )
    assert response.status_code == 422
    assert _patch(client, insight["id"], admin_headers, {}).json()["human_status"] == "draft"


def test_withdrawn_approval_still_blocks_delete(client, analyst_headers, admin_headers):
    insight = _create_insight(client, analyst_headers)
    approved = _patch(client, insight["id"], admin_headers, {"human_status": "approved"}).json()
    assert approved["first_approved_at"] is not None

    withdrawn = _patch(client, insight["id"], analyst_headers, {"human_status": "draft"}).json()
    assert withdrawn["human_status"] == "draft"
    assert withdrawn["first_approved_at"] == approved["first_approved_at"]
    assert client.delete(f"/insights/{insight['id']}", headers=analyst_headers).status_code == 409


def test_edited_approved_insight_still_blocks_delete(client, analyst_headers, admin_headers):
    insight = _create_insight(client, analyst_headers)
    _patch(client, insight["id"], admin_headers, {"human_status": "approved"})
    edited = _patch(client, insight["id"], analyst_headers, {"summary": "Isi diubah"}).json()
    assert edited["human_status"] == "draft"
    assert client.delete(f"/insights/{insight['id']}", headers=analyst_headers).status_code == 409


def test_last_editor_cannot_approve_but_third_user_can(
    client, analyst_headers, admin_headers, viewer_headers
):
    insight = _create_insight(client, analyst_headers)
    edited = _patch(client, insight["id"], admin_headers, {"summary": "Disunting B"}).json()
    me = client.get("/auth/me", headers=admin_headers).json()
    assert edited["last_edited_by"] == me["id"]

    by_editor = _patch(client, insight["id"], admin_headers, {"human_status": "approved"})
    assert by_editor.status_code == 403

    by_third = _patch(client, insight["id"], viewer_headers, {"human_status": "approved"})
    assert by_third.status_code == 200
    assert by_third.json()["human_status"] == "approved"


def test_approval_audit_entry_has_snapshot(client, analyst_headers, admin_headers):
    insight = _create_insight(client, analyst_headers)
    _patch(client, insight["id"], admin_headers, {"human_status": "approved"})

    detail = _audit_detail(client, admin_headers, insight["id"])
    assert detail["approved_snapshot"]["summary"] == "Ringkasan awal"
    assert detail["approved_snapshot"]["title"] == "Uji aturan"


def test_edit_audit_entry_has_previous_values(client, analyst_headers, admin_headers):
    insight = _create_insight(client, analyst_headers)
    _patch(client, insight["id"], admin_headers, {"summary": "Isi baru"})

    detail = _audit_detail(client, admin_headers, insight["id"])
    assert detail["before"] == {"summary": "Ringkasan awal"}
    assert detail["changes"]["summary"] == "Isi baru"


def test_insight_seeded_as_approved_cannot_be_deleted(client, admin_headers, db):
    from app.models import Insight

    seeded = Insight(title="Disetujui sebelum migration", human_status="approved")
    db.add(seeded)
    db.commit()
    assert seeded.first_approved_at is None

    assert client.delete(f"/insights/{seeded.id}", headers=admin_headers).status_code == 409


def test_insight_cannot_be_created_as_approved(client, analyst_headers):
    response = client.post(
        "/insights", headers=analyst_headers, json={"title": "x", "human_status": "approved"}
    )
    assert response.status_code == 403


def test_resending_same_content_keeps_approval(client, analyst_headers, admin_headers):
    insight = _create_insight(client, analyst_headers)
    client.patch(
        f"/insights/{insight['id']}", headers=admin_headers, json={"human_status": "approved"}
    )

    same = client.patch(
        f"/insights/{insight['id']}", headers=admin_headers, json={"summary": insight["summary"]}
    ).json()
    assert same["human_status"] == "approved"


def test_draft_insight_can_be_deleted_by_another_user(client, analyst_headers, viewer_headers):
    insight = _create_insight(client, analyst_headers)
    response = client.delete(f"/insights/{insight['id']}", headers=viewer_headers)
    assert response.status_code == 204


def test_insight_exposes_author_id(client, analyst_headers):
    me = client.get("/auth/me", headers=analyst_headers).json()
    assert _create_insight(client, analyst_headers)["created_by"] == me["id"]


def test_system_ops_flag_is_exposed_and_opens_the_gate(client, viewer_headers, monkeypatch):
    from app.config import settings
    from app.deps import require_system_ops

    off = client.get("/data/connectors", headers=viewer_headers).json()
    assert off["system_ops_enabled"] is False

    monkeypatch.setattr(settings, "enable_system_ops", True)
    on = client.get("/data/connectors", headers=viewer_headers).json()
    assert on["system_ops_enabled"] is True
    user = object()
    assert require_system_ops(user) is user


def test_label_correction_names_the_corrector(client, viewer_headers):
    post = client.get("/posts", headers=viewer_headers, params={"page_size": 5}).json()["items"][3]
    me = client.get("/auth/me", headers=viewer_headers).json()
    target = "Kasir" if post["job_role"] != "Kasir" else "Administrasi"
    client.patch(f"/posts/{post['id']}/labels", headers=viewer_headers, json={"job_role": target})

    updated = client.get(f"/posts/{post['id']}", headers=viewer_headers).json()
    assert me["name"] in updated["explanation"]["job_role"]["rule"]


def test_review_comment_keeps_right_to_approve(client, analyst_headers, admin_headers):
    insight = _create_insight(client, analyst_headers)
    commented = _patch(client, insight["id"], admin_headers, {"review_comment": "Cek angka Q3."})
    assert commented.status_code == 200
    assert commented.json()["review_comment"] == "Cek angka Q3."
    assert commented.json()["last_edited_by"] is None

    approved = _patch(client, insight["id"], admin_headers, {"human_status": "approved"})
    assert approved.status_code == 200


def test_review_comment_does_not_reset_approval(client, analyst_headers, admin_headers):
    insight = _create_insight(client, analyst_headers)
    _patch(client, insight["id"], admin_headers, {"human_status": "approved"})

    commented = _patch(
        client, insight["id"], analyst_headers, {"review_comment": "Catatan setelah disetujui."}
    ).json()
    assert commented["human_status"] == "approved"
    assert commented["last_edited_by"] is None


def test_review_comment_and_approval_in_one_request(client, analyst_headers, admin_headers):
    insight = _create_insight(client, analyst_headers)
    response = _patch(
        client, insight["id"], admin_headers, {"review_comment": "OK", "human_status": "approved"}
    )
    assert response.status_code == 200


def test_review_comment_author_is_audited(client, analyst_headers, viewer_headers):
    insight = _create_insight(client, analyst_headers)
    _patch(client, insight["id"], viewer_headers, {"review_comment": "Komentar viewer"})

    items = client.get("/data/audit", headers=viewer_headers, params={"limit": 200}).json()["items"]
    entry = next(
        e for e in items if e["action"] == "insight.update" and e["entity_id"] == insight["id"]
    )
    assert entry["detail"]["changes"]["review_comment"] == "Komentar viewer"
    assert entry["actor_email"] == "sinta@talentpulse.local"


def test_review_comment_is_never_exported(client, analyst_headers, admin_headers):
    marker = "RAHASIA-KOMENTAR-PENINJAU"
    insight = _create_insight(client, analyst_headers)
    _patch(client, insight["id"], admin_headers, {"review_comment": marker})

    end = datetime.utcnow()
    report = client.post(
        "/reports",
        headers=analyst_headers,
        json={
            "title": "Laporan komentar",
            "period_start": (end - timedelta(days=30)).isoformat(),
            "period_end": end.isoformat(),
            "insight_ids": [insight["id"]],
            "charts": ["volume"],
        },
    ).json()

    preview = client.get(f"/reports/{report['id']}/preview", headers=analyst_headers)
    assert preview.status_code == 200
    assert marker not in preview.text
    assert "review_comment" not in preview.text
    for fmt in ("csv", "pdf", "posts"):
        exported = client.get(
            f"/reports/{report['id']}/export", headers=analyst_headers, params={"format": fmt}
        )
        assert exported.status_code == 200
        assert marker.encode() not in exported.content


def test_demo_accounts_list_names_without_roles(client):
    body = client.get("/auth/demo-accounts").json()
    assert [a["name"] for a in body["accounts"]] == [
        "Rani Prameswari",
        "Dimas Anugrah",
        "Sinta Larasati",
    ]
    assert all(set(a) == {"name", "email"} for a in body["accounts"])
    assert body["password"]
    for account in body["accounts"]:
        login = client.post(
            "/auth/login", json={"email": account["email"], "password": body["password"]}
        )
        assert login.status_code == 200


def test_demo_accounts_hidden_in_production(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "environment", "production")
    assert client.get("/auth/demo-accounts").status_code == 404
