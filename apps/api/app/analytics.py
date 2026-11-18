"""Logika analitik (bagian 17 dokumen spesifikasi).

Seluruh angka dashboard dihitung di sini dari database; tidak ada nilai
hardcoded di frontend.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.timeutil import utcnow
from app.filters import FilterSet, filtered_query
from app.models import Post, PostAnalysis, Topic
from app.nlp.baseline import _STOPWORDS  # daftar stopword bersama
from app.search.sql import get_search_provider

MIN_TOPIC_POSTS = 5  # threshold "Topik Aktif"


def percent_change(current: float, previous: float) -> float | None:
    """Perubahan relatif. Mengembalikan None bila pembanding nol (hindari inf)."""
    if previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 2)


def share_percent(part: float, total: float) -> float:
    if total == 0:
        return 0.0
    return round((part / total) * 100, 2)


def count_posts(
    db: Session,
    filters: FilterSet,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> int:
    stmt = filtered_query(
        filters, db, func.count(Post.id), date_from=date_from, date_to=date_to
    )
    return int(db.scalar(stmt) or 0)


def daily_volume(
    db: Session,
    filters: FilterSet,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> list[dict]:
    """Volume harian, termasuk tanggal tanpa post agar grafik tidak bolong."""
    start = date_from or filters.date_from
    end = date_to or filters.date_to
    day = func.date(Post.created_at_source)
    stmt = filtered_query(filters, db, day, func.count(Post.id), date_from=start, date_to=end)
    rows = db.execute(stmt.group_by(day).order_by(day)).all()

    counts: dict[str, int] = {}
    for raw_day, total in rows:
        key = raw_day.isoformat() if isinstance(raw_day, (date, datetime)) else str(raw_day)[:10]
        counts[key] = int(total)

    series: list[dict] = []
    cursor = start.date()
    last = end.date()
    while cursor <= last:
        key = cursor.isoformat()
        series.append({"date": key, "count": counts.get(key, 0)})
        cursor += timedelta(days=1)
    return series


def weekly_volume(series: list[dict]) -> list[dict]:
    buckets: dict[str, int] = defaultdict(int)
    for point in series:
        day = date.fromisoformat(point["date"])
        week_start = day - timedelta(days=day.weekday())
        buckets[week_start.isoformat()] += point["count"]
    return [{"date": k, "count": v} for k, v in sorted(buckets.items())]


def indexed_series(series: list[dict]) -> list[dict]:
    """Indeks 100 pada titik pertama non-nol — memudahkan pembacaan perubahan."""
    baseline = next((p["count"] for p in series if p["count"] > 0), 0)
    if baseline == 0:
        return [{**p, "indexed": 100.0} for p in series]
    return [{**p, "indexed": round(p["count"] / baseline * 100, 1)} for p in series]


def week_start(value: date) -> date:
    """Senin pada minggu yang memuat tanggal tersebut (minggu ISO)."""
    return value - timedelta(days=value.weekday())


def spike_rule() -> dict:
    """Parameter aturan lonjakan yang sedang berlaku (dari konfigurasi)."""
    return {
        "min_posts": settings.spike_min_posts,
        "min_increase_percent": settings.spike_min_increase_percent,
        "baseline_weeks": settings.spike_baseline_weeks,
        "description": (
            f"Suatu kelompok isu dinyatakan melonjak pada suatu minggu bila volumenya "
            f"minimal {settings.spike_min_posts} post dan naik minimal "
            f"{settings.spike_min_increase_percent:g}% dibanding rata-rata "
            f"{settings.spike_baseline_weeks} minggu sebelumnya."
        ),
    }


def evaluate_issue_week(count: int, previous_weeks: list[int]) -> tuple[bool, float, float | None]:
    """Terapkan aturan dua ambang pada satu kelompok isu untuk satu minggu.

    Mengembalikan (melonjak, rata-rata pembanding, kenaikan persen). Bila
    rata-rata pembanding nol, kenaikan tidak terdefinisi (None) dan ambang
    persentase dianggap terlampaui karena isu muncul dari nol.
    """
    baseline = sum(previous_weeks) / len(previous_weeks) if previous_weeks else 0.0
    increase = percent_change(count, baseline)
    meets_volume = count >= settings.spike_min_posts
    meets_increase = increase is None or increase >= settings.spike_min_increase_percent
    return meets_volume and meets_increase, baseline, increase


def detect_issue_spikes(db: Session, filters: FilterSet) -> list[dict]:
    """Deteksi lonjakan mingguan per kelompok isu (topik).

    Untuk setiap topik dan setiap minggu (Senin–Minggu) yang dimulai di dalam
    periode filter, volume minggu itu dibandingkan dengan rata-rata
    ``spike_baseline_weeks`` minggu sebelumnya. Lonjakan hanya dinilai bila
    seluruh minggu pembanding berada di dalam rentang data yang tersedia, agar
    awal dataset tidak terbaca sebagai lonjakan palsu. Filter lain (pekerjaan,
    sentimen, kata kunci, jenis data) tetap berlaku.

    Hasil bersifat deskriptif: "lonjakan terdeteksi", tanpa klaim penyebab.
    """
    baseline_weeks = max(1, settings.spike_baseline_weeks)
    first_week = week_start(filters.date_from.date())
    history_start = datetime.combine(
        first_week - timedelta(weeks=baseline_weeks), datetime.min.time()
    )

    # Minggu paling awal yang memiliki data (dengan jenis data yang sama).
    earliest_stmt = select(func.min(Post.created_at_source)).where(Post.deleted_at.is_(None))
    if filters.data_type in ("real", "twitterapi_io"):
        earliest_stmt = earliest_stmt.where(Post.is_synthetic.is_(False))
    elif filters.data_type == "demo":
        earliest_stmt = earliest_stmt.where(Post.is_synthetic.is_(True))
    earliest = db.scalar(earliest_stmt)
    if earliest is None:
        return []
    earliest_week = week_start(earliest.date())

    day = func.date(Post.created_at_source)
    stmt = filtered_query(
        filters,
        db,
        Topic.slug,
        Topic.name,
        Topic.color,
        day,
        func.count(Post.id),
        date_from=history_start,
        date_to=filters.date_to,
    ).join(Topic, Topic.id == PostAnalysis.topic_id)
    rows = db.execute(stmt.group_by(Topic.slug, Topic.name, Topic.color, day)).all()

    weekly: dict[str, dict[date, int]] = defaultdict(lambda: defaultdict(int))
    meta: dict[str, tuple[str, str]] = {}
    for slug, name, color, raw_day, total in rows:
        current = raw_day if isinstance(raw_day, date) else date.fromisoformat(str(raw_day)[:10])
        if isinstance(current, datetime):
            current = current.date()
        weekly[slug][week_start(current)] += int(total)
        meta[slug] = (name, color)

    last_day = filters.date_to.date()
    spikes: list[dict] = []
    for slug, counts in weekly.items():
        cursor = first_week
        while cursor <= last_day:
            window_start = cursor - timedelta(weeks=baseline_weeks)
            if window_start >= earliest_week:
                previous = [
                    counts.get(cursor - timedelta(weeks=offset), 0)
                    for offset in range(baseline_weeks, 0, -1)
                ]
                count = counts.get(cursor, 0)
                is_spike, baseline, increase = evaluate_issue_week(count, previous)
                if is_spike:
                    name, color = meta[slug]
                    week_end = min(cursor + timedelta(days=6), last_day)
                    spikes.append(
                        {
                            "date": cursor.isoformat(),
                            "week_start": cursor.isoformat(),
                            "week_end": week_end.isoformat(),
                            "is_partial_week": week_end < cursor + timedelta(days=6),
                            "topic_slug": slug,
                            "topic_name": name,
                            "color": color,
                            "count": count,
                            "baseline": round(baseline, 2),
                            "previous_weeks": previous,
                            "delta_percent": increase,
                        }
                    )
            cursor += timedelta(weeks=1)

    spikes.sort(key=lambda s: (s["week_start"], s["count"]), reverse=True)
    return spikes


def _group_count(db: Session, filters: FilterSet, column, *, date_from=None, date_to=None):
    stmt = filtered_query(
        filters, db, column, func.count(Post.id), date_from=date_from, date_to=date_to
    )
    return db.execute(stmt.group_by(column)).all()


def sentiment_breakdown(db: Session, filters: FilterSet) -> list[dict]:
    rows = _group_count(db, filters, PostAnalysis.sentiment_label)
    total = sum(int(c) for _, c in rows)
    return [
        {"label": label, "count": int(count), "share": share_percent(count, total)}
        for label, count in sorted(rows, key=lambda r: -r[1])
    ]


def intent_breakdown(db: Session, filters: FilterSet) -> list[dict]:
    rows = _group_count(db, filters, PostAnalysis.intent_label)
    total = sum(int(c) for _, c in rows)
    return [
        {"label": label, "count": int(count), "share": share_percent(count, total)}
        for label, count in sorted(rows, key=lambda r: -r[1])
    ]


def job_role_breakdown(db: Session, filters: FilterSet) -> list[dict]:
    rows = _group_count(db, filters, PostAnalysis.job_role)
    total = sum(int(c) for _, c in rows)
    prev_from, prev_to = filters.previous_window
    prev_rows = dict(
        _group_count(db, filters, PostAnalysis.job_role, date_from=prev_from, date_to=prev_to)
    )
    return [
        {
            "label": label,
            "count": int(count),
            "share": share_percent(count, total),
            "change_percent": percent_change(int(count), int(prev_rows.get(label, 0))),
        }
        for label, count in sorted(rows, key=lambda r: -r[1])
    ]


def topic_breakdown(db: Session, filters: FilterSet) -> list[dict]:
    """Ringkasan per topik lengkap dengan perubahan periode dan sentimen."""
    stmt = filtered_query(
        filters,
        db,
        Topic.slug,
        Topic.name,
        Topic.color,
        func.count(Post.id),
        func.avg(PostAnalysis.engagement_score),
    ).join(Topic, Topic.id == PostAnalysis.topic_id)
    rows = db.execute(stmt.group_by(Topic.slug, Topic.name, Topic.color)).all()
    total = sum(int(r[3]) for r in rows)

    prev_from, prev_to = filters.previous_window
    prev_stmt = filtered_query(
        filters, db, Topic.slug, func.count(Post.id), date_from=prev_from, date_to=prev_to
    ).join(Topic, Topic.id == PostAnalysis.topic_id)
    previous = {slug: int(count) for slug, count in db.execute(prev_stmt.group_by(Topic.slug))}

    sentiment_stmt = filtered_query(
        filters, db, Topic.slug, PostAnalysis.sentiment_label, func.count(Post.id)
    ).join(Topic, Topic.id == PostAnalysis.topic_id)
    sentiment_map: dict[str, dict[str, int]] = defaultdict(dict)
    for slug, label, count in db.execute(
        sentiment_stmt.group_by(Topic.slug, PostAnalysis.sentiment_label)
    ):
        sentiment_map[slug][label] = int(count)

    results = []
    for slug, name, color, count, avg_engagement in rows:
        count = int(count)
        sentiments = sentiment_map.get(slug, {})
        dominant = max(sentiments.items(), key=lambda kv: kv[1])[0] if sentiments else "Netral"
        results.append(
            {
                "slug": slug,
                "name": name,
                "color": color,
                "count": count,
                "share": share_percent(count, total),
                "previous_count": previous.get(slug, 0),
                "change_percent": percent_change(count, previous.get(slug, 0)),
                "avg_engagement": round(float(avg_engagement or 0), 1),
                "sentiment_counts": sentiments,
                "dominant_sentiment": dominant,
                "negative_share": share_percent(sentiments.get("Negatif", 0), count),
            }
        )
    results.sort(key=lambda item: item["count"], reverse=True)
    return results


def sentiment_by_role(db: Session, filters: FilterSet) -> list[dict]:
    stmt = filtered_query(
        filters, db, PostAnalysis.job_role, PostAnalysis.sentiment_label, func.count(Post.id)
    )
    rows = db.execute(stmt.group_by(PostAnalysis.job_role, PostAnalysis.sentiment_label)).all()
    grouped: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for role, sentiment, count in rows:
        grouped[role][sentiment] = int(count)
    output = []
    for role, values in grouped.items():
        total = sum(values.values())
        output.append(
            {
                "job_role": role,
                "total": total,
                "Positif": values.get("Positif", 0),
                "Netral": values.get("Netral", 0),
                "Negatif": values.get("Negatif", 0),
                "Tidak Yakin": values.get("Tidak Yakin", 0),
                "negative_share": share_percent(values.get("Negatif", 0), total),
            }
        )
    output.sort(key=lambda item: item["total"], reverse=True)
    return output


def concern_heatmap(db: Session, filters: FilterSet) -> dict:
    """Matriks jenis pekerjaan x topik kekhawatiran (jumlah post negatif+keluhan)."""
    stmt = filtered_query(filters, db, PostAnalysis.job_role, Topic.name, func.count(Post.id)).join(
        Topic, Topic.id == PostAnalysis.topic_id
    )
    rows = db.execute(stmt.group_by(PostAnalysis.job_role, Topic.name)).all()

    role_totals: Counter[str] = Counter()
    topic_totals: Counter[str] = Counter()
    cells: dict[tuple[str, str], int] = {}
    for role, topic_name, count in rows:
        count = int(count)
        cells[(role, topic_name)] = count
        role_totals[role] += count
        topic_totals[topic_name] += count

    roles = [r for r, _ in role_totals.most_common(8)]
    topics = [t for t, _ in topic_totals.most_common(8)]
    matrix = [
        {
            "job_role": role,
            "topic": topic,
            "count": cells.get((role, topic), 0),
            "share_of_role": share_percent(cells.get((role, topic), 0), role_totals[role]),
        }
        for role in roles
        for topic in topics
    ]
    max_count = max((cell["count"] for cell in matrix), default=0)
    return {"rows": roles, "columns": topics, "cells": matrix, "max_count": max_count}


def topic_role_partitions(db: Session, filters: FilterSet) -> list[dict]:
    """Kartu per kombinasi kategori isu x jenis pekerjaan (*information patches*)."""
    stmt = filtered_query(
        filters,
        db,
        Topic.slug,
        Topic.name,
        Topic.color,
        PostAnalysis.job_role,
        PostAnalysis.sentiment_label,
        PostAnalysis.intent_label,
        func.count(Post.id),
    ).join(Topic, Topic.id == PostAnalysis.topic_id)
    rows = db.execute(
        stmt.group_by(
            Topic.slug,
            Topic.name,
            Topic.color,
            PostAnalysis.job_role,
            PostAnalysis.sentiment_label,
            PostAnalysis.intent_label,
        )
    ).all()

    cells: dict[tuple[str, str], dict] = {}
    for slug, name, color, role, sentiment, intent, count in rows:
        cell = cells.setdefault(
            (slug, role),
            {
                "topic_slug": slug,
                "topic_name": name,
                "color": color,
                "job_role": role,
                "count": 0,
                "negative": 0,
                "questions": 0,
            },
        )
        cell["count"] += int(count)
        if sentiment == "Negatif":
            cell["negative"] += int(count)
        if intent == "Pertanyaan":
            cell["questions"] += int(count)

    total = sum(c["count"] for c in cells.values())
    output = []
    for cell in cells.values():
        negative = cell.pop("negative")
        output.append(
            {
                **cell,
                "share": share_percent(cell["count"], total),
                "negative_share": share_percent(negative, cell["count"]),
            }
        )
    output.sort(key=lambda item: (-item["count"], item["topic_name"], item["job_role"]))
    return output


def top_questions(db: Session, filters: FilterSet, limit: int = 10) -> list[dict]:
    """Post ber-intent Pertanyaan, diurutkan relevansi lalu engagement."""
    stmt = filtered_query(
        filters,
        db,
        Post.external_post_id,
        Post.text,
        Post.created_at_source,
        PostAnalysis.job_role,
        Topic.name,
        PostAnalysis.relevance_score,
        PostAnalysis.engagement_score,
        PostAnalysis.sentiment_label,
    ).outerjoin(Topic, Topic.id == PostAnalysis.topic_id)
    stmt = stmt.where(PostAnalysis.intent_label == "Pertanyaan").order_by(
        PostAnalysis.relevance_score.desc(), PostAnalysis.engagement_score.desc()
    )
    rows = db.execute(stmt.limit(limit)).all()
    return [
        {
            "external_post_id": ext_id,
            "text": text,
            "created_at": created.isoformat(),
            "job_role": role,
            "topic": topic or "Belum terklasifikasi",
            "relevance_score": round(float(rel or 0), 3),
            "engagement_score": round(float(eng or 0), 1),
            "sentiment_label": sentiment,
        }
        for ext_id, text, created, role, topic, rel, eng, sentiment in rows
    ]


def attention_issues(db: Session, filters: FilterSet, limit: int = 5) -> list[dict]:
    """"Isu yang Perlu Diperhatikan": kombinasi volume, kenaikan, dan negativitas."""
    topics = topic_breakdown(db, filters)
    scored = []
    for topic in topics:
        if topic["count"] < MIN_TOPIC_POSTS:
            continue
        change = topic["change_percent"] or 0
        score = topic["negative_share"] * 0.5 + max(change, 0) * 0.3 + topic["share"] * 0.2
        reasons = []
        if topic["negative_share"] >= 30:
            reasons.append(f"{topic['negative_share']:.1f}% percakapan bersentimen negatif")
        if change > 15:
            reasons.append(f"volume naik {change:.1f}% dibanding periode sebelumnya")
        if topic["share"] >= 12:
            reasons.append(f"mencakup {topic['share']:.1f}% percakapan")
        if not reasons:
            reasons.append("perlu ditinjau lebih lanjut")
        scored.append({**topic, "attention_score": round(score, 2), "reasons": reasons})
    scored.sort(key=lambda t: t["attention_score"], reverse=True)
    return scored[:limit]


def related_keywords(db: Session, filters: FilterSet, limit: int = 24) -> dict:
    """Jaringan kata kunci terkait dari hasil ekstraksi per-post.

    Bobot edge memakai co-occurrence pada post yang sama sehingga pengguna
    dapat melakukan *chaining* (Ellis) menuju istilah bertetangga.
    """
    stmt = filtered_query(filters, db, PostAnalysis.keywords).limit(4000)
    docs = [row[0] or [] for row in db.execute(stmt).all()]

    frequency: Counter[str] = Counter()
    for keywords in docs:
        for keyword in keywords:
            if keyword in _STOPWORDS or len(keyword) < 4:
                continue
            frequency[keyword] += 1

    top_terms = [term for term, count in frequency.most_common(limit) if count >= 2]
    term_set = set(top_terms)

    pair_counts: Counter[tuple[str, str]] = Counter()
    for keywords in docs:
        present = sorted({k for k in keywords if k in term_set})
        for i, first in enumerate(present):
            for second in present[i + 1 :]:
                pair_counts[(first, second)] += 1

    nodes = [
        {"id": term, "label": term, "count": frequency[term]}
        for term in top_terms
    ]
    edges = [
        {"source": a, "target": b, "weight": count}
        for (a, b), count in pair_counts.most_common(60)
        if count >= 2
    ]
    return {"nodes": nodes, "edges": edges}


def overview_kpis(db: Session, filters: FilterSet) -> dict:
    total = count_posts(db, filters)
    prev_from, prev_to = filters.previous_window
    previous_total = count_posts(db, filters, date_from=prev_from, date_to=prev_to)

    topics = topic_breakdown(db, filters)
    active_topics = [t for t in topics if t["count"] >= MIN_TOPIC_POSTS]

    sentiments = sentiment_breakdown(db, filters)
    dominant = sentiments[0] if sentiments else {"label": "Tidak ada data", "share": 0.0}

    intents = intent_breakdown(db, filters)
    questions = next((i["count"] for i in intents if i["label"] == "Pertanyaan"), 0)
    prev_questions_stmt = filtered_query(
        filters, db, func.count(Post.id), date_from=prev_from, date_to=prev_to
    ).where(PostAnalysis.intent_label == "Pertanyaan")
    prev_questions = int(db.scalar(prev_questions_stmt) or 0)

    roles = job_role_breakdown(db, filters)
    top_role = roles[0] if roles else {"label": "Tidak ada data", "count": 0, "share": 0.0}

    return {
        "total_posts": {
            "value": total,
            "previous": previous_total,
            "change_percent": percent_change(total, previous_total),
        },
        "volume_change": {
            "value": percent_change(total, previous_total),
            "previous_period_total": previous_total,
        },
        "active_topics": {
            "value": len(active_topics),
            "threshold": MIN_TOPIC_POSTS,
            "total_topics": len(topics),
        },
        "dominant_sentiment": {
            "value": dominant["label"],
            "share": dominant.get("share", 0.0),
            "distribution": sentiments,
        },
        "detected_questions": {
            "value": questions,
            "previous": prev_questions,
            "change_percent": percent_change(questions, prev_questions),
            "share": share_percent(questions, total),
        },
        "top_job_role": {
            "value": top_role["label"],
            "count": top_role["count"],
            "share": top_role.get("share", 0.0),
            "change_percent": top_role.get("change_percent"),
        },
    }


def data_freshness(db: Session) -> dict:
    latest_ingested = db.scalar(select(func.max(Post.ingested_at)))
    latest_post = db.scalar(select(func.max(Post.created_at_source)))
    total = int(db.scalar(select(func.count(Post.id)).where(Post.deleted_at.is_(None))) or 0)
    synthetic = int(
        db.scalar(
            select(func.count(Post.id)).where(
                Post.is_synthetic.is_(True), Post.deleted_at.is_(None)
            )
        )
        or 0
    )
    stale = True
    if latest_ingested:
        stale = (utcnow() - latest_ingested) > timedelta(hours=24)
    return {
        "last_updated": latest_ingested.isoformat() if latest_ingested else None,
        "latest_post_at": latest_post.isoformat() if latest_post else None,
        "total_posts": total,
        "synthetic_posts": synthetic,
        "is_stale": stale,
        "search_provider": get_search_provider().name,
    }
