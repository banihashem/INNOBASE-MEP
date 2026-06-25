export type EvidenceState = "Confirmed" | "Estimated" | "Unknown";

export type AppMode = "demo" | "consultant";

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

export type DecisionMode = "compare" | "assess_one" | "entry_mode" | "readiness";

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
  | "Past sales / direct evidence"
  | "Market reports"
  | "Expert judgment"
  | "Desk research / assumptions only";

export const EVIDENCE_BASIS_OPTIONS: EvidenceBasis[] = [
  "Past sales / direct evidence",
  "Market reports",
  "Expert judgment",
  "Desk research / assumptions only",
];

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
  targetGroups: string;
  likelyChannels: string;
  validationPriorities: string;
}

export const STRATEGY_PROFILES: StrategyProfile[] = [
  {
    id: "pantry",
    name: "Core Pantry Expansion",
    tagline: "Core Pantry",
    description:
      "Familiar food products for regional and ethnic retail. Low adaptation need, high operational feasibility.",
    targetGroups:
      "Diaspora communities, traditional trade shoppers, value-driven regional buyers",
    likelyChannels:
      "Specialty grocery stores, regional distributors, ethnic supermarkets",
    validationPriorities:
      "Verify local distributor margins and product shelf-life certification rules",
  },
  {
    id: "regional",
    name: "Regional Volume Expansion",
    tagline: "Regional Volume",
    description:
      "Products with higher familiarity in nearby geographic markets. Medium adaptation, high volume logic.",
    targetGroups:
      "Mainstream households, cost-conscious families, mass retailers",
    likelyChannels:
      "National retail chains, hypermarkets, bulk wholesalers",
    validationPriorities:
      "Assess cross-border logistics costs, customs clearance times, and trade promotion slotting fees",
  },
  {
    id: "innovation",
    name: "Innovation-Led Snack Expansion (Kashkam Profile)",
    tagline: "Innovation-Led",
    description:
      "New-to-market snack products with broader positioning potential. High brand transferability challenges, high adaptation need, requires partner-led validation.",
    targetGroups:
      "Gen Z & Millennials, health-conscious professionals, premium impulse shoppers",
    likelyChannels:
      "Convenience store chains, high-end organic grocers, direct-to-consumer digital channels",
    validationPriorities:
      "Test pricing elasticity against local alternatives, evaluate cold-chain or specialized storage requirements",
  },
];

export const DEFAULT_MARKETS: Market[] = [
  {
    id: "uae",
    name: "UAE",
    description:
      "Regional trade hub, premium retail, high competitor density.",
    isDefault: true,
  },
  {
    id: "iraq",
    name: "Iraq",
    description:
      "Regional proximity, cultural/product familiarity, volume potential.",
    isDefault: true,
  },
  {
    id: "germany",
    name: "Germany",
    description:
      "Diaspora and ethnic retail potential, but higher regulatory complexity.",
    isDefault: true,
  },
  {
    id: "canada",
    name: "Canada",
    description:
      "Diaspora-led validation potential and online/ethnic retail possibilities.",
    isDefault: true,
  },
  {
    id: "azerbaijan",
    name: "Azerbaijan",
    description:
      "Geographic closeness, cultural adjacency, manageable test market.",
    isDefault: true,
  },
];

export const STEPS = [
  { id: 1, label: "Decision Setup", phase: "diagnostic" as const },
  { id: 2, label: "Company Snapshot", phase: "diagnostic" as const },
  { id: 3, label: "Product Strategy", phase: "diagnostic" as const },
  { id: 4, label: "Market Shortlist", phase: "diagnostic" as const },
  { id: 5, label: "Score & Evidence", phase: "diagnostic" as const },
  { id: 6, label: "Dashboard", phase: "diagnostic" as const },
  { id: 7, label: "Roadmap", phase: "diagnostic" as const },
  { id: 8, label: "Product Prep", phase: "preparation" as const },
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
  marketAttractiveness: "Desk research / assumptions only",
  offeringFit: "Desk research / assumptions only",
  channelAccess: "Desk research / assumptions only",
  operationalFeasibility: "Desk research / assumptions only",
  strategicValue: "Desk research / assumptions only",
  financialLogic: "Desk research / assumptions only",
  brandTrustTransferability: "Desk research / assumptions only",
  competitiveIntensity: "Desk research / assumptions only",
  regulatoryComplexity: "Desk research / assumptions only",
};

// ─── Demo Scenario Scores ────────────────────────────────────────────
// Option A = UAE, Option B = Germany, Option C = Iraq,
// Option D = Canada, Option E = Azerbaijan
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
      marketAttractiveness: "Market reports",
      offeringFit: "Market reports",
      channelAccess: "Expert judgment",
      operationalFeasibility: "Expert judgment",
      strategicValue: "Market reports",
      financialLogic: "Market reports",
      brandTrustTransferability: "Expert judgment",
      competitiveIntensity: "Market reports",
      regulatoryComplexity: "Market reports",
    },
    evidenceBasis: "Market reports",
    evidenceConfidence: "Medium",
  },
  iraq: {
    marketId: "iraq",
    scores: {
      marketAttractiveness: 3,
      offeringFit: 4,
      channelAccess: 3,
      operationalFeasibility: 3,
      strategicValue: 3,
      financialLogic: 3,
      brandTrustTransferability: 4,
      competitiveIntensity: 3,
      regulatoryComplexity: 3,
    },
    dimensionEvidence: {
      marketAttractiveness: "Expert judgment",
      offeringFit: "Expert judgment",
      channelAccess: "Desk research / assumptions only",
      operationalFeasibility: "Expert judgment",
      strategicValue: "Expert judgment",
      financialLogic: "Expert judgment",
      brandTrustTransferability: "Expert judgment",
      competitiveIntensity: "Expert judgment",
      regulatoryComplexity: "Expert judgment",
    },
    evidenceBasis: "Expert judgment",
    evidenceConfidence: "Medium",
  },
  germany: {
    marketId: "germany",
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
      marketAttractiveness: "Market reports",
      offeringFit: "Desk research / assumptions only",
      channelAccess: "Expert judgment",
      operationalFeasibility: "Desk research / assumptions only",
      strategicValue: "Market reports",
      financialLogic: "Desk research / assumptions only",
      brandTrustTransferability: "Desk research / assumptions only",
      competitiveIntensity: "Market reports",
      regulatoryComplexity: "Market reports",
    },
    evidenceBasis: "Market reports",
    evidenceConfidence: "Medium",
  },
  canada: {
    marketId: "canada",
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
      marketAttractiveness: "Desk research / assumptions only",
      offeringFit: "Desk research / assumptions only",
      channelAccess: "Desk research / assumptions only",
      operationalFeasibility: "Desk research / assumptions only",
      strategicValue: "Desk research / assumptions only",
      financialLogic: "Desk research / assumptions only",
      brandTrustTransferability: "Desk research / assumptions only",
      competitiveIntensity: "Desk research / assumptions only",
      regulatoryComplexity: "Desk research / assumptions only",
    },
    evidenceBasis: "Desk research / assumptions only",
    evidenceConfidence: "Low",
  },
  azerbaijan: {
    marketId: "azerbaijan",
    scores: {
      marketAttractiveness: 2,
      offeringFit: 3,
      channelAccess: 4,
      operationalFeasibility: 4,
      strategicValue: 2,
      financialLogic: 3,
      brandTrustTransferability: 2,
      competitiveIntensity: 2,
      regulatoryComplexity: 2,
    },
    dimensionEvidence: {
      marketAttractiveness: "Expert judgment",
      offeringFit: "Expert judgment",
      channelAccess: "Expert judgment",
      operationalFeasibility: "Expert judgment",
      strategicValue: "Expert judgment",
      financialLogic: "Desk research / assumptions only",
      brandTrustTransferability: "Expert judgment",
      competitiveIntensity: "Expert judgment",
      regulatoryComplexity: "Expert judgment",
    },
    evidenceBasis: "Expert judgment",
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
  "Past sales / direct evidence": 95,
  "Market reports": 75,
  "Expert judgment": 55,
  "Desk research / assumptions only": 25,
};
