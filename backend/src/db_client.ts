/**
 * MEP-light™ — Unified Database Client
 * 
 * Provides production-grade database connectivity supporting:
 *   - PostgreSQL (Cloud SQL) for production
 *   - SQLite (better-sqlite3) for local development ONLY
 * 
 * Features:
 *   - Connection pooling with pg Pool
 *   - Health check reporting database type
 *   - Production startup guard against SQLite
 *   - Secret Manager integration path
 *   - Auto-migration on first connect
 * 
 * Environment Variables:
 *   DATABASE_URL           - PostgreSQL connection string
 *   CLOUD_SQL_CONNECTION   - Cloud SQL instance connection name (project:region:instance)
 *   DB_USER                - Database user (or from Secret Manager)
 *   DB_PASSWORD            - Database password (or from Secret Manager)
 *   DB_NAME                - Database name (default: mep_production)
 *   NODE_ENV               - Must not be 'production' if SQLite is used
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ─── Types ───────────────────────────────────────────────────────────

export interface DbConfig {
  type: "postgresql" | "sqlite";
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
  cloudSqlConnection?: string;
  sqlitePath?: string;
  poolSize?: number;
  maxOverflow?: number;
}

export interface DbUser {
  id: string;
  provider: string;
  provider_subject: string;
  email: string;
  name: string;
  picture_url: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface DbSession {
  id: string;
  user_id: string;
  title: string;
  company_name: string;
  offering_name: string;
  status: string;
  input_data: string;
  output_data: string;
  state_snapshot: string;
  current_step: number;
  completion_percent: number;
  review_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAuditEvent {
  id: string;
  user_id: string | null;
  session_id: string | null;
  event_type: string;
  component: string;
  action: string;
  safe_metadata: string;
  correlation_id: string;
  created_at: string;
}

// ─── Configuration Resolution ────────────────────────────────────────

function resolveConfig(): DbConfig {
  const databaseUrl = process.env.DATABASE_URL || "";
  const cloudSqlConn = process.env.CLOUD_SQL_CONNECTION || "";
  const nodeEnv = process.env.NODE_ENV || "development";

  // PostgreSQL via DATABASE_URL
  if (databaseUrl && databaseUrl.startsWith("postgres")) {
    return {
      type: "postgresql",
      connectionString: databaseUrl,
      cloudSqlConnection: cloudSqlConn,
      poolSize: parseInt(process.env.DB_POOL_SIZE || "10"),
      maxOverflow: parseInt(process.env.DB_MAX_OVERFLOW || "20"),
    };
  }

  // PostgreSQL via individual env vars
  if (process.env.DB_HOST || cloudSqlConn) {
    return {
      type: "postgresql",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "mep_production",
      user: process.env.DB_USER || "mep_app",
      password: process.env.DB_PASSWORD || "",
      cloudSqlConnection: cloudSqlConn,
      poolSize: parseInt(process.env.DB_POOL_SIZE || "10"),
      maxOverflow: parseInt(process.env.DB_MAX_OVERFLOW || "20"),
    };
  }

  // SQLite fallback — ONLY for local development
  if (nodeEnv === "production") {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      log_level: "FATAL",
      component: "database",
      event_type: "startup_guard_failure",
      message: "FATAL: No PostgreSQL DATABASE_URL or DB_HOST configured. " +
               "SQLite is not allowed in production. " +
               "Set DATABASE_URL to a PostgreSQL connection string.",
    }));
    process.exit(1);
  }

  const dataDir = process.env.MEP_DATA_DIR || path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return {
    type: "sqlite",
    sqlitePath: path.join(dataDir, "mep_local.db"),
  };
}

// ─── Database Client Abstraction ─────────────────────────────────────

class MepDatabase {
  private config: DbConfig;
  private sqliteDb: Database.Database | null = null;
  private pgPool: any = null; // pg.Pool (dynamically imported)
  private initialized = false;

  constructor() {
    this.config = resolveConfig();
  }

  get dbType(): "postgresql" | "sqlite" {
    return this.config.type;
  }

  // ─── Initialization ─────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.type === "sqlite") {
      this.initSqlite();
    } else {
      await this.initPostgres();
    }

    this.initialized = true;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      log_level: "INFO",
      component: "database",
      event_type: "db_initialized",
      db_type: this.config.type,
      message: `Database initialized (${this.config.type})`,
    }));
  }

  private initSqlite(): void {
    const dbPath = this.config.sqlitePath!;
    this.sqliteDb = new Database(dbPath);
    this.sqliteDb.pragma("journal_mode = WAL");
    this.sqliteDb.pragma("foreign_keys = ON");

    // Create SQLite-compatible schema (subset for local dev)
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL DEFAULT 'google',
        provider_subject TEXT NOT NULL DEFAULT '',
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        picture_url TEXT DEFAULT '',
        role TEXT NOT NULL DEFAULT 'Viewer',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

      CREATE TABLE IF NOT EXISTS assessment_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'Untitled Session',
        company_name TEXT DEFAULT '',
        offering_name TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft',
        active_state TEXT NOT NULL DEFAULT 'SETUP',
        input_data TEXT DEFAULT '{}',
        output_data TEXT DEFAULT '{}',
        state_snapshot TEXT DEFAULT '{}',
        current_step INTEGER DEFAULT 1,
        completion_percent INTEGER DEFAULT 0,
        review_status TEXT DEFAULT 'pending',
        reviewed_by TEXT,
        reviewed_at TEXT,
        consultant_notes TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON assessment_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON assessment_sessions(status);

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        session_id TEXT,
        event_type TEXT NOT NULL,
        component TEXT DEFAULT '',
        action TEXT NOT NULL,
        safe_metadata TEXT DEFAULT '{}',
        correlation_id TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at);

      CREATE TABLE IF NOT EXISTS agent_runs (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        agent_name TEXT NOT NULL,
        agent_role TEXT DEFAULT '',
        run_status TEXT NOT NULL DEFAULT 'started',
        input_summary TEXT DEFAULT '',
        output_summary TEXT DEFAULT '',
        evidence_references TEXT DEFAULT '[]',
        tool_calls_summary TEXT DEFAULT '[]',
        error_category TEXT DEFAULT '',
        token_usage TEXT DEFAULT '{}',
        cost_estimate REAL DEFAULT 0,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_agent_runs_session ON agent_runs(session_id);
    `);
  }

  private async initPostgres(): Promise<void> {
    // Dynamic import to avoid bundling pg when using SQLite locally
    const { default: pg } = await import("pg");

    const poolConfig: any = {
      max: this.config.poolSize || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000, // 30s for Cloud SQL proxy cold start
    };

    if (this.config.connectionString) {
      poolConfig.connectionString = this.config.connectionString;
      // Cloud SQL Unix socket support
      if (this.config.cloudSqlConnection) {
        poolConfig.host = `/cloudsql/${this.config.cloudSqlConnection}`;
        // Remove host from connection string if using Unix socket
        delete poolConfig.connectionString;
        poolConfig.database = this.config.database || "mep_production";
        poolConfig.user = this.config.user || "mep_app";
        poolConfig.password = this.config.password || "";
      }
    } else {
      if (this.config.cloudSqlConnection) {
        poolConfig.host = `/cloudsql/${this.config.cloudSqlConnection}`;
      } else {
        poolConfig.host = this.config.host;
        poolConfig.port = this.config.port;
      }
      poolConfig.database = this.config.database;
      poolConfig.user = this.config.user;
      poolConfig.password = this.config.password;
    }

    poolConfig.ssl = this.config.cloudSqlConnection ? false : { rejectUnauthorized: false };

    this.pgPool = new pg.Pool(poolConfig);

    // Test connection with retry (Cloud SQL proxy may need time to start)
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = await this.pgPool.connect();
        try {
          await client.query("SELECT 1");
        } finally {
          client.release();
        }
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          log_level: "INFO",
          component: "database",
          event_type: "pg_connected",
          message: `PostgreSQL connected (attempt ${attempt}/${maxRetries})`,
        }));
        return; // Success
      } catch (err: any) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          log_level: "WARN",
          component: "database",
          event_type: "pg_connect_retry",
          message: `PostgreSQL connection attempt ${attempt}/${maxRetries} failed: ${err.message}`,
        }));
        if (attempt === maxRetries) throw err;
        // Wait before retry (1s, 2s, 3s, 4s)
        await new Promise(r => setTimeout(r, attempt * 1000));
      }
    }
  }

  // ─── User Operations ────────────────────────────────────────────

  async upsertUser(user: {
    id: string;
    email: string;
    name: string;
    pictureUrl?: string;
    role?: string;
    provider?: string;
    providerSubject?: string;
  }): Promise<DbUser> {
    if (this.config.type === "sqlite") {
      return this.upsertUserSqlite(user);
    }
    return this.upsertUserPg(user);
  }

  private upsertUserSqlite(user: any): DbUser {
    const db = this.sqliteDb!;
    const stmt = db.prepare(`
      INSERT INTO users (id, email, name, picture_url, role, provider, provider_subject, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        picture_url = excluded.picture_url,
        provider_subject = CASE WHEN excluded.provider_subject != '' THEN excluded.provider_subject ELSE users.provider_subject END,
        last_login_at = datetime('now'),
        updated_at = datetime('now')
    `);
    stmt.run(
      user.id,
      user.email,
      user.name,
      user.pictureUrl || "",
      user.role || "Viewer",
      user.provider || "google",
      user.providerSubject || ""
    );
    return this.findUserByEmailSync(user.email)!;
  }

  private async upsertUserPg(user: any): Promise<DbUser> {
    const result = await this.pgPool.query(`
      INSERT INTO users (id, email, name, picture_url, role, provider, provider_subject, last_login_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT(email) DO UPDATE SET
        name = EXCLUDED.name,
        picture_url = EXCLUDED.picture_url,
        provider_subject = CASE WHEN EXCLUDED.provider_subject != '' THEN EXCLUDED.provider_subject ELSE users.provider_subject END,
        last_login_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `, [
      user.id,
      user.email,
      user.name,
      user.pictureUrl || "",
      user.role || "Viewer",
      user.provider || "google",
      user.providerSubject || ""
    ]);
    return this.mapPgUser(result.rows[0]);
  }

  async findUserByEmail(email: string): Promise<DbUser | null> {
    if (this.config.type === "sqlite") {
      return this.findUserByEmailSync(email) || null;
    }
    const result = await this.pgPool.query(
      "SELECT * FROM users WHERE email = $1", [email]
    );
    return result.rows.length > 0 ? this.mapPgUser(result.rows[0]) : null;
  }

  private findUserByEmailSync(email: string): DbUser | undefined {
    const row = this.sqliteDb!.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    return row ? row as DbUser : undefined;
  }

  async findUserById(userId: string): Promise<DbUser | null> {
    if (this.config.type === "sqlite") {
      const row = this.sqliteDb!.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
      return row || null;
    }
    const result = await this.pgPool.query("SELECT * FROM users WHERE id = $1", [userId]);
    return result.rows.length > 0 ? this.mapPgUser(result.rows[0]) : null;
  }

  async updateUserRole(email: string, role: string): Promise<DbUser | null> {
    if (this.config.type === "sqlite") {
      this.sqliteDb!.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE email = ?").run(role, email);
      return this.findUserByEmailSync(email) || null;
    }
    const result = await this.pgPool.query(
      "UPDATE users SET role = $1, updated_at = NOW() WHERE email = $2 RETURNING *",
      [role, email]
    );
    return result.rows.length > 0 ? this.mapPgUser(result.rows[0]) : null;
  }

  async listUsers(): Promise<DbUser[]> {
    if (this.config.type === "sqlite") {
      return this.sqliteDb!.prepare("SELECT * FROM users ORDER BY created_at DESC").all() as DbUser[];
    }
    const result = await this.pgPool.query("SELECT * FROM users ORDER BY created_at DESC");
    return result.rows.map((r: any) => this.mapPgUser(r));
  }

  async countAdministrators(): Promise<number> {
    if (this.config.type === "sqlite") {
      const row = this.sqliteDb!.prepare(
        "SELECT COUNT(*) as count FROM users WHERE role = 'Administrator' AND status = 'active'"
      ).get() as { count: number };
      return row.count;
    }
    const result = await this.pgPool.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'Administrator' AND status = 'active'"
    );
    return parseInt(result.rows[0].count, 10);
  }


  // ─── Session Operations ─────────────────────────────────────────

  async createSession(session: {
    id: string;
    userId: string;
    title?: string;
    companyName?: string;
    offeringName?: string;
    inputData?: Record<string, unknown>;
    stateSnapshot?: Record<string, unknown>;
    currentStep?: number;
    completionPercent?: number;
    reviewStatus?: string;
  }): Promise<DbSession> {
    if (this.config.type === "sqlite") {
      this.sqliteDb!.prepare(`
        INSERT INTO assessment_sessions (
          id, user_id, title, company_name, offering_name, input_data,
          state_snapshot, current_step, completion_percent, review_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        session.id, session.userId,
        session.title || "Untitled Session",
        session.companyName || "",
        session.offeringName || "",
        JSON.stringify(session.inputData || {}),
        JSON.stringify(session.stateSnapshot || {}),
        session.currentStep ?? 1,
        session.completionPercent ?? 0,
        session.reviewStatus || "pending"
      );
      return this.findSessionByIdSync(session.id)!;
    }

    const result = await this.pgPool.query(`
      INSERT INTO assessment_sessions (
        id, user_id, title, company_name, offering_name, input_data,
        state_snapshot, current_step, completion_percent, review_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      session.id, session.userId,
      session.title || "Untitled Session",
      session.companyName || "",
      session.offeringName || "",
      JSON.stringify(session.inputData || {}),
      JSON.stringify(session.stateSnapshot || {}),
      session.currentStep ?? 1,
      session.completionPercent ?? 0,
      session.reviewStatus || "pending"
    ]);
    return this.mapPgSession(result.rows[0]);
  }

  async findSessionById(sessionId: string): Promise<DbSession | null> {
    if (this.config.type === "sqlite") {
      return this.findSessionByIdSync(sessionId) || null;
    }
    const result = await this.pgPool.query(
      "SELECT * FROM assessment_sessions WHERE id = $1", [sessionId]
    );
    return result.rows.length > 0 ? this.mapPgSession(result.rows[0]) : null;
  }

  private findSessionByIdSync(sessionId: string): DbSession | undefined {
    const row = this.sqliteDb!.prepare("SELECT * FROM assessment_sessions WHERE id = ?").get(sessionId) as any;
    return row ? this.mapSqliteSession(row) : undefined;
  }

  async listSessionsByUser(userId: string): Promise<DbSession[]> {
    if (this.config.type === "sqlite") {
      const rows = this.sqliteDb!.prepare(
        "SELECT * FROM assessment_sessions WHERE user_id = ? ORDER BY updated_at DESC"
      ).all(userId) as any[];
      return rows.map(r => this.mapSqliteSession(r));
    }
    const result = await this.pgPool.query(
      "SELECT * FROM assessment_sessions WHERE user_id = $1 ORDER BY updated_at DESC",
      [userId]
    );
    return result.rows.map((r: any) => this.mapPgSession(r));
  }

  async updateSession(sessionId: string, updates: {
    title?: string;
    status?: string;
    inputData?: Record<string, unknown>;
    outputData?: Record<string, unknown>;
    stateSnapshot?: Record<string, unknown>;
    currentStep?: number;
    completionPercent?: number;
    reviewStatus?: string;
  }): Promise<DbSession | null> {
    if (this.config.type === "sqlite") {
      const parts: string[] = [];
      const values: unknown[] = [];
      if (updates.title !== undefined) { parts.push("title = ?"); values.push(updates.title); }
      if (updates.status !== undefined) { parts.push("status = ?"); values.push(updates.status); }
      if (updates.inputData !== undefined) { parts.push("input_data = ?"); values.push(JSON.stringify(updates.inputData)); }
      if (updates.outputData !== undefined) { parts.push("output_data = ?"); values.push(JSON.stringify(updates.outputData)); }
      if (updates.stateSnapshot !== undefined) { parts.push("state_snapshot = ?"); values.push(JSON.stringify(updates.stateSnapshot)); }
      if (updates.currentStep !== undefined) { parts.push("current_step = ?"); values.push(updates.currentStep); }
      if (updates.completionPercent !== undefined) { parts.push("completion_percent = ?"); values.push(updates.completionPercent); }
      if (updates.reviewStatus !== undefined) { parts.push("review_status = ?"); values.push(updates.reviewStatus); }
      if (parts.length === 0) return this.findSessionByIdSync(sessionId) || null;
      parts.push("updated_at = datetime('now')");
      values.push(sessionId);
      this.sqliteDb!.prepare(`UPDATE assessment_sessions SET ${parts.join(", ")} WHERE id = ?`).run(...values);
      return this.findSessionByIdSync(sessionId) || null;
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (updates.title !== undefined) { sets.push(`title = $${idx++}`); values.push(updates.title); }
    if (updates.status !== undefined) { sets.push(`status = $${idx++}`); values.push(updates.status); }
    if (updates.inputData !== undefined) { sets.push(`input_data = $${idx++}`); values.push(JSON.stringify(updates.inputData)); }
    if (updates.outputData !== undefined) { sets.push(`output_data = $${idx++}`); values.push(JSON.stringify(updates.outputData)); }
    if (updates.stateSnapshot !== undefined) { sets.push(`state_snapshot = $${idx++}`); values.push(JSON.stringify(updates.stateSnapshot)); }
    if (updates.currentStep !== undefined) { sets.push(`current_step = $${idx++}`); values.push(updates.currentStep); }
    if (updates.completionPercent !== undefined) { sets.push(`completion_percent = $${idx++}`); values.push(updates.completionPercent); }
    if (updates.reviewStatus !== undefined) { sets.push(`review_status = $${idx++}`); values.push(updates.reviewStatus); }
    if (sets.length === 0) return this.findSessionById(sessionId);
    values.push(sessionId);
    const result = await this.pgPool.query(
      `UPDATE assessment_sessions SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows.length > 0 ? this.mapPgSession(result.rows[0]) : null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    if (this.config.type === "sqlite") {
      const result = this.sqliteDb!.prepare("DELETE FROM assessment_sessions WHERE id = ?").run(sessionId);
      return result.changes > 0;
    }
    const result = await this.pgPool.query(
      "DELETE FROM assessment_sessions WHERE id = $1", [sessionId]
    );
    return result.rowCount > 0;
  }

  // ─── Audit Event Operations ─────────────────────────────────────

  async recordAuditEvent(event: {
    action: string;
    eventType?: string;
    userId?: string;
    sessionId?: string;
    component?: string;
    safeMetadata?: Record<string, unknown>;
    correlationId?: string;
  }): Promise<void> {
    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (this.config.type === "sqlite") {
      this.sqliteDb!.prepare(`
        INSERT INTO audit_events (id, user_id, session_id, event_type, component, action, safe_metadata, correlation_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        event.userId || null,
        event.sessionId || null,
        event.eventType || event.action,
        event.component || "",
        event.action,
        JSON.stringify(event.safeMetadata || {}),
        event.correlationId || ""
      );
      return;
    }

    await this.pgPool.query(`
      INSERT INTO audit_events (id, user_id, session_id, event_type, component, action, safe_metadata, correlation_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      id,
      event.userId || null,
      event.sessionId || null,
      event.eventType || event.action,
      event.component || "",
      event.action,
      JSON.stringify(event.safeMetadata || {}),
      event.correlationId || ""
    ]);
  }

  // ─── Agent Run Operations ───────────────────────────────────────

  async recordAgentRun(run: {
    id: string;
    sessionId?: string;
    agentName: string;
    agentRole: string;
    inputSummary?: string;
  }): Promise<void> {
    if (this.config.type === "sqlite") {
      this.sqliteDb!.prepare(`
        INSERT INTO agent_runs (id, session_id, agent_name, agent_role, input_summary)
        VALUES (?, ?, ?, ?, ?)
      `).run(run.id, run.sessionId || null, run.agentName, run.agentRole, run.inputSummary || "");
      return;
    }

    await this.pgPool.query(`
      INSERT INTO agent_runs (id, session_id, agent_name, agent_role, input_summary)
      VALUES ($1, $2, $3, $4, $5)
    `, [run.id, run.sessionId || null, run.agentName, run.agentRole, run.inputSummary || ""]);
  }

  async completeAgentRun(runId: string, result: {
    status: string;
    outputSummary?: string;
    errorCategory?: string;
    tokenUsage?: Record<string, number>;
    costEstimate?: number;
  }): Promise<void> {
    if (this.config.type === "sqlite") {
      this.sqliteDb!.prepare(`
        UPDATE agent_runs SET run_status = ?, output_summary = ?, error_category = ?,
        token_usage = ?, cost_estimate = ?, completed_at = datetime('now') WHERE id = ?
      `).run(
        result.status, result.outputSummary || "", result.errorCategory || "",
        JSON.stringify(result.tokenUsage || {}), result.costEstimate || 0, runId
      );
      return;
    }

    await this.pgPool.query(`
      UPDATE agent_runs SET run_status = $1, output_summary = $2, error_category = $3,
      token_usage = $4, cost_estimate = $5, completed_at = NOW() WHERE id = $6
    `, [
      result.status, result.outputSummary || "", result.errorCategory || "",
      JSON.stringify(result.tokenUsage || {}), result.costEstimate || 0, runId
    ]);
  }

  async listAgentRuns(sessionId?: string): Promise<any[]> {
    if (this.config.type === "sqlite") {
      if (sessionId) {
        return this.sqliteDb!.prepare(
          "SELECT * FROM agent_runs WHERE session_id = ? ORDER BY started_at DESC"
        ).all(sessionId) as any[];
      }
      return this.sqliteDb!.prepare(
        "SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT 100"
      ).all() as any[];
    }

    const query = sessionId
      ? { text: "SELECT * FROM agent_runs WHERE session_id = $1 ORDER BY started_at DESC", values: [sessionId] }
      : { text: "SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT 100", values: [] };
    const result = await this.pgPool.query(query.text, query.values);
    return result.rows;
  }

  async recordAgentArtifact(artifact: {
    id: string;
    agentRunId: string;
    artifactType: string;
    artifactName: string;
    storageUri?: string;
    checksum?: string;
  }): Promise<void> {
    if (this.config.type === "sqlite") {
      // agent_artifacts table may not exist in SQLite dev schema — skip
      return;
    }

    await this.pgPool.query(`
      INSERT INTO agent_artifacts (id, agent_run_id, artifact_type, artifact_name, storage_uri, checksum)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      artifact.id,
      artifact.agentRunId,
      artifact.artifactType,
      artifact.artifactName,
      artifact.storageUri || "",
      artifact.checksum || "",
    ]);
  }

  async listAgentArtifacts(runId: string): Promise<any[]> {
    if (this.config.type === "sqlite") {
      return [];
    }
    const result = await this.pgPool.query(
      "SELECT * FROM agent_artifacts WHERE agent_run_id = $1 ORDER BY created_at DESC",
      [runId]
    );
    return result.rows;
  }

  async listAllTables(): Promise<string[]> {
    if (this.config.type === "sqlite") {
      const rows = this.sqliteDb!.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).all() as any[];
      return rows.map(r => r.name);
    }

    const result = await this.pgPool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return result.rows.map((r: any) => r.table_name);
  }

  // ─── Health Check ───────────────────────────────────────────────

  async healthCheck(): Promise<{
    ok: boolean;
    dbType: "postgresql" | "sqlite";
    userCount: number;
    sessionCount: number;
    latencyMs: number;
  }> {
    const start = Date.now();
    try {
      let userCount = 0;
      let sessionCount = 0;

      if (this.config.type === "sqlite") {
        userCount = (this.sqliteDb!.prepare("SELECT COUNT(*) as count FROM users").get() as any).count;
        sessionCount = (this.sqliteDb!.prepare("SELECT COUNT(*) as count FROM assessment_sessions").get() as any).count;
      } else {
        const users = await this.pgPool.query("SELECT COUNT(*) as count FROM users");
        const sessions = await this.pgPool.query("SELECT COUNT(*) as count FROM assessment_sessions");
        userCount = parseInt(users.rows[0].count);
        sessionCount = parseInt(sessions.rows[0].count);
      }

      return {
        ok: true,
        dbType: this.config.type,
        userCount,
        sessionCount,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        ok: false,
        dbType: this.config.type,
        userCount: 0,
        sessionCount: 0,
        latencyMs: Date.now() - start,
      };
    }
  }

  // ─── Cleanup ────────────────────────────────────────────────────

  async close(): Promise<void> {
    if (this.sqliteDb) {
      this.sqliteDb.close();
      this.sqliteDb = null;
    }
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = null;
    }
    this.initialized = false;
  }

  // ─── Mapping Helpers ────────────────────────────────────────────

  private mapPgUser(row: any): DbUser {
    return {
      id: row.id,
      provider: row.provider || "google",
      provider_subject: row.provider_subject || "",
      email: row.email,
      name: row.name,
      picture_url: row.picture_url || "",
      role: row.role,
      status: row.status,
      created_at: row.created_at?.toISOString?.() || row.created_at,
      updated_at: row.updated_at?.toISOString?.() || row.updated_at,
      last_login_at: row.last_login_at?.toISOString?.() || row.last_login_at || null,
    };
  }

  private mapPgSession(row: any): DbSession {
    return {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      company_name: row.company_name || "",
      offering_name: row.offering_name || row.selected_offering || "",
      status: row.status,
      input_data: typeof row.input_data === "string" ? row.input_data : JSON.stringify(row.input_data || {}),
      output_data: typeof row.output_data === "string" ? row.output_data : JSON.stringify(row.output_data || {}),
      state_snapshot: typeof row.state_snapshot === "string" ? row.state_snapshot : JSON.stringify(row.state_snapshot || {}),
      current_step: row.current_step,
      completion_percent: row.completion_percent,
      review_status: row.review_status,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at?.toISOString?.() || row.reviewed_at,
      created_at: row.created_at?.toISOString?.() || row.created_at,
      updated_at: row.updated_at?.toISOString?.() || row.updated_at,
    };
  }

  private mapSqliteSession(row: any): DbSession {
    return {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      company_name: row.company_name || "",
      offering_name: row.offering_name || "",
      status: row.status,
      input_data: row.input_data || "{}",
      output_data: row.output_data || "{}",
      state_snapshot: row.state_snapshot || "{}",
      current_step: row.current_step || 1,
      completion_percent: row.completion_percent || 0,
      review_status: row.review_status || "pending",
      reviewed_by: row.reviewed_by || null,
      reviewed_at: row.reviewed_at || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// ─── Singleton Instance ──────────────────────────────────────────────

export const db = new MepDatabase();

// Re-export types for backward compatibility
export type { MepDatabase };
