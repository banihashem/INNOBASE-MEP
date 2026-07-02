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

// Load environment variables from .env file (local/dev)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Cloud Run injects PORT env var; API_PORT is our local override
const PORT = parseInt(process.env.PORT || process.env.API_PORT || "3001");

// CORS — allow cross-origin requests from the frontend
app.use((_req: Request, res: Response, next: Function) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());

// Request ID middleware for log correlation
app.use((_req: Request, res: Response, next: Function) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader("X-Request-ID", requestId);
  (res as any).requestId = requestId;
  next();
});

// Response time logging
app.use((req: Request, res: Response, next: Function) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log(`[SLOW] ${req.method} ${req.path} — ${duration}ms`);
    }
  });
  next();
});

// ─── Health Check ────────────────────────────────────────────────────

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "MEP-light™ Scoring Engine API",
    version: "3.1.0",
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

app.post("/api/export-pdf", async (req: Request, res: Response) => {
  try {
    console.log("Generating PDF report natively...");
    const pdfBuffer = await generatePdf(req.body);

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

// ─── In-Memory User Store ───────────────────────────────────────────

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

const userStore = new Map<string, UserRecord>();

// Seed admin user from environment variable
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "";

function findUserByEmail(email: string): UserRecord | undefined {
  for (const user of userStore.values()) {
    if (user.email.toLowerCase() === email.toLowerCase()) return user;
  }
  return undefined;
}

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Auto-provision a user from JWT payload.
 * If the user's email matches SEED_ADMIN_EMAIL, assign Administrator role.
 */
function autoProvisionUser(jwt: JwtUser): UserRecord {
  const existing = findUserByEmail(jwt.email);
  if (existing) {
    // Update last login
    existing.lastLoginAt = new Date().toISOString();
    existing.totalSessions += 1;
    existing.updatedAt = new Date().toISOString();
    // Update avatar/name if changed
    if (jwt.picture && jwt.picture !== existing.avatarUrl) existing.avatarUrl = jwt.picture;
    if (jwt.name && jwt.name !== existing.displayName) existing.displayName = jwt.name;
    return existing;
  }

  const isAdmin = SEED_ADMIN_EMAIL && jwt.email.toLowerCase() === SEED_ADMIN_EMAIL.toLowerCase();
  const now = new Date().toISOString();

  const newUser: UserRecord = {
    userId: generateUserId(),
    email: jwt.email,
    displayName: jwt.name || jwt.email.split("@")[0],
    avatarUrl: jwt.picture || "",
    role: isAdmin ? "Administrator" : "Consultant",
    status: "active",
    companyName: "",
    department: "",
    title: "",
    notes: "",
    totalSessions: 1,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  };

  userStore.set(newUser.userId, newUser);
  console.log(`[User] Auto-provisioned: ${newUser.email} as ${newUser.role}`);
  return newUser;
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

// ─── GET /api/v2/users/me — Current User Profile ────────────────────

// Demo mode: only enabled via explicit env var (local dev).
// In production (Cloud Run), this defaults to false.
const DEMO_MODE = process.env.DEMO_MODE === "true";

app.get("/api/v2/users/me", (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);

  // Valid JWT present → auto-provision and return real user
  if (jwt && jwt.email) {
    const user = autoProvisionUser(jwt);
    res.json({ user: sanitizeUser(user) });
    return;
  }

  // No valid JWT — in demo mode, return a demo user (local dev only)
  if (DEMO_MODE) {
    const demoEmail = "consultant@innobase.app";
    let demo = findUserByEmail(demoEmail);
    if (!demo) {
      demo = autoProvisionUser({
        email: demoEmail,
        name: "Strategy Consultant",
        picture: "",
        sub: "demo-user-id",
      });
    }
    res.json({ user: sanitizeUser(demo) });
    return;
  }

  // Production: reject unauthenticated requests
  res.status(401).json({
    error: "Authentication required. Please sign in with Google.",
  });
});

// ─── GET /api/v2/users/stats — User Statistics (Admin) ──────────────

app.get("/api/v2/users/stats", (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  const caller = jwt?.email ? findUserByEmail(jwt.email) : null;
  if (!caller || !isAdmin(caller)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const byRole: Record<string, number> = {};
  const statuses = new Set<string>();
  for (const u of userStore.values()) {
    byRole[u.role] = (byRole[u.role] || 0) + 1;
    statuses.add(u.status);
  }

  res.json({
    total: userStore.size,
    byRole,
    roles: ["Administrator", "Consultant", "Viewer"],
    statuses: Array.from(statuses),
  });
});

// ─── GET /api/v2/users — List Users (Admin) ─────────────────────────

app.get("/api/v2/users", (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  const caller = jwt?.email ? findUserByEmail(jwt.email) : null;
  if (!caller || !isAdmin(caller)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const q = (req.query.q as string || "").toLowerCase();
  const roleFilter = req.query.role as string || "";
  const statusFilter = req.query.status as string || "";
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  let users = Array.from(userStore.values());

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

app.post("/api/v2/users", (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  const caller = jwt?.email ? findUserByEmail(jwt.email) : null;
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
  if (findUserByEmail(email)) {
    res.status(409).json({ error: "User with this email already exists" });
    return;
  }

  const now = new Date().toISOString();
  const newUser: UserRecord = {
    userId: generateUserId(),
    email,
    displayName: displayName || email.split("@")[0],
    avatarUrl: "",
    role: role || "Consultant",
    status: "invited",
    companyName: companyName || "",
    department: department || "",
    title: title || "",
    notes: "",
    totalSessions: 0,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };

  userStore.set(newUser.userId, newUser);
  console.log(`[User] Created by admin: ${newUser.email} as ${newUser.role}`);
  res.status(201).json({ success: true, user: sanitizeUser(newUser) });
});

// ─── GET /api/v2/users/:id — Get User by ID (Admin) ─────────────────

app.get("/api/v2/users/:id", (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  const caller = jwt?.email ? findUserByEmail(jwt.email) : null;
  if (!caller || !isAdmin(caller)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const user = userStore.get(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user: sanitizeUser(user) });
});

// ─── PATCH /api/v2/users/:id — Update User (Admin) ──────────────────

app.patch("/api/v2/users/:id", (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  const caller = jwt?.email ? findUserByEmail(jwt.email) : null;
  if (!caller || !isAdmin(caller)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const user = userStore.get(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { displayName, role, status, companyName, department, title, notes } = req.body;
  if (displayName !== undefined) user.displayName = displayName;
  if (role !== undefined) user.role = role;
  if (status !== undefined) user.status = status;
  if (companyName !== undefined) user.companyName = companyName;
  if (department !== undefined) user.department = department;
  if (title !== undefined) user.title = title;
  if (notes !== undefined) user.notes = notes;
  user.updatedAt = new Date().toISOString();

  console.log(`[User] Updated by admin: ${user.email} → role=${user.role}, status=${user.status}`);
  res.json({ success: true, user: sanitizeUser(user) });
});

// ─── DELETE /api/v2/users/:id — Deactivate User (Admin) ─────────────

app.delete("/api/v2/users/:id", (req: Request, res: Response) => {
  const jwt = extractJwtUser(req);
  const caller = jwt?.email ? findUserByEmail(jwt.email) : null;
  if (!caller || !isAdmin(caller)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const user = userStore.get(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  user.status = "deactivated";
  user.updatedAt = new Date().toISOString();

  console.log(`[User] Deactivated by admin: ${user.email}`);
  res.json({ success: true, user: sanitizeUser(user) });
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
  console.log(`  ╚══════════════════════════════════════════════════╝\n`);
  if (SEED_ADMIN_EMAIL) {
    console.log(`  Admin seed email: ${SEED_ADMIN_EMAIL}`);
  }
});

export default app;
