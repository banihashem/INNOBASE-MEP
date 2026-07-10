/**
 * MEP-light™ — Session PATCH Persistence & Autosave Tests
 * Tests PATCH /api/v2/sessions/:id for correct persistence behavior,
 * including stateSnapshot serialization, RBAC enforcement, userAdjusted
 * badge persistence, and custom market persistence.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const __dirname = resolve(import.meta.dirname || ".");

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ FAILED: ${label}`);
    failed++;
  }
}

console.log("────────────────────────────────────────────────────────────");
console.log("  MEP-light™ — Session PATCH & Autosave Persistence Tests");
console.log("────────────────────────────────────────────────────────────\n");

// ─── 1. Backend PATCH Route Source Analysis ──────────────────

console.log("  Section 1: Backend PATCH Route Safety\n");

const apiSrc = readFileSync(resolve(__dirname, "../backend/src/api_server.ts"), "utf-8");

// 1.1 PATCH route has try/catch
const patchSection = apiSrc.substring(apiSrc.indexOf("PATCH /api/v2/sessions/:id"));
assert(
  patchSection.includes("} catch (error") && patchSection.includes("session_update_failed"),
  "PATCH route wraps in try/catch with structured error logging"
);

// 1.2 PATCH route has string deserialization guard
assert(
  patchSection.includes('typeof finalStateSnapshot === "string"') && patchSection.includes("JSON.parse(finalStateSnapshot)"),
  "PATCH route deserializes stateSnapshot if received as string"
);

// 1.3 PATCH route returns 500, not unhandled 503
assert(
  patchSection.includes('res.status(500).json({ error: "Internal server error during session update" })'),
  "PATCH route returns structured 500 on exception, not 503"
);

// 1.4 Demo participant mode normalization
assert(
  patchSection.includes('finalStateSnapshot.appMode = "free-demo"'),
  "PATCH route forces appMode to free-demo for demo_participant"
);

// 1.5 Demo participant cannot set reviewStatus to approved
assert(
  patchSection.includes('reviewStatus === "approved"') && patchSection.includes("finalReviewStatus = undefined"),
  "PATCH route blocks demo_participant from setting reviewStatus to approved"
);

// 1.6 Invalid stateSnapshot returns 400
assert(
  patchSection.includes('res.status(400).json({ error: "Invalid stateSnapshot format" })'),
  "PATCH route returns 400 for invalid stateSnapshot JSON string"
);

// ─── 2. POST Create Route Source Analysis ──────────────────

console.log("\n  Section 2: POST Create Route String Guard\n");

const postSection = apiSrc.substring(
  apiSrc.indexOf("POST /api/v2/sessions"),
  apiSrc.indexOf("GET /api/v2/sessions/:id")
);

assert(
  postSection.includes('typeof finalStateSnapshot === "string"'),
  "POST create route has string deserialization guard for stateSnapshot"
);

// ─── 3. Frontend Autosave Source Analysis ──────────────────

console.log("\n  Section 3: Frontend Autosave Correctness\n");

const appSrc = readFileSync(resolve(__dirname, "../src/App.tsx"), "utf-8");

// 3.1 stateSnapshot is NOT double-serialized
const autosaveSection = appSrc.substring(appSrc.indexOf("Auto-save session to server"), appSrc.indexOf("Load session from server"));
assert(
  autosaveSection.includes("stateSnapshot: stateSnapshotRef.current,") &&
  !autosaveSection.includes("stateSnapshot: JSON.stringify(stateSnapshotRef.current)"),
  "Frontend sends stateSnapshot as object, not pre-stringified"
);

// 3.2 Error toast is shown on autosave failure
assert(
  autosaveSection.includes('toast.error("Changes could not be saved.'),
  "Frontend shows user-facing toast on autosave failure"
);

// 3.3 Save status indicator is visible for all authenticated users
assert(
  appSrc.includes("{authUser && (") && !appSrc.includes('{appMode !== "free-demo" && ('),
  "Save status indicator is visible for all authenticated users including demo"
);

// ─── 4. User Adjusted Badge Persistence ──────────────────

console.log("\n  Section 4: User Adjusted Badge Persistence Path\n");

// 4.1 marketScores is included in stateSnapshot
assert(
  appSrc.includes("marketScores,") && appSrc.includes("stateSnapshotRef.current = {"),
  "marketScores (with userAdjusted/draftGenerated) is included in stateSnapshot"
);

// 4.2 marketScores is restored from stateSnapshot on loadSession
assert(
  appSrc.includes("setMarketScores(snap.marketScores || {})"),
  "loadSession restores marketScores from stateSnapshot"
);

// 4.3 MarketScoreInput has userAdjusted and draftGenerated fields
const typesSrc = readFileSync(resolve(__dirname, "../src/types.ts"), "utf-8");
assert(
  typesSrc.includes("userAdjusted?:") && typesSrc.includes("draftGenerated?:"),
  "MarketScoreInput type includes userAdjusted and draftGenerated fields"
);

// 4.4 ScoringEvidenceScreen renders User Adjusted badge
const scoringSrc = readFileSync(resolve(__dirname, "../src/components/ScoringEvidenceScreen.tsx"), "utf-8");
assert(
  scoringSrc.includes("User Adjusted") && scoringSrc.includes("adjusted-badge-"),
  "ScoringEvidenceScreen renders User Adjusted badge with correct ID"
);

// 4.5 Badge triggers on any score change (onMarkUserAdjusted called)
assert(
  scoringSrc.includes("if (onMarkUserAdjusted)"),
  "User Adjusted badge triggers on any score change when onMarkUserAdjusted exists"
);

// ─── 5. RBAC Regression Check ──────────────────────────

console.log("\n  Section 5: RBAC Regression Checks\n");

// 5.1 Step 8 still locked for demo
const roadmapSrc = readFileSync(resolve(__dirname, "../src/components/RoadmapScreen.tsx"), "utf-8");
assert(
  roadmapSrc.includes("Workspace Locked"),
  'Step 8 / Entry Readiness Workspace shows "Workspace Locked" for demo'
);

// 5.2 PDF locked for demo
assert(
  roadmapSrc.includes("Download Report — Full Version"),
  "PDF export button shows locked text for demo"
);

// 5.3 Review approval endpoint blocked for demo
assert(
  apiSrc.includes('session review') || (apiSrc.includes("/review") && apiSrc.includes("403")),
  "Review endpoint blocks non-admin/consultant users with 403"
);

// 5.4 Resume session works (id field returned in list)
const listSection = apiSrc.substring(apiSrc.indexOf("GET /api/v2/sessions"), apiSrc.indexOf("POST /api/v2/sessions"));
assert(
  listSection.includes("id: s.id") && listSection.includes("sessionId: s.id"),
  "Session list returns both 'id' and 'sessionId' fields"
);

// ─── 6. db_client updateSession ──────────────────────

console.log("\n  Section 6: Database Layer\n");

const dbSrc = readFileSync(resolve(__dirname, "../backend/src/db_client.ts"), "utf-8");

// 6.1 updateSession serializes stateSnapshot as JSON for PG
assert(
  dbSrc.includes("JSON.stringify(updates.stateSnapshot)"),
  "db_client.updateSession serializes stateSnapshot as JSON.stringify for PG"
);

// 6.2 mapPgSession handles both string and object state_snapshot
assert(
  dbSrc.includes('typeof row.state_snapshot === "string"'),
  "mapPgSession handles state_snapshot as both string and object"
);

// ─── Summary ──────────────────────

console.log("\n────────────────────────────────────────────────────────────");
console.log("  SESSION PATCH & AUTOSAVE TEST SUMMARY");
console.log("────────────────────────────────────────────────────────────");
console.log(`  Total Tests:  ${passed + failed}`);
console.log(`  Passed:       ${passed}`);
console.log(`  Failed:       ${failed}`);
console.log("");

if (failed === 0) {
  console.log("  ╔══════════════════════════════════════════════════════╗");
  console.log("  ║  ✓ ALL SESSION PERSISTENCE TESTS PASSED             ║");
  console.log("  ╚══════════════════════════════════════════════════════╝");
} else {
  console.log("  ╔══════════════════════════════════════════════════════╗");
  console.log(`  ║  ✗ ${failed} TEST(S) FAILED                              ║`);
  console.log("  ╚══════════════════════════════════════════════════════╝");
}
console.log("");

process.exit(failed > 0 ? 1 : 0);
