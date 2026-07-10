import React from "react";
import {
  Market,
  MarketScoreInput,
  EVIDENCE_BASIS_SCORE_MAP,
  CONFIDENCE_SCORE_MAP,
  AppMode,
  CompanySnapshot,
  ProductStrategy,
} from "../types";
import { Trophy, ArrowRight, AlertTriangle } from "lucide-react";
import StrategicDisclaimer from "./StrategicDisclaimer";

interface Props {
  selectedMarkets: Market[];
  marketScores: Record<string, MarketScoreInput>;
  onSelectPrimaryMarketForRoadmap: (marketId: string) => void;
  appMode?: AppMode;
  companySnapshot?: CompanySnapshot;
  productStrategy?: ProductStrategy;
}

export interface CalculatedResult {
  marketId: string;
  name: string;
  opportunity: number;
  fit: number;
  feasibility: number;
  potentialScore: number;
  riskExposure: number;
  riskLevel: "High" | "Medium" | "Low";
  tier: "Tier A: Priority" | "Tier B: Promising" | "Tier C: Do not prioritize" | "Tier D: Exclude from current agenda";
  confidence: "High" | "Medium" | "Low" | "Unknown";
  evidenceBasis: string;
  evidenceConfidenceScore: number;
  mainStrength: string;
  mainWeakness: string;
  discrepancyAlert: boolean;
}

// Dimension category labels for strength/weakness identification
const CATEGORY_LABELS: Record<string, string> = {
  marketAttractiveness: "Market Attractiveness",
  offeringFit: "Offering Fit",
  channelAccess: "Channel Access",
  operationalFeasibility: "Operational Feasibility",
  strategicValue: "Strategic Value",
  financialLogic: "Financial Logic",
  brandTrustTransferability: "Brand Transferability",
};

export default function ComparativeDashboardScreen({
  selectedMarkets,
  marketScores,
  onSelectPrimaryMarketForRoadmap,
  appMode,
  companySnapshot,
  productStrategy,
}: Props) {
  const results: CalculatedResult[] = selectedMarkets.map((market) => {
    const input = marketScores[market.id] || {
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

    const s = input.scores;

    // Invert negative dimensions
    const adjCompetitive = 6 - (s.competitiveIntensity ?? 3);
    const adjRegulatory = 6 - (s.regulatoryComplexity ?? 3);

    // Category Scores
    const opportunity =
      (s.marketAttractiveness ?? 3) * 0.7 + adjCompetitive * 0.3;
    const fit =
      (s.offeringFit ?? 3) * 0.65 +
      (s.brandTrustTransferability ?? 3) * 0.35;
    const feasibility =
      (s.channelAccess ?? 3) * 0.35 +
      adjRegulatory * 0.3 +
      (s.operationalFeasibility ?? 3) * 0.35;

    // Expansion Potential Score (0-100)
    const weightedAverage =
      opportunity * 0.25 +
      fit * 0.2 +
      feasibility * 0.25 +
      (s.strategicValue ?? 3) * 0.1 +
      (s.financialLogic ?? 3) * 0.2;
    const potentialScore = Math.round(weightedAverage * 20);

    // Risk Exposure
    const riskExposure =
      ((s.competitiveIntensity ?? 3) + (s.regulatoryComplexity ?? 3)) / 2;
    let riskLevel: "High" | "Medium" | "Low" = "Medium";
    if (riskExposure >= 3.8) riskLevel = "High";
    else if (riskExposure <= 2.2) riskLevel = "Low";

    // Evidence Confidence Score (0-100)
    // Aggregate per-dimension evidence basis quality
    let evidenceConfidenceScore = 0;
    const dimEvidence = input.dimensionEvidence || {};
    const dimKeys = Object.keys(s) as Array<keyof typeof s>;
    const evidenceScores = dimKeys.map((k) => {
      const basis = dimEvidence[k] || "Expert Judgment";
      return EVIDENCE_BASIS_SCORE_MAP[basis] || 25;
    });
    const avgDimEvidence =
      evidenceScores.reduce((a, b) => a + b, 0) / evidenceScores.length;
    // Blend with overall confidence (60% dimension avg, 40% overall)
    const overallConfScore =
      CONFIDENCE_SCORE_MAP[input.evidenceConfidence] || 30;
    evidenceConfidenceScore = Math.round(
      avgDimEvidence * 0.6 + overallConfScore * 0.4
    );

    // Discrepancy Alert: if Potential > 70 AND Evidence Confidence < 50
    const discrepancyAlert =
      potentialScore > 70 && evidenceConfidenceScore < 50;

    // Tier assignment (with discrepancy downgrade)
    let tier: CalculatedResult["tier"] = "Tier C: Do not prioritize";
    if (discrepancyAlert) {
      tier = "Tier B: Promising"; // auto-downgrade
    } else if (potentialScore >= 75) {
      tier = "Tier A: Priority";
    } else if (potentialScore >= 60) {
      tier = "Tier B: Promising";
    } else if (potentialScore < 40) {
      tier = "Tier D: Exclude from current agenda";
    }

    // Main Strength / Weakness (from positive dimensions only)
    const positiveDims: { key: string; score: number }[] = [
      { key: "marketAttractiveness", score: s.marketAttractiveness ?? 3 },
      { key: "offeringFit", score: s.offeringFit ?? 3 },
      { key: "channelAccess", score: s.channelAccess ?? 3 },
      {
        key: "operationalFeasibility",
        score: s.operationalFeasibility ?? 3,
      },
      { key: "strategicValue", score: s.strategicValue ?? 3 },
      { key: "financialLogic", score: s.financialLogic ?? 3 },
      {
        key: "brandTrustTransferability",
        score: s.brandTrustTransferability ?? 3,
      },
    ];
    const sortedDims = [...positiveDims].sort(
      (a, b) => b.score - a.score
    );
    const mainStrength =
      CATEGORY_LABELS[sortedDims[0].key] || sortedDims[0].key;
    const mainWeakness =
      CATEGORY_LABELS[sortedDims[sortedDims.length - 1].key] ||
      sortedDims[sortedDims.length - 1].key;

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
      mainStrength,
      mainWeakness,
      discrepancyAlert,
    };
  });

  const leadingCandidate = results.length > 0 ? results.reduce((prev, current) => 
    (prev.potentialScore > current.potentialScore) ? prev : current
  ) : null;

  const sortedResults = [...results].sort(
    (a, b) => b.potentialScore - a.potentialScore
  );

  const getConfidenceBadge = (conf: string, score: number) => {
    let colors = "bg-rose-950 text-rose-400 border-rose-900/40";
    let label = "Evidence Gap";
    if (score >= 70) {
      colors = "bg-emerald-950 text-emerald-400 border-emerald-900/40";
      label = "Reliable";
    } else if (score >= 50) {
      colors = "bg-amber-950 text-amber-400 border-amber-900/40";
      label = "Needs Validation";
    } else if (score >= 30) {
      colors = "bg-orange-950 text-orange-400 border-orange-900/40";
      label = "Assumption-Based";
    }

    return (
      <div className="flex flex-col items-center">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${colors}`}
        >
          {label}
        </span>
        <span className="text-[10px] text-slate-500 font-mono mt-0.5">
          {score}/100
        </span>
      </div>
    );
  };

  const getRiskBadge = (level: "High" | "Medium" | "Low") => {
    const styles = {
      High: "bg-rose-950/20 text-rose-400 border-rose-900/40",
      Medium: "bg-amber-950/20 text-amber-400 border-amber-900/40",
      Low: "bg-emerald-950/20 text-emerald-400 border-emerald-900/40",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[level]}`}
      >
        {level} Risk
      </span>
    );
  };

  const getTierBadge = (
    tier: CalculatedResult["tier"],
    discrepancy: boolean
  ) => {
    if (discrepancy) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-900/40 text-amber-300 border border-amber-500/30">
          Tier B: Hypothesis
        </span>
      );
    }
    if (tier === "Tier A: Priority") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-900/40 text-emerald-300 border border-emerald-500/30">
          Tier A: Priority
        </span>
      );
    } else if (tier === "Tier B: Promising") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-900/40 text-indigo-300 border border-indigo-500/30">
          Tier B: Promising
        </span>
      );
    } else if (tier === "Tier D: Exclude from current agenda") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-950/40 text-red-400 border border-red-500/30">
          Tier D: Exclude
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
        Tier C: Postpone
      </span>
    );
  };

  return (
    <div
      className="space-y-8 animate-fade-slide-in"
      id="comparative-dashboard-container"
    >
      <div>
        <h2 className="text-2xl font-semibold font-display text-white tracking-tight">
          Strategic Comparative Dashboard
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Side-by-side diagnostics with weighted models, evidence
          confidence scoring, and automatic discrepancy alerts.
        </p>
      </div>

      {/* Top Scorer Card */}
      {sortedResults.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-indigo-950/20 border border-indigo-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 rounded-xl bg-indigo-600/15 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block font-mono">
                Leading Validation Candidate
              </span>
              <h3 className="text-2xl font-bold font-display text-white mt-0.5">
                {sortedResults[0].name}
              </h3>
              <p className="text-xs text-slate-400 max-w-xl">
                This option currently scores highest under the available assumptions and evidence at{" "}
                <strong className="text-indigo-300">
                  {sortedResults[0].potentialScore}/100
                </strong>
                , but it should be validated before major investment. Evidence confidence:{" "}
                <strong>{sortedResults[0].evidenceConfidenceScore}/100</strong>.
                {sortedResults[0].discrepancyAlert && (
                  <span className="text-amber-400 ml-1">
                    ⚠ Discrepancy Alert: High score but low evidence.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center text-center bg-slate-950 px-6 py-4 rounded-xl border border-slate-800/80 min-w-[140px]">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              Potential Score
            </span>
            <span className="text-3xl font-extrabold text-indigo-400 font-mono mt-1">
              {sortedResults[0].potentialScore}
            </span>
          </div>
        </div>
      )}

      {/* Discrepancy Alert Banner */}
      {sortedResults.some((r) => r.discrepancyAlert) && (
        <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-4 flex items-start space-x-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-300">
              Evidence Discrepancy Detected
            </h4>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              One or more markets scored above 70 in Expansion Potential
              but below 50 in Evidence Confidence. These have been
              auto-downgraded to "Tier B: Hypothesis — Requires
              Validation" until evidence quality improves.
            </p>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-4 text-center w-14">Rank</th>
                <th className="py-4 px-4">Market</th>
                <th className="py-4 px-4 text-center">
                  Opp (25%)
                </th>
                <th className="py-4 px-4 text-center">
                  Fit (20%)
                </th>
                <th className="py-4 px-4 text-center">
                  Feas (25%)
                </th>
                <th className="py-4 px-4 text-center">Score</th>
                <th className="py-4 px-4 text-center">
                  Evidence
                </th>
                <th className="py-4 px-4 text-center">Risk</th>
                <th className="py-4 px-4 text-center">Strength</th>
                <th className="py-4 px-4 text-center">Weakness</th>
                <th className="py-4 px-4 text-center">Tier</th>
                <th className="py-4 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedResults.map((result, idx) => (
                <tr
                  key={result.marketId}
                  className={`hover:bg-slate-900/40 transition-colors text-sm text-slate-200 ${
                    result.discrepancyAlert
                      ? "bg-amber-950/5"
                      : ""
                  }`}
                >
                  <td className="py-4 px-4 text-center font-mono font-bold text-slate-400">
                    #{idx + 1}
                  </td>
                  <td className="py-4 px-4 font-semibold font-display text-white whitespace-nowrap">
                    {result.name}
                  </td>
                  <td className="py-4 px-4 text-center font-mono text-slate-400">
                    {result.opportunity.toFixed(1)}
                  </td>
                  <td className="py-4 px-4 text-center font-mono text-slate-400">
                    {result.fit.toFixed(1)}
                  </td>
                  <td className="py-4 px-4 text-center font-mono text-slate-400">
                    {result.feasibility.toFixed(1)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-mono font-bold text-indigo-400 bg-indigo-950/20 border border-indigo-900/30 px-2.5 py-1 rounded">
                      {result.potentialScore}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    {getConfidenceBadge(
                      result.confidence,
                      result.evidenceConfidenceScore
                    )}
                  </td>
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <div className="flex flex-col items-center">
                      {getRiskBadge(result.riskLevel)}
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {result.riskExposure.toFixed(1)}/5
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center text-xs text-emerald-400 whitespace-nowrap">
                    {result.mainStrength}
                  </td>
                  <td className="py-4 px-4 text-center text-xs text-rose-400 whitespace-nowrap">
                    {result.mainWeakness}
                  </td>
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    {getTierBadge(result.tier, result.discrepancyAlert)}
                  </td>
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        onSelectPrimaryMarketForRoadmap(
                          result.marketId
                        )
                      }
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer mx-auto"
                      id={`action-roadmap-${result.marketId}`}
                    >
                      <span>View Pathway</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weight Model Description */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <h4 className="text-sm uppercase font-semibold text-indigo-400 tracking-wider">
          Diagnostic Weight Framework {companySnapshot?.sector ? `— ${companySnapshot.sector}` : ""} {leadingCandidate ? `— For Leading Candidate (${leadingCandidate.name})` : ""}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2">
          {[
            {
              label: "Opportunity (25%)",
              desc: `Market size adjusted by competitive concentration for ${productStrategy?.offeringName || "your offering"}.`,
            },
            {
              label: "Fit (20%)",
              desc: `Product alignment and brand transferability based on ${productStrategy?.selectedStrategy || "selected strategy"}.`,
            },
            {
              label: "Feasibility (25%)",
              desc: `Distributor path, operations, and ${companySnapshot?.sector ? `${companySnapshot.sector} regulations` : "regulations"}.`,
            },
            {
              label: "Strategic Value (10%)",
              desc: "Brand synergy and protective moats.",
            },
            {
              label: "Financial Logic (20%)",
              desc: "Acquisition costs and projected margins.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-slate-950 p-4 rounded-lg border border-slate-800/80"
            >
              <span className="text-xs text-slate-500 block">
                {item.label}
              </span>
              <span className="text-xs text-slate-300 block mt-1">
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Disclaimer */}
      <StrategicDisclaimer />
    </div>
  );
}
