/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeliveryOrder, Vehicle } from '../../types';

export type OptimizationObjective = 'distance' | 'time';

export type FleetScopeOption = 'operational' | 'available-only';

export interface OptimizationSettings {
  objective: OptimizationObjective;
  averageSpeedKmH: number; // e.g., 35 km/h (20 - 80)
  serviceTimeMinutes: number; // e.g., 10 min per stop (2 - 30)
  depotDepartureTime: string; // e.g., '08:30 AM'
  maxIterations2Opt: number; // e.g., 50
  fleetScope: FleetScopeOption; // 'operational' (Available + On Route) vs 'available-only'
}

export interface RouteStopPlan {
  stopIndex: number; // 1-based order on vehicle route
  order: DeliveryOrder;
  estimatedArrival: string; // Calculated ETA string (e.g. '09:18 AM')
  estimatedArrivalMinutes: number; // Minutes from day start
  travelDistanceKmFromPrev: number;
  travelTimeMinutesFromPrev: number;
  cumulativeDistanceKm: number;
  cumulativeTimeMinutes: number;
  isDeadlineMissed: boolean;
  deadlineDiscrepancyMinutes?: number; // Positive if late, negative if early
  deadlineString: string;
}

export interface VehicleRoutePlan {
  vehicle: Vehicle;
  stops: RouteStopPlan[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalAssignedLoadKg: number;
  capacityUtilizationPercent: number;
  remainingCapacityKg: number;
  deadlineWarningsCount: number;
  isOverCapacity: boolean;
  exceedsMaxStops: boolean;
}

export interface UnassignedOrderReport {
  order: DeliveryOrder;
  reason: string;
  detail: string;
}

export interface ValidationErrorItem {
  id: string;
  entityType: 'order' | 'vehicle';
  entityId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationReport {
  isValid: boolean;
  errors: ValidationErrorItem[];
  warnings: ValidationErrorItem[];
  eligibleOrdersCount: number;
  excludedOrdersCount: number; // Cancelled or Delivered
  eligibleVehiclesCount: number;
  excludedVehiclesCount: number; // Maintenance or Offline
}

export interface PlanComparisonMetrics {
  baselineTotalDistanceKm: number;
  baselineTotalDurationMinutes: number;
  baselineVehiclesUsed: number;
  baselineOrdersRouted: number;
  baselineUnassignedCount: number;

  optimizedTotalDistanceKm: number;
  optimizedTotalDurationMinutes: number;
  optimizedVehiclesUsed: number;
  optimizedOrdersRouted: number;
  optimizedUnassignedCount: number;

  distanceSavedKm: number;
  distanceImprovementPercent: number;
  timeSavedMinutes: number;
  timeImprovementPercent: number;

  hasValidBaseline: boolean;
  baselineSummaryNote: string;
}

export interface GeminiInsightPayload {
  summary: string;
  keyHighlights: string[];
  vehicleEfficiencyAnalysis: {
    vehicleId: string;
    driverName: string;
    utilization: number;
    efficiencyRating: 'optimal' | 'balanced' | 'underutilized' | 'overloaded';
    reason: string;
  }[];
  bottlenecksAndRisks: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface OptimizationResult {
  id: string;
  optimizedAt: string;
  settings: OptimizationSettings;
  routes: VehicleRoutePlan[];
  unassignedOrders: UnassignedOrderReport[];
  validationReport: ValidationReport;
  comparison: PlanComparisonMetrics;
  geminiInsight: GeminiInsightPayload;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalAssignedOrders: number;
  totalUnassignedOrders: number;
  vehiclesUsedCount: number;
  totalFleetLoadKg: number;
  isFeasible: boolean;
  algorithmName: string;
  modelLimitationsNote: string;
}
