// Evidence quality states (spec 5.3). "To Validate" is the canonical third state;
// "Unknown" is retained as a backward-compatible legacy alias for persisted v4.3.7
// sessions and is normalized to "To Validate" on hydration + display.
export type EvidenceState = "Confirmed" | "Estimated" | "To Validate" | "Unknown";

/** Canonical display label for an evidence state (maps legacy "Unknown" → "To Validate"). */
export function evidenceStateLabel(state: EvidenceState): "Confirmed" | "Estimated" | "To Validate" {
  return state === "Confirmed" ? "Confirmed" : state === "Estimated" ? "Estimated" : "To Validate";
}

export type AppMode = "free-demo" | "facilitated" | "admin" | "demo" | "consultant";

/**
 * Single source of truth for the client-facing demo label (spec item #24).
 * Centralized to avoid the prior 6-way duplication + casing drift.
 * Retained as "MEP-light Beta Demo v1.6" until a separate release decision authorizes another label.
 */
export const CLIENT_FACING_LABEL = "MEP-light Beta Demo v1.6";
export const CLIENT_FACING_LABEL_SHORT = "Beta Demo v1.6";

// ─── Active demo sectors (spec §13) ──────────────────────────────────
/** Sectors with defined scoring emphasis — selectable in the free demo. */
export const ACTIVE_SECTORS = [
  "Consumer Goods & Retail",
  "Food & Beverage",
  "Mobility & Logistics",
  "SaaS & Digital Platforms",
] as const;

/** Sectors shown as disabled "Coming soon" — scoring prompts/risk logic not yet defined (spec §13.1). */
export const COMING_SOON_SECTORS = [
  "Financial Services & Fintech",
  "Healthcare & Medtech",
  "Media & Entertainment",
  "Tourism & Hospitality",
] as const;

export type ActiveSector = (typeof ACTIVE_SECTORS)[number];

// ─── Desired Output choices (spec 4.2) ───────────────────────────────
export const DESIRED_OUTPUT_OPTIONS = [
  "Ranking dashboard",
  "Strategic recommendation",
  "Validation roadmap",
  "Executive brief",
] as const;

/**
 * Config-driven contact destination for the Step 7 → full/Pro CTAs
 * (Request Full Assessment / Book Market Expansion Sprint / Contact INNOBASE).
 * Intentionally empty: no approved external delivery endpoint exists in this repo.
 * When empty, the CTAs are presentational only and DO NOT claim any message is sent.
 * A future governed change may set this to an approved INNOBASE address to enable a mailto.
 */
export const INNOBASE_CONTACT_EMAIL = "";

/** Full/Pro modules previewed (locked) after Step 7 (spec §11). */
export const FULL_PRO_MODULES: { name: string; purpose: string }[] = [
  { name: "Entry Readiness Workspace", purpose: "Prepares the selected offering and market pathway for deeper validation or controlled entry." },
  { name: "Regulatory & Compliance", purpose: "Assesses regulatory, certification, legal, and institutional readiness." },
  { name: "Offering & Localization", purpose: "Defines adjustments to product, service, bundle, claims, messaging, or delivery model." },
  { name: "Commercial & Pricing", purpose: "Tests pricing, margin, channel economics, cost-to-serve, and investment requirements." },
  { name: "Packaging / Delivery / Operations", purpose: "Reviews packaging, logistics, delivery, service capacity, operational needs, and after-sales requirements." },
  { name: "Channel & Partner Readiness", purpose: "Assesses partner qualification, route-to-market feasibility, channel roles, and commercial terms." },
  { name: "Executive Report Preparation", purpose: "Generates exportable decision briefs and consultant-reviewed outputs." },
];

export interface CompanySnapshot {
  businessName: string;
  sector: string;
  domesticMarketSize: string;
  exportExperience: string;
  internalCapabilities: string;
  knownConstraints: string;
  evidenceStates: {
    businessName: EvidenceState;
    sector: EvidenceState;
    domesticMarketSize: EvidenceState;
    exportExperience: EvidenceState;
    internalCapabilities: EvidenceState;
    knownConstraints: EvidenceState;
  };
}

export type DecisionMode = "New Market Entry Readiness" | "Existing Market Expansion Readiness" | "compare" | "assess_one" | "entry_mode" | "readiness";

export interface DecisionSetup {
  decisionMode: DecisionMode;
  expansionHorizon: string;
  strategicObjective: string;
  /** Selected desired-output types (spec 4.2). Optional for backward compatibility. */
  desiredOutput?: string[];
}

export interface ProductStrategy {
  offeringName: string;
  selectedStrategy: string; // Single strategy ID
  customAdaptationNotes: string;
}

export interface Market {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  type?: "Country" | "Market Bloc" | "Region";
}

export interface DimensionScores {
  marketAttractiveness: number;
  offeringFit: number;
  channelAccess: number;
  operationalFeasibility: number;
  strategicValue: number;
  financialLogic: number;
  brandTrustTransferability: number;
  competitiveIntensity: number; // negative dimension (higher is worse)
  regulatoryComplexity: number; // negative dimension (higher is worse)
}

/** Canonical list of all 9 scoring dimensions. */
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

export type EvidenceBasis =
  | "Direct Evidence"
  | "Market Reports"
  | "Expert Judgment";

export const EVIDENCE_BASIS_OPTIONS: EvidenceBasis[] = [
  "Direct Evidence",
  "Market Reports",
  "Expert Judgment",
];

/** Descriptive tooltips for each evidence basis category */
export const EVIDENCE_BASIS_DESCRIPTIONS: Record<EvidenceBasis, string> = {
  "Direct Evidence":
    "Supported by internal data, sales history, customer/partner interviews, or pilot results.",
  "Market Reports":
    "Supported by published research, trade databases, or industry studies.",
  "Expert Judgment":
    "Based on advisory expertise, management experience, or informed interpretation.",
};

export interface MarketScoreInput {
  marketId: string;
  scores: DimensionScores;
  dimensionEvidence: Record<keyof DimensionScores, EvidenceBasis>;
  evidenceBasis: string;
  evidenceConfidence: "High" | "Medium" | "Low" | "Unknown";
  /** Tracks which dimensions were manually adjusted from draft scores */
  userAdjusted?: Partial<Record<keyof DimensionScores, boolean>>;
  /** Whether draft scores have been generated for this market */
  draftGenerated?: boolean;
}

/** Returns true iff the MarketScoreInput contains valid scores for all 9 dimensions. */
export function isCompleteScoreSet(msi: MarketScoreInput | undefined): boolean {
  if (!msi || !msi.scores) return false;
  return DIMENSION_KEYS.every((k) => {
    const v = msi.scores[k];
    return typeof v === "number" && v >= 1 && v <= 5;
  });
}

export interface AppState {
  appMode: AppMode;
  currentStep: number;
  decisionSetup: DecisionSetup;
  companySnapshot: CompanySnapshot;
  productStrategy: ProductStrategy;
  selectedMarketIds: string[]; // market IDs (runtime name; legacy snapshots used shortlistedMarkets)
  customMarkets: Market[]; // user-added markets
  marketScores: Record<string, MarketScoreInput>; // keyed by market ID
  /** Per-market context notes (spec 7.4), keyed by market ID. Covers default + custom markets. */
  marketNotes: Record<string, string>;
  consultantNotes: string;
}

export interface StrategyProfile {
  id: string;
  name: string;
  tagline: string;
  description: string;
  bestUsed: string;
  targetGroups: string;
  likelyChannels: string;
  validationPriorities: string;
}

export const STRATEGY_PROFILES: StrategyProfile[] = [
  {
    id: "replication",
    name: "Core Offering Replication",
    tagline: "Replication",
    description:
      "Test an existing product, service, or offering in the target market with minimal adaptation.",
    bestUsed:
      "Best used when the offering already has demand signals, diaspora appeal, or clear transferability.",
    targetGroups:
      "Example: end consumers, business buyers, early adopters",
    likelyChannels:
      "Example: distributors, retail, direct sales",
    validationPriorities:
      "Example: demand, pricing, regulatory fit",
  },
  {
    id: "adaptation",
    name: "Localized Offering Adaptation",
    tagline: "Adaptation",
    description:
      "Test an existing offering after adapting it to local market needs, regulations, channels, or customer expectations.",
    bestUsed:
      "Best used when local customer behavior or price sensitivity require modification.",
    targetGroups:
      "Example: end consumers, business buyers, early adopters",
    likelyChannels:
      "Example: distributors, retail, direct sales",
    validationPriorities:
      "Example: demand, pricing, regulatory fit",
  },
  {
    id: "development",
    name: "Market-Specific Offering Development",
    tagline: "Development",
    description:
      "Test a newly developed, bundled, reformulated, or repositioned offering designed specifically for the target market.",
    bestUsed:
      "Best used when existing offerings are insufficient but internal capabilities translate well.",
    targetGroups:
      "Example: end consumers, business buyers, early adopters",
    likelyChannels:
      "Example: distributors, retail, direct sales",
    validationPriorities:
      "Example: demand, pricing, regulatory fit",
  },
];

export const DEFAULT_MARKETS: Market[] = [
  {
    id: "uae",
    name: "UAE",
    description:
      "Regional trade hub, premium retail, high competitor density.",
    isDefault: true,
    type: "Country",
  },
  {
    id: "eu",
    name: "EU",
    description:
      "Large single market with harmonized regulations and diverse consumer segments.",
    isDefault: true,
    type: "Market Bloc",
  },
  {
    id: "north-america",
    name: "North America",
    description:
      "High purchasing power, mature distribution infrastructure, competitive landscape.",
    isDefault: true,
    type: "Region",
  },
];

export const STEPS = [
  { id: 1, label: "Decision Setup", phase: "diagnostic" as const },
  { id: 2, label: "Company Snapshot", phase: "diagnostic" as const },
  { id: 3, label: "Offering Strategy Selection", phase: "diagnostic" as const },
  { id: 4, label: "Potential Markets", phase: "diagnostic" as const },
  { id: 5, label: "Strategic Metric Scoring", phase: "diagnostic" as const },
  { id: 6, label: "Comparative Dashboard", phase: "diagnostic" as const },
  { id: 7, label: "Roadmap", phase: "diagnostic" as const },
  { id: 8, label: "Entry Readiness", phase: "preparation" as const },
];

// ─── Product Preparation Space Types ─────────────────────

export interface IngredientCheckItem {
  id: string;
  name: string;
  category: "preservative" | "coloring" | "gelatin" | "additive" | "allergen";
  status: "OK" | "WARNING" | "BLOCKED";
  note: string;
}

export const KNOWN_INGREDIENT_FLAGS: IngredientCheckItem[] = [
  { id: "ing-1", name: "Porcine Gelatin", category: "gelatin", status: "BLOCKED", note: "Not permitted in halal-certified markets. Must use bovine or plant-based alternative." },
  { id: "ing-2", name: "Bovine Gelatin (Halal Certified)", category: "gelatin", status: "OK", note: "Acceptable with valid halal certification documentation." },
  { id: "ing-3", name: "E102 Tartrazine", category: "coloring", status: "WARNING", note: "Permitted but requires mandatory warning label in UAE/GCC. Restricted in some EU markets." },
  { id: "ing-4", name: "E120 Carmine (Cochineal)", category: "coloring", status: "BLOCKED", note: "Insect-derived. Not halal-compliant. Blocked in GCC markets." },
  { id: "ing-5", name: "E211 Sodium Benzoate", category: "preservative", status: "WARNING", note: "Permitted under GCC limits (max 150 mg/kg in beverages). Requires declaration." },
  { id: "ing-6", name: "BHA (Butylated Hydroxyanisole)", category: "preservative", status: "WARNING", note: "Permitted in limited concentrations. Must declare on label. Flagged by MoCCAE." },
  { id: "ing-7", name: "BHT (Butylated Hydroxytoluene)", category: "preservative", status: "WARNING", note: "Permitted with concentration limits. Under review in several Middle East markets." },
  { id: "ing-8", name: "Alcohol-based Flavoring Extract", category: "additive", status: "BLOCKED", note: "Ethanol content >0.5% is prohibited in GCC food products." },
  { id: "ing-9", name: "Tree Nuts", category: "allergen", status: "WARNING", note: "Must declare as major allergen on both Arabic and English labels." },
  { id: "ing-10", name: "Soy Lecithin", category: "allergen", status: "OK", note: "Commonly used emulsifier. Must declare soy as allergen." },
];

export interface RegulatoryChecklist {
  halalCertification: boolean;
  arabicLabelApproved: boolean;
  nutritionalPanelBilingual: boolean;
  allergenDisclosure: boolean;
  shelfLifeLabeling: boolean;
  importPermitFiled: boolean;
  moccaeRegistration: boolean;
  adafsaCompliance: boolean;
}

export interface ShelfLifeCalculation {
  totalShelfLifeDays: number;
  oceanTransitDays: number;
  customsClearanceDays: number;
  localWarehousingBuffer: number;
  netUsableShelfLife: number;
  percentageRemaining: number;
  indicator: "GREEN" | "AMBER" | "RED";
}

export type TransitMode = "ambient" | "chilled" | "frozen";

export interface MoqCalculation {
  factoryMoq: number;
  trialOrderVolume: number;
  packagingPremiumRate: number; // e.g., 0.15 = 15%
  marginImpactPercent: number;
  shortRunUnits: number;
}

export interface LandedCostWaterfall {
  exwUnitPrice: number;
  oceanFreightPerUnit: number;
  insurancePercent: number;
  cifPrice: number;
  customsDutyPercent: number;
  dutyAmount: number;
  localClearanceFee: number;
  landedCost: number;
  distributorMarginPercent: number;
  distributorPrice: number;
  retailMarkupPercent: number;
  retailShelfPrice: number;
}

// Default evidence record for a new dimension set
export const DEFAULT_DIMENSION_EVIDENCE: Record<
  keyof DimensionScores,
  EvidenceBasis
> = {
  marketAttractiveness: "Expert Judgment",
  offeringFit: "Expert Judgment",
  channelAccess: "Expert Judgment",
  operationalFeasibility: "Expert Judgment",
  strategicValue: "Expert Judgment",
  financialLogic: "Expert Judgment",
  brandTrustTransferability: "Expert Judgment",
  competitiveIntensity: "Expert Judgment",
  regulatoryComplexity: "Expert Judgment",
};

// ─── Demo Scenario Scores ────────────────────────────────────────────
// Option A = UAE, Option B = EU, Option C = North America
export const DEMO_MARKET_SCORES: Record<string, MarketScoreInput> = {
  uae: {
    marketId: "uae",
    scores: {
      marketAttractiveness: 4,
      offeringFit: 4,
      channelAccess: 4,
      operationalFeasibility: 4,
      strategicValue: 3,
      financialLogic: 4,
      brandTrustTransferability: 4,
      competitiveIntensity: 3,
      regulatoryComplexity: 2,
    },
    dimensionEvidence: {
      marketAttractiveness: "Market Reports",
      offeringFit: "Market Reports",
      channelAccess: "Expert Judgment",
      operationalFeasibility: "Expert Judgment",
      strategicValue: "Market Reports",
      financialLogic: "Market Reports",
      brandTrustTransferability: "Expert Judgment",
      competitiveIntensity: "Market Reports",
      regulatoryComplexity: "Market Reports",
    },
    evidenceBasis: "Market Reports",
    evidenceConfidence: "Medium",
  },
  eu: {
    marketId: "eu",
    scores: {
      marketAttractiveness: 5,
      offeringFit: 3,
      channelAccess: 3,
      operationalFeasibility: 3,
      strategicValue: 5,
      financialLogic: 3,
      brandTrustTransferability: 3,
      competitiveIntensity: 5,
      regulatoryComplexity: 3,
    },
    dimensionEvidence: {
      marketAttractiveness: "Market Reports",
      offeringFit: "Expert Judgment",
      channelAccess: "Expert Judgment",
      operationalFeasibility: "Expert Judgment",
      strategicValue: "Market Reports",
      financialLogic: "Expert Judgment",
      brandTrustTransferability: "Expert Judgment",
      competitiveIntensity: "Market Reports",
      regulatoryComplexity: "Market Reports",
    },
    evidenceBasis: "Market Reports",
    evidenceConfidence: "Medium",
  },
  "north-america": {
    marketId: "north-america",
    scores: {
      marketAttractiveness: 4,
      offeringFit: 3,
      channelAccess: 2,
      operationalFeasibility: 2,
      strategicValue: 5,
      financialLogic: 2,
      brandTrustTransferability: 2,
      competitiveIntensity: 5,
      regulatoryComplexity: 5,
    },
    dimensionEvidence: {
      marketAttractiveness: "Expert Judgment",
      offeringFit: "Expert Judgment",
      channelAccess: "Expert Judgment",
      operationalFeasibility: "Expert Judgment",
      strategicValue: "Expert Judgment",
      financialLogic: "Expert Judgment",
      brandTrustTransferability: "Expert Judgment",
      competitiveIntensity: "Expert Judgment",
      regulatoryComplexity: "Expert Judgment",
    },
    evidenceBasis: "Expert Judgment",
    evidenceConfidence: "Medium",
  },
};

// Confidence score mapping for evidence confidence aggregation
export const CONFIDENCE_SCORE_MAP: Record<string, number> = {
  High: 90,
  Medium: 60,
  Low: 30,
  Unknown: 10,
};

// Evidence basis quality mapping (for per-dimension aggregation)
export const EVIDENCE_BASIS_SCORE_MAP: Record<string, number> = {
  "Direct Evidence": 95,
  "Market Reports": 75,
  "Expert Judgment": 55,
};
