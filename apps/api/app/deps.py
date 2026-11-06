"""Dependency autentikasi dan kontrol akses berbasis aturan sistem."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AuditLog, User
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesi tidak ditemukan. Silakan masuk kembali.",
        )
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesi tidak valid atau telah berakhir.",
        )
    user = db.get(User, payload.get("sub", ""))
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Akun tidak aktif atau tidak ditemukan.",
        )
    return user


def require_system_ops(user: User = Depends(get_current_user)) -> User:
    if not settings.enable_system_ops:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operasi sistem dinonaktifkan pada environment ini.",
        )
    return user


def write_audit(
    db: Session,
    user: User | None,
    action: str,
    entity: str = "",
    entity_id: str = "",
    detail: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_id=user.id if user else None,
            actor_email=user.email if user else "",
            action=action,
            entity=entity,
            entity_id=entity_id,
            detail=detail or {},
        )
    )
