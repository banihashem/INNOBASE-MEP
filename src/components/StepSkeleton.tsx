/**
 * MEP-light™ — Step Skeleton Loader
 * 
 * Animated skeleton placeholder shown during lazy-load of step components.
 * Prevents layout shift and provides visual feedback.
 */

export default function StepSkeleton() {
  return (
    <div className="animate-pulse space-y-6 max-w-4xl mx-auto">
      {/* Title skeleton */}
      <div className="space-y-3">
        <div className="h-7 bg-slate-800 rounded-lg w-72" />
        <div className="h-4 bg-slate-800/60 rounded w-96" />
      </div>

      {/* Content area skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main form area */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            {/* Field 1 */}
            <div className="space-y-2">
              <div className="h-3 bg-slate-800 rounded w-24" />
              <div className="h-10 bg-slate-800/60 rounded-lg" />
            </div>
            {/* Field 2 */}
            <div className="space-y-2">
              <div className="h-3 bg-slate-800 rounded w-32" />
              <div className="h-10 bg-slate-800/60 rounded-lg" />
            </div>
            {/* Field 3 — textarea */}
            <div className="space-y-2">
              <div className="h-3 bg-slate-800 rounded w-28" />
              <div className="h-24 bg-slate-800/60 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="h-4 bg-slate-800 rounded w-40" />
            <div className="space-y-2">
              <div className="h-3 bg-slate-800/60 rounded w-full" />
              <div className="h-3 bg-slate-800/60 rounded w-5/6" />
              <div className="h-3 bg-slate-800/60 rounded w-4/6" />
            </div>
            <div className="h-px bg-slate-800 my-4" />
            <div className="h-3 bg-slate-800/60 rounded w-full" />
            <div className="h-3 bg-slate-800/60 rounded w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
