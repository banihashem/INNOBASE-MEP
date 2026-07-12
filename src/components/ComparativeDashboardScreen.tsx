import React from "react";
import {
  Market,
  MarketScoreInput,
  AppMode,
  CompanySnapshot,
  ProductStrategy,
} from "../types";
import {
  computeMarketResult,
  resolveSectorWeights,
  MarketResult,
} from "../lib/scoring";
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

/** Re-exported for existing consumers (App.tsx, ExportBriefModal, PDF payload). */
export type CalculatedResult = MarketResult;

export default function ComparativeDashboardScreen({
  selectedMarkets,
  marketScores,
  onSelectPrimaryMarketForRoadmap,
  appMode,
  companySnapshot,
  productStrategy,
}: Props) {
  const sectorWeights = resolveSectorWeights(companySnapshot?.sector);
  const results: MarketResult[] = selectedMarkets.map((market) =>
    computeMarketResult(market.id, market.name, marketScores[market.id], sectorWeights)
  );

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

  // Letter-grade badge (spec 9.4): 77 → "A-". The grade is a validation-oriented
  // display over the composite score; low-confidence markets show a caution note.
  const getGradeBadge = (grade: MarketResult["letterGrade"], discrepancy: boolean) => {
    let colors = "bg-slate-800 text-slate-400 border-slate-700";
    if (grade === "A" || grade === "A-")
      colors = "bg-emerald-900/40 text-emerald-300 border-emerald-500/30";
    else if (grade === "B+" || grade === "B")
      colors = "bg-indigo-900/40 text-indigo-300 border-indigo-500/30";
    else if (grade === "B-")
      colors = "bg-amber-900/30 text-amber-300 border-amber-500/30";
    else if (grade === "D")
      colors = "bg-red-950/40 text-red-400 border-red-500/30";

    return (
      <div className="flex flex-col items-center gap-1">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${colors}`}>
          {grade}
        </span>
        {discrepancy && (
          <span className="text-[9px] text-amber-400 font-mono">requires validation</span>
        )}
      </div>
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
              Expansion Potential Score
            </span>
            <span className="text-3xl font-extrabold text-indigo-400 font-mono mt-1">
              {sortedResults[0].potentialScore}
            </span>
            <span className="text-[10px] text-slate-500 font-mono mt-1">
              Grade {sortedResults[0].letterGrade}
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
                <th className="py-4 px-4">Option</th>
                <th className="py-4 px-4 text-center">Opportunity</th>
                <th className="py-4 px-4 text-center">Fit</th>
                <th className="py-4 px-4 text-center">Feasibility</th>
                <th className="py-4 px-4 text-center">Expansion&nbsp;Potential</th>
                <th className="py-4 px-4 text-center">Evidence&nbsp;Confidence</th>
                <th className="py-4 px-4 text-center">Risk&nbsp;Exposure</th>
                <th className="py-4 px-4 text-center">Strength</th>
                <th className="py-4 px-4 text-center">Weakness</th>
                <th className="py-4 px-4 text-center">Tier</th>
                <th className="py-4 px-4 text-center">Recommended&nbsp;Action</th>
                <th className="py-4 px-4 text-center">Pathway</th>
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
                    {getGradeBadge(result.letterGrade, result.discrepancyAlert)}
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-300 leading-snug min-w-[220px] max-w-[280px]">
                    {result.recommendedAction}
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

      {/* Diagnostic Weight Framework (spec 9.2) — shown only for the Leading Validation Candidate */}
      {leadingCandidate && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-3">
          <h4 className="text-sm uppercase font-semibold text-indigo-400 tracking-wider">
            Diagnostic Weight Framework
            {companySnapshot?.sector ? ` - ${companySnapshot.sector} Model` : ""}
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            This framework shows how MEP-light weighted the main decision criteria for the
            selected business type and market pathway. Higher weights indicate stronger
            influence on the final score.
          </p>
          <p className="text-xs font-semibold text-slate-300">
            Weighting applied to: {leadingCandidate.name}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2">
            {[
              {
                label: "Opportunity",
                weight: sectorWeights.opportunity,
                desc: `Shows how attractive ${leadingCandidate.name} appears based on demand signals, customer relevance, and competitive pressure.`,
              },
              {
                label: "Fit",
                weight: sectorWeights.fit,
                desc: `Shows how well ${productStrategy?.offeringName || "the selected offering"} aligns with customer needs, local expectations, and brand transferability.`,
              },
              {
                label: "Feasibility",
                weight: sectorWeights.feasibility,
                desc: `Shows whether the business can realistically enter or expand through available channels, operations, and regulatory conditions.`,
              },
              {
                label: "Strategic Value",
                weight: sectorWeights.strategic,
                desc: `Shows whether ${leadingCandidate.name} supports longer-term positioning, learning, or portfolio growth.`,
              },
              {
                label: "Financial Logic",
                weight: sectorWeights.financial,
                desc: `Shows whether the pathway appears commercially viable after costs, pricing, and resource requirements.`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-slate-950 p-4 rounded-lg border border-slate-800/80"
              >
                <span className="text-xs text-slate-500 block">
                  {item.label} ({Math.round(item.weight * 100)}%)
                </span>
                <span className="text-xs text-slate-300 block mt-1">
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategic Disclaimer */}
      <StrategicDisclaimer />
    </div>
  );
}
