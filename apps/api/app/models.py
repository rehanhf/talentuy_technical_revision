"""Model ORM TalentPulse (bagian 14 dokumen spesifikasi)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.timeutil import utcnow


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="viewer")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(9), default="#2563EB")
    keywords: Mapped[list] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SourceQuery(Base):
    __tablename__ = "source_queries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    query_text: Mapped[str] = mapped_column(Text, default="")
    include_keywords: Mapped[list] = mapped_column(JSON, default=list)
    exclude_keywords: Mapped[list] = mapped_column(JSON, default=list)
    job_roles: Mapped[list] = mapped_column(JSON, default=list)
    topics: Mapped[list] = mapped_column(JSON, default=list)
    sentiments: Mapped[list] = mapped_column(JSON, default=list)
    intents: Mapped[list] = mapped_column(JSON, default=list)
    owner_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    is_saved: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    owner: Mapped[User | None] = relationship("User", lazy="joined")


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    external_post_id: Mapped[str] = mapped_column(
        String(80), unique=True, nullable=False, index=True
    )
    source: Mapped[str] = mapped_column(String(20), default="demo", nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at_source: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(8), default="id", nullable=False)
    author_public_id: Mapped[str | None] = mapped_column(String(80))
    like_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    repost_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reply_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quote_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    url: Mapped[str | None] = mapped_column(String(400))
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ingested_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, index=True)

    analysis: Mapped[PostAnalysis] = relationship(
        "PostAnalysis", back_populates="post", uselist=False, cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_posts_source_created", "source", "created_at_source"),)


class PostAnalysis(Base):
    __tablename__ = "post_analysis"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    post_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("posts.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    normalized_text: Mapped[str] = mapped_column(Text, default="")
    sentiment_label: Mapped[str] = mapped_column(String(20), default="Netral", index=True)
    sentiment_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    intent_label: Mapped[str] = mapped_column(String(40), default="Informasi Lowongan", index=True)
    intent_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    topic_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("topics.id"), index=True)
    job_role: Mapped[str] = mapped_column(String(60), default="Lainnya", index=True)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)
    engagement_score: Mapped[float] = mapped_column(Float, default=0.0, index=True)
    keywords: Mapped[list] = mapped_column(JSON, default=list)
    # Dasar klasifikasi per label (aturan + kata pemicu); lihat nlp/pipeline.py.
    explanation: Mapped[dict | None] = mapped_column(JSON)
    model_version: Mapped[str] = mapped_column(String(40), default="baseline-1.0.0")
    analyzed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    corrected_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))

    post: Mapped[Post] = relationship("Post", back_populates="analysis")
    topic: Mapped[Topic | None] = relationship("Topic", lazy="joined")

    __table_args__ = (
        Index("ix_analysis_topic_sentiment", "topic_id", "sentiment_label"),
        Index("ix_analysis_role_intent", "job_role", "intent_label"),
    )


class KeywordPreset(Base):
    """Kueri terpandu per kategori isu (karakteristik *starting* Ellis)."""

    __tablename__ = "keyword_presets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    topic_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    query_text: Mapped[str] = mapped_column(String(300), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    topic: Mapped[Topic] = relationship("Topic", lazy="joined")


class Monitor(Base):
    __tablename__ = "monitors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    source_query_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("source_queries.id", ondelete="CASCADE"), nullable=False
    )
    owner_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    comparison_window: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    source_query: Mapped[SourceQuery] = relationship("SourceQuery", lazy="joined")
    owner: Mapped[User | None] = relationship("User", lazy="joined")


class Insight(Base):
    __tablename__ = "insights"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="")
    human_note: Mapped[str] = mapped_column(Text, default="")
    evidence_filters: Mapped[dict] = mapped_column(JSON, default=dict)
    metric_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    # Komentar peninjau: bukan isi insight dan tidak pernah diekspor ke laporan.
    review_comment: Mapped[str] = mapped_column(
        Text, default="", server_default="", nullable=False
    )
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    human_status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    is_synthetic_data: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Tidak pernah dikosongkan: insight yang pernah disetujui tidak dapat dihapus.
    first_approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_edited_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    author: Mapped[User | None] = relationship(
        "User", lazy="joined", foreign_keys=[created_by]
    )


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    period_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    query_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    insight_ids: Mapped[list] = mapped_column(JSON, default=list)
    charts: Mapped[list] = mapped_column(JSON, default=list)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    author: Mapped[User | None] = relationship("User", lazy="joined")


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source: Mapped[str] = mapped_column(String(30), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    records_received: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_processed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="running", nullable=False)
    error_summary: Mapped[str] = mapped_column(Text, default="")
    triggered_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    actor_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    actor_email: Mapped[str] = mapped_column(String(255), default="")
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entity: Mapped[str] = mapped_column(String(80), default="")
    entity_id: Mapped[str] = mapped_column(String(80), default="")
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, nullable=False, index=True
    )


class UsabilityEvent(Base):
    """Log usability testing yang privacy-preserving (tanpa isi sensitif)."""

    __tablename__ = "usability_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_key: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    task_code: Mapped[str] = mapped_column(String(40), default="")
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    step_count: Mapped[int] = mapped_column(Integer, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    filter_keys: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
