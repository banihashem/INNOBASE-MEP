/**
 * MEP-light™ — PostgreSQL Migration 005 Verification
 * 
 * Spins up a disposable PostgreSQL container, runs all migrations via psql -f,
 * and verifies role acceptance, preservation, idempotency, and safety.
 * 
 * Run with: npx tsx tests/pg_migration_verify.ts
 * Requires: Docker running
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync, readdirSync, writeFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../backend/migrations");

const CONTAINER = "mep-pg-migration-test";
const PG_PORT = "25432";
const PG_PASS = "testpass123";
const PG_DB = "mep_test";
const PG_USER = "mep_test_user";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ FAILED: ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
    failures.push(`  ✗ FAILED: ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function exec(cmd: string, ignoreError = false): string {
  try {
    return execSync(cmd, { encoding: "utf-8", timeout: 30000, stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (e: any) {
    if (ignoreError) return (e.stdout || "").trim();
    throw e;
  }
}

function psql(sql: string): string {
  // Use heredoc-style via stdin to avoid shell quoting issues
  const escaped = sql.replace(/'/g, "'\\''");
  return exec(`docker exec -i ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -t -A -c '${escaped}'`);
}

function psqlFile(containerPath: string): string {
  return exec(`docker exec ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -f ${containerPath}`);
}

function copyAndRunMigration(filename: string): string {
  const localPath = path.join(migrationsDir, filename).replace(/\\/g, "/");
  exec(`docker cp "${localPath}" ${CONTAINER}:/tmp/${filename}`);
  return psqlFile(`/tmp/${filename}`);
}

async function run() {
  console.log("────────────────────────────────────────────────────────────");
  console.log("  MEP-light™ — PostgreSQL Migration 005 Verification");
  console.log("────────────────────────────────────────────────────────────\n");

  // Cleanup any previous container
  exec(`docker rm -f ${CONTAINER}`, true);

  // Start PostgreSQL container
  console.log("  Starting PostgreSQL 15 container...\n");
  exec(
    `docker run -d --name ${CONTAINER} -e POSTGRES_USER=${PG_USER} -e POSTGRES_PASSWORD=${PG_PASS} -e POSTGRES_DB=${PG_DB} -p ${PG_PORT}:5432 postgres:15-alpine`
  );

  // Wait for PostgreSQL to be ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      exec(`docker exec ${CONTAINER} pg_isready -U ${PG_USER}`);
      ready = true;
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!ready) {
    console.error("  ✗ PostgreSQL failed to start. Aborting.");
    exec(`docker rm -f ${CONTAINER}`, true);
    process.exit(2);
  }
  console.log("  PostgreSQL ready.\n");

  // ── Phase 1: Run all migrations via psql -f (proper SQL execution) ──
  console.log("  Phase 1: Fresh DB — Run All Migrations\n");

  const migrationFiles = readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql") && !f.startsWith("verify"))
    .sort();

  for (const file of migrationFiles) {
    console.log(`  Running: ${file}...`);
    try {
      const output = copyAndRunMigration(file);
      assert(true, `Migration ${file} executed`);
    } catch (e: any) {
      console.log(`    Error: ${(e.stderr || e.message).substring(0, 200)}`);
      assert(false, `Migration ${file} executed`, (e.stderr || e.message).substring(0, 100));
    }
  }

  // ── Phase 2: Schema verification ──
  console.log("\n  Phase 2: Schema Verification\n");

  const tables = exec(`docker exec ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"`);
  console.log(`  Tables: ${tables.replace(/\n/g, ", ")}\n`);
  assert(tables.includes("users"), "users table exists");
  assert(tables.includes("assessment_sessions"), "assessment_sessions table exists");

  const roleCol = exec(`docker exec ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -t -A -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role'"`);
  assert(roleCol.includes("role"), "users.role column exists");

  // ── Phase 3: Seed existing users (simulating v4.3.6 production) ──
  console.log("\n  Phase 3: Seed Existing Users (Simulating v4.3.6)\n");

  exec(`docker exec ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -c "INSERT INTO users (id, email, name, role, provider, provider_subject, status) VALUES ('admin-001', 'ehsan@test.com', 'Ehsan Test', 'Administrator', 'google', 'sub-001', 'active') ON CONFLICT (email) DO NOTHING"`);
  exec(`docker exec ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -c "INSERT INTO users (id, email, name, role, provider, provider_subject, status) VALUES ('consultant-001', 'consultant@test.com', 'Test Consultant', 'Consultant', 'google', 'sub-002', 'active') ON CONFLICT (email) DO NOTHING"`);
  assert(true, "Seeded Administrator and Consultant users");

  // ── Phase 4: demo_participant role accepted ──
  console.log("\n  Phase 4: demo_participant Role Acceptance\n");

  // Check constraints
  const constraints = exec(`docker exec ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -t -A -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype = 'c'"`, true);
  console.log(`  CHECK constraints: ${constraints || "(none)"}`);

  try {
    exec(`docker exec ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -c "INSERT INTO users (id, email, name, role, provider, provider_subject, status) VALUES ('demo-001', 'demo@test.com', 'Demo User', 'demo_participant', 'google', 'sub-003', 'active') ON CONFLICT (email) DO NOTHING"`);
    assert(true, "demo_participant role accepted by PostgreSQL");
  } catch (e: any) {
    assert(false, "demo_participant role accepted by PostgreSQL", e.stderr || e.message);
  }

  // ── Phase 5: Verify existing roles preserved ──
  console.log("\n  Phase 5: Existing Roles Preserved\n");

  const adminRole = exec(`docker exec ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -t -A -c "SELECT role FROM users WHERE email = 'ehsan@test.com'"`);
  assert(adminRole === "Administrator", "Administrator role preserved", `got "${adminRole}"`);

  const consultantRole = exec(`docker exec ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -t -A -c "SELECT role FROM users WHERE email = 'consultant@test.com'"`);
  assert(consultantRole === "Consultant", "Consultant role preserved", `got "${consultantRole}"`);

  const demoRole = exec(`docker exec ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -t -A -c "SELECT role FROM users WHERE email = 'demo@test.com'"`);
  assert(demoRole === "demo_participant", "demo_participant role stored correctly", `got "${demoRole}"`);

  // ── Phase 6: Idempotent re-run of migration 005 ──
  console.log("\n  Phase 6: Idempotent Re-Run\n");

  const countBefore = exec(`docker exec ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -t -A -c "SELECT COUNT(*) FROM users"`);

  try {
    copyAndRunMigration("005_add_demo_participant_role.sql");
    assert(true, "Migration 005 re-run without error");
  } catch (e: any) {
    assert(false, "Migration 005 re-run without error", e.message);
  }

  const countAfter = exec(`docker exec ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -t -A -c "SELECT COUNT(*) FROM users"`);
  assert(countBefore === countAfter, `No user duplication after re-run (${countBefore} → ${countAfter})`);

  const adminAfter = exec(`docker exec ${CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -t -A -c "SELECT role FROM users WHERE email = 'ehsan@test.com'"`);
  assert(adminAfter === "Administrator", "Administrator still preserved after re-run", `got "${adminAfter}"`);

  // ── Phase 7: No destructive mutations ──
  console.log("\n  Phase 7: No Destructive Mutations\n");

  const sql005 = readFileSync(path.join(migrationsDir, "005_add_demo_participant_role.sql"), "utf-8");
  assert(!sql005.includes("DELETE FROM users"), "No DELETE FROM users");
  assert(!sql005.includes("TRUNCATE"), "No TRUNCATE");
  assert(!sql005.includes("DROP TABLE"), "No DROP TABLE");
  const uncommented = sql005.split("\n").filter(l => !l.trim().startsWith("--")).join("\n");
  assert(!uncommented.includes("UPDATE users SET role"), "No uncommented UPDATE users SET role");

  // ── Phase 8: Rollback plan ──
  console.log("\n  Phase 8: Rollback Plan & Dynamic Discovery\n");

  assert(sql005.toLowerCase().includes("rollback"), "Migration documents ROLLBACK plan");
  assert(sql005.includes("pg_constraint"), "Migration uses dynamic constraint discovery (pg_constraint)");
  assert(sql005.includes("ON CONFLICT") || sql005.includes("IF NOT EXISTS"), "Migration handles idempotency");

  // ── Cleanup ──
  console.log("\n  Cleaning up Docker container...\n");
  exec(`docker rm -f ${CONTAINER}`, true);

  // ── Summary ──
  console.log("────────────────────────────────────────────────────────────");
  console.log("  POSTGRESQL MIGRATION 005 VERIFICATION SUMMARY");
  console.log("────────────────────────────────────────────────────────────");
  console.log(`  Total Tests:  ${passed + failed}`);
  console.log(`  Passed:       ${passed}`);
  console.log(`  Failed:       ${failed}`);

  if (failed === 0) {
    console.log("\n  ╔══════════════════════════════════════════════════════╗");
    console.log("  ║  ✓ ALL POSTGRESQL MIGRATION TESTS PASSED            ║");
    console.log("  ╚══════════════════════════════════════════════════════╝\n");
  } else {
    console.log(`\n  ╔══════════════════════════════════════════════════════╗`);
    console.log(`  ║  ✗ ${failed} TEST(S) FAILED                              ║`);
    console.log(`  ╚══════════════════════════════════════════════════════╝\n`);
    failures.forEach(f => console.log(f));
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  exec(`docker rm -f ${CONTAINER}`, true);
  process.exit(2);
});
