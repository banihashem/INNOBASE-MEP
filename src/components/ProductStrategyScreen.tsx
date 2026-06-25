import React from "react";
import { ProductStrategy, STRATEGY_PROFILES, AppMode } from "../types";
import { Check, ShieldAlert, Compass, Package } from "lucide-react";

interface Props {
  data: ProductStrategy;
  onChange: (newData: Partial<ProductStrategy>) => void;
  appMode: AppMode;
}

export default function ProductStrategyScreen({
  data,
  onChange,
  appMode,
}: Props) {
  const selectStrategy = (id: string) => {
    onChange({ selectedStrategy: id });
  };

  const selectedProfile = STRATEGY_PROFILES.find(
    (p) => p.id === data.selectedStrategy
  );

  return (
    <div
      className="space-y-8 animate-fade-slide-in"
      id="product-strategy-container"
    >
      <div>
        <h2 className="text-2xl font-semibold font-display text-white tracking-tight">
          Product Strategy Selection
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Establish the specific product or offering strategy to test. Select
          one model that best describes your entry approach.
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
        {/* Offering Name Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">
            Export / Core Offering Name{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder='e.g. "Offering X" or "Kashkam"'
            value={data.offeringName}
            onChange={(e) => onChange({ offeringName: e.target.value })}
            id="offering-name-input"
          />
        </div>

        {/* Strategy Selection Cards — single select */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-300">
            Select Entry Strategy Model
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STRATEGY_PROFILES.map((profile) => {
              const isSelected = data.selectedStrategy === profile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => selectStrategy(profile.id)}
                  className={`text-left p-5 rounded-xl border transition-all flex flex-col justify-between h-full relative cursor-pointer group ${
                    isSelected
                      ? "bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-950/20 ring-1 ring-indigo-500/20"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/90"
                  }`}
                  id={`strategy-card-${profile.id}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          isSelected
                            ? "bg-indigo-900 text-indigo-200"
                            : "bg-slate-800 text-slate-400 group-hover:text-slate-300"
                        }`}
                      >
                        {profile.tagline}
                      </span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-slate-950">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-semibold text-slate-200 font-display">
                      {profile.name}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {profile.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Consultant Mode: custom adaptation notes */}
        {appMode === "consultant" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Custom Adaptation Checklist{" "}
              <span className="text-[10px] text-slate-500 font-mono ml-1">
                CONSULTANT MODE
              </span>
            </label>
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
              placeholder="e.g. packaging reformulation, halal certification, bilingual labeling requirements..."
              value={data.customAdaptationNotes}
              onChange={(e) =>
                onChange({ customAdaptationNotes: e.target.value })
              }
              id="custom-adaptation-notes"
            />
          </div>
        )}
      </div>

      {/* Selected Strategy Profile Details */}
      {selectedProfile && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm uppercase font-semibold text-indigo-400 tracking-wider">
              Active Strategy Profile: {data.offeringName || "Offering"}
            </h3>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
            <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 text-indigo-400" />
                <span className="text-base font-semibold text-slate-100 font-display">
                  {selectedProfile.name}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                MODEL_ID: {selectedProfile.id.toUpperCase()}
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                  Target Shopper Groups
                </span>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {selectedProfile.targetGroups}
                </p>
              </div>

              <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-800/80 md:pl-6 pt-4 md:pt-0">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                  Likely Channels
                </span>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {selectedProfile.likelyChannels}
                </p>
              </div>

              <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-800/80 md:pl-6 pt-4 md:pt-0">
                <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider block flex items-center space-x-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 inline" />
                  <span>Critical Validation Priorities</span>
                </span>
                <p className="text-sm text-slate-200 font-medium leading-relaxed bg-indigo-950/10 border border-indigo-950 rounded-lg p-3">
                  {selectedProfile.validationPriorities}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
