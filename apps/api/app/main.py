"""Entry point FastAPI TalentPulse."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__, retention
from app.config import settings
from app.database import Base, engine
from app.routers import auth, dashboard, data, insights, posts, queries, reports, system

logger = logging.getLogger("talentpulse")

DESCRIPTION = """
API TalentPulse — dashboard eksplorasi percakapan publik pencari kerja.

Prototipe internal PT Siprama Cakrawala. Tidak berafiliasi resmi dengan X.
Seluruh metrik dihitung dari basis data; tidak ada angka yang di-hardcode.
"""

app = FastAPI(
    title="TalentPulse API",
    version=__version__,
    description=DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    """Buat skema bila belum ada agar aplikasi bisa jalan dari clean setup."""
    Base.metadata.create_all(bind=engine)
    retention.start_scheduler()
    logger.info("TalentPulse API siap. Mode data: %s", settings.effective_source_mode)


@app.on_event("shutdown")
def on_shutdown() -> None:
    retention.stop_scheduler()


@app.exception_handler(RequestValidationError)
async def validation_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Parameter permintaan tidak valid.",
            "errors": [
                {"field": ".".join(str(p) for p in err["loc"][1:]), "message": err["msg"]}
                for err in exc.errors()
            ],
        },
    )


@app.exception_handler(Exception)
async def unhandled_handler(_request: Request, exc: Exception) -> JSONResponse:  # pragma: no cover
    logger.exception("Kesalahan tidak tertangani", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Terjadi kesalahan pada server. Coba muat ulang halaman.",
        },
    )


app.include_router(system.router)
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(posts.router)
app.include_router(queries.router)
app.include_router(insights.router)
app.include_router(reports.router)
app.include_router(data.router)


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {
        "name": "TalentPulse API",
        "version": __version__,
        "docs": "/docs",
        "health": "/health",
    }
