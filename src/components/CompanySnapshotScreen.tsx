import React from "react";
import {
  CompanySnapshot,
  EvidenceState,
  AppMode,
  ACTIVE_SECTORS,
  COMING_SOON_SECTORS,
  evidenceStateLabel,
} from "../types";
import { buildOrgContextSummary } from "../lib/narrative";
import { CheckCircle2, HelpCircle, AlertCircle, Building2 } from "lucide-react";

interface Props {
  data: CompanySnapshot;
  onChange: (newData: Partial<CompanySnapshot>) => void;
  appMode: AppMode;
  decisionMode?: string;
}

const EXPORT_EXPERIENCE_OPTIONS = [
  "No Experience",
  "Limited/Indirect Exporting",
  "Active International Exporter",
];

export default function CompanySnapshotScreen({ data, onChange, appMode, decisionMode }: Props) {
  const handleFieldChange = (
    field: keyof Omit<CompanySnapshot, "evidenceStates">,
    value: string
  ) => {
    onChange({ [field]: value });
  };

  const handleStateChange = (
    field: keyof CompanySnapshot["evidenceStates"],
    state: EvidenceState
  ) => {
    const updatedStates = { ...data.evidenceStates, [field]: state };
    onChange({ evidenceStates: updatedStates });
  };

  const renderEvidenceToggle = (
    field: keyof CompanySnapshot["evidenceStates"]
  ) => {
    // Normalize legacy "Unknown" → "To Validate" for selection highlighting.
    const currentState: EvidenceState =
      data.evidenceStates[field] === "Unknown" ? "To Validate" : data.evidenceStates[field];
    const states: { value: EvidenceState; label: string }[] = [
      { value: "Confirmed", label: "Confirmed" },
      { value: "Estimated", label: "Estimated" },
      { value: "To Validate", label: "To Validate" },
    ];

    return (
      <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
        {states.map((st) => {
          const isSelected = currentState === st.value;
          let activeClass = "text-slate-500 hover:text-slate-300";
          if (isSelected) {
            if (st.value === "Confirmed")
              activeClass =
                "bg-emerald-950 text-emerald-400 border border-emerald-900/50 font-semibold";
            else if (st.value === "Estimated")
              activeClass =
                "bg-amber-950 text-amber-400 border border-amber-900/50 font-semibold";
            else
              activeClass =
                "bg-rose-950 text-rose-400 border border-rose-900/50 font-semibold";
          }

          return (
            <button
              key={st.value}
              type="button"
              className={`text-xs px-2.5 py-1 rounded-md transition-all cursor-pointer ${activeClass}`}
              onClick={() => handleStateChange(field, st.value)}
            >
              {st.label}
            </button>
          );
        })}
      </div>
    );
  };

  const getEvidenceStateBadge = (state: EvidenceState) => {
    const label = evidenceStateLabel(state); // maps legacy "Unknown" → "To Validate"
    if (label === "Confirmed") {
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
          <CheckCircle2 className="w-3 h-3" />
          <span>Confirmed</span>
        </span>
      );
    }
    if (label === "Estimated") {
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
          <HelpCircle className="w-3 h-3" />
          <span>Estimated</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 text-[10px] text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/40">
        <AlertCircle className="w-3 h-3" />
        <span>To Validate</span>
      </span>
    );
  };

  // Organizational context summary — synthesized, not concatenated (see src/lib/narrative.ts).
  const getContextSummary = (): string => buildOrgContextSummary(data, decisionMode);

  return (
    <div
      className="space-y-8 animate-fade-slide-in"
      id="company-snapshot-container"
    >
      <div>
        <h2 className="text-2xl font-semibold font-display text-white tracking-tight">
          Company Snapshot
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Capture the current state of the business or organization. Tag the evidence
          quality of each field as Confirmed, Estimated, or To Validate.
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
        {/* Business Name */}
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="text-sm font-medium text-slate-300">
              Company Name <span className="text-red-500">*</span>
            </label>
            {renderEvidenceToggle("businessName")}
          </div>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="e.g. Client Company"
            value={data.businessName}
            onChange={(e) => handleFieldChange("businessName", e.target.value)}
            id="business-name-input"
          />
        </div>

        {/* Sector */}
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="text-sm font-medium text-slate-300">
              Industry Sector <span className="text-red-500">*</span>
            </label>
            {renderEvidenceToggle("sector")}
          </div>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            value={data.sector}
            onChange={(e) => handleFieldChange("sector", e.target.value)}
            id="sector-select"
          >
            <optgroup label="Active sectors">
              {ACTIVE_SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </optgroup>
            <optgroup label="Coming soon">
              {COMING_SOON_SECTORS.map((s) => (
                <option key={s} value={s} disabled>
                  {s} — Coming soon
                </option>
              ))}
            </optgroup>
          </select>
          <p className="text-xs text-slate-500">
            Only active sectors have defined scoring emphasis in this demo. Additional sectors are coming soon.
          </p>
        </div>

        {/* Domestic Market Size — NEW */}
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="text-sm font-medium text-slate-300">
              Current Domestic Market Size
            </label>
            {renderEvidenceToggle("domesticMarketSize")}
          </div>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="e.g., current market coverage, approximate customer base, sales volume, revenue range, geographic reach, market share estimate, key domestic channels, or strongest customer segments."
            value={data.domesticMarketSize}
            onChange={(e) =>
              handleFieldChange("domesticMarketSize", e.target.value)
            }
            id="domestic-market-size-input"
          />
        </div>

        {/* Export Experience — NEW */}
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="text-sm font-medium text-slate-300">
              Existing Export Experience
            </label>
            {renderEvidenceToggle("exportExperience")}
          </div>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            value={data.exportExperience}
            onChange={(e) =>
              handleFieldChange("exportExperience", e.target.value)
            }
            id="export-experience-select"
          >
            {EXPORT_EXPERIENCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Internal Capabilities */}
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="text-sm font-medium text-slate-300">
              Known Capabilities & Resources
            </label>
            {renderEvidenceToggle("internalCapabilities")}
          </div>
          <textarea
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors min-h-24 resize-y"
            placeholder="e.g., brand strength, production capacity, export experience, technical know-how, distribution network, financial resources, partner relationships, internal team capabilities, certifications, or proprietary assets that may support market entry or expansion."
            value={data.internalCapabilities}
            onChange={(e) =>
              handleFieldChange("internalCapabilities", e.target.value)
            }
            id="internal-capabilities-input"
            rows={3}
          />
        </div>

        {/* Known Constraints */}
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <label className="text-sm font-medium text-slate-300">
              Known Constraints & Vulnerabilities
            </label>
            {renderEvidenceToggle("knownConstraints")}
          </div>
          <textarea
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors min-h-24 resize-y"
            placeholder="e.g., limited market evidence, regulatory uncertainty, weak partner access, logistics complexity, pricing pressure, limited budget, internal capacity gaps, brand unfamiliarity, operational risks, or any issue that may reduce the chance of success in the target market."
            value={data.knownConstraints}
            onChange={(e) =>
              handleFieldChange("knownConstraints", e.target.value)
            }
            id="known-constraints-input"
            rows={3}
          />
        </div>
      </div>

      {/* Dynamic Organizational Context Summary */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/40 to-indigo-950/20 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm uppercase font-semibold text-indigo-400 tracking-wider">
            Organizational Context Summary
          </h3>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed italic">
          {"\u201C"}{getContextSummary() ||
            "Complete the fields above to generate a context summary."}{"\u201D"}
        </p>

        {/* Evidence quality badges grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-800/60">
          {(
            Object.keys(data.evidenceStates) as Array<
              keyof CompanySnapshot["evidenceStates"]
            >
          ).map((field) => {
            const labels: Record<string, string> = {
              businessName: "Name",
              sector: "Sector",
              domesticMarketSize: "Market Size",
              exportExperience: "Export Exp.",
              internalCapabilities: "Capabilities",
              knownConstraints: "Constraints",
            };
            return (
              <div
                key={field}
                className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 space-y-1.5"
              >
                <span className="text-[10px] text-slate-500 block truncate">
                  {labels[field]}
                </span>
                {getEvidenceStateBadge(data.evidenceStates[field])}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
