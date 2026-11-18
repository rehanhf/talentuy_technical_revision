"""CsvImportConnector — impor CSV/JSON dengan validasi kolom wajib."""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime

from app.connectors.base import RawPost, SocialDataConnector

REQUIRED_COLUMNS = {"external_post_id", "text", "created_at_source"}
OPTIONAL_NUMERIC = ("like_count", "repost_count", "reply_count", "quote_count")
MAX_TEXT_LENGTH = 2000


class ImportValidationError(Exception):
    pass


def _parse_datetime(value: str) -> datetime:
    raw = (value or "").strip().replace("Z", "+00:00")
    for parser in (
        lambda v: datetime.fromisoformat(v),
        lambda v: datetime.strptime(v, "%Y-%m-%d %H:%M:%S"),
        lambda v: datetime.strptime(v, "%Y-%m-%d"),
        lambda v: datetime.strptime(v, "%d/%m/%Y"),
    ):
        try:
            parsed = parser(raw)
            return parsed.replace(tzinfo=None)
        except ValueError:
            continue
    raise ImportValidationError(f"Format tanggal tidak dikenali: '{value}'")


def _to_int(value, field: str) -> int:
    if value in (None, ""):
        return 0
    try:
        number = int(float(value))
    except (TypeError, ValueError) as exc:
        raise ImportValidationError(f"Kolom {field} harus berupa angka.") from exc
    if number < 0:
        raise ImportValidationError(f"Kolom {field} tidak boleh negatif.")
    return number


class CsvImportConnector(SocialDataConnector):
    name = "csv_import"
    label = "Impor CSV/JSON"
    description = (
        "Mengunggah berkas hasil ekspor resmi. Kolom wajib: external_post_id, "
        "text, created_at_source."
    )

    @property
    def is_available(self) -> bool:
        return True

    def fetch(self, *, content: bytes = b"", filename: str = "", **_kwargs) -> list[RawPost]:
        rows = self._read_rows(content, filename)
        if not rows:
            raise ImportValidationError("Berkas tidak berisi baris data.")

        missing = REQUIRED_COLUMNS - set(rows[0].keys())
        if missing:
            raise ImportValidationError(
                "Kolom wajib tidak ditemukan: " + ", ".join(sorted(missing))
            )

        posts: list[RawPost] = []
        errors: list[str] = []
        seen: set[str] = set()

        for line_number, row in enumerate(rows, start=2):
            try:
                external_id = str(row.get("external_post_id") or "").strip()
                text = str(row.get("text") or "").strip()
                if not external_id:
                    raise ImportValidationError("external_post_id kosong.")
                if not text:
                    raise ImportValidationError("text kosong.")
                if len(text) > MAX_TEXT_LENGTH:
                    raise ImportValidationError(
                        f"text melebihi {MAX_TEXT_LENGTH} karakter."
                    )
                if external_id in seen:
                    raise ImportValidationError(f"external_post_id duplikat: {external_id}")
                seen.add(external_id)

                counts = {f: _to_int(row.get(f), f) for f in OPTIONAL_NUMERIC}
                is_synthetic = str(row.get("is_synthetic", "true")).strip().lower() in {
                    "true", "1", "ya", "yes",
                }
                posts.append(
                    RawPost(
                        external_post_id=external_id,
                        text=text,
                        created_at_source=_parse_datetime(str(row.get("created_at_source"))),
                        language=(str(row.get("language") or "id").strip() or "id")[:8],
                        author_public_id=(str(row.get("author_public_id") or "").strip() or None),
                        url=(str(row.get("url") or "").strip() or None),
                        is_synthetic=is_synthetic,
                        source="import",
                        # Opsional: ID post induk bila baris ini adalah balasan.
                        in_reply_to_external_id=(
                            str(row.get("induk_external_id") or row.get("in_reply_to_id") or "").strip()
                            or None
                        ),
                        **counts,
                    )
                )
            except ImportValidationError as exc:
                errors.append(f"Baris {line_number}: {exc}")
            except Exception as exc:  # pragma: no cover - jaring pengaman
                errors.append(f"Baris {line_number}: {exc}")

        self.last_errors = errors
        self.last_received = len(rows)
        return posts

    @staticmethod
    def _read_rows(content: bytes, filename: str) -> list[dict]:
        try:
            decoded = content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ImportValidationError(
                "Berkas harus menggunakan encoding UTF-8."
            ) from exc

        if filename.lower().endswith(".json") or decoded.lstrip().startswith(("[", "{")):
            try:
                payload = json.loads(decoded)
            except json.JSONDecodeError as exc:
                raise ImportValidationError(f"JSON tidak valid: {exc.msg}") from exc
            if isinstance(payload, dict):
                payload = payload.get("data") or payload.get("posts") or []
            if not isinstance(payload, list):
                raise ImportValidationError("Struktur JSON harus berupa array objek.")
            return [dict(item) for item in payload if isinstance(item, dict)]

        reader = csv.DictReader(io.StringIO(decoded))
        if reader.fieldnames is None:
            raise ImportValidationError("Header CSV tidak ditemukan.")
        return [dict(row) for row in reader]
