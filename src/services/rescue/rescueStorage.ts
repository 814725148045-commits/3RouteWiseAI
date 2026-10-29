/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DisruptionIncident, RecoveryPlan } from './types';

const INCIDENTS_STORAGE_KEY = 'routewise_rescue_incidents_v1';
const RECOVERY_PLANS_STORAGE_KEY = 'routewise_rescue_plans_v1';

export function loadIncidentsFromStorage(): DisruptionIncident[] {
  try {
    const raw = localStorage.getItem(INCIDENTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[RouteWise Rescue] Failed to load incidents from storage:', err);
    return [];
  }
}

export function saveIncidentsToStorage(incidents: DisruptionIncident[]): void {
  try {
    localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(incidents));
  } catch (err) {
    console.warn('[RouteWise Rescue] Failed to save incidents to storage:', err);
  }
}

export function loadRecoveryPlansFromStorage(): RecoveryPlan[] {
  try {
    const raw = localStorage.getItem(RECOVERY_PLANS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[RouteWise Rescue] Failed to load recovery plans from storage:', err);
    return [];
  }
}

export function saveRecoveryPlansToStorage(plans: RecoveryPlan[]): void {
  try {
    localStorage.setItem(RECOVERY_PLANS_STORAGE_KEY, JSON.stringify(plans));
  } catch (err) {
    console.warn('[RouteWise Rescue] Failed to save recovery plans to storage:', err);
  }
}

export function clearRescueStorage(): void {
  try {
    localStorage.removeItem(INCIDENTS_STORAGE_KEY);
    localStorage.removeItem(RECOVERY_PLANS_STORAGE_KEY);
  } catch (err) {
    console.warn('[RouteWise Rescue] Failed to clear rescue storage:', err);
  }
}
