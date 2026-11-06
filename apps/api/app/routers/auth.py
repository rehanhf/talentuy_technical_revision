"""Autentikasi demo dan profil pengguna."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, write_audit
from app.models import User
from app.schemas import LoginRequest, LoginResponse, UserOut
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        # Pesan sengaja tidak membedakan email/password yang salah.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau kata sandi tidak sesuai.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun ini sedang dinonaktifkan. Hubungi admin.",
        )

    token, expires_in = create_access_token(user.id, user.role)
    write_audit(db, user, "auth.login", "user", user.id)
    db.commit()
    return LoginResponse(
        access_token=token, expires_in=expires_in, user=UserOut.model_validate(user)
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.get("/demo-accounts")
def demo_accounts() -> dict:
    """Daftar akun demo. Hanya diaktifkan pada environment non-produksi."""
    if settings.environment == "production":
        raise HTTPException(status_code=404, detail="Tidak tersedia.")
    return {
        "accounts": [
            {"email": "admin@talentpulse.local", "role": "admin",
             "description": "Akun demo. Insight harus disetujui akun lain."},
            {"email": "analyst@talentpulse.local", "role": "analyst",
             "description": "Akun demo. Insight harus disetujui akun lain."},
            {"email": "viewer@talentpulse.local", "role": "viewer",
             "description": "Akun demo. Insight harus disetujui akun lain."},
        ],
        "password": settings.demo_password,
        "notice": "Kredensial ini hanya untuk lingkungan pengembangan.",
    }
