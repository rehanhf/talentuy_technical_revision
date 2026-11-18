"""Penyamaran identitas akun: username tidak boleh tersimpan atau terkirim ke frontend."""

from __future__ import annotations

import re
from datetime import datetime

from sqlalchemy import select

from app.connectors.base import RawPost
from app.ingest import ingest_posts
from app.models import Post
from app.privacy import anonymize_post_url, hash_author_id

HEX64 = re.compile(r"^[0-9a-f]{64}$")
USERNAME = "HrdBacot_Asli"
POST_ID = "1566952453937299999"


def test_hash_author_id_is_keyed_and_normalized():
    hashed = hash_author_id(USERNAME)
    assert HEX64.match(hashed)
    assert USERNAME.lower() not in hashed
    # Akun yang sama tetap bisa dikelompokkan, apa pun penulisannya.
    assert hash_author_id(f"@{USERNAME.lower()} ") == hashed
    # Tanpa kunci yang sama, hash tidak bisa dicocokkan.
    assert hash_author_id(USERNAME, key="kunci-lain") != hashed
    assert hash_author_id(None) is None
    assert hash_author_id("  @ ") is None


def test_anonymize_post_url_drops_username():
    expected = f"https://x.com/i/status/{POST_ID}"
    for url in (
        f"https://x.com/{USERNAME}/status/{POST_ID}",
        f"https://twitter.com/{USERNAME}/status/{POST_ID}?s=20",
        f"http://www.twitter.com/{USERNAME}/statuses/{POST_ID}/photo/1",
        f"https://mobile.x.com/{USERNAME}/status/{POST_ID}",
        expected,
    ):
        assert anonymize_post_url(url) == expected
    assert anonymize_post_url(None) is None
    assert anonymize_post_url("https://example.com/berita/1") == "https://example.com/berita/1"


def test_ingest_never_stores_username(client, admin_headers, db):
    raw = RawPost(
        external_post_id=POST_ID,
        text="Baru dapat offering letter, tetapi gaji yang ditawarkan 5 juta.",
        created_at_source=datetime(2022, 9, 6),
        author_public_id=USERNAME,
        url=f"https://x.com/{USERNAME}/status/{POST_ID}",
        is_synthetic=False,
        source="x_public_embed",
    )
    try:
        ingest_posts(db, [raw], source="x_public_embed")

        post = db.scalar(select(Post).where(Post.external_post_id == POST_ID))
        assert post is not None
        assert post.author_public_id == hash_author_id(USERNAME)
        assert post.url == f"https://x.com/i/status/{POST_ID}"
        assert USERNAME.lower() not in f"{post.author_public_id} {post.url}".lower()

        response = client.get(f"/posts/{post.id}", headers=admin_headers)
        assert response.status_code == 200, response.text
        assert USERNAME.lower() not in response.text.lower()
        assert "author_public_id" not in response.json()
    finally:
        post = db.scalar(select(Post).where(Post.external_post_id == POST_ID))
        if post is not None:
            db.delete(post)
            db.commit()


def test_no_stored_post_contains_username():
    """Seluruh korpus (termasuk data sintetis seed) hanya menyimpan hash."""
    from app.database import SessionLocal

    with SessionLocal() as session:
        rows = session.execute(select(Post.author_public_id, Post.url)).all()
    assert rows
    for author, url in rows:
        assert author is None or HEX64.match(author), author
        if url and "/status/" in url:
            assert "/i/status/" in url, url


# ------------------------------------------------------------ @handle di teks


def test_mask_mentions_uses_flat_placeholder_and_keeps_emails():
    from app.privacy import mask_mentions

    text = "@worksfess @MenteriPekerja tanya aja ke hrd@perusahaan.co.id ya, cc @a_b1"
    masked = mask_mentions(text)
    assert masked == "@pengguna @pengguna tanya aja ke hrd@perusahaan.co.id ya, cc @pengguna"
    # Token seragam: dua akun berbeda tidak dapat dibedakan.
    assert "worksfess" not in masked and "MenteriPekerja" not in masked
    # Idempoten dan aman untuk nilai kosong.
    assert mask_mentions(masked) == masked
    assert mask_mentions(None) is None and mask_mentions("") == ""


def test_ingest_masks_mentions_in_stored_text(db):
    raw = RawPost(
        external_post_id="mention-ingest-test",
        text=f"@{USERNAME} @worksfess gaji telat lagi",
        created_at_source=datetime(2026, 11, 17),
        is_synthetic=False,
        source="import",
    )
    ingest_posts(db, [raw], source="import")
    post = db.scalar(select(Post).where(Post.external_post_id == "mention-ingest-test"))
    assert post.text == "@pengguna @pengguna gaji telat lagi"
    assert USERNAME.lower() not in post.text.lower()


def test_migration_masks_existing_rows_in_place(db):
    """Migrasi menimpa baris yang sama; tidak membuat salinan berdampingan."""
    import importlib.util
    from pathlib import Path

    from alembic.migration import MigrationContext
    from alembic.operations import Operations

    post = Post(external_post_id="mention-legacy-row", text="@AkunLama kontrak habis",
                created_at_source=datetime(2026, 11, 1), is_synthetic=False, source="import")
    db.add(post)
    db.commit()
    before_count = db.query(Post).count()

    path = next(Path("alembic/versions").glob("b8d2f4a6c1e3_*.py"))
    spec = importlib.util.spec_from_file_location("mask_mig", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with db.get_bind().begin() as conn:
        ctx = MigrationContext.configure(conn)
        module.op._proxy = Operations(ctx)
        module.upgrade()

    db.expire_all()
    assert db.get(Post, post.id).text == "@pengguna kontrak habis"
    assert db.query(Post).count() == before_count
