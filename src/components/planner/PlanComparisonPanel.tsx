import React from 'react';
import { PlanComparisonMetrics } from '../../services/routing/types';
import { TrendingDown, ArrowRight, Gauge, CheckCircle2, Info, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PlanComparisonPanelProps {
  comparison: PlanComparisonMetrics;
}

export const PlanComparisonPanel: React.FC<PlanComparisonPanelProps> = ({ comparison }) => {
  const isComparable = comparison.isDirectlyComparable;
  const isDistanceSaved = isComparable && comparison.distanceSavedKm > 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            Baseline Plan vs. Optimized Plan
          </h3>
          <p className="text-xs text-slate-400">{comparison.baselineSummaryNote}</p>
        </div>

        {/* Improvement Badge or Comparability Badge */}
        {isDistanceSaved ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>
              {comparison.distanceSavedKm} km Saved ({comparison.distanceImprovementPercent}%)
            </span>
          </div>
        ) : !isComparable ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 text-xs font-medium">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>Expanded Order Coverage (+{comparison.optimizedOrdersRouted - comparison.baselineOrdersRouted})</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-300 text-xs font-medium">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Optimal Baseline Equivalent</span>
          </div>
        )}
      </div>

      {/* Fair Comparison Explanation Banner when orders differ */}
      {!isComparable && comparison.comparabilityNote && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">Coverage Comparability Note</p>
            <p className="text-[11px] mt-0.5 text-amber-200/80 leading-relaxed">
              {comparison.comparabilityNote}
            </p>
          </div>
        </div>
      )}

      {/* Comparison Grid (5 columns on desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Vehicles Used */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] uppercase font-semibold text-slate-400">
            Vehicles Utilized
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xs line-through text-slate-400 font-medium">
              {comparison.baselineVehiclesUsed}
            </span>
            <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-base font-bold text-teal-300">
              {comparison.optimizedVehiclesUsed}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {comparison.optimizedVehiclesUsed < comparison.baselineVehiclesUsed
              ? `-${comparison.baselineVehiclesUsed - comparison.optimizedVehiclesUsed} vehicles required`
              : 'Fleet capacity respected'}
          </span>
        </div>

        {/* Total Distance */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] uppercase font-semibold text-slate-400">
            Total Distance
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xs line-through text-slate-400 font-medium">
              {comparison.baselineTotalDistanceKm} km
            </span>
            <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-base font-bold text-slate-100">
              {comparison.optimizedTotalDistanceKm} km
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {isDistanceSaved
              ? `-${comparison.distanceSavedKm} km reduced travel`
              : isComparable
              ? 'Equivalent route distance'
              : 'Covers additional orders'}
          </span>
        </div>

        {/* Delivery Coverage */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] uppercase font-semibold text-slate-400">
            Delivery Coverage
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xs line-through text-slate-400 font-medium">
              {comparison.baselineOrdersRouted} orders
            </span>
            <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-base font-bold text-emerald-400">
              {comparison.optimizedOrdersRouted} orders
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {comparison.optimizedUnassignedCount === 0
              ? '100% eligible orders routed'
              : `${comparison.optimizedUnassignedCount} pending unassigned`}
          </span>
        </div>

        {/* Time Window Feasibility */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] uppercase font-semibold text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-teal-400" />
            Time Windows Met
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xs line-through text-slate-400 font-medium">
              {comparison.baselineTimeWindowMetCount}
            </span>
            <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-base font-bold text-emerald-400">
              {comparison.optimizedTimeWindowMetCount}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {comparison.optimizedTimeWindowMissedCount === 0
              ? '0 time window misses'
              : `${comparison.optimizedTimeWindowMissedCount} SLA deadline risk(s)`}
          </span>
        </div>

        {/* Estimated Duration */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] uppercase font-semibold text-slate-400">
            Est. Total Duration
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xs line-through text-slate-400 font-medium">
              {Math.floor(comparison.baselineTotalDurationMinutes / 60)}h{' '}
              {comparison.baselineTotalDurationMinutes % 60}m
            </span>
            <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-base font-bold text-slate-100">
              {Math.floor(comparison.optimizedTotalDurationMinutes / 60)}h{' '}
              {comparison.optimizedTotalDurationMinutes % 60}m
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Travel + stop service dwell
          </span>
        </div>
      </div>
    </div>
  );
};
