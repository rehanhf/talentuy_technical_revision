"""Insight workflow: draft -> reviewed -> approved, selalu melalui manusia.

Aturan tanpa role:
- Penulis dan penyunting isi terakhir tidak dapat menyetujui insight.
- Isi dan persetujuan diubah dalam dua permintaan terpisah.
- Perubahan isi insight yang sudah disetujui mengembalikannya ke draft.
- Insight yang pernah disetujui (first_approved_at terisi) tidak dapat dihapus.
- Setiap versi yang disetujui disimpan utuh di audit log.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, write_audit
from app.models import Insight, User
from app.schemas import InsightIn, InsightOut, InsightUpdate
from app.timeutil import utcnow

router = APIRouter(prefix="/insights", tags=["insights"])

CONTENT_FIELDS = ("title", "summary", "human_note", "evidence_filters", "metric_snapshot")


def _out(insight: Insight) -> InsightOut:
    return InsightOut(
        id=insight.id,
        title=insight.title,
        summary=insight.summary,
        human_note=insight.human_note,
        evidence_filters=insight.evidence_filters or {},
        metric_snapshot=insight.metric_snapshot or {},
        review_comment=insight.review_comment or "",
        human_status=insight.human_status,
        is_synthetic_data=insight.is_synthetic_data,
        author_name=insight.author.name if insight.author else None,
        created_by=insight.created_by,
        last_edited_by=insight.last_edited_by,
        first_approved_at=insight.first_approved_at,
        created_at=insight.created_at,
        updated_at=insight.updated_at,
    )


@router.get("", response_model=list[InsightOut])
def list_insights(
    status: str | None = Query(None, pattern="^(draft|reviewed|approved)$"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[InsightOut]:
    stmt = select(Insight).order_by(Insight.created_at.desc())
    if status:
        stmt = stmt.where(Insight.human_status == status)
    return [_out(i) for i in db.scalars(stmt).all()]


@router.post("", response_model=InsightOut, status_code=201)
def create_insight(
    payload: InsightIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InsightOut:
    if payload.human_status == "approved":
        raise HTTPException(
            status_code=403,
            detail="Insight tidak dapat disetujui oleh penulis atau penyunting terakhirnya.",
        )
    insight = Insight(
        **payload.model_dump(),
        created_by=user.id,
        is_synthetic_data=settings.effective_source_mode == "demo",
    )
    db.add(insight)
    db.flush()
    write_audit(db, user, "insight.create", "insight", insight.id, {"title": insight.title})
    db.commit()
    return _out(insight)


@router.patch("/{insight_id}", response_model=InsightOut)
def update_insight(
    insight_id: str,
    payload: InsightUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InsightOut:
    insight = db.get(Insight, insight_id)
    if insight is None:
        raise HTTPException(status_code=404, detail="Insight tidak ditemukan.")

    changes = payload.model_dump(exclude_unset=True)
    # review_comment bukan isi: tidak mengubah last_edited_by dan tidak
    # menggugurkan persetujuan. Penulisnya tetap tercatat lewat audit log.
    if "review_comment" in changes and changes["review_comment"] is None:
        changes["review_comment"] = ""
    # Hanya nilai yang benar-benar berbeda yang dihitung sebagai suntingan, agar
    # menyimpan ulang catatan yang sama tidak menggugurkan persetujuan.
    edited = [f for f in CONTENT_FIELDS if f in changes and changes[f] != getattr(insight, f)]
    for field in CONTENT_FIELDS:
        if field in changes and field not in edited:
            del changes[field]

    if changes.get("human_status") == "approved":
        if edited:
            raise HTTPException(
                status_code=422,
                detail="Ubah isi dan setujui dalam dua langkah terpisah.",
            )
        if user.id in {insight.created_by, insight.last_edited_by}:
            raise HTTPException(
                status_code=403,
                detail="Insight tidak dapat disetujui oleh penulis atau penyunting terakhirnya.",
            )

    before = {f: getattr(insight, f) for f in edited}
    if edited:
        insight.last_edited_by = user.id
        if insight.human_status == "approved":
            changes["human_status"] = "draft"

    for field, value in changes.items():
        setattr(insight, field, value)

    detail: dict = {"changes": changes, "before": before}
    if insight.human_status == "approved":
        if insight.first_approved_at is None:
            insight.first_approved_at = utcnow()
        detail["approved_snapshot"] = {f: getattr(insight, f) for f in CONTENT_FIELDS}
    write_audit(db, user, "insight.update", "insight", insight.id, detail)
    db.commit()
    return _out(insight)


@router.delete("/{insight_id}", status_code=204)
def delete_insight(
    insight_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    insight = db.get(Insight, insight_id)
    if insight is None:
        raise HTTPException(status_code=404, detail="Insight tidak ditemukan.")
    # Status ikut diperiksa untuk baris approved yang belum melewati migration.
    if insight.first_approved_at is not None or insight.human_status == "approved":
        raise HTTPException(
            status_code=409,
            detail="Insight yang pernah disetujui tidak dapat dihapus.",
        )
    db.delete(insight)
    write_audit(db, user, "insight.delete", "insight", insight_id)
    db.commit()
    return Response(status_code=204)
