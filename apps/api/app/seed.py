"""Seed database: akun demo, taxonomy, query preset, dan korpus sintetis.

Jalankan dengan:
    python -m app.seed            # seed jika kosong
    python -m app.seed --reset    # hapus lalu seed ulang
"""

from __future__ import annotations

import argparse
import sys

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.timeutil import utcnow
from app.config import settings
from app.connectors.mock_x import MockXConnector
from app.database import Base, SessionLocal, engine
from app.ingest import ingest_posts
from app.models import (
    AuditLog,
    IngestionRun,
    Insight,
    KeywordPreset,
    Monitor,
    Post,
    PostAnalysis,
    Report,
    SourceQuery,
    Topic,
    UsabilityEvent,
    User,
)
from app.security import hash_password
from app.taxonomy import KEYWORD_PRESET_SEED, TOPIC_SEED

DEMO_USERS = [
    ("Rani Prameswari", "rani@talentpulse.local", "admin"),
    ("Dimas Anugrah", "dimas@talentpulse.local", "analyst"),
    ("Sinta Larasati", "sinta@talentpulse.local", "viewer"),
]

# Preset query mendukung tahap "Starting" pada model Ellis.
PRESET_QUERIES: list[dict] = [
    {
        "name": "Kerja Outsourcing",
        "query_text": "outsourcing OR alih daya OR yayasan penyalur",
        "include_keywords": ["outsourcing", "alih daya", "vendor penyalur"],
        "exclude_keywords": [],
        "job_roles": [],
        "topics": [],
    },
    {
        "name": "Penipuan Lowongan",
        "query_text": 'penipuan OR "loker palsu" OR pungli OR "biaya rekrutmen" OR "alih daya fungsi" OR lowongan',
        "include_keywords": ["penipuan", "loker palsu"],
        "exclude_keywords": [],
        "job_roles": [],
        "topics": ["keamanan-penipuan"],
    },
    {
        "name": "Pertanyaan Staf Gudang",
        "query_text": "gudang",
        "include_keywords": ["gudang"],
        "exclude_keywords": [],
        "job_roles": ["Staf Gudang"],
        "topics": [],
        "intents": ["Pertanyaan"],
    },
    {
        "name": "Gaji dan Lembur",
        "query_text": "gaji OR lembur OR umr",
        "include_keywords": ["gaji", "lembur"],
        "exclude_keywords": [],
        "job_roles": [],
        "topics": ["gaji-benefit"],
    },
    {
        "name": "Sistem Shift",
        "query_text": "shift OR jam kerja",
        "include_keywords": ["shift"],
        "exclude_keywords": [],
        "job_roles": [],
        "topics": ["shift-jam-kerja"],
    },
]

def create_schema() -> None:
    Base.metadata.create_all(bind=engine)


def reset_data(db: Session) -> None:
    for model in (
        UsabilityEvent, AuditLog, Report, Insight, Monitor, IngestionRun,
        PostAnalysis, Post, SourceQuery, KeywordPreset, Topic, User,
    ):
        db.execute(delete(model))
    db.commit()


def seed_topics(db: Session) -> None:
    existing = {slug for slug in db.scalars(select(Topic.slug))}
    for slug, name, description, color, keywords in TOPIC_SEED:
        if slug in existing:
            continue
        db.add(
            Topic(
                slug=slug,
                name=name,
                description=description,
                color=color,
                keywords=keywords,
                is_active=True,
            )
        )
    db.commit()


def seed_keyword_presets(db: Session) -> None:
    # Hanya mengisi topik yang belum punya preset agar suntingan admin tidak tertimpa.
    topics = {t.slug: t for t in db.scalars(select(Topic))}
    covered = set(db.scalars(select(KeywordPreset.topic_id).distinct()))
    for slug, presets in KEYWORD_PRESET_SEED.items():
        topic = topics.get(slug)
        if topic is None or topic.id in covered:
            continue
        for order, (label, query_text) in enumerate(presets):
            db.add(
                KeywordPreset(
                    topic_id=topic.id, label=label, query_text=query_text, sort_order=order
                )
            )
    db.commit()


def seed_users(db: Session) -> dict[str, User]:
    users: dict[str, User] = {}
    for name, email, role in DEMO_USERS:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                name=name,
                email=email,
                role=role,
                password_hash=hash_password(settings.demo_password),
                is_active=True,
            )
            db.add(user)
            db.flush()
        users[role] = user
    db.commit()
    return users


def seed_queries(db: Session, owner: User) -> list[SourceQuery]:
    created: list[SourceQuery] = []
    for preset in PRESET_QUERIES:
        existing = db.scalar(select(SourceQuery).where(SourceQuery.name == preset["name"]))
        if existing:
            created.append(existing)
            continue
        query = SourceQuery(
            name=preset["name"],
            query_text=preset["query_text"],
            include_keywords=preset["include_keywords"],
            exclude_keywords=preset["exclude_keywords"],
            job_roles=preset["job_roles"],
            topics=preset["topics"],
            sentiments=[],
            intents=preset.get("intents", []),
            owner_id=owner.id,
            is_saved=True,
        )
        db.add(query)
        created.append(query)
    db.commit()
    return created


def seed_monitors(db: Session, queries: list[SourceQuery], owner: User) -> None:
    wanted = {"Penipuan Lowongan": 7, "Sistem Shift": 7, "Gaji dan Lembur": 14}
    for query in queries:
        window = wanted.get(query.name)
        if window is None:
            continue
        exists = db.scalar(select(Monitor).where(Monitor.source_query_id == query.id))
        if exists:
            continue
        db.add(
            Monitor(
                name=f"Pantau {query.name}",
                source_query_id=query.id,
                owner_id=owner.id,
                comparison_window=window,
            )
        )
    db.commit()


def seed_posts(db: Session, count: int, days: int) -> int:
    existing = int(db.scalar(select(func.count(Post.id))) or 0)
    if existing >= count:
        return 0
    connector = MockXConnector(random_state=settings.seed_random_state)
    raw_posts = connector.fetch(count=count - existing, days=days, id_offset=existing)
    run = ingest_posts(db, raw_posts, source="demo")
    return run.records_processed


def run_seed(reset: bool = False, count: int | None = None, days: int | None = None) -> dict:
    create_schema()
    started = utcnow()
    with SessionLocal() as db:
        if reset:
            reset_data(db)
        seed_topics(db)
        seed_keyword_presets(db)
        users = seed_users(db)
        queries = seed_queries(db, users["analyst"])
        seed_monitors(db, queries, users["analyst"])
        inserted = seed_posts(
            db, count or settings.seed_post_count, days or settings.seed_days
        )
        total_posts = int(db.scalar(select(func.count(Post.id))) or 0)

    return {
        "inserted_posts": inserted,
        "total_posts": total_posts,
        "users": [email for _, email, _ in DEMO_USERS],
        "duration_seconds": round((utcnow() - started).total_seconds(), 2),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed data demo TalentPulse")
    parser.add_argument("--reset", action="store_true", help="Hapus data lama lebih dulu")
    parser.add_argument("--count", type=int, default=None, help="Jumlah post sintetis")
    parser.add_argument("--days", type=int, default=None, help="Rentang hari")
    args = parser.parse_args()

    summary = run_seed(reset=args.reset, count=args.count, days=args.days)
    print("Seed selesai.")
    print(f"  Post baru      : {summary['inserted_posts']}")
    print(f"  Total post     : {summary['total_posts']}")
    print(f"  Akun demo      : {', '.join(summary['users'])}")
    print(f"  Password demo  : {settings.demo_password}")
    print(f"  Durasi         : {summary['duration_seconds']} detik")
    return 0


if __name__ == "__main__":
    sys.exit(main())
