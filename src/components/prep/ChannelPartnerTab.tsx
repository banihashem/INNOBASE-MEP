import React from "react";
import { Users, Handshake, Search, ClipboardList } from "lucide-react";

interface Props {
  marketName: string;
  offeringName: string;
}

export default function ChannelPartnerTab({
  marketName,
  offeringName,
}: Props) {
  return (
    <div
      className="space-y-6 animate-fade-slide-in"
      id="channel-partner-tab"
    >
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Handshake className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm uppercase font-semibold text-indigo-400 tracking-wider">
            Channel & Partner Readiness
          </h3>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          Assess the readiness of distribution channels and potential partners for{" "}
          <strong className="text-slate-200">{offeringName || "Selected Offering"}</strong>{" "}
          in{" "}
          <strong className="text-indigo-300">{marketName}</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Partner Identification */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Partner Identification
              </h4>
            </div>
            <div className="space-y-3">
              {[
                "Local distributors identified and contacted?",
                "Retail or B2B partner landscape mapped?",
                "Commission or margin structures researched?",
                "Existing trade relationships leveraged?",
                "Due diligence on potential partners completed?",
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

          {/* Channel Strategy */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Channel Strategy Assessment
              </h4>
            </div>
            <div className="space-y-3">
              {[
                "Primary channel type defined (direct, distributor, hybrid)?",
                "Pilot / trial order scope agreed?",
                "Exclusivity or territory terms drafted?",
                "Support and training plan for channel partners?",
                "Digital or e-commerce channel viability assessed?",
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

        {/* Partner Pipeline Notes */}
        <div className="pt-4 space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Partner Pipeline Notes
          </label>
          <textarea
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors min-h-24 resize-y text-sm"
            placeholder="Track partner contacts, meeting notes, terms discussed, LOI status..."
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
