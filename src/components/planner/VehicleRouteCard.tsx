/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { VehicleRoutePlan } from '../../services/routing/types';
import {
  Truck,
  User,
  ChevronDown,
  ChevronUp,
  Clock,
  Navigation,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Package,
} from 'lucide-react';

interface VehicleRouteCardProps {
  routePlan: VehicleRoutePlan;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const VehicleRouteCard: React.FC<VehicleRouteCardProps> = ({
  routePlan,
  isSelected,
  onSelect,
}) => {
  const [expanded, setExpanded] = useState(true);
  const { vehicle, stops, totalDistanceKm, totalDurationMinutes, totalAssignedLoadKg, capacityUtilizationPercent, remainingCapacityKg, deadlineWarningsCount } = routePlan;

  const isUnused = stops.length === 0;

  // Capacity color coding
  const getCapacityBarColor = () => {
    if (capacityUtilizationPercent > 85) return 'bg-rose-500';
    if (capacityUtilizationPercent >= 60) return 'bg-amber-400';
    return 'bg-emerald-400';
  };

  const getCapacityTextColor = () => {
    if (capacityUtilizationPercent > 85) return 'text-rose-400';
    if (capacityUtilizationPercent >= 60) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <div
      className={`bg-slate-900/90 border rounded-xl overflow-hidden shadow-lg transition-all ${
        isSelected
          ? 'border-teal-500/80 ring-1 ring-teal-500/40'
          : 'border-slate-800 hover:border-slate-700/80'
      } ${isUnused ? 'opacity-65' : ''}`}
    >
      {/* Vehicle Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-inner"
            style={{
              backgroundColor: `${vehicle.color || '#14b8a6'}20`,
              color: vehicle.color || '#14b8a6',
              border: `1px solid ${vehicle.color || '#14b8a6'}50`,
            }}
          >
            <Truck className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-100">{vehicle.id}</span>
              <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {vehicle.registrationNumber}
              </span>
              <span className="text-xs text-slate-400 font-medium">{vehicle.vehicleType}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 text-slate-300">
                <User className="w-3 h-3 text-slate-400" />
                {vehicle.driverName}
              </span>
              <span>•</span>
              <span>{vehicle.currentDepot}</span>
              {vehicle.fuelType && (
                <>
                  <span>•</span>
                  <span>{vehicle.fuelType}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 px-2.5 py-1.5 rounded-lg">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-200">{totalDistanceKm} km</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 px-2.5 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-semibold text-slate-200">
              {Math.floor(totalDurationMinutes / 60)}h {totalDurationMinutes % 60}m
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 px-2.5 py-1.5 rounded-lg">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-200">{stops.length} stops</span>
          </div>

          {deadlineWarningsCount > 0 ? (
            <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-2.5 py-1.5 rounded-lg font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{deadlineWarningsCount} SLA Risk</span>
            </div>
          ) : !isUnused ? (
            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2.5 py-1.5 rounded-lg font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>All On-Time</span>
            </div>
          ) : null}

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
            title={expanded ? 'Collapse stops' : 'Expand stops'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Capacity Utilization Progress Bar */}
      <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Scale className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-medium">Assigned Cargo Load:</span>
          <span className={`font-bold ${getCapacityTextColor()}`}>
            {totalAssignedLoadKg} kg / {vehicle.capacityKg} kg
          </span>
          <span className="text-slate-400">({capacityUtilizationPercent}% utilized)</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-64">
          <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getCapacityBarColor()}`}
              style={{ width: `${Math.min(100, capacityUtilizationPercent)}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-400 font-mono shrink-0">
            {remainingCapacityKg} kg left
          </span>
        </div>
      </div>

      {/* Ordered Stops Table */}
      {expanded && (
        <div className="overflow-x-auto">
          {stops.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No delivery stops assigned to this vehicle for this routing pass.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Seq</th>
                  <th className="py-2.5 px-4 font-semibold">Order</th>
                  <th className="py-2.5 px-4 font-semibold">Destination</th>
                  <th className="py-2.5 px-4 font-semibold">Weight</th>
                  <th className="py-2.5 px-4 font-semibold">Time Window [Earliest–Latest]</th>
                  <th className="py-2.5 px-4 font-semibold">Est. Arrival (ETA)</th>
                  <th className="py-2.5 px-4 font-semibold">Service Dwell</th>
                  <th className="py-2.5 px-4 font-semibold">Leg Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {stops.map((stop) => {
                  return (
                    <tr
                      key={stop.order.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Seq Index */}
                      <td className="py-2.5 px-4">
                        <span className="w-5 h-5 rounded-full bg-slate-800 font-mono font-bold text-[10px] text-teal-300 flex items-center justify-center border border-slate-700">
                          {stop.stopIndex}
                        </span>
                      </td>

                      {/* Order & Customer */}
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-200">{stop.order.id}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-36">
                          {stop.order.customerName}
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="py-2.5 px-4 max-w-44 truncate text-slate-300" title={stop.order.destination}>
                        {stop.order.destination}
                      </td>

                      {/* Weight */}
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-200">
                        {stop.order.weightKg} kg
                      </td>

                      {/* Time Window */}
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-300">
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-teal-300">
                          {stop.timeWindowEarliest || '08:30 AM'} – {stop.timeWindowLatest || stop.deadlineString}
                        </span>
                      </td>

                      {/* Estimated Arrival (ETA) with Window Status */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-semibold ${
                              stop.isDeadlineMissed
                                ? 'text-rose-400'
                                : stop.isEarly
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {stop.estimatedArrival}
                          </span>
                          {stop.isDeadlineMissed ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30" title="Violates latest delivery time window">
                              Late (+{stop.deadlineDiscrepancyMinutes}m)
                            </span>
                          ) : stop.isEarly ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30" title="Arrives before window opens (dwells until start)">
                              Wait {stop.windowViolationMinutes}m
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              On-Time
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Service Dwell */}
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-300">
                        {stop.serviceTimeMinutes || 10} min
                      </td>

                      {/* Leg Distance */}
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-400">
                        {stop.travelDistanceKmFromPrev} km
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
