/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlanComparisonMetrics } from '../../services/routing/types';
import { TrendingDown, ArrowRight, Gauge, CheckCircle2, Info, Compass } from 'lucide-react';

interface PlanComparisonPanelProps {
  comparison: PlanComparisonMetrics;
}

export const PlanComparisonPanel: React.FC<PlanComparisonPanelProps> = ({ comparison }) => {
  const isDistanceSaved = comparison.distanceSavedKm > 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            Before vs. After Optimization Benchmark
          </h3>
          <p className="text-xs text-slate-400">{comparison.baselineSummaryNote}</p>
        </div>

        {/* Improvement Badge */}
        {isDistanceSaved ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>
              {comparison.distanceSavedKm} km Saved ({comparison.distanceImprovementPercent}%)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-300 text-xs font-medium">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Expanded Fleet Coverage</span>
          </div>
        )}
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              : 'Routes generated for all eligible'}
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
            Includes travel + service times
          </span>
        </div>

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
            <span className="text-base font-bold text-slate-100">
              {comparison.optimizedVehiclesUsed}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Active operational units
          </span>
        </div>

        {/* Orders Routed */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] uppercase font-semibold text-slate-400">
            Orders Dispatched
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xs line-through text-slate-400 font-medium">
              {comparison.baselineOrdersRouted}
            </span>
            <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-base font-bold text-emerald-400">
              {comparison.optimizedOrdersRouted}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {comparison.optimizedUnassignedCount === 0
              ? '100% of eligible orders routed'
              : `${comparison.optimizedUnassignedCount} pending unassigned`}
          </span>
        </div>
      </div>
    </div>
  );
};
