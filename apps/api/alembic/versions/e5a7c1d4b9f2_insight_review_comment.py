"""komentar peninjau insight

Revision ID: e5a7c1d4b9f2
Revises: d9f3b6a2c8e1
Create Date: 2026-11-06 16:00:00.000000

- insights.review_comment: komentar peninjau. Bukan bagian isi insight, jadi tidak
  mengubah last_edited_by, tidak menggugurkan persetujuan, dan tidak diekspor.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5a7c1d4b9f2"
down_revision: Union[str, None] = "d9f3b6a2c8e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("insights", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("review_comment", sa.Text(), nullable=False, server_default="")
        )


def downgrade() -> None:
    with op.batch_alter_table("insights", schema=None) as batch_op:
        batch_op.drop_column("review_comment")
