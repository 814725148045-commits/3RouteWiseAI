import React from 'react';
import {
  LayoutDashboard,
  Package,
  Truck,
  Route,
  Sparkles,
  LifeBuoy,
  Settings,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Compass,
} from 'lucide-react';
import { NavigationPage } from '../../types';

interface SidebarProps {
  currentPage: NavigationPage;
  onSelectPage: (page: NavigationPage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavigationPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isReadyInModule1: boolean;
  moduleBadge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, isReadyInModule1: true },
  { id: 'orders', label: 'Orders', icon: Package, isReadyInModule1: true },
  { id: 'fleet', label: 'Fleet', icon: Truck, isReadyInModule1: true },
  { id: 'planner', label: 'Route Planner', icon: Route, isReadyInModule1: true },
  { id: 'insights', label: 'AI Insights', icon: Sparkles, isReadyInModule1: true },
  { id: 'rescue', label: 'Route Rescue', icon: LifeBuoy, isReadyInModule1: true, moduleBadge: 'Active' },
  { id: 'settings', label: 'Settings', icon: Settings, isReadyInModule1: false },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 flex flex-col h-screen bg-[#0d1527] border-r border-slate-800/80 transition-all duration-200 select-none ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shrink-0 shadow-sm shadow-teal-500/10">
              <Compass className="w-5 h-5 text-teal-400" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold tracking-tight text-white truncate">
                  RouteWise <span className="text-teal-400 font-extrabold">AI</span>
                </span>
                <span className="text-[11px] font-medium text-slate-400 truncate">
                  Smart Delivery Ops
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex items-center justify-center w-7 h-7 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Operations Center
            </div>
          )}

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectPage(item.id);
                  onCloseMobile();
                }}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-xs shadow-teal-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                } ${collapsed ? 'justify-center' : 'justify-between'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!collapsed && item.moduleBadge && (
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded text-slate-400 bg-slate-800/80 border border-slate-700/50">
                    {item.moduleBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modules 1–5 Active Banner */}
        <div className="p-3 border-t border-slate-800/80 shrink-0">
          {!collapsed ? (
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-teal-400">
                  <Boxes className="w-3.5 h-3.5" /> Modules 1–6 Active
                </span>
                <span className="font-mono text-[10px] text-slate-400">v1.6</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Route Rescue, Gemini AI insights, optimization, fleet, and orders active.
              </p>
            </div>
          ) : (
            <div className="flex justify-center" title="Modules 1–6 Active">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
