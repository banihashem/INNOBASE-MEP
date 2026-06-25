import React, { useState, useMemo } from "react";
import { MoqCalculation, LandedCostWaterfall } from "../../types";
import {
  Calculator,
  ArrowDown,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Package,
} from "lucide-react";

interface Props {
  marketName: string;
  offeringName: string;
}

/** Pure function: calculate MoQ margin impact */
export function calculateMoqImpact(
  factoryMoq: number,
  trialVolume: number,
  premiumRate: number
): MoqCalculation {
  const shortRunUnits = Math.max(0, factoryMoq - trialVolume);
  const marginImpactPercent =
    factoryMoq > 0
      ? ((factoryMoq - trialVolume) / factoryMoq) * premiumRate * 100
      : 0;

  return {
    factoryMoq,
    trialOrderVolume: trialVolume,
    packagingPremiumRate: premiumRate,
    marginImpactPercent: Math.max(0, marginImpactPercent),
    shortRunUnits,
  };
}

/** Pure function: calculate landed cost waterfall */
export function calculateLandedCost(
  exwUnitPrice: number,
  oceanFreightPerUnit: number,
  insurancePercent: number,
  customsDutyPercent: number,
  localClearanceFee: number,
  distributorMarginPercent: number,
  retailMarkupPercent: number
): LandedCostWaterfall {
  const cifPrice =
    exwUnitPrice + oceanFreightPerUnit + exwUnitPrice * (insurancePercent / 100);
  const dutyAmount = cifPrice * (customsDutyPercent / 100);
  const landedCost = cifPrice + dutyAmount + localClearanceFee;
  const distributorPrice =
    landedCost * (1 + distributorMarginPercent / 100);
  const retailShelfPrice =
    distributorPrice * (1 + retailMarkupPercent / 100);

  return {
    exwUnitPrice,
    oceanFreightPerUnit,
    insurancePercent,
    cifPrice,
    customsDutyPercent,
    dutyAmount,
    localClearanceFee,
    landedCost,
    distributorMarginPercent,
    distributorPrice,
    retailMarkupPercent,
    retailShelfPrice,
  };
}

export default function CommercialPricingTab({ marketName, offeringName }: Props) {
  // MoQ State
  const [factoryMoq, setFactoryMoq] = useState(5000);
  const [trialVolume, setTrialVolume] = useState(1000);
  const [premiumRate, setPremiumRate] = useState(0.15);

  // Landed Cost State
  const [exwPrice, setExwPrice] = useState(2.50);
  const [freightPerUnit, setFreightPerUnit] = useState(0.35);
  const [insurancePct, setInsurancePct] = useState(1.5);
  const [dutyPct, setDutyPct] = useState(5.0);
  const [clearanceFee, setClearanceFee] = useState(0.10);
  const [distMarginPct, setDistMarginPct] = useState(35.0);
  const [retailMarkupPct, setRetailMarkupPct] = useState(40.0);

  const moq = useMemo(
    () => calculateMoqImpact(factoryMoq, trialVolume, premiumRate),
    [factoryMoq, trialVolume, premiumRate]
  );

  const landed = useMemo(
    () =>
      calculateLandedCost(
        exwPrice,
        freightPerUnit,
        insurancePct,
        dutyPct,
        clearanceFee,
        distMarginPct,
        retailMarkupPct
      ),
    [exwPrice, freightPerUnit, insurancePct, dutyPct, clearanceFee, distMarginPct, retailMarkupPct]
  );

  const moqSeverity =
    moq.marginImpactPercent > 15
      ? "critical"
      : moq.marginImpactPercent > 8
      ? "warning"
      : "ok";

  return (
    <div className="space-y-8 animate-fade-slide-in">
      <div>
        <h3 className="text-xl font-semibold font-display text-white">
          Commercial MoQ & Pricing Calculator
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Model trial order economics and build the EXW → Retail shelf price bridge for {offeringName} in {marketName}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ─── MoQ Matcher ──────────────────────────── */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">
              Trial MoQ Matcher
            </h4>
          </div>

          <div className="space-y-4">
            {[
              { label: "Factory MOQ (units)", value: factoryMoq, setter: setFactoryMoq, id: "factory-moq", step: 100 },
              { label: "Distributor Trial Volume (units)", value: trialVolume, setter: setTrialVolume, id: "trial-volume", step: 100 },
            ].map((f) => (
              <div key={f.id} className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">{f.label}</label>
                <input
                  type="number"
                  min="0"
                  step={f.step}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  value={f.value}
                  onChange={(e) => f.setter(Math.max(0, parseFloat(e.target.value) || 0))}
                  id={f.id}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">
                Packaging Premium Rate (short-run surcharge)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  value={premiumRate}
                  onChange={(e) => setPremiumRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  id="premium-rate"
                />
                <span className="text-xs text-slate-500 font-mono">= {(premiumRate * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Formula Display */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2 text-xs font-mono">
            <span className="text-slate-500">Margin Impact = ((MOQ − Trial) / MOQ) × Premium</span>
            <p className="text-slate-300">
              = (({factoryMoq} − {trialVolume}) / {factoryMoq}) × {(premiumRate * 100).toFixed(0)}%
            </p>
            <p className={`font-bold ${
              moqSeverity === "critical" ? "text-rose-400" : moqSeverity === "warning" ? "text-amber-400" : "text-emerald-400"
            }`}>
              = {moq.marginImpactPercent.toFixed(1)}% margin compression
            </p>
          </div>

          {/* Result card */}
          <div
            className={`border rounded-xl p-5 flex items-center space-x-4 ${
              moqSeverity === "critical"
                ? "bg-rose-950/15 border-rose-900/40"
                : moqSeverity === "warning"
                ? "bg-amber-950/15 border-amber-900/40"
                : "bg-emerald-950/15 border-emerald-900/40"
            }`}
          >
            {moqSeverity === "ok" ? (
              <TrendingUp className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className={`w-6 h-6 shrink-0 ${moqSeverity === "critical" ? "text-rose-400" : "text-amber-400"}`} />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {moq.shortRunUnits > 0
                  ? `Short-run gap: ${moq.shortRunUnits.toLocaleString()} units below factory MOQ`
                  : "Trial volume meets or exceeds factory MOQ"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {moqSeverity === "critical"
                  ? "Critical: Margin compression exceeds 15%. Negotiate MOQ reduction or co-pack options."
                  : moqSeverity === "warning"
                  ? "Warning: Margin compression 8-15%. Consider shared container or multi-SKU bundling."
                  : "Acceptable margin impact for trial order."}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Landed Cost Estimator ────────────────── */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">
              Landed Cost Estimator
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "EXW Unit Price ($)", value: exwPrice, setter: setExwPrice, id: "exw-price", step: 0.10 },
              { label: "Ocean Freight / Unit ($)", value: freightPerUnit, setter: setFreightPerUnit, id: "freight-unit", step: 0.05 },
              { label: "Insurance (%)", value: insurancePct, setter: setInsurancePct, id: "insurance-pct", step: 0.5 },
              { label: "Customs Duty (%)", value: dutyPct, setter: setDutyPct, id: "duty-pct", step: 0.5 },
              { label: "Local Clearance Fee ($)", value: clearanceFee, setter: setClearanceFee, id: "clearance-fee", step: 0.05 },
              { label: "Distributor Margin (%)", value: distMarginPct, setter: setDistMarginPct, id: "dist-margin", step: 1 },
              { label: "Retail Markup (%)", value: retailMarkupPct, setter: setRetailMarkupPct, id: "retail-markup", step: 1 },
            ].map((f) => (
              <div key={f.id} className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">{f.label}</label>
                <input
                  type="number"
                  min="0"
                  step={f.step}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  value={f.value}
                  onChange={(e) => f.setter(Math.max(0, parseFloat(e.target.value) || 0))}
                  id={f.id}
                />
              </div>
            ))}
          </div>

          {/* Cost Waterfall */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-500 uppercase">
                  <th className="py-2.5 px-4 text-left">Stage</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-right">Cumulative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {[
                  { stage: "EXW (Factory Gate)", amount: landed.exwUnitPrice, cumulative: landed.exwUnitPrice },
                  { stage: "+ Ocean Freight", amount: landed.oceanFreightPerUnit, cumulative: landed.exwUnitPrice + landed.oceanFreightPerUnit },
                  { stage: `+ Insurance (${insurancePct}%)`, amount: landed.exwUnitPrice * (insurancePct / 100), cumulative: landed.cifPrice },
                  { stage: "= CIF Price", amount: null, cumulative: landed.cifPrice, highlight: true },
                  { stage: `+ Customs Duty (${dutyPct}%)`, amount: landed.dutyAmount, cumulative: landed.cifPrice + landed.dutyAmount },
                  { stage: "+ Local Clearance", amount: landed.localClearanceFee, cumulative: landed.landedCost },
                  { stage: "= Landed Cost", amount: null, cumulative: landed.landedCost, highlight: true },
                  { stage: `+ Distributor (${distMarginPct}%)`, amount: landed.distributorPrice - landed.landedCost, cumulative: landed.distributorPrice },
                  { stage: `+ Retail Markup (${retailMarkupPct}%)`, amount: landed.retailShelfPrice - landed.distributorPrice, cumulative: landed.retailShelfPrice },
                  { stage: "= Retail Shelf Price", amount: null, cumulative: landed.retailShelfPrice, highlight: true, final: true },
                ].map((row, i) => (
                  <tr
                    key={i}
                    className={`${
                      row.final
                        ? "bg-indigo-950/20"
                        : row.highlight
                        ? "bg-slate-900/60"
                        : ""
                    }`}
                  >
                    <td
                      className={`py-2.5 px-4 ${
                        row.highlight || row.final
                          ? "font-bold text-slate-100"
                          : "text-slate-300"
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        {!row.highlight && !row.final && (
                          <ArrowDown className="w-3 h-3 text-slate-600" />
                        )}
                        <span>{row.stage}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">
                      {row.amount !== null ? `$${row.amount.toFixed(2)}` : "—"}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono font-bold ${
                        row.final
                          ? "text-indigo-400 text-base"
                          : row.highlight
                          ? "text-slate-200"
                          : "text-slate-400"
                      }`}
                    >
                      ${row.cumulative.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Multiplier Summary */}
          <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-indigo-400 uppercase block">Total Price Multiplier</span>
              <span className="text-lg font-bold text-white font-mono">
                {(landed.retailShelfPrice / landed.exwUnitPrice).toFixed(2)}x
              </span>
              <span className="text-xs text-slate-400 ml-1">from factory to shelf</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-indigo-400 uppercase block">Gross Margin at Retail</span>
              <span className="text-lg font-bold text-white font-mono">
                {(((landed.retailShelfPrice - landed.landedCost) / landed.retailShelfPrice) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
