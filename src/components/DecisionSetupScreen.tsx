import React from "react";
import { DecisionSetup, DecisionMode, AppMode } from "../types";
import { Crosshair } from "lucide-react";

interface Props {
  data: DecisionSetup;
  onChange: (newData: Partial<DecisionSetup>) => void;
  businessName: string;
  appMode: AppMode;
}

const DECISION_MODES: { value: DecisionMode; label: string }[] = [
  {
    value: "compare",
    label:
      "Compare several possible markets + choose the best product-market-channel combination",
  },
  { value: "assess_one", label: "Assess one target market" },
  { value: "entry_mode", label: "Select the best entry mode" },
  { value: "readiness", label: "Assess expansion readiness" },
];

const HORIZONS = ["12 months", "24 months", "36 months"];

export default function DecisionSetupScreen({
  data,
  onChange,
  businessName,
  appMode,
}: Props) {
  const getDecisionStatement = () => {
    const org = businessName || "Company Alpha";
    const horizon = data.expansionHorizon || "[Expansion Horizon]";
    const objective =
      data.strategicObjective || "[Strategic Objective]";

    const modeMap: Record<DecisionMode, string> = {
      compare:
        "compare several possible markets and choose the best product-market-channel combination",
      assess_one: "assess one target market",
      entry_mode: "select the best entry mode",
      readiness: "assess expansion readiness",
    };

    const modeText = modeMap[data.decisionMode] || modeMap.compare;

    return `${org} is initiating a ${modeText} within a ${horizon} timeline to achieve the following objective: "${objective}". This frames the boundaries of the MEP-light™ evaluation.`;
  };

  return (
    <div className="space-y-8 animate-fade-slide-in" id="decision-setup-container">
      <div>
        <h2 className="text-2xl font-semibold font-display text-white tracking-tight">
          Decision Framing & Objective Setup
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Establish the formal boundaries, timeline, and core intent of this
          expansion project. This dynamic statement will guide downstream
          scoping.
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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              value={data.decisionMode}
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
          </div>

          {/* Expansion Horizon Dropdown */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Expansion Horizon <span className="text-red-500">*</span>
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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors h-32 resize-none"
              placeholder="What must this market entry accomplish?"
              value={data.strategicObjective}
              onChange={(e) =>
                onChange({ strategicObjective: e.target.value })
              }
              id="strategic-objective-input"
            />
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

            <p className="text-lg text-slate-100 font-display font-light leading-relaxed italic">
              "{getDecisionStatement()}"
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            <span>Framework: MEP-light™ Decision Framing</span>
            <span className="font-mono bg-slate-800/40 px-2 py-1 rounded text-indigo-300">
              {appMode === "demo" ? "DEMO_MODE" : "CONSULTANT_MODE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
