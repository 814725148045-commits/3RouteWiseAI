/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RecoveryPlan, DisruptionIncident } from '../../services/rescue/types';
import { Vehicle, DeliveryOrder } from '../../types';
import { generateRecoveryAiExplanation } from '../../services/rescue/rescueAiService';
import {
  LifeBuoy,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Scale,
  Navigation,
  Info,
  HelpCircle,
} from 'lucide-react';

interface RecoveryPlanReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: DisruptionIncident | null;
  plan: RecoveryPlan | null;
  isStale: boolean;
  vehicles: Vehicle[];
  orders: DeliveryOrder[];
  onApproveAndApply: (plan: RecoveryPlan) => boolean | Promise<boolean>;
  onRejectPlan: (plan: RecoveryPlan) => void;
  onRecalculatePlan: (incident: DisruptionIncident) => void;
  onUpdatePlanAiExplanation: (planId: string, explanation: any) => void;
}

export const RecoveryPlanReviewModal: React.FC<RecoveryPlanReviewModalProps> = ({
  isOpen,
  onClose,
  incident,
  plan,
  isStale,
  vehicles,
  orders,
  onApproveAndApply,
  onRejectPlan,
  onRecalculatePlan,
  onUpdatePlanAiExplanation,
}) => {
  const [activeTab, setActiveTab] = useState<'comparison' | 'assignments' | 'fleet' | 'ai'>('comparison');
  const [isApplying, setIsApplying] = useState(false);
  const [applyErrorMessage, setApplyErrorMessage] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);

  if (!isOpen || !incident || !plan) return null;

  const isApprovalDisabled = isApplying || isStale || !plan.isFeasible || plan.status === 'Applied';

  const handleApply = async () => {
    if (isApprovalDisabled) return;
    setIsApplying(true);
    setApplyErrorMessage(null);
    try {
      const ok = await onApproveAndApply(plan);
      if (ok) {
        setConfirmApproveOpen(false);
        onClose();
      } else {
        setApplyErrorMessage('Application rejected by safety validations. Operational data remains unchanged.');
      }
    } catch (err: any) {
      setApplyErrorMessage(err?.message || 'Error occurred while applying recovery plan.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleReject = () => {
    if (window.confirm('Are you sure you want to reject this recovery plan? Current delivery schedules will remain unchanged.')) {
      onRejectPlan(plan);
      onClose();
    }
  };

  const handleGenerateAi = async () => {
    setIsGeneratingAi(true);
    try {
      const explanation = await generateRecoveryAiExplanation(plan, incident, vehicles);
      onUpdatePlanAiExplanation(plan.id, explanation);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const m = plan.metricsComparison;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Recovery Plan Review: <span className="font-mono text-teal-300">{plan.id}</span>
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    plan.status === 'Applied'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : plan.status === 'Rejected'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      : plan.isFeasible
                      ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {plan.status === 'Applied' ? 'Applied' : plan.isFeasible ? 'Feasible (Awaiting Approval)' : 'Infeasible Conflicts'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Incident: {incident.title} • Logged at {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Staleness Warning Banner */}
        {isStale && (
          <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Plan Out of Sync:</strong> Orders or fleet status changed after this plan was calculated. Approval requires recalculation.
              </span>
            </div>
            <button
              onClick={() => onRecalculatePlan(incident)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Recalculate Now</span>
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 shrink-0 bg-slate-900/60 text-xs">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3.5 py-2 font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'comparison'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Before &amp; After Comparison
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-3.5 py-2 font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'assignments'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Proposed Stops ({plan.proposedAssignments.length})
          </button>
          <button
            onClick={() => setActiveTab('fleet')}
            className={`px-3.5 py-2 font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'fleet'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Vehicle Capacities ({m.vehicleCapacityUtilizations.length})
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3.5 py-2 font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>AI Operational Explanation</span>
            {plan.aiExplanation && (
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            )}
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto text-xs text-slate-300">
          {/* TAB 1: Before & After Comparison */}
          {activeTab === 'comparison' && (
            <div className="space-y-5">
              {/* Feasibility Alert */}
              {!plan.isFeasible && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Recovery Plan Feasibility Warning</span>
                  </div>
                  <p className="text-[11px] text-amber-200 leading-relaxed">
                    {plan.infeasibilityReason}
                  </p>
                  {plan.practicalDispatcherOptions && (
                    <div className="pt-2 border-t border-amber-500/20 text-[11px] space-y-1">
                      <span className="font-semibold text-amber-300">Recommended Dispatcher Alternatives:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1">
                        {plan.practicalDispatcherOptions.map((opt, i) => (
                          <li key={i}>{opt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Metrics Comparison Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Assigned Orders</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-100">{m.afterAssignedOrders}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      (was {m.beforeAssignedOrders})
                    </span>
                  </div>
                  <span className="text-[10px] text-teal-300">
                    {m.afterAssignedOrders >= m.beforeAssignedOrders ? 'Maintained / Absorbed' : 'Partial assignment'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Unassigned Orders</span>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-lg font-bold ${
                        m.afterUnassignedOrders > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {m.afterUnassignedOrders}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      (was {m.beforeUnassignedOrders})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {plan.unassignedOrders.length} requiring follow-up
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Total Route Distance</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-100">{m.afterTotalDistanceKm} km</span>
                    <span
                      className={`text-[11px] font-mono ${
                        m.distanceDeltaKm > 0 ? 'text-amber-300' : 'text-emerald-300'
                      }`}
                    >
                      {m.distanceDeltaKm > 0 ? `+${m.distanceDeltaKm}` : m.distanceDeltaKm} km
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Estimated street mileage</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Deadline Warnings</span>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-lg font-bold ${
                        m.afterDeadlineWarnings > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {m.afterDeadlineWarnings}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      (was {m.beforeDeadlineWarnings})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Scheduled time risks</span>
                </div>
              </div>

              {/* Unassigned Orders Warning Panel */}
              {plan.unassignedOrders.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Unassigned Orders Remaining ({plan.unassignedOrders.length})</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Requires secondary action</span>
                  </div>
                  <div className="space-y-2">
                    {plan.unassignedOrders.map((u) => (
                      <div
                        key={u.orderId}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">
                            {u.orderId} — {u.customerName} ({u.weightKg} kg, Priority: {u.priority})
                          </div>
                          <p className="text-slate-400 mt-0.5">{u.detail}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[10px] font-mono shrink-0">
                          {u.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Quality & Synthetic Assumption Disclosure */}
              <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Audited Assumptions:</strong> Distances reflect synthetic coordinate grid calculations with urban circuity factor (1.35×) and steady transit speeds (35 km/h). Differences represent calculated optimizer estimates rather than guaranteed traffic conditions.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Proposed Stop Assignments */}
          {activeTab === 'assignments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>Proposed Vehicle Stops &amp; ETA Sequences</span>
                <span className="font-mono">{plan.proposedAssignments.length} total scheduled stops</span>
              </div>

              {plan.proposedAssignments.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  No proposed stops generated in this recovery plan.
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {plan.proposedAssignments.map((p) => (
                    <div
                      key={p.orderId}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-teal-500/10 border border-teal-500/30 text-teal-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                          #{p.stopIndex}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-200 flex items-center gap-2">
                            <span>{p.orderId}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-300">{p.customerName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{p.destination}</span>
                            <span>•</span>
                            <span className="font-mono">{p.weightKg} kg</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-teal-300 font-mono text-[11px]">
                          Reassigned to {p.assignedVehicleId}
                        </span>
                        <div className="text-right font-mono text-[11px]">
                          <div className="text-slate-200">ETA: {p.estimatedArrival}</div>
                          {p.isLate ? (
                            <span className="text-rose-400 text-[10px] font-semibold">
                              Late (~{p.discrepancyMinutes}m delay)
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-[10px]">On-Time</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Vehicle Capacities & Utilization */}
          {activeTab === 'fleet' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>Vehicle Load &amp; Capacity Utilization (Before vs. After)</span>
                <span>Max payload thresholds respected</span>
              </div>

              <div className="space-y-2.5">
                {m.vehicleCapacityUtilizations.map((v) => {
                  const isOver = v.afterUtilizationPercent > 90;
                  const isBroken = v.status === 'Maintenance' && incident.vehicleId === v.vehicleId;

                  return (
                    <div
                      key={v.vehicleId}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className={`w-4 h-4 ${isBroken ? 'text-rose-400' : 'text-teal-400'}`} />
                          <span className="font-bold text-slate-100">{v.vehicleId}</span>
                          <span className="text-slate-400">({v.driverName})</span>
                          {isBroken && (
                            <span className="px-2 py-0.2 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[10px] font-semibold">
                              Disabled (Breakdown)
                            </span>
                          )}
                        </div>
                        <div className="text-right text-[11px] font-mono">
                          <span className="text-slate-200">
                            {v.afterLoadKg} kg of {v.capacityKg} kg
                          </span>
                          <span className="text-slate-400 ml-1.5">
                            ({v.afterUtilizationPercent}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isBroken
                              ? 'bg-rose-500/40'
                              : isOver
                              ? 'bg-amber-400'
                              : 'bg-teal-400'
                          }`}
                          style={{ width: `${Math.min(v.afterUtilizationPercent, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          Stops: was {v.beforeStopsCount} → proposed {v.afterStopsCount}
                        </span>
                        <span>
                          Load delta: {v.afterLoadKg - v.beforeLoadKg > 0 ? `+${(v.afterLoadKg - v.beforeLoadKg).toFixed(1)}` : (v.afterLoadKg - v.beforeLoadKg).toFixed(1)} kg
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: AI Operational Explanation */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              {!plan.aiExplanation && !isGeneratingAi && (
                <div className="text-center py-8 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3 p-6">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mx-auto flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-200 text-sm">
                    Generate AI Recovery Plan Analysis
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Gemini analyzes why vehicles were excluded, reviews SLA deadline risks, interprets capacity trade-offs, and provides actionable dispatcher directives.
                  </p>
                  <button
                    onClick={handleGenerateAi}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 transition-all cursor-pointer shadow-md shadow-teal-500/20"
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Explain Recovery Plan with Gemini</span>
                  </button>
                </div>
              )}

              {isGeneratingAi && (
                <div className="text-center py-10 space-y-3 bg-slate-950/60 border border-slate-800 rounded-xl p-6">
                  <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">
                    Synthesizing recovery trade-offs with Gemini...
                  </p>
                </div>
              )}

              {plan.aiExplanation && !isGeneratingAi && (
                <div className="space-y-4">
                  {/* Status & Engine */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>Explanation Engine:</span>
                      <strong className="text-teal-300">
                        {plan.aiExplanation.source === 'gemini-flash' ? `Gemini Flash (${plan.aiExplanation.modelName})` : 'Deterministic Rule-Based Engine'}
                      </strong>
                    </span>
                    <button
                      onClick={handleGenerateAi}
                      className="text-teal-400 hover:underline cursor-pointer"
                    >
                      Re-generate Analysis
                    </button>
                  </div>

                  {/* Executive Summary */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">
                      Operational Recovery Summary
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {plan.aiExplanation.executiveSummary}
                    </p>
                  </div>

                  {/* Exclusions & Risks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Vehicle Exclusions */}
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Vehicle Exclusion Rationale
                      </span>
                      {plan.aiExplanation.vehicleExclusionRationale.map((ex, i) => (
                        <div key={i} className="text-[11px] space-y-0.5">
                          <strong className="text-slate-200 font-mono">{ex.vehicleId}:</strong>{' '}
                          <span className="text-slate-300">{ex.reason}</span>
                        </div>
                      ))}
                    </div>

                    {/* Critical Order Risks */}
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                        Critical Order Risks
                      </span>
                      {plan.aiExplanation.criticalOrderRisks.length === 0 ? (
                        <p className="text-[11px] text-emerald-400">
                          Zero critical SLA risks identified in proposed assignments.
                        </p>
                      ) : (
                        plan.aiExplanation.criticalOrderRisks.map((cr, i) => (
                          <div key={i} className="text-[11px] space-y-0.5">
                            <span className="font-mono text-rose-300 font-semibold">{cr.orderId}:</span>{' '}
                            <span className="text-slate-300">{cr.riskDescription}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Plan Trade-offs */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Key Operational Trade-offs
                    </span>
                    <div className="space-y-1.5">
                      {plan.aiExplanation.planTradeOffs.map((to, i) => (
                        <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800/80 text-[11px] space-y-0.5">
                          <strong className="text-slate-200">{to.aspect}:</strong>{' '}
                          <span className="text-slate-300">{to.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Directives */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-teal-500/20 space-y-2 text-xs">
                    <span className="text-[10px] uppercase font-bold text-teal-300 tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-400" />
                      Actionable Dispatcher Directives
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                      {plan.aiExplanation.actionableDispatcherDirectives.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReject}
              disabled={isApplying || plan.status === 'Applied'}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Reject Plan
            </button>
            <button
              onClick={() => onRecalculatePlan(incident)}
              disabled={isApplying}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Recalculate Plan</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer disabled:opacity-50"
            >
              Cancel Review
            </button>

            {plan.status !== 'Applied' && (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                {isApprovalDisabled && !isApplying && (
                  <div className="text-[11px] text-amber-300 flex items-center gap-1.5 max-w-xs text-right sm:text-left bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      {isStale
                        ? 'Approval disabled: Operational data changed. Recalculate.'
                        : !plan.isFeasible
                        ? 'Approval disabled: Plan is infeasible (capacity deficit).'
                        : 'Approval disabled.'}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setApplyErrorMessage(null);
                    setConfirmApproveOpen(true);
                  }}
                  disabled={isApprovalDisabled}
                  title={
                    isStale
                      ? 'Approval disabled: Operational data has changed since this plan was computed. Please recalculate.'
                      : !plan.isFeasible
                      ? `Approval disabled: Plan is infeasible. ${plan.infeasibilityReason || ''}`
                      : undefined
                  }
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-md shadow-teal-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isApplying ? (
                    <span>Applying Changes...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve &amp; Apply Plan</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Secondary Dispatcher Confirmation Dialog */}
        {confirmApproveOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">
                    Confirm Recovery Plan Application
                  </h4>
                  <p className="text-xs text-slate-400">
                    Dispatcher Authorization Required
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Applying this recovery plan will reassign <strong className="text-teal-300">{plan.proposedAssignments.length} active delivery stops</strong> across available fleet vehicles, mark disabled vehicles in maintenance, and preserve all completed drops. Proceed?
              </p>

              {applyErrorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <XCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{applyErrorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmApproveOpen(false)}
                  disabled={isApplying}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={isApplying || isApprovalDisabled}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 cursor-pointer disabled:opacity-50"
                >
                  {isApplying ? 'Applying...' : 'Yes, Apply Recovery Plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
