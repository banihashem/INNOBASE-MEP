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
  CLIENT_FACING_LABEL,
  CLIENT_FACING_LABEL_SHORT,
} from "./types";
import { computeMarketResult, resolveSectorWeights } from "./lib/scoring";
import { generateDraftScores, DraftScoreError } from "./lib/draftScoring";
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

// ─── Demo Scenario Defaults ──────────────────────────────
const DEMO_DECISION_SETUP: DecisionSetup = {
  decisionMode: "New Market Entry Readiness",
  expansionHorizon: "12 months",
  strategicObjective:
    "Identify the most practical growth opportunity that can be validated quickly and scaled if early signals are positive",
  desiredOutput: ["Ranking dashboard", "Validation roadmap"],
};

const DEMO_COMPANY_SNAPSHOT: CompanySnapshot = {
  businessName: "",
  sector: "Food & Beverage",
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
  selectedStrategy: "",
  customAdaptationNotes: "",
};

const BLANK_COMPANY_SNAPSHOT: CompanySnapshot = {
  businessName: "",
  sector: "Food & Beverage",
  domesticMarketSize: "",
  exportExperience: "No Experience",
  internalCapabilities: "",
  knownConstraints: "",
  evidenceStates: {
    businessName: "To Validate",
    sector: "Estimated",
    domesticMarketSize: "To Validate",
    exportExperience: "To Validate",
    internalCapabilities: "To Validate",
    knownConstraints: "To Validate",
  },
};

// ─── App Root ─────────────────────────────────────────────────────

export default function App() {
  // Initialize telemetry on mount
  useEffect(() => {
    initTelemetry();
  }, []);

  // Runtime identity marker (cure §6.8) — QA can verify via console: window.__MEP_BUILD__
  useEffect(() => {
    window.__MEP_BUILD__ = {
      version: __APP_VERSION__,
      sha: __BUILD_SHA__,
      timestamp: __BUILD_TIMESTAMP__,
      label: __BUILD_LABEL__,
      runtimeMode: import.meta.env.MODE || 'unknown',
    };
    console.info("[MEP-light™ Build]", window.__MEP_BUILD__);
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isInitializing, setIsInitializing] = useState(true);

  const [appMode, setAppMode] = useState<AppMode>(() => {
    if (authUser?.role === "demo_participant") return "free-demo";
    if (authUser?.role === "Consultant") return "facilitated";
    if (authUser?.role === "Administrator") return "admin";
    return "free-demo";
  });

  useEffect(() => {
    if (authUser) {
      if (authUser.role === "demo_participant") setAppMode("free-demo");
      else if (authUser.role === "Consultant") setAppMode("facilitated");
      else if (authUser.role === "Administrator") setAppMode("admin");
      else setAppMode("free-demo");
    }
  }, [authUser?.role]);
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

  // Per-market context notes (spec 7.4) + removed starter examples (spec 7.3 de-privilege).
  const [marketNotes, setMarketNotes] = useState<Record<string, string>>({});
  const [removedDefaultIds, setRemovedDefaultIds] = useState<string[]>([]);

  const [marketScores, setMarketScores] =
    useState<Record<string, MarketScoreInput>>(DEMO_MARKET_SCORES);

  const [selectedRoadmapMarketId, setSelectedRoadmapMarketId] =
    useState<string>("uae");

  const [consultantNotes, setConsultantNotes] = useState<string>(
    "Strategic Workshop Notes — June 2026\nInitial assessment session with the executive team."
  );


  // Computed — starter examples (minus any removed) + custom markets.
  const allMarkets = useMemo(
    () => [
      ...DEFAULT_MARKETS.filter((m) => !removedDefaultIds.includes(m.id)),
      ...customMarkets,
    ],
    [customMarkets, removedDefaultIds]
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
    setSelectedMarketIds((prev) => {
      if (prev.includes(marketId)) return prev.filter((id) => id !== marketId);
      // Hard-cap the comparison set at 5 (spec 3–5 rule).
      if (prev.length >= 5) {
        toast.error("You can compare at most 5 markets. Remove one before adding another.");
        return prev;
      }
      return [...prev, marketId];
    });
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

  // Remove any market — starter examples are de-privileged (spec 7.3): a removed
  // default is tracked so it stays hidden; a custom market is dropped outright.
  const handleDeleteMarket = (marketId: string) => {
    const isDefault = DEFAULT_MARKETS.some((m) => m.id === marketId);
    if (isDefault) {
      setRemovedDefaultIds((prev) =>
        prev.includes(marketId) ? prev : [...prev, marketId]
      );
    } else {
      setCustomMarkets((prev) => prev.filter((m) => m.id !== marketId));
    }
    setSelectedMarketIds((prev) => prev.filter((id) => id !== marketId));
    setMarketScores((prev) => {
      const updated = { ...prev };
      delete updated[marketId];
      return updated;
    });
    setMarketNotes((prev) => {
      const updated = { ...prev };
      delete updated[marketId];
      return updated;
    });
  };

  const handleUpdateMarketNote = (marketId: string, note: string) => {
    setMarketNotes((prev) => ({ ...prev, [marketId]: note }));
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

  // ─── Draft Score Generation (input-derived, spec §8.2) ──────────────
  // Generates 1–5 draft scores per market×dimension FROM the entered inputs
  // (company snapshot, offering strategy, market notes, sector, evidence states),
  // validated against a strict schema. Fails safe on error (keeps prior scores,
  // no fabrication) and confirms before overwriting user-adjusted values.
  const handleGenerateDraftScores = useCallback(() => {
    const anyAdjusted = selectedMarketIds.some((id) => {
      const s = marketScores[id];
      return s?.draftGenerated && s.userAdjusted && Object.keys(s.userAdjusted).length > 0;
    });
    if (anyAdjusted) {
      const ok = window.confirm(
        "Regenerating will reset your manual score adjustments to fresh draft values. Continue?"
      );
      if (!ok) return;
    }

    try {
      const generated: Record<string, MarketScoreInput> = {};
      for (const marketId of selectedMarketIds) {
        const market = allMarkets.find((m) => m.id === marketId);
        if (!market) continue;
        const draft = generateDraftScores({
          marketId,
          marketName: market.name,
          marketDescription: market.description,
          marketNote: marketNotes[marketId],
          sector: companySnapshot.sector,
          offeringStrategy: productStrategy.selectedStrategy,
          capabilities: companySnapshot.internalCapabilities,
          constraints: companySnapshot.knownConstraints,
          domesticMarketSize: companySnapshot.domesticMarketSize,
          evidenceStates: companySnapshot.evidenceStates,
        });
        generated[marketId] = {
          marketId,
          scores: draft.scores,
          dimensionEvidence: draft.dimensionEvidence,
          evidenceBasis: draft.dimensionEvidence.marketAttractiveness,
          evidenceConfidence: draft.evidenceConfidence,
          userAdjusted: {},
          draftGenerated: true,
        };
      }

      const wasRegeneration = selectedMarketIds.some((id) => marketScores[id]?.draftGenerated);
      setMarketScores((prev) => ({ ...prev, ...generated }));
      toast.success(
        wasRegeneration
          ? "Draft scores regenerated from your inputs. Review and adjust as needed."
          : "Draft scores generated from your inputs. Review and adjust as needed."
      );
    } catch (err) {
      // Fail-safe: keep existing scores, surface a retryable message, no fabrication.
      const detail =
        err instanceof DraftScoreError ? err.message : "An unexpected error occurred.";
      console.error("[MEP] Draft score generation failed:", detail);
      toast.error("Draft score generation failed. Your existing scores are unchanged — please try again.");
    }
  }, [selectedMarketIds, marketScores, allMarkets, marketNotes, companySnapshot, productStrategy, toast]);

  const handleMarkUserAdjusted = useCallback((
    marketId: string,
    dimension: keyof DimensionScores
  ) => {
    setMarketScores((prev) => {
      const current = prev[marketId];
      if (!current) return prev;
      return {
        ...prev,
        [marketId]: {
          ...current,
          userAdjusted: {
            ...current.userAdjusted,
            [dimension]: true,
          },
        },
      };
    });
  }, []);

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
      
      const blob = await apiClient.exportPdf(payload);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MEP-light_${companySnapshot.businessName.replace(/\s+/g, "_")}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("PDF download error:", err);
      let errorMsg = "PDF generation failed. Please try again.";
      if (err.status === 401) {
        errorMsg = "Authentication required for PDF export.";
      } else if (err.status === 403) {
        errorMsg = "You do not have permission to export this PDF or the session is pending review.";
      } else if (err.message) {
        errorMsg = `PDF generation failed: ${err.message}`;
      }
      toast.error(errorMsg);
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
      marketNotes,
      removedDefaultIds,
      marketScores,
      selectedRoadmapMarketId,
      consultantNotes,
    };
  }, [
    appMode, currentStep, maxUnlockedStep, decisionSetup, companySnapshot,
    productStrategy, selectedMarketIds, customMarkets, marketNotes, removedDefaultIds,
    marketScores, selectedRoadmapMarketId, consultantNotes
  ]);

  useEffect(() => {
    if (isInitializing) return;

    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const payload = {
          title: companySnapshot.businessName || "Untitled Assessment",
          companyName: companySnapshot.businessName,
          offeringName: productStrategy.offeringName,
          status: currentStep >= 7 ? "completed" : "in_progress",
          currentStep,
          completionPercent: Math.round((Math.max(currentStep - 1, 0) / 7) * 100),
          stateSnapshot: stateSnapshotRef.current,
        };
        
        if (sessionId) {
          try {
            await apiClient.sessions.update(sessionId, payload);
            setSaveStatus("saved");
          } catch (err: any) {
            if (err.status === 404 || err.message?.includes('not found')) {
              // Recreate if not found
              const newSession = await apiClient.sessions.create({ id: sessionId, ...payload });
              if (newSession && newSession.sessionId) {
                setSessionId(newSession.sessionId);
                localStorage.setItem("mep_last_session_id", newSession.sessionId);
                setSaveStatus("saved");
              }
            } else {
              throw err;
            }
          }
        } else {
          // Explicitly create new session if we don't have an ID
          const newSession = await apiClient.sessions.create(payload);
          if (newSession && newSession.sessionId) {
            setSessionId(newSession.sessionId);
            localStorage.setItem("mep_last_session_id", newSession.sessionId);
            setSaveStatus("saved");
          }
        }
      } catch (err) {
        console.warn("[MEP] Auto-save to server failed:", err);
        setSaveStatus("error");
        toast.error("Changes could not be saved. Please check your connection before continuing.");
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [
    sessionId, appMode, isInitializing, currentStep, decisionSetup, companySnapshot,
    productStrategy, selectedMarketIds, customMarkets, marketNotes, removedDefaultIds,
    marketScores, selectedRoadmapMarketId, consultantNotes
  ]);

  // ─── Load session from server ──────────────────────────────
  const loadSession = useCallback(async (id: string, silent = false) => {
    try {
      const data = await apiClient.sessions.get(id);
      if (data && data.stateSnapshot) {
        const snap = typeof data.stateSnapshot === 'string' ? JSON.parse(data.stateSnapshot) : data.stateSnapshot;
        // Backward-compat: normalize legacy appMode values ('demo'→'free-demo', 'consultant'→'facilitated').
        const legacyMode =
          snap.appMode === "demo" ? "free-demo" :
          snap.appMode === "consultant" ? "facilitated" :
          snap.appMode;
        setAppMode(authUser?.role === "demo_participant" ? "free-demo" : (legacyMode || "facilitated"));
        setCurrentStep(snap.currentStep || 1);
        setMaxUnlockedStep(snap.maxUnlockedStep || 1);
        setDecisionSetup(snap.decisionSetup || DEMO_DECISION_SETUP);
        setCompanySnapshot(snap.companySnapshot || BLANK_COMPANY_SNAPSHOT);
        setProductStrategy(snap.productStrategy || DEMO_PRODUCT_STRATEGY);
        // Backward-compat: legacy snapshots stored markets under `shortlistedMarkets`.
        setSelectedMarketIds(snap.selectedMarketIds || snap.shortlistedMarkets || []);
        setCustomMarkets(snap.customMarkets || []);
        setMarketNotes(snap.marketNotes || {});
        setRemovedDefaultIds(snap.removedDefaultIds || []);
        setMarketScores(snap.marketScores || {});
        setSelectedRoadmapMarketId(snap.selectedRoadmapMarketId || "uae");
        setConsultantNotes(snap.consultantNotes || "");
        setReviewStatus(data.reviewStatus || "pending");
        if (!silent) toast.success("Session loaded successfully");
      }
    } catch (err) {
      console.error("[MEP] Failed to load session", err);
      if (!silent) toast.error("Failed to load session from server");
      throw err;
    }
  }, [toast, authUser]);

  // ─── Initialize App State ──────────────────────────────
  useEffect(() => {
    const init = async () => {
      const lastSessionId = localStorage.getItem("mep_last_session_id");
      if (lastSessionId && lastSessionId !== "undefined") {
        try {
          await loadSession(lastSessionId, true);
          setSessionId(lastSessionId);
        } catch (err) {
          // Failed to load, clear local storage and stay in demo mode
          localStorage.removeItem("mep_last_session_id");
        }
      }
      setIsInitializing(false);
    };
    init();
  }, [loadSession]);
  // ─── Calculate results for Export Brief / PDF (shared scoring lib) ──────────
  const calculatedResults: CalculatedResult[] = useMemo(() => {
    const weights = resolveSectorWeights(companySnapshot.sector);
    return activeSelectedMarkets
      .filter((market) => !!marketScores[market.id])
      .map((market) =>
        computeMarketResult(market.id, market.name, marketScores[market.id], weights)
      )
      .sort((a, b) => b.potentialScore - a.potentialScore);
  }, [activeSelectedMarkets, marketScores, companySnapshot.sector]);

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
                  {appMode === "free-demo" ? CLIENT_FACING_LABEL_SHORT : `v${__APP_VERSION__}`}
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

            <UserProfileMenu onOpenAdmin={() => setShowAdminPanel(true)} />
          </div>
        </div>
        
        {/* ─── Save Status Indicator ─── */}
        {authUser && (
          <div className="absolute top-16 right-4 flex items-center space-x-1.5 px-3 py-1 bg-slate-900/80 border border-slate-700/50 rounded-full text-[10px] font-mono text-slate-400">
            {saveStatus === "saving" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Saved</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-red-400">Save Failed</span>
              </>
            )}
            {saveStatus === "idle" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Ready</span>
              </>
            )}
          </div>
        )}
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
                capabilities={companySnapshot.internalCapabilities}
                constraints={companySnapshot.knownConstraints}
                sector={companySnapshot.sector}
                appMode={appMode}
              />
            )}

            {currentStep === 2 && (
              <CompanySnapshotScreen
                data={companySnapshot}
                onChange={handleUpdateCompanySnapshot}
                appMode={appMode}
                decisionMode={decisionSetup.decisionMode}
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
                markets={allMarkets}
                selectedMarketIds={selectedMarketIds}
                marketNotes={marketNotes}
                onToggleMarket={handleToggleMarketSelection}
                onAddCustomMarket={handleAddCustomMarket}
                onDeleteMarket={handleDeleteMarket}
                onUpdateMarketNote={handleUpdateMarketNote}
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
                onGenerateDraftScores={handleGenerateDraftScores}
                onMarkUserAdjusted={handleMarkUserAdjusted}
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
                appMode={appMode}
                companySnapshot={companySnapshot}
                productStrategy={productStrategy}
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
          {currentStep >= 5 && appMode !== "free-demo" && (
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
                : appMode === "free-demo"
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
            © 2026 INNOBASE • MEP-light™ Market Entry &amp; Expansion Decision Support
            • {appMode === "free-demo" ? CLIENT_FACING_LABEL : `v${__APP_VERSION__}`}
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
          reviewStatus={reviewStatus}
        />
      </Suspense>

      {/* ─── Session Manager ─────────────────────────────── */}
      <SessionManager
        currentSessionId={sessionId}
        isOpen={showSessionManager}
        onClose={() => setShowSessionManager(false)}
        onResumeSession={(id) => {
          if (!id || id === "undefined") {
            toast.error("Unable to resume this assessment because the session ID is missing.");
            return;
          }
          toast.info(`Resuming session...`);
          setSessionId(id);
          localStorage.setItem("mep_last_session_id", id);
          loadSession(id);
          track.sessionResumed(id);
        }}
        onStartNew={async () => {
          setDecisionSetup({
            decisionMode: "New Market Entry Readiness",
            expansionHorizon: "12 months",
            strategicObjective: "",
            desiredOutput: [],
          });
          setCompanySnapshot(BLANK_COMPANY_SNAPSHOT);
          setProductStrategy({
            offeringName: "",
            selectedStrategy: "",
            customAdaptationNotes: "",
          });
          setSelectedMarketIds([]);
          setCustomMarkets([]);
          setMarketNotes({});
          setRemovedDefaultIds([]);
          setMarketScores({});
          setConsultantNotes("");
          setCurrentStep(1);
          setMaxUnlockedStep(1);
          
          try {
            const newSession = await apiClient.sessions.create({
              title: "Untitled Assessment",
              currentStep: 1,
              completionPercent: 0,
            });
            if (newSession && newSession.sessionId) {
              setSessionId(newSession.sessionId);
              localStorage.setItem("mep_last_session_id", newSession.sessionId);
              toast.success("New assessment session started");
              track.sessionStarted(newSession.sessionId);
            }
          } catch (err) {
            console.error("Failed to create new session", err);
            setSessionId(null);
            toast.error("Started new assessment locally, but failed to sync to server.");
          }
        }}
        onDeleteSession={(id) => {
          toast.success("Session deleted");
        }}
      />
    </div>
    </>
  );
}
