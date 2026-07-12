/**
 * MEP-light™ — Deterministic Scoring Engine
 * 
 * Pure-function module implementing the exact MEP-light™ SME Weight Model.
 * Zero side effects, zero I/O — fully deterministic for a given input.
 * 
 * Calculation Pipeline:
 *   1. Invert negative dimensions (Competitive Intensity, Regulatory Complexity)
 *   2. Compute weighted category sub-scores (Opportunity, Fit, Feasibility, Strategic, Financial)
 *   3. Compute SME-weighted Expansion Potential composite (0–100)
 *   4. Classify into Tiers (A/B/C/D)
 *   5. Apply confidence decoupling (cap Tier A → Tier B if low evidence)
 * 
 * Charter compliance:
 *  - "Clarify Preparedness, Do Not Predict Success" [10, 14]
 *  - "Neutral Strategic Advisor" [15]
 */

import type {
  DimensionScores,
  CategoryScores,
  TierClassification,
  LetterGrade,
  RiskLevel,
  ScoringResult,
  ScoringWarning,
  MarketScoreInput,
  ComparativeDashboard,
  EvidenceConfidenceLevel,
} from "./data_models.js";

import {
  getConfidenceScore,
  getConfidenceLabel,
  applyConfidenceDecoupling,
} from "./confidence.js";

// ─── Constants: SME Weight Model ─────────────────────────────────────

/** Category weights for the composite Expansion Potential Score */
const CATEGORY_WEIGHTS = {
  opportunity: 0.25,
  offeringFit: 0.20,
  feasibility: 0.25,
  strategic: 0.10,
  financial: 0.20,
} as const;

/** 
 * Multiplier to scale from 1–5 weighted average to 0–100 composite.
 * A perfect 5.0 average → 100, a minimum 1.0 average → 20.
 */
const COMPOSITE_SCALE_FACTOR = 20;

/** Tier thresholds */
const TIER_A_THRESHOLD = 75;
const TIER_B_THRESHOLD = 60;
const TIER_D_THRESHOLD = 40;

/** Risk level thresholds (based on raw negative dimension average) */
const RISK_HIGH_THRESHOLD = 3.8;
const RISK_LOW_THRESHOLD = 2.2;

// ─── Step 1: Invert Negative Dimensions ──────────────────────────────

/**
 * Inverts a negative dimension score.
 * Formula: Adjusted Score = 6 - Raw Score
 * 
 * A raw 5 (very difficult) becomes 1 (very unfavorable for expansion).
 * A raw 1 (very easy) becomes 5 (very favorable for expansion).
 */
export function invertNegativeDimension(rawScore: number): number {
  return 6 - rawScore;
}

// ─── Step 2: Calculate Category Sub-Scores ───────────────────────────

/**
 * Computes all five category sub-scores from raw dimension inputs.
 * All outputs are on the 1–5 scale.
 * 
 * Formulas:
 *   Opportunity  = (Market Attractiveness × 0.70) + (Adjusted Competitive × 0.30)
 *   Offering Fit = (Offering Fit × 0.65) + (Brand & Trust Transferability × 0.35)
 *   Feasibility  = (Channel Access × 0.35) + (Adjusted Regulatory × 0.30) + (Op Feasibility × 0.35)
 *   Strategic    = Strategic Value (pass-through)
 *   Financial    = Financial Logic (pass-through)
 */
export function calculateCategoryScores(scores: DimensionScores): CategoryScores {
  const adjustedCompetitive = invertNegativeDimension(scores.competitiveIntensity);
  const adjustedRegulatory = invertNegativeDimension(scores.regulatoryComplexity);

  return {
    opportunity:
      scores.marketAttractiveness * 0.70 + adjustedCompetitive * 0.30,

    offeringFit:
      scores.offeringFit * 0.65 + scores.brandTrustTransferability * 0.35,

    feasibility:
      scores.channelAccess * 0.35 +
      adjustedRegulatory * 0.30 +
      scores.operationalFeasibility * 0.35,

    strategic: scores.strategicValue,

    financial: scores.financialLogic,
  };
}

// ─── Step 3: Compute Expansion Potential Score ───────────────────────

/**
 * Computes the SME-weighted Expansion Potential Score (0–100).
 * 
 * Formula:
 *   Composite = (Opportunity×0.25 + Fit×0.20 + Feasibility×0.25 + Strategic×0.10 + Financial×0.20) × 20
 * 
 * The result is Math.round()'d to the nearest integer.
 */
export function calculateExpansionPotential(categoryScores: CategoryScores): number {
  const weightedAverage =
    categoryScores.opportunity * CATEGORY_WEIGHTS.opportunity +
    categoryScores.offeringFit * CATEGORY_WEIGHTS.offeringFit +
    categoryScores.feasibility * CATEGORY_WEIGHTS.feasibility +
    categoryScores.strategic * CATEGORY_WEIGHTS.strategic +
    categoryScores.financial * CATEGORY_WEIGHTS.financial;

  return Math.round(weightedAverage * COMPOSITE_SCALE_FACTOR);
}

// ─── Step 4: Classify Tier ───────────────────────────────────────────

/**
 * Maps a composite score to a tier classification.
 *   >= 75 → Tier A: Priority
 *   >= 60 → Tier B: Promising
 *   >= 40 → Tier C: Do not prioritize
 *   <  40 → Tier D: Exclude from current agenda
 */
export function classifyTier(score: number): TierClassification {
  if (score >= TIER_A_THRESHOLD) return "Tier A: Priority";
  if (score >= TIER_B_THRESHOLD) return "Tier B: Promising";
  if (score >= TIER_D_THRESHOLD) return "Tier C: Do not prioritize";
  return "Tier D: Exclude from current agenda";
}

/**
 * Granular letter grade for the dashboard "Tier" column (spec 9.4).
 *
 * Per the spec example table (§9.4): 77 → "A-", 68/65/61 → "B", 54 → "B-".
 * The note is explicit: "A score of 77 should be displayed as A- under the
 * current tier logic, not Tier A. The label should reinforce validation, not
 * certainty." Bands:
 *   >= 80 → A      75-79 → A-     70-74 → B+
 *   60-69 → B      50-59 → B-     40-49 → C      < 40 → D
 *
 * This is a display layer only; it does not replace the coarse TierClassification
 * used for confidence decoupling and recommended-action mapping.
 */
export function letterGrade(score: number): LetterGrade {
  if (score >= 80) return "A";
  if (score >= 75) return "A-";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "B-";
  if (score >= 40) return "C";
  return "D";
}

// ─── Step 5: Risk Assessment ─────────────────────────────────────────

/**
 * Computes risk exposure from raw negative dimension values.
 * Risk Exposure = average of (raw competitive + raw regulatory)
 */
export function calculateRiskExposure(scores: DimensionScores): {
  riskExposure: number;
  riskLevel: RiskLevel;
} {
  const riskExposure =
    (scores.competitiveIntensity + scores.regulatoryComplexity) / 2;

  let riskLevel: RiskLevel = "Medium";
  if (riskExposure >= RISK_HIGH_THRESHOLD) riskLevel = "High";
  else if (riskExposure <= RISK_LOW_THRESHOLD) riskLevel = "Low";

  return { riskExposure, riskLevel };
}

// ─── Full Scoring Pipeline ───────────────────────────────────────────

/**
 * Runs the complete scoring pipeline for a single market.
 * This is the primary public API of the scoring engine.
 * 
 * @param marketId - Unique market identifier
 * @param marketName - Human-readable market name
 * @param input - The raw scoring input (dimensions + evidence)
 * @returns A fully computed ScoringResult
 */
export function scoreMarket(
  marketId: string,
  marketName: string,
  input: MarketScoreInput
): ScoringResult {
  const scores = input.scores;

  // Step 1: Invert negative dimensions
  const adjustedCompetitive = invertNegativeDimension(scores.competitiveIntensity);
  const adjustedRegulatory = invertNegativeDimension(scores.regulatoryComplexity);

  // Step 2: Category sub-scores
  const categoryScores = calculateCategoryScores(scores);

  // Step 3: Expansion Potential Score (0–100)
  const expansionPotentialScore = calculateExpansionPotential(categoryScores);

  // Step 4: Initial tier classification
  const rawTier = classifyTier(expansionPotentialScore);

  // Step 5: Risk assessment
  const { riskExposure, riskLevel } = calculateRiskExposure(scores);

  // Step 6: Confidence scoring and decoupling
  const confidenceLevel = input.evidenceConfidence;
  const confidenceScore = getConfidenceScore(confidenceLevel);
  const confidenceLabel = getConfidenceLabel(confidenceLevel);

  const { adjustedTier, warnings } = applyConfidenceDecoupling(
    expansionPotentialScore,
    confidenceLevel,
    rawTier
  );

  return {
    marketId,
    marketName,
    adjustedCompetitiveIntensity: adjustedCompetitive,
    adjustedRegulatoryComplexity: adjustedRegulatory,
    categoryScores,
    expansionPotentialScore,
    riskExposure,
    riskLevel,
    evidenceConfidenceScore: confidenceScore,
    evidenceConfidenceLevel: confidenceLevel,
    evidenceConfidenceLabel: confidenceLabel,
    tier: adjustedTier,
    letterGrade: letterGrade(expansionPotentialScore),
    warnings,
    evidenceBasis: input.evidenceBasis,
  };
}

// ─── Batch Scoring: Comparative Dashboard ────────────────────────────

/**
 * Scores multiple markets and produces a ranked comparative dashboard.
 * Results are sorted descending by Expansion Potential Score.
 * 
 * @param companyName - The company being assessed
 * @param offeringName - The offering being evaluated
 * @param markets - Array of { id, name } for each market
 * @param marketScores - Record of MarketScoreInput keyed by market ID
 * @returns A complete ComparativeDashboard
 */
export function generateComparativeDashboard(
  companyName: string,
  offeringName: string,
  markets: { id: string; name: string }[],
  marketScores: Record<string, MarketScoreInput>
): ComparativeDashboard {
  const results: ScoringResult[] = markets.map((market) => {
    const input = marketScores[market.id];
    if (!input) {
      throw new Error(
        `Missing score input for market "${market.name}" (${market.id}). ` +
        `All shortlisted markets must have score data.`
      );
    }
    return scoreMarket(market.id, market.name, input);
  });

  // Sort descending by expansion potential score
  results.sort((a, b) => b.expansionPotentialScore - a.expansionPotentialScore);

  return {
    companyName,
    offeringName,
    generatedAt: new Date().toISOString(),
    results,
    topPriority: results.length > 0 ? results[0] : null,
  };
}
