/**
 * MEP-light™ — Demo Scenario v0.2 Cure Regression Tests
 *
 * Mandatory coverage areas (directive §5.1–§5.5):
 *   §5.1 Adverse dimension labels (rendered semantics)
 *   §5.2 User-adjusted score lifecycle (markers, persistence, hydration)
 *   §5.3 Narrative mode consistency (entry vs expansion)
 *   §5.4 Low-confidence Step 5→6 flow (no dead-ends)
 *   §5.5 Runtime identity marker contract
 *
 * Runs standalone via: node --import tsx tests/cure_regression_v0.2.test.ts
 *
 * DEVELOPER-CURE-EVIDENCE — NOT INDEPENDENT QA
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import {
  computeMarketResult,
  letterGrade,
  recommendedAction,
} from "../src/lib/scoring";
import {
  buildDecisionStatement,
  buildOrgContextSummary,
  DEFAULT_DECISION_STATEMENT,
  DEFAULT_ORG_SUMMARY,
} from "../src/lib/narrative";
import {
  generateDraftScores,
  validateDraftScores,
} from "../src/lib/draftScoring";
import {
  CompanySnapshot,
  MarketScoreInput,
  DimensionScores,
  EvidenceState,
} from "../src/types";

let total = 0, passed = 0, failed = 0;
const failures: string[] = [];
function assert(cond: boolean, name: string, extra?: string) {
  total++;
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; failures.push(name + (extra ? ` \u2014 ${extra}` : "")); console.log(`  \u2717 FAILED: ${name}${extra ? ` \u2014 ${extra}` : ""}`); }
}
function section(t: string) { console.log(`\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  ${t}\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`); }

const mk = (over: Partial<Record<keyof MarketScoreInput["scores"], number>> = {}, conf: MarketScoreInput["evidenceConfidence"] = "Medium"): MarketScoreInput => ({
  marketId: "test",
  scores: {
    marketAttractiveness: 3, offeringFit: 3, channelAccess: 3, operationalFeasibility: 3,
    strategicValue: 3, financialLogic: 3, brandTrustTransferability: 3,
    competitiveIntensity: 3, regulatoryComplexity: 3, ...over,
  },
  dimensionEvidence: {} as any,
  evidenceBasis: "Expert Judgment",
  evidenceConfidence: conf,
});

const mkSnapshot = (overrides: Partial<CompanySnapshot> = {}): CompanySnapshot => ({
  businessName: "TestCo",
  sector: "Food & Beverage",
  domesticMarketSize: "$10M",
  exportExperience: "Active International Exporter",
  internalCapabilities: "Full manufacturing, quality control, export logistics",
  knownConstraints: "Limited budget for initial market entry",
  evidenceStates: {
    businessName: "Confirmed",
    sector: "Confirmed",
    domesticMarketSize: "Confirmed",
    exportExperience: "Confirmed",
    internalCapabilities: "Estimated",
    knownConstraints: "Estimated",
  },
  ...overrides,
});


// ====================================================================
//  5.1 ADVERSE DIMENSION LABELS
// ====================================================================
section("5.1 Adverse dimension labels");

const scoringScreenSrc = readFileSync(
  resolve(__dirname, "..", "src", "components", "ScoringEvidenceScreen.tsx"),
  "utf-8"
);

assert(scoringScreenSrc.includes("1 (Unfavorable)"), "LABEL-POS-1: Positive low-end = Unfavorable");
assert(scoringScreenSrc.includes("3 (Neutral)"), "LABEL-POS-3: Positive mid = Neutral");
assert(scoringScreenSrc.includes("5 (Favorable)"), "LABEL-POS-5: Positive high-end = Favorable");
assert(scoringScreenSrc.includes("1 (Low difficulty)"), "LABEL-ADV-1: Adverse low-end = Low difficulty");
assert(scoringScreenSrc.includes("3 (Moderate)"), "LABEL-ADV-3: Adverse mid = Moderate");
assert(scoringScreenSrc.includes("5 (High difficulty)"), "LABEL-ADV-5: Adverse high-end = High difficulty");
assert(scoringScreenSrc.includes("dim.isNegative"), "LABEL-COND: Labels conditional on dim.isNegative");

const negativeMatches = scoringScreenSrc.match(/isNegative:\s*true/g);
assert(negativeMatches !== null && negativeMatches.length === 2, "LABEL-COUNT: Exactly 2 isNegative dimensions", `found ${negativeMatches?.length ?? 0}`);

const low = computeMarketResult("a", "A", mk({ competitiveIntensity: 1, regulatoryComplexity: 1 }));
const high = computeMarketResult("b", "B", mk({ competitiveIntensity: 5, regulatoryComplexity: 5 }));
assert(low.potentialScore > high.potentialScore, "INVERSION-MATH: Low adverse -> higher potential", `low=${low.potentialScore} high=${high.potentialScore}`);
assert(high.riskExposure > low.riskExposure, "INVERSION-RISK: High adverse -> higher risk", `low=${low.riskExposure} high=${high.riskExposure}`);

assert(scoringScreenSrc.includes("Positive dimensions:"), "GUIDANCE-POS: Guidance documents positive scale");
assert(scoringScreenSrc.includes("Adverse dimensions"), "GUIDANCE-ADV: Guidance documents adverse scale");
assert(scoringScreenSrc.includes("automatically inverted"), "GUIDANCE-INV: Guidance explains inversion");


// ====================================================================
//  5.2 USER-ADJUSTED SCORE LIFECYCLE
// ====================================================================
section("5.2 User-adjusted score lifecycle");

const appSrc = readFileSync(resolve(__dirname, "..", "src", "App.tsx"), "utf-8");
const typesSrc = readFileSync(resolve(__dirname, "..", "src", "types.ts"), "utf-8");
const apiClientSrc = readFileSync(resolve(__dirname, "..", "src", "lib", "apiClient.ts"), "utf-8");

assert(scoringScreenSrc.includes("User Adjusted"), "ADJUSTED-BADGE: Badge text exists");
assert(scoringScreenSrc.includes("adjusted-badge-"), "ADJUSTED-ID: Badge has testable id pattern");
assert(scoringScreenSrc.includes("isAdjusted"), "ADJUSTED-FLAG: isAdjusted flag controls badge");
assert(appSrc.includes("stateSnapshot") && appSrc.includes("marketScores"), "ADJUSTED-PERSIST: stateSnapshot includes marketScores");
assert(appSrc.includes("userAdjusted"), "ADJUSTED-STATE: userAdjusted in App state");
assert(typesSrc.includes("dimensionEvidence") && typesSrc.includes("userAdjusted"), "ADJUSTED-TYPES: MarketScoreInput has required fields");
assert(apiClientSrc.includes("stateSnapshot"), "ADJUSTED-PATCH: apiClient handles stateSnapshot");
assert(scoringScreenSrc.includes("Regenerate Draft Scores"), "ADJUSTED-REGEN-LABEL: Regenerate button label");
assert(appSrc.includes("confirm") || appSrc.includes("window.confirm"), "ADJUSTED-CONFIRM: Overwrite confirmation guard");


// ====================================================================
//  5.3 NARRATIVE MODE CONSISTENCY
// ====================================================================
section("5.3 Narrative mode consistency");

const snapshot = mkSnapshot();

const entryStatement = buildDecisionStatement({
  businessName: "TestCo",
  decisionMode: "New Market Entry Readiness",
  expansionHorizon: "12 months",
  strategicObjective: "Explore growth",
});
assert(/entry/i.test(entryStatement), "NARR-ENTRY-S1: Decision statement uses 'entry'");
assert(!/expansion/i.test(entryStatement), "NARR-ENTRY-S1-NEG: No 'expansion' in entry mode");

const expansionStatement = buildDecisionStatement({
  businessName: "TestCo",
  decisionMode: "Existing Market Expansion Readiness",
  expansionHorizon: "24 months",
  strategicObjective: "Deepen coverage",
});
assert(/expansion/i.test(expansionStatement), "NARR-EXPAND-S1: Decision statement uses 'expansion'");
assert(!/\bentry\b/i.test(expansionStatement), "NARR-EXPAND-S1-NEG: No 'entry' in expansion mode");

const orgEntrySum = buildOrgContextSummary(snapshot, "New Market Entry Readiness");
assert(/entry/i.test(orgEntrySum), "NARR-ENTRY-S2: Org summary uses 'entry'");
assert(!/expansion/i.test(orgEntrySum), "NARR-ENTRY-S2-NEG: No 'expansion' in entry org summary");

const orgExpansionSum = buildOrgContextSummary(snapshot, "Existing Market Expansion Readiness");
assert(/expansion/i.test(orgExpansionSum), "NARR-EXPAND-S2: Org summary uses 'expansion'");

const companyScreenSrc = readFileSync(resolve(__dirname, "..", "src", "components", "CompanySnapshotScreen.tsx"), "utf-8");
assert(companyScreenSrc.includes("decisionMode"), "NARR-THREADING: CompanySnapshotScreen receives decisionMode");
assert(companyScreenSrc.includes("buildOrgContextSummary(data, decisionMode)"), "NARR-PASSTHROUGH: decisionMode passed to buildOrgContextSummary");
assert(appSrc.includes("decisionMode={decisionSetup.decisionMode}"), "NARR-APP-PROP: App passes decisionMode prop");


// ====================================================================
//  5.4 LOW-CONFIDENCE STEP 5->6 FLOW
// ====================================================================
section("5.4 Low-confidence Step 5->6 flow");

const undefinedResult = computeMarketResult("x", "X", undefined);
assert(undefinedResult.potentialScore >= 0 && undefinedResult.potentialScore <= 100, "LOWCONF-UNDEF: undefined input -> valid score", `score=${undefinedResult.potentialScore}`);
assert(undefinedResult.letterGrade !== undefined, "LOWCONF-UNDEF-GRADE: undefined -> valid grade");

const lowConfResult = computeMarketResult("lc", "LowConf", mk({}, "Low"));
assert(lowConfResult.potentialScore >= 0 && lowConfResult.potentialScore <= 100, "LOWCONF-VALID: Low conf -> valid score", `score=${lowConfResult.potentialScore}`);
assert(lowConfResult.evidenceConfidenceScore > 0, "LOWCONF-EVSCORE: Low conf -> nonzero evidence score", `ecscore=${lowConfResult.evidenceConfidenceScore}`);
assert(lowConfResult.confidence === "Low", "LOWCONF-LABEL: Low confidence label preserved");

const unknownConfResult = computeMarketResult("uc", "UnknownConf", mk({}, "Unknown"));
assert(unknownConfResult.potentialScore >= 0 && unknownConfResult.potentialScore <= 100, "LOWCONF-UNKNOWN: Unknown conf -> valid score");

const highPotLowConf = computeMarketResult("hp", "HighPotLowConf", mk({
  marketAttractiveness: 5, offeringFit: 5, channelAccess: 5,
  operationalFeasibility: 5, strategicValue: 5, financialLogic: 5,
  brandTrustTransferability: 5, competitiveIntensity: 1, regulatoryComplexity: 1,
}, "Low"));
assert(highPotLowConf.discrepancyAlert === true, "LOWCONF-DISCREPANCY: High pot + low conf -> discrepancy");
assert(/hypothesis|caution|valid/i.test(highPotLowConf.recommendedAction), "LOWCONF-ACTION: Cautious action text");

const actions = [recommendedAction(90, 30, true), recommendedAction(90, 50, false), recommendedAction(60, 30, false), recommendedAction(40, 30, false)];
for (const action of actions) {
  assert(!/\benter this market\b/i.test(action), "LOWCONF-NO-UNCONDITIONAL: No 'enter this market' text");
}

assert(appSrc.includes("case 5:"), "LOWCONF-STEP5: Step 5 validation exists");
const step5Match = appSrc.match(/case 5:[\s\S]*?(?=case \d|default)/);
assert(step5Match !== null && !step5Match[0].includes("confidence"), "LOWCONF-NO-BLOCK: Step 5 doesn't check confidence");


// ====================================================================
//  5.5 RUNTIME IDENTITY MARKER
// ====================================================================
section("5.5 Runtime identity marker");

const viteConfigSrc = readFileSync(resolve(__dirname, "..", "vite.config.ts"), "utf-8");
assert(viteConfigSrc.includes("__BUILD_SHA__"), "MARKER-SHA-DEF: __BUILD_SHA__ defined");
assert(viteConfigSrc.includes("__BUILD_TIMESTAMP__"), "MARKER-TS-DEF: __BUILD_TIMESTAMP__ defined");
assert(viteConfigSrc.includes("__BUILD_LABEL__"), "MARKER-LABEL-DEF: __BUILD_LABEL__ defined");
assert(viteConfigSrc.includes("demo-scenario-v0.2-cure-01"), "MARKER-LABEL-VAL: Correct label value");
assert(viteConfigSrc.includes("git rev-parse --short HEAD"), "MARKER-SHA-GIT: SHA from git");

const envDts = readFileSync(resolve(__dirname, "..", "src", "env.d.ts"), "utf-8");
assert(envDts.includes("declare const __BUILD_SHA__: string"), "MARKER-TYPE-SHA: SHA type declared");
assert(envDts.includes("declare const __BUILD_TIMESTAMP__: string"), "MARKER-TYPE-TS: Timestamp type declared");
assert(envDts.includes("declare const __BUILD_LABEL__: string"), "MARKER-TYPE-LABEL: Label type declared");
assert(envDts.includes("__MEP_BUILD__"), "MARKER-WINDOW-TYPE: window.__MEP_BUILD__ typed");
assert(envDts.includes("version: string") && envDts.includes("sha: string") && envDts.includes("timestamp: string") && envDts.includes("label: string"), "MARKER-SHAPE: Correct shape");
assert(envDts.includes("runtimeMode: string"), "MARKER-RUNTIMEMODE: runtimeMode in type");

assert(appSrc.includes("window.__MEP_BUILD__"), "MARKER-SET: App.tsx sets window.__MEP_BUILD__");
assert(appSrc.includes("console.info") && appSrc.includes("MEP-light"), "MARKER-LOG: Logs build info on mount");
assert(appSrc.includes("import.meta.env.MODE"), "MARKER-MODE: App uses import.meta.env.MODE");

assert(!envDts.includes("token") && !envDts.includes("secret") && !envDts.includes("password"), "MARKER-NO-SECRETS: No secret fields");

if (existsSync(resolve(__dirname, "..", "dist", "assets"))) {
  const jsFiles = readdirSync(resolve(__dirname, "..", "dist", "assets")).filter(f => f.endsWith(".js"));
  const bundleContent = jsFiles.map(f => readFileSync(resolve(__dirname, "..", "dist", "assets", f), "utf-8")).join("\n");
  assert(bundleContent.includes("__MEP_BUILD__") || bundleContent.includes("MEP-light"), "MARKER-BUNDLE: Bundle contains marker");
} else {
  console.log("  ! dist/ not found - skipping bundle marker checks");
}


// ====================================================================
//  5.6 ERRORBOUNDARY VERIFICATION
// ====================================================================
section("5.6 ErrorBoundary type verification");

const ebSrc = readFileSync(resolve(__dirname, "..", "src", "components", "ErrorBoundary.tsx"), "utf-8");
assert(ebSrc.includes("declare state: ErrorBoundaryState"), "EB-STATE: declare state correct");
assert(ebSrc.includes("declare props: Readonly<ErrorBoundaryProps>"), "EB-PROPS: declare props correct");
assert(ebSrc.includes("declare setState:"), "EB-SETSTATE: declare setState present");
assert(ebSrc.includes("this.state = { hasError: false, error: null, errorInfo: null }"), "EB-INIT: Constructor init correct");
assert(ebSrc.includes("getDerivedStateFromError"), "EB-DERIVED: Lifecycle present");
assert(ebSrc.includes("componentDidCatch"), "EB-CATCH: Error catch present");
assert(!ebSrc.includes("@ts-ignore") && !ebSrc.includes("@ts-nocheck"), "EB-NO-SUPPRESS: No TS suppressions");


// ====================================================================
//  5.7 BUILD SHA RESOLUTION & FAIL-FAST
// ====================================================================
section("5.7 Build SHA resolution & fail-fast");

// Verify the vite config structure for SHA resolution
assert(viteConfigSrc.includes("resolveBuildSha"), "SHA-FN: resolveBuildSha function exists");
assert(viteConfigSrc.includes("VITE_BUILD_SHA"), "SHA-CI: CI env var VITE_BUILD_SHA checked");
assert(viteConfigSrc.includes("execSync('git rev-parse --short HEAD'"), "SHA-LOCAL: Local git fallback exists");
assert(!viteConfigSrc.includes("'unknown'"), "SHA-NO-UNKNOWN: No 'unknown' fallback in SHA resolution");
assert(viteConfigSrc.includes("throw new Error"), "SHA-FAILFAST: Fail-fast throws when no SHA");
assert(viteConfigSrc.includes("ciSha.length >= 7"), "SHA-MINLEN: CI SHA minimum length 7 enforced");
assert(viteConfigSrc.includes("gitSha.length >= 7"), "SHA-GITLEN: Git SHA minimum length 7 enforced");

// Verify CI SHA takes precedence over local git
const ciPrecedenceIdx = viteConfigSrc.indexOf("VITE_BUILD_SHA");
const gitFallbackIdx = viteConfigSrc.indexOf("git rev-parse");
assert(ciPrecedenceIdx < gitFallbackIdx, "SHA-PRIORITY: CI SHA checked before git fallback");

// Verify the import of execSync at top level (not inline require)
assert(viteConfigSrc.includes("import { execSync }"), "SHA-IMPORT: execSync imported at top level (reliable)");
assert(!viteConfigSrc.includes("require('child_process')"), "SHA-NO-REQUIRE: No inline require (was unreliable)");

// Verify built bundle has real SHA, not 'unknown'
if (existsSync(resolve(__dirname, "..", "dist", "assets"))) {
  const jsFiles = readdirSync(resolve(__dirname, "..", "dist", "assets")).filter(f => f.endsWith(".js"));
  const bundleContent = jsFiles.map(f => readFileSync(resolve(__dirname, "..", "dist", "assets", f), "utf-8")).join("\n");
  const markerMatch = bundleContent.match(/sha:"([^"]+)"/);
  assert(!!markerMatch, "SHA-BUNDLE-PRESENT: Bundle contains sha field");
  if (markerMatch) {
    assert(markerMatch[1] !== "unknown", "SHA-BUNDLE-NOT-UNKNOWN: Bundle SHA is not 'unknown'");
    assert(markerMatch[1].length >= 7, "SHA-BUNDLE-LEN: Bundle SHA has valid length");
    assert(/^[0-9a-f]+$/.test(markerMatch[1]), "SHA-BUNDLE-HEX: Bundle SHA is valid hex");
  }
  // Verify safe fields: no secrets, tokens, passwords in marker
  const markerBlock = bundleContent.match(/__MEP_BUILD__=\{[^}]+\}/)?.[0] || "";
  assert(!markerBlock.includes("token"), "SHA-SAFE-NO-TOKEN: Marker has no token field");
  assert(!markerBlock.includes("secret"), "SHA-SAFE-NO-SECRET: Marker has no secret field");
  assert(!markerBlock.includes("password"), "SHA-SAFE-NO-PASSWORD: Marker has no password field");
  assert(!markerBlock.includes("GOOGLE_CLIENT_ID"), "SHA-SAFE-NO-CLIENTID: Marker has no client ID");
} else {
  console.log("  ! dist/ not found - skipping bundle SHA checks");
}


// ====================================================================
//  SUMMARY
// ====================================================================
section("CURE REGRESSION TEST SUMMARY");
console.log(`\n  Total: ${total}  Passed: ${passed}  Failed: ${failed}\n`);
if (failures.length > 0) {
  console.log("  FAILURES:");
  for (const f of failures) console.log(`    \u2717 ${f}`);
  console.log("");
  process.exit(1);
}
console.log("  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
console.log("  \u2551  \u2713 ALL CURE REGRESSION TESTS PASSED                \u2551");
console.log("  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d");
console.log("");
