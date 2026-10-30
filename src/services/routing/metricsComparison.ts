/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeliveryOrder, Vehicle } from '../../types';
import {
  calculateDistanceKm,
  calculateTravelTimeMinutes,
  getDepotCoordinates,
  getOrderCoordinates,
} from './travelCostMatrix';
import { evaluateStopEta, parseTimeToMinutes } from './etaCalculator';
import { OptimizationSettings, PlanComparisonMetrics, VehicleRoutePlan } from './types';

/**
 * Calculates baseline metrics from current orders and vehicle assignments before optimization.
 */
export function calculateBaselineMetrics(
  orders: DeliveryOrder[],
  vehicles: Vehicle[],
  settings: OptimizationSettings
): {
  totalDistanceKm: number;
  totalDurationMinutes: number;
  vehiclesUsed: number;
  ordersRouted: number;
  unassignedCount: number;
  hasValidBaseline: boolean;
  baselineSummaryNote: string;
  routedOrderIds: Set<string>;
  timeWindowMetCount: number;
  timeWindowMissedCount: number;
} {
  const depot = getDepotCoordinates();
  const eligibleOrders = orders.filter(
    (o) => o.status !== 'cancelled' && o.status !== 'delivered'
  );

  let totalDistanceKm = 0;
  let totalDurationMinutes = 0;
  let vehiclesUsed = 0;
  let ordersRouted = 0;
  let timeWindowMetCount = 0;
  let timeWindowMissedCount = 0;
  const routedOrderIds = new Set<string>();

  const departureMinutes = parseTimeToMinutes(settings.depotDepartureTime) ?? 510;

  for (const vehicle of vehicles) {
    if (vehicle.status === 'Maintenance' || vehicle.status === 'Offline') {
      continue;
    }

    const assignedOrders = eligibleOrders.filter(
      (o) => o.assignedVehicleId === vehicle.id
    );

    if (assignedOrders.length > 0) {
      vehiclesUsed += 1;
      ordersRouted += assignedOrders.length;

      // Calculate path from depot through existing order sequence and return to depot
      let prevPoint = depot;
      let routeDistanceKm = 0;
      let currentMinutes = departureMinutes;

      for (const order of assignedOrders) {
        routedOrderIds.add(order.id);
        const orderPoint = getOrderCoordinates(order);
        const dist = calculateDistanceKm(prevPoint, orderPoint);
        const transitMin = calculateTravelTimeMinutes(dist, settings.averageSpeedKmH);
        routeDistanceKm += dist;

        const arrivalMin = currentMinutes + transitMin;
        const eta = evaluateStopEta(arrivalMin, order);
        if (eta.isDeadlineMissed) {
          timeWindowMissedCount++;
        } else {
          timeWindowMetCount++;
        }

        const stopService = order.serviceTimeMinutes || settings.serviceTimeMinutes;
        currentMinutes = arrivalMin + stopService;
        prevPoint = orderPoint;
      }

      // Return leg to depot
      const returnDist = calculateDistanceKm(prevPoint, depot);
      routeDistanceKm += returnDist;
      totalDistanceKm += routeDistanceKm;

      const travelTimeMin = calculateTravelTimeMinutes(routeDistanceKm, settings.averageSpeedKmH);
      const serviceTimeMin = assignedOrders.reduce(
        (sum, o) => sum + (o.serviceTimeMinutes || settings.serviceTimeMinutes),
        0
      );
      totalDurationMinutes += travelTimeMin + serviceTimeMin;
    }
  }

  const unassignedCount = eligibleOrders.length - ordersRouted;
  const hasValidBaseline = ordersRouted > 0;

  let baselineSummaryNote = '';
  if (!hasValidBaseline) {
    baselineSummaryNote = 'No previous vehicle assignments detected in eligible orders.';
  } else if (unassignedCount > 0) {
    baselineSummaryNote = `Baseline reflects partial existing assignments (${ordersRouted} routed, ${unassignedCount} unassigned in pending queue).`;
  } else {
    baselineSummaryNote = `Baseline reflects current operational assignments (${ordersRouted} routed across ${vehiclesUsed} vehicles).`;
  }

  return {
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    totalDurationMinutes,
    vehiclesUsed,
    ordersRouted,
    unassignedCount,
    hasValidBaseline,
    baselineSummaryNote,
    routedOrderIds,
    timeWindowMetCount,
    timeWindowMissedCount,
  };
}

/**
 * Computes comparative metrics between baseline and optimized plan.
 * Honest accounting:
 * - Only claim distance savings when both plans cover the exact same delivery IDs and comparable constraints.
 * - If plans cover different deliveries, clearly disclose that the comparison is non-comparable.
 */
export function comparePlanMetrics(
  baseline: ReturnType<typeof calculateBaselineMetrics>,
  optimizedRoutes: VehicleRoutePlan[],
  totalEligibleOrders: number
): PlanComparisonMetrics {
  const optimizedTotalDistanceKm = Number(
    optimizedRoutes.reduce((sum, r) => sum + r.totalDistanceKm, 0).toFixed(1)
  );
  const optimizedTotalDurationMinutes = optimizedRoutes.reduce(
    (sum, r) => sum + r.totalDurationMinutes,
    0
  );
  const optimizedVehiclesUsed = optimizedRoutes.filter((r) => r.stops.length > 0).length;
  const optimizedOrdersRouted = optimizedRoutes.reduce(
    (sum, r) => sum + r.stops.length,
    0
  );
  const optimizedUnassignedCount = totalEligibleOrders - optimizedOrdersRouted;

  // Track optimized routed order IDs
  const optimizedOrderIds = new Set<string>();
  let optimizedTimeWindowMetCount = 0;
  let optimizedTimeWindowMissedCount = 0;

  for (const r of optimizedRoutes) {
    for (const stop of r.stops) {
      optimizedOrderIds.add(stop.order.id);
      if (stop.isDeadlineMissed) {
        optimizedTimeWindowMissedCount++;
      } else {
        optimizedTimeWindowMetCount++;
      }
    }
  }

  // Fair comparability check:
  // Both plans must cover the exact same set of delivery IDs!
  const isSameOrderSet =
    baseline.hasValidBaseline &&
    baseline.routedOrderIds.size === optimizedOrderIds.size &&
    [...baseline.routedOrderIds].every((id) => optimizedOrderIds.has(id));

  const isDirectlyComparable = isSameOrderSet;

  let comparabilityNote = '';
  let distanceSavedKm = 0;
  let distanceImprovementPercent = 0;
  let timeSavedMinutes = 0;
  let timeImprovementPercent = 0;

  if (!baseline.hasValidBaseline) {
    comparabilityNote = 'No previous baseline assignments exist for comparison.';
  } else if (!isDirectlyComparable) {
    comparabilityNote = `Non-comparable coverage: Baseline covers ${baseline.ordersRouted} orders while Optimized plan covers ${optimizedOrdersRouted} orders. Plans cover different delivery subsets; distance changes reflect expanded delivery coverage rather than like-for-like efficiency.`;
  } else {
    comparabilityNote = `Direct like-for-like comparison: Both plans cover the exact same ${optimizedOrdersRouted} deliveries under identical constraints.`;
    const rawDistanceSaved = baseline.totalDistanceKm - optimizedTotalDistanceKm;
    const rawTimeSaved = baseline.totalDurationMinutes - optimizedTotalDurationMinutes;

    distanceSavedKm = Number(rawDistanceSaved.toFixed(1));
    timeSavedMinutes = rawTimeSaved;

    if (baseline.totalDistanceKm > 0) {
      const rawPercent = (rawDistanceSaved / baseline.totalDistanceKm) * 100;
      distanceImprovementPercent = rawPercent > 0 ? Number(rawPercent.toFixed(1)) : 0;
    }
    if (baseline.totalDurationMinutes > 0) {
      const rawTimePercent = (rawTimeSaved / baseline.totalDurationMinutes) * 100;
      timeImprovementPercent = rawTimePercent > 0 ? Number(rawTimePercent.toFixed(1)) : 0;
    }
  }

  return {
    baselineTotalDistanceKm: baseline.totalDistanceKm,
    baselineTotalDurationMinutes: baseline.totalDurationMinutes,
    baselineVehiclesUsed: baseline.vehiclesUsed,
    baselineOrdersRouted: baseline.ordersRouted,
    baselineUnassignedCount: baseline.unassignedCount,
    baselineTimeWindowMetCount: baseline.timeWindowMetCount,
    baselineTimeWindowMissedCount: baseline.timeWindowMissedCount,

    optimizedTotalDistanceKm,
    optimizedTotalDurationMinutes,
    optimizedVehiclesUsed,
    optimizedOrdersRouted,
    optimizedUnassignedCount,
    optimizedTimeWindowMetCount,
    optimizedTimeWindowMissedCount,

    distanceSavedKm,
    distanceImprovementPercent,
    timeSavedMinutes,
    timeImprovementPercent,

    isDirectlyComparable,
    comparabilityNote,

    hasValidBaseline: baseline.hasValidBaseline,
    baselineSummaryNote: baseline.baselineSummaryNote,
  };
}
