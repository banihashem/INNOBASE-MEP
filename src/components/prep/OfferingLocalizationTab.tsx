import React from "react";
import { Lightbulb, ClipboardList, Layers } from "lucide-react";

interface Props {
  marketName: string;
  offeringName: string;
}

export default function OfferingLocalizationTab({
  marketName,
  offeringName,
}: Props) {
  return (
    <div
      className="space-y-6 animate-fade-slide-in"
      id="offering-localization-tab"
    >
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm uppercase font-semibold text-indigo-400 tracking-wider">
            Offering & Localization Readiness
          </h3>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          Evaluate what adaptations are required to make{" "}
          <strong className="text-slate-200">{offeringName || "Selected Offering"}</strong>{" "}
          competitive and compliant in{" "}
          <strong className="text-indigo-300">{marketName}</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Product Adaptation Checklist */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Product Adaptation Checklist
              </h4>
            </div>
            <div className="space-y-3">
              {[
                "Formulation / composition changes required?",
                "Labeling language & compliance updates needed?",
                "Packaging format or sizing adjustments?",
                "Branding or positioning repositioning required?",
                "Certification or testing requirements identified?",
              ].map((item, i) => (
                <label
                  key={i}
                  className="flex items-start space-x-3 text-sm text-slate-400 hover:text-slate-300 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Localization Considerations */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Localization Considerations
              </h4>
            </div>
            <div className="space-y-3">
              {[
                "Cultural or taste preferences factored in?",
                "Local competitor benchmarking completed?",
                "Price point calibration for local market?",
                "Marketing message & visual identity localized?",
                "Seasonal or event-driven demand patterns identified?",
              ].map((item, i) => (
                <label
                  key={i}
                  className="flex items-start space-x-3 text-sm text-slate-400 hover:text-slate-300 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="pt-4 space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Localization Notes
          </label>
          <textarea
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors min-h-24 resize-y text-sm"
            placeholder="Document specific localization requirements, adaptation decisions, or open questions for this market..."
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
