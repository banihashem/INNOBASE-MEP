import React from "react";
import { X, Printer, FileText } from "lucide-react";
import { DecisionSetup, CompanySnapshot, ProductStrategy, Market, MarketScoreInput, STRATEGY_PROFILES, CLIENT_FACING_LABEL } from "../types";

interface CalculatedResult {
  marketId: string;
  name: string;
  potentialScore: number;
  tier: string;
  confidence: string;
  riskLevel: string;
  opportunity: number;
  fit: number;
  feasibility: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  decisionSetup: DecisionSetup;
  companySnapshot: CompanySnapshot;
  productStrategy: ProductStrategy;
  selectedMarkets: Market[];
  marketScores: Record<string, MarketScoreInput>;
  results: CalculatedResult[];
  consultantNotes: string;
  selectedRoadmapMarketId: string;
  reviewStatus?: string;
}

export default function ExportBriefModal({
  isOpen,
  onClose,
  decisionSetup,
  companySnapshot,
  productStrategy,
  selectedMarkets,
  marketScores,
  results,
  consultantNotes,
  selectedRoadmapMarketId,
  reviewStatus,
}: Props) {
  if (!isOpen) return null;

  const strategyProfile = STRATEGY_PROFILES.find(
    (p) => p.id === productStrategy.selectedStrategy
  );

  const topResult = results.length > 0 ? results[0] : null;
  const roadmapMarket = selectedMarkets.find(
    (m) => m.id === selectedRoadmapMarketId
  );

  const getDecisionModeLabel = (mode: string) => {
    switch (mode) {
      case "compare":
        return "Compare several possible markets + choose the best product-market-channel combination";
      case "assess_one":
        return "Assess one target market";
      case "entry_mode":
        return "Select the best entry mode";
      case "readiness":
        return "Assess expansion readiness";
      default:
        return mode;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] modal-overlay">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col modal-content">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 no-print">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-white">
                MEP-light™ Strategic Brief
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">
                BOARD-READY EXPORT • {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Brief</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Brief Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 print-brief relative">
          {reviewStatus !== "approved" && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 opacity-10">
              <div className="transform -rotate-45 text-slate-500 font-black text-6xl md:text-8xl whitespace-nowrap">
                DRAFT — NOT HUMAN REVIEWED
              </div>
            </div>
          )}
          <div className="max-w-4xl mx-auto space-y-10 relative z-10">
            {/* Title Block */}
            <div className="text-center space-y-2 pb-8 border-b border-slate-800">
              <h1 className="text-3xl font-bold font-display text-white">
                MEP-light™ Strategic Assessment Brief
              </h1>
              <p className="text-sm text-slate-400">
                Market Entry Prioritizer • Confidential Strategy Document
              </p>
              <p className="text-xs text-slate-500 font-mono mt-2">
                Generated: {new Date().toISOString().split("T")[0]} • {CLIENT_FACING_LABEL}
              </p>
            </div>

            {/* 1. Decision Statement */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-indigo-400 uppercase tracking-wider">
                1. Decision Statement
              </h2>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <p className="text-sm text-slate-200 leading-relaxed">
                  <strong>{companySnapshot.businessName || "Client Company"}</strong> is
                  initiating a strategic initiative to{" "}
                  <em>{getDecisionModeLabel(decisionSetup.decisionMode).toLowerCase()}</em>{" "}
                  within a <strong>{decisionSetup.expansionHorizon}</strong>{" "}
                  timeline to achieve the following objective:{" "}
                  <em>"{decisionSetup.strategicObjective}"</em>
                </p>
              </div>
            </section>

            {/* 2. Company Snapshot */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-indigo-400 uppercase tracking-wider">
                2. Company Snapshot
              </h2>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="px-5 py-3 text-slate-400 font-medium w-1/3">Organization</td>
                      <td className="px-5 py-3 text-slate-200">{companySnapshot.businessName}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-slate-400 font-medium">Sector</td>
                      <td className="px-5 py-3 text-slate-200">{companySnapshot.sector}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-slate-400 font-medium">Domestic Market Size</td>
                      <td className="px-5 py-3 text-slate-200">{companySnapshot.domesticMarketSize || "Not specified"}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-slate-400 font-medium">Export Experience</td>
                      <td className="px-5 py-3 text-slate-200">{companySnapshot.exportExperience || "Not specified"}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-slate-400 font-medium">Capabilities</td>
                      <td className="px-5 py-3 text-slate-200">{companySnapshot.internalCapabilities}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-slate-400 font-medium">Constraints</td>
                      <td className="px-5 py-3 text-slate-200">{companySnapshot.knownConstraints}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. Offering Strategy */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-indigo-400 uppercase tracking-wider">
                3. Offering Strategy
              </h2>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
                <p className="text-sm text-slate-200">
                  <strong>Offering:</strong> {productStrategy.offeringName}
                </p>
                {strategyProfile && (
                  <p className="text-sm text-slate-200">
                    <strong>Strategy Model:</strong> {strategyProfile.name}
                  </p>
                )}
              </div>
            </section>

            {/* 4. Comparative Ranking Table */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-indigo-400 uppercase tracking-wider">
                4. Comparative Ranking
              </h2>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Market</th>
                      <th className="py-3 px-4 text-center">Opportunity</th>
                      <th className="py-3 px-4 text-center">Fit</th>
                      <th className="py-3 px-4 text-center">Feasibility</th>
                      <th className="py-3 px-4 text-center">Score</th>
                      <th className="py-3 px-4 text-center">Confidence</th>
                      <th className="py-3 px-4 text-center">Risk</th>
                      <th className="py-3 px-4">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {results.map((r, idx) => (
                      <tr key={r.marketId}>
                        <td className="py-3 px-4 font-mono text-slate-400">#{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-white">{r.name}</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-300">{r.opportunity.toFixed(1)}</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-300">{r.fit.toFixed(1)}</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-300">{r.feasibility.toFixed(1)}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-indigo-400">{r.potentialScore}</td>
                        <td className="py-3 px-4 text-center text-slate-300">{r.confidence}</td>
                        <td className="py-3 px-4 text-center text-slate-300">{r.riskLevel}</td>
                        <td className="py-3 px-4 text-slate-200">{r.tier}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 5. 30-60-90 Day Roadmap Summary */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold font-display text-indigo-400 uppercase tracking-wider">
                5. 90-Day Validation Roadmap — {roadmapMarket?.name || "Primary Market"}
              </h2>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                      <th className="py-3 px-5">Phase</th>
                      <th className="py-3 px-5">Timeline</th>
                      <th className="py-3 px-5">Objective</th>
                      <th className="py-3 px-5">Decision Gate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    <tr>
                      <td className="py-3 px-5 text-indigo-400 font-semibold">Phase 1</td>
                      <td className="py-3 px-5 text-slate-300">Days 1–30</td>
                      <td className="py-3 px-5 text-slate-200">Validate core assumptions — interviews, competitor review, regulatory check, pricing/cost estimate, capacity review</td>
                      <td className="py-3 px-5 text-slate-300">Continue, revise, or pause.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-5 text-indigo-400 font-semibold">Phase 2</td>
                      <td className="py-3 px-5 text-slate-300">Days 31–60</td>
                      <td className="py-3 px-5 text-slate-200">Design controlled pilot — target segment, pilot offer, pathway, sales materials, partner role, metrics</td>
                      <td className="py-3 px-5 text-slate-300">Launch pilot or delay.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-5 text-indigo-400 font-semibold">Phase 3</td>
                      <td className="py-3 px-5 text-slate-300">Days 61–90</td>
                      <td className="py-3 px-5 text-slate-200">Test and decide — run limited pilot; track demand, leads, sales, usage, feedback, margin, feasibility</td>
                      <td className="py-3 px-5 text-slate-300">Scale, adapt, pause, or test another option.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 6. Consultant Notes */}
            {consultantNotes.trim() && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold font-display text-indigo-400 uppercase tracking-wider">
                  6. Consultant Workshop Notes
                </h2>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                    {consultantNotes}
                  </p>
                </div>
              </section>
            )}

            {/* Footer Disclaimer */}
            <div className="pt-8 border-t border-slate-800 text-center space-y-2">
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-2xl mx-auto">
                MEP-light™ is a readiness and prioritization intelligence. It
                clarifies preparedness; it does NOT predict success, or provide
                formal regulatory or investment guidance. All results must be
                validated by human experts prior to commercial commitment.
              </p>
              <p className="text-[10px] text-slate-600 font-mono">
                © 2026 INNOBASE • MEP-light™ Market Entry &amp; Expansion Decision Support
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
