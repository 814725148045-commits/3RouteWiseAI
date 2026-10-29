/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GeminiAiInsightsReport } from '../../services/ai/insightsTypes';
import { Sparkles, AlertTriangle, ArrowRight, ShieldCheck, Clock, RefreshCw, Zap } from 'lucide-react';

interface AiInsightsSummaryCardProps {
  report: GeminiAiInsightsReport | null;
  isStale: boolean;
  onNavigateToInsights: () => void;
  onRefreshInsights: () => void;
  isLoading: boolean;
}

export const AiInsightsSummaryCard: React.FC<AiInsightsSummaryCardProps> = ({
  report,
  isStale,
  onNavigateToInsights,
  onRefreshInsights,
  isLoading,
}) => {
  if (!report) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              RouteWise AI Insights
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Module 5 Ready
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Generate Gemini-powered operational explanations, risk telemetry, and recommendations.
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToInsights}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 transition-all shadow-md shadow-teal-500/20 cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 fill-current" />
          <span>Generate First AI Analysis</span>
        </button>
      </div>
    );
  }

  const topRecommendation = report.recommendations[0];
  const highRisksCount = report.identifiedRisks.filter((r) => r.severity === 'high').length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Gemini AI Insights Summary
              {isStale ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Data Changed (Stale)
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                  Current
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {new Date(report.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span>•</span>
              <span className="font-mono text-slate-400">{report.modelName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStale && (
            <button
              onClick={onRefreshInsights}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Insights</span>
            </button>
          )}

          <button
            onClick={onNavigateToInsights}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
          >
            <span>View Full Analysis</span>
            <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Identified Risks */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Identified Risks
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-xl font-bold ${
                report.identifiedRisks.length > 0 ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {report.identifiedRisks.length}
            </span>
            {highRisksCount > 0 && (
              <span className="text-[10px] text-rose-300 font-semibold">({highRisksCount} High)</span>
            )}
          </div>
        </div>

        {/* Unassigned Orders */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Unassigned Orders
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-xl font-bold ${
                report.verifiedMetrics.unassignedOrdersCount > 0 ? 'text-amber-400' : 'text-slate-100'
              }`}
            >
              {report.verifiedMetrics.unassignedOrdersCount}
            </span>
            <span className="text-[10px] text-slate-400">of {report.verifiedMetrics.totalEligibleOrders}</span>
          </div>
        </div>

        {/* Deadline Warnings */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-teal-400" />
            Deadline Warnings
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-xl font-bold ${
                report.verifiedMetrics.deadlineWarningsCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {report.verifiedMetrics.deadlineWarningsCount}
            </span>
            <span className="text-[10px] text-slate-400">stops</span>
          </div>
        </div>

        {/* Fleet Utilization */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Fleet Load Assigned
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-teal-300">
              {report.verifiedMetrics.totalAssignedLoadKg} kg
            </span>
          </div>
        </div>
      </div>

      {/* Top Recommendation Banner */}
      {topRecommendation && (
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex items-start gap-3 text-xs">
          <div className="w-6 h-6 rounded-md bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
            #1
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-200">{topRecommendation.title}</div>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{topRecommendation.description}</p>
            <div className="flex items-center gap-2 text-[10px] text-teal-300 font-medium mt-1">
              <span>Expected Benefit: {topRecommendation.expectedBenefit}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
