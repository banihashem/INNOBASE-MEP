/**
 * MEP-light™ — Shared Front-End Scoring Library (Demo Scenario v0.2)
 *
 * Single source of truth for the demo dashboard math, previously duplicated
 * between App.tsx (calculatedResults → Export Brief / PDF payload) and
 * ComparativeDashboardScreen.tsx (on-screen table). Centralizing removes the
 * drift risk flagged in the v0.2 gap analysis and adds three spec features:
 *
 *   1. Granular letter grades for the Tier column (spec 9.4): 77 → "A-".
 *   2. Sector-specific category weighting (spec §13) — the "Diagnostic Weight
 *      Framework - [Business Type] Model".
 *   3. Cautious, validation-oriented per-option Recommended Action (spec 9.4).
 *
 * Potential, Evidence Confidence, and Risk Exposure are computed INDEPENDENTLY
 * and are never blended into one another (spec 9.1 separation requirement).
 *
 * The base (default) weights reproduce the accepted v4.3.7 math exactly, so a
 * market scored with no/unknown sector is identical to the prior behaviour.
 */

import {
  DimensionScores,
  MarketScoreInput,
  EVIDENCE_BASIS_SCORE_MAP,
  CONFIDENCE_SCORE_MAP,
  EvidenceBasis,
} from "../types";

// ─── Category weights ────────────────────────────────────────────────

export interface CategoryWeights {
  opportunity: number;
  fit: number;
  feasibility: number;
  strategic: number;
  financial: number;
}

/** Base weights — identical to the accepted v4.3.7 model (opp .25 / fit .20 / feas .25 / strat .10 / fin .20). */
export const BASE_WEIGHTS: CategoryWeights = {
  opportunity: 0.25,
  fit: 0.2,
  feasibility: 0.25,
  strategic: 0.1,
  financial: 0.2,
};

/**
 * Sector-specific weighting profiles (spec §13 scoring emphasis).
 * Each vector sums to 1.0 (verified by unit test). Tilts are modest so the
 * ranking logic stays comparable while reflecting each sector's emphasis.
 */
export const SECTOR_WEIGHTS: Record<string, CategoryWeights> = {
  // Customer appeal, channel access, price positioning, brand transferability, retail feasibility, competition.
  "Consumer Goods & Retail": { opportunity: 0.28, fit: 0.22, feasibility: 0.25, strategic: 0.05, financial: 0.2 },
  // Taste fit, shelf life, regulation, distributor access, packaging, pricing, logistics, channel feasibility.
  "Food & Beverage": { opportunity: 0.2, fit: 0.22, feasibility: 0.3, strategic: 0.08, financial: 0.2 },
  // Operational feasibility, infrastructure, partner access, regulation, cost-to-serve, route density, reliability.
  "Mobility & Logistics": { opportunity: 0.18, fit: 0.15, feasibility: 0.35, strategic: 0.1, financial: 0.22 },
  // Pain-point intensity, digital adoption, localization, compliance, acquisition cost, sales cycle, scalability.
  "SaaS & Digital Platforms": { opportunity: 0.28, fit: 0.18, feasibility: 0.19, strategic: 0.15, financial: 0.2 },
};

/** Resolve the weight profile for a sector, falling back to base weights. */
export function resolveSectorWeights(sector?: string): CategoryWeights {
  if (sector && SECTOR_WEIGHTS[sector]) return SECTOR_WEIGHTS[sector];
  return BASE_WEIGHTS;
}

// ─── Letter grade (spec 9.4 display layer) ───────────────────────────

export type LetterGrade = "A" | "A-" | "B+" | "B" | "B-" | "C" | "D";

/**
 * Granular letter grade for the dashboard "Tier" column.
 * Spec 9.4 example: 77 → "A-", 68/65/61 → "B", 54 → "B-".
 * Bands: >=80 A · 75-79 A- · 70-74 B+ · 60-69 B · 50-59 B- · 40-49 C · <40 D.
 */
export function letterGrade(score: number): LetterGrade {
  if (score >= 80) return "A";
  if (score >= 75) return "A-";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "B-";
  if (score >= 40) return "C";
  return "D";
}

// ─── Recommended Action (spec 9.4, cautious/validation-oriented) ─────

/**
 * Cautious, validation-oriented next step per option. Never an unconditional
 * "enter this market" recommendation. A low-confidence hypothesis (high
 * potential, weak evidence) is called out explicitly.
 */
export function recommendedAction(
  potentialScore: number,
  evidenceConfidenceScore: number,
  discrepancyAlert: boolean
): string {
  if (discrepancyAlert || (potentialScore > 70 && evidenceConfidenceScore < 50)) {
    return "Treat as a low-confidence hypothesis — strengthen evidence before any commitment.";
  }
  if (potentialScore >= 75) return "Validate key assumptions and prepare controlled entry planning.";
  if (potentialScore >= 68) return "Run focused validation before commitment.";
  if (potentialScore >= 62) return "Pilot selectively if strategically relevant.";
  if (potentialScore >= 55) return "Use only as a low-cost learning option.";
  return "Do not prioritize now; monitor for future.";
}

// ─── Market result ───────────────────────────────────────────────────

export interface MarketResult {
  marketId: string;
  name: string;
  opportunity: number;
  fit: number;
  feasibility: number;
  potentialScore: number;
  riskExposure: number;
  riskLevel: "High" | "Medium" | "Low";
  tier: "Tier A: Priority" | "Tier B: Promising" | "Tier C: Do not prioritize" | "Tier D: Exclude from current agenda";
  letterGrade: LetterGrade;
  recommendedAction: string;
  confidence: "High" | "Medium" | "Low" | "Unknown";
  evidenceBasis: string;
  evidenceConfidenceScore: number;
  mainStrength: string;
  mainWeakness: string;
  discrepancyAlert: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  marketAttractiveness: "Market Attractiveness",
  offeringFit: "Offering Fit",
  channelAccess: "Channel Access",
  operationalFeasibility: "Operational Feasibility",
  strategicValue: "Strategic Value",
  financialLogic: "Financial Logic",
  brandTrustTransferability: "Brand Transferability",
};

const BLANK_SCORES: DimensionScores = {
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

/** Invert an adverse (negative) dimension: 6 - raw (higher raw = worse → lower adjusted). */
export function invertAdverse(raw: number): number {
  return 6 - raw;
}

/**
 * Compute the full result for one market. Weights default to BASE_WEIGHTS
 * (v4.3.7 parity) unless a sector profile is supplied.
 */
export function computeMarketResult(
  marketId: string,
  name: string,
  input: MarketScoreInput | undefined,
  weights: CategoryWeights = BASE_WEIGHTS
): MarketResult {
  const src = input?.scores ?? BLANK_SCORES;
  const s: DimensionScores = { ...BLANK_SCORES, ...src };

  // Invert adverse dimensions (spec: adverse dims must not be accidentally rewarded).
  const adjCompetitive = invertAdverse(s.competitiveIntensity);
  const adjRegulatory = invertAdverse(s.regulatoryComplexity);

  // Category sub-scores (1–5 scale)
  const opportunity = s.marketAttractiveness * 0.7 + adjCompetitive * 0.3;
  const fit = s.offeringFit * 0.65 + s.brandTrustTransferability * 0.35;
  const feasibility =
    s.channelAccess * 0.35 + adjRegulatory * 0.3 + s.operationalFeasibility * 0.35;

  // Expansion Potential Score (0–100), sector-weighted.
  const weightedAverage =
    opportunity * weights.opportunity +
    fit * weights.fit +
    feasibility * weights.feasibility +
    s.strategicValue * weights.strategic +
    s.financialLogic * weights.financial;
  const potentialScore = Math.round(weightedAverage * 20);

  // Risk Exposure (independent) — raw adverse-dimension average (1–5).
  const riskExposure = (s.competitiveIntensity + s.regulatoryComplexity) / 2;
  let riskLevel: "High" | "Medium" | "Low" = "Medium";
  if (riskExposure >= 3.8) riskLevel = "High";
  else if (riskExposure <= 2.2) riskLevel = "Low";

  // Evidence Confidence Score (independent) — 60% per-dimension basis quality + 40% overall.
  const dimEvidence = input?.dimensionEvidence || ({} as Record<string, string>);
  const dimKeys = Object.keys(s) as Array<keyof DimensionScores>;
  const evidenceScores = dimKeys.map(
    (k) => EVIDENCE_BASIS_SCORE_MAP[(dimEvidence as any)[k] || "Expert Judgment"] || 55
  );
  const avgDimEvidence = evidenceScores.reduce((a, b) => a + b, 0) / evidenceScores.length;
  const overallConfScore = CONFIDENCE_SCORE_MAP[input?.evidenceConfidence || "Low"] || 30;
  const evidenceConfidenceScore = Math.round(avgDimEvidence * 0.6 + overallConfScore * 0.4);

  // Discrepancy: high potential but weak evidence (spec confidence decoupling).
  const discrepancyAlert = potentialScore > 70 && evidenceConfidenceScore < 50;

  // Coarse tier (kept for confidence decoupling / compatibility with PDF).
  let tier: MarketResult["tier"] = "Tier C: Do not prioritize";
  if (discrepancyAlert) tier = "Tier B: Promising";
  else if (potentialScore >= 75) tier = "Tier A: Priority";
  else if (potentialScore >= 60) tier = "Tier B: Promising";
  else if (potentialScore < 40) tier = "Tier D: Exclude from current agenda";

  // Main strength / weakness from positive dimensions only.
  const positiveDims = [
    { key: "marketAttractiveness", score: s.marketAttractiveness },
    { key: "offeringFit", score: s.offeringFit },
    { key: "channelAccess", score: s.channelAccess },
    { key: "operationalFeasibility", score: s.operationalFeasibility },
    { key: "strategicValue", score: s.strategicValue },
    { key: "financialLogic", score: s.financialLogic },
    { key: "brandTrustTransferability", score: s.brandTrustTransferability },
  ].sort((a, b) => b.score - a.score);
  const mainStrength = CATEGORY_LABELS[positiveDims[0].key] || positiveDims[0].key;
  const mainWeakness =
    CATEGORY_LABELS[positiveDims[positiveDims.length - 1].key] ||
    positiveDims[positiveDims.length - 1].key;

  return {
    marketId,
    name,
    opportunity,
    fit,
    feasibility,
    potentialScore,
    riskExposure,
    riskLevel,
    tier,
    letterGrade: letterGrade(potentialScore),
    recommendedAction: recommendedAction(potentialScore, evidenceConfidenceScore, discrepancyAlert),
    confidence: input?.evidenceConfidence || "Low",
    evidenceBasis: input?.evidenceBasis || "Expert Judgment",
    evidenceConfidenceScore,
    mainStrength,
    mainWeakness,
    discrepancyAlert,
  };
}

/**
 * Canonically derives the overall categorical confidence (High/Medium/Low)
 * from the underlying per-dimension evidence sources.
 */
export function computeEvidenceConfidence(
  dimEvidence?: Record<keyof DimensionScores, string | EvidenceBasis>
): "High" | "Medium" | "Low" {
  if (!dimEvidence) return "Low";
  const scores = Object.values(dimEvidence).map(
    (basis) => EVIDENCE_BASIS_SCORE_MAP[basis as string] ?? 30
  );
  if (scores.length === 0) return "Low";
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 85) return "High";
  if (avg >= 55) return "Medium";
  return "Low";
}

