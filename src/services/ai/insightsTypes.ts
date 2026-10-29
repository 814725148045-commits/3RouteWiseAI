/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RiskSeverity = 'high' | 'medium' | 'low';
export type RiskCategory = 'deadline' | 'capacity' | 'fleet' | 'unassigned' | 'quality';
export type ActionCategory = 'rerun-optimizer' | 'dispatcher-action' | 'fleet-adjustment';
export type InsightSource = 'gemini-flash' | 'rule-based-fallback';

export interface AiInsightRisk {
  id: string;
  title: string;
  category: RiskCategory;
  severity: RiskSeverity;
  affectedIds: string[]; // Order IDs or Vehicle IDs
  description: string;
  mitigationSuggestion: string;
}

export interface AiInsightRecommendation {
  id: string;
  priority: number; // 1 to 5
  title: string;
  actionCategory: ActionCategory;
  description: string;
  expectedBenefit: string;
  tradeOff: string;
}

export interface AiRouteExplanation {
  vehicleId: string;
  driverName: string;
  assignedStopsCount: number;
  assignedLoadKg: number;
  capacityUtilizationPercent: number;
  rationale: string;
  stopSequenceNote: string;
  isInterpretation: boolean; // Always true to reflect that this is an AI interpretation
}

export interface AiDataQualityLimitation {
  factor: string;
  status: 'disclosed' | 'attention' | 'info';
  impact: string;
}

export interface GeminiAiInsightsReport {
  id: string;
  generatedAt: string;
  source: InsightSource;
  modelName: string;
  dataFingerprint: string;
  isStale?: boolean;

  executiveSummary: {
    overview: string;
    fleetCapacityStatus: string;
    serviceLevelStatus: string;
    criticalConstraints: string[];
  };

  routeExplanations: AiRouteExplanation[];
  identifiedRisks: AiInsightRisk[];
  recommendations: AiInsightRecommendation[];
  dataQualityLimitations: AiDataQualityLimitation[];

  verifiedMetrics: {
    totalEligibleOrders: number;
    assignedOrdersCount: number;
    unassignedOrdersCount: number;
    activeVehiclesUtilized: number;
    totalAvailableVehicles: number;
    totalUnavailableVehicles: number;
    totalAssignedLoadKg: number;
    totalEstimatedDistanceKm: number;
    totalDurationMinutes: number;
    deadlineWarningsCount: number;
  };
}

export interface SanitizedAnalysisPayload {
  timestamp: string;
  dataFingerprint: string;
  hasRunOptimization: boolean;
  metrics: {
    totalOrders: number;
    eligibleOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    assignedOrders: number;
    unassignedOrders: number;
    totalVehicles: number;
    availableVehicles: number;
    onRouteVehicles: number;
    maintenanceVehicles: number;
    offlineVehicles: number;
    vehiclesUtilizedInPlan: number;
    totalAssignedLoadKg: number;
    totalFleetCapacityKg: number;
    fleetUtilizationPercent: number;
    totalEstimatedDistanceKm: number;
    totalDurationMinutes: number;
    deadlineWarningsCount: number;
  };
  vehicles: {
    id: string;
    type: string;
    capacityKg: number;
    status: string;
    assignedStopsCount: number;
    assignedLoadKg: number;
    utilizationPercent: number;
    driverName: string;
    depot: string;
  }[];
  routes: {
    vehicleId: string;
    stopsCount: number;
    totalDistanceKm: number;
    totalDurationMinutes: number;
    assignedLoadKg: number;
    capacityUtilizationPercent: number;
    deadlineWarningsCount: number;
    stops: {
      orderId: string;
      stopIndex: number;
      weightKg: number;
      priority: string;
      deadline: string;
      estimatedArrival: string;
      isLate: boolean;
      discrepancyMinutes?: number;
    }[];
  }[];
  unassignedOrders: {
    id: string;
    weightKg: number;
    priority: string;
    reason: string;
    detail: string;
  }[];
  deadlineRisks: {
    orderId: string;
    vehicleId: string;
    deadline: string;
    estimatedArrival: string;
    discrepancyMinutes: number;
  }[];
  comparison: {
    hasBaseline: boolean;
    distanceSavedKm: number;
    distanceImprovementPercent: number;
    summaryNote: string;
  };
  syntheticModelLimitations: string;
}
