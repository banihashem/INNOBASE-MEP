import React, { useState } from "react";
import { Market } from "../types";
import RegulatoryComplianceTab from "./prep/RegulatoryComplianceTab";
import PackagingLogisticsTab from "./prep/PackagingLogisticsTab";
import CommercialPricingTab from "./prep/CommercialPricingTab";
import {
  ShieldCheck,
  Package,
  Calculator,
  ArrowLeft,
} from "lucide-react";

interface Props {
  market: Market;
  offeringName: string;
  businessName: string;
  onBackToDiagnostic: () => void;
}

type PrepTab = "regulatory" | "packaging" | "commercial";

const TABS: { id: PrepTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "regulatory",
    label: "Regulatory & Formulation",
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  {
    id: "packaging",
    label: "Packaging & Logistics",
    icon: <Package className="w-4 h-4" />,
  },
  {
    id: "commercial",
    label: "Commercial & Pricing",
    icon: <Calculator className="w-4 h-4" />,
  },
];

export default function ProductPrepSpace({
  market,
  offeringName,
  businessName,
  onBackToDiagnostic,
}: Props) {
  const [activeTab, setActiveTab] = useState<PrepTab>("regulatory");

  return (
    <div className="space-y-6 animate-fade-slide-in" id="product-prep-space">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded uppercase tracking-wider">
              Preparation Phase
            </span>
          </div>
          <h2 className="text-2xl font-semibold font-display text-white tracking-tight">
            Product Preparation Workspace
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Preparing <strong className="text-slate-200">{offeringName}</strong> by{" "}
            <strong className="text-slate-200">{businessName}</strong> for entry into{" "}
            <strong className="text-indigo-300">{market.name}</strong>.
          </p>
        </div>

        <button
          onClick={onBackToDiagnostic}
          className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 px-4 py-2.5 rounded-xl flex items-center space-x-2 text-sm font-semibold transition-all cursor-pointer"
          id="back-to-diagnostic-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Diagnostic</span>
        </button>
      </div>

      {/* Tab Bar */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-1.5 flex space-x-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
              id={`prep-tab-${tab.id}`}
            >
              {tab.icon}
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div key={activeTab}>
        {activeTab === "regulatory" && (
          <RegulatoryComplianceTab
            marketName={market.name}
            offeringName={offeringName}
          />
        )}
        {activeTab === "packaging" && (
          <PackagingLogisticsTab
            marketName={market.name}
            offeringName={offeringName}
          />
        )}
        {activeTab === "commercial" && (
          <CommercialPricingTab
            marketName={market.name}
            offeringName={offeringName}
          />
        )}
      </div>
    </div>
  );
}
