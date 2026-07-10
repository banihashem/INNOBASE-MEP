/**
 * MEP-light™ — Test User Seed Script
 * 
 * Seeds the local SQLite database with test users for RBAC verification.
 * This is a LOCAL DEVELOPMENT ONLY tool — never run in production.
 * 
 * Run with: npx tsx tests/seed_test_users.ts
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../data/mep_local.db");

console.log("────────────────────────────────────────────────────────────");
console.log("  MEP-light™ — Test User Seed (LOCAL DEV ONLY)");
console.log("────────────────────────────────────────────────────────────\n");
console.log(`  DB Path: ${dbPath}\n`);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const users = [
  {
    id: "user_admin_001",
    email: "ehsan.banihashem@gmail.com",
    name: "Ehsan Banihashem",
    role: "Administrator",
    provider: "google",
    provider_subject: "admin-sub-001",
  },
  {
    id: "user_demo_001",
    email: "demo-test@kashkam.test",
    name: "Demo Test User",
    role: "demo_participant",
    provider: "google",
    provider_subject: "demo-sub-001",
  },
  {
    id: "user_consultant_001",
    email: "consultant@kashkam.test",
    name: "Test Consultant",
    role: "Consultant",
    provider: "google",
    provider_subject: "consultant-sub-001",
  },
  {
    id: "user_other_001",
    email: "other-user@test.example",
    name: "Other User",
    role: "demo_participant",
    provider: "google",
    provider_subject: "other-sub-001",
  },
];

const upsert = db.prepare(`
  INSERT INTO users (id, email, name, role, provider, provider_subject, status)
  VALUES (?, ?, ?, ?, ?, ?, 'active')
  ON CONFLICT(email) DO UPDATE SET
    name = excluded.name,
    role = excluded.role,
    updated_at = datetime('now')
`);

for (const u of users) {
  upsert.run(u.id, u.email, u.name, u.role, u.provider, u.provider_subject);
  console.log(`  ✓ Seeded: ${u.email} as ${u.role}`);
}

// Verify
const allUsers = db.prepare("SELECT id, email, role, status FROM users ORDER BY created_at").all() as any[];
console.log(`\n  Total users in DB: ${allUsers.length}\n`);
for (const u of allUsers) {
  console.log(`    ${u.email} — ${u.role} (${u.status})`);
}

console.log("\n  ✓ Seed complete. Restart the API server to pick up changes.\n");
db.close();
