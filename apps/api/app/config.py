"""Konfigurasi aplikasi. Semua secret hanya dibaca dari environment server."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "TalentPulse API"
    environment: str = "development"

    # SQLite dipakai sebagai fallback agar backend tetap bisa dijalankan
    # tanpa Docker. docker-compose menyuntikkan URL PostgreSQL.
    database_url: str = "sqlite:///./talentpulse.db"

    jwt_secret: str = "dev-only-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 12

    # Kunci HMAC untuk menyamarkan identitas akun pada posts.author_public_id.
    # Mengganti kunci membuat hash lama tidak cocok lagi dengan hash baru.
    author_hash_key: str = "dev-only-insecure-author-key-change-me"

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Mode sumber data: "demo" (sintetis) atau "live" (provider X terpilih).
    data_source_mode: str = "demo"
    x_api_bearer_token: str | None = None
    x_api_provider: Literal["official", "twitterapi_io"] = "official"
    twitterapi_io_key: str | None = None

    # Bobot engagement score, dapat dikonfigurasi tanpa mengubah kode.
    engagement_weight_like: float = 1.0
    engagement_weight_repost: float = 2.0
    engagement_weight_reply: float = 1.5
    engagement_weight_quote: float = 1.5

    seed_post_count: int = 1400
    seed_days: int = 90
    seed_random_state: int = 20260828

    demo_password: str = "TalentPulse123!"
    enable_system_ops: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def live_mode_available(self) -> bool:
        if self.x_api_provider == "twitterapi_io":
            return bool(self.twitterapi_io_key)
        return bool(self.x_api_bearer_token)

    @property
    def effective_source_mode(self) -> str:
        """Mode live hanya aktif jika credential benar-benar tersedia."""
        if self.data_source_mode == "live" and self.live_mode_available:
            return "live"
        return "demo"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
