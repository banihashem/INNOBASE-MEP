import React from "react";
import { Edit3, CheckCircle2, RefreshCw } from "lucide-react";

interface Props {
  notes: string;
  onChange: (notes: string) => void;
}

export default function ConsultantNotes({ notes, onChange }: Props) {
  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear your consultant notes?")) {
      onChange("");
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 mt-12 space-y-4" id="consultant-notes-panel">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-900/60 flex items-center justify-center text-indigo-400">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white font-display uppercase tracking-wider">
              Consultant Workspace & Workshop Annotation Pad
            </h3>
            <p className="text-[11px] text-slate-500">
              Captures temporary workshop assumptions, manual market adjustments, or client strategic remarks.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          {notes.trim().length > 0 && (
            <span className="text-emerald-400 flex items-center space-x-1 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Autosaved</span>
            </span>
          )}
          <button
            onClick={handleClear}
            disabled={!notes}
            className={`font-semibold hover:text-slate-300 transition-colors cursor-pointer ${
              notes ? "text-slate-400" : "text-slate-600 cursor-not-allowed"
            }`}
          >
            Clear Pad
          </button>
        </div>
      </div>

      <div className="relative">
        <textarea
          className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-24 font-mono leading-relaxed"
          placeholder="Type manual workshop observations, client feedback, or custom multipliers here..."
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          id="consultant-notes-textarea"
        />
        <div className="absolute right-3 bottom-3 text-[10px] text-slate-600 font-mono pointer-events-none select-none">
          {notes.length} chars
        </div>
      </div>
    </div>
  );
}
