/**
 * MEP-light™ — Golden Scenario Test: Somayeh F&B / Kashkam / UAE
 *
 * Verifies the scoring engine produces exact expected values
 * for the "Somayeh F&B" expanding "Kashkam" into "UAE" scenario.
 */

import {
  invertNegativeDimension,
  calculateCategoryScores,
  calculateExpansionPotential,
  classifyTier,
  calculateRiskExposure,
  scoreMarket,
} from "../backend/src/scoring_engine.js";
import type { MarketScoreInput, DimensionScores } from "../backend/src/data_models.js";

let passed = 0;
let failed = 0;

function assert(label: string, actual: unknown, expected: unknown): void {
  const match =
    typeof actual === "number" && typeof expected === "number"
      ? Math.abs(actual - expected) < 0.001
      : actual === expected;
  if (match) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}: expected ${expected}, got ${actual}`);
    failed++;
  }
}

// ─── Somayeh F&B / Kashkam / UAE Scenario ─────────────────
// This is the canonical "golden" test dataset described in the spec.

const SOMAYEH_KASHKAM_UAE_SCORES: DimensionScores = {
  marketAttractiveness: 4,      // UAE is a premium trade hub
  offeringFit: 3,               // Kashkam is new-to-market, untested
  channelAccess: 4,             // Strong distribution networks
  operationalFeasibility: 3,    // Halal certification, labeling adaptation
  strategicValue: 4,            // Gateway to GCC
  financialLogic: 3,            // Moderate margins after duties
  brandTrustTransferability: 2, // Kashkam brand unknown in UAE
  competitiveIntensity: 4,      // High competitor density (negative)
  regulatoryComplexity: 2,      // Relatively streamlined via MoCCAE
};

const SOMAYEH_UAE_INPUT: MarketScoreInput = {
  marketId: "uae",
  scores: SOMAYEH_KASHKAM_UAE_SCORES,
  evidenceBasis: "Expert judgment",
  evidenceConfidence: "Medium",
};

console.log("\n────────────────────────────────────────────────────────────");
console.log("  Golden Scenario: Somayeh F&B / Kashkam / UAE");
console.log("────────────────────────────────────────────────────────────\n");

// Step 1: Inversion
const adjCompetitive = invertNegativeDimension(4); // 6 - 4 = 2
const adjRegulatory = invertNegativeDimension(2);  // 6 - 2 = 4

assert("Adjusted Competitive Intensity", adjCompetitive, 2);
assert("Adjusted Regulatory Complexity", adjRegulatory, 4);

// Step 2: Category sub-scores
const cats = calculateCategoryScores(SOMAYEH_KASHKAM_UAE_SCORES);

// Opportunity = (4 * 0.70) + (2 * 0.30) = 2.8 + 0.6 = 3.4
assert("Opportunity sub-score", cats.opportunity, 3.4);

// Offering Fit = (3 * 0.65) + (2 * 0.35) = 1.95 + 0.7 = 2.65
assert("Offering Fit sub-score", cats.offeringFit, 2.65);

// Feasibility = (4 * 0.35) + (4 * 0.30) + (3 * 0.35) = 1.4 + 1.2 + 1.05 = 3.65
assert("Feasibility sub-score", cats.feasibility, 3.65);

// Strategic = 4 (pass-through)
assert("Strategic sub-score", cats.strategic, 4);

// Financial = 3 (pass-through)
assert("Financial sub-score", cats.financial, 3);

// Step 3: Expansion Potential
// Weighted = (3.4*0.25) + (2.65*0.20) + (3.65*0.25) + (4*0.10) + (3*0.20)
//          = 0.85 + 0.53 + 0.9125 + 0.4 + 0.6 = 3.2925
// Composite = round(3.2925 * 20) = round(65.85) = 66
const eps = calculateExpansionPotential(cats);
assert("Expansion Potential Score", eps, 66);

// Step 4: Tier
assert("Tier Classification", classifyTier(66), "Tier B: Promising");

// Step 5: Risk
const risk = calculateRiskExposure(SOMAYEH_KASHKAM_UAE_SCORES);
// Risk = (4 + 2) / 2 = 3.0
assert("Risk Exposure", risk.riskExposure, 3.0);
assert("Risk Level", risk.riskLevel, "Medium");

// Step 6: Full pipeline
const result = scoreMarket("uae", "UAE", SOMAYEH_UAE_INPUT);
assert("Full pipeline: Score", result.expansionPotentialScore, 66);
assert("Full pipeline: Tier", result.tier, "Tier B: Promising");
assert("Full pipeline: Confidence Score", result.evidenceConfidenceScore, 60);
assert("Full pipeline: Confidence Label", result.evidenceConfidenceLabel, "Needs Validation");
assert("Full pipeline: Warnings count", result.warnings.length, 0);

// ─── Edge Case: Somayeh with Low confidence ──────────────
console.log("\n────────────────────────────────────────────────────────────");
console.log("  Variant: Somayeh UAE with ALL 5s + Low Confidence");
console.log("────────────────────────────────────────────────────────────\n");

const highScoreInput: MarketScoreInput = {
  marketId: "uae",
  scores: {
    marketAttractiveness: 5,
    offeringFit: 5,
    channelAccess: 5,
    operationalFeasibility: 5,
    strategicValue: 5,
    financialLogic: 5,
    brandTrustTransferability: 5,
    competitiveIntensity: 1, // low comp = good
    regulatoryComplexity: 1, // low reg = good
  },
  evidenceBasis: "Desk research / assumptions only",
  evidenceConfidence: "Low",
};

const perfResult = scoreMarket("uae", "UAE", highScoreInput);
assert("Perfect scores: Score = 100", perfResult.expansionPotentialScore, 100);
assert("Perfect + Low confidence: Tier capped to B", perfResult.tier, "Tier B: Promising");
assert("Perfect + Low confidence: Has warning", perfResult.warnings.length, 1);
assert("Warning code", perfResult.warnings[0]?.code, "LOW_CONFIDENCE_HYPOTHESIS");

// ─── Summary ─────────────────────────────────────────────
console.log("\n────────────────────────────────────────────────────────────");
console.log("  GOLDEN SCENARIO SUMMARY");
console.log("────────────────────────────────────────────────────────────\n");
console.log(`  Total Tests:  ${passed + failed}`);
console.log(`  Passed:       ${passed}`);
console.log(`  Failed:       ${failed}`);

if (failed === 0) {
  console.log("\n  ╔══════════════════════════════════════════════════╗");
  console.log("  ║  ✓ GOLDEN SCENARIO VERIFIED — 100% ACCURACY     ║");
  console.log("  ╚══════════════════════════════════════════════════╝\n");
  process.exit(0);
} else {
  console.log("\n  ╔══════════════════════════════════════════════════╗");
  console.log(`  ║  ✗ ${failed} FAILURES — INVESTIGATION REQUIRED     ║`);
  console.log("  ╚══════════════════════════════════════════════════╝\n");
  process.exit(1);
}
