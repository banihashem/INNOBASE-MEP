/**
 * MEP-light™ — Persistence Layer Integration Tests
 *
 * Tests SQLite persistence for users, sessions, and audit events.
 * Uses an isolated test database that is cleaned up after each run.
 *
 * Run with: node --import tsx tests/persistence.test.ts
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, unlinkSync, mkdirSync } from "fs";

// Set test data directory BEFORE importing persistence
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testDataDir = resolve(__dirname, "..", "data", "test");
process.env.MEP_DATA_DIR = testDataDir;

import {
  getDb,
  closeDb,
  upsertUser,
  findUserByEmail,
  findUserById,
  updateUserRole,
  listUsers,
  createSession,
  findSessionById,
  listSessionsByUser,
  updateSession,
  deleteSession,
  recordAuditEvent,
  listAuditEvents,
  dbHealthCheck,
} from "../backend/src/persistence.js";

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
) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    failedTests++;
    failures.push(`${testName}: expected=${JSON.stringify(expected)}, actual=${JSON.stringify(actual)}`);
    console.log(`  ✗ ${testName}`);
    console.log(`    Expected: ${JSON.stringify(expected)}`);
    console.log(`    Actual:   ${JSON.stringify(actual)}`);
  }
}

// ─── Setup ────────────────────────────────────────────────────────────

// Ensure test data directory exists
if (!existsSync(testDataDir)) {
  mkdirSync(testDataDir, { recursive: true });
}

// Clean up any previous test database
const testDbPath = resolve(testDataDir, "mep.db");
if (existsSync(testDbPath)) unlinkSync(testDbPath);
if (existsSync(testDbPath + "-wal")) unlinkSync(testDbPath + "-wal");
if (existsSync(testDbPath + "-shm")) unlinkSync(testDbPath + "-shm");

// Initialize database
getDb();

// ─── User Tests ──────────────────────────────────────────────────────

console.log("\n────────────────────────────────────────────────────────────");
console.log("  Persistence: User Operations");
console.log("────────────────────────────────────────────────────────────\n");

// Create user
const user1 = upsertUser({
  userId: "user_test_001",
  email: "alice@example.com",
  name: "Alice Test",
  picture: "https://example.com/alice.png",
  role: "Consultant",
  googleSub: "google-sub-001",
});

assert(user1.email === "alice@example.com", "Create user: email matches", "alice@example.com", user1.email);
assert(user1.name === "Alice Test", "Create user: name matches", "Alice Test", user1.name);
assert(user1.role === "Consultant", "Create user: role is Consultant", "Consultant", user1.role);

// Find by email
const found = findUserByEmail("alice@example.com");
assert(found !== undefined, "Find by email: found", true, found !== undefined);
assert(found?.email === "alice@example.com", "Find by email: email matches", "alice@example.com", found?.email);

// Find by email (case insensitive check - exact match required by SQLite)
const notFound = findUserByEmail("nonexistent@example.com");
assert(notFound === undefined, "Find by email: not found for unknown", undefined, notFound);

// Find by ID
const foundById = findUserById("user_test_001");
assert(foundById !== undefined, "Find by ID: found", true, foundById !== undefined);
assert(foundById?.email === "alice@example.com", "Find by ID: email matches", "alice@example.com", foundById?.email);

// Upsert (update existing)
const user1Updated = upsertUser({
  userId: "user_test_001_new",
  email: "alice@example.com",
  name: "Alice Updated",
  picture: "https://example.com/alice-v2.png",
});
assert(user1Updated.name === "Alice Updated", "Upsert: name updated", "Alice Updated", user1Updated.name);

// Create second user
upsertUser({
  userId: "user_test_002",
  email: "bob@example.com",
  name: "Bob Test",
  role: "Administrator",
});

// Update role
const roleUpdated = updateUserRole("alice@example.com", "Viewer");
assert(roleUpdated?.role === "Viewer", "Update role: changed to Viewer", "Viewer", roleUpdated?.role);

// List users
const allUsers = listUsers();
assert(allUsers.length >= 2, "List users: at least 2 users", true, allUsers.length >= 2);

// ─── Session Tests ───────────────────────────────────────────────────

console.log("\n────────────────────────────────────────────────────────────");
console.log("  Persistence: Session Operations");
console.log("────────────────────────────────────────────────────────────\n");

// Create session
const sess1 = createSession({
  sessionId: "sess_test_001",
  userId: "user_test_001",
  title: "UAE Market Analysis",
  companyName: "Alpha Food Tech",
  offeringName: "Kashkam",
  inputData: { market: "UAE", scores: { marketAttractiveness: 4 } },
});

assert(sess1.session_id === "sess_test_001", "Create session: ID matches", "sess_test_001", sess1.session_id);
assert(sess1.title === "UAE Market Analysis", "Create session: title matches", "UAE Market Analysis", sess1.title);
assert(sess1.company_name === "Alpha Food Tech", "Create session: company matches", "Alpha Food Tech", sess1.company_name);
assert(sess1.status === "draft", "Create session: default status is draft", "draft", sess1.status);

// Find session by ID
const foundSess = findSessionById("sess_test_001");
assert(foundSess !== undefined, "Find session: found", true, foundSess !== undefined);
assert(foundSess?.title === "UAE Market Analysis", "Find session: title matches", "UAE Market Analysis", foundSess?.title);

// Parse stored JSON
const inputData = JSON.parse(foundSess?.input_data || "{}");
assert(inputData.market === "UAE", "Find session: JSON input preserved", "UAE", inputData.market);

// Create second session for same user
createSession({
  sessionId: "sess_test_002",
  userId: "user_test_001",
  title: "Germany Analysis",
  companyName: "Alpha Food Tech",
});

// List by user
const userSessions = listSessionsByUser("user_test_001");
assert(userSessions.length === 2, "List sessions: 2 for user", 2, userSessions.length);

// Update session
const updated = updateSession("sess_test_001", {
  title: "UAE Market Analysis (Updated)",
  status: "completed",
  outputData: { score: 72, tier: "Tier B" },
});
assert(updated?.title === "UAE Market Analysis (Updated)", "Update session: title updated", "UAE Market Analysis (Updated)", updated?.title);
assert(updated?.status === "completed", "Update session: status updated", "completed", updated?.status);

const outputData = JSON.parse(updated?.output_data || "{}");
assert(outputData.score === 72, "Update session: output JSON preserved", 72, outputData.score);

// Delete session
const deleted = deleteSession("sess_test_002");
assert(deleted === true, "Delete session: returns true", true, deleted);

const afterDelete = findSessionById("sess_test_002");
assert(afterDelete === undefined, "Delete session: no longer found", undefined, afterDelete);

// List after delete
const afterDeleteList = listSessionsByUser("user_test_001");
assert(afterDeleteList.length === 1, "List after delete: 1 remaining", 1, afterDeleteList.length);

// Delete non-existent
const deletedNonExist = deleteSession("sess_nonexistent");
assert(deletedNonExist === false, "Delete non-existent: returns false", false, deletedNonExist);

// ─── Audit Event Tests ───────────────────────────────────────────────

console.log("\n────────────────────────────────────────────────────────────");
console.log("  Persistence: Audit Event Operations");
console.log("────────────────────────────────────────────────────────────\n");

// Record audit events
recordAuditEvent({
  action: "user_login",
  userEmail: "alice@example.com",
  userRole: "Consultant",
  details: { method: "google_oidc" },
});

recordAuditEvent({
  action: "session_created",
  userEmail: "alice@example.com",
  resourceType: "session",
  resourceId: "sess_test_001",
});

recordAuditEvent({
  action: "user_login",
  userEmail: "bob@example.com",
  userRole: "Administrator",
});

// List all
const allEvents = listAuditEvents();
assert(allEvents.length >= 3, "List audit events: at least 3", true, allEvents.length >= 3);

// Filter by action
const loginEvents = listAuditEvents({ action: "user_login" });
assert(loginEvents.length >= 2, "Filter by action: at least 2 logins", true, loginEvents.length >= 2);

// Filter by user
const aliceEvents = listAuditEvents({ userEmail: "alice@example.com" });
assert(aliceEvents.length >= 2, "Filter by user: at least 2 for alice", true, aliceEvents.length >= 2);

// Limit
const limited = listAuditEvents({ limit: 1 });
assert(limited.length === 1, "Limit: returns exactly 1", 1, limited.length);

// Verify event details
const latestEvent = allEvents[0];
assert(latestEvent.action !== "", "Event has action", true, latestEvent.action !== "");
assert(latestEvent.timestamp !== "", "Event has timestamp", true, latestEvent.timestamp !== "");

// ─── Health Check Tests ──────────────────────────────────────────────

console.log("\n────────────────────────────────────────────────────────────");
console.log("  Persistence: Health Check");
console.log("────────────────────────────────────────────────────────────\n");

const health = dbHealthCheck();
assert(health.ok === true, "Health check: ok is true", true, health.ok);
assert(health.userCount >= 2, "Health check: user count >= 2", true, health.userCount >= 2);
assert(health.sessionCount >= 1, "Health check: session count >= 1", true, health.sessionCount >= 1);

// ─── Cleanup ─────────────────────────────────────────────────────────

closeDb();

// Remove test database files
try {
  if (existsSync(testDbPath)) unlinkSync(testDbPath);
  if (existsSync(testDbPath + "-wal")) unlinkSync(testDbPath + "-wal");
  if (existsSync(testDbPath + "-shm")) unlinkSync(testDbPath + "-shm");
} catch {
  // Ignore cleanup errors
}

// ─── Summary ─────────────────────────────────────────────────────────

console.log("\n────────────────────────────────────────────────────────────");
console.log("  PERSISTENCE TEST SUMMARY");
console.log("────────────────────────────────────────────────────────────\n");
console.log(`  Total Tests:  ${totalTests}`);
console.log(`  Passed:       ${passedTests}`);
console.log(`  Failed:       ${failedTests}`);

if (failedTests === 0) {
  console.log(`\n  ╔══════════════════════════════════════════════════╗`);
  console.log(`  ║  ✓ ALL PERSISTENCE TESTS PASSED                 ║`);
  console.log(`  ╚══════════════════════════════════════════════════╝\n`);
} else {
  console.log(`\n  FAILURES:`);
  failures.forEach((f) => console.log(`    - ${f}`));
  process.exit(1);
}
