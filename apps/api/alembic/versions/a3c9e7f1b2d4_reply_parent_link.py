"""tautan balasan ke post induk

Revision ID: a3c9e7f1b2d4
Revises: f2b8d4e6a1c3
Create Date: 2026-11-18 10:00:00.000000

- posts.induk_id: FK ke posts.id (post yang dibalas); SET NULL bila induk dihapus.
- posts.induk_external_id: ID post induk di X, agar tautan dapat dibentuk
  belakangan bila induk diimpor setelah balasannya.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a3c9e7f1b2d4"
down_revision: Union[str, None] = "f2b8d4e6a1c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("posts", schema=None) as batch_op:
        batch_op.add_column(sa.Column("induk_id", sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column("induk_external_id", sa.String(length=80), nullable=True))
        batch_op.create_index(batch_op.f("ix_posts_induk_id"), ["induk_id"], unique=False)
        batch_op.create_index(
            batch_op.f("ix_posts_induk_external_id"), ["induk_external_id"], unique=False
        )
        batch_op.create_foreign_key(
            "fk_posts_induk_id_posts", "posts", ["induk_id"], ["id"], ondelete="SET NULL"
        )


def downgrade() -> None:
    with op.batch_alter_table("posts", schema=None) as batch_op:
        batch_op.drop_constraint("fk_posts_induk_id_posts", type_="foreignkey")
        batch_op.drop_index(batch_op.f("ix_posts_induk_external_id"))
        batch_op.drop_index(batch_op.f("ix_posts_induk_id"))
        batch_op.drop_column("induk_external_id")
        batch_op.drop_column("induk_id")
