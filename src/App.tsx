import React, { useState, useMemo, useEffect, lazy, Suspense, useCallback, useRef } from "react";
import {
  AppMode,
  DecisionSetup,
  CompanySnapshot,
  ProductStrategy,
  Market,
  DimensionScores,
  MarketScoreInput,
  EvidenceBasis,
  DEFAULT_MARKETS,
  DEFAULT_DIMENSION_EVIDENCE,
  DEMO_MARKET_SCORES,
} from "./types";
import { AuthProvider, useAuth } from "./lib/auth";
import type { AuthUser } from "./lib/auth";
import { ToastProvider, useToast } from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import LandingPage from "./components/LandingPage";
import "./landing.css";
import StepProgress from "./components/StepProgress";
import ConsultantNotes from "./components/ConsultantNotes";
import StepSkeleton from "./components/StepSkeleton";
import SessionManager from "./components/SessionManager";
import { usePersistedState, upsertSessionMeta, generateSessionId, deleteSession as deleteSessionFromStorage } from "./hooks/usePersistedState";
import { initTelemetry, track } from "./lib/telemetry";
import { apiClient } from "./lib/apiClient";

// Lazy-loaded step components for code splitting
const DecisionSetupScreen = lazy(() => import("./components/DecisionSetupScreen"));
const CompanySnapshotScreen = lazy(() => import("./components/CompanySnapshotScreen"));
const ProductStrategyScreen = lazy(() => import("./components/ProductStrategyScreen"));
const MarketShortlistScreen = lazy(() => import("./components/MarketShortlistScreen"));
const ScoringEvidenceScreen = lazy(() => import("./components/ScoringEvidenceScreen"));
const ComparativeDashboardScreen = lazy(() => import("./components/ComparativeDashboardScreen"));
const RoadmapScreen = lazy(() => import("./components/RoadmapScreen"));
const ExportBriefModal = lazy(() => import("./components/ExportBriefModal"));
const EntryReadinessWorkspace = lazy(() => import("./components/EntryReadinessWorkspace"));
const AdminPanel = lazy(() => import("./components/AdminPanel"));
import UserProfileMenu from "./components/UserProfileMenu";

import { CalculatedResult } from "./components/ComparativeDashboardScreen";
import {
  ChevronLeft,
  ChevronRight,
  Beaker,
  BriefcaseBusiness,
  FolderOpen,
  Save,
} from "lucide-react";
import {
  EVIDENCE_BASIS_SCORE_MAP,
  CONFIDENCE_SCORE_MAP,
} from "./types";

// ─── Demo Scenario Defaults ──────────────────────────────
const DEMO_DECISION_SETUP: DecisionSetup = {
  decisionMode: "compare",
  expansionHorizon: "12 months",
  strategicObjective:
    "Identify the most practical growth opportunity that can be validated quickly and scaled if early signals are positive",
};

const DEMO_COMPANY_SNAPSHOT: CompanySnapshot = {
  businessName: "Client Company",
  sector: "Food & Beverage Manufacturing",
  domesticMarketSize: "$15M annual revenue, 8% market share",
  exportExperience: "Limited/Indirect Exporting",
  internalCapabilities:
    "Modular packaging lines, proprietary shelf-life extension technology",
  knownConstraints:
    "High initial shipping costs, limited localized brand recognition",
  evidenceStates: {
    businessName: "Confirmed",
    sector: "Confirmed",
    domesticMarketSize: "Estimated",
    exportExperience: "Confirmed",
    internalCapabilities: "Estimated",
    knownConstraints: "Estimated",
  },
};

const DEMO_PRODUCT_STRATEGY: ProductStrategy = {
  offeringName: "Selected Offering",
  selectedStrategy: "replication",
  customAdaptationNotes: "",
};

const BLANK_COMPANY_SNAPSHOT: CompanySnapshot = {
  businessName: "",
  sector: "Food & Beverage Manufacturing",
  domesticMarketSize: "",
  exportExperience: "No Experience",
  internalCapabilities: "",
  knownConstraints: "",
  evidenceStates: {
    businessName: "Unknown",
    sector: "Estimated",
    domesticMarketSize: "Unknown",
    exportExperience: "Unknown",
    internalCapabilities: "Unknown",
    knownConstraints: "Unknown",
  },
};

// ─── App Root ─────────────────────────────────────────────────────

export default function App() {
  // Initialize telemetry on mount
  useEffect(() => {
    initTelemetry();
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <ErrorBoundary fallbackTitle="MEP-light™ encountered an error">
          <AppRouter />
        </ErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  );
}

function AppRouter() {
  const { user, isAuthenticated, isLoading, signIn, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage onSignIn={(user, token) => signIn(user, token)} isAuthenticated={false} />;
  }

  return <AuthenticatedApp authUser={user} onSignOut={signOut} />;
}

// ─── Authenticated App (Wizard) ───────────────────────────────────
function AuthenticatedApp({ authUser, onSignOut }: { authUser: AuthUser | null; onSignOut: () => void }) {
  const toast = useToast();
  const [sessionId, setSessionId] = useState<string>(() => {
    // If there's a last active session in localStorage, we can use it, else generate new
    const lastActive = localStorage.getItem("mep_last_session_id");
    return lastActive || generateSessionId();
  });
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [appMode, setAppMode] = useState<AppMode>("demo");
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<number>(1);
  const [exportBriefOpen, setExportBriefOpen] = useState(false);
  const [showPrepPhase, setShowPrepPhase] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [prepMarketId, setPrepMarketId] = useState<string>("uae");
  const [reviewStatus, setReviewStatus] = useState<string>("pending");

  // Core states — pre-populated with demo data
  const [decisionSetup, setDecisionSetup] =
    useState<DecisionSetup>(DEMO_DECISION_SETUP);

  const [companySnapshot, setCompanySnapshot] =
    useState<CompanySnapshot>(DEMO_COMPANY_SNAPSHOT);

  const [productStrategy, setProductStrategy] =
    useState<ProductStrategy>(DEMO_PRODUCT_STRATEGY);

  const [selectedMarketIds, setSelectedMarketIds] = useState<string[]>([
    "uae",
    "eu",
    "north-america",
  ]);

  const [customMarkets, setCustomMarkets] = useState<Market[]>([]);

  const [marketScores, setMarketScores] =
    useState<Record<string, MarketScoreInput>>(DEMO_MARKET_SCORES);

  const [selectedRoadmapMarketId, setSelectedRoadmapMarketId] =
    useState<string>("uae");

  const [consultantNotes, setConsultantNotes] = useState<string>(
    "Strategic Workshop Notes — June 2026\nInitial assessment session with the executive team."
  );

  // ─── Mode Toggle ────────────────────────────────────────
  const handleModeToggle = () => {
    if (appMode === "demo") {
      // Switch to Consultant — clear all data
      setAppMode("consultant");
      setDecisionSetup({
        decisionMode: "compare",
        expansionHorizon: "12 months",
        strategicObjective: "",
      });
      setCompanySnapshot(BLANK_COMPANY_SNAPSHOT);
      setProductStrategy({
        offeringName: "",
        selectedStrategy: "replication",
        customAdaptationNotes: "",
      });
      setSelectedMarketIds([]);
      setCustomMarkets([]);
      setMarketScores({});
      setConsultantNotes("");
      setCurrentStep(1);
      setMaxUnlockedStep(1);
    } else {
      // Switch to Demo — restore demo data
      setAppMode("demo");
      setDecisionSetup(DEMO_DECISION_SETUP);
      setCompanySnapshot(DEMO_COMPANY_SNAPSHOT);
      setProductStrategy(DEMO_PRODUCT_STRATEGY);
      setSelectedMarketIds([
        "uae",
        "eu",
        "north-america",
      ]);
      setCustomMarkets([]);
      setMarketScores(DEMO_MARKET_SCORES);
      setConsultantNotes(
        "Strategic Workshop Notes — June 2026\nInitial assessment session."
      );
      setCurrentStep(1);
      setMaxUnlockedStep(1);
    }
  };

  // Computed
  const allMarkets = useMemo(
    () => [...DEFAULT_MARKETS, ...customMarkets],
    [customMarkets]
  );

  const activeSelectedMarkets = useMemo(
    () => allMarkets.filter((m) => selectedMarketIds.includes(m.id)),
    [allMarkets, selectedMarketIds]
  );

  // ─── Validation ─────────────────────────────────────────
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return (
          !!decisionSetup.expansionHorizon.trim() &&
          !!decisionSetup.strategicObjective.trim()
        );
      case 2:
        return !!companySnapshot.businessName.trim();
      case 3:
        return (
          !!productStrategy.offeringName.trim() &&
          !!productStrategy.selectedStrategy
        );
      case 4:
        return (
          selectedMarketIds.length >= 3 &&
          selectedMarketIds.length <= 5
        );
      case 5:
        return activeSelectedMarkets.every(
          (m) => !!marketScores[m.id]
        );
      case 6:
      case 7:
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < 7 && isStepValid(currentStep)) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setMaxUnlockedStep((prev) => Math.max(prev, nextStep));
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleStepClick = (stepId: number) => {
    if (stepId <= maxUnlockedStep) setCurrentStep(stepId);
  };

  // ─── State Handlers ─────────────────────────────────────
  const handleUpdateDecisionSetup = (
    newData: Partial<DecisionSetup>
  ) => {
    setDecisionSetup((prev) => ({ ...prev, ...newData }));
  };

  const handleUpdateCompanySnapshot = (
    newData: Partial<CompanySnapshot>
  ) => {
    setCompanySnapshot((prev) => ({ ...prev, ...newData }));
  };

  const handleUpdateProductStrategy = (
    newData: Partial<ProductStrategy>
  ) => {
    setProductStrategy((prev) => ({ ...prev, ...newData }));
  };

  const handleToggleMarketSelection = (marketId: string) => {
    setSelectedMarketIds((prev) =>
      prev.includes(marketId)
        ? prev.filter((id) => id !== marketId)
        : [...prev, marketId]
    );
  };

  const handleAddCustomMarket = (
    name: string,
    description: string
  ) => {
    const newId = `custom-${Date.now()}`;
    const newMarket: Market = {
      id: newId,
      name,
      description,
      isDefault: false,
    };
    setCustomMarkets((prev) => [...prev, newMarket]);
    setSelectedMarketIds((prev) => [...prev, newId]);
    setMarketScores((prev) => ({
      ...prev,
      [newId]: {
        marketId: newId,
        scores: {
          marketAttractiveness: 3,
          offeringFit: 3,
          channelAccess: 3,
          operationalFeasibility: 3,
          strategicValue: 3,
          financialLogic: 3,
          brandTrustTransferability: 3,
          competitiveIntensity: 3,
          regulatoryComplexity: 3,
        },
        dimensionEvidence: { ...DEFAULT_DIMENSION_EVIDENCE },
        evidenceBasis: "Expert Judgment",
        evidenceConfidence: "Low",
      },
    }));
  };

  const handleDeleteCustomMarket = (marketId: string) => {
    setCustomMarkets((prev) =>
      prev.filter((m) => m.id !== marketId)
    );
    setSelectedMarketIds((prev) =>
      prev.filter((id) => id !== marketId)
    );
    setMarketScores((prev) => {
      const updated = { ...prev };
      delete updated[marketId];
      return updated;
    });
  };

  const handleUpdateMarketDescription = (
    marketId: string,
    newDesc: string
  ) => {
    setCustomMarkets((prev) =>
      prev.map((m) =>
        m.id === marketId ? { ...m, description: newDesc } : m
      )
    );
  };

  const handleUpdateScores = (
    marketId: string,
    scoresToUpdate: Partial<DimensionScores>
  ) => {
    setMarketScores((prev) => {
      const current = prev[marketId] || {
        marketId,
        scores: {
          marketAttractiveness: 3,
          offeringFit: 3,
          channelAccess: 3,
          operationalFeasibility: 3,
          strategicValue: 3,
          financialLogic: 3,
          brandTrustTransferability: 3,
          competitiveIntensity: 3,
          regulatoryComplexity: 3,
        },
        dimensionEvidence: { ...DEFAULT_DIMENSION_EVIDENCE },
        evidenceBasis: "Expert Judgment",
        evidenceConfidence: "Low",
      };
      return {
        ...prev,
        [marketId]: {
          ...current,
          scores: { ...current.scores, ...scoresToUpdate },
        },
      };
    });
  };

  const handleUpdateEvidence = (
    marketId: string,
    basis: string,
    confidence: MarketScoreInput["evidenceConfidence"]
  ) => {
    setMarketScores((prev) => {
      const current = prev[marketId] || {
        marketId,
        scores: {
          marketAttractiveness: 3,
          offeringFit: 3,
          channelAccess: 3,
          operationalFeasibility: 3,
          strategicValue: 3,
          financialLogic: 3,
          brandTrustTransferability: 3,
          competitiveIntensity: 3,
          regulatoryComplexity: 3,
        },
        dimensionEvidence: { ...DEFAULT_DIMENSION_EVIDENCE },
      };
      return {
        ...prev,
        [marketId]: {
          ...current,
          evidenceBasis: basis,
          evidenceConfidence: confidence,
        },
      };
    });
  };

  const handleUpdateDimensionEvidence = (
    marketId: string,
    dimension: keyof DimensionScores,
    basis: EvidenceBasis
  ) => {
    setMarketScores((prev) => {
      const current = prev[marketId];
      if (!current) return prev;
      return {
        ...prev,
        [marketId]: {
          ...current,
          dimensionEvidence: {
            ...current.dimensionEvidence,
            [dimension]: basis,
          },
        },
      };
    });
  };

  const handleSelectPrimaryMarketForRoadmap = (marketId: string) => {
    setSelectedRoadmapMarketId(marketId);
    setCurrentStep(7);
    setMaxUnlockedStep((prev) => Math.max(prev, 7));
  };

  const handleProceedToPrep = () => {
    const targetMarket = selectedRoadmapMarketId || (activeSelectedMarkets.length > 0 ? activeSelectedMarkets[0].id : "uae");
    setPrepMarketId(targetMarket);
    setShowPrepPhase(true);
    setCurrentStep(8);
    setMaxUnlockedStep((prev) => Math.max(prev, 8));
  };

  const handleBackToDiagnostic = () => {
    setCurrentStep(7);
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true);
    try {
      const payload = {
        companyName: companySnapshot.businessName,
        sector: companySnapshot.sector,
        domesticMarketSize: companySnapshot.domesticMarketSize,
        exportExperience: companySnapshot.exportExperience,
        internalCapabilities: companySnapshot.internalCapabilities,
        knownConstraints: companySnapshot.knownConstraints,
        offeringName: productStrategy.offeringName,
        selectedStrategy: productStrategy.selectedStrategy,
        decisionMode: decisionSetup.decisionMode,
        expansionHorizon: decisionSetup.expansionHorizon,
        strategicObjective: decisionSetup.strategicObjective,
        results: calculatedResults,
        selectedRoadmapMarketId,
        consultantNotes,
        sessionId,
        draft: reviewStatus !== "approved",
      };
      const resp = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error("PDF generation failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MEP-light_${companySnapshot.businessName.replace(/\s+/g, "_")}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
      alert("PDF generation service is not available. Please ensure the PDF service is running on port 5001.");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // ─── Auto-save session to server ──────────────────────────────
  const stateSnapshotRef = useRef<any>(null);
  useEffect(() => {
    stateSnapshotRef.current = {
      appMode,
      currentStep,
      maxUnlockedStep,
      decisionSetup,
      companySnapshot,
      productStrategy,
      selectedMarketIds,
      customMarkets,
      marketScores,
      selectedRoadmapMarketId,
      consultantNotes,
    };
  }, [
    appMode, currentStep, maxUnlockedStep, decisionSetup, companySnapshot,
    productStrategy, selectedMarketIds, customMarkets, marketScores,
    selectedRoadmapMarketId, consultantNotes
  ]);

  useEffect(() => {
    if (appMode === "demo") return;

    const timer = setTimeout(async () => {
      try {
        const payload = {
          id: sessionId,
          title: companySnapshot.businessName || "Untitled Assessment",
          companyName: companySnapshot.businessName,
          offeringName: productStrategy.offeringName,
          status: currentStep >= 7 ? "completed" : "in_progress",
          currentStep,
          completionPercent: Math.round((Math.max(currentStep - 1, 0) / 7) * 100),
          stateSnapshot: JSON.stringify(stateSnapshotRef.current),
        };
        
        try {
          await apiClient.sessions.update(sessionId, payload);
        } catch (err: any) {
          if (err.status === 404 || err.message?.includes('not found')) {
            const newSession = await apiClient.sessions.create(payload);
            if (newSession && newSession.sessionId) {
              setSessionId(newSession.sessionId);
              localStorage.setItem("mep_last_session_id", newSession.sessionId);
            }
          }
        }
      } catch (err) {
        console.warn("[MEP] Auto-save to server failed:", err);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [
    sessionId, appMode, currentStep, decisionSetup, companySnapshot,
    productStrategy, selectedMarketIds, customMarkets, marketScores,
    selectedRoadmapMarketId, consultantNotes
  ]);

  // ─── Load session from server ──────────────────────────────
  const loadSession = useCallback(async (id: string) => {
    try {
      const data = await apiClient.sessions.get(id);
      if (data && data.stateSnapshot) {
        const snap = typeof data.stateSnapshot === 'string' ? JSON.parse(data.stateSnapshot) : data.stateSnapshot;
        setAppMode(snap.appMode || "consultant");
        setCurrentStep(snap.currentStep || 1);
        setMaxUnlockedStep(snap.maxUnlockedStep || 1);
        setDecisionSetup(snap.decisionSetup || DEMO_DECISION_SETUP);
        setCompanySnapshot(snap.companySnapshot || BLANK_COMPANY_SNAPSHOT);
        setProductStrategy(snap.productStrategy || DEMO_PRODUCT_STRATEGY);
        setSelectedMarketIds(snap.selectedMarketIds || []);
        setCustomMarkets(snap.customMarkets || []);
        setMarketScores(snap.marketScores || {});
        setSelectedRoadmapMarketId(snap.selectedRoadmapMarketId || "uae");
        setConsultantNotes(snap.consultantNotes || "");
        setReviewStatus(data.reviewStatus || "pending");
        toast.success("Session loaded successfully");
      }
    } catch (err) {
      console.error("[MEP] Failed to load session", err);
      toast.error("Failed to load session from server");
    }
  }, [toast]);

  useEffect(() => {
    if (sessionId && appMode !== "demo") {
      localStorage.setItem("mep_last_session_id", sessionId);
      loadSession(sessionId);
    }
  }, [sessionId, appMode, loadSession]);
  // ─── Calculate results for Export Brief ──────────────────
  const calculatedResults: CalculatedResult[] = useMemo(() => {
    return activeSelectedMarkets
      .map((market) => {
        const input = marketScores[market.id];
        if (!input) return null;
        const s = input.scores;

        const adjComp = 6 - (s.competitiveIntensity ?? 3);
        const adjReg = 6 - (s.regulatoryComplexity ?? 3);
        const opportunity =
          (s.marketAttractiveness ?? 3) * 0.7 + adjComp * 0.3;
        const fit =
          (s.offeringFit ?? 3) * 0.65 +
          (s.brandTrustTransferability ?? 3) * 0.35;
        const feasibility =
          (s.channelAccess ?? 3) * 0.35 +
          adjReg * 0.3 +
          (s.operationalFeasibility ?? 3) * 0.35;
        const weightedAvg =
          opportunity * 0.25 +
          fit * 0.2 +
          feasibility * 0.25 +
          (s.strategicValue ?? 3) * 0.1 +
          (s.financialLogic ?? 3) * 0.2;
        const potentialScore = Math.round(weightedAvg * 20);
        const riskExposure =
          ((s.competitiveIntensity ?? 3) +
            (s.regulatoryComplexity ?? 3)) /
          2;
        let riskLevel: "High" | "Medium" | "Low" = "Medium";
        if (riskExposure >= 3.8) riskLevel = "High";
        else if (riskExposure <= 2.2) riskLevel = "Low";

        // Evidence confidence score
        const dimEvidence = input.dimensionEvidence || {};
        const dimKeys = Object.keys(s) as Array<keyof typeof s>;
        const eScores = dimKeys.map(
          (k) =>
            EVIDENCE_BASIS_SCORE_MAP[
              dimEvidence[k] || "Expert Judgment"
            ] || 55
        );
        const avgDim =
          eScores.reduce((a, b) => a + b, 0) / eScores.length;
        const overallConf =
          CONFIDENCE_SCORE_MAP[input.evidenceConfidence] || 30;
        const evidenceConfidenceScore = Math.round(
          avgDim * 0.6 + overallConf * 0.4
        );
        const discrepancyAlert =
          potentialScore > 70 && evidenceConfidenceScore < 50;

        let tier: CalculatedResult["tier"] =
          "Tier C: Do not prioritize";
        if (discrepancyAlert) {
          tier = "Tier B: Promising";
        } else if (potentialScore >= 75) {
          tier = "Tier A: Priority";
        } else if (potentialScore >= 60) {
          tier = "Tier B: Promising";
        } else if (potentialScore < 40) {
          tier = "Tier D: Exclude from current agenda";
        }

        return {
          marketId: market.id,
          name: market.name,
          opportunity,
          fit,
          feasibility,
          potentialScore,
          riskExposure,
          riskLevel,
          tier,
          confidence: input.evidenceConfidence,
          evidenceBasis: input.evidenceBasis,
          evidenceConfidenceScore,
          mainStrength: "",
          mainWeakness: "",
          discrepancyAlert,
        } as CalculatedResult;
      })
      .filter(Boolean)
      .sort(
        (a, b) => (b as CalculatedResult).potentialScore - (a as CalculatedResult).potentialScore
      ) as CalculatedResult[];
  }, [activeSelectedMarkets, marketScores]);

  return (
    <>
    {/* ─── Admin Panel (full-screen overlay) ──────────── */}
    {showAdminPanel && (
      <Suspense fallback={
        <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <AdminPanel onBack={() => setShowAdminPanel(false)} />
      </Suspense>
    )}

    {/* ─── Main App ──────────────────────────────────────── */}
    <div className={`min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500/30 selection:text-indigo-200 ${showAdminPanel ? 'hidden' : ''}`}>
      {/* ─── Header ──────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-slate-950 font-bold font-display shadow-md shadow-indigo-950/40">
              M
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold font-display tracking-tight text-white leading-none">
                  MEP-light™
                </h1>
                <span className="text-[10px] font-mono bg-indigo-950 text-indigo-400 border border-indigo-900/60 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  v{__APP_VERSION__}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono leading-none">
                Market Entry Prioritizer & Strategic Diagnostics Engine
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Session Manager Button */}
            <button
              onClick={() => setShowSessionManager(true)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-600 px-3 py-1.5 rounded-lg transition"
              title="Manage Sessions"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Sessions
            </button>
            {/* Mode Toggle */}
            <button
              onClick={handleModeToggle}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                appMode === "demo"
                  ? "bg-indigo-950/60 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/80"
                  : "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/80"
              }`}
              id="mode-toggle-btn"
            >
              {appMode === "demo" ? (
                <>
                  <Beaker className="w-3.5 h-3.5" />
                  <span>Demo Mode</span>
                </>
              ) : (
                <>
                  <BriefcaseBusiness className="w-3.5 h-3.5" />
                  <span>Consultant Mode</span>
                </>
              )}
            </button>

            <UserProfileMenu onOpenAdmin={() => setShowAdminPanel(true)} />
          </div>
        </div>
      </header>

      {/* ─── Main Container ──────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-between">
        <div className="flex-1">
          <StepProgress
            currentStep={currentStep}
            onStepClick={handleStepClick}
            maxUnlockedStep={maxUnlockedStep}
            showPrepPhase={showPrepPhase}
          />

          {/* Active Screen — lazy-loaded with Suspense */}
          <Suspense fallback={<StepSkeleton />}>
          <div className="min-h-[480px]" key={currentStep}>
            {currentStep === 1 && (
              <DecisionSetupScreen
                data={decisionSetup}
                onChange={handleUpdateDecisionSetup}
                businessName={companySnapshot.businessName}
                appMode={appMode}
              />
            )}

            {currentStep === 2 && (
              <CompanySnapshotScreen
                data={companySnapshot}
                onChange={handleUpdateCompanySnapshot}
                appMode={appMode}
              />
            )}

            {currentStep === 3 && (
              <ProductStrategyScreen
                data={productStrategy}
                onChange={handleUpdateProductStrategy}
                appMode={appMode}
              />
            )}

            {currentStep === 4 && (
              <MarketShortlistScreen
                selectedMarketIds={selectedMarketIds}
                customMarkets={customMarkets}
                onToggleMarket={handleToggleMarketSelection}
                onAddCustomMarket={handleAddCustomMarket}
                onDeleteCustomMarket={handleDeleteCustomMarket}
                onUpdateMarketDescription={
                  handleUpdateMarketDescription
                }
                appMode={appMode}
              />
            )}

            {currentStep === 5 && (
              <ScoringEvidenceScreen
                selectedMarkets={activeSelectedMarkets}
                marketScores={marketScores}
                onUpdateScores={handleUpdateScores}
                onUpdateEvidence={handleUpdateEvidence}
                onUpdateDimensionEvidence={
                  handleUpdateDimensionEvidence
                }
                appMode={appMode}
              />
            )}

            {currentStep === 6 && (
              <ComparativeDashboardScreen
                selectedMarkets={activeSelectedMarkets}
                marketScores={marketScores}
                onSelectPrimaryMarketForRoadmap={
                  handleSelectPrimaryMarketForRoadmap
                }
              />
            )}

            {currentStep === 7 && (
              <RoadmapScreen
                selectedMarkets={activeSelectedMarkets}
                marketScores={marketScores}
                businessName={companySnapshot.businessName}
                offeringName={productStrategy.offeringName}
                selectedMarketId={selectedRoadmapMarketId}
                onSelectMarketId={setSelectedRoadmapMarketId}
                selectedStrategy={productStrategy.selectedStrategy}
                onOpenExportBrief={() => setExportBriefOpen(true)}
                onDownloadPDF={handleDownloadPDF}
                onProceedToPrep={handleProceedToPrep}
                isDownloadingPDF={isDownloadingPDF}
                appMode={appMode}
                sessionId={sessionId}
                reviewStatus={reviewStatus}
                onReviewStatusChange={setReviewStatus}
              />
            )}

            {currentStep === 8 && (
              <EntryReadinessWorkspace
                market={allMarkets.find((m) => m.id === prepMarketId) || allMarkets[0]}
                offeringName={productStrategy.offeringName}
                businessName={companySnapshot.businessName}
                onBackToDiagnostic={handleBackToDiagnostic}
              />
            )}
          </div>
          </Suspense>
        </div>

        {/* ─── Notes & Action Bar ────────────────────────── */}
        <div className="mt-8 pt-6 border-t border-slate-800/60">
          {/* Notes only on screens 5-7 */}
          {currentStep >= 5 && (
            <ConsultantNotes
              notes={consultantNotes}
              onChange={setConsultantNotes}
            />
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-5 py-3 rounded-xl border font-semibold flex items-center space-x-2 text-sm transition-all ${
                currentStep === 1
                  ? "bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 cursor-pointer"
              }`}
              id="global-back-btn"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="text-xs text-slate-500 font-mono hidden md:block">
              STEP {currentStep} OF {showPrepPhase ? 8 : 7} •{" "}
              {currentStep === 8
                ? "PREPARATION PHASE"
                : appMode === "demo"
                ? "DEMO PRE-LOADED"
                : "CONSULTANT MODE"}
            </div>

            {currentStep < 7 ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid(currentStep)}
                className={`px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 text-sm transition-all ${
                  isStepValid(currentStep)
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/40 cursor-pointer"
                    : "bg-slate-950 border border-slate-900 text-slate-600 cursor-not-allowed"
                }`}
                id="global-next-btn"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : currentStep === 8 ? (
              <div className="text-emerald-400 font-semibold font-display text-sm flex items-center space-x-2 bg-emerald-950/20 px-4 py-2.5 rounded-xl border border-emerald-900/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Preparation Active</span>
              </div>
            ) : (
              <div className="text-emerald-400 font-semibold font-display text-sm flex items-center space-x-2 bg-emerald-950/20 px-4 py-2.5 rounded-xl border border-emerald-900/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Analysis Ready</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-16 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between flex-wrap gap-2">
          <p>
            © 2026 Market Entry Prioritizer • MEP-light™ Diagnostic
            System • Proprietary Enterprise Strategy Tool • v{__APP_VERSION__}
          </p>
          {authUser && (
            <div className="flex items-center gap-3">
              <span className="text-slate-600">{authUser.email}</span>
              <button
                onClick={() => {
                  track.signOut();
                  onSignOut();
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors text-xs border border-slate-800 px-3 py-1 rounded hover:border-slate-600"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* ─── Export Brief Modal ───────────────────────────── */}
      <Suspense fallback={null}>
        <ExportBriefModal
          isOpen={exportBriefOpen}
          onClose={() => setExportBriefOpen(false)}
          decisionSetup={decisionSetup}
          companySnapshot={companySnapshot}
          productStrategy={productStrategy}
          selectedMarkets={activeSelectedMarkets}
          marketScores={marketScores}
          results={calculatedResults}
          consultantNotes={consultantNotes}
          selectedRoadmapMarketId={selectedRoadmapMarketId}
        />
      </Suspense>

      {/* ─── Session Manager ─────────────────────────────── */}
      <SessionManager
        currentSessionId={sessionId}
        isOpen={showSessionManager}
        onClose={() => setShowSessionManager(false)}
        onResumeSession={(id) => {
          toast.info(`Resuming session...`);
          loadSession(id);
          track.sessionResumed(id);
        }}
        onStartNew={() => {
          toast.success("New assessment session started");
          track.sessionStarted(sessionId);
        }}
        onDeleteSession={(id) => {
          toast.success("Session deleted");
        }}
      />
    </div>
    </>
  );
}
