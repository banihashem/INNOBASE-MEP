import React, { useState } from "react";
import {
  Market,
  MarketScoreInput,
  STRATEGY_PROFILES,
  EVIDENCE_BASIS_SCORE_MAP,
  DimensionScores,
  AppMode,
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
} from "lucide-react";
import StrategicDisclaimer from "./StrategicDisclaimer";

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
}

interface Assumption {
  id: string;
  category: "Demand" | "Channel Access" | "Financial Margins" | "Adaptation";
  text: string;
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
}: Props) {
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
  const [reviewStatus, setReviewStatus] = useState<"pending" | "approved" | "flagged">("pending");
  const [reviewNotes, setReviewNotes] = useState("");

  // Assumptions state — editable cards
  const [assumptions, setAssumptions] = useState<Assumption[]>([
    {
      id: "asm-1",
      category: "Demand",
      text: `Target shoppers will purchase ${offeringName || "Offering X"} at a premium vs local options.`,
      confidence: "Low",
      validationAction:
        "Run 50 quantitative consumer surveys and digital concept testing ads.",
    },
    {
      id: "asm-2",
      category: "Channel Access",
      text: "Distributors will accept 40% margin splits with prominent placement.",
      confidence: "Medium",
      validationAction:
        "Secure 3 exploratory LOIs from potential distribution partners.",
    },
    {
      id: "asm-3",
      category: "Financial Margins",
      text: "Tariffs and logistics will not compress net margins below 25%.",
      confidence: "Low",
      validationAction:
        "Perform landing cost exercise with customs broker for HS-code validation.",
    },
    {
      id: "asm-4",
      category: "Adaptation",
      text: "Standard labeling requires no major reformulation or packaging overhaul.",
      confidence: "High",
      validationAction:
        "Submit packaging files to local regulatory consultants for audit.",
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
    const categories: Assumption["category"][] = ["Demand", "Channel Access", "Financial Margins", "Adaptation"];
    const newAsm: Assumption = {
      id: `asm-${Date.now()}`,
      category: categories[assumptions.length % 4],
      text: "Enter your strategic assumption here...",
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
            disabled={isDownloadingPDF}
            className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            id="download-pdf-btn"
          >
            {isDownloadingPDF ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isDownloadingPDF ? 'Generating...' : 'Download Strategic Prioritisation Report (PDF)'}</span>
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
          <span>Version: MEP-LIGHT-v{__APP_VERSION__}</span>
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
              {reviewStatus !== "approved" && (
                <button
                  onClick={() => setReviewStatus("approved")}
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
                      setReviewNotes(note || "");
                      setReviewStatus("flagged");
                    }
                  }}
                  className="px-4 py-2 text-xs font-semibold text-amber-400 bg-amber-950/40 border border-amber-900/40 rounded-lg hover:bg-amber-900/40 transition-colors"
                >
                  Flag for Revision
                </button>
              )}
              {reviewStatus !== "pending" && (
                <button
                  onClick={() => { setReviewStatus("pending"); setReviewNotes(""); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 bg-slate-800/40 border border-slate-700/40 rounded-lg hover:bg-slate-700/40 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  REGULATORY & MARGINS
                </span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Core Objective:
                  </span>
                  <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                    Verify compliance frameworks, HS code duties, landing cost feasibility.
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Key Actions:
                  </span>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                    <li>Submit labels to compliance auditor.</li>
                    <li>Verify duty rates with customs broker.</li>
                    <li>Build landed cost model.</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-slate-950 p-4 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-500 font-bold">DECISION GATE:</span>
              <span className="font-semibold text-slate-300">Landed Margin &gt; 45%</span>
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
                  CHANNEL EXPLORATION
                </span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Core Objective:
                  </span>
                  <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                    Test product desirability with tier-1 distributors or retail buyers.
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Key Actions:
                  </span>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                    <li>Draft digital sales deck.</li>
                    <li>Conduct 3 exploratory partner meetings.</li>
                    <li>Run localized test campaigns.</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-slate-950 p-4 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-500 font-bold">DECISION GATE:</span>
              <span className="font-semibold text-slate-300">Min 1 LOI / Partner</span>
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
                  PILOT TEST LOOPS
                </span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Core Objective:
                  </span>
                  <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                    Execute low-risk trial shipment or soft-launch campaign.
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Key Actions:
                  </span>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                    <li>Small air-freight test batch.</li>
                    <li>Physical demo tastings or digital loops.</li>
                    <li>Compile pricing response data.</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-slate-950 p-4 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-500 font-bold">DECISION GATE:</span>
              <span className="font-semibold text-slate-300">Acceptance Rate &gt; 70%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proceed to Product Preparation */}
      <div className="bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 font-mono">
            Next Phase
          </span>
          <h3 className="text-lg font-bold font-display text-white">
            Ready to prepare {offeringName} for {activeMarket.name}?
          </h3>
          <p className="text-sm text-slate-400">
            Transition to the Entry Readiness Workspace to validate regulatory compliance, logistics feasibility, and commercial economics.
          </p>
        </div>
        <button
          onClick={onProceedToPrep}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl flex items-center space-x-3 transition-all cursor-pointer shadow-md shadow-emerald-600/20 shrink-0"
          id="proceed-to-prep-btn"
        >
          <span>Proceed to Entry Readiness Workspace</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Strategic Disclaimer */}
      <StrategicDisclaimer />
    </div>
  );
}
