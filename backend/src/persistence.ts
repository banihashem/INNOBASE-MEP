/**
 * MEP-light™ — SQLite Persistence Layer
 *
 * Provides server-side persistence for users, sessions, and audit events.
 * Uses better-sqlite3 for synchronous, single-file database operations.
 *
 * Data model:
 *   - users: authenticated user records with roles
 *   - sessions: complete analysis sessions (inputs + outputs)
 *   - audit_events: timestamped audit trail
 *
 * Storage: /tmp/mep-data/mep.db (Cloud Run) or ./data/mep.db (local)
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ─── Database Path Resolution ────────────────────────────

function getDbPath(): string {
  // Cloud Run: use /tmp (ephemeral but writable)
  // Local dev: use ./data directory
  const dataDir = process.env.MEP_DATA_DIR || (
    process.env.K_SERVICE ? "/tmp/mep-data" : path.join(process.cwd(), "data")
  );

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return path.join(dataDir, "mep.db");
}

// ─── Database Initialization ─────────────────────────────

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = getDbPath();
    db = new Database(dbPath);

    // Enable WAL mode for better concurrent read performance
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // Run migrations
    initSchema(db);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      log_level: "INFO",
      component: "persistence",
      event_type: "db_initialized",
      message: `SQLite database initialized at ${dbPath}`,
    }));
  }
  return db;
}

// ─── Schema Initialization ───────────────────────────────

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      picture TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'viewer',
      google_sub TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled Session',
      company_name TEXT DEFAULT '',
      offering_name TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      input_data TEXT DEFAULT '{}',
      output_data TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

    CREATE TABLE IF NOT EXISTS audit_events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      action TEXT NOT NULL,
      user_email TEXT DEFAULT '',
      user_role TEXT DEFAULT '',
      resource_type TEXT DEFAULT '',
      resource_id TEXT DEFAULT '',
      details TEXT DEFAULT '{}',
      ip_address TEXT DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_events(action);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_events(user_email);
  `);
}

// ─── User Operations ─────────────────────────────────────

export interface DbUser {
  user_id: string;
  email: string;
  name: string;
  picture: string;
  role: string;
  google_sub: string;
  created_at: string;
  updated_at: string;
  last_login: string;
}

export function upsertUser(user: {
  userId: string;
  email: string;
  name: string;
  picture?: string;
  role?: string;
  googleSub?: string;
}): DbUser {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO users (user_id, email, name, picture, role, google_sub, last_login)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      picture = excluded.picture,
      last_login = datetime('now'),
      updated_at = datetime('now')
  `);

  stmt.run(
    user.userId,
    user.email,
    user.name,
    user.picture || "",
    user.role || "viewer",
    user.googleSub || ""
  );

  return findUserByEmail(user.email)!;
}

export function findUserByEmail(email: string): DbUser | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as DbUser | undefined;
}

export function findUserById(userId: string): DbUser | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId) as DbUser | undefined;
}

export function updateUserRole(email: string, role: string): DbUser | undefined {
  const db = getDb();
  db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE email = ?").run(role, email);
  return findUserByEmail(email);
}

export function listUsers(): DbUser[] {
  const db = getDb();
  return db.prepare("SELECT * FROM users ORDER BY created_at DESC").all() as DbUser[];
}

// ─── Session Operations ──────────────────────────────────

export interface DbSession {
  session_id: string;
  user_id: string;
  title: string;
  company_name: string;
  offering_name: string;
  status: string;
  input_data: string;  // JSON string
  output_data: string; // JSON string
  created_at: string;
  updated_at: string;
}

export function createSession(session: {
  sessionId: string;
  userId: string;
  title?: string;
  companyName?: string;
  offeringName?: string;
  inputData?: Record<string, unknown>;
}): DbSession {
  const db = getDb();
  db.prepare(`
    INSERT INTO sessions (session_id, user_id, title, company_name, offering_name, input_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    session.sessionId,
    session.userId,
    session.title || "Untitled Session",
    session.companyName || "",
    session.offeringName || "",
    JSON.stringify(session.inputData || {})
  );

  return findSessionById(session.sessionId)!;
}

export function findSessionById(sessionId: string): DbSession | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM sessions WHERE session_id = ?").get(sessionId) as DbSession | undefined;
}

export function listSessionsByUser(userId: string): DbSession[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC"
  ).all(userId) as DbSession[];
}

export function updateSession(sessionId: string, updates: {
  title?: string;
  status?: string;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
}): DbSession | undefined {
  const db = getDb();
  const parts: string[] = [];
  const values: unknown[] = [];

  if (updates.title !== undefined) { parts.push("title = ?"); values.push(updates.title); }
  if (updates.status !== undefined) { parts.push("status = ?"); values.push(updates.status); }
  if (updates.inputData !== undefined) { parts.push("input_data = ?"); values.push(JSON.stringify(updates.inputData)); }
  if (updates.outputData !== undefined) { parts.push("output_data = ?"); values.push(JSON.stringify(updates.outputData)); }

  if (parts.length === 0) return findSessionById(sessionId);

  parts.push("updated_at = datetime('now')");
  values.push(sessionId);

  db.prepare(`UPDATE sessions SET ${parts.join(", ")} WHERE session_id = ?`).run(...values);
  return findSessionById(sessionId);
}

export function deleteSession(sessionId: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM sessions WHERE session_id = ?").run(sessionId);
  return result.changes > 0;
}

// ─── Audit Event Operations ──────────────────────────────

export interface DbAuditEvent {
  event_id: number;
  timestamp: string;
  action: string;
  user_email: string;
  user_role: string;
  resource_type: string;
  resource_id: string;
  details: string; // JSON string
  ip_address: string;
}

export function recordAuditEvent(event: {
  action: string;
  userEmail?: string;
  userRole?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_events (action, user_email, user_role, resource_type, resource_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.action,
    event.userEmail || "",
    event.userRole || "",
    event.resourceType || "",
    event.resourceId || "",
    JSON.stringify(event.details || {}),
    event.ipAddress || ""
  );
}

export function listAuditEvents(opts?: {
  limit?: number;
  action?: string;
  userEmail?: string;
}): DbAuditEvent[] {
  const db = getDb();
  const limit = opts?.limit || 100;
  let query = "SELECT * FROM audit_events";
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (opts?.action) { conditions.push("action = ?"); values.push(opts.action); }
  if (opts?.userEmail) { conditions.push("user_email = ?"); values.push(opts.userEmail); }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY timestamp DESC LIMIT ?";
  values.push(limit);

  return db.prepare(query).all(...values) as DbAuditEvent[];
}

// ─── Health Check ────────────────────────────────────────

export function dbHealthCheck(): { ok: boolean; path: string; userCount: number; sessionCount: number } {
  try {
    const db = getDb();
    const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
    const sessionCount = (db.prepare("SELECT COUNT(*) as count FROM sessions").get() as { count: number }).count;
    return { ok: true, path: getDbPath(), userCount, sessionCount };
  } catch {
    return { ok: false, path: getDbPath(), userCount: 0, sessionCount: 0 };
  }
}

// ─── Cleanup (for tests) ────────────────────────────────

export function closeDb(): void {
  if (db) {
    db.close();
    db = undefined as any;
  }
}
