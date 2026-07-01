"""
MEP-light™ — PDF Export API Routes (FastAPI)

Endpoint:
  POST /api/v2/export/pdf — Generate and download strategic PDF report (Consultant+)

Proxies to the existing ReportLab PDF microservice or generates inline.
"""

import logging
import time
import httpx

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional

from .auth import require_consultant
from .config import settings
from .metrics import PDF_GENERATIONS, PDF_GENERATION_LATENCY

logger = logging.getLogger("mep.pdf")

router = APIRouter(prefix="/api/v2/export", tags=["export"])


# ─── Request Model ────────────────────────────────────────────────────

class PDFExportRequest(BaseModel):
    """Matches the existing PDF service request format."""
    company_name: str = Field(default="Client Company", alias="companyName")
    offering_name: str = Field(default="Selected Offering", alias="offeringName")
    decision_statement: str = Field(default="", alias="decisionStatement")
    strategy_label: str = Field(default="", alias="strategyLabel")
    markets: list[dict] = Field(default_factory=list)
    scores: dict = Field(default_factory=dict)
    roadmap: Optional[dict] = None
    consultant_notes: Optional[str] = Field(default=None, alias="consultantNotes")

    model_config = {"populate_by_name": True}


# ─── PDF Proxy Endpoint ──────────────────────────────────────────────

@router.post("/pdf")
async def export_pdf(
    body: PDFExportRequest,
    user: dict = Depends(require_consultant),
):
    """
    Generate a strategic PDF report.

    Proxies to the existing ReportLab PDF microservice deployed on Cloud Run.
    """
    start_time = time.time()
    PDF_GENERATIONS.inc()

    # Build payload matching existing PDF service format
    payload = {
        "companyName": body.company_name,
        "offeringName": body.offering_name,
        "decisionStatement": body.decision_statement,
        "strategyLabel": body.strategy_label,
        "markets": body.markets,
        "scores": body.scores,
        "roadmap": body.roadmap,
        "consultantNotes": body.consultant_notes,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.pdf_service_url}/generate",
                json=payload,
            )

            if response.status_code != 200:
                logger.error(
                    "PDF service returned error",
                    extra={
                        "status_code": response.status_code,
                        "response": response.text[:500],
                    },
                )
                raise HTTPException(
                    status_code=502,
                    detail=f"PDF service error: {response.status_code}",
                )

            duration = time.time() - start_time
            PDF_GENERATION_LATENCY.observe(duration)

            logger.info(
                "PDF generated successfully",
                extra={
                    "user_email": user.get("email", "unknown"),
                    "duration_ms": round(duration * 1000, 2),
                    "pdf_size_bytes": len(response.content),
                },
            )

            return Response(
                content=response.content,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="MEP-light_Strategic_Report.pdf"',
                },
            )

    except httpx.TimeoutException:
        logger.error("PDF service timeout")
        raise HTTPException(status_code=504, detail="PDF generation timed out")
    except httpx.HTTPError as e:
        logger.error(f"PDF service connection error: {e}")
        raise HTTPException(status_code=502, detail="PDF service unavailable")
