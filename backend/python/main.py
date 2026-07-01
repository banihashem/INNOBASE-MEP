"""
MEP-light™ — FastAPI Application Factory

Assembles the enterprise backend with:
  - CORS middleware
  - OIDC authentication middleware
  - Scoring engine routes
  - RAG search routes
  - PDF export routes
  - Prometheus metrics endpoint
  - Structured JSON logging
  - Database initialization

Charter compliance:
  "Clarify Preparedness, Do Not Predict Success" [10, 14]
  "Neutral Strategic Advisor" [15]
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .logging_config import setup_logging
from .database import init_db, SessionLocal
from .scoring_routes import router as scoring_router
from .rag_routes import router as rag_router
from .pdf_routes import router as pdf_router
from .metrics import metrics_router, OIDC_AUTH_FAILURES
from .rag import seed_sample_data


# ─── Application Lifecycle ────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown hooks."""
    # Startup
    setup_logging()
    logger = logging.getLogger("mep")
    logger.info("MEP-light™ Enterprise API starting", extra={
        "version": settings.app_version,
        "debug": settings.debug,
    })

    # Initialize database tables
    init_db()

    # Seed RAG sample data for development
    db = SessionLocal()
    try:
        seed_sample_data(db)
    finally:
        db.close()

    logger.info("Application ready")
    yield

    # Shutdown
    logger.info("MEP-light™ Enterprise API shutting down")


# ─── FastAPI App ──────────────────────────────────────────────────────

app = FastAPI(
    title="MEP-light™ Enterprise API",
    description=(
        "Market Entry Prioritizer & Strategic Diagnostics Engine. "
        "Production-grade REST API with OIDC authentication, RBAC, "
        "deterministic scoring, pgvector RAG, and observability."
    ),
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/api/v2/docs" if settings.debug else None,
    redoc_url="/api/v2/redoc" if settings.debug else None,
)


# ─── CORS Middleware ──────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Auth Failure Tracking Middleware ─────────────────────────────────

@app.middleware("http")
async def track_auth_failures(request: Request, call_next):
    """Track OIDC authentication failures in Prometheus."""
    response = await call_next(request)

    if response.status_code == 401:
        OIDC_AUTH_FAILURES.labels(reason="invalid_token").inc()
    elif response.status_code == 403:
        OIDC_AUTH_FAILURES.labels(reason="forbidden").inc()

    return response


# ─── Route Registration ──────────────────────────────────────────────

app.include_router(scoring_router)
app.include_router(rag_router)
app.include_router(pdf_router)
app.include_router(metrics_router)


# ─── Root Endpoint ───────────────────────────────────────────────────

@app.get("/")
async def root():
    """API root — returns service identification."""
    return {
        "service": "MEP-light™ Enterprise API",
        "version": settings.app_version,
        "status": "operational",
        "charter": "Clarify Preparedness, Do Not Predict Success",
        "docs": "/api/v2/docs" if settings.debug else "disabled in production",
    }


# ─── ASGI Entry Point ────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.python.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
