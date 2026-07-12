import React from "react";
import { DecisionSetup, DecisionMode, AppMode, DESIRED_OUTPUT_OPTIONS } from "../types";
import { buildDecisionStatement } from "../lib/narrative";
import { Crosshair } from "lucide-react";

interface Props {
  data: DecisionSetup;
  onChange: (newData: Partial<DecisionSetup>) => void;
  businessName: string;
  /** Company Snapshot context used to enrich the statement after Step 2 (spec 4.4). */
  capabilities?: string;
  constraints?: string;
  sector?: string;
  appMode: AppMode;
}

const DECISION_MODES: { value: DecisionMode; label: string }[] = [
  { value: "New Market Entry Readiness", label: "New Market Entry Readiness" },
  { value: "Existing Market Expansion Readiness", label: "Existing Market Expansion Readiness" },
];

const HORIZONS = ["12 months", "24 months", "36 months"];

export default function DecisionSetupScreen({
  data,
  onChange,
  businessName,
  capabilities,
  constraints,
  sector,
  appMode,
}: Props) {
  const getDecisionStatement = () =>
    buildDecisionStatement({
      businessName,
      decisionMode: data.decisionMode,
      expansionHorizon: data.expansionHorizon,
      strategicObjective: data.strategicObjective,
      capabilities,
      constraints,
      sector,
    });

  const desiredOutput = data.desiredOutput || [];
  const toggleOutput = (opt: string) => {
    const next = desiredOutput.includes(opt)
      ? desiredOutput.filter((o) => o !== opt)
      : [...desiredOutput, opt];
    onChange({ desiredOutput: next });
  };

  return (
    <div className="space-y-8 animate-fade-slide-in" id="decision-setup-container">
      <div>
        <h2 className="text-2xl font-semibold font-display text-white tracking-tight">
          Decision Setup
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Frame whether you are assessing new market entry or expansion within an existing market.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input panel */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
          {/* Decision Mode */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Decision Mode <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
              value={
                data.decisionMode === "New Market Entry Readiness" ||
                data.decisionMode === "Existing Market Expansion Readiness"
                  ? data.decisionMode
                  : "New Market Entry Readiness"
              }
              onChange={(e) =>
                onChange({ decisionMode: e.target.value as DecisionMode })
              }
              id="decision-mode-select"
            >
              {DECISION_MODES.map((dm) => (
                <option key={dm.value} value={dm.value}>
                  {dm.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              {data.decisionMode === "Existing Market Expansion Readiness"
                ? "Assess readiness to expand within an existing market and identify the most suitable expansion pathway."
                : "Assess readiness to enter a new market and identify the most suitable entry pathway."}
            </p>
          </div>

          {/* Entry / Expansion Horizon Dropdown */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Entry / Expansion Horizon <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              value={data.expansionHorizon}
              onChange={(e) =>
                onChange({ expansionHorizon: e.target.value })
              }
              id="expansion-horizon-select"
            >
              {HORIZONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Strategic Objective */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Strategic Objective <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none transition-colors h-28 resize-none focus:border-indigo-500"
              placeholder="State the main strategic objective behind this market entry or expansion decision."
              value={data.strategicObjective}
              onChange={(e) =>
                onChange({ strategicObjective: e.target.value })
              }
              id="strategic-objective-input"
            />
          </div>

          {/* Desired Output */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Desired Output
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="desired-output-group">
              {DESIRED_OUTPUT_OPTIONS.map((opt) => {
                const active = desiredOutput.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleOutput(opt)}
                    aria-pressed={active}
                    className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                      active
                        ? "bg-indigo-950/40 border-indigo-500/50 text-indigo-200"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Real-time Decision Statement Card */}
        <div className="flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-900/40 to-indigo-950/20 border border-slate-800 rounded-xl p-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Crosshair className="w-4 h-4 text-indigo-400" />
              <span className="text-xs uppercase font-semibold text-indigo-400 tracking-wider">
                Dynamic Decision Statement
              </span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            </div>

            <p
              className="text-lg text-slate-100 font-display font-light leading-relaxed italic"
              id="dynamic-decision-statement"
            >
              "{getDecisionStatement()}"
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            <span>Framework: MEP-light™ Decision Framing</span>
            <span className="font-mono bg-slate-800/40 px-2 py-1 rounded text-indigo-300">
              {appMode === "free-demo" ? "FREE_DEMO_MODE" : appMode === "admin" ? "ADMIN_MODE" : "FACILITATED_MODE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
