/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { DeliveryOrder, Vehicle } from '../../types';
import {
  DEFAULT_OPTIMIZATION_SETTINGS,
  optimizeRoutes,
} from '../../services/routing/optimizer';
import {
  OptimizationResult,
  OptimizationSettings,
} from '../../services/routing/types';
import { exportRoutePlanAsJson } from '../../services/routing/exportPlan';
import { SchematicRouteVisualizer } from './SchematicRouteVisualizer';
import { DispatcherBriefingCard } from './DispatcherBriefingCard';
import { PlanComparisonPanel } from './PlanComparisonPanel';
import { OptimizationSettingsDrawer } from './OptimizationSettingsDrawer';
import { VehicleRouteCard } from './VehicleRouteCard';
import { UnassignedOrdersPanel } from './UnassignedOrdersPanel';
import { ApplyPlanConfirmationModal } from './ApplyPlanConfirmationModal';
import { VerificationTestsModal } from './VerificationTestsModal';
import {
  Route,
  Zap,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Navigation,
  Scale,
  Truck,
  RotateCcw,
  Sparkles,
  Terminal,
  Info,
} from 'lucide-react';

interface RoutePlannerViewProps {
  orders: DeliveryOrder[];
  vehicles: Vehicle[];
  onApplyPlan: (updatedOrders: DeliveryOrder[]) => void;
  onResetData: () => void;
}

export const RoutePlannerView: React.FC<RoutePlannerViewProps> = ({
  orders,
  vehicles,
  onApplyPlan,
  onResetData,
}) => {
  // Settings
  const [settings, setSettings] = useState<OptimizationSettings>(DEFAULT_OPTIMIZATION_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Optimization Result
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(() => {
    // Initial run on mount with demo data
    try {
      return optimizeRoutes(orders, vehicles, DEFAULT_OPTIMIZATION_SETTINGS);
    } catch {
      return null;
    }
  });

  // UI state
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [lastOptimizedAt, setLastOptimizedAt] = useState<string | null>(
    optimizationResult ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
  );

  // Trigger Optimization
  const handleRunOptimization = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      try {
        const result = optimizeRoutes(orders, vehicles, settings);
        setOptimizationResult(result);
        setLastOptimizedAt(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      } catch (err) {
        console.error('Optimization error:', err);
      } finally {
        setIsOptimizing(false);
      }
    }, 350);
  };

  // Export Plan to JSON
  const handleExportPlan = () => {
    if (!optimizationResult) return;
    exportRoutePlanAsJson(optimizationResult);
  };

  // Apply Plan Handler
  const handleConfirmApplyPlan = () => {
    if (!optimizationResult) return;
    setIsApplying(true);

    setTimeout(() => {
      // Create new orders map preserving unchanged orders (delivered, cancelled, etc.)
      const updatedOrders = orders.map((originalOrder) => {
        // Find if this order is in one of the routes
        for (const route of optimizationResult.routes) {
          const matchedStop = route.stops.find((s) => s.order.id === originalOrder.id);
          if (matchedStop) {
            return {
              ...originalOrder,
              assignedVehicleId: route.vehicle.id,
              estimatedArrival: matchedStop.estimatedArrival,
              status: (originalOrder.status === 'in-transit' ? 'in-transit' : 'assigned') as any,
            };
          }
        }
        return originalOrder;
      });

      onApplyPlan(updatedOrders);
      setIsApplying(false);
      setIsApplyModalOpen(false);
    }, 300);
  };

  const eligibleOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status !== 'cancelled' && o.status !== 'delivered').length;
  }, [orders]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                AI Route Planner
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Module 4 Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Optimize deliveries using vehicle capacity, delivery deadlines, and estimated travel costs.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Run Verification Tests */}
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all cursor-pointer"
            title="Run 17 Automated Verification Tests"
          >
            <Terminal className="w-3.5 h-3.5 text-teal-400" />
            <span>Verify Suite (17)</span>
          </button>

          {/* Export Route Plan */}
          <button
            onClick={handleExportPlan}
            disabled={!optimizationResult}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Download formatted JSON route manifest"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Plan</span>
          </button>

          {/* Apply Plan */}
          <button
            onClick={() => setIsApplyModalOpen(true)}
            disabled={!optimizationResult || !optimizationResult.isFeasible}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm transition-all cursor-pointer disabled:opacity-40"
            title="Apply assignments to Orders & Fleet"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Apply Plan</span>
          </button>

          {/* Optimize Routes (Primary) */}
          <button
            onClick={handleRunOptimization}
            disabled={isOptimizing}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-md shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isOptimizing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Optimizing...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>Optimize Routes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Timestamp & Status Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>Last Optimized:</span>
            <strong className="text-slate-200">{lastOptimizedAt || 'Pending initial run'}</strong>
          </span>
          <span>•</span>
          <span className="text-slate-400">
            Algorithm:{' '}
            <strong className="text-slate-300 font-normal">
              Deterministic Nearest-Neighbor + 2-Opt (Heuristic)
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {optimizationResult?.isFeasible ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Feasible Heuristic Solution
            </span>
          ) : optimizationResult?.validationReport.isValid === false ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              Validation Errors
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              <Info className="w-3.5 h-3.5" />
              Ready to Optimize
            </span>
          )}
        </div>
      </div>

      {/* Validation Errors Notice (if any) */}
      {optimizationResult?.validationReport.errors && optimizationResult.validationReport.errors.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-xs text-rose-200 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Validation Errors Detected ({optimizationResult.validationReport.errors.length})</span>
          </div>
          <ul className="space-y-1 pl-6 list-disc text-[11px] text-rose-200/90">
            {optimizationResult.validationReport.errors.map((err) => (
              <li key={err.id}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Metric 1: Assigned Orders */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Assigned Orders
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-100">
              {optimizationResult?.totalAssignedOrders ?? 0}
            </span>
            <span className="text-xs text-slate-400">/ {eligibleOrdersCount}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium mt-0.5 block">
            {optimizationResult?.totalUnassignedOrders === 0
              ? '100% orders routed'
              : `${optimizationResult?.totalUnassignedOrders} in pending queue`}
          </span>
        </div>

        {/* Metric 2: Unassigned Orders */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Unassigned Orders
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-bold ${
                (optimizationResult?.totalUnassignedOrders ?? 0) > 0
                  ? 'text-amber-400'
                  : 'text-slate-100'
              }`}
            >
              {optimizationResult?.totalUnassignedOrders ?? 0}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {(optimizationResult?.totalUnassignedOrders ?? 0) > 0
              ? 'Constraint limits reached'
              : 'Zero unassigned'}
          </span>
        </div>

        {/* Metric 3: Total Estimated Distance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
            <Navigation className="w-3 h-3 text-cyan-400" />
            Est. Total Distance
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-cyan-300">
              {optimizationResult?.totalDistanceKm ?? 0}
            </span>
            <span className="text-xs text-slate-400">km</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            All vehicle return loops
          </span>
        </div>

        {/* Metric 4: Total Estimated Travel Time */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-teal-400" />
            Est. Total Duration
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-teal-300">
              {Math.floor((optimizationResult?.totalDurationMinutes ?? 0) / 60)}h{' '}
              {(optimizationResult?.totalDurationMinutes ?? 0) % 60}m
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Travel + stop service time
          </span>
        </div>

        {/* Metric 5: Vehicles Used */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm col-span-2 md:col-span-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
            <Truck className="w-3 h-3 text-slate-400" />
            Vehicles Utilized
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-100">
              {optimizationResult?.vehiclesUsedCount ?? 0}
            </span>
            <span className="text-xs text-slate-400">
              / {vehicles.filter((v) => v.status !== 'Maintenance' && v.status !== 'Offline').length}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Active operational units
          </span>
        </div>
      </div>

      {/* Collapsible Settings Drawer */}
      <OptimizationSettingsDrawer
        settings={settings}
        onChangeSettings={setSettings}
        isOpen={isSettingsOpen}
        onToggle={() => setIsSettingsOpen(!isSettingsOpen)}
      />

      {/* Before vs. After Plan Comparison Panel */}
      {optimizationResult?.comparison && (
        <PlanComparisonPanel comparison={optimizationResult.comparison} />
      )}

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column A: Vehicle Route Plans List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Truck className="w-4 h-4 text-teal-400" />
              Vehicle Dispatch Schedules (
              {optimizationResult?.routes.filter((r) => r.stops.length > 0).length ?? 0} active)
            </h3>
            <span className="text-xs text-slate-400">Click legend on map to isolate path</span>
          </div>

          {optimizationResult?.routes.map((routePlan) => (
            <VehicleRouteCard
              key={routePlan.vehicle.id}
              routePlan={routePlan}
              isSelected={selectedVehicleId === routePlan.vehicle.id}
              onSelect={() =>
                setSelectedVehicleId(
                  selectedVehicleId === routePlan.vehicle.id ? undefined : routePlan.vehicle.id
                )
              }
            />
          ))}

          {/* Unassigned Orders Panel */}
          {optimizationResult && (
            <UnassignedOrdersPanel unassigned={optimizationResult.unassignedOrders} />
          )}
        </div>

        {/* Column B: Schematic Visualizer + AI Dispatcher Briefing (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Interactive Schematic SVG Visualizer */}
          <SchematicRouteVisualizer
            routes={optimizationResult?.routes ?? []}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={(vehId) =>
              setSelectedVehicleId(selectedVehicleId === vehId ? undefined : vehId)
            }
          />

          {/* Dispatcher AI Briefing Card */}
          {optimizationResult?.geminiInsight && (
            <DispatcherBriefingCard insight={optimizationResult.geminiInsight} />
          )}
        </div>
      </div>

      {/* Confirmation Modal to Apply Plan */}
      {optimizationResult && (
        <ApplyPlanConfirmationModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          result={optimizationResult}
          onConfirmApply={handleConfirmApplyPlan}
          isApplying={isApplying}
        />
      )}

      {/* Verification Tests Modal */}
      <VerificationTestsModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />
    </div>
  );
};
