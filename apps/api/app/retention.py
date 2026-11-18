"""Retensi data nyata: penghapusan permanen otomatis berdasarkan relevansi.

Aturan (dihitung dari ``ingested_at``, yaitu saat post masuk ke sistem):

- **Post tidak relevan** dihapus permanen ``RETENTION_IRRELEVANT_DAYS`` hari
  (bawaan 14) setelah masuk. Post dianggap tidak relevan bila tidak lolos filter
  relevansi: tidak masuk kelompok isu (topik) mana pun, atau skor relevansinya di
  bawah ``RETENTION_RELEVANCE_MIN_SCORE`` (bawaan 0 = hanya syarat topik).
- **Post relevan** dihapus permanen tepat ``RETENTION_RAW_DAYS`` hari (bawaan 90)
  setelah masuk, tanpa masa tenggang tambahan.

Relevansi dinilai dari label terkini, jadi koreksi manual yang menetapkan topik
membuat post menjadi relevan. Balasan mewarisi relevansi induknya **hanya untuk
masa simpan**: balasan dari induk yang relevan disimpan selama induknya, dan
saat induk terhapus balasan dinilai dari relevansinya sendiri. Post yang sudah ditandai terhapus (``deleted_at``)
juga dihapus permanen. Data sintetis (demo) tidak pernah disentuh. Hasil analisis
ikut terhapus; balasan dari post yang terhapus tetap ada tetapi tautan
``induk_id``-nya dilepas. Setiap putaran yang menghapus data dicatat di audit log
sebagai ``retention.run``.

Dijalankan saat backend menyala lalu setiap ``RETENTION_INTERVAL_HOURS`` jam,
atau manual: ``python -m app.retention``.
"""

from __future__ import annotations

import logging
import threading
from datetime import datetime, timedelta

from sqlalchemy import and_, delete, or_, select, update
from sqlalchemy.orm import Session, aliased

from app.config import settings
from app.database import SessionLocal
from app.deps import write_audit
from app.models import Post, PostAnalysis
from app.timeutil import utcnow

logger = logging.getLogger("talentpulse.retention")


ParentPost = aliased(Post)
ParentAnalysis = aliased(PostAnalysis)


def is_relevant_clause(analysis=PostAnalysis):
    """Kondisi SQL 'lolos filter relevansi' pada satu hasil analisis."""
    clause = analysis.topic_id.is_not(None)
    if settings.retention_relevance_min_score > 0:
        clause = clause & (analysis.relevance_score >= settings.retention_relevance_min_score)
    return clause


def retention_relevant_clause():
    """Relevan untuk keperluan retensi: post itu sendiri relevan, ATAU post ini
    balasan dari induk yang relevan.

    Pewarisan ini hanya untuk masa simpan. Label dan perhitungan volume balasan
    tetap memakai teksnya sendiri, sehingga balasan seperti "iya bener banget"
    tidak ikut dihitung sebagai isu dan tidak memicu aturan lonjakan.
    """
    own = and_(PostAnalysis.id.is_not(None), is_relevant_clause(PostAnalysis))
    via_parent = and_(ParentAnalysis.id.is_not(None), is_relevant_clause(ParentAnalysis))
    return or_(own, via_parent)


def _erase(db: Session, ids: list[str]) -> int:
    erased = 0
    for start in range(0, len(ids), 500):
        chunk = ids[start : start + 500]
        # Balasan dari post yang dihapus tetap ada, tautannya dilepas.
        db.execute(
            update(Post)
            .where(Post.induk_id.in_(chunk))
            .values(induk_id=None)
            .execution_options(synchronize_session=False)
        )
        db.execute(
            delete(PostAnalysis)
            .where(PostAnalysis.post_id.in_(chunk))
            .execution_options(synchronize_session=False)
        )
        erased += db.execute(
            delete(Post).where(Post.id.in_(chunk)).execution_options(synchronize_session=False)
        ).rowcount or 0
    return erased


def run_retention(db: Session, *, now: datetime | None = None) -> dict:
    """Jalankan satu putaran retensi. Mengembalikan ringkasan jumlah baris."""
    now = now or utcnow()
    irrelevant_cutoff = now - timedelta(days=settings.retention_irrelevant_days)
    relevant_cutoff = now - timedelta(days=settings.retention_raw_days)
    relevant = retention_relevant_clause()

    base = (
        select(Post.id)
        .select_from(Post)
        .outerjoin(PostAnalysis, PostAnalysis.post_id == Post.id)
        .outerjoin(ParentPost, ParentPost.id == Post.induk_id)
        .outerjoin(ParentAnalysis, ParentAnalysis.post_id == ParentPost.id)
        .where(Post.is_synthetic.is_(False))
    )

    # Tidak relevan (termasuk post tanpa hasil analisis): 14 hari setelah masuk.
    irrelevant_ids = list(
        db.scalars(base.where(~relevant, Post.ingested_at <= irrelevant_cutoff)).all()
    )
    # Relevan: tepat 90 hari setelah masuk.
    relevant_ids = list(
        db.scalars(base.where(relevant, Post.ingested_at <= relevant_cutoff)).all()
    )
    # Sisa penanda soft delete (mis. dari versi sebelumnya): hapus permanen.
    already_deleted = set(db.scalars(base.where(Post.deleted_at.is_not(None))).all())
    already_deleted -= set(irrelevant_ids) | set(relevant_ids)

    erased_irrelevant = _erase(db, irrelevant_ids)
    erased_relevant = _erase(db, relevant_ids)
    erased_flagged = _erase(db, sorted(already_deleted))

    summary = {
        "erased_irrelevant": int(erased_irrelevant),
        "erased_relevant": int(erased_relevant),
        "erased_previously_flagged": int(erased_flagged),
        "irrelevant_days": settings.retention_irrelevant_days,
        "relevant_days": settings.retention_raw_days,
        "relevance_min_score": settings.retention_relevance_min_score,
        "ran_at": now.isoformat(),
    }
    if erased_irrelevant or erased_relevant or erased_flagged:
        write_audit(db, None, "retention.run", "posts", "", summary)
    db.commit()
    return summary


def _run_once() -> None:
    try:
        with SessionLocal() as db:
            summary = run_retention(db)
        logger.info("Retensi selesai: %s", summary)
    except Exception:  # pragma: no cover - jangan sampai mematikan backend
        logger.exception("Retensi gagal dijalankan")


_stop = threading.Event()


def start_scheduler() -> threading.Thread | None:
    """Jalankan retensi sekarang lalu berkala di thread latar belakang."""
    if not settings.retention_enabled:
        logger.info("Retensi dinonaktifkan (RETENTION_ENABLED=false)")
        return None
    interval = max(1, settings.retention_interval_hours) * 3600

    def loop() -> None:
        while not _stop.is_set():
            _run_once()
            _stop.wait(interval)

    thread = threading.Thread(target=loop, name="retention", daemon=True)
    thread.start()
    return thread


def stop_scheduler() -> None:
    _stop.set()


if __name__ == "__main__":  # pragma: no cover
    logging.basicConfig(level=logging.INFO)
    with SessionLocal() as session:
        print(run_retention(session))
