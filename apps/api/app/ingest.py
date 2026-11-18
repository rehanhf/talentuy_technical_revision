"""Ingestion: menyimpan RawPost, menjalankan pipeline analisis, dan mencatat run."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.timeutil import utcnow
from app.connectors.base import RawPost
from app.models import IngestionRun, Post, PostAnalysis, Topic
from app.nlp.pipeline import pipeline
from app.privacy import anonymize_post_url, hash_author_id, mask_mentions


def topic_id_map(db: Session) -> dict[str, str]:
    return {slug: tid for slug, tid in db.execute(select(Topic.slug, Topic.id)).all()}


def analyze_and_attach(db: Session, post: Post, topics: dict[str, str]) -> PostAnalysis:
    result = pipeline.run(
        post.text,
        likes=post.like_count,
        reposts=post.repost_count,
        replies=post.reply_count,
        quotes=post.quote_count,
    )
    analysis = post.analysis or PostAnalysis(post_id=post.id)
    analysis.normalized_text = result.normalized_text
    analysis.sentiment_label = result.sentiment_label
    analysis.sentiment_confidence = result.sentiment_confidence
    analysis.intent_label = result.intent_label
    analysis.intent_confidence = result.intent_confidence
    analysis.topic_id = topics.get(result.topic_slug)
    analysis.job_role = result.job_role
    analysis.relevance_score = result.relevance_score
    analysis.engagement_score = result.engagement_score
    analysis.keywords = result.keywords
    analysis.explanation = result.explanation
    analysis.model_version = result.model_version
    analysis.needs_review = result.needs_review
    analysis.analyzed_at = utcnow()
    post.analysis = analysis
    return analysis


def link_replies(db: Session, external_ids: list[str]) -> int:
    """Isi ``induk_id`` untuk balasan yang induknya sudah tersimpan.

    Berlaku dua arah untuk post pada batch ini: balasan yang induknya sudah ada,
    dan balasan lama yang induknya baru saja diimpor. Mengembalikan jumlah
    tautan yang dibentuk.
    """
    if not external_ids:
        return 0
    batch = set(external_ids)
    pending = db.scalars(
        select(Post).where(
            Post.induk_id.is_(None),
            Post.induk_external_id.is_not(None),
            (Post.external_post_id.in_(batch)) | (Post.induk_external_id.in_(batch)),
        )
    ).all()
    if not pending:
        return 0
    parent_ids = dict(
        db.execute(
            select(Post.external_post_id, Post.id).where(
                Post.external_post_id.in_({p.induk_external_id for p in pending})
            )
        ).all()
    )
    linked = 0
    for reply in pending:
        parent_id = parent_ids.get(reply.induk_external_id)
        if parent_id and parent_id != reply.id:
            reply.induk_id = parent_id
            linked += 1
    db.flush()
    return linked


def ingest_posts(
    db: Session,
    raw_posts: list[RawPost],
    *,
    source: str,
    triggered_by: str | None = None,
    extra_errors: list[str] | None = None,
    records_received: int | None = None,
) -> IngestionRun:
    """Simpan post baru (idempoten pada external_post_id) lalu analisis."""
    run = IngestionRun(
        source=source,
        started_at=utcnow(),
        records_received=records_received if records_received is not None else len(raw_posts),
        triggered_by=triggered_by,
        status="running",
    )
    db.add(run)
    db.flush()

    topics = topic_id_map(db)
    errors = list(extra_errors or [])
    processed = 0

    existing_ids = set(
        db.scalars(
            select(Post.external_post_id).where(
                Post.external_post_id.in_([p.external_post_id for p in raw_posts])
            )
        ).all()
    ) if raw_posts else set()

    for raw in raw_posts:
        try:
            if raw.external_post_id in existing_ids:
                continue
            post = Post(
                external_post_id=raw.external_post_id,
                source=raw.source or source,
                # @handle akun lain di teks disamarkan menjadi @pengguna.
                text=mask_mentions(raw.text),
                created_at_source=raw.created_at_source,
                language=raw.language,
                # Semua connector melewati titik ini: username tidak pernah disimpan.
                author_public_id=hash_author_id(raw.author_public_id),
                like_count=raw.like_count,
                repost_count=raw.repost_count,
                reply_count=raw.reply_count,
                quote_count=raw.quote_count,
                url=anonymize_post_url(raw.url),
                is_synthetic=raw.is_synthetic,
                ingested_at=utcnow(),
                induk_external_id=raw.in_reply_to_external_id or None,
            )
            db.add(post)
            db.flush()
            analyze_and_attach(db, post, topics)
            existing_ids.add(raw.external_post_id)
            processed += 1
        except Exception as exc:  # pragma: no cover - jaring pengaman
            errors.append(f"{raw.external_post_id}: {exc}")

    link_replies(db, [p.external_post_id for p in raw_posts])

    run.records_processed = processed
    run.records_failed = len(errors)
    run.completed_at = utcnow()
    if errors and processed == 0:
        run.status = "failed"
    elif errors:
        run.status = "partial"
    else:
        run.status = "success"
    run.error_summary = "\n".join(errors[:50])
    db.commit()
    return run


def reanalyze_all(db: Session, triggered_by: str | None = None) -> IngestionRun:
    """Jalankan ulang pipeline untuk seluruh post (mis. setelah taxonomy berubah)."""
    run = IngestionRun(
        source="reanalysis", started_at=utcnow(), triggered_by=triggered_by
    )
    db.add(run)
    db.flush()

    topics = topic_id_map(db)
    posts = db.scalars(select(Post).where(Post.deleted_at.is_(None))).all()
    run.records_received = len(posts)
    errors: list[str] = []
    processed = 0
    for post in posts:
        try:
            analyze_and_attach(db, post, topics)
            processed += 1
        except Exception as exc:  # pragma: no cover
            errors.append(f"{post.external_post_id}: {exc}")

    run.records_processed = processed
    run.records_failed = len(errors)
    run.completed_at = utcnow()
    run.status = "success" if not errors else "partial"
    run.error_summary = "\n".join(errors[:50])
    db.commit()
    return run
