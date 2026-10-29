import React from 'react';
import {
  Package,
  Truck,
  Route,
  Sparkles,
  LifeBuoy,
  Settings,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { NavigationPage } from '../../types';

interface ModulePlaceholderProps {
  page: NavigationPage;
  onReturnToDashboard: () => void;
}

interface ModuleInfo {
  title: string;
  moduleNumber: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  description: string;
  plannedFeatures: string[];
  technicalApproach: string;
}

const MODULE_DETAILS: Record<Exclude<NavigationPage, 'dashboard' | 'orders' | 'fleet' | 'planner' | 'insights'>, ModuleInfo> = {
  rescue: {
    title: 'Route Rescue — Dynamic Re-Optimization',
    moduleNumber: 'Module 6',
    icon: LifeBuoy,
    tagline: 'Real-time vehicle breakdown recovery and urgent hot-insertions',
    description:
      'Operations never go strictly to plan. Route Rescue dynamically re-allocates undelivered stops to nearby vehicles with remaining capacity when a breakdown, delay, or emergency priority order occurs.',
    plannedFeatures: [
      'One-click vehicle breakdown rescue with automatic load reallocation',
      'Emergency VIP order hot-insertion into active driver itineraries',
      'Minimum disruption heuristic to preserve existing customer ETAs',
      'Live dispatcher emergency broadcast notifications',
    ],
    technicalApproach:
      'Calculates incremental insertion costs across available fleet units while ensuring vehicle weight limits are never breached.',
  },
  settings: {
    title: 'System Settings & Constraints',
    moduleNumber: 'Settings',
    icon: Settings,
    tagline: 'Operational defaults, SLA thresholds, and dispatch rules',
    description:
      'Configure warehouse depot locations, default speed assumptions, maximum shift limits, working hours, and API integrations.',
    plannedFeatures: [
      'Depot coordinates and loading dock turnaround time defaults',
      'SLA buffer settings and on-time penalty thresholds',
      'Export formats (GeoJSON, CSV, JSON dispatch manifest)',
      'Theme preferences and regional date/time formats',
    ],
    technicalApproach:
      'Centralized configuration store managing parameters for the subsequent optimization modules.',
  },
};

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  page,
  onReturnToDashboard,
}) => {
  if (
    page === 'dashboard' ||
    page === 'orders' ||
    page === 'fleet' ||
    page === 'planner' ||
    page === 'insights'
  )
    return null;

  const info = MODULE_DETAILS[page as keyof typeof MODULE_DETAILS];
  if (!info) return null;
  const Icon = info.icon;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-200">
      {/* Return button */}
      <button
        onClick={onReturnToDashboard}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Fleet Overview Dashboard</span>
      </button>

      {/* Hero card */}
      <div className="rounded-xl bg-[#0f172a] border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-6 md:p-8 border-b border-slate-800 bg-gradient-to-br from-slate-900/90 to-[#0b1329]">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
              <Clock className="w-3.5 h-3.5" /> Scheduled for Next Module
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {info.moduleNumber}
            </span>
          </div>

          <div className="flex items-start gap-4 mt-2">
            <div className="w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                {info.title}
              </h2>
              <p className="text-sm text-teal-400 font-medium mt-1">{info.tagline}</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 mt-4 leading-relaxed max-w-2xl">
            {info.description}
          </p>
        </div>

        {/* Planned Features */}
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" /> Planned Architectural Capabilities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {info.plannedFeatures.map((feat: string, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300 leading-normal">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Architecture */}
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/90 text-xs">
            <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1.5">
              <Cpu className="w-4 h-4 text-teal-400" />
              <span>RouteWise AI Architecture Contract</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              {info.technicalApproach}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Currently testing <span className="text-white font-medium">Modules 1, 2 &amp; 3 (Dashboard, Orders &amp; Fleet)</span>
            </div>
            <button
              onClick={onReturnToDashboard}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors shadow-xs"
            >
              Explore Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
