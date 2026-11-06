"""Skema Pydantic untuk request/response API."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from app.privacy import anonymize_post_url

Role = Literal["admin", "analyst", "viewer"]
HumanStatus = Literal["draft", "reviewed", "approved"]


# Domain akun demo (@talentpulse.local) ditolak validator email ketat karena
# `.local` adalah TLD khusus, sehingga dipakai validasi bentuk sederhana.
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not EMAIL_PATTERN.match(cleaned):
            raise ValueError("Format email tidak valid.")
        return cleaned


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: Role
    is_active: bool

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class ResponseMeta(BaseModel):
    """Metadata wajib pada setiap response dashboard."""

    record_count: int
    period_start: str
    period_end: str
    period_label: str
    comparison_start: str
    comparison_end: str
    data_source_mode: Literal["demo", "live"]
    is_synthetic: bool
    last_updated: str | None = None
    is_stale: bool = False
    model_version: str
    search_provider: str
    applied_filters: dict[str, Any]


class TopicOut(BaseModel):
    id: str
    slug: str
    name: str
    description: str
    color: str
    keywords: list[str]
    is_active: bool

    class Config:
        from_attributes = True


class TopicUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    keywords: list[str] | None = None
    is_active: bool | None = None


class LabelExplanation(BaseModel):
    """Dasar penetapan satu label: aturan yang terpicu dan kata pemicunya."""

    rule: str = ""
    triggers: list[str] = []
    corrected: bool = False
    # Aturan otomatis semula, disimpan saat label dikoreksi manual.
    auto_rule: str = ""


class PostOut(BaseModel):
    id: str
    external_post_id: str
    text: str
    created_at_source: datetime
    language: str
    source: str
    url: str | None
    is_synthetic: bool
    like_count: int
    repost_count: int
    reply_count: int
    quote_count: int
    engagement_score: float
    sentiment_label: str
    intent_label: str
    job_role: str
    topic_slug: str | None
    topic_name: str | None
    relevance_score: float
    needs_review: bool
    keywords: list[str] = []
    # Kunci: topic, sentiment, intent, job_role. Kosong bila post dianalisis
    # sebelum dasar klasifikasi disimpan (jalankan analisis ulang).
    explanation: dict[str, LabelExplanation] = {}
    # Confidence ditampilkan untuk seluruh pengguna yang telah login.
    sentiment_confidence: float | None = None
    intent_confidence: float | None = None
    model_version: str | None = None

    @field_validator("url")
    @classmethod
    def _strip_username(cls, value: str | None) -> str | None:
        # Jaring pengaman untuk baris lama yang belum dimigrasi: username di
        # URL post X tidak pernah dikirim ke frontend.
        return anonymize_post_url(value)


LabelField = Literal["topic", "sentiment", "intent", "job_role"]


class KeywordPresetIn(BaseModel):
    topic_slug: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=120)
    query_text: str = Field(min_length=1, max_length=300)
    sort_order: int = 0
    is_active: bool = True


class KeywordPresetUpdate(BaseModel):
    topic_slug: str | None = Field(default=None, min_length=1, max_length=80)
    label: str | None = Field(default=None, min_length=1, max_length=120)
    query_text: str | None = Field(default=None, min_length=1, max_length=300)
    sort_order: int | None = None
    is_active: bool | None = None


class KeywordPresetOut(BaseModel):
    id: str
    topic_slug: str
    topic_name: str
    label: str
    query_text: str
    sort_order: int
    is_active: bool


class PostListResponse(BaseModel):
    items: list[PostOut]
    total: int
    page: int
    page_size: int
    total_pages: int
    highlight_terms: list[str]
    meta: ResponseMeta


class SourceQueryIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    query_text: str = ""
    include_keywords: list[str] = []
    exclude_keywords: list[str] = []
    job_roles: list[str] = []
    topics: list[str] = []
    sentiments: list[str] = []
    intents: list[str] = []
    is_saved: bool = True


class SourceQueryUpdate(BaseModel):
    name: str | None = None
    query_text: str | None = None
    include_keywords: list[str] | None = None
    exclude_keywords: list[str] | None = None
    job_roles: list[str] | None = None
    topics: list[str] | None = None
    sentiments: list[str] | None = None
    intents: list[str] | None = None
    is_archived: bool | None = None


class SourceQueryOut(BaseModel):
    id: str
    name: str
    query_text: str
    include_keywords: list[str]
    exclude_keywords: list[str]
    job_roles: list[str]
    topics: list[str]
    sentiments: list[str]
    intents: list[str]
    owner_name: str | None = None
    is_saved: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime


class MonitorIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    source_query: SourceQueryIn | None = None
    source_query_id: str | None = None
    comparison_window: int = Field(default=7, ge=1, le=90)


class MonitorUpdate(BaseModel):
    name: str | None = None
    comparison_window: int | None = Field(default=None, ge=1, le=90)
    is_active: bool | None = None
    is_archived: bool | None = None


class MonitorOut(BaseModel):
    id: str
    name: str
    owner_name: str | None
    comparison_window: int
    is_active: bool
    is_archived: bool
    created_at: datetime
    source_query: SourceQueryOut
    current_count: int
    previous_count: int
    change_percent: float | None
    trend_direction: Literal["naik", "turun", "stabil", "tidak cukup data"]
    sparkline: list[dict[str, Any]]


class InsightIn(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    summary: str = ""
    human_note: str = ""
    evidence_filters: dict[str, Any] = {}
    metric_snapshot: dict[str, Any] = {}
    human_status: HumanStatus = "draft"


class InsightUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    human_note: str | None = None
    evidence_filters: dict[str, Any] | None = None
    metric_snapshot: dict[str, Any] | None = None
    review_comment: str | None = Field(default=None, max_length=2000)
    human_status: HumanStatus | None = None


class InsightOut(BaseModel):
    id: str
    title: str
    summary: str
    human_note: str
    evidence_filters: dict[str, Any]
    metric_snapshot: dict[str, Any]
    review_comment: str
    human_status: HumanStatus
    is_synthetic_data: bool
    author_name: str | None
    created_by: str | None
    last_edited_by: str | None
    first_approved_at: datetime | None
    created_at: datetime
    updated_at: datetime


class SuggestedInsight(BaseModel):
    title: str
    summary: str
    evidence_filters: dict[str, Any]
    metric_snapshot: dict[str, Any]


class ReportIn(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    period_start: datetime
    period_end: datetime
    insight_ids: list[str] = []
    charts: list[str] = []
    notes: str = ""
    query_snapshot: dict[str, Any] = {}

    @field_validator("charts")
    @classmethod
    def _limit_charts(cls, value: list[str]) -> list[str]:
        return value[:6]


class ReportOut(BaseModel):
    id: str
    title: str
    period_start: datetime
    period_end: datetime
    insight_ids: list[str]
    charts: list[str]
    notes: str
    query_snapshot: dict[str, Any]
    author_name: str | None
    generated_at: datetime
    insights: list[InsightOut] = []


class ImportResult(BaseModel):
    run_id: str
    records_received: int
    records_processed: int
    records_failed: int
    status: str
    errors: list[str]


class PublicPostUrlIn(BaseModel):
    url: str = Field(min_length=20, max_length=500)


class IngestionRunOut(BaseModel):
    id: str
    source: str
    started_at: datetime
    completed_at: datetime | None
    records_received: int
    records_processed: int
    records_failed: int
    status: str
    error_summary: str


class UsabilityEventIn(BaseModel):
    session_key: str = Field(min_length=1, max_length=64)
    task_code: str = ""
    event_type: str
    step_count: int = 0
    duration_ms: int = 0
    filter_keys: list[str] = []
