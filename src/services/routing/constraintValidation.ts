/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeliveryOrder, Vehicle } from '../../types';
import {
  OptimizationSettings,
  ValidationErrorItem,
  ValidationReport,
  VehicleRoutePlan,
} from './types';

/**
 * Validates orders and vehicles before optimization runs.
 * Reports errors and warnings clearly without silently repairing invalid data.
 */
export function validateOptimizationInputs(
  orders: DeliveryOrder[],
  vehicles: Vehicle[],
  settings: OptimizationSettings
): ValidationReport {
  const errors: ValidationErrorItem[] = [];
  const warnings: ValidationErrorItem[] = [];

  // Filter eligible vehicles based on fleet scope and operational status
  const eligibleVehicles = vehicles.filter((v) => {
    if (v.status === 'Maintenance' || v.status === 'Offline') {
      return false;
    }
    if (settings.fleetScope === 'available-only') {
      return v.status === 'Available';
    }
    return v.status === 'Available' || v.status === 'On Route';
  });

  const excludedVehicles = vehicles.filter(
    (v) => !eligibleVehicles.some((ev) => ev.id === v.id)
  );

  // Validate vehicles
  eligibleVehicles.forEach((v) => {
    if (!v.capacityKg || v.capacityKg <= 0) {
      errors.push({
        id: `err-veh-cap-${v.id}`,
        entityType: 'vehicle',
        entityId: v.id,
        field: 'capacityKg',
        message: `Vehicle ${v.id} (${v.driverName}) has invalid capacity (${v.capacityKg} kg). Capacity must be a positive number.`,
        severity: 'error',
      });
    }

    if (!v.maxStops || v.maxStops <= 0) {
      warnings.push({
        id: `warn-veh-stops-${v.id}`,
        entityType: 'vehicle',
        entityId: v.id,
        field: 'maxStops',
        message: `Vehicle ${v.id} has no max stops specified; defaulting to 15 stops.`,
        severity: 'warning',
      });
    }
  });

  if (eligibleVehicles.length === 0) {
    errors.push({
      id: 'err-no-vehicles',
      entityType: 'vehicle',
      entityId: 'ALL',
      field: 'status',
      message:
        'No eligible vehicles available for route optimization. All vehicles are in Maintenance, Offline, or excluded by fleet scope.',
      severity: 'error',
    });
  }

  // Maximum vehicle capacity across eligible vehicles
  const maxVehicleCapacity =
    eligibleVehicles.length > 0
      ? Math.max(...eligibleVehicles.map((v) => v.capacityKg || 0))
      : 0;

  // Filter eligible orders: exclude Cancelled and Delivered
  const eligibleOrders = orders.filter(
    (o) => o.status !== 'cancelled' && o.status !== 'delivered'
  );

  const excludedOrders = orders.filter(
    (o) => o.status === 'cancelled' || o.status === 'delivered'
  );

  // Validate orders
  eligibleOrders.forEach((o) => {
    const dest = o.destination || o.deliveryAddress;
    if (!dest || dest.trim().length === 0) {
      errors.push({
        id: `err-ord-dest-${o.id}`,
        entityType: 'order',
        entityId: o.id,
        field: 'destination',
        message: `Order ${o.id} (${o.customerName}) is missing a delivery destination address.`,
        severity: 'error',
      });
    }

    const weight = Number(o.weightKg || o.packageWeightKg || 0);
    if (isNaN(weight) || weight <= 0) {
      errors.push({
        id: `err-ord-weight-${o.id}`,
        entityType: 'order',
        entityId: o.id,
        field: 'weightKg',
        message: `Order ${o.id} (${o.customerName}) has invalid package weight (${weight} kg). Weight must be greater than zero.`,
        severity: 'error',
      });
    } else if (eligibleVehicles.length > 0 && weight > maxVehicleCapacity) {
      // Order exceeds every eligible vehicle's capacity; flagged as constraint warning
      warnings.push({
        id: `warn-ord-exceeds-all-${o.id}`,
        entityType: 'order',
        entityId: o.id,
        field: 'weightKg',
        message: `Order ${o.id} weight (${weight} kg) exceeds maximum capacity of all eligible vehicles (Largest available: ${maxVehicleCapacity} kg). Will be placed in unassigned queue.`,
        severity: 'warning',
      });
    }
  });

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    eligibleOrdersCount: eligibleOrders.length,
    excludedOrdersCount: excludedOrders.length,
    eligibleVehiclesCount: eligibleVehicles.length,
    excludedVehiclesCount: excludedVehicles.length,
  };
}

/**
 * Post-optimization feasibility check.
 * Verifies that the computed plan strictly adheres to physical capacity and vehicle rules.
 */
export function verifyPlanFeasibility(routes: VehicleRoutePlan[]): {
  isFeasible: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const assignedOrderIds = new Set<string>();

  for (const route of routes) {
    const vehicle = route.vehicle;
    const capacity = vehicle.capacityKg || 500;
    const maxStops = vehicle.maxStops || 20;

    // 1. Capacity limit check
    if (route.totalAssignedLoadKg > capacity + 0.001) {
      violations.push(
        `Feasibility violation: Vehicle ${vehicle.id} assigned load (${route.totalAssignedLoadKg} kg) exceeds maximum capacity (${capacity} kg).`
      );
    }

    // 2. Max stops limit check
    if (route.stops.length > maxStops) {
      violations.push(
        `Feasibility violation: Vehicle ${vehicle.id} has ${route.stops.length} stops, exceeding max stops limit of ${maxStops}.`
      );
    }

    // 3. Duplicate order check
    for (const stop of route.stops) {
      if (assignedOrderIds.has(stop.order.id)) {
        violations.push(
          `Feasibility violation: Order ${stop.order.id} was assigned to multiple vehicles/stops.`
        );
      }
      assignedOrderIds.add(stop.order.id);

      // 4. Ensure no cancelled or delivered orders were routed
      if (stop.order.status === 'cancelled' || stop.order.status === 'delivered') {
        violations.push(
          `Feasibility violation: ${stop.order.status} order ${stop.order.id} was erroneously routed.`
        );
      }
    }
  }

  return {
    isFeasible: violations.length === 0,
    violations,
  };
}
