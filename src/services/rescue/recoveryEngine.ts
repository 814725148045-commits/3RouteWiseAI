/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeliveryOrder, Vehicle, OrderStatus } from '../../types';
import { optimizeRoutes, DEFAULT_OPTIMIZATION_SETTINGS } from '../routing/optimizer';
import { OptimizationResult } from '../routing/types';
import { computeDataFingerprint } from '../ai/sanitizePayload';
import {
  DisruptionIncident,
  RecoveryPlan,
  RecoveryMetricsComparison,
  VehicleCapacityComparison,
  ProposedStopAssignment,
  ProposedUnassignedOrder,
} from './types';

/**
 * Calculates a deterministic recovery plan for a disruption incident.
 * Uses the existing Module 4 optimizer while preserving completed/cancelled deliveries
 * and excluding out-of-service or broken fleet assets.
 */
export function calculateRecoveryPlan(
  incident: DisruptionIncident,
  currentOrders: DeliveryOrder[],
  currentVehicles: Vehicle[],
  currentOptimizationResult: OptimizationResult | null
): RecoveryPlan {
  const planId = `REC-PLAN-${Date.now().toString().slice(-4)}`;
  const snapshotDataFingerprint = computeDataFingerprint(currentOrders, currentVehicles, currentOptimizationResult);

  // 1. Identify completed and cancelled orders to freeze them
  const deliveredOrders = currentOrders.filter((o) => o.status === 'delivered');
  const cancelledOrders = currentOrders.filter((o) => o.status === 'cancelled');
  const frozenOrderIds = new Set([...deliveredOrders.map((o) => o.id), ...cancelledOrders.map((o) => o.id)]);

  // 2. Identify candidate fleet:
  // If incident is vehicle breakdown, exclude this vehicle explicitly (set status to Maintenance in recovery candidate pool)
  const candidateVehicles = currentVehicles.map((v) => {
    if (incident.type === 'vehicle_breakdown' && v.id === incident.vehicleId) {
      return { ...v, status: 'Maintenance' as const };
    }
    return { ...v };
  });

  const availableVehicles = candidateVehicles.filter(
    (v) => v.status === 'Available' || v.status === 'On Route'
  );

  // 3. Identify all eligible orders needing assignment:
  // Include orders that were assigned to the broken vehicle (affected orders),
  // plus other active/pending orders, but strictly EXCLUDE delivered and cancelled orders.
  const eligibleOrdersToRoute = currentOrders
    .filter((o) => !frozenOrderIds.has(o.id))
    .map((o) => {
      // If order was assigned to the broken vehicle, unassign it so optimizer reallocates
      if (incident.type === 'vehicle_breakdown' && o.assignedVehicleId === incident.vehicleId) {
        return { ...o, assignedVehicleId: undefined, status: 'pending' as const };
      }
      return { ...o };
    });

  // Snapshot original assignments
  const originalAssignments = currentOrders.map((o) => ({
    orderId: o.id,
    previousVehicleId: o.assignedVehicleId,
    status: o.status,
  }));

  // 4. Handle edge case: No vehicles available to service demand
  if (availableVehicles.length === 0) {
    const totalRemainingWeight = eligibleOrdersToRoute.reduce((sum, o) => sum + (o.weightKg || 0), 0);
    const unassignedList: ProposedUnassignedOrder[] = eligibleOrdersToRoute.map((o) => ({
      orderId: o.id,
      customerName: o.customerName,
      weightKg: o.weightKg,
      priority: o.priority,
      reason: 'No operational vehicles available',
      detail: `All ${currentVehicles.length} vehicles in fleet are in Maintenance or Offline status.`,
    }));

    return {
      id: planId,
      incidentId: incident.id,
      incidentType: incident.type,
      incidentVehicleId: incident.type === 'vehicle_breakdown' ? incident.vehicleId : undefined,
      createdAt: new Date().toISOString(),
      status: 'Awaiting Approval',
      isFeasible: false,
      infeasibilityReason: `Zero operational vehicles available in fleet. Cannot reassign ${eligibleOrdersToRoute.length} active orders (${totalRemainingWeight.toFixed(1)} kg).`,
      practicalDispatcherOptions: [
        'Bring standby or reserve courier vehicles online from Depot.',
        'Expedite quick repairs on vehicles currently in Maintenance.',
        'Split freight into an emergency third-party courier dispatch.',
      ],
      snapshotDataFingerprint,
      originalAssignments,
      proposedAssignments: [],
      unassignedOrders: unassignedList,
      deadlineWarnings: [],
      metricsComparison: buildInfeasibleMetricsComparison(currentOrders, currentVehicles, currentOptimizationResult),
    };
  }

  // 5. Run the deterministic Module 4 Optimizer
  const recoveryOptResult = optimizeRoutes(
    eligibleOrdersToRoute,
    availableVehicles,
    DEFAULT_OPTIMIZATION_SETTINGS
  );

  // 6. Build proposed assignments from optimizer output
  const proposedAssignments: ProposedStopAssignment[] = [];
  const deadlineWarnings: RecoveryPlan['deadlineWarnings'] = [];

  recoveryOptResult.routes.forEach((route) => {
    route.stops.forEach((stop) => {
      proposedAssignments.push({
        orderId: stop.order.id,
        customerName: stop.order.customerName,
        destination: stop.order.destination,
        weightKg: stop.order.weightKg,
        priority: stop.order.priority,
        deadline: stop.deadlineString,
        assignedVehicleId: route.vehicle.id,
        stopIndex: stop.stopIndex,
        estimatedArrival: stop.estimatedArrival,
        isLate: stop.isDeadlineMissed,
        discrepancyMinutes: stop.deadlineDiscrepancyMinutes,
      });

      if (stop.isDeadlineMissed) {
        deadlineWarnings.push({
          orderId: stop.order.id,
          vehicleId: route.vehicle.id,
          deadline: stop.deadlineString,
          estimatedArrival: stop.estimatedArrival,
          discrepancyMinutes: stop.deadlineDiscrepancyMinutes || 0,
        });
      }
    });
  });

  // Map unassigned orders
  const unassignedOrders: ProposedUnassignedOrder[] = recoveryOptResult.unassignedOrders.map((u) => ({
    orderId: u.order.id,
    customerName: u.order.customerName,
    weightKg: u.order.weightKg,
    priority: u.order.priority,
    reason: u.reason,
    detail: u.detail,
  }));

  // 7. Check feasibility:
  // If all affected orders could not be assigned or severe capacity deficits occurred
  const affectedOrdersUnassigned = unassignedOrders.filter((u) => incident.affectedOrderIds.includes(u.orderId));
  const isFeasible = affectedOrdersUnassigned.length === 0;
  let infeasibilityReason: string | undefined;
  let practicalDispatcherOptions: string[] | undefined;

  if (!isFeasible) {
    infeasibilityReason = `${affectedOrdersUnassigned.length} of ${incident.affectedOrderIds.length} affected order(s) could not be accommodated within available fleet payload capacity.`;
    practicalDispatcherOptions = [
      'Defer non-urgent routine orders to a secondary afternoon dispatch loop.',
      'Re-activate offline or maintenance vehicles with partial capacity.',
      'Authorize payload override or split oversized orders across two vehicles.',
    ];
  }

  // 8. Build before-and-after comparison metrics
  const metricsComparison = buildRecoveryMetricsComparison(
    currentOrders,
    currentVehicles,
    currentOptimizationResult,
    recoveryOptResult,
    incident,
    candidateVehicles
  );

  return {
    id: planId,
    incidentId: incident.id,
    incidentType: incident.type,
    incidentVehicleId: incident.type === 'vehicle_breakdown' ? incident.vehicleId : undefined,
    createdAt: new Date().toISOString(),
    status: 'Awaiting Approval',
    isFeasible,
    infeasibilityReason,
    practicalDispatcherOptions,
    snapshotDataFingerprint,
    originalAssignments,
    proposedAssignments,
    unassignedOrders,
    deadlineWarnings,
    metricsComparison,
  };
}

/**
 * Constructs detailed before-and-after metric deltas
 */
function buildRecoveryMetricsComparison(
  beforeOrders: DeliveryOrder[],
  beforeVehicles: Vehicle[],
  beforeOptResult: OptimizationResult | null,
  afterOptResult: OptimizationResult,
  incident: DisruptionIncident,
  afterVehicles: Vehicle[]
): RecoveryMetricsComparison {
  const beforeAssigned = beforeOrders.filter(
    (o) => o.assignedVehicleId && o.status !== 'cancelled' && o.status !== 'delivered'
  ).length;
  const beforeUnassigned = beforeOrders.filter(
    (o) => !o.assignedVehicleId && o.status !== 'cancelled' && o.status !== 'delivered'
  ).length;

  const beforeDist = beforeOptResult ? beforeOptResult.totalDistanceKm : 0;
  const afterDist = afterOptResult.totalDistanceKm;

  const beforeDuration = beforeOptResult ? beforeOptResult.totalDurationMinutes : 0;
  const afterDuration = afterOptResult.totalDurationMinutes;

  let beforeDeadlines = 0;
  if (beforeOptResult) {
    beforeOptResult.routes.forEach((r) => {
      r.stops.forEach((s) => {
        if (s.isDeadlineMissed) beforeDeadlines++;
      });
    });
  }

  let afterDeadlines = 0;
  afterOptResult.routes.forEach((r) => {
    r.stops.forEach((s) => {
      if (s.isDeadlineMissed) afterDeadlines++;
    });
  });

  // Calculate vehicle capacity utilization before vs after
  const vehicleCapacityUtilizations: VehicleCapacityComparison[] = afterVehicles.map((v) => {
    const beforeOrdersForV = beforeOrders.filter(
      (o) => o.assignedVehicleId === v.id && o.status !== 'cancelled' && o.status !== 'delivered'
    );
    const beforeLoad = beforeOrdersForV.reduce((sum, o) => sum + (o.weightKg || 0), 0);
    const beforeUtil = v.capacityKg > 0 ? Math.round((beforeLoad / v.capacityKg) * 100) : 0;

    const afterRoute = afterOptResult.routes.find((r) => r.vehicle.id === v.id);
    const afterLoad = afterRoute ? afterRoute.totalAssignedLoadKg : 0;
    const afterUtil = v.capacityKg > 0 ? Math.round((afterLoad / v.capacityKg) * 100) : 0;

    return {
      vehicleId: v.id,
      vehicleName: v.name,
      driverName: v.driverName,
      capacityKg: v.capacityKg,
      beforeLoadKg: Number(beforeLoad.toFixed(1)),
      afterLoadKg: Number(afterLoad.toFixed(1)),
      beforeUtilizationPercent: beforeUtil,
      afterUtilizationPercent: afterUtil,
      beforeStopsCount: beforeOrdersForV.length,
      afterStopsCount: afterRoute ? afterRoute.stops.length : 0,
      status: v.status,
    };
  });

  return {
    beforeAssignedOrders: beforeAssigned,
    afterAssignedOrders: afterOptResult.totalAssignedOrders,
    beforeUnassignedOrders: beforeUnassigned,
    afterUnassignedOrders: afterOptResult.totalUnassignedOrders,
    beforeTotalDistanceKm: Number(beforeDist.toFixed(1)),
    afterTotalDistanceKm: Number(afterDist.toFixed(1)),
    distanceDeltaKm: Number((afterDist - beforeDist).toFixed(1)),
    beforeTotalDurationMinutes: beforeDuration,
    afterTotalDurationMinutes: afterDuration,
    durationDeltaMinutes: afterDuration - beforeDuration,
    beforeDeadlineWarnings: beforeDeadlines,
    afterDeadlineWarnings: afterDeadlines,
    affectedVehiclesCount: incident.affectedVehicleIds.length,
    affectedOrdersCount: incident.affectedOrderIds.length,
    vehicleCapacityUtilizations,
  };
}

/**
 * Metric delta builder for completely infeasible zero-vehicle edge case
 */
function buildInfeasibleMetricsComparison(
  beforeOrders: DeliveryOrder[],
  beforeVehicles: Vehicle[],
  beforeOptResult: OptimizationResult | null
): RecoveryMetricsComparison {
  const beforeAssigned = beforeOrders.filter(
    (o) => o.assignedVehicleId && o.status !== 'cancelled' && o.status !== 'delivered'
  ).length;

  return {
    beforeAssignedOrders: beforeAssigned,
    afterAssignedOrders: 0,
    beforeUnassignedOrders: beforeOrders.filter(
      (o) => !o.assignedVehicleId && o.status !== 'cancelled' && o.status !== 'delivered'
    ).length,
    afterUnassignedOrders: beforeOrders.filter(
      (o) => o.status !== 'cancelled' && o.status !== 'delivered'
    ).length,
    beforeTotalDistanceKm: beforeOptResult?.totalDistanceKm || 0,
    afterTotalDistanceKm: 0,
    distanceDeltaKm: -(beforeOptResult?.totalDistanceKm || 0),
    beforeTotalDurationMinutes: beforeOptResult?.totalDurationMinutes || 0,
    afterTotalDurationMinutes: 0,
    durationDeltaMinutes: -(beforeOptResult?.totalDurationMinutes || 0),
    beforeDeadlineWarnings: 0,
    afterDeadlineWarnings: 0,
    affectedVehiclesCount: beforeVehicles.length,
    affectedOrdersCount: beforeOrders.length,
    vehicleCapacityUtilizations: beforeVehicles.map((v) => ({
      vehicleId: v.id,
      vehicleName: v.name,
      driverName: v.driverName,
      capacityKg: v.capacityKg,
      beforeLoadKg: 0,
      afterLoadKg: 0,
      beforeUtilizationPercent: 0,
      afterUtilizationPercent: 0,
      beforeStopsCount: 0,
      afterStopsCount: 0,
      status: v.status,
    })),
  };
}

/**
 * Verifies if a recovery plan is stale compared to live application state.
 */
export function isRecoveryPlanStale(
  plan: RecoveryPlan,
  liveOrders: DeliveryOrder[],
  liveVehicles: Vehicle[],
  liveOptResult: OptimizationResult | null
): boolean {
  const liveFingerprint = computeDataFingerprint(liveOrders, liveVehicles, liveOptResult);
  return plan.snapshotDataFingerprint !== liveFingerprint;
}

/**
 * Safely applies a validated recovery plan to orders and vehicles.
 * Strictly respects Delivered and Cancelled orders, does not modify unrelated fields,
 * validates vehicle status, capacity, limits, and completeness, and executes an atomic in-memory state transition.
 */
export function applyRecoveryPlan(
  plan: RecoveryPlan,
  orders: DeliveryOrder[],
  vehicles: Vehicle[],
  currentOptimizationResult?: OptimizationResult | null,
  incident?: DisruptionIncident | null
): {
  success: boolean;
  updatedOrders: DeliveryOrder[];
  updatedVehicles: Vehicle[];
  errorMessage?: string;
} {
  // 1. Check if plan was already applied
  if (plan.status === 'Applied') {
    return {
      success: false,
      updatedOrders: orders,
      updatedVehicles: vehicles,
      errorMessage: 'Cannot apply recovery plan: Plan has already been applied.',
    };
  }

  // 2. Reject infeasible plans
  if (!plan.isFeasible) {
    return {
      success: false,
      updatedOrders: orders,
      updatedVehicles: vehicles,
      errorMessage: plan.infeasibilityReason || 'Cannot apply recovery plan: Plan is marked infeasible due to operational or capacity deficits.',
    };
  }

  // 3. Staleness / Freshness check
  // A. Check against currentOptimizationResult if passed
  if (currentOptimizationResult !== undefined && isRecoveryPlanStale(plan, orders, vehicles, currentOptimizationResult)) {
    return {
      success: false,
      updatedOrders: orders,
      updatedVehicles: vehicles,
      errorMessage: 'Cannot apply recovery plan: Operational data has changed since this plan was calculated (stale plan). Please recalculate before applying.',
    };
  }

  // B. Check against originalAssignments snapshot if available
  if (plan.originalAssignments && plan.originalAssignments.length > 0) {
    if (orders.length !== plan.originalAssignments.length) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: 'Cannot apply recovery plan: Operational orders list has changed since this plan was calculated (stale plan).',
      };
    }
    const liveOrderMap = new Map(orders.map((o) => [o.id, o]));
    for (const orig of plan.originalAssignments) {
      const liveOrder = liveOrderMap.get(orig.orderId);
      if (!liveOrder || liveOrder.status !== orig.status || liveOrder.assignedVehicleId !== orig.previousVehicleId) {
        return {
          success: false,
          updatedOrders: orders,
          updatedVehicles: vehicles,
          errorMessage: `Cannot apply recovery plan: Order ${orig.orderId} status or assignment has changed since this plan was calculated (stale plan).`,
        };
      }
    }
  }

  const liveOrderMap = new Map(orders.map((o) => [o.id, o]));
  const liveVehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  // 4. Validate breakdown incident vehicle identification (Bug 1)
  if (plan.incidentType === 'vehicle_breakdown') {
    const targetBrokenId = plan.incidentVehicleId || incident?.vehicleId;
    if (!targetBrokenId) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: 'Cannot apply breakdown recovery plan: Incident vehicle ID is missing from the plan.',
      };
    }
    const brokenVehicle = liveVehicleMap.get(targetBrokenId);
    if (!brokenVehicle) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: `Cannot apply breakdown recovery plan: Broken vehicle ${targetBrokenId} does not exist in the fleet.`,
      };
    }
  }

  // 5. Immutable Delivered and Cancelled orders check
  const deliveredOrCancelledOrders = orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled');
  const deliveredOrCancelledIds = new Set(deliveredOrCancelledOrders.map((o) => o.id));

  for (const p of plan.proposedAssignments) {
    if (deliveredOrCancelledIds.has(p.orderId)) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: `Cannot apply recovery plan: Attempted to reassign order ${p.orderId}, which is already delivered or cancelled. Delivered and cancelled orders are immutable.`,
      };
    }
  }
  for (const u of plan.unassignedOrders) {
    if (deliveredOrCancelledIds.has(u.orderId)) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: `Cannot apply recovery plan: Attempted to modify order ${u.orderId}, which is already delivered or cancelled. Delivered and cancelled orders are immutable.`,
      };
    }
  }

  // 6. Check existence of referenced orders and vehicles
  for (const p of plan.proposedAssignments) {
    if (!liveOrderMap.has(p.orderId)) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: `Cannot apply recovery plan: Proposed assignment references nonexistent order ${p.orderId}.`,
      };
    }
    if (!liveVehicleMap.has(p.assignedVehicleId)) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: `Cannot apply recovery plan: Proposed assignment references nonexistent vehicle ${p.assignedVehicleId}.`,
      };
    }
  }
  for (const u of plan.unassignedOrders) {
    if (!liveOrderMap.has(u.orderId)) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: `Cannot apply recovery plan: Unassigned order list references nonexistent order ${u.orderId}.`,
      };
    }
  }

  // 7. Duplicate assignments check
  const seenAssignedOrderIds = new Set<string>();
  for (const p of plan.proposedAssignments) {
    if (seenAssignedOrderIds.has(p.orderId)) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: `Cannot apply recovery plan: Duplicate assignment detected for order ${p.orderId}.`,
      };
    }
    seenAssignedOrderIds.add(p.orderId);
  }

  const seenUnassignedOrderIds = new Set<string>();
  for (const u of plan.unassignedOrders) {
    if (seenAssignedOrderIds.has(u.orderId)) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: `Cannot apply recovery plan: Order ${u.orderId} is listed in both proposed assignments and unassigned orders.`,
      };
    }
    if (seenUnassignedOrderIds.has(u.orderId)) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: `Cannot apply recovery plan: Duplicate entry in unassigned orders for order ${u.orderId}.`,
      };
    }
    seenUnassignedOrderIds.add(u.orderId);
  }

  // 8. Reject assignments to Maintenance or Offline vehicles
  for (const p of plan.proposedAssignments) {
    const targetVehicle = liveVehicleMap.get(p.assignedVehicleId)!;
    if (targetVehicle.status === 'Maintenance' || targetVehicle.status === 'Offline') {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: `Cannot apply recovery plan: Cannot assign order ${p.orderId} to vehicle ${p.assignedVehicleId} because its status is ${targetVehicle.status}.`,
      };
    }
    if (plan.incidentType === 'vehicle_breakdown') {
      const targetBrokenId = plan.incidentVehicleId || incident?.vehicleId;
      if (p.assignedVehicleId === targetBrokenId) {
        return {
          success: false,
          updatedOrders: orders,
          updatedVehicles: vehicles,
          errorMessage: `Cannot apply recovery plan: Cannot assign order ${p.orderId} to broken breakdown vehicle ${p.assignedVehicleId}.`,
        };
      }
    }
  }

  // 9. Cargo capacity and maximum stops limit check
  const vehicleProposedStops = new Map<string, { stopsCount: number; totalWeightKg: number }>();
  for (const p of plan.proposedAssignments) {
    const current = vehicleProposedStops.get(p.assignedVehicleId) || { stopsCount: 0, totalWeightKg: 0 };
    const orderWeight = Math.max(liveOrderMap.get(p.orderId)?.weightKg ?? 0, p.weightKg ?? 0);
    vehicleProposedStops.set(p.assignedVehicleId, {
      stopsCount: current.stopsCount + 1,
      totalWeightKg: current.totalWeightKg + orderWeight,
    });
  }

  for (const [vehicleId, load] of vehicleProposedStops.entries()) {
    const v = liveVehicleMap.get(vehicleId)!;
    if (v.capacityKg > 0 && load.totalWeightKg > v.capacityKg + 0.001) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: `Cannot apply recovery plan: Vehicle ${v.id} exceeds maximum cargo capacity (${load.totalWeightKg.toFixed(1)} kg assigned / max capacity ${v.capacityKg} kg).`,
      };
    }
    if (v.maxStops > 0 && load.stopsCount > v.maxStops) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: `Cannot apply recovery plan: Vehicle ${v.id} exceeds maximum stop limit (${load.stopsCount} stops assigned / max limit ${v.maxStops} stops).`,
      };
    }
  }

  // 10. Account for every eligible active order in recovery scope
  const eligibleActiveOrders = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  );
  const accountedOrderIds = new Set<string>([
    ...plan.proposedAssignments.map((p) => p.orderId),
    ...plan.unassignedOrders.map((u) => u.orderId),
  ]);

  for (const order of eligibleActiveOrders) {
    if (!accountedOrderIds.has(order.id)) {
      return {
        success: false,
        updatedOrders: orders,
        updatedVehicles: vehicles,
        errorMessage: `Cannot apply recovery plan: Active order ${order.id} is unaccounted for in recovery plan (neither assigned nor listed as unassigned).`,
      };
    }
  }

  // ----------------------------------------------------
  // ALL VALIDATIONS PASSED -> ATOMIC IN-MEMORY UPDATE
  // ----------------------------------------------------

  // 1. Build map of proposed assignments: orderId -> vehicleId
  const proposedVehicleMap = new Map<string, string>();
  plan.proposedAssignments.forEach((p) => {
    proposedVehicleMap.set(p.orderId, p.assignedVehicleId);
  });

  // 2. Identify unassigned order IDs
  const unassignedSet = new Set(plan.unassignedOrders.map((u) => u.orderId));

  // 3. Atomically update orders
  const updatedOrders = orders.map((order) => {
    // Never modify delivered or cancelled orders
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return order;
    }

    if (proposedVehicleMap.has(order.id)) {
      const newVehicleId = proposedVehicleMap.get(order.id);
      return {
        ...order,
        assignedVehicleId: newVehicleId,
        status: 'assigned' as const,
      };
    }

    if (unassignedSet.has(order.id)) {
      return {
        ...order,
        assignedVehicleId: undefined,
        status: 'pending' as const,
      };
    }

    return order;
  });

  // 4. Atomically update vehicles:
  // If plan was caused by breakdown, flag ONLY the explicitly identified breakdown vehicle as 'Maintenance'
  const targetBrokenVehicleId = plan.incidentType === 'vehicle_breakdown'
    ? (plan.incidentVehicleId || incident?.vehicleId)
    : undefined;

  const updatedVehicles = vehicles.map((v) => {
    if (targetBrokenVehicleId && v.id === targetBrokenVehicleId) {
      return { ...v, status: 'Maintenance' as const };
    }
    return v;
  });

  return {
    success: true,
    updatedOrders,
    updatedVehicles,
  };
}
