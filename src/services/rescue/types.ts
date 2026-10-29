/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeliveryOrder, OrderStatus, Vehicle } from '../../types';
import { RouteStopPlan } from '../routing/types';

export type IncidentType = 'vehicle_breakdown' | 'urgent_delivery';
export type IncidentStatus = 'active' | 'resolved' | 'dismissed';
export type PlanApprovalStatus = 'Draft' | 'Awaiting Approval' | 'Applied' | 'Rejected' | 'Failed';

export interface DisruptionIncident {
  id: string; // e.g. 'INC-2026-001'
  type: IncidentType;
  title: string;
  description: string;
  createdAt: string; // ISO string
  status: IncidentStatus;
  
  // Specific to vehicle breakdown
  vehicleId?: string;
  breakdownLocation?: string;
  breakdownTime?: string;
  reason?: string;
  estimatedRepairTime?: string;
  additionalNotes?: string;
  
  // Specific to urgent delivery
  orderId?: string;
  
  // Affected Entities
  affectedOrderIds: string[];
  affectedVehicleIds: string[];
  
  // Associated Recovery Plan ID if calculated
  recoveryPlanId?: string;
}

export interface VehicleCapacityComparison {
  vehicleId: string;
  vehicleName: string;
  driverName: string;
  capacityKg: number;
  beforeLoadKg: number;
  afterLoadKg: number;
  beforeUtilizationPercent: number;
  afterUtilizationPercent: number;
  beforeStopsCount: number;
  afterStopsCount: number;
  status: string;
}

export interface RecoveryMetricsComparison {
  beforeAssignedOrders: number;
  afterAssignedOrders: number;
  beforeUnassignedOrders: number;
  afterUnassignedOrders: number;
  beforeTotalDistanceKm: number;
  afterTotalDistanceKm: number;
  distanceDeltaKm: number; // positive = increased, negative = reduced
  beforeTotalDurationMinutes: number;
  afterTotalDurationMinutes: number;
  durationDeltaMinutes: number;
  beforeDeadlineWarnings: number;
  afterDeadlineWarnings: number;
  affectedVehiclesCount: number;
  affectedOrdersCount: number;
  vehicleCapacityUtilizations: VehicleCapacityComparison[];
}

export interface ProposedStopAssignment {
  orderId: string;
  customerName: string;
  destination: string;
  weightKg: number;
  priority: string;
  deadline: string;
  assignedVehicleId: string;
  stopIndex: number;
  estimatedArrival: string;
  isLate: boolean;
  discrepancyMinutes?: number;
}

export interface ProposedUnassignedOrder {
  orderId: string;
  customerName: string;
  weightKg: number;
  priority: string;
  reason: string;
  detail: string;
}

export interface RecoveryAiExplanation {
  source: 'gemini-flash' | 'rule-based-fallback';
  modelName: string;
  generatedAt: string;
  executiveSummary: string;
  vehicleExclusionRationale: { vehicleId: string; reason: string }[];
  criticalOrderRisks: { orderId: string; riskDescription: string; severity: 'high' | 'medium' | 'low' }[];
  unassignedAnalysis: { orderId: string; explanation: string }[];
  planTradeOffs: { aspect: string; original: string; proposed: string; impact: string }[];
  actionableDispatcherDirectives: string[];
}

export interface RecoveryPlan {
  id: string; // e.g. 'REC-PLAN-8921'
  incidentId: string;
  incidentType: IncidentType;
  incidentVehicleId?: string; // Explicitly recorded breakdown vehicle ID from DisruptionIncident
  createdAt: string; // ISO string
  status: PlanApprovalStatus;
  isFeasible: boolean;
  infeasibilityReason?: string;
  practicalDispatcherOptions?: string[];
  
  // Snapshots for verification and staleness detection
  snapshotDataFingerprint: string;
  originalAssignments: {
    orderId: string;
    previousVehicleId?: string;
    status: OrderStatus;
  }[];
  
  // Proposed Solution
  proposedAssignments: ProposedStopAssignment[];
  unassignedOrders: ProposedUnassignedOrder[];
  deadlineWarnings: {
    orderId: string;
    vehicleId: string;
    deadline: string;
    estimatedArrival: string;
    discrepancyMinutes: number;
  }[];
  
  metricsComparison: RecoveryMetricsComparison;
  aiExplanation?: RecoveryAiExplanation;
  
  // Resolution metadata
  appliedAt?: string;
  rejectedAt?: string;
  dispatcherNotes?: string;
}
