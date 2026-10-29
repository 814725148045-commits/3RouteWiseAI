/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeliveryOrder, Vehicle } from '../../types';
import { OptimizationResult } from '../routing/types';
import { SanitizedAnalysisPayload } from './insightsTypes';
import { SYNTHETIC_MODEL_DISCLOSURE } from '../routing/travelCostMatrix';

/**
 * Computes a robust, deterministic fingerprint of current operational state.
 * Captures all fields that affect routing, capacity, scheduling, or recovery feasibility:
 * - Order IDs, statuses, assignments, weights, destinations, pickup addresses, deadlines, priorities, coordinates.
 * - Vehicle IDs, statuses, cargo capacities, maximum stops, depot locations, zones.
 * - Semantic route assignments, stop orders, and calculated telemetry metrics when optimization is present.
 *
 * Excludes arbitrary result IDs and timestamps so equivalent reruns produce stable fingerprints.
 */
export function computeDataFingerprint(
  orders: DeliveryOrder[],
  vehicles: Vehicle[],
  optimizationResult: OptimizationResult | null
): string {
  // 1. Stable, deterministic serialization of orders
  const sortedOrders = [...(orders || [])].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  const ordersSummary = sortedOrders
    .map((o) => {
      const id = (o.id || '').trim();
      const status = (o.status || '').trim();
      const assignedV = o.assignedVehicleId ? o.assignedVehicleId.trim() : 'unassigned';
      const weight = Number(o.weightKg ?? o.packageWeightKg ?? 0).toFixed(2);
      const destination = (o.destination || o.deliveryAddress || '').trim().toLowerCase();
      const pickup = (o.pickupAddress || '').trim().toLowerCase();
      const deadline = (o.deliveryDeadline || o.estimatedArrival || '').trim();
      const priority = (o.priority || 'normal').trim();
      const coords =
        o.coordinates && typeof o.coordinates.x === 'number' && typeof o.coordinates.y === 'number'
          ? `${o.coordinates.x.toFixed(4)},${o.coordinates.y.toFixed(4)}`
          : 'no-coords';
      return `${id}:${status}:${assignedV}:${weight}:${destination}:${pickup}:${deadline}:${priority}:${coords}`;
    })
    .join(';');

  // 2. Stable, deterministic serialization of fleet
  const sortedVehicles = [...(vehicles || [])].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  const vehiclesSummary = sortedVehicles
    .map((v) => {
      const id = (v.id || '').trim();
      const status = (v.status || '').trim();
      const capacity = Number(v.capacityKg ?? v.maxCapacityKg ?? 0).toFixed(2);
      const maxStops = Number(v.maxStops ?? 0).toString();
      const depot = (v.currentDepot || v.currentLocation || '').trim().toLowerCase();
      const zone = (v.currentZone || '').trim().toLowerCase();
      return `${id}:${status}:${capacity}:${maxStops}:${depot}:${zone}`;
    })
    .join(';');

  // 3. Stable, deterministic serialization of route optimization result (omitting arbitrary ID and timestamps)
  let optSummary = 'no-opt';
  if (optimizationResult) {
    const sortedRoutes = [...(optimizationResult.routes || [])]
      .sort((a, b) => (a.vehicle?.id || '').localeCompare(b.vehicle?.id || ''))
      .map((r) => {
        const vId = r.vehicle?.id || 'unknown-v';
        const dist = Number(r.totalDistanceKm || 0).toFixed(2);
        const dur = Number(r.totalDurationMinutes || 0).toFixed(2);
        const load = Number(r.totalAssignedLoadKg || 0).toFixed(2);
        const stops = (r.stops || [])
          .map((s) => `${s.stopIndex}:${s.order?.id || 'unknown-order'}`)
          .join(',');
        return `${vId}[dist:${dist},dur:${dur},load:${load},stops:(${stops})]`;
      })
      .join(';');

    const sortedUnassigned = [...(optimizationResult.unassignedOrders || [])]
      .sort((a, b) => (a.order?.id || '').localeCompare(b.order?.id || ''))
      .map((u) => `${u.order?.id || 'unknown'}:${(u.reason || 'unassigned').trim()}`)
      .join(',');

    const metricsSummary = [
      `dist:${Number(optimizationResult.totalDistanceKm || 0).toFixed(2)}`,
      `dur:${Number(optimizationResult.totalDurationMinutes || 0).toFixed(2)}`,
      `assigned:${optimizationResult.totalAssignedOrders || 0}`,
      `unassigned:${optimizationResult.totalUnassignedOrders || 0}`,
      `vehicles:${optimizationResult.vehiclesUsedCount || 0}`,
      `load:${Number(optimizationResult.totalFleetLoadKg || 0).toFixed(2)}`,
      `feasible:${Boolean(optimizationResult.isFeasible)}`,
    ].join(',');

    optSummary = `routes:{${sortedRoutes}}#unassigned:{${sortedUnassigned}}#metrics:{${metricsSummary}}`;
  }

  const raw = `orders:{${ordersSummary}}#vehicles:{${vehiclesSummary}}#opt:{${optSummary}}`;

  // 4. Deterministic 64-bit FNV-1a hash producing 16-hex characters
  let h1 = 0x811c9dc5;
  let h2 = 0x84222325;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x5bd1e995);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `fp-${part1}${part2}`;
}

/**
 * Prepares a clean, sanitized analysis payload for Gemini.
 * Strictly strips customer phone numbers, personal notes, and unnecessary PII.
 * All metrics are calculated deterministically in app code.
 */
export function buildSanitizedAnalysisPayload(
  orders: DeliveryOrder[],
  vehicles: Vehicle[],
  optimizationResult: OptimizationResult | null
): SanitizedAnalysisPayload {
  const dataFingerprint = computeDataFingerprint(orders, vehicles, optimizationResult);

  const eligibleOrders = orders.filter(
    (o) => o.status !== 'cancelled' && o.status !== 'delivered'
  );
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

  const availableVehicles = vehicles.filter((v) => v.status === 'Available');
  const onRouteVehicles = vehicles.filter((v) => v.status === 'On Route');
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'Maintenance');
  const offlineVehicles = vehicles.filter((v) => v.status === 'Offline');

  const totalFleetCapacityKg = vehicles.reduce((sum, v) => sum + (v.capacityKg || 0), 0);

  // If optimization has been run:
  if (optimizationResult) {
    const totalAssignedLoadKg = optimizationResult.totalFleetLoadKg;
    const fleetUtilizationPercent =
      totalFleetCapacityKg > 0 ? Math.round((totalAssignedLoadKg / totalFleetCapacityKg) * 100) : 0;

    // Collect deadline risks
    const deadlineRisks: SanitizedAnalysisPayload['deadlineRisks'] = [];
    optimizationResult.routes.forEach((r) => {
      r.stops.forEach((s) => {
        if (s.isDeadlineMissed) {
          deadlineRisks.push({
            orderId: s.order.id,
            vehicleId: r.vehicle.id,
            deadline: s.deadlineString,
            estimatedArrival: s.estimatedArrival,
            discrepancyMinutes: s.deadlineDiscrepancyMinutes || 0,
          });
        }
      });
    });

    return {
      timestamp: new Date().toISOString(),
      dataFingerprint,
      hasRunOptimization: true,
      metrics: {
        totalOrders: orders.length,
        eligibleOrders: eligibleOrders.length,
        deliveredOrders: deliveredOrders.length,
        cancelledOrders: cancelledOrders.length,
        assignedOrders: optimizationResult.totalAssignedOrders,
        unassignedOrders: optimizationResult.totalUnassignedOrders,
        totalVehicles: vehicles.length,
        availableVehicles: availableVehicles.length,
        onRouteVehicles: onRouteVehicles.length,
        maintenanceVehicles: maintenanceVehicles.length,
        offlineVehicles: offlineVehicles.length,
        vehiclesUtilizedInPlan: optimizationResult.vehiclesUsedCount,
        totalAssignedLoadKg,
        totalFleetCapacityKg,
        fleetUtilizationPercent,
        totalEstimatedDistanceKm: optimizationResult.totalDistanceKm,
        totalDurationMinutes: optimizationResult.totalDurationMinutes,
        deadlineWarningsCount: deadlineRisks.length,
      },
      vehicles: vehicles.map((v) => {
        const route = optimizationResult.routes.find((r) => r.vehicle.id === v.id);
        return {
          id: v.id,
          type: v.vehicleType,
          capacityKg: v.capacityKg,
          status: v.status,
          assignedStopsCount: route ? route.stops.length : 0,
          assignedLoadKg: route ? route.totalAssignedLoadKg : 0,
          utilizationPercent: route ? route.capacityUtilizationPercent : 0,
          driverName: v.driverName,
          depot: v.currentDepot,
        };
      }),
      routes: optimizationResult.routes
        .filter((r) => r.stops.length > 0)
        .map((r) => ({
          vehicleId: r.vehicle.id,
          stopsCount: r.stops.length,
          totalDistanceKm: r.totalDistanceKm,
          totalDurationMinutes: r.totalDurationMinutes,
          assignedLoadKg: r.totalAssignedLoadKg,
          capacityUtilizationPercent: r.capacityUtilizationPercent,
          deadlineWarningsCount: r.deadlineWarningsCount,
          stops: r.stops.map((s) => ({
            orderId: s.order.id,
            stopIndex: s.stopIndex,
            weightKg: s.order.weightKg,
            priority: s.order.priority,
            deadline: s.deadlineString,
            estimatedArrival: s.estimatedArrival,
            isLate: s.isDeadlineMissed,
            discrepancyMinutes: s.deadlineDiscrepancyMinutes,
          })),
        })),
      unassignedOrders: optimizationResult.unassignedOrders.map((u) => ({
        id: u.order.id,
        weightKg: u.order.weightKg,
        priority: u.order.priority,
        reason: u.reason,
        detail: u.detail,
      })),
      deadlineRisks,
      comparison: {
        hasBaseline: optimizationResult.comparison.hasValidBaseline,
        distanceSavedKm: optimizationResult.comparison.distanceSavedKm,
        distanceImprovementPercent: optimizationResult.comparison.distanceImprovementPercent,
        summaryNote: optimizationResult.comparison.baselineSummaryNote,
      },
      syntheticModelLimitations: SYNTHETIC_MODEL_DISCLOSURE,
    };
  }

  // Pre-optimization state
  const currentlyAssigned = eligibleOrders.filter((o) => !!o.assignedVehicleId);
  const unassigned = eligibleOrders.filter((o) => !o.assignedVehicleId);
  const currentAssignedLoad = currentlyAssigned.reduce((s, o) => s + (o.weightKg || 0), 0);

  return {
    timestamp: new Date().toISOString(),
    dataFingerprint,
    hasRunOptimization: false,
    metrics: {
      totalOrders: orders.length,
      eligibleOrders: eligibleOrders.length,
      deliveredOrders: deliveredOrders.length,
      cancelledOrders: cancelledOrders.length,
      assignedOrders: currentlyAssigned.length,
      unassignedOrders: unassigned.length,
      totalVehicles: vehicles.length,
      availableVehicles: availableVehicles.length,
      onRouteVehicles: onRouteVehicles.length,
      maintenanceVehicles: maintenanceVehicles.length,
      offlineVehicles: offlineVehicles.length,
      vehiclesUtilizedInPlan: 0,
      totalAssignedLoadKg: Number(currentAssignedLoad.toFixed(1)),
      totalFleetCapacityKg,
      fleetUtilizationPercent:
        totalFleetCapacityKg > 0 ? Math.round((currentAssignedLoad / totalFleetCapacityKg) * 100) : 0,
      totalEstimatedDistanceKm: 0,
      totalDurationMinutes: 0,
      deadlineWarningsCount: 0,
    },
    vehicles: vehicles.map((v) => ({
      id: v.id,
      type: v.vehicleType,
      capacityKg: v.capacityKg,
      status: v.status,
      assignedStopsCount: eligibleOrders.filter((o) => o.assignedVehicleId === v.id).length,
      assignedLoadKg: eligibleOrders
        .filter((o) => o.assignedVehicleId === v.id)
        .reduce((sum, o) => sum + (o.weightKg || 0), 0),
      utilizationPercent: 0,
      driverName: v.driverName,
      depot: v.currentDepot,
    })),
    routes: [],
    unassignedOrders: unassigned.map((o) => ({
      id: o.id,
      weightKg: o.weightKg,
      priority: o.priority,
      reason: 'No optimization run executed yet',
      detail: 'Order is awaiting heuristic route optimization in Module 4.',
    })),
    deadlineRisks: [],
    comparison: {
      hasBaseline: false,
      distanceSavedKm: 0,
      distanceImprovementPercent: 0,
      summaryNote: 'Route optimization has not been executed yet.',
    },
    syntheticModelLimitations: SYNTHETIC_MODEL_DISCLOSURE,
  };
}
