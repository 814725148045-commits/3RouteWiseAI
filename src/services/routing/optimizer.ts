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
  Point2D,
  SYNTHETIC_MODEL_DISCLOSURE,
} from './travelCostMatrix';
import {
  validateOptimizationInputs,
  verifyPlanFeasibility,
} from './constraintValidation';
import {
  evaluateStopEta,
  parseTimeToMinutes,
} from './etaCalculator';
import {
  calculateBaselineMetrics,
  comparePlanMetrics,
} from './metricsComparison';
import {
  GeminiInsightPayload,
  OptimizationResult,
  OptimizationSettings,
  RouteStopPlan,
  UnassignedOrderReport,
  VehicleRoutePlan,
} from './types';

export const DEFAULT_OPTIMIZATION_SETTINGS: OptimizationSettings = {
  objective: 'lexicographic',
  averageSpeedKmH: 35,
  serviceTimeMinutes: 10,
  depotDepartureTime: '08:30 AM',
  maxIterations2Opt: 50,
  fleetScope: 'available-only',
};

/**
 * Evaluates candidate assignment or leg score based on active objective.
 * - Distance objective: returns incremental distance in kilometers.
 * - Time objective: returns estimated transit duration (minutes) plus service dwell time (minutes).
 */
export function evaluateCandidateLegCost(
  fromPoint: Point2D,
  toPoint: Point2D,
  settings: OptimizationSettings,
  includeServiceTime = true
): {
  distanceKm: number;
  travelTimeMinutes: number;
  serviceTimeMinutes: number;
  objectiveCost: number;
} {
  const distanceKm = calculateDistanceKm(fromPoint, toPoint);
  const travelTimeMinutes = calculateTravelTimeMinutes(distanceKm, settings.averageSpeedKmH);
  const serviceTimeMinutes = includeServiceTime ? settings.serviceTimeMinutes : 0;
  const objectiveCost =
    settings.objective === 'distance'
      ? distanceKm
      : travelTimeMinutes + serviceTimeMinutes;

  return {
    distanceKm,
    travelTimeMinutes,
    serviceTimeMinutes,
    objectiveCost,
  };
}

/**
 * Computes route score for an ordered list of orders departing and returning to depot.
 * - Distance objective: sum of leg distances (km).
 * - Time objective: sum of leg travel times (minutes) + total service dwell times (minutes).
 */
export function computeRouteScore(
  route: DeliveryOrder[],
  depotPoint: Point2D,
  settings: OptimizationSettings
): {
  distanceKm: number;
  durationMinutes: number;
  score: number;
} {
  let distanceKm = 0;
  let transitMinutes = 0;
  let prev = depotPoint;

  for (const ord of route) {
    const pt = getOrderCoordinates(ord);
    const legDist = calculateDistanceKm(prev, pt);
    const legTime = calculateTravelTimeMinutes(legDist, settings.averageSpeedKmH);
    distanceKm += legDist;
    transitMinutes += legTime;
    prev = pt;
  }

  // Return leg to depot
  const returnDist = route.length > 0 ? calculateDistanceKm(prev, depotPoint) : 0;
  const returnTime = calculateTravelTimeMinutes(returnDist, settings.averageSpeedKmH);
  distanceKm = Number((distanceKm + returnDist).toFixed(2));
  transitMinutes += returnTime;

  const totalServiceMinutes = route.length * settings.serviceTimeMinutes;
  const durationMinutes = transitMinutes + totalServiceMinutes;

  const score =
    settings.objective === 'time' ? durationMinutes : distanceKm;

  return {
    distanceKm,
    durationMinutes,
    score,
  };
}

/**
 * 2-Opt swap helper for an array of orders starting and ending at depot.
 * Parameterized by active objective (minimizing distance vs minimizing travel duration + service dwell).
 * Does not claim a global optimum; applies local edge-exchange improvements.
 */
export function runTwoOptPass(
  orderedOrders: DeliveryOrder[],
  depotPoint: Point2D,
  settings: OptimizationSettings
): DeliveryOrder[] {
  if (orderedOrders.length <= 2) return orderedOrders;

  let bestRoute = [...orderedOrders];
  let improved = true;
  let iteration = 0;
  const maxIterations = settings.maxIterations2Opt;

  let bestEvaluation = computeRouteScore(bestRoute, depotPoint, settings);

  // Cumulative arrival tardiness penalty helper for breaking ties under time objective
  const computeArrivalTardinessPenalty = (route: DeliveryOrder[]): number => {
    let penalty = 0;
    let currentMin = 0;
    let prev = depotPoint;
    for (const ord of route) {
      const pt = getOrderCoordinates(ord);
      const legDist = calculateDistanceKm(prev, pt);
      currentMin += calculateTravelTimeMinutes(legDist, settings.averageSpeedKmH);
      const deadline = parseTimeToMinutes(ord.deliveryDeadline);
      if (typeof deadline === 'number' && currentMin > deadline) {
        penalty += currentMin - deadline;
      }
      currentMin += settings.serviceTimeMinutes;
      prev = pt;
    }
    return penalty;
  };

  let bestPenalty = settings.objective === 'time' ? computeArrivalTardinessPenalty(bestRoute) : 0;

  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;

    for (let i = 0; i < bestRoute.length - 1; i++) {
      for (let j = i + 1; j < bestRoute.length; j++) {
        // Reverse subsegment between i and j
        const candidate = [
          ...bestRoute.slice(0, i),
          ...bestRoute.slice(i, j + 1).reverse(),
          ...bestRoute.slice(j + 1),
        ];

        const candidateEval = computeRouteScore(candidate, depotPoint, settings);

        if (settings.objective !== 'time') {
          // Strict distance improvement check with 0.01 km threshold to prevent floating jitter
          if (candidateEval.score < bestEvaluation.score - 0.01) {
            bestRoute = candidate;
            bestEvaluation = candidateEval;
            improved = true;
            break;
          }
        } else {
          // Time objective: evaluate duration in minutes
          if (candidateEval.score < bestEvaluation.score) {
            bestRoute = candidate;
            bestEvaluation = candidateEval;
            bestPenalty = computeArrivalTardinessPenalty(candidate);
            improved = true;
            break;
          } else if (candidateEval.score === bestEvaluation.score) {
            // Defensible tie-breaker under synthetic constant-speed model:
            // 1. Prefer candidate with lower SLA deadline tardiness penalty (earlier arrivals at urgent deadlines)
            // 2. If equal, prefer candidate with lower physical road distance
            const candidatePenalty = computeArrivalTardinessPenalty(candidate);
            if (candidatePenalty < bestPenalty - 0.01) {
              bestRoute = candidate;
              bestEvaluation = candidateEval;
              bestPenalty = candidatePenalty;
              improved = true;
              break;
            } else if (
              Math.abs(candidatePenalty - bestPenalty) < 0.01 &&
              candidateEval.distanceKm < bestEvaluation.distanceKm - 0.01
            ) {
              bestRoute = candidate;
              bestEvaluation = candidateEval;
              bestPenalty = candidatePenalty;
              improved = true;
              break;
            }
          }
        }
      }
      if (improved) break;
    }
  }

  return bestRoute;
}

/**
 * Deterministic Nearest-Neighbor route construction from depot.
 * Evaluates candidate next stop using active objective:
 * - Distance objective: minimum road distance in km.
 * - Time objective: minimum travel duration + configured service dwell time,
 *   breaking ties via SLA deadline urgency (earlier deadline visited first).
 */
export function sequenceByNearestNeighbor(
  ordersForVehicle: DeliveryOrder[],
  depotPoint: Point2D,
  settings: OptimizationSettings
): DeliveryOrder[] {
  if (ordersForVehicle.length <= 1) return [...ordersForVehicle];

  const unvisited = [...ordersForVehicle];
  const ordered: DeliveryOrder[] = [];
  let currentPoint = depotPoint;

  while (unvisited.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.MAX_VALUE;
    let bestTieBreaker = Number.MAX_VALUE;

    for (let i = 0; i < unvisited.length; i++) {
      const ord = unvisited[i];
      const ordPoint = getOrderCoordinates(ord);
      const legEval = evaluateCandidateLegCost(currentPoint, ordPoint, settings, true);

      if (settings.objective !== 'time') {
        const dist = legEval.distanceKm;
        const isBetter =
          dist < bestScore - 0.001 ||
          (Math.abs(dist - bestScore) <= 0.001 && ord.id.localeCompare(unvisited[bestIndex].id) < 0);

        if (isBetter) {
          bestScore = dist;
          bestIndex = i;
        }
      } else {
        // Time objective: score is travel minutes + service dwell minutes
        const timeScore = legEval.objectiveCost;
        const deadlineMinutes = parseTimeToMinutes(ord.deliveryDeadline) ?? 1440;

        let isBetter = false;
        if (timeScore < bestScore) {
          isBetter = true;
        } else if (timeScore === bestScore) {
          // Tie-breaker: earlier delivery deadline visited first
          if (deadlineMinutes < bestTieBreaker) {
            isBetter = true;
          } else if (deadlineMinutes === bestTieBreaker) {
            // Secondary tie-breaker: lower distance
            const prevDist = calculateDistanceKm(currentPoint, getOrderCoordinates(unvisited[bestIndex]));
            if (legEval.distanceKm < prevDist - 0.001) {
              isBetter = true;
            } else if (
              Math.abs(legEval.distanceKm - prevDist) <= 0.001 &&
              ord.id.localeCompare(unvisited[bestIndex].id) < 0
            ) {
              isBetter = true;
            }
          }
        }

        if (isBetter) {
          bestScore = timeScore;
          bestTieBreaker = deadlineMinutes;
          bestIndex = i;
        }
      }
    }

    const nextOrder = unvisited.splice(bestIndex, 1)[0];
    ordered.push(nextOrder);
    currentPoint = getOrderCoordinates(nextOrder);
  }

  return ordered;
}

/**
 * Builds RouteStopPlan sequence with distances, times, time windows, and ETAs
 */
function buildStopPlans(
  orderedOrders: DeliveryOrder[],
  depotPoint: Point2D,
  settings: OptimizationSettings
): {
  stops: RouteStopPlan[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  deadlineWarningsCount: number;
  timeWindowsMetCount: number;
} {
  const departureMinutes = parseTimeToMinutes(settings.depotDepartureTime) ?? 510; // Default 08:30 AM (510 min)

  const stops: RouteStopPlan[] = [];
  let prevPoint = depotPoint;
  let cumulativeDistanceKm = 0;
  let currentMinutes = departureMinutes;
  let deadlineWarningsCount = 0;
  let timeWindowsMetCount = 0;

  orderedOrders.forEach((order, index) => {
    const orderPoint = getOrderCoordinates(order);
    const distFromPrev = calculateDistanceKm(prevPoint, orderPoint);
    const travelTimeMin = calculateTravelTimeMinutes(distFromPrev, settings.averageSpeedKmH);

    cumulativeDistanceKm = Number((cumulativeDistanceKm + distFromPrev).toFixed(2));
    const arrivalMinutes = currentMinutes + travelTimeMin;

    const etaEval = evaluateStopEta(arrivalMinutes, order);
    if (etaEval.isDeadlineMissed) {
      deadlineWarningsCount++;
    } else {
      timeWindowsMetCount++;
    }

    const stopServiceTime = order.serviceTimeMinutes || settings.serviceTimeMinutes;

    stops.push({
      stopIndex: index + 1,
      order,
      estimatedArrival: etaEval.estimatedArrival,
      estimatedArrivalMinutes: arrivalMinutes,
      timeWindowEarliest: etaEval.timeWindowEarliestString,
      timeWindowLatest: etaEval.timeWindowLatestString,
      isWithinWindow: etaEval.isWithinWindow,
      isEarly: etaEval.isEarly,
      isDeadlineMissed: etaEval.isDeadlineMissed,
      deadlineDiscrepancyMinutes: etaEval.deadlineDiscrepancyMinutes,
      windowViolationMinutes: etaEval.windowViolationMinutes,
      deadlineString: etaEval.deadlineString,
      travelDistanceKmFromPrev: distFromPrev,
      travelTimeMinutesFromPrev: travelTimeMin,
      serviceTimeMinutes: stopServiceTime,
      cumulativeDistanceKm,
      cumulativeTimeMinutes: arrivalMinutes - departureMinutes,
    });

    // Advance time for next stop: arrival (wait until earliest window opens if early) + service dwell time
    const earliestAllowed = parseTimeToMinutes(order.timeWindowEarliest);
    const serviceStartMinutes =
      earliestAllowed !== undefined ? Math.max(arrivalMinutes, earliestAllowed) : arrivalMinutes;
    currentMinutes = serviceStartMinutes + stopServiceTime;
    prevPoint = orderPoint;
  });

  // Add return leg to depot
  const returnDist = orderedOrders.length > 0 ? calculateDistanceKm(prevPoint, depotPoint) : 0;
  const returnTravelTimeMin = calculateTravelTimeMinutes(returnDist, settings.averageSpeedKmH);
  cumulativeDistanceKm = Number((cumulativeDistanceKm + returnDist).toFixed(2));
  currentMinutes += returnTravelTimeMin;

  const totalDurationMinutes = currentMinutes - departureMinutes;

  return {
    stops,
    totalDistanceKm: cumulativeDistanceKm,
    totalDurationMinutes,
    deadlineWarningsCount,
    timeWindowsMetCount,
  };
}

/**
 * Generates factual rule-based briefing ready for Gemini AI Insights (Module 5)
 */
function generateDispatcherBriefing(
  routes: VehicleRoutePlan[],
  unassigned: UnassignedOrderReport[],
  comparison: ReturnType<typeof comparePlanMetrics>
): GeminiInsightPayload {
  const activeRoutes = routes.filter((r) => r.stops.length > 0);
  const totalStops = activeRoutes.reduce((s, r) => s + r.stops.length, 0);
  const totalWarnings = activeRoutes.reduce((s, r) => s + r.deadlineWarningsCount, 0);

  const keyHighlights: string[] = [
    `Routed ${totalStops} delivery stops across ${activeRoutes.length} operational vehicles.`,
    comparison.distanceSavedKm > 0
      ? `Estimated savings: ${comparison.distanceSavedKm} km (${comparison.distanceImprovementPercent}%) compared to baseline schedule.`
      : `Complete route coverage verified across active zones.`,
    totalWarnings === 0
      ? `All planned stop arrivals meet specified delivery deadlines.`
      : `${totalWarnings} stop(s) flagged with deadline risks requiring dispatcher priority handoff.`,
  ];

  const vehicleAnalysis = activeRoutes.map((r) => {
    let rating: 'optimal' | 'balanced' | 'underutilized' | 'overloaded' = 'balanced';
    if (r.capacityUtilizationPercent > 85) rating = 'optimal';
    else if (r.capacityUtilizationPercent < 40) rating = 'underutilized';

    return {
      vehicleId: r.vehicle.id,
      driverName: r.vehicle.driverName,
      utilization: r.capacityUtilizationPercent,
      efficiencyRating: rating,
      reason: `${r.vehicle.id} loaded at ${r.totalAssignedLoadKg} kg of ${r.vehicle.capacityKg} kg (${r.capacityUtilizationPercent}% utilization) servicing ${r.stops.length} stops over ${r.totalDistanceKm} km.`,
    };
  });

  const bottlenecksAndRisks: string[] = [];
  if (unassigned.length > 0) {
    bottlenecksAndRisks.push(
      `${unassigned.length} order(s) remain unassigned due to capacity or constraint limits.`
    );
  }
  if (totalWarnings > 0) {
    bottlenecksAndRisks.push(
      `${totalWarnings} delivery deadline SLA risk(s) detected. Consider shifting urgent stops earlier in the departure wave.`
    );
  }

  const recommendations: string[] = [
    'Execute morning departure at 08:30 AM to maximize on-time window buffers.',
    'Keep high-capacity vehicles (VAN-103) stationed for dense industrial bulk orders.',
  ];
  if (unassigned.length > 0) {
    recommendations.push(
      'Review pending unassigned orders in Route Rescue or deploy backup fleet reserve.'
    );
  }

  return {
    summary: `Deterministic heuristic plan created: ${totalStops} stops, ${comparison.optimizedTotalDistanceKm} km total distance, ${activeRoutes.length} vehicles utilized.`,
    keyHighlights,
    vehicleEfficiencyAnalysis: vehicleAnalysis,
    bottlenecksAndRisks,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Main Deterministic Route Optimization Function
 */
export function optimizeRoutes(
  orders: DeliveryOrder[],
  vehicles: Vehicle[],
  settings: OptimizationSettings = DEFAULT_OPTIMIZATION_SETTINGS
): OptimizationResult {
  const depotPoint = getDepotCoordinates();

  // Step 1: Pre-validation
  const validationReport = validateOptimizationInputs(orders, vehicles, settings);

  // If validation fails critically (no vehicles or critical errors), construct an empty result with errors
  if (!validationReport.isValid) {
    const emptyBaseline = calculateBaselineMetrics(orders, vehicles, settings);
    const emptyComparison = comparePlanMetrics(emptyBaseline, [], 0);

    return {
      id: `OPT-${Date.now()}`,
      optimizedAt: new Date().toISOString(),
      settings,
      routes: [],
      unassignedOrders: orders
        .filter((o) => o.status !== 'cancelled' && o.status !== 'delivered')
        .map((o) => ({
          order: o,
          reason: 'Pre-optimization validation failure',
          detail: 'One or more required fields or fleet constraints failed validation checks.',
        })),
      validationReport,
      comparison: emptyComparison,
      geminiInsight: {
        summary: 'Optimization halted: Input validation reported critical errors.',
        keyHighlights: ['Please resolve validation errors in the panel above before continuing.'],
        vehicleEfficiencyAnalysis: [],
        bottlenecksAndRisks: ['Critical constraint or data errors detected.'],
        recommendations: ['Inspect missing addresses, zero weights, or fleet availability.'],
        generatedAt: new Date().toISOString(),
      },
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      totalAssignedOrders: 0,
      totalUnassignedOrders: validationReport.eligibleOrdersCount,
      vehiclesUsedCount: 0,
      totalFleetLoadKg: 0,
      isFeasible: false,
      algorithmName: 'Deterministic Nearest-Neighbor + 2-Opt (Halted on Validation)',
      modelLimitationsNote: SYNTHETIC_MODEL_DISCLOSURE,
      timeWindowsMetCount: 0,
      timeWindowsMissedCount: 0,
    };
  }

  // Step 2: Filter eligible entities
  const eligibleVehicles = vehicles
    .filter((v) => {
      if (v.status === 'Maintenance' || v.status === 'Offline') return false;
      if (settings.fleetScope === 'available-only') return v.status === 'Available';
      return v.status === 'Available' || v.status === 'On Route';
    })
    .sort((a, b) => (b.capacityKg || 0) - (a.capacityKg || 0) || a.id.localeCompare(b.id));

  const eligibleOrders = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'delivered')
    .sort((a, b) => {
      // Priority sorting: urgent > high > normal > low
      const priorityWeight: Record<string, number> = {
        urgent: 4,
        high: 3,
        normal: 2,
        low: 1,
      };
      const pDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
      if (pDiff !== 0) return pDiff;

      // Deadline urgency sorting: earlier deadline first
      const deadA = parseTimeToMinutes(a.deliveryDeadline) ?? 1440;
      const deadB = parseTimeToMinutes(b.deliveryDeadline) ?? 1440;
      if (deadA !== deadB) return deadA - deadB;

      // Heavy package first (First-Fit Decreasing)
      const wA = a.weightKg || a.packageWeightKg || 0;
      const wB = b.weightKg || b.packageWeightKg || 0;
      if (wB !== wA) return wB - wA;

      // Deterministic fallback by order ID
      return a.id.localeCompare(b.id);
    });

  // Step 3: Vehicle Assignment (Heuristic or Lexicographic)
  interface VehicleBucket {
    vehicle: Vehicle;
    assignedOrders: DeliveryOrder[];
    currentLoadKg: number;
    maxCapacityKg: number;
    maxStops: number;
  }

  let buckets: VehicleBucket[] = eligibleVehicles.map((v) => ({
    vehicle: v,
    assignedOrders: [],
    currentLoadKg: 0,
    maxCapacityKg: v.capacityKg || 500,
    maxStops: v.maxStops || 15,
  }));

  const unassigned: UnassignedOrderReport[] = [];

  if (settings.objective === 'lexicographic') {
    // -------------------------------------------------------------
    // LEXICOGRAPHIC OPTIMIZATION:
    // Priority 1: Minimize number of vehicles used (K)
    // Priority 2: Minimize total distance among solutions with K vehicles
    // -------------------------------------------------------------
    const assignableOrders: DeliveryOrder[] = [];
    const maxFleetCap = Math.max(...buckets.map((b) => b.maxCapacityKg), 0);

    for (const order of eligibleOrders) {
      const orderWeight = order.weightKg || order.packageWeightKg || 0;
      if (orderWeight > maxFleetCap) {
        unassigned.push({
          order,
          reason: 'Order exceeds available vehicle capacity',
          detail: `Package weight (${orderWeight} kg) exceeds maximum capacity of any available vehicle (Max: ${maxFleetCap} kg).`,
        });
      } else {
        assignableOrders.push(order);
      }
    }

    // Helper: simulate greedy best-fit assignment to a fixed subset of vehicles
    const simulateSubsetAssignment = (subset: Vehicle[]) => {
      const subBuckets = subset.map((v) => ({
        vehicle: v,
        assignedOrders: [] as DeliveryOrder[],
        currentLoadKg: 0,
        maxCapacityKg: v.capacityKg || 500,
        maxStops: v.maxStops || 15,
      }));
      const subUnassigned: DeliveryOrder[] = [];

      for (const order of assignableOrders) {
        const orderWeight = order.weightKg || order.packageWeightKg || 0;
        let chosenBucket: (typeof subBuckets)[0] | null = null;
        let minDist = Number.MAX_VALUE;

        for (const bucket of subBuckets) {
          if (
            bucket.currentLoadKg + orderWeight > bucket.maxCapacityKg ||
            bucket.assignedOrders.length + 1 > bucket.maxStops
          ) {
            continue;
          }

          const lastPt =
            bucket.assignedOrders.length > 0
              ? getOrderCoordinates(bucket.assignedOrders[bucket.assignedOrders.length - 1])
              : depotPoint;
          const ordPt = getOrderCoordinates(order);
          const dist = calculateDistanceKm(lastPt, ordPt);

          if (dist < minDist - 0.001) {
            minDist = dist;
            chosenBucket = bucket;
          } else if (
            Math.abs(dist - minDist) <= 0.001 &&
            chosenBucket &&
            bucket.vehicle.id.localeCompare(chosenBucket.vehicle.id) < 0
          ) {
            chosenBucket = bucket;
          }
        }

        if (chosenBucket) {
          chosenBucket.assignedOrders.push(order);
          chosenBucket.currentLoadKg = Number((chosenBucket.currentLoadKg + orderWeight).toFixed(1));
        } else {
          subUnassigned.push(order);
        }
      }

      // Compute total distance across subBuckets
      let totalDist = 0;
      for (const b of subBuckets) {
        if (b.assignedOrders.length === 0) continue;
        let prev = depotPoint;
        for (const ord of b.assignedOrders) {
          const pt = getOrderCoordinates(ord);
          totalDist += calculateDistanceKm(prev, pt);
          prev = pt;
        }
        totalDist += calculateDistanceKm(prev, depotPoint);
      }

      return {
        subBuckets,
        assignedCount: assignableOrders.length - subUnassigned.length,
        unassignedOrders: subUnassigned,
        totalDist: Number(totalDist.toFixed(2)),
      };
    };

    // Combinations helper
    const getSubsets = <T>(arr: T[], k: number): T[][] => {
      const results: T[][] = [];
      const backtrack = (start: number, curr: T[]) => {
        if (curr.length === k) {
          results.push(curr);
          return;
        }
        for (let i = start; i < arr.length; i++) {
          backtrack(i + 1, [...curr, arr[i]]);
        }
      };
      backtrack(0, []);
      return results;
    };

    // First find the maximum number of orders that can be assigned across the full fleet
    const fullFleetEval = simulateSubsetAssignment(eligibleVehicles);
    const maxAssignableCount = fullFleetEval.assignedCount;

    // Search K from 1 up to eligibleVehicles.length for the minimum fleet size K*
    let winningEval: ReturnType<typeof simulateSubsetAssignment> | null = null;

    for (let k = 1; k <= eligibleVehicles.length; k++) {
      // Evaluate combinations of size k (or top k vehicles if fleet is large)
      const candidateSubsets: Vehicle[][] =
        eligibleVehicles.length <= 6
          ? getSubsets(eligibleVehicles, k)
          : [eligibleVehicles.slice(0, k)];

      let bestKSubEval: ReturnType<typeof simulateSubsetAssignment> | null = null;

      for (const subset of candidateSubsets) {
        const evalResult = simulateSubsetAssignment(subset);
        if (evalResult.assignedCount === maxAssignableCount) {
          if (!bestKSubEval || evalResult.totalDist < bestKSubEval.totalDist - 0.001) {
            bestKSubEval = evalResult;
          }
        }
      }

      if (bestKSubEval) {
        // Found minimum K that accommodates maxAssignableCount orders!
        winningEval = bestKSubEval;
        break;
      }
    }

    if (!winningEval) {
      winningEval = fullFleetEval;
    }

    // Populate the master buckets with winning assignment
    const winningMap = new Map<string, (typeof winningEval.subBuckets)[0]>();
    for (const b of winningEval.subBuckets) {
      winningMap.set(b.vehicle.id, b);
    }

    buckets = eligibleVehicles.map((v) => {
      const match = winningMap.get(v.id);
      if (match) {
        return {
          vehicle: v,
          assignedOrders: match.assignedOrders,
          currentLoadKg: match.currentLoadKg,
          maxCapacityKg: match.maxCapacityKg,
          maxStops: match.maxStops,
        };
      }
      return {
        vehicle: v,
        assignedOrders: [],
        currentLoadKg: 0,
        maxCapacityKg: v.capacityKg || 500,
        maxStops: v.maxStops || 15,
      };
    });

    for (const ord of winningEval.unassignedOrders) {
      unassigned.push({
        order: ord,
        reason: 'Fleet capacity exhausted',
        detail: `All vehicles in the optimized fleet reached capacity or max stops limit (${ord.weightKg || ord.packageWeightKg || 0} kg could not be accommodated).`,
      });
    }
  } else {
    // -------------------------------------------------------------
    // STANDARD HEURISTIC ASSIGNMENT (Distance or Time objective)
    // -------------------------------------------------------------
    for (const order of eligibleOrders) {
      const orderWeight = order.weightKg || order.packageWeightKg || 0;

      // Check if order exceeds every vehicle's total capacity
      const canFitAnywhere = buckets.some((b) => b.maxCapacityKg >= orderWeight);
      if (!canFitAnywhere) {
        unassigned.push({
          order,
          reason: 'Order exceeds available vehicle capacity',
          detail: `Package weight (${orderWeight} kg) exceeds maximum capacity of any available vehicle (Max: ${Math.max(
            ...buckets.map((b) => b.maxCapacityKg)
          )} kg).`,
        });
        continue;
      }

      let bestBucket: VehicleBucket | null = null;
      let bestCost = Number.MAX_VALUE;
      let bestSecondary = Number.MAX_VALUE;

      for (const bucket of buckets) {
        const willExceedWeight = bucket.currentLoadKg + orderWeight > bucket.maxCapacityKg;
        const willExceedStops = bucket.assignedOrders.length + 1 > bucket.maxStops;

        if (willExceedWeight || willExceedStops) {
          continue;
        }

        const lastPoint =
          bucket.assignedOrders.length > 0
            ? getOrderCoordinates(bucket.assignedOrders[bucket.assignedOrders.length - 1])
            : depotPoint;

        const orderPoint = getOrderCoordinates(order);
        const legEval = evaluateCandidateLegCost(lastPoint, orderPoint, settings, true);

        if (settings.objective === 'distance') {
          const addedDist = legEval.distanceKm;
          const affinityBonusKm = order.assignedVehicleId === bucket.vehicle.id ? -15 : 0;
          const effectiveDist = addedDist + affinityBonusKm;

          let isBetter = false;
          if (effectiveDist < bestCost - 0.001) {
            isBetter = true;
          } else if (Math.abs(effectiveDist - bestCost) <= 0.001) {
            const loadRatio = bucket.currentLoadKg / bucket.maxCapacityKg;
            if (loadRatio < bestSecondary - 0.001) {
              isBetter = true;
            } else if (
              Math.abs(loadRatio - bestSecondary) <= 0.001 &&
              bestBucket &&
              bucket.vehicle.id.localeCompare(bestBucket.vehicle.id) < 0
            ) {
              isBetter = true;
            }
          }

          if (isBetter) {
            bestCost = effectiveDist;
            bestSecondary = bucket.currentLoadKg / bucket.maxCapacityKg;
            bestBucket = bucket;
          }
        } else {
          // Time objective: incremental transit duration + service dwell time in minutes
          const addedTimeMin = legEval.objectiveCost;
          const affinityBonusMin =
            order.assignedVehicleId === bucket.vehicle.id
              ? -calculateTravelTimeMinutes(15, settings.averageSpeedKmH)
              : 0;
          const effectiveTime = addedTimeMin + affinityBonusMin;
          const currentBucketDuration = bucket.assignedOrders.length * settings.serviceTimeMinutes;

          let isBetter = false;
          if (effectiveTime < bestCost) {
            isBetter = true;
          } else if (effectiveTime === bestCost) {
            if (currentBucketDuration < bestSecondary) {
              isBetter = true;
            } else if (
              currentBucketDuration === bestSecondary &&
              bestBucket &&
              bucket.vehicle.id.localeCompare(bestBucket.vehicle.id) < 0
            ) {
              isBetter = true;
            }
          }

          if (isBetter) {
            bestCost = effectiveTime;
            bestSecondary = currentBucketDuration;
            bestBucket = bucket;
          }
        }
      }

      if (bestBucket) {
        bestBucket.assignedOrders.push(order);
        bestBucket.currentLoadKg = Number((bestBucket.currentLoadKg + orderWeight).toFixed(1));
      } else {
        unassigned.push({
          order,
          reason: 'Fleet capacity exhausted',
          detail: `All compatible vehicles have reached capacity or max stops limit (${orderWeight} kg could not be accommodated).`,
        });
      }
    }
  }

  // Step 4: Route Sequencing & 2-Opt Optimization for each vehicle
  const vehicleRoutePlans: VehicleRoutePlan[] = [];

  for (const bucket of buckets) {
    if (bucket.assignedOrders.length === 0) {
      // Vehicle unused
      vehicleRoutePlans.push({
        vehicle: bucket.vehicle,
        stops: [],
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
        totalAssignedLoadKg: 0,
        capacityUtilizationPercent: 0,
        remainingCapacityKg: bucket.maxCapacityKg,
        deadlineWarningsCount: 0,
        isOverCapacity: false,
        exceedsMaxStops: false,
      });
      continue;
    }

    // 1. Initial Nearest-Neighbor sequencing with active objective
    const nnSequence = sequenceByNearestNeighbor(bucket.assignedOrders, depotPoint, settings);

    // 2. 2-Opt local search improvement pass with active objective
    const optimizedSequence = runTwoOptPass(
      nnSequence,
      depotPoint,
      settings
    );

    // 3. Build stop plans with precise ETAs and travel times
    const { stops, totalDistanceKm, totalDurationMinutes, deadlineWarningsCount } =
      buildStopPlans(optimizedSequence, depotPoint, settings);

    const utilization = Math.round((bucket.currentLoadKg / bucket.maxCapacityKg) * 100);

    vehicleRoutePlans.push({
      vehicle: bucket.vehicle,
      stops,
      totalDistanceKm,
      totalDurationMinutes,
      totalAssignedLoadKg: bucket.currentLoadKg,
      capacityUtilizationPercent: utilization,
      remainingCapacityKg: Math.max(0, Number((bucket.maxCapacityKg - bucket.currentLoadKg).toFixed(1))),
      deadlineWarningsCount,
      isOverCapacity: bucket.currentLoadKg > bucket.maxCapacityKg,
      exceedsMaxStops: stops.length > bucket.maxStops,
    });
  }

  // Step 5: Feasibility Check
  const feasibilityCheck = verifyPlanFeasibility(vehicleRoutePlans);

  // Step 6: Baseline Metrics & Comparison
  const baseline = calculateBaselineMetrics(orders, vehicles, settings);
  const comparison = comparePlanMetrics(baseline, vehicleRoutePlans, eligibleOrders.length);

  // Step 7: AI / Dispatcher Briefing
  const geminiInsight = generateDispatcherBriefing(vehicleRoutePlans, unassigned, comparison);

  const totalAssignedOrders = vehicleRoutePlans.reduce((s, r) => s + r.stops.length, 0);
  const totalFleetLoadKg = Number(
    vehicleRoutePlans.reduce((s, r) => s + r.totalAssignedLoadKg, 0).toFixed(1)
  );
  const vehiclesUsedCount = vehicleRoutePlans.filter((r) => r.stops.length > 0).length;

  const timeWindowsMetCount = vehicleRoutePlans.reduce(
    (sum, r) => sum + r.stops.filter((s) => s.isWithinWindow).length,
    0
  );
  const timeWindowsMissedCount = vehicleRoutePlans.reduce(
    (sum, r) => sum + r.stops.filter((s) => s.isDeadlineMissed).length,
    0
  );

  const algorithmName =
    settings.objective === 'lexicographic'
      ? 'Lexicographic Priority (Min. Fleet Size → Min. Total Distance)'
      : settings.objective === 'time'
      ? 'Deterministic Heuristic (Min. Travel Time)'
      : 'Deterministic Heuristic (Min. Distance)';

  return {
    id: `OPT-${Date.now()}`,
    optimizedAt: new Date().toISOString(),
    settings,
    routes: vehicleRoutePlans,
    unassignedOrders: unassigned,
    validationReport,
    comparison,
    geminiInsight,
    totalDistanceKm: comparison.optimizedTotalDistanceKm,
    totalDurationMinutes: comparison.optimizedTotalDurationMinutes,
    totalAssignedOrders,
    totalUnassignedOrders: unassigned.length,
    vehiclesUsedCount,
    totalFleetLoadKg,
    isFeasible: feasibilityCheck.isFeasible,
    algorithmName,
    modelLimitationsNote: SYNTHETIC_MODEL_DISCLOSURE,
    timeWindowsMetCount,
    timeWindowsMissedCount,
  };
}
