/**
 * MEP-light™ — Evidence Confidence Module
 * 
 * Handles the conversion of qualitative evidence confidence levels
 * to numeric 0–100 scores and implements the "Low-Confidence Hypothesis"
 * detection required by the confidence decoupling specification.
 * 
 * Charter compliance:
 *  - "Separation of Evidence from Uncertainty" [16, 17]
 *  - "Clarify Preparedness, Do Not Predict Success" [10, 14]
 */

import type {
  EvidenceConfidenceLevel,
  EvidenceConfidenceLabel,
  ScoringWarning,
  TierClassification,
} from "./data_models.js";

// ─── Confidence Numeric Mapping ──────────────────────────────────────

/**
 * Maps qualitative confidence levels to numeric 0–100 scores.
 * These values are calibrated so that:
 *   - "High" (90) is well above the 50-point threshold
 *   - "Low" (30) triggers the Low-Confidence Hypothesis flag
 *   - "Unknown" (10) represents near-zero evidence
 */
const CONFIDENCE_SCORE_MAP: Record<EvidenceConfidenceLevel, number> = {
  High: 90,
  Medium: 60,
  Low: 30,
  Unknown: 10,
};

/**
 * Maps confidence levels to their human-readable report labels.
 */
const CONFIDENCE_LABEL_MAP: Record<EvidenceConfidenceLevel, EvidenceConfidenceLabel> = {
  High: "Reliable",
  Medium: "Needs Validation",
  Low: "Assumption-Based",
  Unknown: "Evidence Gap",
};

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Converts a qualitative confidence level to a numeric 0–100 score.
 */
export function getConfidenceScore(level: EvidenceConfidenceLevel): number {
  return CONFIDENCE_SCORE_MAP[level] ?? 10;
}

/**
 * Returns the display label for a confidence level.
 */
export function getConfidenceLabel(level: EvidenceConfidenceLevel): EvidenceConfidenceLabel {
  return CONFIDENCE_LABEL_MAP[level] ?? "Evidence Gap";
}

/**
 * Applies the Confidence Decoupling rule:
 * 
 * If a market's Expansion Potential Score > 70 (High)
 * but its Evidence Confidence Score < 50 (Low or Unknown),
 * then:
 *   1. Flag a "Low-Confidence Hypothesis" warning
 *   2. Cap the tier classification at Tier B (cannot be Tier A)
 * 
 * @param expansionPotentialScore - The composite 0–100 score
 * @param confidenceLevel - The qualitative confidence enum
 * @param currentTier - The tier assigned by raw scoring
 * @returns Object with the potentially adjusted tier and any warnings
 */
export function applyConfidenceDecoupling(
  expansionPotentialScore: number,
  confidenceLevel: EvidenceConfidenceLevel,
  currentTier: TierClassification
): {
  adjustedTier: TierClassification;
  warnings: ScoringWarning[];
} {
  const confidenceScore = getConfidenceScore(confidenceLevel);
  const warnings: ScoringWarning[] = [];
  let adjustedTier = currentTier;

  if (expansionPotentialScore > 70 && confidenceScore < 50) {
    // Flag the Low-Confidence Hypothesis
    warnings.push({
      code: "LOW_CONFIDENCE_HYPOTHESIS",
      message:
        `Expansion Potential is High (${expansionPotentialScore}/100) but Evidence Confidence ` +
        `is ${confidenceLevel} (${confidenceScore}/100). This market is flagged as a ` +
        `"Low-Confidence Hypothesis" — classification is capped at Tier B until evidence ` +
        `quality improves. Do not commit significant capital without validation.`,
      severity: "critical",
    });

    // Cap at Tier B if currently Tier A
    if (currentTier === "Tier A: Priority") {
      adjustedTier = "Tier B: Promising";
    }
  }

  return { adjustedTier, warnings };
}
