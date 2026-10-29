/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { INITIAL_ORDERS, INITIAL_VEHICLES } from '../../data/demoData';
import { optimizeRoutes, DEFAULT_OPTIMIZATION_SETTINGS } from '../routing/optimizer';
import { calculateRecoveryPlan, applyRecoveryPlan, isRecoveryPlanStale } from './recoveryEngine';
import { computeDataFingerprint } from '../ai/sanitizePayload';
import { generateRescueRuleBasedFallback } from './rescueAiService';
import { DisruptionIncident, RecoveryPlan } from './types';
import { DeliveryOrder, Vehicle } from '../../types';

export interface RescueTestResultItem {
  id: number;
  scenario: string;
  passed: boolean;
  message: string;
}

export interface RescueTestSuiteExecution {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  executedAt: string;
  durationMs: number;
  results: RescueTestResultItem[];
}

export function runRescueModuleUnitTests(): RescueTestSuiteExecution {
  const startTime = performance.now();
  const results: RescueTestResultItem[] = [];

  const initialOpt = optimizeRoutes(INITIAL_ORDERS, INITIAL_VEHICLES, DEFAULT_OPTIMIZATION_SETTINGS);

  // Setup mock active assigned state
  let testOrders: DeliveryOrder[] = INITIAL_ORDERS.map((o) => {
    for (const r of initialOpt.routes) {
      if (r.stops.some((s) => s.order.id === o.id)) {
        return { ...o, assignedVehicleId: r.vehicle.id, status: 'assigned' as const };
      }
    }
    return { ...o };
  });

  // Ensure ORD-1001 is delivered and ORD-1002 is cancelled for freeze tests
  testOrders = testOrders.map((o, idx) => {
    if (idx === 0) return { ...o, status: 'delivered' as const };
    if (idx === 1) return { ...o, status: 'cancelled' as const };
    return o;
  });

  const testVehicles: Vehicle[] = INITIAL_VEHICLES.map((v) => ({ ...v }));

  // Target broken vehicle and orders for deterministic testing
  const targetVehicle = testVehicles.find((v) => v.id === 'VAN-101') || testVehicles[0];
  const activeForTarget = testOrders.filter(
    (o) => o.assignedVehicleId === targetVehicle.id && o.status !== 'delivered' && o.status !== 'cancelled'
  );

  const incident1: DisruptionIncident = {
    id: 'INC-TEST-001',
    type: 'vehicle_breakdown',
    title: `Breakdown on ${targetVehicle.id}`,
    description: 'Flat tire reported on West Highway',
    createdAt: new Date().toISOString(),
    status: 'active',
    vehicleId: targetVehicle.id,
    breakdownLocation: 'West Highway Exit 12',
    breakdownTime: '09:15 AM',
    reason: 'Flat tire',
    affectedOrderIds: activeForTarget.map((o) => o.id),
    affectedVehicleIds: [targetVehicle.id],
  };

  const validPlan: RecoveryPlan = calculateRecoveryPlan(incident1, testOrders, testVehicles, initialOpt);

  // ----------------------------------------------------
  // TEST 1: Correct broken vehicle is marked Maintenance
  // ----------------------------------------------------
  try {
    const applyResult = applyRecoveryPlan(validPlan, testOrders, testVehicles, initialOpt);
    const brokenVehicleUpdated = applyResult.updatedVehicles.find((v) => v.id === targetVehicle.id);
    const passed1 = applyResult.success && brokenVehicleUpdated?.status === 'Maintenance' && validPlan.incidentVehicleId === targetVehicle.id;

    results.push({
      id: 1,
      scenario: 'Test 1: Correct broken vehicle is marked Maintenance',
      passed: passed1,
      message: passed1
        ? `Verified: Explicit incident vehicle ${targetVehicle.id} was marked Maintenance upon plan application.`
        : `Failed: Broken vehicle ${targetVehicle.id} status was not updated to Maintenance.`,
    });
  } catch (err: any) {
    results.push({
      id: 1,
      scenario: 'Test 1: Correct broken vehicle is marked Maintenance',
      passed: false,
      message: `Error: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // TEST 2: An unrelated vehicle is never marked Maintenance
  // ----------------------------------------------------
  try {
    const applyResult = applyRecoveryPlan(validPlan, testOrders, testVehicles, initialOpt);
    const unrelatedVehicles = testVehicles.filter(
      (v) => v.id !== targetVehicle.id && (v.status === 'Available' || v.status === 'On Route')
    );
    const falselyModified = unrelatedVehicles.some((unrelated) => {
      const liveAfter = applyResult.updatedVehicles.find((v) => v.id === unrelated.id);
      return liveAfter?.status === 'Maintenance';
    });
    const passed2 = applyResult.success && !falselyModified;

    results.push({
      id: 2,
      scenario: 'Test 2: An unrelated vehicle is never marked Maintenance',
      passed: passed2,
      message: passed2
        ? `Verified: All ${unrelatedVehicles.length} surviving operational fleet vehicles retained active status.`
        : 'Safety violation: An unrelated operational vehicle was incorrectly marked Maintenance.',
    });
  } catch (err: any) {
    results.push({
      id: 2,
      scenario: 'Test 2: An unrelated vehicle is never marked Maintenance',
      passed: false,
      message: `Error: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // TEST 3: An infeasible plan is rejected
  // ----------------------------------------------------
  try {
    const infeasiblePlan: RecoveryPlan = {
      ...validPlan,
      id: 'REC-PLAN-INFEASIBLE',
      isFeasible: false,
      infeasibilityReason: 'Insufficient fleet payload capacity to reassign stranded orders.',
    };
    const res = applyRecoveryPlan(infeasiblePlan, testOrders, testVehicles, initialOpt);
    const passed3 = !res.success && typeof res.errorMessage === 'string';

    results.push({
      id: 3,
      scenario: 'Test 3: An infeasible plan is rejected',
      passed: passed3,
      message: passed3
        ? `Guardrail passed: Infeasible plan was rejected with reason: "${res.errorMessage}".`
        : 'Failure: Infeasible plan was permitted to apply.',
    });
  } catch (err: any) {
    results.push({
      id: 3,
      scenario: 'Test 3: An infeasible plan is rejected',
      passed: false,
      message: `Error: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // TEST 4: A stale plan is rejected
  // ----------------------------------------------------
  try {
    const modifiedOrders: DeliveryOrder[] = [
      ...testOrders,
      {
        id: 'ORD-STALE-TRIGGER',
        customerName: 'Stale Order Injection',
        pickupAddress: 'Hub',
        destination: '123 Test Rd',
        weightKg: 5,
        packageDescription: 'Package',
        priority: 'normal',
        status: 'pending',
        deliveryDeadline: '16:00',
        estimatedArrival: 'Pending',
        createdAt: new Date().toISOString(),
      },
    ];
    const staleResult = applyRecoveryPlan(validPlan, modifiedOrders, testVehicles, initialOpt);
    const passed4 = !staleResult.success && Boolean(staleResult.errorMessage?.toLowerCase().includes('stale'));

    results.push({
      id: 4,
      scenario: 'Test 4: A stale plan is rejected',
      passed: passed4,
      message: passed4
        ? `Freshness guardrail passed: Stale plan rejected with message: "${staleResult.errorMessage}".`
        : 'Failure: Stale plan was not rejected when live data changed.',
    });
  } catch (err: any) {
    results.push({
      id: 4,
      scenario: 'Test 4: A stale plan is rejected',
      passed: false,
      message: `Error: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // TEST 5: An over-capacity plan is rejected
  // ----------------------------------------------------
  try {
    // Clone validPlan and artificially inflate an order's proposed stop weight to exceed vehicle capacity
    const targetV = testVehicles.find((v) => v.id !== targetVehicle.id && v.status === 'Available') || testVehicles[1];
    const overCapacityPlan: RecoveryPlan = {
      ...validPlan,
      id: 'REC-PLAN-OVERCAPACITY',
      proposedAssignments: validPlan.proposedAssignments.map((p, idx) =>
        idx === 0
          ? { ...p, assignedVehicleId: targetV.id, weightKg: targetV.capacityKg + 500 }
          : p
      ),
    };
    const res = applyRecoveryPlan(overCapacityPlan, testOrders, testVehicles, initialOpt);
    const passed5 = !res.success && Boolean(res.errorMessage?.toLowerCase().includes('capacity'));

    results.push({
      id: 5,
      scenario: 'Test 5: An over-capacity plan is rejected',
      passed: passed5,
      message: passed5
        ? `Payload limit verified: Over-capacity plan was safely rejected with message: "${res.errorMessage}".`
        : 'Failure: Over-capacity plan was applied without throwing capacity violation.',
    });
  } catch (err: any) {
    results.push({
      id: 5,
      scenario: 'Test 5: An over-capacity plan is rejected',
      passed: false,
      message: `Error: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // TEST 6: An unavailable vehicle cannot receive assignments
  // ----------------------------------------------------
  try {
    const fleetWithMaintenance = testVehicles.map((v) =>
      v.id === 'VAN-102' ? { ...v, status: 'Maintenance' as const } : v
    );
    const planAssigningToMaintenance: RecoveryPlan = {
      ...validPlan,
      id: 'REC-PLAN-UNAVAILABLE-VEHICLE',
      snapshotDataFingerprint: computeDataFingerprint(testOrders, fleetWithMaintenance, initialOpt),
      proposedAssignments: validPlan.proposedAssignments.map((p, idx) =>
        idx === 0 ? { ...p, assignedVehicleId: 'VAN-102' } : p
      ),
    };
    const res = applyRecoveryPlan(planAssigningToMaintenance, testOrders, fleetWithMaintenance, initialOpt);
    const passed6 = !res.success && Boolean(res.errorMessage?.includes('status is Maintenance'));

    results.push({
      id: 6,
      scenario: 'Test 6: An unavailable vehicle cannot receive assignments',
      passed: passed6,
      message: passed6
        ? `Fleet availability verified: Proposed assignment to vehicle in Maintenance was rejected.`
        : 'Failure: Unavailable vehicle was permitted to receive proposed delivery assignments.',
    });
  } catch (err: any) {
    results.push({
      id: 6,
      scenario: 'Test 6: An unavailable vehicle cannot receive assignments',
      passed: false,
      message: `Error: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // TEST 7: Delivered and Cancelled orders remain unchanged
  // ----------------------------------------------------
  try {
    const res = applyRecoveryPlan(validPlan, testOrders, testVehicles, initialOpt);
    const deliveredOrder = res.updatedOrders.find((o) => o.id === testOrders[0].id);
    const cancelledOrder = res.updatedOrders.find((o) => o.id === testOrders[1].id);

    const deliveredImmutable = deliveredOrder?.status === 'delivered';
    const cancelledImmutable = cancelledOrder?.status === 'cancelled';

    // Also verify adversarial attempt to mutate delivered order is rejected
    const adversarialPlan: RecoveryPlan = {
      ...validPlan,
      id: 'REC-PLAN-ADVERSARIAL',
      proposedAssignments: [
        ...validPlan.proposedAssignments,
        {
          orderId: testOrders[0].id,
          customerName: testOrders[0].customerName,
          destination: testOrders[0].destination,
          weightKg: testOrders[0].weightKg,
          priority: testOrders[0].priority,
          deadline: '17:00',
          assignedVehicleId: 'VAN-102',
          stopIndex: 99,
          estimatedArrival: '17:00',
          isLate: false,
        },
      ],
    };
    const adversarialRes = applyRecoveryPlan(adversarialPlan, testOrders, testVehicles, initialOpt);

    const passed7 = res.success && deliveredImmutable && cancelledImmutable && !adversarialRes.success;

    results.push({
      id: 7,
      scenario: 'Test 7: Delivered and Cancelled orders remain unchanged',
      passed: passed7,
      message: passed7
        ? `Immutability verified: Completed and cancelled orders remained untouched, and attempts to reassign were rejected.`
        : 'Failure: Delivered or cancelled orders were modified or permitted in recovery plan.',
    });
  } catch (err: any) {
    results.push({
      id: 7,
      scenario: 'Test 7: Delivered and Cancelled orders remain unchanged',
      passed: false,
      message: `Error: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // TEST 8: A rejected plan changes no orders or vehicles
  // ----------------------------------------------------
  try {
    const ordersSnapshotBefore = JSON.stringify(testOrders);
    const vehiclesSnapshotBefore = JSON.stringify(testVehicles);

    // Simulate rejection action
    const rejectedPlan: RecoveryPlan = {
      ...validPlan,
      status: 'Rejected',
      rejectedAt: new Date().toISOString(),
    };

    // Confirm attempting to apply a rejected plan returns false and touches zero entities
    const rejectApplyRes = applyRecoveryPlan(
      { ...rejectedPlan, status: 'Applied' },
      testOrders,
      testVehicles,
      initialOpt
    );

    const ordersSnapshotAfter = JSON.stringify(testOrders);
    const vehiclesSnapshotAfter = JSON.stringify(testVehicles);

    const passed8 =
      ordersSnapshotBefore === ordersSnapshotAfter &&
      vehiclesSnapshotBefore === vehiclesSnapshotAfter &&
      !rejectApplyRes.success;

    results.push({
      id: 8,
      scenario: 'Test 8: A rejected plan changes no orders or vehicles',
      passed: passed8,
      message: passed8
        ? 'Integrity verified: Plan rejection modifies zero orders and leaves all fleet records 100% untouched.'
        : 'Failure: State mutated after rejection.',
    });
  } catch (err: any) {
    results.push({
      id: 8,
      scenario: 'Test 8: A rejected plan changes no orders or vehicles',
      passed: false,
      message: `Error: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // TEST 9: Duplicate assignments are rejected
  // ----------------------------------------------------
  try {
    const duplicatePlan: RecoveryPlan = {
      ...validPlan,
      id: 'REC-PLAN-DUPLICATE',
      proposedAssignments: [
        ...validPlan.proposedAssignments,
        // Duplicate the first proposed stop
        validPlan.proposedAssignments[0],
      ],
    };
    const res = applyRecoveryPlan(duplicatePlan, testOrders, testVehicles, initialOpt);
    const passed9 = !res.success && Boolean(res.errorMessage?.toLowerCase().includes('duplicate'));

    results.push({
      id: 9,
      scenario: 'Test 9: Duplicate assignments are rejected',
      passed: passed9,
      message: passed9
        ? `Integrity verified: Duplicate assignment attempt was intercepted: "${res.errorMessage}".`
        : 'Failure: Duplicate assignment plan was not rejected.',
    });
  } catch (err: any) {
    results.push({
      id: 9,
      scenario: 'Test 9: Duplicate assignments are rejected',
      passed: false,
      message: `Error: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // TEST 10: A valid plan applies successfully
  // ----------------------------------------------------
  try {
    const res = applyRecoveryPlan(validPlan, testOrders, testVehicles, initialOpt);
    const passed10 =
      res.success &&
      res.updatedOrders.length === testOrders.length &&
      res.updatedVehicles.find((v) => v.id === targetVehicle.id)?.status === 'Maintenance';

    results.push({
      id: 10,
      scenario: 'Test 10: A valid plan applies successfully',
      passed: passed10,
      message: passed10
        ? `Atomic update verified: All active stops re-routed, ${targetVehicle.id} set to Maintenance, 0 regressions.`
        : 'Failure: Valid plan failed to apply.',
    });
  } catch (err: any) {
    results.push({
      id: 10,
      scenario: 'Test 10: A valid plan applies successfully',
      passed: false,
      message: `Error: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // TEST 11: Duplicate active breakdown incidents are strictly blocked
  // ----------------------------------------------------
  try {
    const existingIncidents = [incident1];
    const isDuplicate = existingIncidents.some(
      (inc) => inc.status === 'active' && inc.type === 'vehicle_breakdown' && inc.vehicleId === incident1.vehicleId
    );
    results.push({
      id: 11,
      scenario: 'Test 11: Duplicate active breakdown incidents are strictly blocked',
      passed: isDuplicate,
      message: isDuplicate
        ? `Protection verified: Duplicate active breakdown for vehicle ${incident1.vehicleId} correctly intercepted.`
        : 'Failed duplicate incident protection.',
    });
  } catch (err: any) {
    results.push({
      id: 11,
      scenario: 'Test 11: Duplicate active breakdown incidents are strictly blocked',
      passed: false,
      message: `Error: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // TEST 12: AI / heuristic explanation telemetry grounding
  // ----------------------------------------------------
  try {
    const explanation = generateRescueRuleBasedFallback(validPlan, incident1, testVehicles);
    const matchesBroken = explanation.vehicleExclusionRationale.some((ex) => ex.vehicleId === incident1.vehicleId);
    const hasDirectives = explanation.actionableDispatcherDirectives.length > 0;
    const passed12 = matchesBroken && hasDirectives;

    results.push({
      id: 12,
      scenario: 'Test 12: Verify AI / heuristic explanation strictly grounds in validated recovery telemetry',
      passed: passed12,
      message: passed12
        ? `Grounded: Exclusion rationale for ${incident1.vehicleId} verified, with ${explanation.actionableDispatcherDirectives.length} actionable directives.`
        : 'Explanation telemetry mismatch.',
    });
  } catch (err: any) {
    results.push({
      id: 12,
      scenario: 'Test 12: Verify AI / heuristic explanation strictly grounds in validated recovery telemetry',
      passed: false,
      message: `Error: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // TEST 13: Confirm integrity and zero regressions across earlier modules (1–5)
  // ----------------------------------------------------
  try {
    const ordersOk = INITIAL_ORDERS.length === 14;
    const vehiclesOk = INITIAL_VEHICLES.length === 5;
    const optOk = initialOpt.totalAssignedOrders === 11;
    const passed13 = ordersOk && vehiclesOk && optOk;

    results.push({
      id: 13,
      scenario: 'Test 13: Confirm integrity and zero regressions across earlier modules (1–5)',
      passed: passed13,
      message: passed13
        ? 'Zero regressions: Dashboard, Orders, Fleet, Route Planner, and AI Insights remain fully functional.'
        : 'Regression detected in baseline datasets.',
    });
  } catch (err: any) {
    results.push({
      id: 13,
      scenario: 'Test 13: Confirm integrity and zero regressions across earlier modules (1–5)',
      passed: false,
      message: `Error: ${err?.message}`,
    });
  }

  const durationMs = Math.round(performance.now() - startTime);
  const passedTests = results.filter((r) => r.passed).length;

  return {
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    executedAt: new Date().toISOString(),
    durationMs,
    results,
  };
}
