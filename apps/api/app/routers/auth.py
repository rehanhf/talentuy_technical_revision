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
def demo_accounts(db: Session = Depends(get_db)) -> dict:
    """Akun demo untuk presentasi. Tidak tersedia pada environment produksi."""
    if settings.environment == "production":
        raise HTTPException(status_code=404, detail="Tidak tersedia.")
    from app.seed import DEMO_USERS

    emails = [email for _, email, _ in DEMO_USERS]
    users = db.scalars(
        select(User).where(User.email.in_(emails), User.is_active.is_(True))
    ).all()
    by_email = {user.email: user for user in users}
    return {
        "accounts": [
            {"name": by_email[email].name, "email": email}
            for email in emails
            if email in by_email
        ],
        "password": settings.demo_password,
        "notice": "Kredensial ini hanya untuk demo dan presentasi.",
    }
