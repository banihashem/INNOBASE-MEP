/**
 * MEP-light™ — Demo Scenario v0.2 unit tests
 *
 * Covers the v0.2-specific logic (directive §10.2):
 *  - letter-grade tier mapping (77 → A-), frontend + backend parity
 *  - sector-specific weighting (weights sum to 1.0; resolution)
 *  - adverse-dimension inversion + potential/confidence/risk separation
 *  - input-derived draft scoring + strict schema validation
 *  - dynamic decision statement (mapping, no raw concatenation, enrichment)
 *  - organizational summary synthesis (rejects concatenation / empty)
 *  - legacy evidence-state mapping (Unknown → To Validate)
 *
 * Runs standalone via: node --import tsx tests/demo_scenario_v0.2.test.ts
 */

import {
  letterGrade as feLetterGrade,
  recommendedAction,
  computeMarketResult,
  resolveSectorWeights,
  SECTOR_WEIGHTS,
  BASE_WEIGHTS,
} from "../src/lib/scoring";
import {
  generateDraftScores,
  validateDraftScores,
  DraftScoreError,
} from "../src/lib/draftScoring";
import {
  buildDecisionStatement,
  buildOrgContextSummary,
  DEFAULT_DECISION_STATEMENT,
  DEFAULT_ORG_SUMMARY,
} from "../src/lib/narrative";
import { evidenceStateLabel, CompanySnapshot, MarketScoreInput } from "../src/types";
import { letterGrade as beLetterGrade, scoreMarket } from "../backend/src/scoring_engine.js";

let total = 0, passed = 0, failed = 0;
const failures: string[] = [];
function assert(cond: boolean, name: string, extra?: string) {
  total++;
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name + (extra ? ` — ${extra}` : "")); console.log(`  ✗ FAILED: ${name}${extra ? ` — ${extra}` : ""}`); }
}
function section(t: string) { console.log(`\n────────────────────────────────────────────\n  ${t}\n────────────────────────────────────────────`); }

const mk = (over: Partial<Record<keyof MarketScoreInput["scores"], number>>, conf: MarketScoreInput["evidenceConfidence"] = "Medium"): MarketScoreInput => ({
  marketId: "m",
  scores: {
    marketAttractiveness: 3, offeringFit: 3, channelAccess: 3, operationalFeasibility: 3,
    strategicValue: 3, financialLogic: 3, brandTrustTransferability: 3,
    competitiveIntensity: 3, regulatoryComplexity: 3, ...over,
  },
  dimensionEvidence: {} as any,
  evidenceBasis: "Expert Judgment",
  evidenceConfidence: conf,
});

// ─── 1. Letter grades ────────────────────────────────────────────────
section("Letter-grade tier mapping (spec 9.4)");
const gradeCases: [number, string][] = [
  [100, "A"], [80, "A"], [79, "A-"], [77, "A-"], [75, "A-"],
  [74, "B+"], [70, "B+"], [69, "B"], [68, "B"], [65, "B"], [61, "B"], [60, "B"],
  [59, "B-"], [54, "B-"], [50, "B-"], [49, "C"], [40, "C"], [39, "D"], [0, "D"],
];
for (const [score, grade] of gradeCases) {
  assert(feLetterGrade(score) === grade, `frontend letterGrade(${score}) === ${grade}`, `got ${feLetterGrade(score)}`);
  assert(beLetterGrade(score) === grade, `backend letterGrade(${score}) === ${grade}`, `got ${beLetterGrade(score)}`);
}
assert(feLetterGrade(77) === "A-", "SPEC: 77 displays A-, not A");

// ─── 2. Sector weights ───────────────────────────────────────────────
section("Sector-specific weighting (spec §13)");
for (const [sector, w] of Object.entries(SECTOR_WEIGHTS)) {
  const sum = w.opportunity + w.fit + w.feasibility + w.strategic + w.financial;
  assert(Math.abs(sum - 1) < 1e-9, `${sector} weights sum to 1.0`, `sum=${sum}`);
}
assert(Math.abs(BASE_WEIGHTS.opportunity + BASE_WEIGHTS.fit + BASE_WEIGHTS.feasibility + BASE_WEIGHTS.strategic + BASE_WEIGHTS.financial - 1) < 1e-9, "BASE_WEIGHTS sum to 1.0");
assert(resolveSectorWeights("Food & Beverage") === SECTOR_WEIGHTS["Food & Beverage"], "resolveSectorWeights returns F&B profile");
assert(resolveSectorWeights("Nonexistent Sector") === BASE_WEIGHTS, "unknown sector falls back to BASE_WEIGHTS");
assert(resolveSectorWeights(undefined) === BASE_WEIGHTS, "undefined sector falls back to BASE_WEIGHTS");

// ─── 3. Adverse inversion + separation ───────────────────────────────
section("Adverse-dimension inversion + potential/confidence/risk separation");
const lowComp = computeMarketResult("a", "A", mk({ competitiveIntensity: 1 }));
const highComp = computeMarketResult("b", "B", mk({ competitiveIntensity: 5 }));
assert(lowComp.potentialScore > highComp.potentialScore, "higher Competitive Intensity → LOWER potential (adverse not rewarded)", `${lowComp.potentialScore} vs ${highComp.potentialScore}`);
const lowReg = computeMarketResult("a", "A", mk({ regulatoryComplexity: 1 }));
const highReg = computeMarketResult("b", "B", mk({ regulatoryComplexity: 5 }));
assert(lowReg.potentialScore > highReg.potentialScore, "higher Regulatory Complexity → LOWER potential (adverse not rewarded)");
assert(highComp.riskExposure > lowComp.riskExposure, "higher adverse dims → higher Risk Exposure");
// Separation: potential and confidence move independently.
const strongEvidence = computeMarketResult("c", "C", mk({}, "High"));
const weakEvidence = computeMarketResult("c", "C", mk({}, "Low"));
assert(strongEvidence.potentialScore === weakEvidence.potentialScore, "Evidence confidence does NOT change Potential (separation)");
assert(strongEvidence.evidenceConfidenceScore > weakEvidence.evidenceConfidenceScore, "Evidence confidence score reflects evidence quality only");

// ─── 4. Recommended action (cautious) ────────────────────────────────
section("Recommended Action (cautious, validation-oriented)");
assert(/hypothesis/i.test(recommendedAction(85, 30, true)), "low-confidence high-potential → hypothesis caution");
assert(/validate/i.test(recommendedAction(77, 68, false)), "77 → 'Validate key assumptions...'");
const actions = [recommendedAction(85, 80, false), recommendedAction(50, 60, false), recommendedAction(30, 60, false)];
assert(actions.every((a) => !/\benter this market\b/i.test(a)), "no unconditional 'enter this market' recommendation");

// ─── 5. Draft scoring (input-derived + schema) ───────────────────────
section("Input-derived draft scoring + schema validation (spec §8.2)");
const draftBase = generateDraftScores({ marketId: "uae", marketName: "UAE", sector: "Food & Beverage", capabilities: "distribution network, brand strength", constraints: "limited budget" });
const dims = Object.values(draftBase.scores);
assert(dims.every((v) => Number.isInteger(v) && v >= 1 && v <= 5), "all 9 draft scores are integers in [1,5]");
assert(Object.keys(draftBase.scores).length === 9, "draft has exactly 9 dimensions");
const draftReg = generateDraftScores({ marketId: "x", marketName: "X", marketNote: "significant regulatory and compliance barriers" });
const draftNoReg = generateDraftScores({ marketId: "x", marketName: "X" });
assert(draftReg.scores.regulatoryComplexity >= draftNoReg.scores.regulatoryComplexity, "regulatory note raises Regulatory Complexity (adverse)");
const draftBudget = generateDraftScores({ marketId: "y", marketName: "Y", constraints: "very limited budget and pricing pressure" });
assert(draftBudget.scores.financialLogic <= 3, "budget constraint lowers Financial Logic");
const draftA = generateDraftScores({ marketId: "aaa", marketName: "Alpha" });
const draftB = generateDraftScores({ marketId: "zzz", marketName: "Zeta" });
assert(JSON.stringify(draftA.scores) !== JSON.stringify(draftB.scores), "different markets get distinct (input-varied) drafts, not all identical");
const highConf = generateDraftScores({ marketId: "h", marketName: "H", capabilities: "cap", constraints: "con", domesticMarketSize: "10M", evidenceStates: { businessName: "Confirmed", sector: "Confirmed", domesticMarketSize: "Confirmed" } });
assert(highConf.evidenceConfidence === "High", "all-confirmed + filled inputs → High evidence confidence", `got ${highConf.evidenceConfidence}`);
// Schema validation
let threw = false;
try { validateDraftScores({ marketAttractiveness: 3 } as any); } catch (e) { threw = e instanceof DraftScoreError; }
assert(threw, "validateDraftScores throws DraftScoreError on missing dimensions");
const clamped = validateDraftScores({
  marketAttractiveness: 9, offeringFit: 0, channelAccess: 3.6, operationalFeasibility: 3,
  strategicValue: 3, financialLogic: 3, brandTrustTransferability: 3, competitiveIntensity: -2, regulatoryComplexity: 3,
});
assert(clamped.marketAttractiveness === 5 && clamped.offeringFit === 1 && clamped.competitiveIntensity === 1, "validateDraftScores clamps to [1,5]");
assert(clamped.channelAccess === 4, "validateDraftScores rounds (3.6 → 4)");

// ─── 6. Dynamic decision statement ───────────────────────────────────
section("Dynamic decision statement (spec §4.3/4.4)");
assert(buildDecisionStatement({ businessName: "", decisionMode: "New Market Entry Readiness", expansionHorizon: "12 months", strategicObjective: "" }) === DEFAULT_DECISION_STATEMENT, "default paragraph before input");
const st1 = buildDecisionStatement({ businessName: "Acme", decisionMode: "New Market Entry Readiness", expansionHorizon: "24 months", strategicObjective: "Grow revenue by expanding abroad" });
assert(st1.startsWith("Acme wants to identify"), "uses business name", st1.slice(0, 40));
assert(st1.includes("market entry pathway"), "New Market Entry → 'entry'");
assert(st1.includes("24-month period"), "horizon → '24-month period'");
assert(!st1.includes("Grow revenue by expanding abroad"), "does NOT concatenate the raw objective");
const st2 = buildDecisionStatement({ businessName: "Beta", decisionMode: "Existing Market Expansion Readiness", expansionHorizon: "36 months", strategicObjective: "x" });
assert(st2.includes("market expansion pathway"), "Existing Market Expansion → 'expansion'");
const st3 = buildDecisionStatement({ businessName: "Gamma", decisionMode: "New Market Entry Readiness", expansionHorizon: "12 months", strategicObjective: "x", capabilities: "strong distribution network", constraints: "limited brand awareness", sector: "SaaS & Digital Platforms" });
assert(st3.includes("the comparison will weigh"), "Step 2 enrichment appended when capabilities/constraints present");
assert(st3.length > st1.length, "enriched statement is longer than post-Step-1 statement");

// ─── 7. Organizational context summary ───────────────────────────────
section("Organizational context summary synthesis (spec §5.4)");
const blank: CompanySnapshot = {
  businessName: "", sector: "", domesticMarketSize: "", exportExperience: "", internalCapabilities: "", knownConstraints: "",
  evidenceStates: { businessName: "To Validate", sector: "To Validate", domesticMarketSize: "To Validate", exportExperience: "To Validate", internalCapabilities: "To Validate", knownConstraints: "To Validate" },
};
assert(buildOrgContextSummary(blank) === DEFAULT_ORG_SUMMARY, "default message when no company name");
const nameOnly = { ...blank, businessName: "Solo Co" };
assert(/Complete additional fields/i.test(buildOrgContextSummary(nameOnly)), "name-only → prompts for more fields (rejects empty/irrelevant)");
const full: CompanySnapshot = {
  businessName: "NovaFoods", sector: "Food & Beverage", domesticMarketSize: "$15M revenue",
  exportExperience: "Limited/Indirect Exporting", internalCapabilities: "modular packaging, shelf-life technology",
  knownConstraints: "high shipping costs, weak brand recognition",
  evidenceStates: { businessName: "Confirmed", sector: "Confirmed", domesticMarketSize: "Estimated", exportExperience: "Confirmed", internalCapabilities: "Estimated", knownConstraints: "Estimated" },
};
const summary = buildOrgContextSummary(full);
const naiveConcat = `${full.businessName} ${full.sector} ${full.domesticMarketSize} ${full.internalCapabilities} ${full.knownConstraints}`;
assert(summary !== naiveConcat, "summary is NOT a raw concatenation of field values");
assert(summary.includes("NovaFoods") && summary.includes("Food & Beverage sector"), "summary references business name + sector in advisory prose");
assert(/operates in the|assessment|prioritization/i.test(summary), "summary contains advisory/synthesizing language");
assert(summary.length > naiveConcat.length * 2, "synthesis materially expands beyond raw inputs");

// ─── 8. Legacy evidence-state mapping ────────────────────────────────
section("Legacy evidence-state mapping");
assert(evidenceStateLabel("Unknown") === "To Validate", "legacy 'Unknown' displays as 'To Validate'");
assert(evidenceStateLabel("Confirmed") === "Confirmed", "'Confirmed' unchanged");
assert(evidenceStateLabel("Estimated") === "Estimated", "'Estimated' unchanged");
assert(evidenceStateLabel("To Validate") === "To Validate", "'To Validate' unchanged");

// ─── 9. Backend scoreMarket letterGrade field ────────────────────────
section("Backend scoreMarket exposes letterGrade");
const smInput: any = { marketId: "uae", scores: mk({}).scores, evidenceBasis: "Market Reports", evidenceConfidence: "Medium" };
const sm = scoreMarket("uae", "UAE", smInput);
assert(sm.letterGrade === beLetterGrade(sm.expansionPotentialScore), "scoreMarket.letterGrade matches letterGrade(score)");

// ─── Summary ─────────────────────────────────────────────────────────
console.log(`\n────────────────────────────────────────────\n  TEST SUMMARY\n────────────────────────────────────────────`);
console.log(`  Total: ${total}  Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) {
  console.log("\n  Failures:");
  failures.forEach((f) => console.log(`   - ${f}`));
  console.log("\n  ✗ SOME TESTS FAILED");
  process.exit(1);
} else {
  console.log("\n  ✓ ALL DEMO SCENARIO v0.2 TESTS PASSED");
}
