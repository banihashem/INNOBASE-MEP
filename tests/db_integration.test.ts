/**
 * MEP-light™ — Database Integration Test Suite
 *
 * Tests the db_client against SQLite (local dev mode) to verify:
 *   DB-INT-001: Database initializes without error
 *   DB-INT-002: Health check reports correct dbType
 *   DB-INT-003: User upsert creates new user
 *   DB-INT-004: User upsert updates existing user on conflict
 *   DB-INT-005: findUserByEmail returns correct user
 *   DB-INT-006: findUserByEmail returns null for unknown
 *   DB-INT-007: findUserById returns correct user
 *   DB-INT-008: updateUserRole changes role
 *   DB-INT-009: listUsers returns all users
 *   DB-INT-010: Session CRUD — create
 *   DB-INT-011: Session CRUD — find by ID
 *   DB-INT-012: Session CRUD — list by user
 *   DB-INT-013: Session CRUD — update
 *   DB-INT-014: Session CRUD — delete
 *   DB-INT-015: Audit event recording
 *   DB-INT-016: Agent run recording and completion
 */

import { db } from "../backend/src/db_client.js";
import fs from "fs";
import path from "path";

const RUN_ID = Date.now().toString(36);

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n" + "─".repeat(60));
  console.log("  MEP-light™ — Database Integration Tests (SQLite)");
  console.log("─".repeat(60) + "\n");

  // DB-INT-001: Initialize
  try {
    await db.initialize();
    assert(true, "DB-INT-001: Database initializes without error");
  } catch (err) {
    assert(false, `DB-INT-001: Database initialization failed: ${err}`);
    process.exit(1);
  }

  // DB-INT-002: Health check
  const health = await db.healthCheck();
  assert(health.ok === true, "DB-INT-002: Health check reports ok=true");
  assert(health.dbType === "sqlite", "DB-INT-002: Health check reports dbType=sqlite (dev mode)");

  // DB-INT-003: Create user
  const testEmail = `test-db-int-${RUN_ID}@example.com`;
  const user1 = await db.upsertUser({
    id: `test_user_${RUN_ID}`,
    email: testEmail,
    name: "DB Integration Test User",
    pictureUrl: "https://example.com/avatar.png",
    role: "Consultant",
    provider: "google",
    providerSubject: "sub_123",
  });
  assert(user1.email === testEmail, "DB-INT-003: User created with correct email");
  assert(user1.role === "Consultant", "DB-INT-003: User created with correct role");

  // DB-INT-004: Upsert same email updates
  const user1Updated = await db.upsertUser({
    id: `test_user_${RUN_ID}_updated`,
    email: testEmail,
    name: "Updated Name",
    pictureUrl: "https://example.com/new-avatar.png",
    role: "Consultant",
  });
  assert(user1Updated.name === "Updated Name", "DB-INT-004: Upsert updates name on conflict");

  // DB-INT-005: findUserByEmail
  const found = await db.findUserByEmail(testEmail);
  assert(found !== null, "DB-INT-005: findUserByEmail returns user");
  assert(found!.email === testEmail, "DB-INT-005: Returned email matches");

  // DB-INT-006: findUserByEmail returns null for unknown
  const notFound = await db.findUserByEmail("nonexistent@example.com");
  assert(notFound === null, "DB-INT-006: findUserByEmail returns null for unknown");

  // DB-INT-007: findUserById
  const byId = await db.findUserById(user1.id);
  assert(byId !== null, "DB-INT-007: findUserById returns user");
  assert(byId!.id === user1.id, "DB-INT-007: ID matches");

  // DB-INT-008: updateUserRole
  const roleUpdated = await db.updateUserRole(testEmail, "Administrator");
  assert(roleUpdated !== null, "DB-INT-008: updateUserRole returns user");
  assert(roleUpdated!.role === "Administrator", "DB-INT-008: Role changed to Administrator");

  // DB-INT-009: listUsers
  const allUsers = await db.listUsers();
  assert(allUsers.length >= 1, "DB-INT-009: listUsers returns at least 1 user");

  // DB-INT-010: Session create
  const sessionId = `sess_test_${RUN_ID}`;
  const session = await db.createSession({
    id: sessionId,
    userId: user1.id,
    title: "Test Assessment",
    companyName: "Test Corp",
    offeringName: "Test Product",
    inputData: { test: true },
  });
  assert(session.id === sessionId, "DB-INT-010: Session created with correct ID");
  assert(session.title === "Test Assessment", "DB-INT-010: Session has correct title");

  // DB-INT-011: Find session by ID
  const foundSession = await db.findSessionById(sessionId);
  assert(foundSession !== null, "DB-INT-011: Session found by ID");
  assert(foundSession!.company_name === "Test Corp", "DB-INT-011: Company name matches");

  // DB-INT-012: List sessions by user
  const userSessions = await db.listSessionsByUser(user1.id);
  assert(userSessions.length >= 1, "DB-INT-012: listSessionsByUser returns at least 1 session");

  // DB-INT-013: Update session
  const updatedSession = await db.updateSession(sessionId, {
    title: "Updated Assessment",
    status: "completed",
    outputData: { results: [1, 2, 3] },
  });
  assert(updatedSession !== null, "DB-INT-013: Session updated");
  assert(updatedSession!.title === "Updated Assessment", "DB-INT-013: Title updated");
  assert(updatedSession!.status === "completed", "DB-INT-013: Status updated to completed");

  // DB-INT-014: Delete session
  const deleted = await db.deleteSession(sessionId);
  assert(deleted === true, "DB-INT-014: Session deleted successfully");
  const deletedCheck = await db.findSessionById(sessionId);
  assert(deletedCheck === null, "DB-INT-014: Deleted session returns null on find");

  // DB-INT-015: Audit event
  try {
    await db.recordAuditEvent({
      action: "test_action",
      eventType: "db_integration_test",
      userId: user1.id,
      component: "test",
      safeMetadata: { test: true },
    });
    assert(true, "DB-INT-015: Audit event recorded without error");
  } catch (err) {
    assert(false, `DB-INT-015: Audit event recording failed: ${err}`);
  }

  // DB-INT-016: Agent run
  try {
    const runId = `run_test_${RUN_ID}`;
    await db.recordAgentRun({
      id: runId,
      sessionId: null,
      agentName: "test_agent",
      agentRole: "test",
      inputSummary: "Test input",
    });
    assert(true, "DB-INT-016: Agent run recorded");

    await db.completeAgentRun(runId, {
      status: "completed",
      outputSummary: "Test output",
      tokenUsage: { input: 100, output: 50 },
      costEstimate: 0.001,
    });
    assert(true, "DB-INT-016: Agent run completed");
  } catch (err) {
    assert(false, `DB-INT-016: Agent run operations failed: ${err}`);
  }

  // ─── Cleanup ─────────────────────────────────────────────────────
  await db.close();

  // ─── Summary ─────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log("  DATABASE INTEGRATION TEST SUMMARY");
  console.log("─".repeat(60));
  console.log(`\n  Total: ${passed + failed}  Passed: ${passed}  Failed: ${failed}\n`);

  if (failed === 0) {
    console.log("  ╔══════════════════════════════════════════════════╗");
    console.log("  ║  ✓ ALL DATABASE INTEGRATION TESTS PASSED         ║");
    console.log("  ╚══════════════════════════════════════════════════╝\n");
  } else {
    console.log("  ╔══════════════════════════════════════════════════╗");
    console.log(`  ║  ✗ ${failed} DB TEST(S) FAILED                        ║`);
    console.log("  ╚══════════════════════════════════════════════════╝\n");
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
