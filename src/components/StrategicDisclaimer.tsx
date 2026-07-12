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
          Demo Disclaimer
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          MEP-light is a decision-support demo. It does{" "}
          <strong className="text-slate-300">not</strong> predict or guarantee market
          success. Its purpose is to structure entry and expansion thinking, clarify
          assumptions, and identify what should be validated next. It is not regulatory,
          legal, or investment advice; validate results with qualified experts before
          committing resources.
        </p>
      </div>
    </div>
  );
}
