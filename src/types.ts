export type EvidenceState = "Confirmed" | "Estimated" | "Unknown";

export type AppMode = "free-demo" | "facilitated" | "admin" | "demo" | "consultant";

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
}

export interface AppState {
  appMode: AppMode;
  currentStep: number;
  decisionSetup: DecisionSetup;
  companySnapshot: CompanySnapshot;
  productStrategy: ProductStrategy;
  shortlistedMarkets: string[]; // market IDs
  customMarkets: Market[]; // user-added markets
  marketScores: Record<string, MarketScoreInput>; // keyed by market ID
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
      "Test an existing product/offering in the target market with minimal adaptation.",
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
      "Test an existing offering after adapting it to local market needs, regulations, channels, or consumer expectations.",
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
  { id: 3, label: "Product Strategy", phase: "diagnostic" as const },
  { id: 4, label: "Potential Markets", phase: "diagnostic" as const },
  { id: 5, label: "Score & Evidence", phase: "diagnostic" as const },
  { id: 6, label: "Dashboard", phase: "diagnostic" as const },
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
    evidenceConfidence: "Low",
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
