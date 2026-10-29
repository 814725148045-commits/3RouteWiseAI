/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OptimizationResult } from './types';

/**
 * Downloads a structured JSON export of the route optimization plan.
 */
export function exportRoutePlanAsJson(result: OptimizationResult): void {
  try {
    const exportData = {
      system: 'RouteWise AI — Smart Delivery Planning System',
      module: 'Module 4: Route Optimization Engine',
      reportId: result.id,
      generatedAt: result.optimizedAt,
      algorithm: {
        name: result.algorithmName,
        classification: 'Deterministic Heuristic (Nearest-Neighbor Construction + 2-Opt Local Search)',
        guarantee: 'Feasible local heuristic solution. Not mathematically guaranteed global optimum.',
        limitations: result.modelLimitationsNote,
      },
      optimizationSettings: result.settings,
      executiveSummary: {
        vehiclesUsed: result.vehiclesUsedCount,
        totalOrdersAssigned: result.totalAssignedOrders,
        totalOrdersUnassigned: result.totalUnassignedOrders,
        totalEstimatedDistanceKm: result.totalDistanceKm,
        totalEstimatedDurationMinutes: result.totalDurationMinutes,
        totalCargoLoadKg: result.totalFleetLoadKg,
        isFeasible: result.isFeasible,
      },
      performanceComparison: result.comparison,
      geminiInsightBriefing: result.geminiInsight,
      vehicleRoutePlans: result.routes.map((r) => ({
        vehicleId: r.vehicle.id,
        registration: r.vehicle.registrationNumber,
        driver: r.vehicle.driverName,
        vehicleType: r.vehicle.vehicleType,
        fuelType: r.vehicle.fuelType,
        capacityKg: r.vehicle.capacityKg,
        assignedLoadKg: r.totalAssignedLoadKg,
        capacityUtilizationPercent: r.capacityUtilizationPercent,
        remainingCapacityKg: r.remainingCapacityKg,
        totalDistanceKm: r.totalDistanceKm,
        totalDurationMinutes: r.totalDurationMinutes,
        deadlineWarningsCount: r.deadlineWarningsCount,
        stopsCount: r.stops.length,
        orderedStops: r.stops.map((s) => ({
          stopIndex: s.stopIndex,
          orderId: s.order.id,
          customerName: s.order.customerName,
          destination: s.order.destination,
          packageWeightKg: s.order.weightKg,
          priority: s.order.priority,
          deliveryDeadline: s.deadlineString,
          estimatedArrival: s.estimatedArrival,
          isDeadlineMissed: s.isDeadlineMissed,
          deadlineDiscrepancyMinutes: s.deadlineDiscrepancyMinutes || 0,
          travelDistanceKmFromPrev: s.travelDistanceKmFromPrev,
          travelTimeMinutesFromPrev: s.travelTimeMinutesFromPrev,
          cumulativeDistanceKm: s.cumulativeDistanceKm,
        })),
      })),
      unassignedOrders: result.unassignedOrders.map((u) => ({
        orderId: u.order.id,
        customerName: u.order.customerName,
        destination: u.order.destination,
        weightKg: u.order.weightKg,
        priority: u.order.priority,
        reason: u.reason,
        detail: u.detail,
      })),
      validationSummary: {
        isValid: result.validationReport.isValid,
        errorsCount: result.validationReport.errors.length,
        warningsCount: result.validationReport.warnings.length,
        eligibleOrdersCount: result.validationReport.eligibleOrdersCount,
        excludedOrdersCount: result.validationReport.excludedOrdersCount,
      },
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `routewise-route-plan-${result.id}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export route plan JSON:', err);
    throw err;
  }
}
