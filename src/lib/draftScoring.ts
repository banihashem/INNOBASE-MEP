/**
 * MEP-light™ — Draft Scoring Generator (Demo Scenario v0.2, item #17 / spec §8.2)
 *
 * Generates preliminary 1–5 draft scores for every market × dimension FROM THE
 * INFORMATION THE USER ENTERED (company snapshot, offering strategy, market
 * context notes, sector, evidence states). It is rule-based and fully
 * deterministic — it does NOT call an external model and invents no external
 * facts (directive §6.8: "based only on captured inputs and existing approved
 * model logic"). This is the "AI-assisted / rule-generated draft" the demo
 * documents (see docs/sdlc/demo_refinement_logic.md §1).
 *
 * All output is passed through validateDraftScores() — a strict schema that
 * guarantees every dimension is an integer in [1,5] before the caller accepts
 * it. Callers wrap generation in try/catch and surface a retryable error; a
 * failed/invalid generation must never write partial or fabricated scores.
 */

import {
  DimensionScores,
  EvidenceBasis,
  EvidenceState,
  DEFAULT_DIMENSION_EVIDENCE,
} from "../types";

export interface DraftContext {
  marketId: string;
  marketName: string;
  marketNote?: string;
  marketDescription?: string;
  sector?: string;
  /** Offering strategy id: 'replication' | 'adaptation' | 'development'. */
  offeringStrategy?: string;
  capabilities?: string;
  constraints?: string;
  domesticMarketSize?: string;
  evidenceStates?: Partial<Record<string, EvidenceState>>;
}

export interface DraftResult {
  scores: DimensionScores;
  dimensionEvidence: Record<keyof DimensionScores, EvidenceBasis>;
  evidenceConfidence: "High" | "Medium" | "Low" | "Unknown";
  /** Concise per-dimension input linkage (explainability, directive §6.8). */
  rationale: Partial<Record<keyof DimensionScores, string>>;
}

export class DraftScoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DraftScoreError";
  }
}

const DIMENSION_KEYS: (keyof DimensionScores)[] = [
  "marketAttractiveness",
  "offeringFit",
  "channelAccess",
  "operationalFeasibility",
  "strategicValue",
  "financialLogic",
  "brandTrustTransferability",
  "competitiveIntensity",
  "regulatoryComplexity",
];

/** Deterministic small hash of a string → integer, for stable per-market variation. */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function has(text: string | undefined, ...needles: string[]): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n));
}

/**
 * Strict schema validation: every dimension present, coerced to an integer,
 * clamped to [1,5]. Throws DraftScoreError on missing/NaN dimensions so a bad
 * generation never yields partial scores.
 */
export function validateDraftScores(raw: Partial<DimensionScores>): DimensionScores {
  const out = {} as DimensionScores;
  for (const key of DIMENSION_KEYS) {
    const v = (raw as any)[key];
    if (v === undefined || v === null || typeof v !== "number" || Number.isNaN(v)) {
      throw new DraftScoreError(`Draft score missing or invalid for dimension "${key}".`);
    }
    const clamped = Math.max(1, Math.min(5, Math.round(v)));
    out[key] = clamped;
  }
  return out;
}

/**
 * Derive a draft score set for one market from the entered information.
 * Positive dimensions rise on supporting signals; the two adverse dimensions
 * (competitiveIntensity, regulatoryComplexity) rise on risk signals (higher raw
 * = harder — the scoring engine inverts them). Values start neutral (3) and are
 * nudged by signal strength, then validated.
 */
export function generateDraftScores(ctx: DraftContext): DraftResult {
  const caps = ctx.capabilities || "";
  const cons = ctx.constraints || "";
  const marketText = `${ctx.marketName} ${ctx.marketDescription || ""} ${ctx.marketNote || ""}`;

  // Start neutral.
  const d: Record<keyof DimensionScores, number> = {
    marketAttractiveness: 3,
    offeringFit: 3,
    channelAccess: 3,
    operationalFeasibility: 3,
    strategicValue: 3,
    financialLogic: 3,
    brandTrustTransferability: 3,
    competitiveIntensity: 3,
    regulatoryComplexity: 3,
  };
  const rationale: Partial<Record<keyof DimensionScores, string>> = {};
  const note = (k: keyof DimensionScores, msg: string) => {
    rationale[k] = rationale[k] ? `${rationale[k]}; ${msg}` : msg;
  };

  // ── Capabilities (strengths) ──
  if (has(caps, "brand", "reputation")) { d.brandTrustTransferability += 1; note("brandTrustTransferability", "brand strength cited"); }
  if (has(caps, "distribut", "channel", "partner", "network")) { d.channelAccess += 1; note("channelAccess", "distribution/partner capability cited"); }
  if (has(caps, "export")) { d.operationalFeasibility += 1; note("operationalFeasibility", "export experience cited"); }
  if (has(caps, "production", "capacity", "manufactur", "supply")) { d.operationalFeasibility += 1; note("operationalFeasibility", "production capacity cited"); }
  if (has(caps, "technolog", "proprietary", "know-how", "patent", "ip")) { d.offeringFit += 1; d.strategicValue += 1; note("offeringFit", "proprietary/technical assets cited"); }
  if (has(caps, "financial", "capital", "funding", "reserve")) { d.financialLogic += 1; note("financialLogic", "financial resources cited"); }
  if (has(caps, "certif", "compliance", "approved")) { d.regulatoryComplexity -= 1; note("regulatoryComplexity", "existing certifications reduce barriers"); }

  // ── Constraints (vulnerabilities) ──
  if (has(cons, "regulat", "compliance", "certif", "licens", "import rule")) { d.regulatoryComplexity += 1; note("regulatoryComplexity", "regulatory uncertainty cited"); }
  if (has(cons, "budget", "cost", "pricing pressure", "margin", "capital")) { d.financialLogic -= 1; note("financialLogic", "budget/margin pressure cited"); }
  if (has(cons, "logistic", "shipping", "supply", "freight")) { d.operationalFeasibility -= 1; note("operationalFeasibility", "logistics complexity cited"); }
  if (has(cons, "brand", "unfamiliar", "recognition", "awareness")) { d.brandTrustTransferability -= 1; note("brandTrustTransferability", "low brand recognition cited"); }
  if (has(cons, "partner access", "weak partner", "channel", "route")) { d.channelAccess -= 1; note("channelAccess", "weak partner/channel access cited"); }
  if (has(cons, "capacity gap", "internal", "team", "resource")) { d.operationalFeasibility -= 1; note("operationalFeasibility", "internal capacity gap cited"); }
  if (has(cons, "competit", "saturat", "incumben")) { d.competitiveIntensity += 1; note("competitiveIntensity", "competition cited as a constraint"); }
  if (has(cons, "evidence", "unknown", "uncertain")) { d.marketAttractiveness -= 0; /* affects confidence, not score */ }

  // ── Offering strategy ──
  switch (ctx.offeringStrategy) {
    case "replication":
      d.operationalFeasibility += 1; d.offeringFit -= 1;
      note("operationalFeasibility", "replication is the fastest test"); note("offeringFit", "minimal adaptation may reduce local fit");
      break;
    case "adaptation":
      d.offeringFit += 1; d.regulatoryComplexity += 1;
      note("offeringFit", "localized adaptation improves fit"); note("regulatoryComplexity", "adaptation adds compliance work");
      break;
    case "development":
      d.offeringFit += 1; d.strategicValue += 1; d.operationalFeasibility -= 1; d.financialLogic -= 1;
      note("offeringFit", "market-specific development maximises fit"); note("financialLogic", "development requires more investment");
      break;
  }

  // ── Sector baselines (spec §13 emphasis) ──
  switch (ctx.sector) {
    case "Food & Beverage":
      d.regulatoryComplexity += 1; d.operationalFeasibility -= 1;
      note("regulatoryComplexity", "F&B carries food regulation/shelf-life risk");
      break;
    case "Mobility & Logistics":
      d.operationalFeasibility -= 1; d.regulatoryComplexity += 1;
      note("operationalFeasibility", "mobility/logistics is infrastructure-heavy");
      break;
    case "SaaS & Digital Platforms":
      d.channelAccess += 1; d.operationalFeasibility += 1; d.strategicValue += 1;
      note("channelAccess", "digital channels ease reach"); note("strategicValue", "SaaS scalability adds strategic value");
      break;
    case "Consumer Goods & Retail":
      d.competitiveIntensity += 1;
      note("competitiveIntensity", "consumer retail is competitively dense");
      break;
  }

  // ── Market context signals ──
  if (has(marketText, "regulat", "complex", "compliance", "stringent")) { d.regulatoryComplexity += 1; note("regulatoryComplexity", "market-specific regulatory signal"); }
  if (has(marketText, "competit", "saturat", "density", "premium retail")) { d.competitiveIntensity += 1; note("competitiveIntensity", "high competitor density in market"); }
  if (has(marketText, "demand", "growth", "attractive", "large", "hub", "purchasing power")) { d.marketAttractiveness += 1; note("marketAttractiveness", "demand/growth signal in market"); }
  if (has(marketText, "gateway", "hub", "corridor", "trade")) { d.strategicValue += 1; note("strategicValue", "gateway/trade-hub potential"); }
  if (has(marketText, "purchasing power", "premium", "high income")) { d.financialLogic += 1; note("financialLogic", "high purchasing power supports economics"); }

  // ── Deterministic per-market variation (stable, ±1 spread) ──
  const h = hash(ctx.marketId || ctx.marketName);
  const jitterKeys: (keyof DimensionScores)[] = ["marketAttractiveness", "channelAccess", "financialLogic"];
  jitterKeys.forEach((k, i) => {
    const delta = ((h >> (i * 2)) % 3) - 1; // -1, 0, or 1
    d[k] += delta;
  });

  const scores = validateDraftScores(d);

  // ── Evidence confidence from evidence-state completeness ──
  const states = Object.values(ctx.evidenceStates || {}) as EvidenceState[];
  const confirmed = states.filter((x) => x === "Confirmed").length;
  const toValidate = states.filter((x) => x === "To Validate" || x === "Unknown").length;
  const filledText = [caps, cons, ctx.domesticMarketSize].filter((t) => (t || "").trim().length > 0).length;
  let evidenceConfidence: DraftResult["evidenceConfidence"] = "Low";
  if (confirmed >= 3 && filledText >= 2) evidenceConfidence = "High";
  else if (confirmed >= 1 || filledText >= 2) evidenceConfidence = "Medium";
  else if (toValidate >= 3 || filledText === 0) evidenceConfidence = "Low";

  // ── Per-dimension evidence basis: default Expert Judgment; upgrade where inputs are stronger ──
  const dimensionEvidence: Record<keyof DimensionScores, EvidenceBasis> = { ...DEFAULT_DIMENSION_EVIDENCE };
  if (has(caps, "export", "sales", "data", "pilot", "customer")) {
    dimensionEvidence.marketAttractiveness = "Direct Evidence";
    dimensionEvidence.channelAccess = "Direct Evidence";
  }
  if (has(marketText, "report", "research", "study", "trade data")) {
    dimensionEvidence.marketAttractiveness = "Market Reports";
    dimensionEvidence.competitiveIntensity = "Market Reports";
  }

  return { scores, dimensionEvidence, evidenceConfidence, rationale };
}

/** The exact draft-scoring disclaimer required by spec §8.2. */
export const DRAFT_SCORE_DISCLAIMER =
  "These are draft scores generated from the information provided. Please review and adjust them where your evidence or judgment suggests a different assessment.";
