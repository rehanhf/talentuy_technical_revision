"""Endpoint dashboard: overview, tren, topik, heatmap, pertanyaan, kata terkait."""

from __future__ import annotations

from dataclasses import replace

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import analytics
from app.database import get_db
from app.deps import get_current_user
from app.filters import FilterSet, apply_saved_query, filter_params
from app.meta import build_meta
from app.models import User
from app.nlp.summarizer import summarizer
from app.taxonomy import PRODUCT_LIMITATIONS

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _resolve(db: Session, filters: FilterSet) -> FilterSet:
    return apply_saved_query(db, filters)


@router.get("/overview")
def overview(
    filters: FilterSet = Depends(filter_params),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    filters = _resolve(db, filters)
    kpis = analytics.overview_kpis(db, filters)
    series = analytics.daily_volume(db, filters)
    topics = analytics.topic_breakdown(db, filters)

    return {
        "kpis": kpis,
        "volume_series": series,
        "peaks": analytics.detect_issue_spikes(db, filters)[:5],
        "spike_rule": analytics.spike_rule(),
        "topics": topics[:12],
        "sentiment_by_role": analytics.sentiment_by_role(db, filters)[:8],
        "heatmap": analytics.concern_heatmap(db, filters),
        "attention_issues": analytics.attention_issues(db, filters),
        "top_questions": analytics.top_questions(db, filters, limit=8),
        "intents": analytics.intent_breakdown(db, filters),
        "job_roles": analytics.job_role_breakdown(db, filters)[:10],
        "limitations": PRODUCT_LIMITATIONS,
        "meta": build_meta(db, filters, kpis["total_posts"]["value"]),
    }


@router.get("/trends")
def trends(
    granularity: str = Query("daily", pattern="^(daily|weekly)$"),
    breakdown: str = Query("topic", pattern="^(topic|job_role|sentiment|none)$"),
    filters: FilterSet = Depends(filter_params),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    filters = _resolve(db, filters)
    daily = analytics.daily_volume(db, filters)
    series = analytics.weekly_volume(daily) if granularity == "weekly" else daily
    series = analytics.indexed_series(series)

    prev_from, prev_to = filters.previous_window
    previous_daily = analytics.daily_volume(db, filters, date_from=prev_from, date_to=prev_to)
    previous = (
        analytics.weekly_volume(previous_daily) if granularity == "weekly" else previous_daily
    )

    current_total = sum(p["count"] for p in daily)
    previous_total = sum(p["count"] for p in previous_daily)

    breakdown_rows: list[dict] = []
    if breakdown == "topic":
        breakdown_rows = analytics.topic_breakdown(db, filters)[:10]
    elif breakdown == "job_role":
        breakdown_rows = analytics.job_role_breakdown(db, filters)[:10]
    elif breakdown == "sentiment":
        breakdown_rows = analytics.sentiment_breakdown(db, filters)

    peaks = analytics.detect_issue_spikes(db, filters)
    return {
        "granularity": granularity,
        "series": series,
        "previous_series": previous,
        "comparison": {
            "current_total": current_total,
            "previous_total": previous_total,
            "change_percent": analytics.percent_change(current_total, previous_total),
        },
        "breakdown_type": breakdown,
        "breakdown": breakdown_rows,
        "peaks": peaks,
        "spike_rule": analytics.spike_rule(),
        "annotations": [
            {
                "date": peak["date"],
                "label": f"Lonjakan terdeteksi: {peak['topic_name']} ({peak['count']} post/minggu)",
                "note": "Lonjakan bersifat deskriptif; penyebab perlu ditinjau manusia.",
            }
            for peak in peaks[:3]
        ],
        "meta": build_meta(db, filters, current_total),
    }


@router.get("/topics")
def topics(
    filters: FilterSet = Depends(filter_params),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    filters = _resolve(db, filters)
    rows = analytics.topic_breakdown(db, filters)
    total = sum(t["count"] for t in rows)
    return {
        "topics": rows,
        "partitions": analytics.topic_role_partitions(db, filters),
        "total_posts": total,
        "related_keywords": analytics.related_keywords(db, filters),
        "questions": analytics.top_questions(db, filters, limit=10),
        "meta": build_meta(db, filters, total),
    }


@router.get("/topics/{slug}")
def topic_detail(
    slug: str,
    filters: FilterSet = Depends(filter_params),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    filters = _resolve(db, filters)
    # Share dihitung terhadap seluruh percakapan pada filter aktif, bukan
    # terhadap topik itu sendiri, sehingga angkanya tetap bermakna.
    rows = analytics.topic_breakdown(db, filters)
    topic = next((t for t in rows if t["slug"] == slug), None)

    filters.topics = [slug]
    series = analytics.daily_volume(db, filters)
    total = sum(p["count"] for p in series)

    context = {
        "topic": topic["name"] if topic else slug,
        "share_percent": topic["share"] if topic else 0.0,
        "period": filters.period_label(),
        "change_percent": topic["change_percent"] if topic else None,
        "keywords": [n["label"] for n in analytics.related_keywords(db, filters, 8)["nodes"]],
    }

    return {
        "topic": topic,
        "series": series,
        "peaks": analytics.detect_issue_spikes(db, filters),
        "spike_rule": analytics.spike_rule(),
        "sentiment": analytics.sentiment_breakdown(db, filters),
        "intents": analytics.intent_breakdown(db, filters),
        "job_roles": analytics.job_role_breakdown(db, filters)[:8],
        "related_keywords": analytics.related_keywords(db, filters, 18),
        "questions": analytics.top_questions(db, filters, limit=8),
        "suggested_summary": summarizer.summarize(context),
        "meta": build_meta(db, filters, total),
    }


@router.get("/heatmap")
def heatmap(
    filters: FilterSet = Depends(filter_params),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    filters = _resolve(db, filters)
    data = analytics.concern_heatmap(db, filters)
    return {**data, "meta": build_meta(db, filters, sum(c["count"] for c in data["cells"]))}


@router.get("/questions")
def questions(
    limit: int = Query(20, ge=1, le=100),
    filters: FilterSet = Depends(filter_params),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    filters = _resolve(db, filters)
    items = analytics.top_questions(db, filters, limit=limit)
    return {"items": items, "meta": build_meta(db, filters, len(items))}


@router.get("/keywords")
def keywords(
    limit: int = Query(24, ge=5, le=60),
    filters: FilterSet = Depends(filter_params),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    filters = _resolve(db, filters)
    data = analytics.related_keywords(db, filters, limit)
    return {**data, "meta": build_meta(db, filters, len(data["nodes"]))}


@router.get("/insight-suggestions")
def insight_suggestions(
    filters: FilterSet = Depends(filter_params),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """Draft insight otomatis berbasis template; wajib ditinjau manusia."""
    filters = _resolve(db, filters)
    topics = analytics.topic_breakdown(db, filters)
    total = sum(t["count"] for t in topics)
    suggestions = []
    for topic in topics[:5]:
        # Kata kunci dihitung khusus untuk topik ini agar setiap draft insight
        # menyebut istilah yang benar-benar muncul di dalam topiknya.
        topic_filters = replace(filters, topics=[topic["slug"]])
        keyword_nodes = analytics.related_keywords(db, topic_filters, 8)["nodes"]
        context = {
            "topic": topic["name"],
            "share_percent": topic["share"],
            "period": filters.period_label(),
            "change_percent": topic["change_percent"],
            "keywords": [n["label"] for n in keyword_nodes][:4],
        }
        suggestions.append(
            {
                "title": f"{topic['name']} — {topic['count']} post pada periode terpilih",
                "summary": summarizer.summarize(context),
                "evidence_filters": {**filters.as_dict(), "topics": [topic["slug"]]},
                "metric_snapshot": {
                    "count": topic["count"],
                    "share": topic["share"],
                    "change_percent": topic["change_percent"],
                    "dominant_sentiment": topic["dominant_sentiment"],
                    "negative_share": topic["negative_share"],
                },
            }
        )
    return {
        "suggestions": suggestions,
        "notice": "Draft otomatis. Tinjau dan sunting sebelum digunakan.",
        "meta": build_meta(db, filters, total),
    }
