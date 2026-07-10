/**
 * Quick verification: Admin list users and check roles + migration idempotency
 */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../data/mep_local.db");
const db = new Database(dbPath, { readonly: true });

console.log("────────────────────────────────────────────────────────────");
console.log("  MEP-light™ — Migration & Role Verification");
console.log("────────────────────────────────────────────────────────────\n");

// 1. User roles
const users = db.prepare("SELECT email, role, status FROM users ORDER BY created_at").all() as any[];
console.log("  Users in DB:");
for (const u of users) {
  console.log(`    ${u.email.padEnd(35)} ${u.role.padEnd(20)} ${u.status}`);
}

// 2. Verify Ehsan is Administrator
const ehsan = users.find(u => u.email === "ehsan.banihashem@gmail.com");
console.log(`\n  Ehsan's role: ${ehsan?.role || "NOT FOUND"}`);
console.log(`  ✓ Ehsan is Administrator: ${ehsan?.role === "Administrator"}`);

// 3. Verify demo_participant role is accepted
const demo = users.find(u => u.role === "demo_participant");
console.log(`  ✓ demo_participant role accepted by DB: ${!!demo}`);

// 4. Verify Consultant exists
const consultant = users.find(u => u.role === "Consultant");
console.log(`  ✓ Consultant role preserved: ${!!consultant}`);

// 5. Test idempotency: re-insert the same users
console.log("\n  Idempotency test: re-inserting same users...");
const dbRW = new Database(dbPath);
const upsert = dbRW.prepare(`
  INSERT INTO users (id, email, name, role, provider, provider_subject, status)
  VALUES (?, ?, ?, ?, ?, ?, 'active')
  ON CONFLICT(email) DO UPDATE SET
    name = excluded.name,
    role = excluded.role,
    updated_at = datetime('now')
`);

const countBefore = (dbRW.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
upsert.run("user_admin_001", "ehsan.banihashem@gmail.com", "Ehsan Banihashem", "Administrator", "google", "admin-sub-001");
upsert.run("user_demo_001", "demo-test@kashkam.test", "Demo Test User", "demo_participant", "google", "demo-sub-001");
const countAfter = (dbRW.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
console.log(`  Users before: ${countBefore}, after: ${countAfter}`);
console.log(`  ✓ Idempotent (no duplicates): ${countBefore === countAfter}`);

// 6. Sessions exist
const sessions = db.prepare("SELECT COUNT(*) as c FROM assessment_sessions").get() as any;
console.log(`\n  Sessions in DB: ${sessions.c}`);

// 7. List sessions by user
const sessionsByUser = db.prepare(`
  SELECT u.email, COUNT(s.id) as session_count 
  FROM users u LEFT JOIN assessment_sessions s ON u.id = s.user_id 
  GROUP BY u.email
`).all() as any[];
console.log("  Sessions by user:");
for (const s of sessionsByUser) {
  console.log(`    ${s.email.padEnd(35)} ${s.session_count} session(s)`);
}

dbRW.close();
db.close();
console.log("\n  ✓ Migration & role verification complete.\n");
