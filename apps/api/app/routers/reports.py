"""Laporan insight dan ekspor PDF/CSV agregat."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import analytics
from app.timeutil import utcnow
from app.config import settings
from app.database import get_db
from app.deps import get_current_user, write_audit
from app.filters import FilterSet, apply_saved_query
from app.models import Insight, Report, User
from app.reporting import (
    build_post_reference_csv,
    build_report_csv,
    build_report_pdf,
    timestamp_slug,
)
from app.routers.insights import _out as insight_out
from app.schemas import ReportIn, ReportOut

router = APIRouter(prefix="/reports", tags=["reports"])


def _report_out(db: Session, report: Report) -> ReportOut:
    insights = (
        db.scalars(select(Insight).where(Insight.id.in_(report.insight_ids or []))).all()
        if report.insight_ids
        else []
    )
    return ReportOut(
        id=report.id,
        title=report.title,
        period_start=report.period_start,
        period_end=report.period_end,
        insight_ids=report.insight_ids or [],
        charts=report.charts or [],
        notes=report.notes,
        query_snapshot=report.query_snapshot or {},
        author_name=report.author.name if report.author else None,
        generated_at=report.generated_at,
        insights=[insight_out(i) for i in insights],
    )


@router.get("", response_model=list[ReportOut])
def list_reports(
    db: Session = Depends(get_db), _user: User = Depends(get_current_user)
) -> list[ReportOut]:
    reports = db.scalars(select(Report).order_by(Report.generated_at.desc())).all()
    return [_report_out(db, r) for r in reports]


@router.post("", response_model=ReportOut, status_code=201)
def create_report(
    payload: ReportIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReportOut:
    missing = [
        insight_id
        for insight_id in payload.insight_ids
        if db.get(Insight, insight_id) is None
    ]
    if missing:
        raise HTTPException(
            status_code=422, detail=f"Insight tidak ditemukan: {', '.join(missing)}"
        )

    report = Report(**payload.model_dump(), created_by=user.id)
    db.add(report)
    db.flush()
    write_audit(db, user, "report.create", "report", report.id, {"title": report.title})
    db.commit()
    return _report_out(db, report)


@router.get("/{report_id}", response_model=ReportOut)
def get_report(
    report_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)
) -> ReportOut:
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan.")
    return _report_out(db, report)


def _build_payload(db: Session, report: Report) -> dict:
    snapshot = report.query_snapshot or {}
    filters = FilterSet(
        date_from=report.period_start,
        date_to=report.period_end,
        data_type=snapshot.get("data_type") or "all",
        query_id=snapshot.get("query_id"),
        job_roles=snapshot.get("job_roles") or [],
        topics=snapshot.get("topics") or [],
        sentiments=snapshot.get("sentiments") or [],
        intents=snapshot.get("intents") or [],
        q=snapshot.get("q"),
    )
    from app.search.base import parse_query

    filters.parsed_query = parse_query(filters.q)
    filters = apply_saved_query(db, filters)

    kpis = analytics.overview_kpis(db, filters)
    topics = analytics.topic_breakdown(db, filters)[:10]
    sentiments = analytics.sentiment_breakdown(db, filters)
    roles = analytics.job_role_breakdown(db, filters)[:10]
    intents = analytics.intent_breakdown(db, filters)
    series = analytics.daily_volume(db, filters)

    change = kpis["total_posts"]["change_percent"]
    statistics = {
        "Total post": kpis["total_posts"]["value"],
        "Total periode pembanding": kpis["total_posts"]["previous"],
        "Perubahan volume (%)": "tidak dapat dihitung" if change is None else f"{change:.1f}",
        "Topik aktif": kpis["active_topics"]["value"],
        "Sentimen dominan": f"{kpis['dominant_sentiment']['value']} "
        f"({kpis['dominant_sentiment']['share']:.1f}%)",
        "Pertanyaan terdeteksi": kpis["detected_questions"]["value"],
        "Jenis pekerjaan teratas": kpis["top_job_role"]["value"],
    }

    chart_catalog = {
        "volume": {
            "key": "volume",
            "title": "Volume percakapan harian",
            "columns": ["Tanggal", "Jumlah post"],
            "rows": [[p["date"], p["count"]] for p in series],
        },
        "topics": {
            "key": "topics",
            "title": "Topik terbanyak",
            "columns": ["Topik", "Jumlah post"],
            "rows": [[t["name"], t["count"]] for t in topics],
        },
        "sentiment": {
            "key": "sentiment",
            "title": "Distribusi sentimen",
            "columns": ["Sentimen", "Jumlah post"],
            "rows": [[s["label"], s["count"]] for s in sentiments],
        },
        "job_roles": {
            "key": "job_roles",
            "title": "Jenis pekerjaan teratas",
            "columns": ["Jenis pekerjaan", "Jumlah post"],
            "rows": [[r["label"], r["count"]] for r in roles],
        },
        "intents": {
            "key": "intents",
            "title": "Kategori intent",
            "columns": ["Intent", "Jumlah post"],
            "rows": [[i["label"], i["count"]] for i in intents],
        },
    }
    selected = [chart_catalog[key] for key in (report.charts or []) if key in chart_catalog]

    insights = (
        db.scalars(select(Insight).where(Insight.id.in_(report.insight_ids or []))).all()
        if report.insight_ids
        else []
    )

    report_data_type = filters.data_type
    report_source_mode = (
        "demo"
        if report_data_type == "demo"
        else "live"
        if report_data_type in {"real", "twitterapi_io"}
        else settings.effective_source_mode
    )

    return {
        "title": report.title,
        "period_start": report.period_start.strftime("%d %b %Y"),
        "period_end": report.period_end.strftime("%d %b %Y"),
        "generated_at": report.generated_at.strftime("%d %b %Y %H:%M UTC"),
        "data_source_mode": report_source_mode,
        "is_synthetic": report_data_type == "demo"
        or (report_data_type == "all" and settings.effective_source_mode == "demo"),
        "query_snapshot": snapshot,
        "statistics": statistics,
        "charts_data": selected,
        "notes": report.notes,
        "insights": [
            {
                "title": i.title,
                "summary": i.summary,
                "human_note": i.human_note,
                "human_status": i.human_status,
            }
            for i in insights
        ],
        "_filters": filters,
    }


@router.get("/{report_id}/export")
def export_report(
    report_id: str,
    format: str = Query("pdf", pattern="^(pdf|csv|posts)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan.")

    payload = _build_payload(db, report)
    filters: FilterSet = payload.pop("_filters")
    slug = timestamp_slug()

    if format == "pdf":
        content = build_report_pdf(payload)
        media_type, body, ext = "application/pdf", content, "pdf"
    elif format == "csv":
        media_type = "text/csv; charset=utf-8"
        body = build_report_csv(payload).encode("utf-8-sig")
        ext = "csv"
    else:
        # Ekspor post-level dibatasi: hanya ID dan tautan.
        rows = analytics.top_questions(db, filters, limit=200)
        media_type = "text/csv; charset=utf-8"
        body = build_post_reference_csv(
            [
                {
                    "external_post_id": r["external_post_id"],
                    "created_at": r["created_at"],
                    "topic": r["topic"],
                    "job_role": r["job_role"],
                    "url": None,
                }
                for r in rows
            ],
            is_synthetic=payload["is_synthetic"],
        ).encode("utf-8-sig")
        ext = "csv"

    write_audit(db, user, "report.export", "report", report.id, {"format": format})
    db.commit()

    filename = f"talentpulse-{slug}-{format}.{ext}"
    return Response(
        content=body,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{report_id}", status_code=204)
def delete_report(
    report_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Response:
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan.")
    db.delete(report)
    write_audit(db, user, "report.delete", "report", report_id)
    db.commit()
    return Response(status_code=204)


@router.get("/{report_id}/preview")
def preview_report(
    report_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)
) -> dict:
    """Pratinjau isi laporan tanpa mengunduh berkas."""
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan.")
    payload = _build_payload(db, report)
    payload.pop("_filters")
    payload["generated_now"] = utcnow().isoformat()
    return payload
