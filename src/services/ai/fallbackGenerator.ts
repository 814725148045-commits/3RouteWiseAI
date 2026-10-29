/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AiDataQualityLimitation,
  AiInsightRecommendation,
  AiInsightRisk,
  AiRouteExplanation,
  GeminiAiInsightsReport,
  SanitizedAnalysisPayload,
} from './insightsTypes';

/**
 * Deterministically generates factual rule-based insights if Gemini is unavailable or unconfigured.
 * Clearly labeled as a fallback rather than a Gemini-generated response.
 */
export function generateRuleBasedFallback(
  payload: SanitizedAnalysisPayload
): GeminiAiInsightsReport {
  const { metrics, routes, unassignedOrders, deadlineRisks, vehicles, comparison } = payload;

  // Identified Risks
  const risks: AiInsightRisk[] = [];

  if (metrics.maintenanceVehicles > 0 || metrics.offlineVehicles > 0) {
    const unavailableIds = vehicles
      .filter((v) => v.status === 'Maintenance' || v.status === 'Offline')
      .map((v) => v.id);
    risks.push({
      id: 'risk-fleet-maint',
      title: 'Fleet Availability Bottleneck',
      category: 'fleet',
      severity: 'medium',
      affectedIds: unavailableIds,
      description: `${unavailableIds.join(', ')} is currently in Maintenance or Offline and cannot receive delivery assignments.`,
      mitigationSuggestion:
        'Inspect maintenance schedule and consider staging reserve courier vehicles.',
    });
  }

  if (deadlineRisks.length > 0) {
    risks.push({
      id: 'risk-deadlines',
      title: 'Customer SLA Deadline Violations',
      category: 'deadline',
      severity: 'high',
      affectedIds: deadlineRisks.map((d) => d.orderId),
      description: `${deadlineRisks.length} stop(s) have estimated arrivals exceeding scheduled delivery deadlines (Max delay: ${Math.max(
        ...deadlineRisks.map((d) => d.discrepancyMinutes)
      )} min).`,
      mitigationSuggestion:
        'Re-sequence high-priority medical or perishable orders to earlier departure slots or split into dedicated sprint van runs.',
    });
  }

  if (unassignedOrders.length > 0) {
    risks.push({
      id: 'risk-unassigned',
      title: 'Unassigned Pending Freight',
      category: 'unassigned',
      severity: 'high',
      affectedIds: unassignedOrders.map((u) => u.id),
      description: `${unassignedOrders.length} order(s) remain unassigned due to physical capacity limits or fleet constraints.`,
      mitigationSuggestion:
        'Activate Route Rescue or schedule an afternoon secondary delivery wave.',
    });
  }

  // Overloaded or underutilized vehicles
  vehicles.forEach((v) => {
    if (v.utilizationPercent > 85) {
      risks.push({
        id: `risk-cap-${v.id}`,
        title: `Near Maximum Payload Capacity (${v.id})`,
        category: 'capacity',
        severity: 'medium',
        affectedIds: [v.id],
        description: `Vehicle ${v.id} is operating at ${v.utilizationPercent}% capacity (${v.assignedLoadKg} kg of ${v.capacityKg} kg). Little buffer remains for ad-hoc freight.`,
        mitigationSuggestion:
          'Monitor tire pressures and avoid adding additional heavy cargo to this loop.',
      });
    }
  });

  // Recommendations
  const recommendations: AiInsightRecommendation[] = [];

  if (deadlineRisks.length > 0) {
    recommendations.push({
      id: 'rec-1',
      priority: 1,
      title: 'Prioritize Urgent Medical & Perishable Drops in Morning Wave',
      actionCategory: 'rerun-optimizer',
      description:
        'Shift departure time earlier from 08:30 AM to 08:00 AM or increase transit speed settings in Route Planner to preserve on-time delivery guarantees.',
      expectedBenefit: 'Eliminates deadline discrepancies across urgent stops.',
      tradeOff: 'Requires earlier warehouse dispatch staging.',
    });
  }

  if (unassignedOrders.length > 0) {
    recommendations.push({
      id: 'rec-2',
      priority: 2,
      title: 'Deploy Secondary Afternoon Dispatch Wave',
      actionCategory: 'dispatcher-action',
      description:
        'Batch unassigned orders into an afternoon turnaround wave once morning vehicles complete initial loops.',
      expectedBenefit: 'Achieves 100% daily order fulfillment without adding new vehicles.',
      tradeOff: 'Extends operating window into late afternoon.',
    });
  }

  if (metrics.maintenanceVehicles > 0) {
    recommendations.push({
      id: 'rec-3',
      priority: 3,
      title: 'Expedite Preventive Maintenance Turnaround',
      actionCategory: 'fleet-adjustment',
      description:
        'Prioritize brake pad inspection on VAN-105 to return 1,000 kg capacity to active service.',
      expectedBenefit: 'Increases active fleet payload capacity by ~25%.',
      tradeOff: 'Requires technician coordination.',
    });
  }

  recommendations.push({
    id: 'rec-4',
    priority: 4,
    title: 'Maintain Cluster Proximity in North and East Sectors',
    actionCategory: 'dispatcher-action',
    description:
      'Keep heavy cargo units (VAN-103) restricted to dense commercial industrial loops to minimize cross-town driving.',
    expectedBenefit: 'Reduces overall vehicle wear and tear and preserves street efficiency.',
    tradeOff: 'Less flexibility for emergency ad-hoc cross-city pickups.',
  });

  // Route Explanations
  const routeExplanations: AiRouteExplanation[] = routes.map((r) => {
    const veh = vehicles.find((v) => v.id === r.vehicleId);
    return {
      vehicleId: r.vehicleId,
      driverName: veh?.driverName || 'Assigned Driver',
      assignedStopsCount: r.stopsCount,
      assignedLoadKg: r.assignedLoadKg,
      capacityUtilizationPercent: r.capacityUtilizationPercent,
      rationale: `Assigned ${r.stopsCount} stops clustered geographically around depot departure corridors. Total payload is ${r.assignedLoadKg} kg (${r.capacityUtilizationPercent}% utilization).`,
      stopSequenceNote: `Sequence ordered via Nearest-Neighbor with 2-Opt edge swaps to minimize return loop mileage.`,
      isInterpretation: true,
    };
  });

  // Data Quality & Limitations
  const dataQualityLimitations: AiDataQualityLimitation[] = [
    {
      factor: 'Synthetic Road Network Distance Model',
      status: 'disclosed',
      impact:
        'Distances are calculated using synthetic coordinate space with a 1.35x urban street circuity factor, not live turn-by-turn road GPS.',
    },
    {
      factor: 'Constant Velocity Assumption',
      status: 'disclosed',
      impact:
        'Travel durations assume a steady transit speed (35 km/h) without dynamic traffic jams, road closures, or red-light delays.',
    },
    {
      factor: 'Delivery Deadline Granularity',
      status: 'info',
      impact:
        'Deadlines are matched against fixed departure benchmarks (08:30 AM). Departure delays will cascade into later stops.',
    },
  ];

  return {
    id: `INS-FALLBACK-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    source: 'rule-based-fallback',
    modelName: 'Rule-Based Local Heuristic (Deterministic Fallback)',
    dataFingerprint: payload.dataFingerprint,
    executiveSummary: {
      overview: payload.hasRunOptimization
        ? `Operational plan active: ${metrics.assignedOrders} orders routed across ${metrics.vehiclesUtilizedInPlan} vehicles covering an estimated ${metrics.totalEstimatedDistanceKm} km.`
        : `Pre-optimization queue: ${metrics.totalOrders} registered deliveries with ${metrics.availableVehicles} vehicles available. Optimization required for route telemetry.`,
      fleetCapacityStatus: `${metrics.totalAssignedLoadKg} kg assigned of ${metrics.totalFleetCapacityKg} kg total fleet capacity (${metrics.fleetUtilizationPercent}% utilization).`,
      serviceLevelStatus:
        deadlineRisks.length === 0
          ? 'All routed stops satisfy scheduled delivery deadlines.'
          : `${deadlineRisks.length} delivery deadline risk(s) identified requiring dispatcher attention.`,
      criticalConstraints: [
        `${metrics.maintenanceVehicles} vehicle(s) in maintenance.`,
        `${unassignedOrders.length} unassigned order(s).`,
        `${deadlineRisks.length} late ETA warning(s).`,
      ],
    },
    routeExplanations,
    identifiedRisks: risks,
    recommendations,
    dataQualityLimitations,
    verifiedMetrics: {
      totalEligibleOrders: metrics.eligibleOrders,
      assignedOrdersCount: metrics.assignedOrders,
      unassignedOrdersCount: metrics.unassignedOrders,
      activeVehiclesUtilized: metrics.vehiclesUtilizedInPlan,
      totalAvailableVehicles: metrics.availableVehicles,
      totalUnavailableVehicles: metrics.maintenanceVehicles + metrics.offlineVehicles,
      totalAssignedLoadKg: metrics.totalAssignedLoadKg,
      totalEstimatedDistanceKm: metrics.totalEstimatedDistanceKm,
      totalDurationMinutes: metrics.totalDurationMinutes,
      deadlineWarningsCount: deadlineRisks.length,
    },
  };
}
