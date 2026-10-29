import { DeliveryOrder } from '../types';
import { INITIAL_ORDERS } from '../data/demoData';

const STORAGE_KEY = 'routewise_ai_orders_v2';

/**
 * Safely loads orders from browser LocalStorage.
 * Falls back to INITIAL_ORDERS if storage is empty, corrupted, or unavailable.
 */
export function loadOrdersFromStorage(): DeliveryOrder[] {
  if (typeof window === 'undefined') {
    return INITIAL_ORDERS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return INITIAL_ORDERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all objects have required fields
      return parsed.map((item) => ({
        ...item,
        pickupAddress: item.pickupAddress || 'RouteWise Central Depot, Bay 4',
        packageDescription: item.packageDescription || 'General freight package',
        deliveryDeadline: item.deliveryDeadline || item.estimatedArrival || '15:00',
        weightKg: Number(item.weightKg || item.packageWeightKg || 10),
      }));
    }
    return INITIAL_ORDERS;
  } catch (err) {
    console.warn('[RouteWise Storage] Failed to load orders from localStorage, using demo defaults:', err);
    return INITIAL_ORDERS;
  }
}

/**
 * Safely saves orders into browser LocalStorage.
 */
export function saveOrdersToStorage(orders: DeliveryOrder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.warn('[RouteWise Storage] Failed to write orders to localStorage:', err);
  }
}

/**
 * Clears stored orders and returns fresh clone of INITIAL_ORDERS.
 */
export function resetOrdersStorage(): DeliveryOrder[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('[RouteWise Storage] Failed to clear localStorage key:', err);
    }
  }
  return [...INITIAL_ORDERS];
}
