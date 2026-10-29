/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeliveryOrder, Vehicle } from '../../types';
import { OptimizationResult } from '../routing/types';
import {
  GeminiAiInsightsReport,
  SanitizedAnalysisPayload,
} from './insightsTypes';
import {
  buildSanitizedAnalysisPayload,
  computeDataFingerprint,
} from './sanitizePayload';
import { generateRuleBasedFallback } from './fallbackGenerator';

export interface GeminiStatusResponse {
  configured: boolean;
  model: string;
  mode: 'connected' | 'not_configured' | 'error';
  error?: string;
}

/**
 * Checks server-side Gemini API readiness.
 */
export async function checkGeminiStatus(): Promise<GeminiStatusResponse> {
  try {
    const res = await fetch('/api/gemini/status');
    if (!res.ok) {
      return {
        configured: false,
        model: 'gemini-3.8-flash',
        mode: 'error',
        error: `Server responded with HTTP ${res.status}`,
      };
    }
    const data = await res.json();
    return {
      configured: data.configured,
      model: data.model || 'gemini-3.8-flash',
      mode: data.configured ? 'connected' : 'not_configured',
    };
  } catch (err: any) {
    return {
      configured: false,
      model: 'gemini-3.8-flash',
      mode: 'error',
      error: err?.message || 'Failed to reach server API route.',
    };
  }
}

/**
 * Generates AI Insights: attempts server-side Gemini 3.8 Flash,
 * and seamlessly provides transparent deterministic rule-based fallback if Gemini is unconfigured or unavailable.
 */
export async function generateAiInsights(
  orders: DeliveryOrder[],
  vehicles: Vehicle[],
  optimizationResult: OptimizationResult | null,
  options?: { forceFallback?: boolean }
): Promise<{
  report: GeminiAiInsightsReport;
  usedFallback: boolean;
  statusMessage: string;
}> {
  const payload: SanitizedAnalysisPayload = buildSanitizedAnalysisPayload(
    orders,
    vehicles,
    optimizationResult
  );

  if (options?.forceFallback) {
    const fallbackReport = generateRuleBasedFallback(payload);
    return {
      report: fallbackReport,
      usedFallback: true,
      statusMessage: 'Generated via Deterministic Rule-Based Fallback Engine.',
    };
  }

  try {
    const response = await fetch('/api/gemini/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.success && result.report) {
      return {
        report: result.report,
        usedFallback: false,
        statusMessage: 'Generated live via Gemini 3.8 Flash (Server-Side Proxy).',
      };
    }

    // Server returned error (e.g. key missing or rate limit)
    console.warn('[RouteWise AI] Server Gemini call returned error, switching to rule-based fallback:', result.error);
    const fallbackReport = generateRuleBasedFallback(payload);
    return {
      report: fallbackReport,
      usedFallback: true,
      statusMessage: `Gemini unconfigured (${result.error || 'Server error'}). Switched to Deterministic Rule-Based Fallback.`,
    };
  } catch (err: any) {
    console.warn('[RouteWise AI] Network error reaching Gemini server proxy, using fallback:', err);
    const fallbackReport = generateRuleBasedFallback(payload);
    return {
      report: fallbackReport,
      usedFallback: true,
      statusMessage: 'Network error reaching Gemini proxy. Switched to Deterministic Rule-Based Fallback.',
    };
  }
}
