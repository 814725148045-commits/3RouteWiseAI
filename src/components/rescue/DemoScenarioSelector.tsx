/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Truck, Zap, AlertOctagon, HelpCircle } from 'lucide-react';

export type DemoScenarioKey = 'scenario-a' | 'scenario-b' | 'scenario-c';

interface DemoScenarioSelectorProps {
  onLoadScenario: (scenario: DemoScenarioKey) => void;
  isLoading: boolean;
}

export const DemoScenarioSelector: React.FC<DemoScenarioSelectorProps> = ({
  onLoadScenario,
  isLoading,
}) => {
  const [confirmScenario, setConfirmScenario] = useState<DemoScenarioKey | null>(null);

  const scenarios: {
    key: DemoScenarioKey;
    title: string;
    badge: string;
    badgeColor: string;
    icon: React.ComponentType<{ className?: string }>;
    desc: string;
  }[] = [
    {
      key: 'scenario-a',
      title: 'Scenario A: Vehicle Breakdown with Fleet Absorption',
      badge: 'Solvable Reassignment',
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      icon: Truck,
      desc: 'VAN-101 suffers a flat tire with 4 active deliveries. Surviving vans have spare payload capacity to absorb displaced cargo.',
    },
    {
      key: 'scenario-b',
      title: 'Scenario B: Urgent Priority Medical Drop Insertion',
      badge: 'Tight Deadline SLA',
      badgeColor: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
      icon: Zap,
      desc: 'Urgent 15kg cold-chain medical parcel arrives with a strict 11:30 AM deadline. Evaluates slotting into existing vehicle loops.',
    },
    {
      key: 'scenario-c',
      title: 'Scenario C: Heavy Breakdown with Infeasible Deficit',
      badge: 'Capacity Bottleneck',
      badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      icon: AlertOctagon,
      desc: 'Heavy cargo van (VAN-103) breaks down carrying 350kg. Remaining fleet capacity is insufficient, triggering honest infeasibility alerts.',
    },
  ];

  const handleSelectScenario = (key: DemoScenarioKey) => {
    setConfirmScenario(key);
  };

  const handleConfirm = () => {
    if (confirmScenario) {
      onLoadScenario(confirmScenario);
      setConfirmScenario(null);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-teal-400" />
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Simulated Demo Scenarios (Interactive Sandbox)
          </h4>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          3 Auditable Production Benchmarks
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          return (
            <div
              key={sc.key}
              className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
                    <Icon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>{sc.title.split(':')[0]}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${sc.badgeColor}`}
                  >
                    {sc.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{sc.desc}</p>
              </div>

              <button
                onClick={() => handleSelectScenario(sc.key)}
                disabled={isLoading}
                className="w-full mt-2 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-teal-500/20 hover:text-teal-300 text-slate-300 border border-slate-700 hover:border-teal-500/40 transition-colors cursor-pointer disabled:opacity-50"
              >
                Load {sc.title.split(':')[0]}
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmScenario && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-100">
            <h4 className="font-bold text-slate-100 text-sm">
              Confirm Loading Demo Scenario
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Loading this scenario will configure orders, fleet status, and a simulated incident to demonstrate this specific operational recovery benchmark. Are you ready to proceed?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmScenario(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 cursor-pointer disabled:opacity-50"
              >
                Load Scenario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
