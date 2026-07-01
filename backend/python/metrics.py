"""
MEP-light™ — Prometheus Metrics Instrumentation

Exposes application metrics for scoring latencies, token consumption,
PDF generation volumes, OIDC auth failures, and certainty guardrail alerts.

Metrics endpoint: GET /metrics (Prometheus-scrapable)
"""

from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    Info,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from fastapi import APIRouter, Response

# ─── Application Info ─────────────────────────────────────────────────

APP_INFO = Info("mep_app", "MEP-light™ application info")
APP_INFO.info({
    "version": "2.0.0",
    "service": "enterprise-scoring-api",
    "charter": "Clarify Preparedness, Do Not Predict Success",
})

# ─── Scoring Metrics ──────────────────────────────────────────────────

SCORING_LATENCY = Histogram(
    "mep_calculation_latency_seconds",
    "Histogram measuring execution speed of scoring calculations",
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)

SCORING_REQUESTS = Counter(
    "mep_scoring_requests_total",
    "Total number of scoring pipeline executions",
)

# ─── Token Consumption ───────────────────────────────────────────────

TOKEN_CONSUMPTION = Counter(
    "mep_token_consumption_total",
    "Counter tracking input/output tokens used by agentic loops",
    labelnames=["direction"],  # "input" or "output"
)

# ─── PDF Generation ──────────────────────────────────────────────────

PDF_GENERATIONS = Counter(
    "mep_pdf_generations_total",
    "Counter tracking PDF compile volume",
)

PDF_GENERATION_LATENCY = Histogram(
    "mep_pdf_generation_latency_seconds",
    "Time taken to compile PDF reports",
    buckets=[0.5, 1.0, 2.5, 5.0, 10.0, 30.0],
)

# ─── Authentication ──────────────────────────────────────────────────

OIDC_AUTH_FAILURES = Counter(
    "mep_oidc_auth_failures_total",
    "Counter tracking OIDC authentication failures",
    labelnames=["reason"],  # "invalid_token", "expired", "missing", "forbidden"
)

# ─── Certainty Guardrail ─────────────────────────────────────────────

GUARDRAIL_ALERTS = Counter(
    "mep_high_opportunity_low_confidence_alerts",
    "Counter for Certainty Guardrail triggers (high potential + low evidence)",
)

# ─── Active Sessions ─────────────────────────────────────────────────

ACTIVE_SESSIONS = Gauge(
    "mep_active_sessions",
    "Number of currently active assessment sessions",
)

# ─── RAG Metrics ─────────────────────────────────────────────────────

RAG_SEARCHES = Counter(
    "mep_rag_searches_total",
    "Total RAG similarity searches executed",
)

RAG_SEARCH_LATENCY = Histogram(
    "mep_rag_search_latency_seconds",
    "Time taken for RAG similarity search",
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5],
)

# ─── Metrics Router ──────────────────────────────────────────────────

metrics_router = APIRouter(tags=["observability"])


@metrics_router.get("/metrics")
async def prometheus_metrics():
    """Prometheus-compatible metrics endpoint."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
