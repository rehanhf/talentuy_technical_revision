"""Interface connector sumber data sosial.

Tidak ada implementasi browser scraping. Sumber yang didukung adalah data
sintetis, impor berkas, oEmbed publik, X API resmi, dan twitterapi.io.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class RawPost:
    external_post_id: str
    text: str
    created_at_source: datetime
    language: str = "id"
    author_public_id: str | None = None
    like_count: int = 0
    repost_count: int = 0
    reply_count: int = 0
    quote_count: int = 0
    url: str | None = None
    is_synthetic: bool = True
    source: str = "demo"
    # ID post di X yang dibalas (None bila bukan balasan). Hanya ID; username
    # akun yang dibalas tidak pernah diambil.
    in_reply_to_external_id: str | None = None
    extra: dict = field(default_factory=dict)


class SocialDataConnector(ABC):
    name: str = "abstract"
    label: str = "Connector"
    description: str = ""

    @property
    @abstractmethod
    def is_available(self) -> bool:
        """Apakah connector siap dipakai pada environment saat ini."""

    @abstractmethod
    def fetch(self, **kwargs) -> list[RawPost]:
        """Ambil data mentah dari sumber."""

    supports_replies: bool = False

    def fetch_replies(self, parent_external_id: str, *, max_results: int = 20) -> list[RawPost]:
        """Ambil balasan publik untuk satu post. Connector tanpa dukungan → kosong."""
        return []

    def status(self) -> dict:
        return {
            "name": self.name,
            "label": self.label,
            "description": self.description,
            "available": self.is_available,
        }
