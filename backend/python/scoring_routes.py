"""
MEP-light™ — Scoring API Routes (FastAPI)

Endpoints:
  GET  /api/v2/health     — Health check
  POST /api/v2/score       — Full scoring pipeline (Consultant+)
  POST /api/v2/score/demo  — Demo scoring (public / Viewer)

Charter compliance:
  "Prohibited Agency: Do not issue final market-entry approvals" [10, 18]
  All outputs are diagnostic, not prescriptive.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .auth import require_consultant, require_viewer, optional_auth
from .scoring import (
    DimensionScores,
    MarketScoreInput,
    EvidenceConfidenceLevel,
    generate_comparative_dashboard,
    score_market,
)
from .metrics import (
    SCORING_LATENCY,
    SCORING_REQUESTS,
)
import time

logger = logging.getLogger("mep.scoring_routes")

router = APIRouter(prefix="/api/v2", tags=["scoring"])


# ─── Pydantic Request / Response Models ──────────────────────────────

class DimensionScoresRequest(BaseModel):
    market_attractiveness: int = Field(ge=1, le=5, alias="marketAttractiveness")
    offering_fit: int = Field(ge=1, le=5, alias="offeringFit")
    channel_access: int = Field(ge=1, le=5, alias="channelAccess")
    operational_feasibility: int = Field(ge=1, le=5, alias="operationalFeasibility")
    strategic_value: int = Field(ge=1, le=5, alias="strategicValue")
    financial_logic: int = Field(ge=1, le=5, alias="financialLogic")
    brand_trust_transferability: int = Field(ge=1, le=5, alias="brandTrustTransferability")
    competitive_intensity: int = Field(ge=1, le=5, alias="competitiveIntensity")
    regulatory_complexity: int = Field(ge=1, le=5, alias="regulatoryComplexity")

    model_config = {"populate_by_name": True}


class MarketScoreRequest(BaseModel):
    market_id: str = Field(alias="marketId")
    scores: DimensionScoresRequest
    evidence_basis: str = Field(alias="evidenceBasis")
    evidence_confidence: str = Field(alias="evidenceConfidence")

    model_config = {"populate_by_name": True}


class ScoreRequestBody(BaseModel):
    company_name: str = Field(alias="companyName", default="Client Company")
    offering_name: str = Field(alias="offeringName", default="Selected Offering")
    markets: list[dict] = Field(default_factory=list)
    market_scores: dict[str, MarketScoreRequest] = Field(alias="marketScores", default_factory=dict)

    model_config = {"populate_by_name": True}


class CategoryScoresResponse(BaseModel):
    opportunity: float
    offering_fit: float = Field(alias="offeringFit")
    feasibility: float
    strategic: float
    financial: float

    model_config = {"populate_by_name": True}


class WarningResponse(BaseModel):
    code: str
    message: str
    severity: str


class ScoringResultResponse(BaseModel):
    market_id: str = Field(alias="marketId")
    market_name: str = Field(alias="marketName")
    adjusted_competitive_intensity: float = Field(alias="adjustedCompetitiveIntensity")
    adjusted_regulatory_complexity: float = Field(alias="adjustedRegulatoryComplexity")
    category_scores: CategoryScoresResponse = Field(alias="categoryScores")
    expansion_potential_score: int = Field(alias="expansionPotentialScore")
    risk_exposure: float = Field(alias="riskExposure")
    risk_level: str = Field(alias="riskLevel")
    evidence_confidence_score: int = Field(alias="evidenceConfidenceScore")
    evidence_confidence_level: str = Field(alias="evidenceConfidenceLevel")
    evidence_confidence_label: str = Field(alias="evidenceConfidenceLabel")
    tier: str
    warnings: list[WarningResponse] = Field(default_factory=list)
    evidence_basis: str = Field(alias="evidenceBasis")

    model_config = {"populate_by_name": True}


class DashboardResponse(BaseModel):
    company_name: str = Field(alias="companyName")
    offering_name: str = Field(alias="offeringName")
    generated_at: str = Field(alias="generatedAt")
    results: list[ScoringResultResponse]
    top_priority: Optional[ScoringResultResponse] = Field(alias="topPriority", default=None)

    model_config = {"populate_by_name": True}


class ScoreResponseBody(BaseModel):
    success: bool
    dashboard: DashboardResponse
    errors: list[str] = Field(default_factory=list)


# ─── Helper: Convert Pydantic → Dataclass ────────────────────────────

def _to_market_score_input(market_id: str, req: MarketScoreRequest) -> MarketScoreInput:
    """Convert Pydantic request model to scoring engine dataclass."""
    scores = req.scores
    return MarketScoreInput(
        market_id=market_id,
        scores=DimensionScores(
            market_attractiveness=scores.market_attractiveness,
            offering_fit=scores.offering_fit,
            channel_access=scores.channel_access,
            operational_feasibility=scores.operational_feasibility,
            strategic_value=scores.strategic_value,
            financial_logic=scores.financial_logic,
            brand_trust_transferability=scores.brand_trust_transferability,
            competitive_intensity=scores.competitive_intensity,
            regulatory_complexity=scores.regulatory_complexity,
        ),
        evidence_basis=req.evidence_basis,
        evidence_confidence=EvidenceConfidenceLevel(req.evidence_confidence),
    )


def _result_to_response(result) -> dict:
    """Convert scoring result dataclass to JSON-serializable dict."""
    return {
        "marketId": result.market_id,
        "marketName": result.market_name,
        "adjustedCompetitiveIntensity": result.adjusted_competitive_intensity,
        "adjustedRegulatoryComplexity": result.adjusted_regulatory_complexity,
        "categoryScores": {
            "opportunity": result.category_scores.opportunity,
            "offeringFit": result.category_scores.offering_fit,
            "feasibility": result.category_scores.feasibility,
            "strategic": result.category_scores.strategic,
            "financial": result.category_scores.financial,
        },
        "expansionPotentialScore": result.expansion_potential_score,
        "riskExposure": result.risk_exposure,
        "riskLevel": result.risk_level.value,
        "evidenceConfidenceScore": result.evidence_confidence_score,
        "evidenceConfidenceLevel": result.evidence_confidence_level.value,
        "evidenceConfidenceLabel": result.evidence_confidence_label.value,
        "tier": result.tier.value,
        "warnings": [
            {"code": w.code, "message": w.message, "severity": w.severity.value}
            for w in result.warnings
        ],
        "evidenceBasis": result.evidence_basis,
    }


# ─── Endpoints ───────────────────────────────────────────────────────

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "MEP-light™ Enterprise Scoring Engine API",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/score")
async def score_markets(
    body: ScoreRequestBody,
    user: dict = Depends(require_consultant),
):
    """
    Full scoring pipeline — requires Consultant or Administrator role.
    Accepts market dimension scores and returns a ranked comparative dashboard.
    """
    start_time = time.time()
    SCORING_REQUESTS.inc()

    try:
        # Convert inputs
        market_score_inputs = {}
        for market_id, score_req in body.market_scores.items():
            market_score_inputs[market_id] = _to_market_score_input(market_id, score_req)

        # Run scoring
        dashboard = generate_comparative_dashboard(
            company_name=body.company_name,
            offering_name=body.offering_name,
            markets=body.markets,
            market_scores=market_score_inputs,
        )

        # Convert results
        response_results = [_result_to_response(r) for r in dashboard.results]
        top = _result_to_response(dashboard.top_priority) if dashboard.top_priority else None

        duration = time.time() - start_time
        SCORING_LATENCY.observe(duration)

        logger.info(
            "Scoring completed",
            extra={
                "markets_scored": len(response_results),
                "duration_ms": round(duration * 1000, 2),
                "user_email": user.get("email", "unknown"),
            },
        )

        return {
            "success": True,
            "dashboard": {
                "companyName": dashboard.company_name,
                "offeringName": dashboard.offering_name,
                "generatedAt": dashboard.generated_at,
                "results": response_results,
                "topPriority": top,
            },
        }

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Scoring pipeline error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal scoring error")


@router.post("/score/demo")
async def score_demo(
    body: ScoreRequestBody,
    user: Optional[dict] = Depends(optional_auth),
):
    """
    Demo scoring endpoint — accessible without authentication.
    Identical math but restricted to read-only demo context.
    """
    start_time = time.time()
    SCORING_REQUESTS.inc()

    try:
        market_score_inputs = {}
        for market_id, score_req in body.market_scores.items():
            market_score_inputs[market_id] = _to_market_score_input(market_id, score_req)

        dashboard = generate_comparative_dashboard(
            company_name=body.company_name,
            offering_name=body.offering_name,
            markets=body.markets,
            market_scores=market_score_inputs,
        )

        response_results = [_result_to_response(r) for r in dashboard.results]
        top = _result_to_response(dashboard.top_priority) if dashboard.top_priority else None

        duration = time.time() - start_time
        SCORING_LATENCY.observe(duration)

        return {
            "success": True,
            "dashboard": {
                "companyName": dashboard.company_name,
                "offeringName": dashboard.offering_name,
                "generatedAt": dashboard.generated_at,
                "results": response_results,
                "topPriority": top,
            },
        }

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
