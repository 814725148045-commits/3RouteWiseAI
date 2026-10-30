/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeliveryOrder, Vehicle } from '../../types';
import { UserProfile } from '../../types/user';
import { DEMO_PROFILES, getInitialUserData } from '../../data/userProfiles';

const ACTIVE_USER_STORAGE_KEY = 'routewise_active_user_id';

export function getActiveUserId(): string {
  if (typeof window === 'undefined') return 'user-sf';
  const saved = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
  if (saved && DEMO_PROFILES.some((p) => p.id === saved)) {
    return saved;
  }
  return 'user-sf';
}

export function setActiveUserId(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId);
}

export function getActiveUserProfile(userId: string): UserProfile {
  return DEMO_PROFILES.find((p) => p.id === userId) || DEMO_PROFILES[0];
}

export function loadUserOrders(userId: string): DeliveryOrder[] {
  if (typeof window === 'undefined') {
    return getInitialUserData(userId).orders;
  }
  const key = `routewise_user_${userId}_orders`;
  const serialized = localStorage.getItem(key);
  if (!serialized) {
    const initial = getInitialUserData(userId).orders;
    saveUserOrders(userId, initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(serialized);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn(`[UserStorage] Failed to parse orders for user ${userId}:`, err);
  }
  const initial = getInitialUserData(userId).orders;
  saveUserOrders(userId, initial);
  return initial;
}

export function saveUserOrders(userId: string, orders: DeliveryOrder[]): void {
  if (typeof window === 'undefined') return;
  const key = `routewise_user_${userId}_orders`;
  localStorage.setItem(key, JSON.stringify(orders));

  // Async backend sync if online
  try {
    fetch(`/api/workspace/${encodeURIComponent(userId)}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-id': userId },
      body: JSON.stringify({ orders }),
    }).catch(() => {
      // Non-blocking offline fallback
    });
  } catch {
    // Non-blocking
  }
}

export function loadUserVehicles(userId: string): Vehicle[] {
  if (typeof window === 'undefined') {
    return getInitialUserData(userId).vehicles;
  }
  const key = `routewise_user_${userId}_vehicles`;
  const serialized = localStorage.getItem(key);
  if (!serialized) {
    const initial = getInitialUserData(userId).vehicles;
    saveUserVehicles(userId, initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(serialized);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn(`[UserStorage] Failed to parse vehicles for user ${userId}:`, err);
  }
  const initial = getInitialUserData(userId).vehicles;
  saveUserVehicles(userId, initial);
  return initial;
}

export function saveUserVehicles(userId: string, vehicles: Vehicle[]): void {
  if (typeof window === 'undefined') return;
  const key = `routewise_user_${userId}_vehicles`;
  localStorage.setItem(key, JSON.stringify(vehicles));

  // Async backend sync if online
  try {
    fetch(`/api/workspace/${encodeURIComponent(userId)}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-id': userId },
      body: JSON.stringify({ vehicles }),
    }).catch(() => {
      // Non-blocking offline fallback
    });
  } catch {
    // Non-blocking
  }
}

export function resetUserWorkspace(userId: string): {
  orders: DeliveryOrder[];
  vehicles: Vehicle[];
} {
  const initial = getInitialUserData(userId);
  saveUserOrders(userId, initial.orders);
  saveUserVehicles(userId, initial.vehicles);
  return {
    orders: initial.orders,
    vehicles: initial.vehicles,
  };
}
