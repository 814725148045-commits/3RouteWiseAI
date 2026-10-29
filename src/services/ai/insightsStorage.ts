/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeminiAiInsightsReport } from './insightsTypes';

const INSIGHTS_STORAGE_KEY = 'routewise_ai_insights_v5';

/**
 * Loads stored AI Insights from browser LocalStorage.
 * Checks against current data fingerprint to mark stale if operational state changed.
 */
export function loadInsightsFromStorage(
  currentDataFingerprint?: string
): GeminiAiInsightsReport | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(INSIGHTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: GeminiAiInsightsReport = JSON.parse(raw);
    if (!parsed || !parsed.id) return null;

    if (currentDataFingerprint) {
      parsed.isStale = parsed.dataFingerprint !== currentDataFingerprint;
    }
    return parsed;
  } catch (err) {
    console.warn('[RouteWise AI] Failed to load insights from storage:', err);
    return null;
  }
}

/**
 * Saves generated AI Insights into browser LocalStorage.
 */
export function saveInsightsToStorage(report: GeminiAiInsightsReport): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INSIGHTS_STORAGE_KEY, JSON.stringify(report));
  } catch (err) {
    console.warn('[RouteWise AI] Failed to save insights to storage:', err);
  }
}

/**
 * Clears stored AI Insights from browser LocalStorage.
 */
export function clearInsightsStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(INSIGHTS_STORAGE_KEY);
  } catch (err) {
    console.warn('[RouteWise AI] Failed to clear insights storage:', err);
  }
}
