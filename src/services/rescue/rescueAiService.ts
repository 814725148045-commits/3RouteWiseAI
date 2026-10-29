/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RecoveryPlan, RecoveryAiExplanation, DisruptionIncident } from './types';
import { Vehicle, DeliveryOrder } from '../../types';

/**
 * Prepares a sanitized, PII-free payload of the recovery plan for Gemini explanation.
 */
function buildSanitizedRescuePayload(
  plan: RecoveryPlan,
  incident: DisruptionIncident,
  vehicles: Vehicle[]
) {
  return {
    incident: {
      id: incident.id,
      type: incident.type,
      title: incident.title,
      vehicleId: incident.vehicleId,
      breakdownReason: incident.reason,
      affectedOrderIds: incident.affectedOrderIds,
    },
    recoveryPlan: {
      id: plan.id,
      isFeasible: plan.isFeasible,
      infeasibilityReason: plan.infeasibilityReason,
      proposedAssignmentsCount: plan.proposedAssignments.length,
      unassignedOrdersCount: plan.unassignedOrders.length,
      deadlineWarningsCount: plan.deadlineWarnings.length,
      metricsDelta: {
        distanceDeltaKm: plan.metricsComparison.distanceDeltaKm,
        durationDeltaMinutes: plan.metricsComparison.durationDeltaMinutes,
        beforeAssigned: plan.metricsComparison.beforeAssignedOrders,
        afterAssigned: plan.metricsComparison.afterAssignedOrders,
      },
      vehicles: plan.metricsComparison.vehicleCapacityUtilizations.map((v) => ({
        id: v.vehicleId,
        status: v.status,
        capacityKg: v.capacityKg,
        beforeLoadKg: v.beforeLoadKg,
        afterLoadKg: v.afterLoadKg,
        beforeUtil: v.beforeUtilizationPercent,
        afterUtil: v.afterUtilizationPercent,
        stopsCount: v.afterStopsCount,
      })),
      unassignedOrders: plan.unassignedOrders.map((u) => ({
        id: u.orderId,
        weightKg: u.weightKg,
        priority: u.priority,
        reason: u.reason,
      })),
      deadlineRisks: plan.deadlineWarnings.map((w) => ({
        orderId: w.orderId,
        vehicleId: w.vehicleId,
        discrepancyMinutes: w.discrepancyMinutes,
      })),
    },
  };
}

/**
 * Deterministic rule-based fallback explanation for Route Rescue
 * used if Gemini API is unconfigured, rate-limited, or unavailable.
 */
export function generateRescueRuleBasedFallback(
  plan: RecoveryPlan,
  incident: DisruptionIncident,
  vehicles: Vehicle[]
): RecoveryAiExplanation {
  const vehicleExclusionRationale: { vehicleId: string; reason: string }[] = [];
  vehicles.forEach((v) => {
    if (incident.type === 'vehicle_breakdown' && v.id === incident.vehicleId) {
      vehicleExclusionRationale.push({
        vehicleId: v.id,
        reason: `Excluded from routing due to reported breakdown incident (${incident.reason || 'Mechanical failure'}). Marked in Maintenance.`,
      });
    } else if (v.status === 'Maintenance' || v.status === 'Offline') {
      vehicleExclusionRationale.push({
        vehicleId: v.id,
        reason: `Excluded because vehicle is currently marked as ${v.status} in fleet roster.`,
      });
    }
  });

  const criticalOrderRisks: { orderId: string; riskDescription: string; severity: 'high' | 'medium' | 'low' }[] = [];
  plan.deadlineWarnings.forEach((w) => {
    criticalOrderRisks.push({
      orderId: w.orderId,
      riskDescription: `Estimated arrival on ${w.vehicleId} exceeds delivery deadline by ~${w.discrepancyMinutes} minutes.`,
      severity: w.discrepancyMinutes > 20 ? 'high' : 'medium',
    });
  });

  const unassignedAnalysis: { orderId: string; explanation: string }[] = [];
  plan.unassignedOrders.forEach((u) => {
    unassignedAnalysis.push({
      orderId: u.orderId,
      explanation: `${u.reason}: Package weight ${u.weightKg} kg could not be accommodated without violating remaining vehicle capacity.`,
    });
  });

  const planTradeOffs: { aspect: string; original: string; proposed: string; impact: string }[] = [
    {
      aspect: 'Fleet Coverage & Total Mileage',
      original: `${plan.metricsComparison.beforeTotalDistanceKm} km`,
      proposed: `${plan.metricsComparison.afterTotalDistanceKm} km`,
      impact:
        plan.metricsComparison.distanceDeltaKm > 0
          ? `+${plan.metricsComparison.distanceDeltaKm} km added to absorb displaced packages across surviving active vehicles.`
          : `${plan.metricsComparison.distanceDeltaKm} km net change.`,
    },
    {
      aspect: 'Fleet Capacity Loading',
      original: `${plan.metricsComparison.beforeAssignedOrders} orders routed`,
      proposed: `${plan.metricsComparison.afterAssignedOrders} orders routed`,
      impact:
        plan.unassignedOrders.length > 0
          ? `${plan.unassignedOrders.length} order(s) remain unassigned requiring secondary wave dispatch.`
          : '100% of eligible deliveries successfully absorbed into operational fleet.',
    },
  ];

  const actionableDispatcherDirectives: string[] = [];
  if (plan.unassignedOrders.length > 0) {
    actionableDispatcherDirectives.push(
      `Stage ${plan.unassignedOrders.length} unassigned order(s) for an afternoon secondary dispatch wave once morning loops finish.`
    );
  }
  if (plan.deadlineWarnings.length > 0) {
    actionableDispatcherDirectives.push(
      `Notify dispatch coordinators for orders ${plan.deadlineWarnings.map((w) => w.orderId).join(', ')} of potential SLA delay.`
    );
  }
  actionableDispatcherDirectives.push(
    'Verify physical cargo transfer from broken vehicle at depot before drivers depart.'
  );

  return {
    source: 'rule-based-fallback',
    modelName: 'Deterministic Rule-Based Recovery Engine',
    generatedAt: new Date().toISOString(),
    executiveSummary: plan.isFeasible
      ? `Feasible recovery plan formulated: Reallocated ${plan.proposedAssignments.length} deliveries across ${plan.metricsComparison.vehicleCapacityUtilizations.filter((v) => v.afterStopsCount > 0).length} available vehicles with ${plan.deadlineWarnings.length} deadline alerts.`
      : `Infeasible recovery plan: Operational fleet lacks sufficient payload capacity to absorb all ${incident.affectedOrderIds.length} affected deliveries. Dispatcher intervention required.`,
    vehicleExclusionRationale,
    criticalOrderRisks,
    unassignedAnalysis,
    planTradeOffs,
    actionableDispatcherDirectives,
  };
}

/**
 * Generates AI explanation of recovery plan using server-side Gemini integration,
 * with seamless deterministic fallback if server or API is unavailable.
 */
export async function generateRecoveryAiExplanation(
  plan: RecoveryPlan,
  incident: DisruptionIncident,
  vehicles: Vehicle[]
): Promise<RecoveryAiExplanation> {
  const sanitizedPayload = buildSanitizedRescuePayload(plan, incident, vehicles);

  try {
    const res = await fetch('/api/gemini/rescue-explanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sanitizedPayload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.explanation) {
        return {
          source: 'gemini-flash',
          modelName: data.modelName || 'gemini-3.8-flash',
          generatedAt: new Date().toISOString(),
          ...data.explanation,
        };
      }
    }
  } catch (err) {
    console.warn('[RouteWise Rescue] Gemini API unreachable, using deterministic fallback explanation:', err);
  }

  // Graceful rule-based fallback
  return generateRescueRuleBasedFallback(plan, incident, vehicles);
}
