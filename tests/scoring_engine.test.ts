/**
 * MEP-light™ — Golden Dataset Verification Tests
 * 
 * Validates that the scoring engine produces mathematically exact outputs
 * for the "Company Alpha" / "Offering X" dataset across all 5 default markets
 * and 3 edge cases.
 * 
 * Run with: npx tsx tests/scoring_engine.test.ts
 * Exit code: 0 = all pass, 1 = any failure
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import {
  invertNegativeDimension,
  calculateCategoryScores,
  calculateExpansionPotential,
  classifyTier,
  calculateRiskExposure,
  scoreMarket,
  generateComparativeDashboard,
} from "../backend/src/scoring_engine.js";

import {
  getConfidenceScore,
  getConfidenceLabel,
  applyConfidenceDecoupling,
} from "../backend/src/confidence.js";

import type {
  DimensionScores,
  MarketScoreInput,
  EvidenceConfidenceLevel,
} from "../backend/src/data_models.js";

// ─── Test Infrastructure ─────────────────────────────────────────────

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: string[] = [];

function assert(
  condition: boolean,
  testName: string,
  expected: unknown,
  actual: unknown
): void {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    failedTests++;
    const msg = `  ✗ ${testName}\n    Expected: ${JSON.stringify(expected)}\n    Actual:   ${JSON.stringify(actual)}`;
    console.log(msg);
    failures.push(msg);
  }
}

function assertClose(
  actual: number,
  expected: number,
  testName: string,
  tolerance: number = 0.001
): void {
  assert(
    Math.abs(actual - expected) <= tolerance,
    testName,
    expected,
    actual
  );
}

function section(name: string): void {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${"─".repeat(60)}`);
}

// ─── Load Golden Dataset ─────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const goldenPath = resolve(__dirname, "golden_dataset.json");
const golden = JSON.parse(readFileSync(goldenPath, "utf-8"));

// ─── Unit Tests: Dimension Inversion ─────────────────────────────────

section("Unit Tests: Negative Dimension Inversion");

assert(invertNegativeDimension(1) === 5, "Invert 1 → 5", 5, invertNegativeDimension(1));
assert(invertNegativeDimension(2) === 4, "Invert 2 → 4", 4, invertNegativeDimension(2));
assert(invertNegativeDimension(3) === 3, "Invert 3 → 3", 3, invertNegativeDimension(3));
assert(invertNegativeDimension(4) === 2, "Invert 4 → 2", 2, invertNegativeDimension(4));
assert(invertNegativeDimension(5) === 1, "Invert 5 → 1", 1, invertNegativeDimension(5));

// ─── Unit Tests: Confidence Mapping ──────────────────────────────────

section("Unit Tests: Confidence Score Mapping");

assert(getConfidenceScore("High") === 90, "High → 90", 90, getConfidenceScore("High"));
assert(getConfidenceScore("Medium") === 60, "Medium → 60", 60, getConfidenceScore("Medium"));
assert(getConfidenceScore("Low") === 30, "Low → 30", 30, getConfidenceScore("Low"));
assert(getConfidenceScore("Unknown") === 10, "Unknown → 10", 10, getConfidenceScore("Unknown"));

assert(getConfidenceLabel("High") === "Reliable", "High → Reliable", "Reliable", getConfidenceLabel("High"));
assert(getConfidenceLabel("Medium") === "Needs Validation", "Medium → Needs Validation", "Needs Validation", getConfidenceLabel("Medium"));
assert(getConfidenceLabel("Low") === "Assumption-Based", "Low → Assumption-Based", "Assumption-Based", getConfidenceLabel("Low"));
assert(getConfidenceLabel("Unknown") === "Evidence Gap", "Unknown → Evidence Gap", "Evidence Gap", getConfidenceLabel("Unknown"));

// ─── Golden Dataset: Per-Market Verification ─────────────────────────

section("Golden Dataset: Per-Market Scoring Verification");

for (const marketDef of golden.markets) {
  const marketId = marketDef.id as string;
  const marketName = marketDef.name as string;
  const input = golden.marketScores[marketId] as MarketScoreInput;
  const expected = golden.expectedResults[marketId] as {
    adjustedCompetitiveIntensity: number;
    adjustedRegulatoryComplexity: number;
    categoryScores: {
      opportunity: number;
      offeringFit: number;
      feasibility: number;
      strategic: number;
      financial: number;
    };
    expansionPotentialScore: number;
    riskExposure: number;
    riskLevel: string;
    tier: string;
    evidenceConfidenceScore: number;
    evidenceConfidenceLabel: string;
    warnings: unknown[];
  };

  console.log(`\n  ── ${marketName} ──`);

  const result = scoreMarket(marketId, marketName, input);

  // Adjusted dimensions
  assert(
    result.adjustedCompetitiveIntensity === expected.adjustedCompetitiveIntensity,
    `${marketName}: Adjusted Competitive Intensity`,
    expected.adjustedCompetitiveIntensity,
    result.adjustedCompetitiveIntensity
  );
  assert(
    result.adjustedRegulatoryComplexity === expected.adjustedRegulatoryComplexity,
    `${marketName}: Adjusted Regulatory Complexity`,
    expected.adjustedRegulatoryComplexity,
    result.adjustedRegulatoryComplexity
  );

  // Category scores (use assertClose for floating point)
  assertClose(
    result.categoryScores.opportunity,
    expected.categoryScores.opportunity,
    `${marketName}: Opportunity sub-score`
  );
  assertClose(
    result.categoryScores.offeringFit,
    expected.categoryScores.offeringFit,
    `${marketName}: Offering Fit sub-score`
  );
  assertClose(
    result.categoryScores.feasibility,
    expected.categoryScores.feasibility,
    `${marketName}: Feasibility sub-score`
  );
  assert(
    result.categoryScores.strategic === expected.categoryScores.strategic,
    `${marketName}: Strategic sub-score`,
    expected.categoryScores.strategic,
    result.categoryScores.strategic
  );
  assert(
    result.categoryScores.financial === expected.categoryScores.financial,
    `${marketName}: Financial sub-score`,
    expected.categoryScores.financial,
    result.categoryScores.financial
  );

  // Composite score
  assert(
    result.expansionPotentialScore === expected.expansionPotentialScore,
    `${marketName}: Expansion Potential Score`,
    expected.expansionPotentialScore,
    result.expansionPotentialScore
  );

  // Risk assessment
  assertClose(
    result.riskExposure,
    expected.riskExposure,
    `${marketName}: Risk Exposure`
  );
  assert(
    result.riskLevel === expected.riskLevel,
    `${marketName}: Risk Level`,
    expected.riskLevel,
    result.riskLevel
  );

  // Tier classification
  assert(
    result.tier === expected.tier,
    `${marketName}: Tier Classification`,
    expected.tier,
    result.tier
  );

  // Confidence scores
  assert(
    result.evidenceConfidenceScore === expected.evidenceConfidenceScore,
    `${marketName}: Evidence Confidence Score`,
    expected.evidenceConfidenceScore,
    result.evidenceConfidenceScore
  );
  assert(
    result.evidenceConfidenceLabel === expected.evidenceConfidenceLabel,
    `${marketName}: Evidence Confidence Label`,
    expected.evidenceConfidenceLabel,
    result.evidenceConfidenceLabel
  );

  // Warnings
  assert(
    result.warnings.length === expected.warnings.length,
    `${marketName}: Warning count`,
    expected.warnings.length,
    result.warnings.length
  );
}

// ─── Edge Case: All 1s ───────────────────────────────────────────────

section("Edge Case: All Dimensions = 1 (Floor Test)");

const allOnes = golden.edgeCases.allOnes;
const allOnesInput: MarketScoreInput = {
  marketId: "edge-all-ones",
  scores: allOnes.scores as DimensionScores,
  evidenceBasis: "Desk research / assumptions only",
  evidenceConfidence: allOnes.evidenceConfidence as EvidenceConfidenceLevel,
};

const allOnesResult = scoreMarket("edge-all-ones", "All Ones", allOnesInput);

assert(
  allOnesResult.adjustedCompetitiveIntensity === allOnes.expected.adjustedCompetitiveIntensity,
  "All 1s: Adjusted Competitive (should be 5)",
  allOnes.expected.adjustedCompetitiveIntensity,
  allOnesResult.adjustedCompetitiveIntensity
);
assert(
  allOnesResult.adjustedRegulatoryComplexity === allOnes.expected.adjustedRegulatoryComplexity,
  "All 1s: Adjusted Regulatory (should be 5)",
  allOnes.expected.adjustedRegulatoryComplexity,
  allOnesResult.adjustedRegulatoryComplexity
);
assertClose(allOnesResult.categoryScores.opportunity, allOnes.expected.categoryScores.opportunity, "All 1s: Opportunity");
assertClose(allOnesResult.categoryScores.offeringFit, allOnes.expected.categoryScores.offeringFit, "All 1s: Offering Fit");
assertClose(allOnesResult.categoryScores.feasibility, allOnes.expected.categoryScores.feasibility, "All 1s: Feasibility");
assert(allOnesResult.expansionPotentialScore === allOnes.expected.expansionPotentialScore, "All 1s: Expansion Potential Score", allOnes.expected.expansionPotentialScore, allOnesResult.expansionPotentialScore);
assert(allOnesResult.tier === allOnes.expected.tier, "All 1s: Tier Classification", allOnes.expected.tier, allOnesResult.tier);

// ─── Edge Case: All 5s ───────────────────────────────────────────────

section("Edge Case: All Dimensions = 5 (Ceiling Test)");

const allFives = golden.edgeCases.allFives;
const allFivesInput: MarketScoreInput = {
  marketId: "edge-all-fives",
  scores: allFives.scores as DimensionScores,
  evidenceBasis: "Market reports",
  evidenceConfidence: allFives.evidenceConfidence as EvidenceConfidenceLevel,
};

const allFivesResult = scoreMarket("edge-all-fives", "All Fives", allFivesInput);

assert(
  allFivesResult.adjustedCompetitiveIntensity === allFives.expected.adjustedCompetitiveIntensity,
  "All 5s: Adjusted Competitive (should be 1)",
  allFives.expected.adjustedCompetitiveIntensity,
  allFivesResult.adjustedCompetitiveIntensity
);
assert(
  allFivesResult.adjustedRegulatoryComplexity === allFives.expected.adjustedRegulatoryComplexity,
  "All 5s: Adjusted Regulatory (should be 1)",
  allFives.expected.adjustedRegulatoryComplexity,
  allFivesResult.adjustedRegulatoryComplexity
);
assertClose(allFivesResult.categoryScores.opportunity, allFives.expected.categoryScores.opportunity, "All 5s: Opportunity");
assertClose(allFivesResult.categoryScores.offeringFit, allFives.expected.categoryScores.offeringFit, "All 5s: Offering Fit");
assertClose(allFivesResult.categoryScores.feasibility, allFives.expected.categoryScores.feasibility, "All 5s: Feasibility");
assert(allFivesResult.expansionPotentialScore === allFives.expected.expansionPotentialScore, "All 5s: Expansion Potential Score", allFives.expected.expansionPotentialScore, allFivesResult.expansionPotentialScore);
assert(allFivesResult.tier === allFives.expected.tier, "All 5s: Tier Classification", allFives.expected.tier, allFivesResult.tier);

// ─── Edge Case: High Score + Low Confidence (Decoupling) ─────────────

section("Edge Case: High Score + Low Confidence → Tier A Capped to Tier B");

const hslc = golden.edgeCases.highScoreLowConfidence;
const hslcInput: MarketScoreInput = {
  marketId: "edge-hslc",
  scores: hslc.scores as DimensionScores,
  evidenceBasis: "Desk research / assumptions only",
  evidenceConfidence: hslc.evidenceConfidence as EvidenceConfidenceLevel,
};

const hslcResult = scoreMarket("edge-hslc", "High Score Low Confidence", hslcInput);

assert(
  hslcResult.expansionPotentialScore === hslc.expected.expansionPotentialScore,
  "HSLC: Expansion Potential Score (should be 100)",
  hslc.expected.expansionPotentialScore,
  hslcResult.expansionPotentialScore
);
assert(
  hslcResult.tier === hslc.expected.tier,
  "HSLC: Tier should be capped to Tier B (not Tier A)",
  hslc.expected.tier,
  hslcResult.tier
);
assert(
  hslcResult.warnings.length > 0,
  "HSLC: Should have at least 1 warning",
  "> 0",
  hslcResult.warnings.length
);
assert(
  hslcResult.warnings[0]?.code === hslc.expected.warningCode,
  "HSLC: Warning code should be LOW_CONFIDENCE_HYPOTHESIS",
  hslc.expected.warningCode,
  hslcResult.warnings[0]?.code
);

// ─── Integration Test: Comparative Dashboard ─────────────────────────

section("Integration Test: Comparative Dashboard Generation");

const dashboard = generateComparativeDashboard(
  golden.companyName,
  golden.offeringName,
  golden.markets,
  golden.marketScores
);

assert(
  dashboard.results.length === 5,
  "Dashboard: Contains exactly 5 results",
  5,
  dashboard.results.length
);

assert(
  dashboard.companyName === golden.companyName,
  "Dashboard: Company name matches",
  golden.companyName,
  dashboard.companyName
);

assert(
  dashboard.offeringName === golden.offeringName,
  "Dashboard: Offering name matches",
  golden.offeringName,
  dashboard.offeringName
);

// Verify sort order (descending by score)
let isSorted = true;
for (let i = 1; i < dashboard.results.length; i++) {
  if (dashboard.results[i].expansionPotentialScore > dashboard.results[i - 1].expansionPotentialScore) {
    isSorted = false;
    break;
  }
}
assert(isSorted, "Dashboard: Results sorted descending by score", true, isSorted);

// Top priority should be UAE with score 72
assert(
  dashboard.topPriority?.marketId === "uae",
  "Dashboard: Top priority is UAE",
  "uae",
  dashboard.topPriority?.marketId
);
assert(
  dashboard.topPriority?.expansionPotentialScore === 72,
  "Dashboard: Top priority score is 72",
  72,
  dashboard.topPriority?.expansionPotentialScore
);

// Verify the full ranking order by score
const expectedRanking = ["uae", "azerbaijan", "germany", "iraq", "canada"];
const actualRanking = dashboard.results.map(r => r.marketId);
// Note: Azerbaijan (65) > Germany (64) > Iraq (62) > Canada (61)
assert(
  JSON.stringify(actualRanking) === JSON.stringify(expectedRanking),
  "Dashboard: Full ranking order matches expected",
  expectedRanking,
  actualRanking
);

// ─── Test Summary ────────────────────────────────────────────────────

section("TEST SUMMARY");

console.log(`\n  Total Tests:  ${totalTests}`);
console.log(`  Passed:       ${passedTests}`);
console.log(`  Failed:       ${failedTests}`);

if (failedTests > 0) {
  console.log(`\n  ╔══════════════════════════════════════════════════╗`);
  console.log(`  ║  ✗ TESTS FAILED                                 ║`);
  console.log(`  ╚══════════════════════════════════════════════════╝`);
  console.log(`\n  Failed tests:`);
  failures.forEach((f) => console.log(f));
  process.exit(1);
} else {
  console.log(`\n  ╔══════════════════════════════════════════════════╗`);
  console.log(`  ║  ✓ ALL TESTS PASSED — 100% MATHEMATICAL ACCURACY║`);
  console.log(`  ╚══════════════════════════════════════════════════╝`);
  process.exit(0);
}
