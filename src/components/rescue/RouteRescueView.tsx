/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Vehicle, DeliveryOrder } from '../../types';
import { OptimizationResult } from '../../services/routing/types';
import { DisruptionIncident, RecoveryPlan } from '../../services/rescue/types';
import { calculateRecoveryPlan, isRecoveryPlanStale } from '../../services/rescue/recoveryEngine';
import { ReportBreakdownModal } from './ReportBreakdownModal';
import { AddUrgentDeliveryModal } from './AddUrgentDeliveryModal';
import { RecoveryPlanReviewModal } from './RecoveryPlanReviewModal';
import { DemoScenarioSelector, DemoScenarioKey } from './DemoScenarioSelector';
import { RescueVerificationModal } from './RescueVerificationModal';
import {
  LifeBuoy,
  AlertTriangle,
  Zap,
  Clock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface RouteRescueViewProps {
  orders: DeliveryOrder[];
  vehicles: Vehicle[];
  optimizationResult: OptimizationResult | null;
  incidents: DisruptionIncident[];
  recoveryPlans: RecoveryPlan[];
  onAddIncident: (incident: DisruptionIncident) => void;
  onAddUrgentOrder: (order: DeliveryOrder, incident: DisruptionIncident) => void;
  onSaveRecoveryPlan: (plan: RecoveryPlan) => void;
  onApplyPlan: (plan: RecoveryPlan) => boolean;
  onRejectPlan: (plan: RecoveryPlan) => void;
  onLoadDemoScenario: (scenario: DemoScenarioKey) => void;
}

export const RouteRescueView: React.FC<RouteRescueViewProps> = ({
  orders,
  vehicles,
  optimizationResult,
  incidents,
  recoveryPlans,
  onAddIncident,
  onAddUrgentOrder,
  onSaveRecoveryPlan,
  onApplyPlan,
  onRejectPlan,
  onLoadDemoScenario,
}) => {
  // Modal states
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [isUrgentModalOpen, setIsUrgentModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [selectedPlanForReview, setSelectedPlanForReview] = useState<RecoveryPlan | null>(null);
  const [selectedIncidentForReview, setSelectedIncidentForReview] = useState<DisruptionIncident | null>(null);
  const [isCalculatingPlan, setIsCalculatingPlan] = useState(false);

  // Filter state for incidents
  const [incidentFilter, setIncidentFilter] = useState<'all' | 'active' | 'resolved'>('all');

  // KPI Calculations
  const activeIncidents = incidents.filter((inc) => inc.status === 'active');
  const allAffectedOrderIds = Array.from(
    new Set(activeIncidents.flatMap((inc) => inc.affectedOrderIds))
  );
  const plansAwaitingApproval = recoveryPlans.filter((p) => p.status === 'Awaiting Approval');

  const lastCalculationTime = recoveryPlans.length > 0
    ? new Date(recoveryPlans[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'No calculations yet';

  // Handler to compute a recovery plan for an incident
  const handleCalculatePlan = (incident: DisruptionIncident) => {
    setIsCalculatingPlan(true);
    setTimeout(() => {
      try {
        const plan = calculateRecoveryPlan(incident, orders, vehicles, optimizationResult);
        onSaveRecoveryPlan(plan);
        setSelectedPlanForReview(plan);
        setSelectedIncidentForReview(incident);
      } finally {
        setIsCalculatingPlan(false);
      }
    }, 250);
  };

  const handleOpenReview = (incident: DisruptionIncident) => {
    const existingPlan = recoveryPlans.find((p) => p.incidentId === incident.id);
    if (existingPlan) {
      setSelectedPlanForReview(existingPlan);
      setSelectedIncidentForReview(incident);
    } else {
      handleCalculatePlan(incident);
    }
  };

  const handleUpdatePlanAiExplanation = (planId: string, explanation: any) => {
    const target = recoveryPlans.find((p) => p.id === planId);
    if (target) {
      const updated = { ...target, aiExplanation: explanation };
      onSaveRecoveryPlan(updated);
      if (selectedPlanForReview?.id === planId) {
        setSelectedPlanForReview(updated);
      }
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (incidentFilter === 'all') return true;
    return inc.status === incidentFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Route Rescue
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Module 6 Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Recover delivery plans when operations change unexpectedly.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Verification Suite */}
          <button
            onClick={() => setIsVerificationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 transition-all cursor-pointer"
            title="Run all 13 automated Module 6 verification tests"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verify Suite (13 Tests)</span>
          </button>

          {/* Action 1: Report Vehicle Breakdown */}
          <button
            onClick={() => setIsBreakdownModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Report Vehicle Breakdown</span>
          </button>

          {/* Action 2: Add Urgent Delivery */}
          <button
            onClick={() => setIsUrgentModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-md shadow-teal-500/20 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Add Urgent Delivery</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Active Incidents */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Active Incidents</span>
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold ${
                activeIncidents.length > 0 ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {activeIncidents.length}
            </span>
            <span className="text-[11px] text-slate-400">logged</span>
          </div>
        </div>

        {/* Affected Orders */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span>Affected Orders</span>
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold ${
                allAffectedOrderIds.length > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {allAffectedOrderIds.length}
            </span>
            <span className="text-[11px] text-slate-400">deliveries</span>
          </div>
        </div>

        {/* Plans Awaiting Approval */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
            <LifeBuoy className="w-3.5 h-3.5 text-teal-400" />
            <span>Awaiting Approval</span>
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold ${
                plansAwaitingApproval.length > 0 ? 'text-teal-300' : 'text-slate-100'
              }`}
            >
              {plansAwaitingApproval.length}
            </span>
            <span className="text-[11px] text-slate-400">recovery plans</span>
          </div>
        </div>

        {/* Last Recovery Calculation Time */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Last Calculation</span>
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-base font-bold text-slate-200 truncate">
              {lastCalculationTime}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Demo Scenarios Sandbox Selector */}
      <DemoScenarioSelector
        onLoadScenario={onLoadDemoScenario}
        isLoading={isCalculatingPlan}
      />

      {/* 4. Recent Disruption Incidents Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Disruption Incidents Queue ({filteredIncidents.length})
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-xs">
            {(['all', 'active', 'resolved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setIncidentFilter(f)}
                className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all cursor-pointer ${
                  incidentFilter === f
                    ? 'bg-slate-800 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/40 border border-slate-800/80 rounded-xl p-6 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="font-semibold text-slate-200 text-xs">No Disruption Incidents Reported</h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Fleet operations are running normally. Use the action buttons above or load a simulated demo scenario to test recovery workflows.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIncidents.map((incident) => {
              const plan = recoveryPlans.find((p) => p.incidentId === incident.id);
              const isPlanStale = plan ? isRecoveryPlanStale(plan, orders, vehicles, optimizationResult) : false;

              return (
                <div
                  key={incident.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          incident.type === 'vehicle_breakdown'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                        }`}
                      >
                        {incident.type === 'vehicle_breakdown' ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm">{incident.title}</span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded border ${
                              incident.status === 'active'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {incident.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono text-slate-400">{incident.id}</span>
                          <span>•</span>
                          <span>{new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {incident.breakdownLocation && (
                            <>
                              <span>•</span>
                              <span>Location: {incident.breakdownLocation}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Incident Plan Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {plan ? (
                        <div className="flex items-center gap-2">
                          {isPlanStale && (
                            <span className="text-[10px] text-amber-300 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                              Stale Plan
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenReview(incident)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 transition-all cursor-pointer shadow-sm shadow-teal-500/20"
                          >
                            <span>Review Recovery Plan</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCalculatePlan(incident)}
                          disabled={isCalculatingPlan}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${isCalculatingPlan ? 'animate-spin' : ''}`} />
                          <span>Calculate Recovery Plan</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-300 leading-relaxed text-[11px] pl-9">
                    {incident.description}
                  </p>

                  {/* Affected Orders Tags */}
                  {incident.affectedOrderIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] pl-9 pt-1">
                      <span className="text-slate-400 font-medium">Affected Orders ({incident.affectedOrderIds.length}):</span>
                      {incident.affectedOrderIds.map((id) => (
                        <span
                          key={id}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-teal-300 font-mono text-[10px]"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Recovery Plans History Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Recovery Plans History ({recoveryPlans.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Audit trail of recovery proposals</span>
        </div>

        {recoveryPlans.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No recovery plans have been generated yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recoveryPlans.map((plan) => {
              const relatedIncident = incidents.find((i) => i.id === plan.incidentId);

              const statusBadge = {
                'Applied': 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                'Awaiting Approval': 'bg-teal-500/10 text-teal-300 border-teal-500/30',
                'Draft': 'bg-slate-800 text-slate-300 border-slate-700',
                'Rejected': 'bg-rose-500/10 text-rose-300 border-rose-500/30',
                'Failed': 'bg-amber-500/10 text-amber-300 border-amber-500/30',
              }[plan.status];

              return (
                <div
                  key={plan.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 font-mono">{plan.id}</span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider border ${statusBadge}`}>
                        {plan.status}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Incident: {relatedIncident?.title || plan.incidentId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>Generated: {new Date(plan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>Distance: {plan.metricsComparison.afterTotalDistanceKm} km ({plan.metricsComparison.distanceDeltaKm > 0 ? `+${plan.metricsComparison.distanceDeltaKm}` : plan.metricsComparison.distanceDeltaKm} km)</span>
                      <span>•</span>
                      <span>{plan.proposedAssignments.length} stops proposed</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPlanForReview(plan);
                      setSelectedIncidentForReview(relatedIncident || null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer self-end sm:self-auto"
                  >
                    <span>View Plan Details</span>
                    <ChevronRight className="w-3.5 h-3.5 text-teal-400" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <ReportBreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        vehicles={vehicles}
        orders={orders}
        existingIncidents={incidents}
        onReportBreakdown={onAddIncident}
      />

      <AddUrgentDeliveryModal
        isOpen={isUrgentModalOpen}
        onClose={() => setIsUrgentModalOpen(false)}
        existingOrdersCount={orders.length}
        onAddUrgentOrder={onAddUrgentOrder}
        onOpenRecoveryReviewForIncident={(inc) => handleCalculatePlan(inc)}
      />

      <RecoveryPlanReviewModal
        isOpen={!!selectedPlanForReview}
        onClose={() => {
          setSelectedPlanForReview(null);
          setSelectedIncidentForReview(null);
        }}
        incident={selectedIncidentForReview}
        plan={selectedPlanForReview}
        isStale={selectedPlanForReview ? isRecoveryPlanStale(selectedPlanForReview, orders, vehicles, optimizationResult) : false}
        vehicles={vehicles}
        orders={orders}
        onApproveAndApply={(plan) => onApplyPlan(plan)}
        onRejectPlan={(plan) => onRejectPlan(plan)}
        onRecalculatePlan={(inc) => handleCalculatePlan(inc)}
        onUpdatePlanAiExplanation={handleUpdatePlanAiExplanation}
      />

      <RescueVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
      />
    </div>
  );
};
