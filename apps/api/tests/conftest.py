"""Fixture pytest: database terisolasi dengan korpus sintetis kecil."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

# Harus diset sebelum modul app di-import agar engine memakai DB uji.
_TEST_DB = Path(tempfile.gettempdir()) / "talentpulse_test.db"
if _TEST_DB.exists():
    _TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB.as_posix()}"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["DEMO_PASSWORD"] = "TalentPulse123!"
# Tests must never inherit live provider credentials.
os.environ["X_API_PROVIDER"] = "official"
os.environ["X_API_BEARER_TOKEN"] = ""
os.environ["TWITTERAPI_IO_KEY"] = ""
os.environ["ENABLE_SYSTEM_OPS"] = "false"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import run_seed  # noqa: E402

DEMO_PASSWORD = "TalentPulse123!"


@pytest.fixture(scope="session", autouse=True)
def seeded_database() -> None:
    run_seed(reset=True, count=400, days=60)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


def _token(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/auth/login", json={"email": email, "password": DEMO_PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin_headers(client: TestClient) -> dict[str, str]:
    return _token(client, "admin@talentpulse.local")


@pytest.fixture(scope="session")
def analyst_headers(client: TestClient) -> dict[str, str]:
    return _token(client, "analyst@talentpulse.local")


@pytest.fixture(scope="session")
def viewer_headers(client: TestClient) -> dict[str, str]:
    return _token(client, "viewer@talentpulse.local")
