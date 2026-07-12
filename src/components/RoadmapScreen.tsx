import React, { useState } from "react";
import {
  Market,
  MarketScoreInput,
  STRATEGY_PROFILES,
  EVIDENCE_BASIS_SCORE_MAP,
  DimensionScores,
  AppMode,
  CLIENT_FACING_LABEL,
  FULL_PRO_MODULES,
  INNOBASE_CONTACT_EMAIL,
} from "../types";
import {
  Calendar,
  ShieldAlert,
  ArrowUpRight,
  CheckSquare,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  Route,
  ClipboardCheck,
  FileText,
  Square,
  Download,
  Loader2,
  ArrowRight,
  Pencil,
  Trash2,
  Plus,
  Lock,
} from "lucide-react";
import StrategicDisclaimer from "./StrategicDisclaimer";
import { apiClient } from "../lib/apiClient";
import { useToast } from "./Toast";

interface Props {
  selectedMarkets: Market[];
  marketScores: Record<string, MarketScoreInput>;
  businessName: string;
  offeringName: string;
  selectedMarketId: string;
  onSelectMarketId: (marketId: string) => void;
  selectedStrategy: string;
  onOpenExportBrief: () => void;
  onDownloadPDF: () => void;
  onProceedToPrep: () => void;
  isDownloadingPDF?: boolean;
  appMode: AppMode;
  sessionId?: string;
  reviewStatus?: string;
  onReviewStatusChange?: (status: string) => void;
}

interface Assumption {
  id: string;
  category: "Demand" | "Channel access" | "Financial logic" | "Adaptation" | "Internal capability";
  text: string;
  /** Why this assumption matters (spec 10.3). */
  whyItMatters: string;
  confidence: "High" | "Medium" | "Low";
  validationAction: string;
}

interface DataGapItem {
  id: string;
  label: string;
  checked: boolean;
}

export default function RoadmapScreen({
  selectedMarkets,
  marketScores,
  businessName,
  offeringName,
  selectedMarketId,
  onSelectMarketId,
  selectedStrategy,
  onOpenExportBrief,
  onDownloadPDF,
  onProceedToPrep,
  isDownloadingPDF = false,
  appMode,
  sessionId,
  reviewStatus = "pending",
  onReviewStatusChange,
}: Props) {
  const [adkRunning, setAdkRunning] = useState(false);
  const [adkResult, setAdkResult] = useState<any>(null);
  const currentMarketId =
    selectedMarketId ||
    (selectedMarkets.length > 0 ? selectedMarkets[0].id : "");
  const activeMarket =
    selectedMarkets.find((m) => m.id === currentMarketId) ||
    selectedMarkets[0];

  if (!activeMarket) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <p className="text-slate-300">No markets shortlisted.</p>
      </div>
    );
  }

  const scoreInput = marketScores[activeMarket.id] || {
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
    dimensionEvidence: {},
    evidenceBasis: "Expert Judgment",
    evidenceConfidence: "Low" as const,
  };

  const s = scoreInput.scores;

  // Recommended Entry Pathway
  const getEntryPathway = () => {
    if (selectedStrategy === "replication") {
      return {
        title: "Partner-Led Controlled Market Validation",
        description:
          "For replication-based entries, partner with a local distributor who handles compliance and placement while you focus on brand positioning and customer testing.",
        icon: <Route className="w-6 h-6 text-indigo-400" />,
      };
    }
    if (selectedStrategy === "adaptation") {
      return {
        title: "Adaptation-Led Entry",
        description:
          "For localized adaptation strategies, partner with market-entry specialists who can guide product adjustments, regulatory compliance, and initial channel penetration.",
        icon: <ArrowUpRight className="w-6 h-6 text-indigo-400" />,
      };
    }
    return {
      title: "Development-Led Entry",
      description:
        "For market-specific development strategies, consider a phased approach: validate demand with a pilot version before committing to full-scale production.",
      icon: <ArrowUpRight className="w-6 h-6 text-indigo-400" />,
    };
  };

  const pathway = getEntryPathway();

  // Human Review Gate state
  const [reviewNotes, setReviewNotes] = useState("");
  
  const toast = useToast();

  const handleReviewAction = async (status: string, notes?: string) => {
    if (sessionId) {
      try {
        await apiClient.sessions.review(sessionId, status === "flagged" ? "revision_requested" : status);
        if (onReviewStatusChange) {
          onReviewStatusChange(status);
        }
        if (notes !== undefined) {
          setReviewNotes(notes);
        }
      } catch (err: any) {
        console.error("Failed to update review status on server:", err);
        if (err?.status === 403) {
          toast.error("Human review is available in the facilitated or Pro version. The free demo provides a validation roadmap but does not constitute reviewed approval.");
        } else {
          toast.error("Failed to update review status.");
        }
      }
    } else {
      // Offline / no session
      if (onReviewStatusChange) onReviewStatusChange(status);
      if (notes !== undefined) setReviewNotes(notes);
    }
  };

  const handleRunAdk = async () => {
    if (!sessionId) return;
    setAdkRunning(true);
    try {
      const res = await apiClient.adk.assess(sessionId);
      if (res.artifact) {
        setAdkResult(res.artifact);
      }
    } catch (err) {
      console.error("ADK workflow failed:", err);
    } finally {
      setAdkRunning(false);
    }
  };

  // Assumptions state — editable cards
  const [assumptions, setAssumptions] = useState<Assumption[]>([
    {
      id: "asm-1",
      category: "Demand",
      text: `Target customers will value and adopt ${offeringName || "the offering"} in this market.`,
      whyItMatters: "If demand is weaker than expected, market attractiveness declines.",
      confidence: "Low",
      validationAction:
        "Conduct 10-15 customer, buyer, distributor, or stakeholder interviews.",
    },
    {
      id: "asm-2",
      category: "Channel access",
      text: "A realistic route to customers exists through partners, distributors, or direct channels.",
      whyItMatters:
        "Even attractive markets cannot be served without a realistic route to customers.",
      confidence: "Medium",
      validationAction:
        "Identify and qualify at least 5 potential channel partners or access routes.",
    },
    {
      id: "asm-3",
      category: "Financial logic",
      text: "Entry economics remain viable after costs, pricing, and cost-to-serve.",
      whyItMatters:
        "A market can look attractive but become commercially weak if cost-to-serve is too high.",
      confidence: "Low",
      validationAction: "Build a simple entry economics model.",
    },
    {
      id: "asm-4",
      category: "Adaptation",
      text: "The offering requires no major reformulation, repositioning, or compliance overhaul.",
      whyItMatters:
        "If adaptation is more complex than expected, feasibility and profitability decline.",
      confidence: "High",
      validationAction:
        "Identify required changes to offer, positioning, delivery, compliance, or communication.",
    },
    {
      id: "asm-5",
      category: "Internal capability",
      text: "The organization can deliver, support, monitor, and learn from the entry effort.",
      whyItMatters:
        "Expansion can fail if the company cannot deliver, support, monitor, and learn.",
      confidence: "Medium",
      validationAction:
        "Confirm ownership, budget, capacity, timeline, and decision authority.",
    },
  ]);

  const [editingAssumption, setEditingAssumption] = useState<string | null>(null);

  const toggleAssumptionConfidence = (id: string) => {
    setAssumptions((prev) =>
      prev.map((asm) => {
        if (asm.id === id) {
          const next: Record<
            "High" | "Medium" | "Low",
            "High" | "Medium" | "Low"
          > = { Low: "Medium", Medium: "High", High: "Low" };
          return { ...asm, confidence: next[asm.confidence] };
        }
        return asm;
      })
    );
  };

  const updateAssumption = (id: string, field: "text" | "validationAction", value: string) => {
    setAssumptions((prev) =>
      prev.map((asm) => asm.id === id ? { ...asm, [field]: value } : asm)
    );
  };

  const addAssumption = () => {
    const categories: Assumption["category"][] = [
      "Demand",
      "Channel access",
      "Financial logic",
      "Adaptation",
      "Internal capability",
    ];
    const newAsm: Assumption = {
      id: `asm-${Date.now()}`,
      category: categories[assumptions.length % categories.length],
      text: "Enter your strategic assumption here...",
      whyItMatters: "Explain why this assumption matters for the decision.",
      confidence: "Low",
      validationAction: "Define validation action...",
    };
    setAssumptions((prev) => [...prev, newAsm]);
    setEditingAssumption(newAsm.id);
  };

  const removeAssumption = (id: string) => {
    setAssumptions((prev) => prev.filter((asm) => asm.id !== id));
    if (editingAssumption === id) setEditingAssumption(null);
  };

  const getConfBadgeClass = (conf: "High" | "Medium" | "Low") => {
    switch (conf) {
      case "High":
        return "bg-emerald-950 text-emerald-400 border-emerald-900/60";
      case "Medium":
        return "bg-amber-950 text-amber-400 border-amber-900/60";
      case "Low":
        return "bg-orange-950 text-orange-400 border-orange-900/60";
    }
  };

  // Data Gap Checklist
  const dimEvidence = scoreInput.dimensionEvidence || {};
  const initialGaps: DataGapItem[] = (
    Object.keys(s) as Array<keyof DimensionScores>
  )
    .filter((k) => {
      const basis = dimEvidence[k] || "Expert Judgment";
      return (EVIDENCE_BASIS_SCORE_MAP[basis] || 25) < 60;
    })
    .map((k) => ({
      id: k,
      label: k
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase()),
      checked: false,
    }));

  const [dataGaps, setDataGaps] = useState<DataGapItem[]>(initialGaps);

  const toggleGap = (id: string) => {
    setDataGaps((prev) =>
      prev.map((g) => (g.id === id ? { ...g, checked: !g.checked } : g))
    );
  };

  // Advisory statement
  const getAdvisoryStatement = () => {
    const org = businessName || "the organization";
    const product = offeringName || "Offering X";
    const compScore = s.competitiveIntensity ?? 3;
    const regScore = s.regulatoryComplexity ?? 3;

    let warningNotes: string[] = [];
    if (compScore >= 4)
      warningNotes.push(
        `elevated competitive intensity (${compScore}/5)`
      );
    if (regScore >= 4)
      warningNotes.push(
        `significant regulatory complexity (${regScore}/5)`
      );

    const warningText =
      warningNotes.length > 0
        ? ` Key friction points: ${warningNotes.join("; ")}.`
        : " Moderate-to-low systemic friction facilitates a faster soft-launch.";

    return `Based on diagnostics, ${activeMarket.name} is a key target for ${org}'s expansion of ${product}. Given "${scoreInput.evidenceBasis.toLowerCase()}" with "${scoreInput.evidenceConfidence}" confidence, near-term validation must test key hypotheses before capital deployment.${warningText}`;
  };

  return (
    <div
      className="space-y-8 animate-fade-slide-in"
      id="validation-roadmap-container"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-semibold font-display text-white tracking-tight">
            Validation & 90-Day Roadmap
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Systematic de-risking actions. Check assumptions before
            investment.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            className="bg-slate-900 border border-indigo-500/50 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            value={currentMarketId}
            onChange={(e) => onSelectMarketId(e.target.value)}
            id="roadmap-market-select"
          >
            {selectedMarkets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} Roadmap
              </option>
            ))}
          </select>

          <button
            onClick={onOpenExportBrief}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer border border-slate-700"
            id="export-brief-btn"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Brief</span>
          </button>

          <button
            onClick={onDownloadPDF}
            disabled={isDownloadingPDF || appMode === "free-demo"}
            title={appMode === "free-demo" ? "Full report export is available in the facilitated or Pro version." : ""}
            className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            id="download-pdf-btn"
          >
            {isDownloadingPDF ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isDownloadingPDF ? 'Generating...' : appMode === 'free-demo' ? 'Download Report - Full Version' : 'Download Strategic Prioritisation Report (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Recommended Entry Pathway Card */}
      <div className="bg-gradient-to-r from-indigo-950/30 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 flex items-start space-x-5">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/15 border border-indigo-500/40 flex items-center justify-center shrink-0">
          {pathway.icon}
        </div>
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 font-mono">
            Recommended Entry Pathway
          </span>
          <h3 className="text-lg font-bold font-display text-white">
            {pathway.title}
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            {pathway.description}
          </p>
        </div>
      </div>

      {/* Advisory Panel */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 md:p-8 space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-white font-display uppercase tracking-wider">
            Advisory Panel — {activeMarket.name}
          </h3>
        </div>

        <div className="bg-slate-950/60 border border-indigo-900/40 rounded-xl p-5 md:p-6 text-slate-200 leading-relaxed text-sm">
          "{getAdvisoryStatement()}"
        </div>

        <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 justify-end">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            Issued: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short" })}
          </span>
          <span>•</span>
          <span>Version: {CLIENT_FACING_LABEL}</span>
        </div>
      </div>

      {/* Human Review Gate */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm uppercase font-semibold text-indigo-400 tracking-wider">
            Human Review Gate
          </h3>
        </div>

        <div className={`rounded-xl border p-5 transition-all ${
          reviewStatus === "approved"
            ? "bg-emerald-950/20 border-emerald-900/40"
            : reviewStatus === "flagged"
            ? "bg-rose-950/20 border-rose-900/40"
            : "bg-amber-950/15 border-amber-900/30"
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  reviewStatus === "approved"
                    ? "bg-emerald-900/60 text-emerald-400 border border-emerald-800/60"
                    : reviewStatus === "flagged"
                    ? "bg-rose-900/60 text-rose-400 border border-rose-800/60"
                    : "bg-amber-900/60 text-amber-400 border border-amber-800/60"
                }`}>
                  {reviewStatus === "approved" ? "✓ Approved" : reviewStatus === "flagged" ? "⚠ Flagged" : "⏳ Pending Review"}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                {reviewStatus === "approved"
                  ? `This assessment has been reviewed and approved for ${activeMarket.name}. The reviewer confirms that scoring inputs have been validated and the advisory output is suitable for strategic discussion.`
                  : reviewStatus === "flagged"
                  ? `This assessment has been flagged for revision. The reviewer has identified concerns with the scoring inputs or advisory output for ${activeMarket.name}. Review the assumptions and evidence basis before proceeding.`
                  : `This assessment for ${activeMarket.name} has not yet been reviewed by a qualified advisor. MEP-light™ outputs are decision-support tools — do not commit capital or resources based on unreviewed assessments.`
                }
              </p>
              {reviewNotes && (
                <div className="mt-2 p-3 bg-slate-950/60 rounded-lg border border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Reviewer Notes:</span>
                  <p className="text-xs text-slate-300">{reviewNotes}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-2 shrink-0">
              {appMode !== "free-demo" ? (
                <>
                  {appMode !== "demo" && !adkResult && (
                    <button
                      onClick={handleRunAdk}
                      disabled={adkRunning}
                      className="px-4 py-2 text-xs font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 rounded-lg hover:bg-indigo-900/40 transition-colors flex items-center justify-center space-x-2"
                    >
                      {adkRunning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Run Agent Review</span>
                    </button>
                  )}
                  {reviewStatus !== "approved" && (
                    <button
                      onClick={() => handleReviewAction("approved")}
                      className="px-4 py-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 rounded-lg hover:bg-emerald-900/40 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  {reviewStatus !== "flagged" && (
                    <button
                      onClick={() => {
                        const note = prompt("Enter review notes (optional):");
                        if (note !== null) {
                          handleReviewAction("flagged", note || "");
                        }
                      }}
                      className="px-4 py-2 text-xs font-semibold text-amber-400 bg-amber-950/40 border border-amber-900/40 rounded-lg hover:bg-amber-900/40 transition-colors"
                    >
                      Flag for Revision
                    </button>
                  )}
                  {reviewStatus !== "pending" && (
                    <button
                      onClick={() => handleReviewAction("pending", "")}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 bg-slate-800/40 border border-slate-700/40 rounded-lg hover:bg-slate-700/40 transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </>
              ) : (
                <div className="text-xs text-slate-400 mt-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800/40 w-48 text-center leading-relaxed">
                  Human review is available in the facilitated or Pro version. The free demo provides a validation roadmap but does not constitute reviewed approval.
                </div>
              )}
            </div>
          </div>
        </div>

        {adkResult && (
          <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-5 mt-4">
            <h4 className="text-xs uppercase font-bold text-indigo-400 mb-2">Agent Review Result (DRAFT)</h4>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{adkResult.content}</p>
            {adkResult.governanceCheck && (
              <ul className="mt-3 space-y-1 text-xs text-amber-400 list-disc list-inside">
                {adkResult.governanceCheck.warnings?.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Data Gap Checklist */}
      {dataGaps.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <ClipboardCheck className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm uppercase font-semibold text-indigo-400 tracking-wider">
              Data Gap Checklist ({dataGaps.filter((g) => g.checked).length}/{dataGaps.length} resolved)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dataGaps.map((gap) => (
              <button
                key={gap.id}
                type="button"
                onClick={() => toggleGap(gap.id)}
                className={`flex items-center space-x-3 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  gap.checked
                    ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-400"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                {gap.checked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span
                  className={`text-xs font-medium ${
                    gap.checked
                      ? "line-through text-emerald-400/60"
                      : ""
                  }`}
                >
                  Validate: {gap.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Assumptions Cards — Editable */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm uppercase font-semibold text-indigo-400 tracking-wider">
              Critical Strategic Assumptions
            </h3>
          </div>
          <button
            onClick={addAssumption}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 rounded-lg hover:bg-indigo-900/40 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add Assumption</span>
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Click confidence badges to cycle. Click the edit icon to modify text. Add or remove assumptions as needed.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {assumptions.map((asm) => (
            <div
              key={asm.id}
              className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-500">
                    {asm.category}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setEditingAssumption(
                        editingAssumption === asm.id ? null : asm.id
                      )}
                      className={`p-1 rounded transition-colors ${
                        editingAssumption === asm.id
                          ? "text-indigo-400 bg-indigo-950/60"
                          : "text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100"
                      }`}
                      title="Edit assumption"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeAssumption(asm.id)}
                      className="p-1 rounded text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove assumption"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() =>
                        toggleAssumptionConfidence(asm.id)
                      }
                      className={`px-2.5 py-0.5 rounded border text-[10px] font-semibold uppercase transition-colors cursor-pointer ${getConfBadgeClass(
                        asm.confidence
                      )}`}
                      title="Click to cycle confidence"
                    >
                      {asm.confidence}
                    </button>
                  </div>
                </div>
                {editingAssumption === asm.id ? (
                  <textarea
                    value={asm.text}
                    onChange={(e) => updateAssumption(asm.id, "text", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 leading-relaxed resize-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    rows={3}
                    placeholder="Enter your strategic assumption..."
                  />
                ) : (
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    {asm.text}
                  </p>
                )}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Why it matters:
                  </span>
                  <p className="text-xs text-slate-400 leading-normal">
                    {asm.whyItMatters}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/60 space-y-1.5">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                  Validation Action:
                </span>
                {editingAssumption === asm.id ? (
                  <textarea
                    value={asm.validationAction}
                    onChange={(e) => updateAssumption(asm.id, "validationAction", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-400 leading-normal resize-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    rows={2}
                    placeholder="Define validation action..."
                  />
                ) : (
                  <p className="text-xs text-slate-400 leading-normal">
                    {asm.validationAction}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk & Weakness Table */}
      <div className="space-y-4">
        <h3 className="text-sm uppercase font-semibold text-indigo-400 tracking-wider">
          Risk & Weakness Heatmap — {activeMarket.name}
        </h3>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Strategic Threat</th>
                  <th className="py-3 px-5 text-center w-28">Severity</th>
                  <th className="py-3 px-5 text-center w-28">Likelihood</th>
                  <th className="py-3 px-5">Mitigation Strategy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-slate-100">
                    Incumbent Competitive Lockout
                  </td>
                  <td className="py-3.5 px-5 text-center font-semibold text-rose-400">
                    {(s.competitiveIntensity ?? 3) >= 4 ? "Critical" : "High"}
                  </td>
                  <td className="py-3.5 px-5 text-center font-semibold text-amber-400">
                    High
                  </td>
                  <td className="py-3.5 px-5 text-slate-300">
                    Leverage localized niche targeting premium web/retail channels first.
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-slate-100">
                    Regulatory & Certification Delays
                  </td>
                  <td className="py-3.5 px-5 text-center font-semibold text-amber-400">
                    {(s.regulatoryComplexity ?? 3) >= 4 ? "High" : "Medium"}
                  </td>
                  <td className="py-3.5 px-5 text-center font-semibold text-slate-400">
                    {(s.regulatoryComplexity ?? 3) >= 4 ? "High" : "Medium"}
                  </td>
                  <td className="py-3.5 px-5 text-slate-300">
                    Contract local customs broker in first 30 days. Buffer inventory in regional free-zones.
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-slate-100">
                    Distributor Margin Compression
                  </td>
                  <td className="py-3.5 px-5 text-center font-semibold text-amber-400">
                    Medium
                  </td>
                  <td className="py-3.5 px-5 text-center font-semibold text-amber-400">
                    High
                  </td>
                  <td className="py-3.5 px-5 text-slate-300">
                    Incorporate slotting fees into unit economics before contract drafts.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 30-60-90 Day Validation Roadmap */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm uppercase font-semibold text-indigo-400 tracking-wider">
            30-60-90 Day Validation Pipeline
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Phase 1 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-base font-bold font-display text-white">
                  Days 1–30
                </span>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/40">
                  VALIDATE ASSUMPTIONS
                </span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Core Objective:
                  </span>
                  <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                    Validate core assumptions.
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Key Actions:
                  </span>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                    <li>Customer / partner interviews.</li>
                    <li>Competitor review.</li>
                    <li>Regulatory check.</li>
                    <li>Pricing and cost estimate.</li>
                    <li>Internal capacity review.</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-slate-950 p-4 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-500 font-bold">DECISION GATE:</span>
              <span className="font-semibold text-slate-300">Continue, revise, or pause.</span>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-base font-bold font-display text-white">
                  Days 31–60
                </span>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/40">
                  DESIGN PILOT
                </span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Core Objective:
                  </span>
                  <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                    Design controlled pilot.
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Key Actions:
                  </span>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                    <li>Select target segment.</li>
                    <li>Define pilot offer.</li>
                    <li>Select pathway.</li>
                    <li>Prepare sales materials.</li>
                    <li>Confirm partner role.</li>
                    <li>Define metrics.</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-slate-950 p-4 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-500 font-bold">DECISION GATE:</span>
              <span className="font-semibold text-slate-300">Launch pilot or delay.</span>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-base font-bold font-display text-white">
                  Days 61–90
                </span>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/40">
                  TEST & DECIDE
                </span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Core Objective:
                  </span>
                  <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                    Test and decide.
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Key Actions:
                  </span>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                    <li>Run limited pilot.</li>
                    <li>Track demand, leads, sales, and usage.</li>
                    <li>Track feedback, margin, and operational feasibility.</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-slate-950 p-4 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-500 font-bold">DECISION GATE:</span>
              <span className="font-semibold text-slate-300">Scale, adapt, pause, or test another option.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Next Phase — Entry Readiness Workspace (locked full/Pro preview after Step 7) */}
      <div
        className="bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-8 space-y-6"
        id="next-phase-preview"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
              {appMode === "free-demo" && <Lock className="w-3 h-3" />}
              {appMode === "free-demo" ? "Next Phase — Locked (Full / Pro)" : "Next Phase"}
            </span>
            <h3 className="text-lg font-bold font-display text-white">
              Next Phase - Entry Readiness Workspace
            </h3>
            <p className="text-sm text-slate-400 max-w-2xl">
              The free demo ends here. Detailed entry readiness, compliance preparation,
              localization planning, channel readiness, and exportable reporting are available
              in the facilitated or Pro version.
            </p>
          </div>
          <button
            onClick={onProceedToPrep}
            disabled={appMode === "free-demo"}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl flex items-center space-x-3 transition-all cursor-pointer shadow-md shadow-emerald-600/20 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            id="proceed-to-prep-btn"
          >
            <span>{appMode === "free-demo" ? "Workspace Locked" : "Proceed to Entry Readiness Workspace"}</span>
            {appMode === "free-demo" ? <Lock className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Locked full/Pro module preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FULL_PRO_MODULES.map((mod) => (
            <div
              key={mod.name}
              className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 space-y-1 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">{mod.name}</span>
                <Lock className="w-3.5 h-3.5 text-slate-500" aria-label="Locked (full / Pro)" />
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">{mod.purpose}</p>
            </div>
          ))}
        </div>

        {/* Full/Pro CTAs (spec 10.5) */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2 border-t border-slate-800/60">
          {["Request Full Assessment", "Book Market Expansion Sprint", "Contact INNOBASE"].map(
            (label) => {
              const commonClass =
                "flex-1 min-w-[200px] text-center text-sm font-semibold px-4 py-2.5 rounded-lg border border-emerald-700/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-900/40 transition-colors cursor-pointer";
              // Config-driven: use a mailto only if an approved INNOBASE address is configured;
              // otherwise the CTA is presentational and does not claim any message was sent.
              if (INNOBASE_CONTACT_EMAIL) {
                return (
                  <a
                    key={label}
                    href={`mailto:${INNOBASE_CONTACT_EMAIL}?subject=${encodeURIComponent(
                      `${label} — MEP-light Beta Demo`
                    )}`}
                    className={commonClass}
                    id={`cta-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {label}
                  </a>
                );
              }
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    toast.info(
                      `${label}: available in the facilitated or Pro version. This demo build does not send messages.`
                    )
                  }
                  className={commonClass}
                  id={`cta-${label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {label}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Strategic Disclaimer */}
      <StrategicDisclaimer />
    </div>
  );
}
