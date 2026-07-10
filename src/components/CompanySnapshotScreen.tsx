import React from "react";
import { CompanySnapshot, EvidenceState, AppMode } from "../types";
import { CheckCircle2, HelpCircle, AlertCircle, Building2 } from "lucide-react";

interface Props {
  data: CompanySnapshot;
  onChange: (newData: Partial<CompanySnapshot>) => void;
  appMode: AppMode;
}

const SECTORS = [
  "Food & Beverage Manufacturing",
  "SaaS / Digital Platform",
  "Industrial / Manufacturing",
  "Professional Services",
  "Healthcare / MedTech",
  "Consumer Packaged Goods",
  "Financial & Fintech Solutions",
];

const EXPORT_EXPERIENCE_OPTIONS = [
  "No Experience",
  "Limited/Indirect Exporting",
  "Active International Exporter",
];

export default function CompanySnapshotScreen({ data, onChange, appMode }: Props) {
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
    const currentState = data.evidenceStates[field];
    const states: { value: EvidenceState; label: string }[] = [
      { value: "Confirmed", label: "Confirmed" },
      { value: "Estimated", label: "Estimated" },
      { value: "Unknown", label: "To Validate" },
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
    switch (state) {
      case "Confirmed":
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
            <CheckCircle2 className="w-3 h-3" />
            <span>Confirmed</span>
          </span>
        );
      case "Estimated":
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
            <HelpCircle className="w-3 h-3" />
            <span>Estimated</span>
          </span>
        );
      case "Unknown":
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/40">
            <AlertCircle className="w-3 h-3" />
            <span>To Validate</span>
          </span>
        );
    }
  };

  // Dynamic organizational context summary — consultant-quality synthesis
  const getContextSummary = (): string => {
    if (appMode === "free-demo") {
      return "Client company is an SME with modular capabilities exploring expansion.";
    }
    const name = data.businessName?.trim() || "";
    const sector = data.sector?.trim() || "";
    const marketSize = data.domesticMarketSize?.trim() || "";
    const exportExp = data.exportExperience?.trim() || "";
    const capabilities = data.internalCapabilities?.trim() || "";
    const constraints = data.knownConstraints?.trim() || "";
    const ev = data.evidenceStates;

    // If no name yet, prompt
    if (!name) {
      return "Complete the fields above to generate a context summary.";
    }

    // Count how many fields are filled beyond the name
    const filledCount = [sector, marketSize, exportExp, capabilities, constraints].filter(Boolean).length;
    if (filledCount < 2) {
      return `${name} has been identified as the subject of this assessment. Please complete additional fields to generate a meaningful organizational context summary.`;
    }

    // ── Helpers ──
    const evidenceTag = (state: EvidenceState): string => {
      switch (state) {
        case "Confirmed": return "";
        case "Estimated": return " (estimated)";
        case "Unknown": return " (to be validated)";
      }
    };

    // Lowercase first char for mid-sentence use
    const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

    // Count unvalidated / estimated fields
    const uncertainFields = Object.values(ev).filter(v => v === "Unknown").length;
    const estimatedFields = Object.values(ev).filter(v => v === "Estimated").length;

    // ── Build the narrative fragments ──
    const sentences: string[] = [];

    // Opening: company positioning
    if (sector) {
      sentences.push(
        `${name} operates in the ${sector} sector${evidenceTag(ev.sector)}, positioning it within an industry where market entry dynamics are shaped by regulatory standards, channel structures, and competitive density.`
      );
    } else {
      sentences.push(
        `${name} is being assessed for international market expansion potential.`
      );
    }

    // Domestic scale context
    if (marketSize) {
      const sizeNote = ev.domesticMarketSize === "Unknown"
        ? `The organization's domestic market position — described as "${marketSize}" — has not yet been independently verified, and should be confirmed before it is used to benchmark international opportunity.`
        : ev.domesticMarketSize === "Estimated"
        ? `With a domestic footprint reported at approximately ${marketSize}, the company appears to have a foundation from which to explore expansion — though this figure is estimated and should be substantiated.`
        : `With a confirmed domestic footprint of ${marketSize}, the company has a quantifiable baseline against which to evaluate international opportunity sizing.`;
      sentences.push(sizeNote);
    }

    // Export readiness
    if (exportExp) {
      const expLower = exportExp.toLowerCase();
      if (expLower.includes("no experience")) {
        sentences.push(
          `The organization has no prior international or export experience${evidenceTag(ev.exportExperience)}, which means the assessment should place particular emphasis on operational feasibility, partner access, and the learning curve associated with first-market entry.`
        );
      } else if (expLower.includes("limited") || expLower.includes("indirect")) {
        sentences.push(
          `The company reports limited or indirect export experience${evidenceTag(ev.exportExperience)}, suggesting some familiarity with cross-border operations — though likely not at a scale that would reduce execution risk significantly.`
        );
      } else if (expLower.includes("active")) {
        sentences.push(
          `As an active international exporter${evidenceTag(ev.exportExperience)}, the company is likely to have existing logistics, compliance, and distribution capabilities that may accelerate market entry timelines.`
        );
      }
    }

    // Capabilities synthesis
    if (capabilities) {
      // Parse capabilities into discrete items for rephrasing
      const capItems = capabilities
        .split(/[,;\n]+/)
        .map(s => lc(s.trim()))
        .filter(Boolean);

      if (capItems.length === 1) {
        sentences.push(
          `Among its identified strengths, the organization cites ${capItems[0]}${evidenceTag(ev.internalCapabilities)} — a capability that should be evaluated for its transferability to target markets.`
        );
      } else if (capItems.length > 1) {
        const lastItem = capItems.pop();
        sentences.push(
          `Key capabilities identified include ${capItems.join(", ")}, and ${lastItem}${evidenceTag(ev.internalCapabilities)}. The relevance and transferability of these strengths to prospective markets will be a critical factor in the prioritization analysis.`
        );
      }
    }

    // Constraints synthesis
    if (constraints) {
      const conItems = constraints
        .split(/[,;\n]+/)
        .map(s => lc(s.trim()))
        .filter(Boolean);

      if (conItems.length === 1) {
        sentences.push(
          `However, the expansion decision is tempered by a notable constraint: ${conItems[0]}${evidenceTag(ev.knownConstraints)}. This factor should be stress-tested against each candidate market's conditions.`
        );
      } else if (conItems.length > 1) {
        const lastCon = conItems.pop();
        sentences.push(
          `The expansion decision is shaped by several identified constraints, including ${conItems.join(", ")}, and ${lastCon}${evidenceTag(ev.knownConstraints)}. These factors will need to be weighed against each market's accessibility and risk profile.`
        );
      }
    }

    // Evidence confidence closing
    if (uncertainFields >= 3) {
      sentences.push(
        `It should be noted that a significant portion of the inputs provided remain unvalidated. The resulting prioritization should be treated as directional rather than definitive, and a structured validation effort is recommended before committing resources.`
      );
    } else if (uncertainFields >= 1 || estimatedFields >= 2) {
      sentences.push(
        `Some inputs are currently flagged as estimated or unvalidated, which introduces uncertainty into the assessment. The roadmap phase should include targeted validation actions for these areas.`
      );
    } else {
      sentences.push(
        `The evidence basis across inputs is relatively strong, providing a solid foundation for prioritization. Validation efforts can focus on market-specific assumptions rather than internal data gaps.`
      );
    }

    return sentences.join(" ");
  };

  return (
    <div
      className="space-y-8 animate-fade-slide-in"
      id="company-snapshot-container"
    >
      <div>
        <h2 className="text-2xl font-semibold font-display text-white tracking-tight">
          Company Snapshot & Context
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Capture your organization's posture. Tag each field's evidence
          quality — confirmed, estimated, or to-validate.
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
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
            placeholder="e.g. $15M annual revenue, 8% market share in home country"
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
            placeholder="Example: production capacity, export experience, brand strength, distribution network..."
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
            placeholder="Example: regulatory uncertainty, limited market evidence, pricing pressure, logistics complexity..."
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
