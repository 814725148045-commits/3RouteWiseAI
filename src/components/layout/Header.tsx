import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Menu,
  RotateCcw,
  Download,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  X,
} from 'lucide-react';

import { NavigationPage } from '../../types';

interface HeaderProps {
  currentPage?: NavigationPage;
  onOpenMobileSidebar: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAddOrder: () => void;
  onResetData: () => void;
  onExportData: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'warning' | 'success' | 'info';
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'High Load Alert',
    message: 'VAN-103 has reached 94% payload capacity on Metro East route.',
    time: '8m ago',
    type: 'warning',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Priority Handoff',
    message: 'ORD-8022 (Urgent) dispatched for Apex Biotech Labs.',
    time: '24m ago',
    type: 'info',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Morning Wave Complete',
    message: 'Early delivery loops for North Sector completed on schedule.',
    time: '1h ago',
    type: 'success',
    read: true,
  },
];

export const Header: React.FC<HeaderProps> = ({
  currentPage = 'dashboard',
  onOpenMobileSidebar,
  searchQuery,
  onSearchChange,
  onOpenAddOrder,
  onResetData,
  onExportData,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Formatted date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Title & Subtitle mapping
  const getHeaderInfo = () => {
    switch (currentPage) {
      case 'insights':
        return {
          title: 'RouteWise AI Insights',
          subtitle: 'Understand your delivery operations with AI-powered explanations',
          badge: 'Module 5 Active',
        };
      case 'planner':
        return {
          title: 'AI Route Planner',
          subtitle: 'Optimize deliveries using vehicle capacity, delivery deadlines, and estimated travel costs',
          badge: 'Module 4 Active',
        };
      case 'fleet':
        return {
          title: 'Fleet Management',
          subtitle: 'Manage vehicles, capacities, and driver availability',
          badge: 'Module 3 Active',
        };
      case 'orders':
        return {
          title: 'Orders Management',
          subtitle: 'Create, track, and manage delivery requests',
          badge: 'Module 2 Active',
        };
      case 'dashboard':
      default:
        return {
          title: 'Fleet Overview',
          subtitle: 'Smart delivery operations at a glance',
          badge: 'Demo Workspace',
        };
    }
  };

  const headerInfo = getHeaderInfo();

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0b1329]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left zone: Mobile toggle + Page Titles */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white">
                {headerInfo.title}
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
                {headerInfo.badge}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal">
              {headerInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Center / Right zone: Search + Live Date + Actions + Profile */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Search field */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search deliveries or fleet..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-900/90 text-sm text-slate-200 placeholder-slate-400 rounded-lg border border-slate-700/60 focus:outline-hidden focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/30 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Current Working Date */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs text-slate-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            <span className="tabular-nums">{formattedDate}</span>
          </div>

          {/* Action: Reset Demo Dataset */}
          <button
            onClick={onResetData}
            title="Reload initial demo dataset"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900/90 hover:bg-slate-800 rounded-lg border border-slate-700/60 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Reset Demo</span>
          </button>

          {/* Action: Export JSON */}
          <button
            onClick={onExportData}
            title="Export delivery data as JSON"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900/90 hover:bg-slate-800 rounded-lg border border-slate-700/60 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Action: Add Order Button */}
          <button
            onClick={onOpenAddOrder}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 active:bg-teal-500 rounded-lg transition-colors shadow-xs shadow-teal-500/20"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>Add Order</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700/50"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
              )}
            </button>

            {/* Notification Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Operational Alerts</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-teal-400 hover:text-teal-300 font-medium"
                    >
                      Mark read
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 hover:bg-slate-800/40 transition-colors flex gap-3 ${
                        !n.read ? 'bg-slate-800/20' : ''
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {n.type === 'warning' && (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                        {n.type === 'success' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        {n.type === 'info' && <Info className="w-4 h-4 text-sky-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-semibold text-slate-200 truncate">{n.title}</p>
                          <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                            {n.time}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2 border-t border-slate-800 bg-slate-950/60 text-center">
                  <span className="text-[11px] text-slate-400">
                    Live alerts simulated for Module 1 Demo
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* User profile area */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-slate-950 font-bold text-xs ring-1 ring-teal-400/30 shadow-xs">
              AC
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-200">Alex Chen</span>
              <span className="text-[10px] text-slate-400">Operations Lead</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
