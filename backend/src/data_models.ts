/**
 * MEP-light™ — Canonical Data Models
 * 
 * Single source of truth for all TypeScript interfaces used across
 * the scoring engine, API layer, and frontend state management.
 * 
 * Aligned with the MEP-light™ Concept Layer Charter:
 *  - Clarify Preparedness, Do Not Predict Success
 *  - Separation of Evidence from Uncertainty
 */

// ─── Evidence & Confidence ───────────────────────────────────────────

/** Evidence basis source — how was this information gathered? */
export type EvidenceBasis =
  | "Internal experience"
  | "Market reports"
  | "Expert judgment"
  | "Desk research / assumptions only";

/** Qualitative confidence level assigned per market */
export type EvidenceConfidenceLevel = "High" | "Medium" | "Low" | "Unknown";

/** 
 * Detailed confidence rating labels used in reports.
 * Maps 1:1 with EvidenceConfidenceLevel for display purposes.
 */
export type EvidenceConfidenceLabel =
  | "Reliable"           // High
  | "Needs Validation"   // Medium
  | "Assumption-Based"   // Low
  | "Evidence Gap";      // Unknown

/** Evidence state for individual company snapshot fields */
export type EvidenceState = "Confirmed" | "Estimated" | "Unknown";

// ─── Company & Offering Profiles ─────────────────────────────────────

export interface CompanyProfile {
  businessName: string;
  sector: string;
  internalCapabilities: string;
  knownConstraints: string;
  /** Per-field evidence states track data maturity */
  evidenceStates: {
    businessName: EvidenceState;
    sector: EvidenceState;
    internalCapabilities: EvidenceState;
    knownConstraints: EvidenceState;
  };
}

export interface OfferingProfile {
  offeringName: string;
  /** Strategy model IDs (e.g. "pantry", "regional", "innovation") */
  selectedStrategies: string[];
}

// ─── Market Definitions ──────────────────────────────────────────────

export interface Market {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
}

/** The canonical 5-market comparison set */
export const DEFAULT_MARKETS: Market[] = [
  { id: "uae",        name: "UAE",        description: "Regional trade hub, premium retail, high competitor density.", isDefault: true },
  { id: "iraq",       name: "Iraq",       description: "Regional proximity, high cultural familiarity, volume potential.", isDefault: true },
  { id: "germany",    name: "Germany",    description: "Largest European market, stringent standards, complex distribution.", isDefault: true },
  { id: "canada",     name: "Canada",     description: "Bilingual packaging compliance, high distance, high purchasing power.", isDefault: true },
  { id: "azerbaijan", name: "Azerbaijan", description: "Emerging CIS node, friendly trade terms, direct land corridors.", isDefault: true },
];

// ─── Scoring Dimensions ─────────────────────────────────────────────

/** 
 * Raw dimension scores — all values are integers 1 to 5.
 * competitiveIntensity and regulatoryComplexity are "negative" dimensions:
 *   higher raw = worse for the business.
 */
export interface DimensionScores {
  marketAttractiveness: number;       // 1-5, positive
  offeringFit: number;                // 1-5, positive
  channelAccess: number;              // 1-5, positive
  operationalFeasibility: number;     // 1-5, positive
  strategicValue: number;             // 1-5, positive
  financialLogic: number;             // 1-5, positive
  brandTrustTransferability: number;  // 1-5, positive
  competitiveIntensity: number;       // 1-5, NEGATIVE (higher = harder)
  regulatoryComplexity: number;       // 1-5, NEGATIVE (higher = harder)
}

/** All dimension keys for iteration */
export const DIMENSION_KEYS: (keyof DimensionScores)[] = [
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

/** Negative dimension keys (require inversion via 6 - rawScore) */
export const NEGATIVE_DIMENSIONS: (keyof DimensionScores)[] = [
  "competitiveIntensity",
  "regulatoryComplexity",
];

// ─── Market Score Input ──────────────────────────────────────────────

/** Input payload for a single market's scoring assessment */
export interface MarketScoreInput {
  marketId: string;
  scores: DimensionScores;
  evidenceBasis: EvidenceBasis | string;
  evidenceConfidence: EvidenceConfidenceLevel;
}

// ─── Calculated Output Models ────────────────────────────────────────

/** Intermediate category sub-scores (on the 1–5 scale) */
export interface CategoryScores {
  opportunity: number;     // (MarketAttractiveness * 0.70) + (AdjustedCompetitive * 0.30)
  offeringFit: number;     // (OfferingFit * 0.65) + (BrandTrust * 0.35)
  feasibility: number;     // (ChannelAccess * 0.35) + (AdjustedRegulatory * 0.30) + (OpFeasibility * 0.35)
  strategic: number;       // StrategicValue (pass-through)
  financial: number;       // FinancialLogic (pass-through)
}

/** Tier classification for a market */
export type TierClassification =
  | "Tier A: Priority"
  | "Tier B: Promising"
  | "Tier C: Do not prioritize"
  | "Tier D: Exclude from current agenda";

/** Risk exposure level */
export type RiskLevel = "High" | "Medium" | "Low";

/** Warning flags that can be attached to a scoring result */
export interface ScoringWarning {
  code: string;
  message: string;
  severity: "critical" | "warning" | "info";
}

/** Complete scoring result for a single market */
export interface ScoringResult {
  marketId: string;
  marketName: string;

  // Adjusted dimensions
  adjustedCompetitiveIntensity: number;
  adjustedRegulatoryComplexity: number;

  // Category sub-scores (1–5 scale)
  categoryScores: CategoryScores;

  // Composite score (0–100)
  expansionPotentialScore: number;

  // Risk assessment
  riskExposure: number;           // average of raw negative dimensions (1–5)
  riskLevel: RiskLevel;

  // Evidence confidence (0–100 numeric)
  evidenceConfidenceScore: number;
  evidenceConfidenceLevel: EvidenceConfidenceLevel;
  evidenceConfidenceLabel: EvidenceConfidenceLabel;

  // Classification
  tier: TierClassification;
  warnings: ScoringWarning[];

  // Source evidence
  evidenceBasis: string;
}

/** Comparative dashboard output — multiple markets ranked */
export interface ComparativeDashboard {
  companyName: string;
  offeringName: string;
  generatedAt: string;              // ISO 8601 timestamp
  results: ScoringResult[];         // sorted descending by expansionPotentialScore
  topPriority: ScoringResult | null;
}

// ─── Decision Setup ──────────────────────────────────────────────────

export type DecisionMode = "compare" | "assess_one" | "entry_mode";

export interface DecisionSetup {
  decisionMode: DecisionMode;
  expansionHorizon: string;
  strategicObjective: string;
}

// ─── Validation Roadmap ──────────────────────────────────────────────

export interface RoadmapPhase {
  phase: number;
  label: string;
  dayRange: string;
  coreObjective: string;
  keyActions: string[];
  requiredEvidence: string;
  decisionGate: string;
}

export interface ValidationRoadmap {
  marketId: string;
  marketName: string;
  companyName: string;
  offeringName: string;
  advisoryStatement: string;
  phases: RoadmapPhase[];
}

// ─── Strategic Assumptions ───────────────────────────────────────────

export type AssumptionCategory = "Demand" | "Channel Access" | "Financial Margins" | "Adaptation";

export interface StrategicAssumption {
  id: string;
  category: AssumptionCategory;
  text: string;
  confidence: "High" | "Medium" | "Low";
  validationAction: string;
}

// ─── Session State (Full Persist/Restore) ────────────────────────────

export interface SessionState {
  sessionId: string;
  createdAt: string;                     // ISO 8601
  updatedAt: string;                     // ISO 8601
  currentStep: number;
  decisionSetup: DecisionSetup;
  companyProfile: CompanyProfile;
  offeringProfile: OfferingProfile;
  shortlistedMarketIds: string[];
  customMarkets: Market[];
  marketScores: Record<string, MarketScoreInput>;
  consultantNotes: string;
  // Computed outputs (populated after scoring)
  dashboard?: ComparativeDashboard;
  roadmap?: ValidationRoadmap;
  assumptions?: StrategicAssumption[];
}

// ─── API Request/Response Types ──────────────────────────────────────

/** POST /api/score request body */
export interface ScoreRequest {
  companyName: string;
  offeringName: string;
  markets: {
    id: string;
    name: string;
  }[];
  marketScores: Record<string, MarketScoreInput>;
}

/** POST /api/score response body */
export interface ScoreResponse {
  success: boolean;
  dashboard: ComparativeDashboard;
  errors?: string[];
}
