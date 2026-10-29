/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { OptimizationResult } from '../../services/routing/types';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ShieldCheck,
  Scale,
  Clock,
  Package,
} from 'lucide-react';

interface ApplyPlanConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: OptimizationResult;
  onConfirmApply: () => void;
  isApplying: boolean;
}

export const ApplyPlanConfirmationModal: React.FC<ApplyPlanConfirmationModalProps> = ({
  isOpen,
  onClose,
  result,
  onConfirmApply,
  isApplying,
}) => {
  if (!isOpen) return null;

  const totalWarnings = result.routes.reduce((sum, r) => sum + r.deadlineWarningsCount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Confirm Apply Route Optimization Plan
              </h3>
              <p className="text-xs text-slate-400">
                Update shared order assignments and scheduled delivery ETAs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-300">
          {/* Summary Box */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="font-semibold text-slate-200 text-sm">Plan Summary</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-400" />
                <span>
                  <strong className="text-slate-100">{result.totalAssignedOrders}</strong> orders to assign
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-cyan-400" />
                <span>
                  <strong className="text-slate-100">{result.totalFleetLoadKg} kg</strong> total load
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <span>
                  <strong className="text-slate-100">
                    {Math.floor(result.totalDurationMinutes / 60)}h {result.totalDurationMinutes % 60}m
                  </strong>{' '}
                  travel duration
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Pre-validated Feasible</span>
              </div>
            </div>
          </div>

          {/* Vehicle Assignment Breakdown */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-300">Target Vehicle Route Loads</h4>
            <div className="space-y-1.5">
              {result.routes
                .filter((r) => r.stops.length > 0)
                .map((r) => (
                  <div
                    key={r.vehicle.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{r.vehicle.id}</span>
                      <span className="text-slate-400">({r.vehicle.driverName})</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span>{r.stops.length} stops</span>
                      <span>•</span>
                      <span className="text-teal-300">
                        {r.totalAssignedLoadKg} kg / {r.vehicle.capacityKg} kg ({r.capacityUtilizationPercent}%)
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Warnings */}
          {(result.totalUnassignedOrders > 0 || totalWarnings > 0) && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200/90 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Notice for Dispatcher</span>
              </div>
              {result.totalUnassignedOrders > 0 && (
                <p className="text-[11px]">
                  • {result.totalUnassignedOrders} order(s) remain unassigned and will stay in the Pending queue.
                </p>
              )}
              {totalWarnings > 0 && (
                <p className="text-[11px]">
                  • {totalWarnings} stop(s) have estimated arrivals exceeding scheduled deadlines.
                </p>
              )}
            </div>
          )}

          {/* Safeguard Assurance Notice */}
          <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800">
            <strong className="text-slate-300">State Integrity Guarantee:</strong> Delivered and
            Cancelled orders will remain strictly untouched in operational history. Customer notes,
            addresses, and tracking IDs will be preserved. Only assigned vehicle IDs, status, and
            calculated ETAs will update.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmApply}
            disabled={isApplying}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-md shadow-teal-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isApplying ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Applying Plan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Commit & Apply Plan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
