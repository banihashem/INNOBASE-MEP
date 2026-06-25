import React, { useState, useMemo } from "react";
import { ShelfLifeCalculation, TransitMode } from "../../types";
import {
  Clock,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  Ship,
  Snowflake,
  Sun,
  Package,
} from "lucide-react";

interface Props {
  marketName: string;
  offeringName: string;
}

/** Pure function: calculate net shelf life */
export function calculateNetShelfLife(
  totalDays: number,
  transitDays: number,
  customsDays: number,
  warehouseDays: number
): ShelfLifeCalculation {
  const deductions = transitDays + customsDays + warehouseDays;
  const netUsableShelfLife = Math.max(0, totalDays - deductions);
  const percentageRemaining =
    totalDays > 0 ? (netUsableShelfLife / totalDays) * 100 : 0;

  let indicator: ShelfLifeCalculation["indicator"] = "GREEN";
  if (percentageRemaining < 30) indicator = "RED";
  else if (percentageRemaining < 60) indicator = "AMBER";

  return {
    totalShelfLifeDays: totalDays,
    oceanTransitDays: transitDays,
    customsClearanceDays: customsDays,
    localWarehousingBuffer: warehouseDays,
    netUsableShelfLife,
    percentageRemaining,
    indicator,
  };
}

const TRANSIT_MODE_RISKS: Record<TransitMode, { label: string; riskNote: string; color: string }> = {
  ambient: {
    label: "Ambient (Room Temperature)",
    riskNote: "Lowest cost but only suitable for shelf-stable products. Risk of heat damage in summer months through Gulf ports.",
    color: "text-emerald-400",
  },
  chilled: {
    label: "Chilled (2–8°C Cold Chain)",
    riskNote: "Requires reefer container. Risk of temperature excursion during port transfers. Verify cold chain continuity certificates.",
    color: "text-blue-400",
  },
  frozen: {
    label: "Frozen (≤ -18°C)",
    riskNote: "Highest logistics cost. Requires blast-frozen prior to loading. Must maintain unbroken cold chain. Insurance premiums higher.",
    color: "text-indigo-400",
  },
};

export default function PackagingLogisticsTab({ marketName, offeringName }: Props) {
  const [totalShelfLife, setTotalShelfLife] = useState(360);
  const [oceanTransitDays, setOceanTransitDays] = useState(21);
  const [customsClearanceDays, setCustomsClearanceDays] = useState(7);
  const [warehouseBuffer, setWarehouseBuffer] = useState(14);
  const [transitMode, setTransitMode] = useState<TransitMode>("ambient");

  const calc = useMemo(
    () =>
      calculateNetShelfLife(
        totalShelfLife,
        oceanTransitDays,
        customsClearanceDays,
        warehouseBuffer
      ),
    [totalShelfLife, oceanTransitDays, customsClearanceDays, warehouseBuffer]
  );

  const indicatorStyles = {
    GREEN: {
      bg: "bg-emerald-950/20 border-emerald-900/40",
      text: "text-emerald-400",
      label: "Healthy Shelf Life",
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
    },
    AMBER: {
      bg: "bg-amber-950/20 border-amber-900/40",
      text: "text-amber-400",
      label: "Marginal — Negotiate Faster Clearance",
      icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
    },
    RED: {
      bg: "bg-rose-950/20 border-rose-900/40",
      text: "text-rose-400",
      label: "Critical — Product May Expire Before Sale",
      icon: <AlertTriangle className="w-6 h-6 text-rose-400" />,
    },
  };

  const ind = indicatorStyles[calc.indicator];
  const activeModeInfo = TRANSIT_MODE_RISKS[transitMode];

  return (
    <div className="space-y-8 animate-fade-slide-in">
      <div>
        <h3 className="text-xl font-semibold font-display text-white">
          Packaging, Logistics & Shelf-Life
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Calculate net usable retail shelf life for {offeringName} entering {marketName}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">
              Shelf-Life Parameters
            </h4>
          </div>

          {/* Inputs */}
          {[
            { label: "Total Product Shelf Life", value: totalShelfLife, setter: setTotalShelfLife, unit: "days", id: "total-shelf-life" },
            { label: "Ocean Transit Duration", value: oceanTransitDays, setter: setOceanTransitDays, unit: "days", id: "ocean-transit" },
            { label: "Customs Clearance Time", value: customsClearanceDays, setter: setCustomsClearanceDays, unit: "days", id: "customs-clearance" },
            { label: "Local Warehousing Buffer", value: warehouseBuffer, setter: setWarehouseBuffer, unit: "days", id: "warehouse-buffer" },
          ].map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 block">
                {field.label}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  value={field.value}
                  onChange={(e) => field.setter(Math.max(0, parseInt(e.target.value) || 0))}
                  id={field.id}
                />
                <span className="text-xs text-slate-500 font-mono w-12">{field.unit}</span>
              </div>
            </div>
          ))}

          {/* Formula Display */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Formula</span>
            <p className="text-xs font-mono text-slate-300">
              Net Shelf Life = {totalShelfLife} − ({oceanTransitDays} + {customsClearanceDays} + {warehouseBuffer})
            </p>
            <p className="text-xs font-mono text-slate-300">
              Net Shelf Life = {totalShelfLife} − {oceanTransitDays + customsClearanceDays + warehouseBuffer} ={" "}
              <span className={`font-bold ${ind.text}`}>{calc.netUsableShelfLife} days</span>
            </p>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* Result Card */}
          <div className={`border rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 ${ind.bg}`}>
            {ind.icon}
            <div>
              <span className={`text-4xl font-extrabold font-mono ${ind.text}`}>
                {calc.netUsableShelfLife}
              </span>
              <span className="text-lg text-slate-400 ml-1">days</span>
            </div>
            <p className={`text-sm font-semibold ${ind.text}`}>{ind.label}</p>
            <p className="text-xs text-slate-400">
              {calc.percentageRemaining.toFixed(1)}% of original shelf life retained for retail
            </p>
          </div>

          {/* Timeline Breakdown */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider flex items-center space-x-2">
              <Ship className="w-4 h-4" />
              <span>Deduction Breakdown</span>
            </h4>

            <div className="space-y-2">
              {[
                { label: "Ocean Transit", days: oceanTransitDays, pct: totalShelfLife > 0 ? (oceanTransitDays / totalShelfLife) * 100 : 0 },
                { label: "Customs Clearance", days: customsClearanceDays, pct: totalShelfLife > 0 ? (customsClearanceDays / totalShelfLife) * 100 : 0 },
                { label: "Warehousing Buffer", days: warehouseBuffer, pct: totalShelfLife > 0 ? (warehouseBuffer / totalShelfLife) * 100 : 0 },
              ].map((seg) => (
                <div key={seg.label} className="flex items-center space-x-4">
                  <span className="text-xs text-slate-400 w-36 shrink-0">{seg.label}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${Math.min(seg.pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-300 w-20 text-right">
                    {seg.days}d ({seg.pct.toFixed(1)}%)
                  </span>
                </div>
              ))}
              <div className="flex items-center space-x-4 pt-2 border-t border-slate-800/60">
                <span className="text-xs font-bold text-slate-200 w-36 shrink-0">Retail Available</span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      calc.indicator === "GREEN"
                        ? "bg-emerald-500"
                        : calc.indicator === "AMBER"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${calc.percentageRemaining}%` }}
                  />
                </div>
                <span className={`text-xs font-mono font-bold w-20 text-right ${ind.text}`}>
                  {calc.netUsableShelfLife}d ({calc.percentageRemaining.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Transit Temperature Mode */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">
                Transit Temperature Mode
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(Object.keys(TRANSIT_MODE_RISKS) as TransitMode[]).map((mode) => {
                const info = TRANSIT_MODE_RISKS[mode];
                const isSelected = transitMode === mode;
                const icons = {
                  ambient: <Sun className="w-5 h-5" />,
                  chilled: <Package className="w-5 h-5" />,
                  frozen: <Snowflake className="w-5 h-5" />,
                };

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTransitMode(mode)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/20"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                    }`}
                    id={`transit-mode-${mode}`}
                  >
                    <div className={`mb-2 ${isSelected ? info.color : "text-slate-500"}`}>
                      {icons[mode]}
                    </div>
                    <span className="text-sm font-semibold text-slate-200 block">{info.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Risk note for selected mode */}
            <div className="bg-slate-950 border border-amber-900/30 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed">{activeModeInfo.riskNote}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
