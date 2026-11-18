"""Health check, koreksi label manual, dan log usability testing."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app import __version__
from app.timeutil import utcnow
from app.analytics import data_freshness
from app.config import settings
from app.database import get_db
from app.deps import get_current_user, write_audit
from app.models import Post, PostAnalysis, Topic, UsabilityEvent, User
from app.schemas import UsabilityEventIn
from app.taxonomy import INTENTS, JOB_ROLES, PRODUCT_LIMITATIONS, SENTIMENTS

router = APIRouter(tags=["system"])


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    database_ok = True
    detail = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - jalur kegagalan infra
        database_ok = False
        detail = str(exc)[:200]

    post_count = 0
    if database_ok:
        try:
            post_count = int(db.scalar(select(func.count(Post.id))) or 0)
        except Exception:  # tabel belum dibuat
            post_count = 0

    return {
        "status": "ok" if database_ok else "degraded",
        "version": __version__,
        "environment": settings.environment,
        "database": {"connected": database_ok, "detail": detail},
        "data_source_mode": settings.effective_source_mode,
        "seeded": post_count > 0,
        "post_count": post_count,
        "timestamp": utcnow().isoformat(),
    }


@router.get("/methodology")
def methodology(db: Session = Depends(get_db)) -> dict:
    """Halaman "Metodologi & Etika Data" dilayani dari backend agar konsisten."""
    freshness = data_freshness(db)
    return {
        "data_source_mode": settings.effective_source_mode,
        "is_synthetic": settings.effective_source_mode == "demo",
        "collection": (
            "Data diperoleh melalui X API resmi, provider pihak ketiga twitterapi.io, impor, atau dibangkitkan secara "
            "sintetis. Identitas penulis tidak disimpan oleh connector pencarian."
        ),
        "processing": (
            "Teks dinormalisasi, lalu diberi label topik, sentimen, dan intent oleh "
            "model baseline berbasis leksikon dan aturan yang dapat dijelaskan."
        ),
        "engagement_formula": (
            f"likes x {settings.engagement_weight_like} + reposts x "
            f"{settings.engagement_weight_repost} + replies x "
            f"{settings.engagement_weight_reply} + quotes x "
            f"{settings.engagement_weight_quote}"
        ),
        "ethics": [
            "Tidak melakukan profiling terhadap kandidat.",
            "Tidak menginferensi atribut sensitif apa pun.",
            "Tidak dipakai untuk keputusan menerima atau menolak kandidat.",
            "Tidak menyediakan pencarian berdasarkan identitas personal.",
            "Ekspor data mentah dibatasi pada Post ID dan tautan.",
            "TalentPulse tidak berafiliasi resmi dengan X.",
        ],
        "limitations": PRODUCT_LIMITATIONS,
        "freshness": freshness,
        "privacy": privacy_summary(),
    }


def privacy_summary() -> dict:
    """Ringkasan pelindungan data pribadi; angka retensi dibaca dari konfigurasi
    yang benar-benar dipakai job retensi, sehingga tampilan tidak bisa berbeda
    dari perilaku sistem."""
    return {
        "legal_basis": settings.privacy_legal_basis,
        "data_collected": (
            "Teks unggahan publik, waktu unggah, metrik interaksi (suka, repost, balasan, "
            "kutipan), ID post, dan ID post induk untuk balasan. Tidak ada atribut sensitif "
            "dan tidak ada data profil akun."
        ),
        "pseudonymisation": [
            "Username penulis disimpan sebagai HMAC-SHA256 berkunci dan tidak pernah ditampilkan.",
            "Tautan post disimpan tanpa username (x.com/i/status/{id}).",
            "Username akun lain yang disebut di teks (@handle) diganti @pengguna sebelum disimpan.",
            "Pencarian dan filter tidak dapat dilakukan berdasarkan identitas akun.",
        ],
        "retention": {
            "relevant_days": settings.retention_raw_days,
            "irrelevant_days": settings.retention_irrelevant_days,
            "check_interval_hours": settings.retention_interval_hours,
            "relevance_rule": (
                "Unggahan relevan bila masuk salah satu kelompok isu"
                + (
                    f" dan skor relevansinya minimal {settings.retention_relevance_min_score:g}"
                    if settings.retention_relevance_min_score > 0
                    else ""
                )
                + ". Untuk masa simpan, balasan mengikuti relevansi unggahan induknya."
            ),
            "applies_to": "Hanya data nyata; data demo sintetis tidak memuat data pribadi.",
            "enabled": settings.retention_enabled,
        },
    }


class LabelCorrection(BaseModel):
    sentiment_label: str | None = None
    intent_label: str | None = None
    topic_slug: str | None = None
    job_role: str | None = None
    needs_review: bool | None = None


_EXPLANATION_KEYS = {
    "topic_slug": "topic",
    "sentiment_label": "sentiment",
    "intent_label": "intent",
    "job_role": "job_role",
}

_ALLOWED_LABELS = {
    "sentiment_label": SENTIMENTS,
    "intent_label": INTENTS,
    "job_role": JOB_ROLES,
}


def _label_snapshot(analysis: PostAnalysis) -> dict:
    """Nilai label saat ini, dipakai untuk mencatat sebelum/sesudah di audit log."""
    return {
        "topic_slug": analysis.topic.slug if analysis.topic else None,
        "sentiment_label": analysis.sentiment_label,
        "intent_label": analysis.intent_label,
        "job_role": analysis.job_role,
        "needs_review": analysis.needs_review,
    }


def _validate_labels(changes: dict) -> None:
    for field, allowed in _ALLOWED_LABELS.items():
        value = changes.get(field)
        if value is not None and value not in allowed:
            raise HTTPException(status_code=422, detail=f"Label '{value}' tidak dikenal.")


@router.patch("/posts/{post_id}/labels")
def correct_labels(
    post_id: str,
    payload: LabelCorrection,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Koreksi manual label oleh pengguna login (human-in-the-loop)."""
    post = db.get(Post, post_id)
    if post is None or post.analysis is None:
        raise HTTPException(status_code=404, detail="Post atau analisisnya tidak ditemukan.")

    analysis: PostAnalysis = post.analysis
    changes = payload.model_dump(exclude_unset=True)
    _validate_labels(changes)
    before = _label_snapshot(analysis)

    # Catat label otomatis yang diganti agar dasar klasifikasi tetap jujur.
    explanation = {key: dict(value) for key, value in (analysis.explanation or {}).items()}
    for field, key in _EXPLANATION_KEYS.items():
        if field not in changes:
            continue
        if field == "topic_slug":
            previous = analysis.topic.name if analysis.topic else None
        else:
            previous = getattr(analysis, field)
        entry = explanation.get(key, {"rule": "", "triggers": []})
        if not entry.get("corrected"):
            entry["auto_rule"] = entry.get("rule", "")
        entry["corrected"] = True
        entry["rule"] = (
            f"Dikoreksi manual oleh {user.name}. Label sebelumnya: {previous or 'tanpa label'}."
        )
        explanation[key] = entry
    analysis.explanation = explanation

    if "topic_slug" in changes:
        slug = changes.pop("topic_slug")
        topic = db.scalar(select(Topic).where(Topic.slug == slug)) if slug else None
        if slug and topic is None:
            raise HTTPException(status_code=422, detail=f"Topik '{slug}' tidak dikenal.")
        analysis.topic_id = topic.id if topic else None

    for field, value in changes.items():
        setattr(analysis, field, value)

    # Label hasil koreksi manusia dianggap pasti.
    if "sentiment_label" in changes:
        analysis.sentiment_confidence = 1.0
    if "intent_label" in changes:
        analysis.intent_confidence = 1.0
    analysis.needs_review = changes.get("needs_review", False)
    analysis.corrected_by = user.id
    analysis.model_version = f"{analysis.model_version}+koreksi-manual"

    db.flush()
    db.expire(analysis, ["topic"])
    after = _label_snapshot(analysis)
    # Hanya kolom yang benar-benar berubah; waktu koreksi tersimpan di created_at.
    changed = [field for field in before if before[field] != after[field]]
    write_audit(
        db,
        user,
        "label.correct",
        "post",
        post.id,
        {
            "before": {field: before[field] for field in changed},
            "after": {field: after[field] for field in changed},
            "fields": changed,
        },
    )
    db.commit()
    return {"status": "ok", "post_id": post.id, "message": "Label berhasil diperbarui."}


@router.post("/posts/{post_id}/review")
def mark_post_reviewed(
    post_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Tandai post bertanda 'perlu ditinjau' sebagai sudah diperiksa manusia.

    Label otomatis dinyatakan benar apa adanya (tidak ada label yang diubah); hanya
    tanda needs_review yang dibersihkan. Tercatat di audit log sebagai
    ``label.review`` beserta nilai sebelum/sesudah dan label yang dikonfirmasi.
    """
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None or post.analysis is None:
        raise HTTPException(status_code=404, detail="Post atau analisisnya tidak ditemukan.")
    analysis: PostAnalysis = post.analysis
    if not analysis.needs_review:
        raise HTTPException(
            status_code=409, detail="Post ini tidak sedang ditandai perlu ditinjau."
        )

    confirmed = _label_snapshot(analysis)
    analysis.needs_review = False
    analysis.corrected_by = user.id
    write_audit(
        db,
        user,
        "label.review",
        "post",
        post.id,
        {
            "before": {"needs_review": True},
            "after": {"needs_review": False},
            "fields": ["needs_review"],
            "confirmed_labels": {k: v for k, v in confirmed.items() if k != "needs_review"},
        },
    )
    db.commit()
    return {"status": "ok", "post_id": post.id, "message": "Post ditandai sudah diperiksa."}


@router.post("/usability/events", status_code=201)
def log_usability_event(
    payload: UsabilityEventIn,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """Log privacy-preserving: hanya metrik alur, tanpa isi pencarian."""
    event = UsabilityEvent(
        session_key=payload.session_key[:64],
        task_code=payload.task_code[:40],
        event_type=payload.event_type[:40],
        step_count=max(0, payload.step_count),
        duration_ms=max(0, payload.duration_ms),
        # Hanya nama filter yang dicatat, bukan nilainya.
        filter_keys=[k[:40] for k in payload.filter_keys][:20],
    )
    db.add(event)
    db.commit()
    return {"status": "ok"}


@router.get("/usability/summary")
def usability_summary(
    db: Session = Depends(get_db), _user: User = Depends(get_current_user)
) -> dict:
    rows = db.execute(
        select(
            UsabilityEvent.task_code,
            UsabilityEvent.event_type,
            func.count(UsabilityEvent.id),
            func.avg(UsabilityEvent.duration_ms),
            func.avg(UsabilityEvent.step_count),
        ).group_by(UsabilityEvent.task_code, UsabilityEvent.event_type)
    ).all()
    return {
        "items": [
            {
                "task_code": task or "(tanpa tugas)",
                "event_type": event_type,
                "count": int(count),
                "avg_duration_ms": round(float(avg_duration or 0)),
                "avg_steps": round(float(avg_steps or 0), 1),
            }
            for task, event_type, count, avg_duration, avg_steps in rows
        ]
    }
