"""Pencarian post: boolean sederhana, filter, sorting, dan pagination."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.filters import FilterSet, apply_saved_query, filter_params, filtered_query
from app.meta import build_meta
from app.models import Post, PostAnalysis, Topic, User
from app.schemas import PostListResponse, PostOut
from app.search.sql import get_search_provider

router = APIRouter(prefix="/posts", tags=["posts"])

SORT_OPTIONS = {"relevance", "recent", "engagement"}


def _to_post_out(row) -> PostOut:
    post: Post = row[0]
    analysis: PostAnalysis = row[1]
    topic: Topic | None = analysis.topic
    return PostOut(
        id=post.id,
        external_post_id=post.external_post_id,
        text=post.text,
        created_at_source=post.created_at_source,
        language=post.language,
        source=post.source,
        url=post.url,
        is_synthetic=post.is_synthetic,
        like_count=post.like_count,
        repost_count=post.repost_count,
        reply_count=post.reply_count,
        quote_count=post.quote_count,
        engagement_score=analysis.engagement_score,
        sentiment_label=analysis.sentiment_label,
        intent_label=analysis.intent_label,
        job_role=analysis.job_role,
        topic_slug=topic.slug if topic else None,
        topic_name=topic.name if topic else None,
        relevance_score=round(analysis.relevance_score, 3),
        needs_review=analysis.needs_review,
        keywords=analysis.keywords or [],
        explanation=analysis.explanation or {},
        sentiment_confidence=analysis.sentiment_confidence,
        intent_confidence=analysis.intent_confidence,
        model_version=analysis.model_version,
    )


@router.get("", response_model=PostListResponse)
def list_posts(
    sort: str = Query("relevance"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
    filters: FilterSet = Depends(filter_params),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> PostListResponse:
    if sort not in SORT_OPTIONS:
        raise HTTPException(status_code=422, detail=f"Sort tidak dikenali: {sort}")
    filters = apply_saved_query(db, filters)

    total = int(db.scalar(filtered_query(filters, db, func.count(Post.id))) or 0)

    stmt = filtered_query(filters, db)
    if sort == "recent":
        stmt = stmt.order_by(Post.created_at_source.desc())
    elif sort == "engagement":
        stmt = stmt.order_by(PostAnalysis.engagement_score.desc())
    else:
        # Relevansi = skor tekstual pencarian + relevansi analisis + kebaruan.
        # Engagement sengaja tidak dimasukkan agar tidak mendominasi teks.
        text_rank = get_search_provider().rank_expression(filters.parsed_query)
        stmt = stmt.order_by(
            (text_rank * 0.6 + PostAnalysis.relevance_score * 0.4).desc(),
            Post.created_at_source.desc(),
        )

    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    return PostListResponse(
        items=[_to_post_out(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, -(-total // page_size)),
        highlight_terms=filters.parsed_query.highlight_terms,
        meta=build_meta(db, filters, total),
    )


@router.get("/{post_id}", response_model=PostOut)
def get_post(
    post_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> PostOut:
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Post tidak ditemukan.")
    if post.analysis is None:
        raise HTTPException(status_code=409, detail="Post belum dianalisis.")
    return _to_post_out((post, post.analysis))
