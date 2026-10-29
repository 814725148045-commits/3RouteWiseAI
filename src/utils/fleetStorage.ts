import { Vehicle, DeliveryOrder } from '../types';
import { INITIAL_VEHICLES } from '../data/demoData';

const VEHICLES_STORAGE_KEY = 'routewise_ai_vehicles_v3';

/**
 * Safely loads vehicles from browser LocalStorage.
 * Falls back to INITIAL_VEHICLES if storage is empty, corrupted, or unavailable.
 */
export function loadVehiclesFromStorage(): Vehicle[] {
  if (typeof window === 'undefined') {
    return INITIAL_VEHICLES;
  }
  try {
    const raw = localStorage.getItem(VEHICLES_STORAGE_KEY);
    if (!raw) {
      return INITIAL_VEHICLES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, index) => {
        const fallback = INITIAL_VEHICLES[index] || INITIAL_VEHICLES[0];
        return {
          id: item.id || fallback.id,
          registrationNumber: item.registrationNumber || item.licensePlate || fallback.registrationNumber,
          licensePlate: item.registrationNumber || item.licensePlate || fallback.licensePlate,
          name: item.name || fallback.name,
          vehicleType: item.vehicleType || fallback.vehicleType,
          capacityKg: Number(item.capacityKg || fallback.capacityKg || 500),
          maxCapacityKg: Number(item.capacityKg || fallback.capacityKg || 500),
          maxStops: Number(item.maxStops || fallback.maxStops || 12),
          driverName: item.driverName || fallback.driverName,
          driverPhone: item.driverPhone || fallback.driverPhone,
          status: item.status || fallback.status,
          currentDepot: item.currentDepot || item.currentLocation || fallback.currentDepot,
          currentLocation: item.currentDepot || item.currentLocation || fallback.currentLocation,
          currentZone: item.currentZone || fallback.currentZone,
          activeRouteName: item.activeRouteName || fallback.activeRouteName,
          fuelType: item.fuelType || fallback.fuelType,
          fuelOrBattery: item.fuelOrBattery || fallback.fuelOrBattery,
          color: item.color || fallback.color,
          notes: item.notes || fallback.notes,
          createdAt: item.createdAt || fallback.createdAt,
        };
      });
    }
    return INITIAL_VEHICLES;
  } catch (err) {
    console.warn('[RouteWise Storage] Failed to load vehicles from localStorage, using demo defaults:', err);
    return INITIAL_VEHICLES;
  }
}

/**
 * Safely saves vehicles into browser LocalStorage.
 */
export function saveVehiclesToStorage(vehicles: Vehicle[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(vehicles));
  } catch (err) {
    console.warn('[RouteWise Storage] Failed to write vehicles to localStorage:', err);
  }
}

/**
 * Clears stored vehicles and returns fresh clone of INITIAL_VEHICLES.
 */
export function resetVehiclesStorage(): Vehicle[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(VEHICLES_STORAGE_KEY);
    } catch (err) {
      console.warn('[RouteWise Storage] Failed to clear vehicles storage key:', err);
    }
  }
  return [...INITIAL_VEHICLES];
}

export interface VehicleComputedMetrics {
  activeOrders: DeliveryOrder[];
  currentLoadKg: number;
  stopsCount: number;
  utilizationPercent: number;
  isOverCapacity: boolean;
  isAtCapacity: boolean;
  remainingCapacityKg: number;
}

/**
 * Accurately calculates assigned cargo weight and stops from active orders (not cancelled, not delivered).
 * Never invents fake loads.
 */
export function computeVehicleMetrics(vehicle: Vehicle, orders: DeliveryOrder[]): VehicleComputedMetrics {
  const activeOrders = orders.filter(
    (o) =>
      o.assignedVehicleId === vehicle.id &&
      o.status !== 'cancelled' &&
      o.status !== 'delivered'
  );

  const totalLoad = activeOrders.reduce((sum, o) => sum + (o.weightKg || o.packageWeightKg || 0), 0);
  const currentLoadKg = Number(totalLoad.toFixed(1));
  const stopsCount = activeOrders.length;
  const capacity = vehicle.capacityKg || 500;
  const utilizationPercent = Math.round((currentLoadKg / capacity) * 100);
  const isOverCapacity = currentLoadKg > capacity;
  const isAtCapacity = utilizationPercent >= 90;
  const remainingCapacityKg = Math.max(0, Number((capacity - currentLoadKg).toFixed(1)));

  return {
    activeOrders,
    currentLoadKg,
    stopsCount,
    utilizationPercent,
    isOverCapacity,
    isAtCapacity,
    remainingCapacityKg,
  };
}
