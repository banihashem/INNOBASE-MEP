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
    const org = businessName || "Client Company";

    const modeText: Record<string, string> = {
      compare:
        "comparing selected markets to identify the most practical product-market-channel pathway",
      assess_one: "assessing one target market for entry feasibility",
      entry_mode: "selecting the best entry mode for its target market",
      readiness: "assessing its overall expansion readiness",
    };

    const horizon = data.expansionHorizon || "";
    const objective = data.strategicObjective || "";
    const mode = data.decisionMode || "compare";

    // Show placeholder until all required fields are filled
    if (!horizon.trim() || !objective.trim()) {
      return "Your decision statement will appear here after the required fields are completed.";
    }

    return `${org} is ${modeText[mode] || modeText.compare} within a ${horizon} expansion horizon. The stated strategic objective is: "${objective}".`;
  };

  return (
    <div className="space-y-8 animate-fade-slide-in" id="decision-setup-container">
      <div>
        <h2 className="text-2xl font-semibold font-display text-white tracking-tight">
          Decision Statement
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          This statement defines the scope of the MEP-light™ assessment.
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
