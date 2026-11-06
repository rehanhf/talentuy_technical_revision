"""CRUD query tersimpan dan monitor (Monitoring)."""

from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import analytics
from app.timeutil import utcnow
from app.database import get_db
from app.deps import get_current_user, write_audit
from app.filters import FilterSet, apply_saved_query, filtered_query
from app.models import Monitor, Post, SourceQuery, User
from app.schemas import (
    MonitorIn,
    MonitorOut,
    MonitorUpdate,
    SourceQueryIn,
    SourceQueryOut,
    SourceQueryUpdate,
)

router = APIRouter(tags=["monitoring"])


def _query_out(query: SourceQuery) -> SourceQueryOut:
    return SourceQueryOut(
        id=query.id,
        name=query.name,
        query_text=query.query_text,
        include_keywords=query.include_keywords or [],
        exclude_keywords=query.exclude_keywords or [],
        job_roles=query.job_roles or [],
        topics=query.topics or [],
        sentiments=query.sentiments or [],
        intents=query.intents or [],
        owner_name=query.owner.name if query.owner else None,
        is_saved=query.is_saved,
        is_archived=query.is_archived,
        created_at=query.created_at,
        updated_at=query.updated_at,
    )


# --------------------------------------------------------------------- queries


@router.get("/queries", response_model=list[SourceQueryOut])
def list_queries(
    include_archived: bool = False,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[SourceQueryOut]:
    stmt = select(SourceQuery).order_by(SourceQuery.created_at.desc())
    if not include_archived:
        stmt = stmt.where(SourceQuery.is_archived.is_(False))
    return [_query_out(q) for q in db.scalars(stmt).all()]


@router.post("/queries", response_model=SourceQueryOut, status_code=201)
def create_query(
    payload: SourceQueryIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SourceQueryOut:
    query = SourceQuery(**payload.model_dump(), owner_id=user.id)
    db.add(query)
    db.flush()
    write_audit(db, user, "query.create", "source_query", query.id, {"name": query.name})
    db.commit()
    return _query_out(query)


@router.patch("/queries/{query_id}", response_model=SourceQueryOut)
def update_query(
    query_id: str,
    payload: SourceQueryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SourceQueryOut:
    query = db.get(SourceQuery, query_id)
    if query is None:
        raise HTTPException(status_code=404, detail="Query tidak ditemukan.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(query, field, value)
    write_audit(db, user, "query.update", "source_query", query.id)
    db.commit()
    return _query_out(query)


@router.delete("/queries/{query_id}", status_code=204)
def delete_query(
    query_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    query = db.get(SourceQuery, query_id)
    if query is None:
        raise HTTPException(status_code=404, detail="Query tidak ditemukan.")
    db.delete(query)
    write_audit(db, user, "query.delete", "source_query", query_id)
    db.commit()
    return Response(status_code=204)


# -------------------------------------------------------------------- monitors


def _monitor_out(db: Session, monitor: Monitor) -> MonitorOut:
    """Hitung tren jendela perbandingan monitor langsung dari database."""
    window = monitor.comparison_window
    end = utcnow().replace(hour=23, minute=59, second=59, microsecond=0)
    start = (end - timedelta(days=window - 1)).replace(hour=0, minute=0, second=0)

    filters = FilterSet(date_from=start, date_to=end, query_id=monitor.source_query_id)
    filters = apply_saved_query(db, filters)

    current = int(db.scalar(filtered_query(filters, db, func.count(Post.id))) or 0)
    prev_from, prev_to = filters.previous_window
    previous = int(
        db.scalar(
            filtered_query(
                filters, db, func.count(Post.id), date_from=prev_from, date_to=prev_to
            )
        )
        or 0
    )
    change = analytics.percent_change(current, previous)

    if change is None:
        direction = "tidak cukup data"
    elif change > 5:
        direction = "naik"
    elif change < -5:
        direction = "turun"
    else:
        direction = "stabil"

    return MonitorOut(
        id=monitor.id,
        name=monitor.name,
        owner_name=monitor.owner.name if monitor.owner else None,
        comparison_window=window,
        is_active=monitor.is_active,
        is_archived=monitor.is_archived,
        created_at=monitor.created_at,
        source_query=_query_out(monitor.source_query),
        current_count=current,
        previous_count=previous,
        change_percent=change,
        trend_direction=direction,
        sparkline=analytics.daily_volume(db, filters),
    )


@router.get("/monitors", response_model=list[MonitorOut])
def list_monitors(
    include_archived: bool = False,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[MonitorOut]:
    stmt = select(Monitor).order_by(Monitor.created_at.desc())
    if not include_archived:
        stmt = stmt.where(Monitor.is_archived.is_(False))
    return [_monitor_out(db, m) for m in db.scalars(stmt).all()]


@router.post("/monitors", response_model=MonitorOut, status_code=201)
def create_monitor(
    payload: MonitorIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MonitorOut:
    query_id = payload.source_query_id
    if payload.source_query is not None:
        query = SourceQuery(**payload.source_query.model_dump(), owner_id=user.id)
        db.add(query)
        db.flush()
        query_id = query.id
    if not query_id or db.get(SourceQuery, query_id) is None:
        raise HTTPException(
            status_code=422, detail="Monitor memerlukan query tersimpan yang valid."
        )

    monitor = Monitor(
        name=payload.name,
        source_query_id=query_id,
        owner_id=user.id,
        comparison_window=payload.comparison_window,
    )
    db.add(monitor)
    db.flush()
    write_audit(db, user, "monitor.create", "monitor", monitor.id, {"name": monitor.name})
    db.commit()
    return _monitor_out(db, monitor)


@router.patch("/monitors/{monitor_id}", response_model=MonitorOut)
def update_monitor(
    monitor_id: str,
    payload: MonitorUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MonitorOut:
    monitor = db.get(Monitor, monitor_id)
    if monitor is None:
        raise HTTPException(status_code=404, detail="Monitor tidak ditemukan.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(monitor, field, value)
    write_audit(db, user, "monitor.update", "monitor", monitor.id)
    db.commit()
    return _monitor_out(db, monitor)


@router.post("/monitors/{monitor_id}/duplicate", response_model=MonitorOut, status_code=201)
def duplicate_monitor(
    monitor_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MonitorOut:
    source = db.get(Monitor, monitor_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Monitor tidak ditemukan.")

    original = source.source_query
    copy_query = SourceQuery(
        name=f"{original.name} (salinan)",
        query_text=original.query_text,
        include_keywords=list(original.include_keywords or []),
        exclude_keywords=list(original.exclude_keywords or []),
        job_roles=list(original.job_roles or []),
        topics=list(original.topics or []),
        sentiments=list(original.sentiments or []),
        intents=list(original.intents or []),
        owner_id=user.id,
    )
    db.add(copy_query)
    db.flush()

    monitor = Monitor(
        name=f"{source.name} (salinan)",
        source_query_id=copy_query.id,
        owner_id=user.id,
        comparison_window=source.comparison_window,
    )
    db.add(monitor)
    db.flush()
    write_audit(db, user, "monitor.duplicate", "monitor", monitor.id)
    db.commit()
    return _monitor_out(db, monitor)
