/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { OptimizationSettings } from '../../services/routing/types';
import { Sliders, RotateCcw, Clock, Gauge, Truck, Target } from 'lucide-react';
import { DEFAULT_OPTIMIZATION_SETTINGS } from '../../services/routing/optimizer';

interface OptimizationSettingsDrawerProps {
  settings: OptimizationSettings;
  onChangeSettings: (settings: OptimizationSettings) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const OptimizationSettingsDrawer: React.FC<OptimizationSettingsDrawerProps> = ({
  settings,
  onChangeSettings,
  isOpen,
  onToggle,
}) => {
  const handleReset = () => {
    onChangeSettings({ ...DEFAULT_OPTIMIZATION_SETTINGS });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg transition-all">
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-teal-400" />
          <span className="text-sm font-semibold text-slate-200">
            Routing Engine Parameters & Operational Constraints
          </span>
          <span className="text-xs text-slate-400">
            ({settings.objective === 'distance' ? 'Min. Distance' : 'Min. Time'}, {settings.averageSpeedKmH} km/h, {settings.serviceTimeMinutes}m service)
          </span>
        </div>
        <span className="text-xs text-teal-400 font-medium">
          {isOpen ? 'Collapse Settings' : 'Configure Parameters'}
        </span>
      </button>

      {/* Expanded Controls */}
      {isOpen && (
        <div className="p-5 border-t border-slate-800/80 bg-slate-950/60 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Optimization Objective */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-teal-400" />
                Optimization Objective
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, objective: 'distance' })}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                    settings.objective === 'distance'
                      ? 'bg-teal-500/20 border-teal-500/50 text-teal-200 ring-1 ring-teal-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Min. Distance (km)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, objective: 'time' })}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                    settings.objective === 'time'
                      ? 'bg-teal-500/20 border-teal-500/50 text-teal-200 ring-1 ring-teal-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Min. Travel Time
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                {settings.objective === 'distance'
                  ? 'Minimizes road travel distance (km). Evaluates candidate legs in kilometers with geometric tie-breaking.'
                  : 'Minimizes total transit duration plus service dwell time (minutes). Evaluates candidates in minutes with SLA deadline and fleet duration tie-breaking.'}
              </p>
            </div>

            {/* 2. Estimated Average Speed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-teal-400" />
                  Average Transit Speed
                </label>
                <span className="text-xs font-mono font-semibold text-teal-300">
                  {settings.averageSpeedKmH} km/h
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="75"
                step="5"
                value={settings.averageSpeedKmH}
                onChange={(e) =>
                  onChangeSettings({ ...settings, averageSpeedKmH: Number(e.target.value) })
                }
                className="w-full accent-teal-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Urban road transit pace used for deterministic ETA computations.
              </p>
            </div>

            {/* 3. Service Time Per Stop */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  Service Time per Stop
                </label>
                <span className="text-xs font-mono font-semibold text-teal-300">
                  {settings.serviceTimeMinutes} min
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="30"
                step="1"
                value={settings.serviceTimeMinutes}
                onChange={(e) =>
                  onChangeSettings({ ...settings, serviceTimeMinutes: Number(e.target.value) })
                }
                className="w-full accent-teal-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Average dwell time required for unloading, signature capture, and customer handoff.
              </p>
            </div>

            {/* 4. Fleet Scope */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-teal-400" />
                Fleet Vehicle Eligibility
              </label>
              <select
                value={settings.fleetScope}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    fleetScope: e.target.value as 'operational' | 'available-only',
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="operational">
                  All Operational Units (Available & On Route)
                </option>
                <option value="available-only">
                  Available Staged Units Only
                </option>
              </select>
              <p className="text-[11px] text-slate-400">
                Maintenance and Offline vehicles are strictly excluded under all scopes.
              </p>
            </div>

            {/* 5. Depot Departure Time */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                Morning Departure Time
              </label>
              <input
                type="text"
                value={settings.depotDepartureTime}
                onChange={(e) =>
                  onChangeSettings({ ...settings, depotDepartureTime: e.target.value })
                }
                placeholder="08:30 AM"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <p className="text-[11px] text-slate-400">
                Base timestamp from which all progressive delivery ETAs are sequenced.
              </p>
            </div>

            {/* 6. 2-Opt Iterations Limit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-teal-400" />
                  Max 2-Opt Improvement Passes
                </label>
                <span className="text-xs font-mono font-semibold text-teal-300">
                  {settings.maxIterations2Opt}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={settings.maxIterations2Opt}
                onChange={(e) =>
                  onChangeSettings({ ...settings, maxIterations2Opt: Number(e.target.value) })
                }
                className="w-full accent-teal-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Number of pairwise edge-exchange iterations to eliminate route path crossovers.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <p className="text-[11px] text-slate-400">
              <span className="text-teal-400 font-medium">Model Note:</span> Uses a synthetic 100x100 grid (1.25 km/unit, 1.35x circuity). Speed is constant, so transit time is affine to distance; the time objective differentiates by accounting for service dwell time (min), balancing vehicle workload, and using SLA deadline urgency to break ties.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="self-end sm:self-auto shrink-0 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800/60 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
