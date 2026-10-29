/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DeliveryOrder, Vehicle } from '../../types';
import { OptimizationResult } from '../../services/routing/types';
import {
  GeminiAiInsightsReport,
  RiskSeverity,
} from '../../services/ai/insightsTypes';
import { checkGeminiStatus, generateAiInsights } from '../../services/ai/aiService';
import { AffectedEntityModal } from '../modals/AffectedEntityModal';
import { AiVerificationModal } from './AiVerificationModal';
import {
  Sparkles,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  Scale,
  Navigation,
  HelpCircle,
  ArrowRight,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sliders,
  Filter,
  Layers,
} from 'lucide-react';

interface AiInsightsViewProps {
  orders: DeliveryOrder[];
  vehicles: Vehicle[];
  optimizationResult: OptimizationResult | null;
  report: GeminiAiInsightsReport | null;
  isStale: boolean;
  onUpdateReport: (report: GeminiAiInsightsReport | null) => void;
  onNavigateToPlanner: () => void;
}

export const AiInsightsView: React.FC<AiInsightsViewProps> = ({
  orders,
  vehicles,
  optimizationResult,
  report,
  isStale,
  onUpdateReport,
  onNavigateToPlanner,
}) => {
  // Connection status (Connected, Not Configured, or Error)
  const [connectionStatus, setConnectionStatus] = useState<{
    configured: boolean;
    model: string;
    mode: 'connected' | 'not_configured' | 'error';
    error?: string;
  }>({
    configured: false,
    model: 'gemini-3.8-flash',
    mode: 'not_configured',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Filters & Interactivity
  const [riskSeverityFilter, setRiskSeverityFilter] = useState<RiskSeverity | 'all'>('all');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    explanations: true,
    risks: true,
    recommendations: true,
    limitations: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const checkStatus = () => {
    checkGeminiStatus().then((status) => {
      setConnectionStatus(status);
    });
  };

  // Check backend Gemini status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const handleGenerate = async (forceFallback = false) => {
    setIsLoading(true);
    setStatusMessage(null);
    setLastError(null);
    try {
      const res = await generateAiInsights(orders, vehicles, optimizationResult, { forceFallback });
      onUpdateReport(res.report);
      setStatusMessage(res.statusMessage);
      if (res.usedFallback && !forceFallback) {
        setLastError('Live Gemini call fell back to deterministic rule-based engine.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to generate insights';
      setLastError(msg);
      setStatusMessage(`Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearReport = () => {
    if (window.confirm('Are you sure you want to clear the current AI insights analysis?')) {
      onUpdateReport(null);
      setStatusMessage('Insights analysis cleared.');
      setLastError(null);
    }
  };

  // Filtered risks
  const filteredRisks = report
    ? report.identifiedRisks.filter((r) => {
        if (riskSeverityFilter === 'all') return true;
        return r.severity === riskSeverityFilter;
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                RouteWise AI Insights
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Module 5 Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Understand your delivery operations with AI-powered explanations
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Verification Suite Modal Launcher */}
          <button
            onClick={() => setIsVerificationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 transition-all cursor-pointer"
            title="Run all 10 automated verification tests"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verify Suite (10 Tests)</span>
          </button>

          {report && (
            <button
              onClick={handleClearReport}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer disabled:opacity-50"
              title="Clear current analysis"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}

          {/* Primary Action Button */}
          <button
            onClick={() => handleGenerate(false)}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-md shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Analyzing Operations...</span>
              </>
            ) : report ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Insights</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-current" />
                <span>Generate Insights</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Connection & Telemetry Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>Last Analysis:</span>
            <strong className="text-slate-200">
              {report ? new Date(report.generatedAt).toLocaleTimeString() : 'Not generated yet'}
            </strong>
          </span>
          {report && (
            <>
              <span>•</span>
              <span className="text-slate-400">
                Engine:{' '}
                <strong className="text-slate-300 font-normal">
                  {report.source === 'gemini-flash' ? `Gemini Flash (${report.modelName})` : 'Deterministic Rule-Based Fallback'}
                </strong>
              </span>
            </>
          )}
        </div>

        {/* Explicit 3-State Connection Badge: Connected, Not Configured, or Error */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Connection Status:</span>
          {connectionStatus.mode === 'connected' ? (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Connected ({connectionStatus.model})
            </span>
          ) : connectionStatus.mode === 'not_configured' ? (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Not Configured (Fallback Mode Active)
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Error
              </span>
              <button
                onClick={checkStatus}
                className="text-[10px] text-teal-400 hover:underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error or Alert Callout with Retry Actions */}
      {lastError && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-xs text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <strong className="text-rose-100 font-semibold">Gemini API Notification:</strong>
              <p className="text-rose-300 mt-0.5">{lastError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleGenerate(false)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-semibold cursor-pointer disabled:opacity-50"
            >
              Retry Live Request
            </button>
            <button
              onClick={() => handleGenerate(true)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium cursor-pointer disabled:opacity-50"
            >
              Use Rule-Based Fallback
            </button>
          </div>
        </div>
      )}

      {/* Staleness Notice Banner */}
      {isStale && report && (
        <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Operational Data Changed:</strong> Orders, vehicle availability, or route plan parameters were modified since this analysis was created.
            </span>
          </div>
          <button
            onClick={() => handleGenerate(false)}
            disabled={isLoading}
            className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold shrink-0 cursor-pointer text-xs"
          >
            Re-run Analysis
          </button>
        </div>
      )}

      {/* Optimization Notice (if not run) */}
      {!optimizationResult && (
        <div className="flex items-center justify-between gap-3 bg-slate-900 border border-teal-500/30 rounded-xl p-4 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-teal-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-100">Route Optimization Recommended:</span>
              <p className="text-slate-400 mt-0.5">
                For vehicle turn-by-turn explanations, travel savings, and ETA evaluations, run the Route Planner first.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToPlanner}
            className="px-3.5 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-semibold shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <span>Open Route Planner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Empty State before Analysis is Generated */}
      {!report && !isLoading && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mx-auto flex items-center justify-center">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold text-slate-100">
              No Operational Insights Generated Yet
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate AI-powered explanations of current route schedules, identify customer SLA deadline risks,
              uncover vehicle capacity bottlenecks, and receive prioritized dispatcher directives.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => handleGenerate(false)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Generate RouteWise AI Insights</span>
            </button>
            <button
              onClick={() => handleGenerate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            >
              <span>Use Rule-Based Fallback Engine</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <h4 className="text-sm font-semibold text-slate-200">
            Synthesizing Operational Insights...
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Analyzing cargo payloads, deadline margins, and route loops against operational constraints.
          </p>
        </div>
      )}

      {/* Render Analysis Report */}
      {report && !isLoading && (
        <div className="space-y-6">
          {/* Category A: Executive Summary */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <button
                type="button"
                onClick={() => toggleSection('summary')}
                className="flex items-center gap-2 text-sm font-bold text-slate-100 uppercase tracking-wider hover:text-teal-300 transition-colors cursor-pointer text-left"
              >
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Category A: Executive Operations Summary</span>
                {expandedSections.summary ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              <span className="text-xs text-slate-400 font-mono">
                {report.verifiedMetrics.assignedOrdersCount} routed / {report.verifiedMetrics.totalEligibleOrders} eligible
              </span>
            </div>

            {expandedSections.summary && (
              <>
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-3">
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {report.executiveSummary.overview}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/80">
                    <div className="text-slate-300">
                      <span className="text-slate-400 font-semibold block text-[11px] uppercase">Fleet Payload Status</span>
                      {report.executiveSummary.fleetCapacityStatus}
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-400 font-semibold block text-[11px] uppercase">Service Level SLA Status</span>
                      {report.executiveSummary.serviceLevelStatus}
                    </div>
                  </div>
                </div>

                {/* Critical Constraints */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">Identified Operational Constraints:</span>
                  <div className="flex flex-wrap gap-2">
                    {report.executiveSummary.criticalConstraints.map((cc, i) => (
                      <span
                        key={i}
                        className="text-xs text-slate-300 bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg"
                      >
                        • {cc}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Category B: Route Explanations */}
          {report.routeExplanations.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <button
                  type="button"
                  onClick={() => toggleSection('explanations')}
                  className="flex items-center gap-2 text-sm font-bold text-slate-100 uppercase tracking-wider hover:text-teal-300 transition-colors cursor-pointer text-left"
                >
                  <Truck className="w-4 h-4 text-cyan-400" />
                  <span>Category B: Route Assignment Explanations</span>
                  {expandedSections.explanations ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  AI Interpretation
                </span>
              </div>

              {expandedSections.explanations && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.routeExplanations.map((exp) => (
                    <div
                      key={exp.vehicleId}
                      className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{exp.vehicleId}</span>
                          <span className="text-slate-400">({exp.driverName})</span>
                        </div>
                        <span className="font-mono text-[11px] text-teal-300">
                          {exp.assignedStopsCount} stops • {exp.assignedLoadKg} kg ({exp.capacityUtilizationPercent}%)
                        </span>
                      </div>

                      <p className="text-slate-300 leading-relaxed">{exp.rationale}</p>
                      <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800/80">
                        <strong className="text-slate-300">Stop Sequence Rationale:</strong> {exp.stopSequenceNote}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Category C: Delivery Risks */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <button
                type="button"
                onClick={() => toggleSection('risks')}
                className="flex items-center gap-2 text-sm font-bold text-slate-100 uppercase tracking-wider hover:text-teal-300 transition-colors cursor-pointer text-left"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Category C: Delivery Risks &amp; Bottlenecks ({report.identifiedRisks.length})</span>
                {expandedSections.risks ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Severity Filter Tabs */}
              <div className="flex items-center gap-1.5 text-xs">
                {(['all', 'high', 'medium', 'low'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setRiskSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all cursor-pointer ${
                      riskSeverityFilter === sev
                        ? 'bg-slate-800 text-teal-300 border border-teal-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {expandedSections.risks && (
              <>
                {filteredRisks.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No risks detected matching filter '{riskSeverityFilter}'.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRisks.map((risk) => {
                      const severityBadge = {
                        high: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
                        medium: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                        low: 'bg-slate-800 text-slate-300 border-slate-700',
                      }[risk.severity];

                      return (
                        <div
                          key={risk.id}
                          className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs space-y-2.5 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${severityBadge}`}
                              >
                                {risk.severity} Severity
                              </span>
                              <span className="font-semibold text-slate-100 text-sm">{risk.title}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 uppercase">
                              {risk.category}
                            </span>
                          </div>

                          <p className="text-slate-300 leading-relaxed">{risk.description}</p>

                          {/* Affected IDs (interactive tags) */}
                          {risk.affectedIds.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1">
                              <span className="text-slate-400 font-medium">Affected Entities:</span>
                              {risk.affectedIds.map((id) => (
                                <button
                                  key={id}
                                  onClick={() => setSelectedEntityId(id)}
                                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-700 hover:border-teal-500/50 font-mono transition-colors cursor-pointer"
                                  title={`Inspect ${id}`}
                                >
                                  {id}
                                </button>
                              ))}
                            </div>
                          )}

                          {risk.mitigationSuggestion && (
                            <div className="text-[11px] text-teal-200/90 bg-teal-500/5 border border-teal-500/20 rounded p-2.5 flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                              <div>
                                <strong className="text-teal-300">Suggested Mitigation:</strong>{' '}
                                {risk.mitigationSuggestion}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Category D: Improvement Recommendations */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <button
                type="button"
                onClick={() => toggleSection('recommendations')}
                className="flex items-center gap-2 text-sm font-bold text-slate-100 uppercase tracking-wider hover:text-teal-300 transition-colors cursor-pointer text-left"
              >
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span>Category D: Prioritized Improvement Recommendations ({report.recommendations.length})</span>
                {expandedSections.recommendations ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>

            {expandedSections.recommendations && (
              <div className="space-y-3">
                {report.recommendations.map((rec) => {
                  const categoryBadge = {
                    'rerun-optimizer': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
                    'dispatcher-action': 'bg-teal-500/10 text-teal-300 border-teal-500/30',
                    'fleet-adjustment': 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
                  }[rec.actionCategory];

                  return (
                    <div
                      key={rec.id}
                      className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-teal-500/10 text-teal-300 font-bold text-xs flex items-center justify-center border border-teal-500/30">
                            #{rec.priority}
                          </span>
                          <h4 className="font-semibold text-slate-100 text-sm">{rec.title}</h4>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${categoryBadge}`}
                        >
                          {rec.actionCategory.replace('-', ' ')}
                        </span>
                      </div>

                      <p className="text-slate-300 leading-relaxed pl-8">{rec.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8 text-[11px]">
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-2 text-emerald-200">
                          <strong className="text-emerald-300">Expected Benefit:</strong> {rec.expectedBenefit}
                        </div>
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded p-2 text-amber-200">
                          <strong className="text-amber-300">Operational Trade-off:</strong> {rec.tradeOff}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category E: Data Quality & Disclosed Limitations */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <button
                type="button"
                onClick={() => toggleSection('limitations')}
                className="flex items-center gap-2 text-sm font-bold text-slate-100 uppercase tracking-wider hover:text-teal-300 transition-colors cursor-pointer text-left"
              >
                <Info className="w-4 h-4 text-slate-400" />
                <span>Category E: Data Quality &amp; Model Disclosures</span>
                {expandedSections.limitations ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              <span className="text-xs text-slate-400">Auditable assumptions</span>
            </div>

            {expandedSections.limitations && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {report.dataQualityLimitations.map((lim, i) => (
                  <div key={i} className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-1">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <span>{lim.factor}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{lim.impact}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Affected Entity Modal */}
      <AffectedEntityModal
        isOpen={!!selectedEntityId}
        onClose={() => setSelectedEntityId(null)}
        entityId={selectedEntityId}
        orders={orders}
        vehicles={vehicles}
      />

      {/* AI Verification Suite Modal */}
      <AiVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
      />
    </div>
  );
};

