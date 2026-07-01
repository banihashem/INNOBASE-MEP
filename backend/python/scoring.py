"""
MEP-light™ — Deterministic Scoring Engine (Python Port)

Pure-function module implementing the exact MEP-light™ SME Weight Model.
Zero side effects, zero I/O — fully deterministic for a given input.

This is a line-for-line port of backend/src/scoring_engine.ts to ensure
bit-identical scoring results between TypeScript and Python backends.

Calculation Pipeline:
  1. Invert negative dimensions (Competitive Intensity, Regulatory Complexity)
  2. Compute weighted category sub-scores (Opportunity, Fit, Feasibility, Strategic, Financial)
  3. Compute SME-weighted Expansion Potential composite (0–100)
  4. Classify into Tiers (A/B/C)
  5. Apply confidence decoupling (cap Tier A → Tier B if low evidence)
  6. Run Certainty Guardrail alarm check

Charter compliance:
  "Clarify Preparedness, Do Not Predict Success" [10, 14]
  "Neutral Strategic Advisor" [15]
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

logger = logging.getLogger("mep.scoring")


# ─── Enums & Types ────────────────────────────────────────────────────

class EvidenceConfidenceLevel(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    UNKNOWN = "Unknown"


class EvidenceConfidenceLabel(str, Enum):
    RELIABLE = "Reliable"
    NEEDS_VALIDATION = "Needs Validation"
    ASSUMPTION_BASED = "Assumption-Based"
    EVIDENCE_GAP = "Evidence Gap"


class TierClassification(str, Enum):
    TIER_A = "Tier A: Priority"
    TIER_B = "Tier B: Promising"
    TIER_C = "Tier C: Do not prioritize"


class RiskLevel(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class WarningSeverity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


# ─── Data Classes ─────────────────────────────────────────────────────

@dataclass
class DimensionScores:
    """Raw dimension scores — all values are integers 1 to 5."""
    market_attractiveness: int       # 1-5, positive
    offering_fit: int                # 1-5, positive
    channel_access: int              # 1-5, positive
    operational_feasibility: int     # 1-5, positive
    strategic_value: int             # 1-5, positive
    financial_logic: int             # 1-5, positive
    brand_trust_transferability: int  # 1-5, positive
    competitive_intensity: int       # 1-5, NEGATIVE (higher = harder)
    regulatory_complexity: int       # 1-5, NEGATIVE (higher = harder)


@dataclass
class CategoryScores:
    """Intermediate category sub-scores (on the 1–5 scale)."""
    opportunity: float     # (MarketAttractiveness * 0.70) + (AdjustedCompetitive * 0.30)
    offering_fit: float    # (OfferingFit * 0.65) + (BrandTrust * 0.35)
    feasibility: float     # (ChannelAccess * 0.35) + (AdjustedRegulatory * 0.30) + (OpFeasibility * 0.35)
    strategic: float       # StrategicValue (pass-through)
    financial: float       # FinancialLogic (pass-through)


@dataclass
class ScoringWarning:
    """Warning flags that can be attached to a scoring result."""
    code: str
    message: str
    severity: WarningSeverity


@dataclass
class ScoringResult:
    """Complete scoring result for a single market."""
    market_id: str
    market_name: str

    # Adjusted dimensions
    adjusted_competitive_intensity: float
    adjusted_regulatory_complexity: float

    # Category sub-scores (1–5 scale)
    category_scores: CategoryScores

    # Composite score (0–100)
    expansion_potential_score: int

    # Risk assessment
    risk_exposure: float
    risk_level: RiskLevel

    # Evidence confidence
    evidence_confidence_score: int
    evidence_confidence_level: EvidenceConfidenceLevel
    evidence_confidence_label: EvidenceConfidenceLabel

    # Classification
    tier: TierClassification
    warnings: list[ScoringWarning] = field(default_factory=list)

    # Source evidence
    evidence_basis: str = ""


@dataclass
class MarketScoreInput:
    """Input payload for a single market's scoring assessment."""
    market_id: str
    scores: DimensionScores
    evidence_basis: str
    evidence_confidence: EvidenceConfidenceLevel


@dataclass
class ComparativeDashboard:
    """Comparative dashboard output — multiple markets ranked."""
    company_name: str
    offering_name: str
    generated_at: str
    results: list[ScoringResult]
    top_priority: Optional[ScoringResult]


# ─── Constants: SME Weight Model ──────────────────────────────────────

CATEGORY_WEIGHTS = {
    "opportunity": 0.25,
    "offering_fit": 0.20,
    "feasibility": 0.25,
    "strategic": 0.10,
    "financial": 0.20,
}

# Multiplier to scale from 1–5 weighted average to 0–100 composite
COMPOSITE_SCALE_FACTOR = 20

# Tier thresholds
TIER_A_THRESHOLD = 75
TIER_B_THRESHOLD = 60

# Risk level thresholds
RISK_HIGH_THRESHOLD = 3.8
RISK_LOW_THRESHOLD = 2.2

# Confidence score mapping
CONFIDENCE_SCORE_MAP = {
    EvidenceConfidenceLevel.HIGH: 90,
    EvidenceConfidenceLevel.MEDIUM: 60,
    EvidenceConfidenceLevel.LOW: 30,
    EvidenceConfidenceLevel.UNKNOWN: 10,
}

CONFIDENCE_LABEL_MAP = {
    EvidenceConfidenceLevel.HIGH: EvidenceConfidenceLabel.RELIABLE,
    EvidenceConfidenceLevel.MEDIUM: EvidenceConfidenceLabel.NEEDS_VALIDATION,
    EvidenceConfidenceLevel.LOW: EvidenceConfidenceLabel.ASSUMPTION_BASED,
    EvidenceConfidenceLevel.UNKNOWN: EvidenceConfidenceLabel.EVIDENCE_GAP,
}


# ─── Step 1: Invert Negative Dimensions ──────────────────────────────

def invert_negative_dimension(raw_score: int) -> float:
    """
    Inverts a negative dimension score.
    Formula: Adjusted Score = 6 - Raw Score

    A raw 5 (very difficult) becomes 1 (very unfavorable for expansion).
    A raw 1 (very easy) becomes 5 (very favorable for expansion).
    """
    return 6 - raw_score


# ─── Step 2: Calculate Category Sub-Scores ────────────────────────────

def calculate_category_scores(scores: DimensionScores) -> CategoryScores:
    """
    Computes all five category sub-scores from raw dimension inputs.
    All outputs are on the 1–5 scale.

    Formulas:
      Opportunity  = (Market Attractiveness × 0.70) + (Adjusted Competitive × 0.30)
      Offering Fit = (Offering Fit × 0.65) + (Brand & Trust Transferability × 0.35)
      Feasibility  = (Channel Access × 0.35) + (Adjusted Regulatory × 0.30) + (Op Feasibility × 0.35)
      Strategic    = Strategic Value (pass-through)
      Financial    = Financial Logic (pass-through)
    """
    adjusted_competitive = invert_negative_dimension(scores.competitive_intensity)
    adjusted_regulatory = invert_negative_dimension(scores.regulatory_complexity)

    return CategoryScores(
        opportunity=(
            scores.market_attractiveness * 0.70 + adjusted_competitive * 0.30
        ),
        offering_fit=(
            scores.offering_fit * 0.65 + scores.brand_trust_transferability * 0.35
        ),
        feasibility=(
            scores.channel_access * 0.35
            + adjusted_regulatory * 0.30
            + scores.operational_feasibility * 0.35
        ),
        strategic=float(scores.strategic_value),
        financial=float(scores.financial_logic),
    )


# ─── Step 3: Compute Expansion Potential Score ────────────────────────

def calculate_expansion_potential(category_scores: CategoryScores) -> int:
    """
    Computes the SME-weighted Expansion Potential Score (0–100).

    Formula:
      Composite = (Opportunity×0.25 + Fit×0.20 + Feasibility×0.25
                   + Strategic×0.10 + Financial×0.20) × 20

    The result is rounded to the nearest integer (matching Math.round() in JS).
    """
    weighted_average = (
        category_scores.opportunity * CATEGORY_WEIGHTS["opportunity"]
        + category_scores.offering_fit * CATEGORY_WEIGHTS["offering_fit"]
        + category_scores.feasibility * CATEGORY_WEIGHTS["feasibility"]
        + category_scores.strategic * CATEGORY_WEIGHTS["strategic"]
        + category_scores.financial * CATEGORY_WEIGHTS["financial"]
    )
    return round(weighted_average * COMPOSITE_SCALE_FACTOR)


# ─── Step 4: Classify Tier ───────────────────────────────────────────

def classify_tier(score: int) -> TierClassification:
    """
    Maps a composite score to a tier classification.
      >= 75 → Tier A: Priority
      >= 60 → Tier B: Promising
      <  60 → Tier C: Do not prioritize
    """
    if score >= TIER_A_THRESHOLD:
        return TierClassification.TIER_A
    if score >= TIER_B_THRESHOLD:
        return TierClassification.TIER_B
    return TierClassification.TIER_C


# ─── Step 5: Risk Assessment ─────────────────────────────────────────

def calculate_risk_exposure(scores: DimensionScores) -> tuple[float, RiskLevel]:
    """
    Computes risk exposure from raw negative dimension values.
    Risk Exposure = average of (raw competitive + raw regulatory)
    """
    risk_exposure = (scores.competitive_intensity + scores.regulatory_complexity) / 2

    if risk_exposure >= RISK_HIGH_THRESHOLD:
        risk_level = RiskLevel.HIGH
    elif risk_exposure <= RISK_LOW_THRESHOLD:
        risk_level = RiskLevel.LOW
    else:
        risk_level = RiskLevel.MEDIUM

    return risk_exposure, risk_level


# ─── Step 6: Confidence Scoring & Decoupling ─────────────────────────

def get_confidence_score(level: EvidenceConfidenceLevel) -> int:
    """Converts a qualitative confidence level to a numeric 0–100 score."""
    return CONFIDENCE_SCORE_MAP.get(level, 10)


def get_confidence_label(level: EvidenceConfidenceLevel) -> EvidenceConfidenceLabel:
    """Returns the display label for a confidence level."""
    return CONFIDENCE_LABEL_MAP.get(level, EvidenceConfidenceLabel.EVIDENCE_GAP)


def apply_confidence_decoupling(
    expansion_potential_score: int,
    confidence_level: EvidenceConfidenceLevel,
    current_tier: TierClassification,
) -> tuple[TierClassification, list[ScoringWarning]]:
    """
    Applies the Confidence Decoupling rule:

    If a market's Expansion Potential Score > 70 (High)
    but its Evidence Confidence Score < 50 (Low or Unknown),
    then:
      1. Flag a "Low-Confidence Hypothesis" warning
      2. Cap the tier classification at Tier B (cannot be Tier A)
    """
    confidence_score = get_confidence_score(confidence_level)
    warnings: list[ScoringWarning] = []
    adjusted_tier = current_tier

    if expansion_potential_score > 70 and confidence_score < 50:
        warnings.append(ScoringWarning(
            code="LOW_CONFIDENCE_HYPOTHESIS",
            message=(
                f"Expansion Potential is High ({expansion_potential_score}/100) but Evidence "
                f"Confidence is {confidence_level.value} ({confidence_score}/100). This market "
                f'is flagged as a "Low-Confidence Hypothesis" — classification is capped at '
                f"Tier B until evidence quality improves. Do not commit significant capital "
                f"without validation."
            ),
            severity=WarningSeverity.CRITICAL,
        ))

        # Cap at Tier B if currently Tier A
        if current_tier == TierClassification.TIER_A:
            adjusted_tier = TierClassification.TIER_B

    return adjusted_tier, warnings


# ─── Step 7: Certainty Guardrail Alarm ────────────────────────────────

def run_certainty_guardrail(
    potential_score: int,
    confidence_score: int,
    market_name: str,
) -> dict:
    """
    Alarm Verification and State Override Hook.

    If an expansion option receives a Potential Score > 70
    but Evidence Confidence Score < 50, the system must:
      1. Raise a CRITICAL alert
      2. Log the guardrail trigger
      3. Downgrade classification to Tier B
    """
    alerts = []
    recommended_tier = "Tier A" if potential_score >= 75 else "Tier B"

    if potential_score >= 70 and confidence_score < 50:
        recommended_tier = "Tier B"  # Forced downgrade
        alert = {
            "code": "HIGH_POT_LOW_CONF",
            "severity": "CRITICAL",
            "message": (
                f"Market '{market_name}' scores high ({potential_score}) but has "
                f"weak evidence ({confidence_score}). Capping to Tier B and "
                f"routing to active validation."
            ),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        alerts.append(alert)

        logger.warning(
            "CERTAINTY_GUARDRAIL_TRIGGERED for market %s. "
            "Potential: %s, Confidence: %s",
            market_name, potential_score, confidence_score,
            extra={"session_alert": "HIGH_POT_LOW_CONF"},
        )

    return {
        "final_tier": recommended_tier,
        "alerts": alerts,
    }


# ─── Full Scoring Pipeline ───────────────────────────────────────────

def score_market(
    market_id: str,
    market_name: str,
    input_data: MarketScoreInput,
) -> ScoringResult:
    """
    Runs the complete scoring pipeline for a single market.
    This is the primary public API of the scoring engine.
    """
    scores = input_data.scores

    # Step 1: Invert negative dimensions
    adjusted_competitive = invert_negative_dimension(scores.competitive_intensity)
    adjusted_regulatory = invert_negative_dimension(scores.regulatory_complexity)

    # Step 2: Category sub-scores
    category_scores = calculate_category_scores(scores)

    # Step 3: Expansion Potential Score (0–100)
    expansion_potential_score = calculate_expansion_potential(category_scores)

    # Step 4: Initial tier classification
    raw_tier = classify_tier(expansion_potential_score)

    # Step 5: Risk assessment
    risk_exposure, risk_level = calculate_risk_exposure(scores)

    # Step 6: Confidence scoring and decoupling
    confidence_level = input_data.evidence_confidence
    confidence_score = get_confidence_score(confidence_level)
    confidence_label = get_confidence_label(confidence_level)

    adjusted_tier, warnings = apply_confidence_decoupling(
        expansion_potential_score, confidence_level, raw_tier
    )

    # Step 7: Certainty Guardrail alarm (fires logging + metrics)
    guardrail_result = run_certainty_guardrail(
        expansion_potential_score, confidence_score, market_name
    )

    return ScoringResult(
        market_id=market_id,
        market_name=market_name,
        adjusted_competitive_intensity=adjusted_competitive,
        adjusted_regulatory_complexity=adjusted_regulatory,
        category_scores=category_scores,
        expansion_potential_score=expansion_potential_score,
        risk_exposure=risk_exposure,
        risk_level=risk_level,
        evidence_confidence_score=confidence_score,
        evidence_confidence_level=confidence_level,
        evidence_confidence_label=confidence_label,
        tier=adjusted_tier,
        warnings=warnings,
        evidence_basis=input_data.evidence_basis,
    )


# ─── Batch Scoring: Comparative Dashboard ────────────────────────────

def generate_comparative_dashboard(
    company_name: str,
    offering_name: str,
    markets: list[dict],
    market_scores: dict[str, MarketScoreInput],
) -> ComparativeDashboard:
    """
    Scores multiple markets and produces a ranked comparative dashboard.
    Results are sorted descending by Expansion Potential Score.
    """
    results: list[ScoringResult] = []

    for market in markets:
        market_id = market["id"]
        market_name = market["name"]
        input_data = market_scores.get(market_id)

        if input_data is None:
            raise ValueError(
                f'Missing score input for market "{market_name}" ({market_id}). '
                f"All shortlisted markets must have score data."
            )

        results.append(score_market(market_id, market_name, input_data))

    # Sort descending by expansion potential score
    results.sort(key=lambda r: r.expansion_potential_score, reverse=True)

    return ComparativeDashboard(
        company_name=company_name,
        offering_name=offering_name,
        generated_at=datetime.now(timezone.utc).isoformat(),
        results=results,
        top_priority=results[0] if results else None,
    )
