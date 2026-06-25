import React from "react";
import { STEPS } from "../types";
import { Check, ArrowRight } from "lucide-react";

interface Props {
  currentStep: number;
  onStepClick: (stepId: number) => void;
  maxUnlockedStep: number;
  showPrepPhase?: boolean;
}

export default function StepProgress({
  currentStep,
  onStepClick,
  maxUnlockedStep,
  showPrepPhase = false,
}: Props) {
  // Only show step 8 if user has entered the prep phase
  const diagnosticSteps = STEPS.filter((s) => s.phase === "diagnostic");
  const prepSteps = STEPS.filter((s) => s.phase === "preparation");
  const visibleSteps = showPrepPhase
    ? [...diagnosticSteps, ...prepSteps]
    : diagnosticSteps;

  const diagnosticMax = diagnosticSteps.length;

  return (
    <div
      className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 mb-8"
      id="step-progress-wrapper"
    >
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-2">
        {/* Connection line (hidden on mobile) */}
        <div className="absolute left-6 right-6 top-1/2 h-[2px] bg-slate-800 -translate-y-1/2 hidden md:block -z-10" />
        <div
          className="absolute left-6 top-1/2 h-[2px] bg-indigo-500 -translate-y-1/2 hidden md:block -z-10 transition-all duration-300"
          style={{
            width: `${
              ((Math.min(currentStep, maxUnlockedStep) - 1) /
                (visibleSteps.length - 1)) *
              100
            }%`,
          }}
        />

        {visibleSteps.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isUnlocked = step.id <= maxUnlockedStep;
          const isPrepPhase = step.phase === "preparation";

          // Phase divider before step 8
          const showPhaseDivider =
            isPrepPhase && idx > 0 && visibleSteps[idx - 1].phase === "diagnostic";

          let badgeClass =
            "bg-slate-950 border-slate-800 text-slate-500";
          if (isActive && isPrepPhase) {
            badgeClass =
              "bg-emerald-950 text-emerald-400 border-emerald-500 ring-2 ring-emerald-500/20 font-bold";
          } else if (isActive) {
            badgeClass =
              "bg-indigo-950 text-indigo-400 border-indigo-500 ring-2 ring-indigo-500/20 font-bold";
          } else if (isCompleted) {
            badgeClass =
              "bg-indigo-600 text-white border-indigo-500";
          } else if (isUnlocked) {
            badgeClass =
              "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500";
          }

          return (
            <React.Fragment key={step.id}>
              {/* Phase Divider */}
              {showPhaseDivider && (
                <div className="hidden md:flex items-center px-2 shrink-0 z-10">
                  <div className="flex items-center space-x-1.5 bg-slate-950 border border-emerald-900/40 px-2.5 py-1 rounded-lg">
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                    <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      Prep Phase
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => isUnlocked && onStepClick(step.id)}
                disabled={!isUnlocked}
                className={`flex items-center md:flex-col gap-3 md:gap-2 text-left md:text-center flex-1 focus:outline-none transition-all group ${
                  isUnlocked
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-50"
                }`}
                id={`step-progress-btn-${step.id}`}
              >
                {/* Node Circle */}
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-mono transition-all z-10 shrink-0 ${badgeClass}`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <span>0{step.id}</span>
                  )}
                </div>

                {/* Label */}
                <div className="flex flex-col md:items-center">
                  <span
                    className={`text-xs font-semibold tracking-tight transition-colors ${
                      isActive
                        ? isPrepPhase
                          ? "text-emerald-400 font-bold font-display"
                          : "text-indigo-400 font-bold font-display"
                        : isUnlocked
                        ? "text-slate-300 group-hover:text-white"
                        : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase font-mono mt-0.5 tracking-wider hidden md:block">
                    {step.id === currentStep
                      ? "ACTIVE"
                      : isCompleted
                      ? "VERIFIED"
                      : "PENDING"}
                  </span>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
