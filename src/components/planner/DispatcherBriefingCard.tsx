/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GeminiInsightPayload } from '../../services/routing/types';
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface DispatcherBriefingCardProps {
  insight: GeminiInsightPayload;
}

export const DispatcherBriefingCard: React.FC<DispatcherBriefingCardProps> = ({ insight }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Dispatcher AI Briefing
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Rule-Based Engine (Mod 4)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Deterministic operational telemetry prepared for Module 5 Gemini integration
            </p>
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 leading-relaxed">
        {insight.summary}
      </div>

      {/* Key Highlights */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Optimization Highlights
        </h4>
        <div className="space-y-1.5">
          {insight.keyHighlights.map((hl, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
              <span>{hl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle Efficiency Breakdown */}
      {insight.vehicleEfficiencyAnalysis.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-800/60">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Vehicle Fleet Balancing
          </h4>
          <div className="space-y-2">
            {insight.vehicleEfficiencyAnalysis.map((veh) => {
              const ratingBadge = {
                optimal: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                balanced: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
                underutilized: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                overloaded: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
              }[veh.efficiencyRating];

              return (
                <div
                  key={veh.vehicleId}
                  className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-2.5 text-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{veh.vehicleId}</span>
                      <span className="text-slate-400 text-[11px]">({veh.driverName})</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{veh.reason}</p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide ${ratingBadge}`}
                  >
                    {veh.efficiencyRating}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottlenecks and Risks */}
      {insight.bottlenecksAndRisks.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-800/60">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Detected Operational Risks
          </h4>
          <div className="space-y-1.5">
            {insight.bottlenecksAndRisks.map((risk, idx) => (
              <div
                key={idx}
                className="text-xs text-rose-200/90 bg-rose-500/10 border border-rose-500/20 rounded p-2 flex items-start gap-2"
              >
                <span className="text-rose-400 font-bold">•</span>
                <span>{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {insight.recommendations.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Dispatcher Directives
          </h4>
          <ul className="space-y-1 text-xs text-slate-300">
            {insight.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <ArrowRight className="w-3 h-3 text-teal-400 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
