"""email akun demo berbasis nama

Revision ID: f2b8d4e6a1c3
Revises: e5a7c1d4b9f2
Create Date: 2026-11-08 10:00:00.000000

Akun demo tidak lagi memakai nama peran pada email:
admin@ -> rani@, analyst@ -> dimas@, viewer@ -> sinta@ (domain tetap
talentpulse.local). ID, nama, dan kata sandi tidak berubah, jadi insight,
audit log, dan relasi lain tetap menunjuk ke akun yang sama.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f2b8d4e6a1c3"
down_revision: Union[str, None] = "e5a7c1d4b9f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RENAMES = [
    ("admin@talentpulse.local", "rani@talentpulse.local"),
    ("analyst@talentpulse.local", "dimas@talentpulse.local"),
    ("viewer@talentpulse.local", "sinta@talentpulse.local"),
]

_UPDATE = sa.text(
    "UPDATE users SET email = :new WHERE email = :old "
    "AND NOT EXISTS (SELECT 1 FROM users WHERE email = :new)"
)


def upgrade() -> None:
    for old, new in RENAMES:
        op.get_bind().execute(_UPDATE, {"old": old, "new": new})


def downgrade() -> None:
    for old, new in RENAMES:
        op.get_bind().execute(_UPDATE, {"old": new, "new": old})
