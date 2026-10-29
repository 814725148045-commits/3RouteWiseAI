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
} {
  const depot = getDepotCoordinates();
  const eligibleOrders = orders.filter(
    (o) => o.status !== 'cancelled' && o.status !== 'delivered'
  );

  let totalDistanceKm = 0;
  let totalDurationMinutes = 0;
  let vehiclesUsed = 0;
  let ordersRouted = 0;

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

      for (const order of assignedOrders) {
        const orderPoint = getOrderCoordinates(order);
        const dist = calculateDistanceKm(prevPoint, orderPoint);
        routeDistanceKm += dist;
        prevPoint = orderPoint;
      }

      // Return leg to depot
      routeDistanceKm += calculateDistanceKm(prevPoint, depot);
      totalDistanceKm += routeDistanceKm;

      const travelTimeMin = calculateTravelTimeMinutes(routeDistanceKm, settings.averageSpeedKmH);
      const serviceTimeMin = assignedOrders.length * settings.serviceTimeMinutes;
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
  };
}

/**
 * Computes comparative metrics between baseline and optimized plan.
 * Honest accounting: Never report negative savings as positive improvement.
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

  const rawDistanceSaved = baseline.totalDistanceKm - optimizedTotalDistanceKm;
  const rawTimeSaved = baseline.totalDurationMinutes - optimizedTotalDurationMinutes;

  // Real calculated values; if optimized distance is greater (e.g. because it routes more pending orders),
  // distanceSavedKm will be reported accurately as 0 or the actual difference with clear context.
  const distanceSavedKm = Number(rawDistanceSaved.toFixed(1));
  const timeSavedMinutes = rawTimeSaved;

  let distanceImprovementPercent = 0;
  if (baseline.hasValidBaseline && baseline.totalDistanceKm > 0) {
    const rawPercent = (rawDistanceSaved / baseline.totalDistanceKm) * 100;
    // Cap strictly at positive improvement for display
    distanceImprovementPercent = rawPercent > 0 ? Number(rawPercent.toFixed(1)) : 0;
  }

  let timeImprovementPercent = 0;
  if (baseline.hasValidBaseline && baseline.totalDurationMinutes > 0) {
    const rawTimePercent = (rawTimeSaved / baseline.totalDurationMinutes) * 100;
    timeImprovementPercent = rawTimePercent > 0 ? Number(rawTimePercent.toFixed(1)) : 0;
  }

  return {
    baselineTotalDistanceKm: baseline.totalDistanceKm,
    baselineTotalDurationMinutes: baseline.totalDurationMinutes,
    baselineVehiclesUsed: baseline.vehiclesUsed,
    baselineOrdersRouted: baseline.ordersRouted,
    baselineUnassignedCount: baseline.unassignedCount,

    optimizedTotalDistanceKm,
    optimizedTotalDurationMinutes,
    optimizedVehiclesUsed,
    optimizedOrdersRouted,
    optimizedUnassignedCount,

    distanceSavedKm,
    distanceImprovementPercent,
    timeSavedMinutes,
    timeImprovementPercent,

    hasValidBaseline: baseline.hasValidBaseline,
    baselineSummaryNote: baseline.baselineSummaryNote,
  };
}
