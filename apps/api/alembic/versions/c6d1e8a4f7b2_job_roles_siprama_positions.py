"""jenis pekerjaan mengikuti lima posisi penempatan PT Siprama Cakrawala

Revision ID: c6d1e8a4f7b2
Revises: b8d2f4a6c1e3
Create Date: 2026-11-20 10:00:00.000000

Daftar lama (SPG/SPB, Staf Gudang, Kasir, Administrasi, Pengemudi, Lainnya)
diganti dengan posisi yang ditempatkan mitra menurut wawancara Head of HR:
Salesman, Merchandiser, SPG/SPB, Staf Officer, Administrasi, Lainnya.

- post_analysis.job_role: Staf Gudang, Kasir, dan Pengemudi -> Lainnya;
  SPG/SPB dan Administrasi tetap. Dasar klasifikasi (explanation.job_role) baris
  yang dipetakan ditulis ulang agar tidak lagi menyebut label lama.
- source_queries.job_roles: nilai lama dipetakan dengan aturan yang sama. Query
  bawaan "Pertanyaan Staf Gudang" diganti menjadi "Pertanyaan SPG/SPB".
- Jumlah baris yang berubah (dipisah data nyata dan data demo) dicatat di
  audit_logs dengan aksi ``taxonomy.job_roles_migrate`` dan dicetak ke log.

Pemetaan ditulis sebagai nilai tetap di sini, tidak diimpor dari
app.taxonomy, supaya migration ini tidak ikut berubah bila taxonomy diubah lagi.
Post yang kini cocok dengan Salesman, Merchandiser, atau Staf Officer baru
mendapat label itu setelah "Analisis ulang" dijalankan.

Tidak dapat dibalik: tiga label lama digabung menjadi Lainnya.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c6d1e8a4f7b2"
down_revision: Union[str, None] = "b8d2f4a6c1e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FALLBACK = "Lainnya"
ROLE_MAP: dict[str, str] = {
    "Staf Gudang": FALLBACK,
    "Kasir": FALLBACK,
    "Pengemudi": FALLBACK,
}

OLD_SEED_QUERY = "Pertanyaan Staf Gudang"
NEW_SEED_QUERY = {
    "name": "Pertanyaan SPG/SPB",
    "query_text": "spg OR spb",
    "include_keywords": ["spg", "spb"],
    "job_roles": ["SPG/SPB"],
}


def _as_obj(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except ValueError:
            return None
    return value


def upgrade() -> None:
    bind = op.get_bind()

    analysis = sa.table(
        "post_analysis",
        sa.column("id", sa.String),
        sa.column("post_id", sa.String),
        sa.column("job_role", sa.String),
        sa.column("explanation", sa.JSON),
    )
    posts = sa.table("posts", sa.column("id", sa.String), sa.column("is_synthetic", sa.Boolean))

    rows = bind.execute(
        sa.select(
            analysis.c.id, analysis.c.job_role, analysis.c.explanation, posts.c.is_synthetic
        )
        .select_from(analysis.join(posts, posts.c.id == analysis.c.post_id))
        .where(analysis.c.job_role.in_(list(ROLE_MAP)))
    ).all()

    per_role: dict[str, dict[str, int]] = {
        old: {"nyata": 0, "demo": 0} for old in ROLE_MAP
    }
    for analysis_id, old_role, explanation, is_synthetic in rows:
        new_role = ROLE_MAP[old_role]
        values: dict = {"job_role": new_role}
        explanation = _as_obj(explanation)
        if isinstance(explanation, dict) and isinstance(explanation.get("job_role"), dict):
            entry = dict(explanation["job_role"])
            entry["rule"] = (
                f"Label lama \"{old_role}\" tidak lagi termasuk jenis pekerjaan yang "
                f"dipantau, sehingga dipetakan ke {new_role} (migrasi 20 November 2026). "
                "Jalankan analisis ulang untuk menghitung ulang dari teks post."
            )
            entry["triggers"] = []
            explanation = {**explanation, "job_role": entry}
            values["explanation"] = explanation
        bind.execute(analysis.update().where(analysis.c.id == analysis_id).values(**values))
        per_role[old_role]["demo" if is_synthetic else "nyata"] += 1

    # --- query tersimpan
    queries = sa.table(
        "source_queries",
        sa.column("id", sa.String),
        sa.column("name", sa.String),
        sa.column("query_text", sa.Text),
        sa.column("include_keywords", sa.JSON),
        sa.column("job_roles", sa.JSON),
    )
    existing_names = {
        name for (name,) in bind.execute(sa.select(queries.c.name)).all()
    }
    queries_changed = 0
    for query_id, name, roles in bind.execute(
        sa.select(queries.c.id, queries.c.name, queries.c.job_roles)
    ).all():
        roles = _as_obj(roles) or []
        if name == OLD_SEED_QUERY and roles == ["Staf Gudang"]:
            update = dict(NEW_SEED_QUERY)
            if NEW_SEED_QUERY["name"] in existing_names:
                update.pop("name")
            bind.execute(queries.update().where(queries.c.id == query_id).values(**update))
            queries_changed += 1
            continue
        if not any(role in ROLE_MAP for role in roles):
            continue
        mapped = list(dict.fromkeys(ROLE_MAP.get(r, r) for r in roles))
        if FALLBACK in mapped and len(mapped) > 1:
            mapped.remove(FALLBACK)
        bind.execute(queries.update().where(queries.c.id == query_id).values(job_roles=mapped))
        queries_changed += 1

    total_real = sum(c["nyata"] for c in per_role.values())
    total_demo = sum(c["demo"] for c in per_role.values())
    detail = {
        "revision": revision,
        "pemetaan": ROLE_MAP,
        "baris_berubah": {"nyata": total_real, "demo": total_demo},
        "per_label_lama": per_role,
        "query_tersimpan_berubah": queries_changed,
    }
    audit = sa.table(
        "audit_logs",
        sa.column("id", sa.String),
        sa.column("actor_id", sa.String),
        sa.column("actor_email", sa.String),
        sa.column("action", sa.String),
        sa.column("entity", sa.String),
        sa.column("entity_id", sa.String),
        sa.column("detail", sa.JSON),
        sa.column("created_at", sa.DateTime),
    )
    op.bulk_insert(
        audit,
        [
            {
                "id": str(uuid.uuid4()),
                "actor_id": None,
                "actor_email": "sistem (migrasi)",
                "action": "taxonomy.job_roles_migrate",
                "entity": "post_analysis",
                "entity_id": revision,
                "detail": detail,
                "created_at": datetime.now(timezone.utc).replace(tzinfo=None),
            }
        ],
    )
    # Logger alembic, bukan print(): stdout di container ter-buffer dan tidak tampil.
    logging.getLogger("alembic.runtime.migration").info(
        f"[{revision}] job_role dipetakan: {total_real} baris data nyata, "
        f"{total_demo} baris data demo; {queries_changed} query tersimpan. "
        f"Rincian: {json.dumps(per_role, ensure_ascii=False)}"
    )


def downgrade() -> None:
    # Sengaja kosong: Staf Gudang, Kasir, dan Pengemudi sudah digabung ke Lainnya.
    pass
