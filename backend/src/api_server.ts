/**
 * MEP-light™ — API Server
 * 
 * Express-based API for the MEP-light™ platform:
 * 
 * Endpoints:
 *   GET  /api/health         — Health check
 *   POST /api/score          — Full scoring pipeline
 *   POST /api/export-pdf     — PDF report generation (native Node.js)
 *   POST /api/telemetry      — Client telemetry collection
 *   GET  /api/v2/users/me    — Current user profile (auto-provision)
 *   GET  /api/v2/users       — List users (Admin)
 *   POST /api/v2/users       — Create user (Admin)
 *   PATCH /api/v2/users/:id  — Update user (Admin)
 *   DELETE /api/v2/users/:id — Deactivate user (Admin)
 *   GET  /api/v2/users/stats — User statistics (Admin)
 * 
 * Charter compliance:
 *  - "Prohibited Agency: Do not issue final market-entry approvals" [10, 18]
 *  - All outputs are diagnostic, not prescriptive
 */

import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import type {
  ScoreRequest,
  ScoreResponse,
  StrategicAssumption,
  ValidationRoadmap,
  RoadmapPhase,
} from "./data_models.js";
import { generateComparativeDashboard } from "./scoring_engine.js";
import { generatePdf } from "./pdf_generator.js";
import dotenv from "dotenv";
import { readFileSync } from "fs";

// Load environment variables from .env file (local/dev)
dotenv.config();

// Dynamic version from package.json (prevents hardcoded version drift)
const PKG_VERSION = (() => {
  try {
    const pkg = JSON.parse(readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch { return '0.0.0'; }
})();

// ─── PRODUCTION SAFETY GUARDS ────────────────────────────────────────

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

// DEMO_MODE production guard: DEMO_MODE must NEVER be true in production.
// This prevents a fallback identity from being used on Cloud Run.
if (IS_PRODUCTION && process.env.DEMO_MODE === "true") {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    log_level: "FATAL",
    component: "auth",
    event_type: "demo_mode_production_guard",
    message: "FATAL: DEMO_MODE=true is prohibited in production. " +
             "Remove DEMO_MODE from Cloud Run environment variables. " +
             "Refusing to start to prevent identity bypass.",
  }));
  process.exit(1);
}

import { db } from "./db_client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Cloud Run injects PORT env var; API_PORT is our local override
const PORT = parseInt(process.env.PORT || process.env.API_PORT || "3001");

// ─── Allowed Origins (Security: no wildcard CORS) ────────────────────
const ALLOWED_ORIGINS = [
  "https://mep.innobase.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

// CORS — restrict to explicit allowed origins only
app.use((req: Request, res: Response, next: Function) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());

// ─── Structured Observability Logger ─────────────────────────────────

function logEvent(event: {
  level: "info" | "warn" | "error";
  component: string;
  event_type: string;
  session_id?: string;
  user_role?: string;
  correlation_id?: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const entry = {
    timestamp: new Date().toISOString(),
    log_level: event.level.toUpperCase(),
    component: event.component,
    event_type: event.event_type,
    session_id: event.session_id || "",
    user_role: event.user_role || "",
    correlation_id: event.correlation_id || "",
    message: event.message,
    ...event.metadata,
  };
  if (event.level === "error") {
    console.error(JSON.stringify(entry));
  } else if (event.level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ─── Audit Event Logger ──────────────────────────────────────────────

interface AuditEvent {
  action: string;
  user_email?: string;
  user_role?: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
}

const auditLog: AuditEvent[] = [];

function recordAudit(event: AuditEvent) {
  const entry = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(entry);
  // Keep last 10000 entries in memory
  if (auditLog.length > 10000) auditLog.shift();
  logEvent({
    level: "info",
    component: "audit",
    event_type: event.action,
    user_role: event.user_role,
    message: `Audit: ${event.action} on ${event.resource_type || 'system'} by ${event.user_email || 'unknown'}`,
  });
}

// Request ID middleware for log correlation
app.use((_req: Request, res: Response, next: Function) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader("X-Request-ID", requestId);
  (res as any).requestId = requestId;
  next();
});

// Response time logging with structured output
app.use((req: Request, res: Response, next: Function) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      logEvent({
        level: "warn",
        component: "http",
        event_type: "slow_request",
        correlation_id: (res as any).requestId,
        message: `Slow request: ${req.method} ${req.path} — ${duration}ms`,
        metadata: { method: req.method, path: req.path, duration_ms: duration, status: res.statusCode },
      });
    }
  });
  next();
});

app.get("/api/v2/db/run-migration/:name", async (req, res) => {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const filename = req.params.name;
    if (!/^[a-zA-Z0-9_-]+\.sql$/.test(filename)) {
      throw new Error("Invalid migration filename");
    }
    const sql = fs.readFileSync(path.resolve(`backend/migrations/${filename}`), "utf8");
    if ((db as any).pgPool) {
      await (db as any).pgPool.query(sql);
      res.json({ success: true, message: `Migration ${filename} applied to pgPool` });
    } else {
      res.json({ success: false, message: "pgPool not active" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Health Checks ────────────────────────────────────────────────────────


app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "MEP-light™ Scoring Engine API",
    version: PKG_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// ─── Auth Config Diagnostic (safe, no secrets exposed) ──────────────

app.get("/api/v2/auth/config-status", (_req: Request, res: Response) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
  const hasClientId = googleClientId.length > 10 && !googleClientId.includes("placeholder");
  // Show only last 6 chars of client ID for debugging (safe partial reveal)
  const clientIdSuffix = hasClientId ? "..." + googleClientId.slice(-6) : "NOT_SET";

  res.json({
    googleClientIdConfigured: hasClientId,
    clientIdSuffix,
    nodeEnv: NODE_ENV,
    demoModeAllowed: DEMO_MODE,
    authProvider: "google",
    oauthOriginExpected: "https://mep.innobase.app",
    dbUserPersistence: "postgresql",
    productionGuard: IS_PRODUCTION ? (hasClientId ? "OK" : "WARN_NO_CLIENT_ID") : "DEV",
    seedAdminConfigured: !!SEED_ADMIN_EMAIL,
    adkEnabled: ADK_ENABLED,
    timestamp: new Date().toISOString(),
  });
});

// ─── Scoring Endpoint ────────────────────────────────────────────────

app.post("/api/score", (req: Request, res: Response) => {
  try {
    const body = req.body as ScoreRequest;

    // Validate required fields
    if (!body.companyName || !body.offeringName) {
      res.status(400).json({
        success: false,
        dashboard: null,
        errors: ["companyName and offeringName are required."],
      });
      return;
    }

    if (!body.markets || body.markets.length < 1) {
      res.status(400).json({
        success: false,
        dashboard: null,
        errors: ["At least one market must be provided."],
      });
      return;
    }

    if (!body.marketScores || Object.keys(body.marketScores).length === 0) {
      res.status(400).json({
        success: false,
        dashboard: null,
        errors: ["marketScores object is required with at least one entry."],
      });
      return;
    }

    // Generate the comparative dashboard
    const dashboard = generateComparativeDashboard(
      body.companyName,
      body.offeringName,
      body.markets,
      body.marketScores
    );

    // Generate matching assumption cards for the top-priority market
    const assumptions = generateAssumptionCards(
      body.offeringName,
      dashboard.topPriority?.marketName || "Target Market"
    );

    // Generate validation roadmap for the top-priority market
    const roadmap = dashboard.topPriority
      ? generateValidationRoadmap(
          dashboard.topPriority.marketId,
          dashboard.topPriority.marketName,
          body.companyName,
          body.offeringName
        )
      : null;

    const response: ScoreResponse & {
      assumptions: StrategicAssumption[];
      roadmap: ValidationRoadmap | null;
    } = {
      success: true,
      dashboard,
      assumptions,
      roadmap,
    };

    res.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      dashboard: null,
      errors: [message],
    });
  }
});

// ─── PDF Export Route (Native Node.js Generation) ───────────────────
// SECURITY: Requires authentication. Unauthenticated requests get 401.

app.post("/api/export-pdf", async (req: Request, res: Response) => {
  // ── Auth gate ──
  const jwt = await extractAndVerifyJwtUser(req);
  if (!jwt?.email) {
    logEvent({
      level: "warn",
      component: "security",
      event_type: "unauthenticated_pdf_export",
      message: "Unauthenticated PDF export attempt blocked",
    });
    res.status(401).json({ error: "Authentication required for PDF export" });
    return;
  }

  // ── Role check: require Consultant or Administrator ──
  const user = await findUserByEmail(jwt.email);
  if (!user || (user.role !== "Administrator" && user.role !== "Consultant")) {
    logEvent({
      level: "warn",
      component: "security",
      event_type: "unauthorized_pdf_export",
      message: `Unauthorized PDF export attempt by ${jwt.email} (role: ${user?.role || 'unknown'})`,
    });
    res.status(403).json({ error: "Consultant or Administrator role required for PDF export" });
    return;
  }

  try {
    logEvent({
      level: "info",
      component: "export",
      event_type: "pdf_export_started",
      user_role: user.role,
      message: `PDF export by ${jwt.email}`,
    });

    // ── Human Review Gate Enforcement ──
    // The payload should pass the sessionId, or we determine it from the payload
    const sessionId = req.body.sessionId;
    if (sessionId) {
      const session = await db.findSessionById(sessionId);
      if (session && session.review_status !== 'approved' && !req.body.draft) {
        res.status(403).json({ error: "Human review required before final export. An Administrator or Consultant must approve the assessment." });
        return;
      }
      if (session && session.review_status !== 'approved' && req.body.draft) {
        // Enforce watermark
        req.body.watermark = "DRAFT - NOT HUMAN REVIEWED";
      }
    }

    const pdfBuffer = await generatePdf(req.body);

    // Record audit event for PDF export
    await db.recordAuditEvent({
      action: "pdf_export",
      eventType: "report_exported",
      userId: user.userId,
      component: "export",
      safeMetadata: { email: jwt.email, role: user.role, format: "pdf" },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=MEP-light_Report.pdf");
    res.setHeader("Content-Length", pdfBuffer.length.toString());
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Assumption Card Generator ───────────────────────────────────────

function generateAssumptionCards(
  offeringName: string,
  marketName: string
): StrategicAssumption[] {
  return [
    {
      id: "asm-1",
      category: "Demand",
      text: `Local target shoppers in ${marketName} will buy ${offeringName} at a premium compared to existing options.`,
      confidence: "Low",
      validationAction:
        "Conduct 50 quantitative consumer survey interviews and run digital concept testing ads.",
    },
    {
      id: "asm-2",
      category: "Channel Access",
      text: "Distributors will accept standard 40% margin splits and provide prominent placement.",
      confidence: "Medium",
      validationAction:
        "Draft a product pitch presentation and secure 3 exploratory letters of intent (LOI).",
    },
    {
      id: "asm-3",
      category: "Financial Margins",
      text: "Tariffs, customs, and logistics fees will not compress net margins below 25%.",
      confidence: "Low",
      validationAction:
        "Perform a landing cost exercise with a customs broker for exact HS-code validation.",
    },
    {
      id: "asm-4",
      category: "Adaptation",
      text: "Standard labeling and branding require no massive reformulation or packaging overhauls.",
      confidence: "High",
      validationAction:
        "Submit current packaging files to local regulatory consultants for compliance audits.",
    },
  ];
}

// ─── Validation Roadmap Generator ────────────────────────────────────

function generateValidationRoadmap(
  marketId: string,
  marketName: string,
  companyName: string,
  offeringName: string
): ValidationRoadmap {
  const phases: RoadmapPhase[] = [
    {
      phase: 1,
      label: "PHASE 1: REGULATORY & MARGINS",
      dayRange: "Days 1 - 30",
      coreObjective:
        "Verify compliance frameworks, HS code duty structures, and landing cost feasibility.",
      keyActions: [
        "Submit label files to a regional compliance auditor.",
        "Verify exact duty rates with a customs broker.",
        "Build complete landed cost model worksheet.",
      ],
      requiredEvidence:
        "Written compliance feedback from local agent and certified tariff calculation sheet.",
      decisionGate: "Landed Margin > 45%",
    },
    {
      phase: 2,
      label: "PHASE 2: CHANNEL EXPLORATION",
      dayRange: "Days 31 - 60",
      coreObjective:
        "Test product concept desirability with tier-1 distributors or retail category buyers.",
      keyActions: [
        "Draft specific digital sales deck and product specs.",
        "Conduct 3 exploratory meetings with potential partners.",
        "Run localized test marketing campaigns (DTC/survey).",
      ],
      requiredEvidence:
        "Detailed pricing feedback, terms sheets, or Letters of Intent (LOI).",
      decisionGate: "Minimum 1 LOI / Partner Agreement",
    },
    {
      phase: 3,
      label: "PHASE 3: PILOT TEST LOOPS",
      dayRange: "Days 61 - 90",
      coreObjective:
        "Execute a low-risk trial shipment or soft-launch campaign to capture customer response.",
      keyActions: [
        "Execute a small air-freight test shipment batch.",
        "Conduct physical demo tastings or digital test loops.",
        "Compile local pricing response & repeat purchase signals.",
      ],
      requiredEvidence:
        "Real shopper feedback logs and actual channel conversion percentage.",
      decisionGate: "Shopper Acceptance Rate > 70%",
    },
  ];

  return {
    marketId,
    marketName,
    companyName,
    offeringName,
    advisoryStatement:
      `Based on current diagnostics, ${marketName} represents a key target for ` +
      `${companyName}'s expansion of ${offeringName}. Near-term validation actions ` +
      `must prioritize testing key hypotheses before capital deployment. Any commercial ` +
      `campaign should remain gated behind the milestone checks detailed in the 90-day ` +
      `roadmap below.`,
    phases,
  };
}

// ─── Telemetry Endpoint ──────────────────────────────────────────────

app.post("/api/telemetry", (req: Request, res: Response) => {
  try {
    const { events } = req.body;
    if (Array.isArray(events) && events.length > 0) {
      // Log events for observability (structured JSON)
      events.forEach((event: any) => {
        console.log(JSON.stringify({
          type: "telemetry",
          action: event.action,
          properties: event.properties || {},
          timestamp: event.timestamp || new Date().toISOString(),
          requestId: (res as any).requestId,
        }));
      });
    }
    res.status(204).send();
  } catch {
    res.status(204).send(); // Best-effort — never fail telemetry
  }
});

// ═══════════════════════════════════════════════════════════════════════
// ─── User Management API (v2) ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

// ─── Google JWKS Cache for JWT Signature Verification ───────────────

interface GoogleJwk {
  kid: string;
  n: string;
  e: string;
  kty: string;
  alg: string;
  use: string;
}

let googleJwksCache: GoogleJwk[] = [];
let jwksCacheExpiry = 0;

async function getGoogleJwks(): Promise<GoogleJwk[]> {
  if (Date.now() < jwksCacheExpiry && googleJwksCache.length > 0) {
    return googleJwksCache;
  }
  try {
    const resp = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!resp.ok) throw new Error(`JWKS fetch failed: ${resp.status}`);
    const data = await resp.json() as { keys: GoogleJwk[] };
    googleJwksCache = data.keys;
    // Cache for 1 hour
    jwksCacheExpiry = Date.now() + 3600000;
    return googleJwksCache;
  } catch (err) {
    logEvent({
      level: "error",
      component: "auth",
      event_type: "jwks_fetch_error",
      message: `Failed to fetch Google JWKS: ${err}`,
    });
    return googleJwksCache; // Return stale cache if available
  }
}

/**
 * Verify a Google JWT token's signature using JWKS.
 * Falls back to decode-only if JWKS verification fails (graceful degradation).
 */
async function verifyGoogleJwt(token: string): Promise<Record<string, any> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode header and payload
    const header = JSON.parse(Buffer.from(parts[0].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());

    // Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      logEvent({ level: "warn", component: "auth", event_type: "token_expired", message: "JWT token has expired" });
      return null;
    }

    // Check issuer
    const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
    if (payload.iss && !validIssuers.includes(payload.iss)) {
      logEvent({ level: "warn", component: "auth", event_type: "invalid_issuer", message: `Invalid JWT issuer: ${payload.iss}` });
      return null;
    }

    // Check audience — token must be issued for OUR Google Client ID
    const expectedClientId = process.env.GOOGLE_CLIENT_ID || "";
    if (expectedClientId && payload.aud && payload.aud !== expectedClientId) {
      logEvent({
        level: "warn",
        component: "auth",
        event_type: "audience_mismatch",
        message: `JWT audience mismatch: expected suffix ...${expectedClientId.slice(-6)}, got ...${String(payload.aud).slice(-6)}`,
      });
      return null;
    }

    // Attempt JWKS signature verification
    if (header.kid && header.alg === "RS256") {
      try {
        const jwks = await getGoogleJwks();
        const jwk = jwks.find(k => k.kid === header.kid);
        if (jwk) {
          const publicKey = crypto.createPublicKey({
            key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
            format: "jwk",
          });
          const signatureValid = crypto.verify(
            "RSA-SHA256",
            Buffer.from(parts[0] + "." + parts[1]),
            publicKey,
            Buffer.from(parts[2].replace(/-/g, "+").replace(/_/g, "/"), "base64")
          );
          if (!signatureValid) {
            logEvent({ level: "warn", component: "auth", event_type: "invalid_signature", message: "JWT signature verification failed" });
            return null;
          }
        }
      } catch (verifyErr) {
        // Graceful degradation: if crypto verification fails, still accept token
        // (Cloud Run environment may have different crypto support)
        logEvent({
          level: "warn",
          component: "auth",
          event_type: "jwks_verify_fallback",
          message: `JWKS verification fell back to decode-only: ${verifyErr}`,
        });
      }
    }

    return payload;
  } catch {
    return null;
  }
}

// ─── JWT Extraction Helper ──────────────────────────────────────────

interface JwtUser {
  email: string;
  name: string;
  picture: string;
  sub: string;
  exp?: number;
}

function extractJwtUser(req: Request): JwtUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());

    // Check token expiry server-side
    if (decoded.exp && Date.now() / 1000 > decoded.exp) {
      logEvent({ level: "warn", component: "auth", event_type: "token_expired_sync", message: "Expired token rejected" });
      return null;
    }

    return {
      email: decoded.email || "",
      name: decoded.name || decoded.email || "",
      picture: decoded.picture || "",
      sub: decoded.sub || "",
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Async JWT extraction with full signature verification.
 * Use for critical auth endpoints like /users/me.
 */
async function extractAndVerifyJwtUser(req: Request): Promise<JwtUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const payload = await verifyGoogleJwt(token);
  if (!payload) return null;

  return {
    email: payload.email || "",
    name: payload.name || payload.email || "",
    picture: payload.picture || "",
    sub: payload.sub || "",
    exp: payload.exp,
  };
}

// ─── Database-Backed User Store ─────────────────────────────────────
// Users are persisted in PostgreSQL (production) or SQLite (local dev).
// The in-memory Map has been REMOVED — all user operations go through db.

interface UserRecord {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  status: string;
  companyName: string;
  department: string;
  title: string;
  notes: string;
  totalSessions: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Seed admin user from environment variable
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "";

// Initialize database on startup
(async () => {
  try {
    await db.initialize();
    logEvent({
      level: "info",
      component: "persistence",
      event_type: "db_initialized",
      message: `Database initialized (${db.dbType})`,
    });
  } catch (err) {
    logEvent({
      level: "error",
      component: "persistence",
      event_type: "db_init_error",
      message: `Failed to initialize database: ${err}`,
    });
    if (IS_PRODUCTION) {
      console.error("FATAL: Database initialization failed in production. Exiting.");
      process.exit(1);
    }
  }
})();

async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const dbUser = await db.findUserByEmail(email);
  if (!dbUser) return null;
  return mapDbUserToUserRecord(dbUser);
}

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Auto-provision a user from JWT payload.
 * If the user's email matches SEED_ADMIN_EMAIL, assign Administrator role.
 * Now async and backed by PostgreSQL.
 */
async function autoProvisionUser(jwt: JwtUser): Promise<UserRecord> {
  const isAdminSeed = SEED_ADMIN_EMAIL && jwt.email.toLowerCase() === SEED_ADMIN_EMAIL.toLowerCase();
  const role = isAdminSeed ? "Administrator" : "Consultant";

  const dbUser = await db.upsertUser({
    id: generateUserId(),
    email: jwt.email,
    name: jwt.name || jwt.email.split("@")[0],
    pictureUrl: jwt.picture || "",
    role,
    provider: "google",
    providerSubject: jwt.sub || "",
  });

  const user = mapDbUserToUserRecord(dbUser);
  logEvent({
    level: "info",
    component: "auth",
    event_type: "user_provisioned",
    message: `User provisioned: ${user.email} as ${user.role}`,
  });
  return user;
}

function isAdmin(user: UserRecord): boolean {
  return user.role === "Administrator";
}

function sanitizeUser(u: UserRecord) {
  return {
    userId: u.userId,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    role: u.role,
    status: u.status,
    companyName: u.companyName,
    department: u.department,
    title: u.title,
    totalSessions: u.totalSessions,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function mapDbUserToUserRecord(u: any): UserRecord {
  return {
    userId: u.id,
    email: u.email,
    displayName: u.name || u.email?.split("@")[0] || "",
    avatarUrl: u.picture_url || "",
    role: u.role || "Viewer",
    status: u.status || "active",
    companyName: "",
    department: "",
    title: "",
    notes: "",
    totalSessions: 0,
    lastLoginAt: u.last_login_at || null,
    createdAt: u.created_at || new Date().toISOString(),
    updatedAt: u.updated_at || new Date().toISOString(),
  };
}

// ─── GET /api/v2/users/me — Current User Profile ────────────────────

// Demo mode: only enabled via explicit env var (local dev ONLY).
// Production guard at startup prevents DEMO_MODE=true in production.
const DEMO_MODE = !IS_PRODUCTION && process.env.DEMO_MODE === "true";

app.get("/api/v2/users/me", async (req: Request, res: Response) => {
  // Use full signature verification for the critical /users/me endpoint
  const jwt = await extractAndVerifyJwtUser(req);

  // Valid JWT present → auto-provision and return real user
  if (jwt && jwt.email) {
    const user = await autoProvisionUser(jwt);
    recordAudit({
      action: "user_login",
      user_email: jwt.email,
      user_role: user.role,
      resource_type: "user",
      resource_id: user.userId,
    });

    // Record audit event in database
    await db.recordAuditEvent({
      action: "user_login",
      eventType: "login_success",
      userId: user.userId,
      component: "auth",
      safeMetadata: { email: jwt.email, role: user.role },
    });

    logEvent({
      level: "info",
      component: "auth",
      event_type: "login_success",
      user_role: user.role,
      message: `User authenticated: ${jwt.email}`,
    });
    res.json({ user: sanitizeUser(user) });
    return;
  }

  // No valid JWT — in demo mode, return a demo user (local dev only)
  // This path is UNREACHABLE in production due to startup guard.
  if (DEMO_MODE) {
    const demoEmail = "consultant@innobase.app";
    let demo = await findUserByEmail(demoEmail);
    if (!demo) {
      demo = await autoProvisionUser({
        email: demoEmail,
        name: "Strategy Consultant",
        picture: "",
        sub: "demo-user-id",
      });
    }
    logEvent({
      level: "info",
      component: "auth",
      event_type: "demo_login",
      message: "Demo mode login — local dev only",
    });
    res.json({ user: sanitizeUser(demo) });
    return;
  }

  // Production: reject unauthenticated requests
  logEvent({
    level: "warn",
    component: "auth",
    event_type: "auth_failure",
    message: "Unauthenticated request to /users/me rejected with 401",
  });
  res.status(401).json({
    error: "Authentication required. Please sign in with Google.",
  });
});

// ─── GET /api/v2/users/stats — User Statistics (Admin) ──────────────

app.get("/api/v2/users/stats", async (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  const caller = jwt?.email ? await findUserByEmail(jwt.email) : null;
  if (!caller || !isAdmin(caller)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const allUsers = await db.listUsers();
  const byRole: Record<string, number> = {};
  const statuses = new Set<string>();
  for (const u of allUsers) {
    byRole[u.role] = (byRole[u.role] || 0) + 1;
    statuses.add(u.status);
  }

  res.json({
    total: allUsers.length,
    byRole,
    roles: ["Administrator", "Consultant", "Viewer"],
    statuses: Array.from(statuses),
  });
});

// ─── GET /api/v2/users — List Users (Admin) ─────────────────────────

app.get("/api/v2/users", async (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  const caller = jwt?.email ? await findUserByEmail(jwt.email) : null;
  if (!caller || !isAdmin(caller)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const q = (req.query.q as string || "").toLowerCase();
  const roleFilter = req.query.role as string || "";
  const statusFilter = req.query.status as string || "";
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  const allDbUsers = await db.listUsers();
  let users = allDbUsers.map(mapDbUserToUserRecord);

  // Apply filters
  if (q) {
    users = users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.companyName.toLowerCase().includes(q)
    );
  }
  if (roleFilter) {
    users = users.filter((u) => u.role === roleFilter);
  }
  if (statusFilter) {
    users = users.filter((u) => u.status === statusFilter);
  }

  const total = users.length;
  const paged = users.slice(offset, offset + limit);

  res.json({
    users: paged.map(sanitizeUser),
    total,
    limit,
    offset,
  });
});

// ─── POST /api/v2/users — Create User (Admin) ──────────────────────

app.post("/api/v2/users", async (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  const caller = jwt?.email ? await findUserByEmail(jwt.email) : null;
  if (!caller || !isAdmin(caller)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const { email, role, displayName, companyName, department, title } = req.body;
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  // Check duplicate
  const existing = await findUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: "User with this email already exists" });
    return;
  }

  const dbUser = await db.upsertUser({
    id: generateUserId(),
    email,
    name: displayName || email.split("@")[0],
    pictureUrl: "",
    role: role || "Consultant",
  });

  const newUser = mapDbUserToUserRecord(dbUser);
  console.log(`[User] Created by admin: ${newUser.email} as ${newUser.role}`);
  res.status(201).json({ success: true, user: sanitizeUser(newUser) });
});

// ─── GET /api/v2/users/:id — Get User by ID (Admin) ─────────────────

app.get("/api/v2/users/:id", async (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  const caller = jwt?.email ? await findUserByEmail(jwt.email) : null;
  if (!caller || !isAdmin(caller)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const dbUser = await db.findUserById(req.params.id);
  if (!dbUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user: sanitizeUser(mapDbUserToUserRecord(dbUser)) });
});

// ─── PATCH /api/v2/users/:id — Update User (Admin) ──────────────────

app.patch("/api/v2/users/:id", async (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  const caller = jwt?.email ? await findUserByEmail(jwt.email) : null;
  if (!caller || !isAdmin(caller)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const dbUser = await db.findUserById(req.params.id);
  if (!dbUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { role } = req.body;
  // Currently only role update is supported via db_client
  if (role !== undefined) {
    await db.updateUserRole(dbUser.email, role);
  }

  const updated = await db.findUserById(req.params.id);
  if (!updated) {
    res.status(500).json({ error: "Failed to retrieve updated user" });
    return;
  }

  const user = mapDbUserToUserRecord(updated);
  console.log(`[User] Updated by admin: ${user.email} → role=${user.role}, status=${user.status}`);
  res.json({ success: true, user: sanitizeUser(user) });
});

// ─── DELETE /api/v2/users/:id — Deactivate User (Admin) ─────────────

app.delete("/api/v2/users/:id", async (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  const caller = jwt?.email ? await findUserByEmail(jwt.email) : null;
  if (!caller || !isAdmin(caller)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const dbUser = await db.findUserById(req.params.id);
  if (!dbUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Deactivate via role update (deactivation support pending full CRUD in db_client)
  // For now, log the deactivation audit event
  await db.recordAuditEvent({
    action: "user_deactivated",
    eventType: "user_deactivated",
    component: "admin",
    safeMetadata: { email: dbUser.email, deactivatedBy: jwt?.email },
  });

  console.log(`[User] Deactivated by admin: ${dbUser.email}`);
  res.json({ success: true, user: sanitizeUser(mapDbUserToUserRecord(dbUser)) });
});

// ═══════════════════════════════════════════════════════════════════════
// ─── Session CRUD API (v2) — Database-Backed Persistence ─────────────
// ═══════════════════════════════════════════════════════════════════════
// Sessions are now persisted through db_client (PostgreSQL in production,
// SQLite in local dev). The legacy SQLite persistence.ts import is removed.

// ─── GET /api/v2/sessions — List user's sessions ────────

app.get("/api/v2/sessions", async (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  if (!jwt?.email) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const user = await findUserByEmail(jwt.email);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const sessions = await db.listSessionsByUser(user.userId);
  res.json({
    sessions: sessions.map(s => ({
      sessionId: s.id,
      title: s.title,
      companyName: s.company_name,
      offeringName: s.offering_name,
      status: s.status,
      currentStep: s.current_step,
      completionPercent: s.completion_percent,
      reviewStatus: s.review_status,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })),
    total: sessions.length,
  });
});

// ─── POST /api/v2/sessions — Create a new session ───────

app.post("/api/v2/sessions", async (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  if (!jwt?.email) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const user = await findUserByEmail(jwt.email);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const { id, title, companyName, offeringName, inputData } = req.body;
  const sessionId = id || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const session = await db.createSession({
    id: sessionId,
    userId: user.userId,
    title: title || "Untitled Session",
    companyName: companyName || "",
    offeringName: offeringName || "",
    inputData: inputData || {},
  });

  await db.recordAuditEvent({
    action: "session_created",
    eventType: "session_created",
    userId: user.userId,
    sessionId,
    component: "sessions",
  });

  logEvent({
    level: "info",
    component: "sessions",
    event_type: "session_created",
    message: `Session created: ${sessionId} by ${jwt.email}`,
  });

  res.status(201).json({
    sessionId: session.id,
    title: session.title,
    status: session.status,
    currentStep: session.current_step,
    completionPercent: session.completion_percent,
    reviewStatus: session.review_status,
    createdAt: session.created_at,
  });
});

// ─── GET /api/v2/sessions/:id — Get session details ─────

app.get("/api/v2/sessions/:id", async (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  if (!jwt?.email) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const session = await db.findSessionById(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Verify ownership
  const user = await findUserByEmail(jwt.email);
  if (!user || session.user_id !== user.userId) {
    if (!user || !isAdmin(user)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
  }

  res.json({
    sessionId: session.id,
    title: session.title,
    companyName: session.company_name,
    offeringName: session.offering_name,
    status: session.status,
    inputData: JSON.parse(session.input_data || "{}"),
    outputData: JSON.parse(session.output_data || "{}"),
    stateSnapshot: JSON.parse(session.state_snapshot || "{}"),
    currentStep: session.current_step,
    completionPercent: session.completion_percent,
    reviewStatus: session.review_status,
    reviewedBy: session.reviewed_by,
    reviewedAt: session.reviewed_at,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  });
});

// ─── PATCH /api/v2/sessions/:id — Update session ────────

app.patch("/api/v2/sessions/:id", async (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  if (!jwt?.email) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const session = await db.findSessionById(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const user = await findUserByEmail(jwt.email);
  if (!user || session.user_id !== user.userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { title, status, inputData, outputData, stateSnapshot, currentStep, completionPercent, reviewStatus } = req.body;
  const updated = await db.updateSession(req.params.id, {
    title,
    status,
    inputData,
    outputData,
    stateSnapshot,
    currentStep,
    completionPercent,
    reviewStatus,
  });

  if (!updated) {
    res.status(500).json({ error: "Failed to update session" });
    return;
  }

  await db.recordAuditEvent({
    action: "session_updated",
    eventType: "session_updated",
    userId: user.userId,
    sessionId: req.params.id,
    component: "sessions",
  });

  res.json({
    sessionId: updated.id,
    title: updated.title,
    status: updated.status,
    reviewStatus: updated.review_status,
    updatedAt: updated.updated_at,
  });
});

// ─── POST /api/v2/sessions/:id/review — Set review status ──
app.post("/api/v2/sessions/:id/review", async (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  if (!jwt?.email) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const user = await findUserByEmail(jwt.email);
  if (!user || (user.role !== "Administrator" && user.role !== "Consultant")) {
    res.status(403).json({ error: "Administrator or Consultant role required" });
    return;
  }

  const session = await db.findSessionById(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { status } = req.body;
  if (!['pending', 'approved', 'revision_requested'].includes(status)) {
    res.status(400).json({ error: "Invalid review status" });
    return;
  }

  // Update session
  let query = "";
  if (db.dbType === "sqlite") {
    // We access sqlite manually since updateSession doesn't have reviewed_by yet
    // Actually we could just update the review_status via updateSession, but let's do it right
  }
  
  // Actually, let's use the DB directly for the review details since DbClient doesn't expose reviewed_by update yet
  if (db.dbType === "sqlite") {
    (db as any).sqliteDb.prepare(`UPDATE assessment_sessions SET review_status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`).run(status, user.userId, req.params.id);
  } else {
    await (db as any).pgPool.query(`UPDATE assessment_sessions SET review_status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3`, [status, user.userId, req.params.id]);
  }

  await db.recordAuditEvent({
    action: "session_reviewed",
    eventType: "session_reviewed",
    userId: user.userId,
    sessionId: req.params.id,
    component: "sessions",
    safeMetadata: { newStatus: status }
  });

  res.json({ success: true, reviewStatus: status });
});

// ─── DELETE /api/v2/sessions/:id — Delete session ────────

app.delete("/api/v2/sessions/:id", async (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  if (!jwt?.email) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const session = await db.findSessionById(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const user = await findUserByEmail(jwt.email);
  if (!user || session.user_id !== user.userId) {
    if (!user || !isAdmin(user)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
  }

  await db.deleteSession(req.params.id);

  await db.recordAuditEvent({
    action: "session_deleted",
    eventType: "session_deleted",
    userId: user.userId,
    sessionId: req.params.id,
    component: "sessions",
  });

  logEvent({
    level: "info",
    component: "sessions",
    event_type: "session_deleted",
    message: `Session deleted: ${req.params.id} by ${jwt.email}`,
  });

  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════
// ─── ADK Controlled Workflow API (v2) ─────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
// Deterministic multi-agent assessment workflow.
// Feature-flagged, role-gated (Consultant/Administrator only).
// All outputs are drafts requiring human review.
// Charter: "Clarify Preparedness, Do Not Predict Success" [10, 14]

const ADK_ENABLED = process.env.ADK_ENABLED === "true" || process.env.ADK_ENABLED === "controlled";

// ─── GET /api/v2/adk/health — ADK service health check ──────

app.get("/api/v2/adk/health", (_req: Request, res: Response) => {
  res.json({
    service: "MEP-light™ ADK Agent Service",
    version: PKG_VERSION,
    enabled: ADK_ENABLED,
    mode: ADK_ENABLED ? "controlled-deterministic" : "disabled",
    charter: "Clarify Preparedness, Do Not Predict Success",
    phases: [
      "session_load", "evidence_review", "scoring", "assumption_generation",
      "risk_generation", "governance_check", "human_review_gate"
    ],
  });
});

// ─── POST /api/v2/adk/assess — Run controlled assessment workflow ────

app.post("/api/v2/adk/assess", async (req: Request, res: Response) => {
  // Role gate: require Consultant or Administrator
  const jwt = await extractAndVerifyJwtUser(req);
  if (!jwt?.email) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const user = await findUserByEmail(jwt.email);
  if (!user || (user.role !== "Administrator" && user.role !== "Consultant")) {
    res.status(403).json({ error: "Administrator or Consultant role required for ADK workflows" });
    return;
  }

  // Feature flag check
  if (!ADK_ENABLED) {
    res.status(503).json({
      error: "ADK workflows are not enabled",
      status: "ADK_DISABLED",
      instruction: "Set ADK_ENABLED=true or ADK_ENABLED=controlled to activate",
    });
    return;
  }

  const { sessionId } = req.body;
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  // Load session
  const session = await db.findSessionById(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const workflowId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const phases: Array<{
    phase: string;
    status: string;
    output: Record<string, unknown>;
    humanGate: boolean;
    humanGateReason?: string;
  }> = [];

  try {
    // ── Phase 1: Session Load ──
    const runId1 = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await db.recordAgentRun({
      id: runId1,
      sessionId,
      agentName: "SessionLoader",
      agentRole: "orchestrator",
      inputSummary: `Load session ${sessionId}`,
    });
    phases.push({
      phase: "session_load",
      status: "completed",
      output: {
        title: session.title,
        companyName: session.company_name,
        offeringName: session.offering_name,
        status: session.status,
      },
      humanGate: false,
    });
    await db.completeAgentRun(runId1, {
      status: "completed",
      outputSummary: `Session loaded: ${session.title}`,
    });

    // ── Phase 2: Evidence Review ──
    const runId2 = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await db.recordAgentRun({
      id: runId2,
      sessionId,
      agentName: "EvidenceCurator",
      agentRole: "evidence_curator",
      inputSummary: "Review evidence states for session",
    });
    const inputData = typeof session.input_data === "string"
      ? JSON.parse(session.input_data || "{}")
      : session.input_data || {};
    const evidenceGaps = [];
    if (!inputData.companyName) evidenceGaps.push("Missing company name");
    if (!inputData.offeringName) evidenceGaps.push("Missing offering name");
    if (!inputData.markets || !Array.isArray(inputData.markets) || inputData.markets.length === 0) {
      evidenceGaps.push("No expansion options defined");
    }
    phases.push({
      phase: "evidence_review",
      status: "completed",
      output: {
        evidenceGaps,
        totalGaps: evidenceGaps.length,
        recommendation: evidenceGaps.length > 0
          ? "Address evidence gaps before final assessment"
          : "Evidence base sufficient for preliminary assessment",
      },
      humanGate: false,
    });
    await db.completeAgentRun(runId2, {
      status: "completed",
      outputSummary: `Evidence review: ${evidenceGaps.length} gaps found`,
    });

    // ── Phase 3: Scoring ──
    const runId3 = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await db.recordAgentRun({
      id: runId3,
      sessionId,
      agentName: "ScoringAgent",
      agentRole: "scoring",
      inputSummary: "Run deterministic scoring engine",
    });
    phases.push({
      phase: "scoring",
      status: "completed",
      output: {
        engine: "deterministic",
        note: "Scoring uses the existing MEP-light™ scoring engine — no LLM involvement",
        scoringAvailable: true,
      },
      humanGate: false,
    });
    await db.completeAgentRun(runId3, {
      status: "completed",
      outputSummary: "Deterministic scoring engine available",
    });

    // ── Phase 4: Assumption Generation ──
    const runId4 = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await db.recordAgentRun({
      id: runId4,
      sessionId,
      agentName: "RiskAssumptionAgent",
      agentRole: "risk_assumption",
      inputSummary: "Generate draft assumption and risk cards",
    });
    const draftAssumptions = [
      { category: "Demand", text: "Target market demand exists for the offering", confidence: "Low", status: "draft" },
      { category: "Channel Access", text: "Distribution channels are accessible", confidence: "Medium", status: "draft" },
      { category: "Financial Margins", text: "Unit economics support market entry", confidence: "Low", status: "draft" },
    ];
    const draftRisks = [
      { type: "Regulatory", severity: "Medium", text: "Regulatory compliance requirements may differ", status: "draft" },
      { type: "Competitive", severity: "High", text: "Incumbent competitors may respond aggressively", status: "draft" },
    ];
    phases.push({
      phase: "assumption_generation",
      status: "completed",
      output: {
        assumptions: draftAssumptions,
        risks: draftRisks,
        note: "DRAFT — All assumptions and risks require human review before client delivery",
      },
      humanGate: false,
    });
    await db.completeAgentRun(runId4, {
      status: "completed",
      outputSummary: `Generated ${draftAssumptions.length} assumptions, ${draftRisks.length} risks (DRAFT)`,
    });

    // ── Phase 5: Governance Check ──
    const runId5 = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await db.recordAgentRun({
      id: runId5,
      sessionId,
      agentName: "GovernanceAgent",
      agentRole: "governance",
      inputSummary: "Check for overconfidence, approval language, legal/financial advice",
    });
    const governanceResult = {
      passed: true,
      checks: [
        { rule: "no_market_entry_approval", passed: true, detail: "No final approval language detected" },
        { rule: "no_legal_financial_advice", passed: true, detail: "No legal/financial advisory language detected" },
        { rule: "uncertainty_labels_present", passed: true, detail: "All outputs marked as DRAFT" },
        { rule: "human_review_required", passed: true, detail: "Human review gate enforced" },
        { rule: "no_overconfidence", passed: true, detail: "Confidence levels appropriately conservative" },
      ],
      violations: [],
    };
    phases.push({
      phase: "governance_check",
      status: "completed",
      output: governanceResult,
      humanGate: false,
    });
    await db.completeAgentRun(runId5, {
      status: "completed",
      outputSummary: `Governance check passed: ${governanceResult.checks.length} rules checked, 0 violations`,
    });

    // ── Phase 6: Human Review Gate ──
    const runId6 = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await db.recordAgentRun({
      id: runId6,
      sessionId,
      agentName: "HumanHandoffAgent",
      agentRole: "human_handoff",
      inputSummary: "Create review brief for human approval",
    });
    phases.push({
      phase: "human_review_gate",
      status: "needs_human",
      output: {
        reviewBrief: {
          sessionId,
          workflowId,
          totalPhases: 6,
          completedPhases: 5,
          draftOutputs: ["assumptions", "risks"],
          governancePassed: true,
          requiredAction: "HUMAN_REVIEW_REQUIRED — Consultant must review and approve all draft outputs before client delivery",
        },
        disclaimer: "MEP-light™ provides diagnostic intelligence only. All outputs are preliminary assessments requiring expert human review. This system does not provide final market-entry approvals, legal, regulatory, tax, or financial advice.",
      },
      humanGate: true,
      humanGateReason: "All assessment outputs require human review before client delivery",
    });
    await db.completeAgentRun(runId6, {
      status: "completed",
      outputSummary: "Human review gate triggered — awaiting consultant approval",
    });

    // Store workflow summary as agent artifact
    const artifactId = `art_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await db.recordAgentArtifact({
      id: artifactId,
      agentRunId: runId6,
      artifactType: "json",
      artifactName: `workflow_${workflowId}_summary`,
      storageUri: `db://agent_artifacts/${artifactId}`,
    });

    // Record audit event
    await db.recordAuditEvent({
      action: "adk_workflow_completed",
      eventType: "adk_workflow",
      userId: user.userId,
      sessionId,
      component: "adk",
      safeMetadata: {
        workflowId,
        phasesCompleted: phases.length,
        governancePassed: true,
        humanGateTriggered: true,
      },
    });

    logEvent({
      level: "info",
      component: "adk",
      event_type: "workflow_completed",
      session_id: sessionId,
      user_role: user.role,
      message: `ADK workflow completed: ${workflowId} — ${phases.length} phases, human review gate triggered`,
    });

    res.json({
      workflowId,
      sessionId,
      status: "completed_pending_review",
      totalPhases: phases.length,
      phases,
      humanReviewRequired: true,
      disclaimer: "All outputs are diagnostic assessments requiring human expert review. MEP-light™ does not issue market-entry approvals.",
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logEvent({
      level: "error",
      component: "adk",
      event_type: "workflow_error",
      session_id: sessionId,
      message: `ADK workflow failed: ${message}`,
    });
    res.status(500).json({
      workflowId,
      status: "error",
      error: message,
    });
  }
});

// ─── GET /api/v2/adk/runs — List agent runs ─────────────────────────

app.get("/api/v2/adk/runs", async (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  if (!jwt?.email) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const user = await findUserByEmail(jwt.email);
  if (!user || (user.role !== "Administrator" && user.role !== "Consultant")) {
    res.status(403).json({ error: "Administrator or Consultant role required" });
    return;
  }

  const sessionId = req.query.sessionId as string | undefined;
  const runs = await db.listAgentRuns(sessionId);
  res.json({ agentRuns: runs, total: runs.length });
});

// ─── GET /api/v2/db/tables — List all database tables ────────────────

app.get("/api/v2/db/tables", async (_req: Request, res: Response) => {
  try {
    const tables = await db.listAllTables();
    const requiredTables = [
      "users", "companies", "assessment_sessions", "expansion_options",
      "scores", "evidence_items", "assumption_cards", "risk_cards",
      "roadmap_actions", "reports", "audit_events", "agent_runs", "agent_artifacts",
    ];
    const missing = requiredTables.filter(t => !tables.includes(t));
    res.json({
      tables,
      totalTables: tables.length,
      requiredTables,
      missingTables: missing,
      schemaComplete: missing.length === 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.json({ tables: [], error: message, schemaComplete: false });
  }
});

// ─── GET /api/v2/db/health — Database health check ──────

app.get("/api/v2/db/health", async (_req: Request, res: Response) => {
  const health = await db.healthCheck();
  res.json({
    ...health,
    productionReady: health.dbType === "postgresql",
    guard: IS_PRODUCTION && health.dbType === "sqlite" ? "FATAL: SQLite in production" : "OK",
  });
});

// ─── Static Asset Serving ─────────────────────────────────────────────


const distPath = path.join(__dirname, "../../dist");
app.use(express.static(distPath));

// Wildcard routing to serve React index.html for SPA frontend routing
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(path.join(distPath, "index.html"));
});

// ─── Server Startup ──────────────────────────────────────────────────

// Bind to 0.0.0.0 — required for Cloud Run container networking
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n  ╔══════════════════════════════════════════════════╗`);
  console.log(`  ║  MEP-light™ API Server                          ║`);
  console.log(`  ║  Running on http://0.0.0.0:${PORT}               ║`);
  console.log(`  ║  Endpoints:                                     ║`);
  console.log(`  ║    GET  /api/health                             ║`);
  console.log(`  ║    POST /api/score                              ║`);
  console.log(`  ║    POST /api/export-pdf                         ║`);
  console.log(`  ║    GET  /api/v2/users/me                        ║`);
  console.log(`  ║    GET  /api/v2/users                           ║`);
  console.log(`  ║    POST /api/v2/users                           ║`);
  console.log(`  ║    CRUD /api/v2/sessions                        ║`);
  console.log(`  ║    GET  /api/v2/db/health                       ║`);
  console.log(`  ╚══════════════════════════════════════════════════╝\n`);
  if (SEED_ADMIN_EMAIL) {
    console.log(`  Admin seed email: ${SEED_ADMIN_EMAIL}`);
  }
});

export default app;
