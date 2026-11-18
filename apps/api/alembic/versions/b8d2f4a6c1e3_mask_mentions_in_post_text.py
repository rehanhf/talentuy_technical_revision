"""samarkan @handle di teks post

Revision ID: b8d2f4a6c1e3
Revises: a3c9e7f1b2d4
Create Date: 2026-11-18 14:00:00.000000

- posts.text: setiap @handle diganti ``@pengguna`` langsung pada baris yang sama
  (UPDATE di tempat; tidak ada salinan tersanitasi berdampingan dengan aslinya).
- Kolom turunan (normalized_text, keywords, explanation) tidak memuat mention
  karena normalisasi sudah membuangnya, sehingga tidak perlu diubah.

Tidak dapat dibalik: username asli memang tidak boleh dapat dipulihkan.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.privacy import mask_mentions

revision: str = "b8d2f4a6c1e3"
down_revision: Union[str, None] = "a3c9e7f1b2d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    posts = sa.table("posts", sa.column("id", sa.String), sa.column("text", sa.Text))
    rows = bind.execute(
        sa.select(posts.c.id, posts.c.text).where(posts.c.text.like("%@%"))
    ).all()
    for post_id, text in rows:
        masked = mask_mentions(text)
        if masked != text:
            bind.execute(posts.update().where(posts.c.id == post_id).values(text=masked))


def downgrade() -> None:
    # Sengaja kosong: username yang sudah disamarkan tidak dapat dipulihkan.
    pass
