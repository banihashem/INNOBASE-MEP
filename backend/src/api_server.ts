/**
 * MEP-light™ — Mock API Server
 * 
 * Express-based API endpoint for receiving scoring payloads and
 * returning calculated comparative dashboards, ranking tables,
 * tier classifications, and assumption cards.
 * 
 * Endpoints:
 *   GET  /api/health  — Health check
 *   POST /api/score   — Full scoring pipeline
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Cloud Run injects PORT env var; API_PORT is our local override
const PORT = parseInt(process.env.PORT || process.env.API_PORT || "3001");

// CORS — allow cross-origin requests from the frontend
app.use((_req: Request, res: Response, next: Function) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
    version: "3.0.0",
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

// ─── PDF Export Proxy Route ──────────────────────────────────────────

app.post("/api/export-pdf", async (req: Request, res: Response) => {
  try {
    const pdfServiceUrl = process.env.PDF_SERVICE_URL || "http://localhost:5001";
    console.log(`Forwarding PDF generation request to ${pdfServiceUrl}/api/export-pdf`);
    
    const response = await fetch(`${pdfServiceUrl}/api/export-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PDF service returned status ${response.status}: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=MEP-light_Report.pdf");
    res.setHeader("Content-Length", buffer.length.toString());
    res.send(buffer);
  } catch (error: any) {
    console.error("Error generating PDF via service proxy:", error);
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
  console.log(`  ║  MEP-light™ Scoring Engine API                  ║`);
  console.log(`  ║  Running on http://0.0.0.0:${PORT}               ║`);
  console.log(`  ║  Endpoints:                                     ║`);
  console.log(`  ║    GET  /api/health                             ║`);
  console.log(`  ║    POST /api/score                              ║`);
  console.log(`  ╚══════════════════════════════════════════════════╝\n`);
});

export default app;
