import React, { useState } from "react";
import {
  Market,
  MarketScoreInput,
  DimensionScores,
  EvidenceBasis,
  EVIDENCE_BASIS_OPTIONS,
  EVIDENCE_BASIS_SCORE_MAP,
  AppMode,
} from "../types";
import { computeEvidenceConfidence } from "../lib/scoring";
import { DRAFT_SCORE_DISCLAIMER } from "../lib/draftScoring";
import { AlertTriangle, ChevronRight, Sparkles, PenLine, Info } from "lucide-react";

interface Props {
  selectedMarkets: Market[];
  marketScores: Record<string, MarketScoreInput>;
  onUpdateScores: (
    marketId: string,
    scores: Partial<DimensionScores>
  ) => void;
  onUpdateEvidence: (
    marketId: string,
    basis: string,
    confidence: MarketScoreInput["evidenceConfidence"]
  ) => void;
  onUpdateDimensionEvidence: (
    marketId: string,
    dimension: keyof DimensionScores,
    basis: EvidenceBasis
  ) => void;
  onGenerateDraftScores?: () => void;
  onMarkUserAdjusted?: (
    marketId: string,
    dimension: keyof DimensionScores
  ) => void;
  appMode: AppMode;
}

// Dimensions in spec §8.4 order, with the canonical DOCX definitions as tooltips.
const DIMENSIONS: {
  key: keyof DimensionScores;
  label: string;
  desc: string;
  isNegative?: boolean;
}[] = [
  {
    key: "marketAttractiveness",
    label: "Market Attractiveness",
    desc: "Demand potential, market relevance, customer need, growth, purchasing power, or unmet need.",
  },
  {
    key: "offeringFit",
    label: "Offering Fit",
    desc: "How well the selected offering fits customer needs, local expectations, use cases, and adaptation requirements.",
  },
  {
    key: "channelAccess",
    label: "Channel Access",
    desc: "Whether the business can realistically reach customers through partners, distributors, direct sales, digital channels, or institutions.",
  },
  {
    key: "competitiveIntensity",
    label: "Competitive Intensity",
    desc: "The degree of competition, substitutes, price pressure, incumbency, and differentiation difficulty. (HIGHER = HARDER)",
    isNegative: true,
  },
  {
    key: "regulatoryComplexity",
    label: "Regulatory / Institutional Complexity",
    desc: "Certification, licensing, compliance, import rules, institutional barriers, or policy restrictions. (HIGHER = HARDER)",
    isNegative: true,
  },
  {
    key: "operationalFeasibility",
    label: "Operational Feasibility",
    desc: "Production, delivery, logistics, service capacity, after-sales support, supply reliability, and cost-to-serve.",
  },
  {
    key: "brandTrustTransferability",
    label: "Brand & Trust Transferability",
    desc: "Whether brand credibility, reputation, origin, trust, and legitimacy can transfer into the target market.",
  },
  {
    key: "strategicValue",
    label: "Strategic Value",
    desc: "Long-term positioning, gateway potential, learning value, portfolio fit, partnerships, or scalability.",
  },
  {
    key: "financialLogic",
    label: "Financial Logic",
    desc: "Pricing, margins, entry cost, customer acquisition cost, working capital, payback, and commercial viability.",
  },
];

export default function ScoringEvidenceScreen({
  selectedMarkets,
  marketScores,
  onUpdateScores,
  onUpdateEvidence,
  onUpdateDimensionEvidence,
  onGenerateDraftScores,
  onMarkUserAdjusted,
  appMode,
}: Props) {
  const isDemo = appMode === "free-demo";
  const anyDraftGenerated = Object.values(marketScores).some(s => s.draftGenerated);
  const [activeMarketId, setActiveMarketId] = useState<string>(
    selectedMarkets.length > 0 ? selectedMarkets[0].id : ""
  );

  const activeMarket =
    selectedMarkets.find((m) => m.id === activeMarketId) ||
    selectedMarkets[0];
  const currentId = activeMarket?.id;

  if (!currentId) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <p className="text-slate-300">
          No markets shortlisted. Please return to the previous step.
        </p>
      </div>
    );
  }

  const currentScoreInput = marketScores[currentId] || {
    marketId: currentId,
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
    dimensionEvidence: {
      marketAttractiveness: "Expert Judgment" as EvidenceBasis,
      offeringFit: "Expert Judgment" as EvidenceBasis,
      channelAccess: "Expert Judgment" as EvidenceBasis,
      operationalFeasibility: "Expert Judgment" as EvidenceBasis,
      strategicValue: "Expert Judgment" as EvidenceBasis,
      financialLogic: "Expert Judgment" as EvidenceBasis,
      brandTrustTransferability: "Expert Judgment" as EvidenceBasis,
      competitiveIntensity: "Expert Judgment" as EvidenceBasis,
      regulatoryComplexity: "Expert Judgment" as EvidenceBasis,
    },
    evidenceBasis: "Expert Judgment",
    evidenceConfidence: "Low" as MarketScoreInput["evidenceConfidence"],
  };

  const handleSliderChange = (
    dim: keyof DimensionScores,
    val: number
  ) => {
    onUpdateScores(currentId, { [dim]: val });
    // Mark dimension as user-adjusted whenever scores are changed
    if (onMarkUserAdjusted) {
      onMarkUserAdjusted(currentId, dim);
    }
  };

  const handleConfidenceChange = (
    conf: MarketScoreInput["evidenceConfidence"]
  ) => {
    onUpdateEvidence(currentId, currentScoreInput.evidenceBasis, conf);
  };

  // Deterministic overall confidence from per-dimension evidence sources
  const computedConfidence: MarketScoreInput["evidenceConfidence"] = computeEvidenceConfidence(
    currentScoreInput.dimensionEvidence
  );

  const getConfidenceColor = (
    conf: MarketScoreInput["evidenceConfidence"]
  ) => {
    switch (conf) {
      case "High":
        return "text-emerald-400 bg-emerald-950/40 border-emerald-900/60";
      case "Medium":
        return "text-amber-400 bg-amber-950/40 border-amber-900/60";
      case "Low":
        return "text-orange-400 bg-orange-950/40 border-orange-900/60";
      case "Unknown":
        return "text-rose-400 bg-rose-950/40 border-rose-900/60";
    }
  };

  return (
    <div
      className="space-y-8 animate-fade-slide-in"
      id="scoring-evidence-container"
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold font-display text-white tracking-tight">
            Strategic Metric Scoring
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isDemo
              ? "Generate draft scores from your inputs, then review and adjust. Your changes are marked as user adjustments."
              : "Score each market across 9 dimensions. Tag the evidence source per dimension."}
          </p>
        </div>
        {isDemo && onGenerateDraftScores && (
          <button
            type="button"
            onClick={onGenerateDraftScores}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/40 cursor-pointer"
            id="generate-draft-scores-btn"
          >
            <Sparkles className="w-4 h-4" />
            <span>{anyDraftGenerated ? "Regenerate Draft Scores" : "Generate Draft Scores"}</span>
          </button>
        )}
      </div>

      {/* Draft-score disclaimer (spec §8.2) + evidence-source instruction (spec §8.1) */}
      <div
        className="bg-amber-950/15 border border-amber-900/40 rounded-xl p-4 flex items-start space-x-3"
        id="draft-score-disclaimer"
      >
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          {isDemo && (
            <p className="text-xs text-amber-200/90 leading-relaxed">
              {DRAFT_SCORE_DISCLAIMER}
            </p>
          )}
          <p className="text-xs text-slate-400 leading-relaxed">
            Select the source of evidence for each dimension from the drop-down menu below it.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Market Sidebar */}
        <div className="space-y-3 lg:col-span-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block pl-1">
            Shortlisted Markets
          </span>
          <div className="space-y-2">
            {selectedMarkets.map((market) => {
              const isActive = market.id === currentId;
              const scoresData = marketScores[market.id];
              const conf = computeEvidenceConfidence(
                scoresData?.dimensionEvidence as Record<keyof DimensionScores, EvidenceBasis> | undefined
              );

              return (
                <button
                  key={market.id}
                  type="button"
                  onClick={() => setActiveMarketId(market.id)}
                  className={`w-full text-left p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                    isActive
                      ? "bg-slate-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/20"
                      : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700"
                  }`}
                  id={`switch-market-${market.id}`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 group-hover:text-white transition-colors text-sm">
                      {market.name}
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 text-slate-500 transition-transform ${
                        isActive ? "translate-x-1" : ""
                      }`}
                    />
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-mono font-bold">
                      CONFIDENCE:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${getConfidenceColor(
                        conf
                      )}`}
                    >
                      {conf}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300 block">
              💡 Scoring Guidance:
            </span>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Positive dimensions:</strong> 1 = Unfavorable → 5 = Favorable</li>
              <li><strong>Adverse dimensions</strong> (Competitive Intensity, Regulatory Complexity): 1 = Low difficulty → 5 = High difficulty</li>
              <li>Adverse scores are automatically inverted in the ranking — higher difficulty lowers the market's potential score</li>
            </ul>
          </div>
        </div>

        {/* Scoring Input Area */}
        <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 rounded-xl p-6 md:p-8 space-y-8">
          <div className="border-b border-slate-800/80 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/60 px-2.5 py-1 rounded">
                SCORING MATRIX: {activeMarket.name.toUpperCase()}
              </span>
              <h3 className="text-xl font-semibold font-display text-white mt-2">
                Evaluate {activeMarket.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {activeMarket.description}
              </p>
            </div>

            {/* Overall Confidence — Computed from per-dimension evidence */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3 min-w-[260px]">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Overall Confidence <span className="text-[9px] text-slate-600 font-normal ml-1">(System-Computed)</span>
                </label>
                <div className={`px-3 py-2 rounded border text-sm font-semibold text-center ${getConfidenceColor(computedConfidence)}`}>
                  {computedConfidence}
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                  Based on the evidence sources and validation status across the selected criteria.
                </p>
              </div>
            </div>
          </div>

          {/* Dimension Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {DIMENSIONS.map((dim) => {
              const val = currentScoreInput.scores[dim.key] ?? 3;
              const dimEvidence =
                currentScoreInput.dimensionEvidence?.[dim.key] ||
                "Expert Judgment";

              const isAdjusted = isDemo && currentScoreInput.userAdjusted?.[dim.key];

              return (
                <div
                  key={dim.key}
                  className={`space-y-3 bg-slate-950/30 border p-4 rounded-xl flex flex-col justify-between ${
                    isAdjusted
                      ? "border-amber-700/50 ring-1 ring-amber-600/20"
                      : "border-slate-800/40"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-200 font-display flex items-center space-x-1 flex-wrap gap-1">
                        <span>{dim.label}</span>
                        {dim.isNegative && (
                          <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40">
                            Negative
                          </span>
                        )}
                        {isAdjusted && (
                          <span className="text-[10px] font-mono text-sky-300 bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-800/50 flex items-center space-x-0.5" id={`adjusted-badge-${dim.key}`}>
                            <PenLine className="w-2.5 h-2.5" />
                            <span>User Adjusted</span>
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/30">
                        {val}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-normal line-clamp-2">
                      {dim.desc}
                    </p>
                  </div>

                  {/* Score Button Group */}
                  <div className="flex items-center space-x-1 pt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          handleSliderChange(dim.key, n)
                        }
                        className={`flex-1 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                          n === val
                            ? dim.isNegative
                              ? "bg-amber-600 text-white shadow-md"
                              : "bg-indigo-600 text-white shadow-md"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  {/* Range Slider */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={val}
                      onChange={(e) =>
                        handleSliderChange(
                          dim.key,
                          parseInt(e.target.value)
                        )
                      }
                      className={`w-full h-1.5 rounded-lg cursor-pointer ${
                        dim.isNegative ? "slider-negative" : ""
                      }`}
                      id={`slider-${dim.key}`}
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      {dim.isNegative ? (
                        <>
                          <span>1 (Low difficulty)</span>
                          <span>3 (Moderate)</span>
                          <span>5 (High difficulty)</span>
                        </>
                      ) : (
                        <>
                          <span>1 (Unfavorable)</span>
                          <span>3 (Neutral)</span>
                          <span>5 (Favorable)</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Per-Dimension Evidence Basis */}
                  <div className="pt-2 border-t border-slate-800/40">
                    <select
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-400 focus:outline-none focus:border-indigo-500"
                      value={dimEvidence}
                      onChange={(e) =>
                        onUpdateDimensionEvidence(
                          currentId,
                          dim.key,
                          e.target.value as EvidenceBasis
                        )
                      }
                      id={`evidence-${dim.key}`}
                    >
                      {EVIDENCE_BASIS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
