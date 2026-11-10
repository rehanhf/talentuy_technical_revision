"""riwayat persetujuan insight

Revision ID: d9f3b6a2c8e1
Revises: c4e8a1f2d3b5
Create Date: 2026-11-06 15:00:00.000000

- insights.first_approved_at: waktu persetujuan pertama; tidak pernah dikosongkan,
  sehingga insight yang pernah disetujui tidak dapat dihapus.
- insights.last_edited_by: penyunting isi terakhir; tidak boleh menyetujui.
Insight yang saat ini berstatus approved diisi dengan updated_at.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d9f3b6a2c8e1"
down_revision: Union[str, None] = "c4e8a1f2d3b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("insights", schema=None) as batch_op:
        batch_op.add_column(sa.Column("first_approved_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("last_edited_by", sa.String(36), nullable=True))
        batch_op.create_foreign_key(
            "fk_insights_last_edited_by_users", "users", ["last_edited_by"], ["id"]
        )
    op.execute(
        "UPDATE insights SET first_approved_at = updated_at WHERE human_status = 'approved'"
    )


def downgrade() -> None:
    with op.batch_alter_table("insights", schema=None) as batch_op:
        batch_op.drop_constraint("fk_insights_last_edited_by_users", type_="foreignkey")
        batch_op.drop_column("last_edited_by")
        batch_op.drop_column("first_approved_at")
