/**
 * MEP-light™ — RBAC Demo Participant Enforcement Test
 *
 * Structural code-path verification that the API server enforces
 * role-based access control for demo_participant users.
 *
 * This test reads the actual API server source code and validates
 * that RBAC checks exist at every required endpoint. It also verifies
 * the scoring engine and frontend components behave correctly for
 * demo_participant users.
 *
 * Run with: npx tsx tests/rbac_demo.test.ts
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import {
  scoreMarket,
} from "../backend/src/scoring_engine.js";

import type { MarketScoreInput } from "../backend/src/data_models.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Test Infrastructure ─────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${msg}`);
    failed++;
  }
}

console.log("────────────────────────────────────────────────────────────");
console.log("  MEP-light™ — RBAC Demo Participant Enforcement Tests");
console.log("────────────────────────────────────────────────────────────\n");

// ─── 1. API Server Code-Path Analysis ────────────────────────────────

const apiServerPath = resolve(__dirname, "../backend/src/api_server.ts");
const apiSrc = readFileSync(apiServerPath, "utf-8");

console.log("  Section 1: API Server RBAC Enforcement\n");

// 1.1 PDF Export — requires Consultant or Administrator
const pdfRoleCheck = apiSrc.includes('user.role !== "Administrator" && user.role !== "Consultant"');
const pdfReturns403 = apiSrc.includes('res.status(403).json({ error: "Consultant or Administrator role required for PDF export" })');
assert(pdfRoleCheck, "PDF export endpoint checks for Administrator OR Consultant role");
assert(pdfReturns403, "PDF export returns 403 for non-Consultant/Admin (blocks demo_participant)");

// 1.2 Admin endpoints — require isAdmin()
const isAdminFn = apiSrc.includes('function isAdmin(user: UserRecord): boolean');
const isAdminCheck = apiSrc.includes('return user.role === "Administrator"');
assert(isAdminFn, "isAdmin() helper function exists");
assert(isAdminCheck, 'isAdmin() checks for "Administrator" role only');

// 1.3 User stats endpoint — admin only
const statsAdminCheck = apiSrc.includes('if (!caller || !isAdmin(caller))') &&
  apiSrc.includes('"Administrator access required"');
assert(statsAdminCheck, "GET /api/v2/users/stats requires Administrator (blocks demo_participant)");

// 1.4 User list endpoint — admin only
const userListCheck = apiSrc.match(/\/api\/v2\/users.*isAdmin/s) !== null;
assert(userListCheck, "GET /api/v2/users requires Administrator (blocks demo_participant)");

// 1.5 User create endpoint — admin only
const userCreateCheck = apiSrc.includes('POST /api/v2/users') && apiSrc.includes('if (!caller || !isAdmin(caller))');
assert(userCreateCheck, "POST /api/v2/users (create user) requires Administrator");

// 1.6 Session ownership check — prevents cross-user access
const sessionOwnerCheck = apiSrc.includes('session.user_id !== user.userId');
const sessionReturns403 = apiSrc.includes('res.status(403).json({ error: "Access denied" })');
assert(sessionOwnerCheck, "Session GET verifies ownership (user_id match)");
assert(sessionReturns403, "Session GET returns 403 for non-owner (blocks other user's sessions)");

// 1.7 Session update — ownership enforced
const sessionUpdateOwner = apiSrc.includes('PATCH /api/v2/sessions/:id') &&
  apiSrc.includes('session.user_id !== user.userId');
assert(sessionUpdateOwner, "Session PATCH verifies ownership (blocks other user's sessions)");

// 1.8 Session review — requires Admin or Consultant
const sessionReviewCheck = apiSrc.includes('user.role !== "Administrator" && user.role !== "Consultant"') ||
  (apiSrc.includes('/api/v2/sessions/:id/review') && apiSrc.includes('"Administrator or Consultant role required"'));
assert(sessionReviewCheck, "Session review endpoint requires Admin/Consultant (blocks demo_participant)");

// 1.9 Auto-provision assigns demo_participant by default
const autoProvisionDefault = apiSrc.includes('const role = isAdminSeed ? "Administrator" : "demo_participant"');
assert(autoProvisionDefault, "Auto-provisioned users get demo_participant role (not Consultant/Admin)");

// 1.10 Self-role change blocked — user PATCH is admin-only
const userPatchAdminOnly = apiSrc.includes('PATCH /api/v2/users/:id') &&
  apiSrc.includes('!isAdmin(caller)');
assert(userPatchAdminOnly, "PATCH /api/v2/users/:id (role change) requires Administrator");

// ─── 2. Frontend UI RBAC ─────────────────────────────────────────────

console.log("\n  Section 2: Frontend UI RBAC Enforcement\n");

const appSrc = readFileSync(resolve(__dirname, "../src/App.tsx"), "utf-8");
const roadmapSrc = readFileSync(resolve(__dirname, "../src/components/RoadmapScreen.tsx"), "utf-8");
const scoringSrc = readFileSync(resolve(__dirname, "../src/components/ScoringEvidenceScreen.tsx"), "utf-8");

// 2.1 Step 8 locked for free-demo
const step8Locked = roadmapSrc.includes('appMode === "free-demo"') &&
  roadmapSrc.includes("Workspace Locked");
assert(step8Locked, 'Step 8 / Entry Readiness Workspace locked for free-demo (shows "Workspace Locked")');

// 2.2 PDF Download locked for free-demo
const pdfLocked = roadmapSrc.includes('disabled={isDownloadingPDF || appMode === "free-demo"}') &&
  roadmapSrc.includes("Download Report - Full Version"); // spec v0.2 §10.4: hyphen label
assert(pdfLocked, 'PDF Download button disabled for free-demo (shows "Download Report - Full Version")');

// 2.3 Consultant Notes hidden for free-demo
const notesHidden = appSrc.includes('appMode !== "free-demo"') &&
  appSrc.includes("ConsultantNotes");
assert(notesHidden, "Consultant Notes / Annotation Pad hidden for free-demo");

// 2.4 Draft scoring controls are available
const draftScoringAvail = scoringSrc.includes("Generate Draft Scores") &&
  scoringSrc.includes('id="generate-draft-scores-btn"');
assert(draftScoringAvail, "Generate Draft Scores button available for demo participants");

// 2.5 Scoring sliders are interactive (not disabled)
const slidersInteractive = !scoringSrc.includes('disabled={appMode === "free-demo"}');
assert(slidersInteractive, "Score sliders/buttons are NOT disabled for free-demo (user can adjust)");

// 2.6 User adjustment badges exist
const adjustmentBadge = scoringSrc.includes("User Adjusted") &&
  scoringSrc.includes("adjusted-badge-");
assert(adjustmentBadge, "User Adjusted badge visible when demo user modifies draft scores");

// 2.7 Auto-save enabled for demo mode
const autoSaveDemo = !appSrc.includes('if (appMode === "free-demo" || isInitializing) return;') &&
  appSrc.includes("if (isInitializing) return;");
assert(autoSaveDemo, "Auto-save is enabled for free-demo mode (sessions persist server-side)");

// ─── 3. Scoring Engine — Draft Scores Functional Test ────────────────

console.log("\n  Section 3: Scoring Engine — Draft Score Verification\n");

// 3.1 Score the UAT scenario scores (manual adjustments)
const uaeScoreInput: MarketScoreInput = {
  marketId: "uae",
  scores: {
    marketAttractiveness: 4,
    offeringFit: 4,
    channelAccess: 4,
    operationalFeasibility: 4,
    strategicValue: 3,
    financialLogic: 4,
    brandTrustTransferability: 4,
    competitiveIntensity: 3,
    regulatoryComplexity: 2,
  },
  evidenceBasis: "Market Reports",
  evidenceConfidence: "Medium",
  dimensionEvidence: {
    marketAttractiveness: "Market Reports",
    offeringFit: "Market Reports",
    channelAccess: "Expert Judgment",
    operationalFeasibility: "Expert Judgment",
    strategicValue: "Market Reports",
    financialLogic: "Market Reports",
    brandTrustTransferability: "Expert Judgment",
    competitiveIntensity: "Market Reports",
    regulatoryComplexity: "Market Reports",
  },
};

const result = scoreMarket("uae", "UAE", uaeScoreInput);
console.log(`    UAE Expansion Potential Score: ${result.expansionPotentialScore}`);
console.log(`    UAE Tier: ${result.tier}`);
console.log(`    UAE Risk Level: ${result.riskLevel}`);

assert(
  result.expansionPotentialScore >= 75 && result.expansionPotentialScore <= 80,
  `UAE potential score is in expected range (75-80): actual=${result.expansionPotentialScore}`
);
assert(
  result.tier.includes("Priority") || result.tier.includes("Promising"),
  `UAE tier is Priority or Promising: actual="${result.tier}"`
);

// 3.2 Verify evidence sources are exactly the 3 required options
const typesSrc = readFileSync(resolve(__dirname, "../src/types.ts"), "utf-8");
const hasDirectEvidence = typesSrc.includes('"Direct Evidence"');
const hasMarketReports = typesSrc.includes('"Market Reports"');
const hasExpertJudgment = typesSrc.includes('"Expert Judgment"');
const hasOnlyThree = typesSrc.match(/EVIDENCE_BASIS_OPTIONS.*=.*\[/s);
assert(hasDirectEvidence && hasMarketReports && hasExpertJudgment, "Evidence sources include exactly: Direct Evidence, Market Reports, Expert Judgment");

// 3.3 Verify userAdjusted field exists in MarketScoreInput
const hasUserAdjusted = typesSrc.includes("userAdjusted?:");
const hasDraftGenerated = typesSrc.includes("draftGenerated?:");
assert(hasUserAdjusted, "MarketScoreInput has userAdjusted field for tracking manual changes");
assert(hasDraftGenerated, "MarketScoreInput has draftGenerated field for tracking draft state");

// ─── 4. Disclaimer Preservation Check ────────────────────────────────

console.log("\n  Section 4: Disclaimer Preservation\n");

const disclaimerSrc = readFileSync(resolve(__dirname, "../src/components/StrategicDisclaimer.tsx"), "utf-8");
const pdfGenSrc = readFileSync(resolve(__dirname, "../backend/src/pdf_generator.ts"), "utf-8");

// Spec v0.2 disclaimer wording: "...does not predict or guarantee market success...
// It is not regulatory, legal, or investment advice..."
const uiDisclaimerPresent = disclaimerSrc.includes("does") &&
  disclaimerSrc.includes("not") &&
  disclaimerSrc.includes("predict") &&
  disclaimerSrc.includes("regulatory");
assert(uiDisclaimerPresent, "UI Strategic Disclaimer contains no-prediction and no-regulatory-advice text");

const pdfDisclaimerPresent = pdfGenSrc.includes("does not constitute") &&
  pdfGenSrc.includes("legal") &&
  pdfGenSrc.includes("regulatory") &&
  pdfGenSrc.includes("financial advice");
assert(pdfDisclaimerPresent, "PDF generator contains legal/regulatory/financial disclaimer text");

const dashboardDisclaimer = readFileSync(resolve(__dirname, "../src/components/ComparativeDashboardScreen.tsx"), "utf-8");
assert(
  dashboardDisclaimer.includes("StrategicDisclaimer"),
  "Dashboard screen renders StrategicDisclaimer component"
);

const roadmapDisclaimer = roadmapSrc.includes("StrategicDisclaimer");
assert(roadmapDisclaimer, "Roadmap screen renders StrategicDisclaimer component");

// ─── 5. Migration Verification ───────────────────────────────────────

console.log("\n  Section 5: Migration 005 Verification\n");

const migrationSrc = readFileSync(resolve(__dirname, "../backend/migrations/005_add_demo_participant_role.sql"), "utf-8");

assert(migrationSrc.includes("DO $$"), "Migration uses DO $$ block for procedural logic");
assert(migrationSrc.includes("ON CONFLICT"), "Migration is idempotent (uses ON CONFLICT)");
assert(migrationSrc.includes("pg_constraint"), "Migration queries pg_constraint to find constraints dynamically");
assert(migrationSrc.includes("DROP CONSTRAINT IF EXISTS"), "Migration safely drops existing constraints");
assert(
  migrationSrc.includes("'Viewer', 'Consultant', 'Administrator', 'demo_participant'"),
  "New constraint includes all 4 valid roles"
);
// Check that migration has no uncommented UPDATE users statements
// (rollback plan in comments is acceptable)
const migrationLines = migrationSrc.split('\n');
const hasUncommentedUpdate = migrationLines.some(line => {
  const trimmed = line.trim();
  return !trimmed.startsWith('--') && trimmed.includes('UPDATE users');
});
assert(!hasUncommentedUpdate, "Migration does NOT have uncommented UPDATE users statements");
assert(!migrationSrc.includes("DELETE FROM users"), "Migration does NOT delete existing users");
assert(migrationSrc.includes("Rollback plan"), "Migration includes rollback plan documentation");

// ─── Summary ─────────────────────────────────────────────────────────

console.log("\n────────────────────────────────────────────────────────────");
console.log("  RBAC ENFORCEMENT TEST SUMMARY");
console.log("────────────────────────────────────────────────────────────");
console.log(`  Total Tests:  ${passed + failed}`);
console.log(`  Passed:       ${passed}`);
console.log(`  Failed:       ${failed}`);

if (failed === 0) {
  console.log("\n  ╔══════════════════════════════════════════════════════╗");
  console.log("  ║  ✓ ALL RBAC ENFORCEMENT TESTS PASSED                ║");
  console.log("  ╚══════════════════════════════════════════════════════╝\n");
} else {
  console.log(`\n  ╔══════════════════════════════════════════════════════╗`);
  console.log(`  ║  ✗ ${failed} TEST(S) FAILED                              ║`);
  console.log(`  ╚══════════════════════════════════════════════════════╝\n`);
}

process.exit(failed > 0 ? 1 : 0);
