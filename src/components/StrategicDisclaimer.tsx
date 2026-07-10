import React from "react";
import { ShieldAlert } from "lucide-react";

export default function StrategicDisclaimer() {
  return (
    <div
      className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 flex items-start space-x-4"
      id="strategic-disclaimer-panel"
    >
      <div className="w-10 h-10 rounded-lg bg-amber-950/40 border border-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
        <ShieldAlert className="w-5 h-5 text-amber-400" />
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Strategic Safeguard Disclaimer
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          MEP-light™ is a readiness and prioritization intelligence. It clarifies
          preparedness; it does <strong className="text-slate-300">NOT</strong>{" "}
          predict success, or provide formal regulatory or investment guidance.
          All results must be validated by human experts prior
          to commercial commitment.
        </p>
      </div>
    </div>
  );
}
