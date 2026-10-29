import React, { useState } from 'react';
import {
  MapPin,
  Building2,
  Navigation,
  Layers,
  Info,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DEMO_ROUTES, CENTRAL_DEPOT, RoutePath } from '../../data/demoData';
import { DeliveryOrder } from '../../types';

interface RouteMapOverviewProps {
  orders: DeliveryOrder[];
  onSelectOrder?: (orderId: string) => void;
}

export const RouteMapOverview: React.FC<RouteMapOverviewProps> = ({
  orders,
  onSelectOrder,
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<string | 'all'>('all');
  const [activeStop, setActiveStop] = useState<{
    label: string;
    orderId?: string;
    vehicleName?: string;
    color?: string;
    x: number;
    y: number;
  } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter routes based on selected vehicle
  const displayedRoutes =
    selectedVehicle === 'all'
      ? DEMO_ROUTES
      : DEMO_ROUTES.filter((r) => r.vehicleId === selectedVehicle);

  const handleStopClick = (point: { x: number; y: number; label: string; orderId?: string }, route: RoutePath) => {
    setActiveStop({
      ...point,
      vehicleName: route.vehicleName,
      color: route.color,
    });
    if (point.orderId && onSelectOrder) {
      onSelectOrder(point.orderId);
    }
  };

  return (
    <div
      className={`rounded-xl bg-[#0f172a] border border-slate-800 flex flex-col transition-all duration-200 overflow-hidden shadow-sm ${
        isExpanded ? 'col-span-full' : ''
      }`}
    >
      {/* Card Header */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Route Overview</h2>
            <p className="text-xs text-slate-400">
              Schematic distribution network and vehicle route paths
            </p>
          </div>
        </div>

        {/* Vehicle filter segmented tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              setSelectedVehicle('all');
              setActiveStop(null);
            }}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              selectedVehicle === 'all'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Loops
          </button>
          {DEMO_ROUTES.map((route) => {
            const isSelected = selectedVehicle === route.vehicleId;
            return (
              <button
                key={route.vehicleId}
                onClick={() => {
                  setSelectedVehicle(route.vehicleId);
                  setActiveStop(null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  isSelected
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: route.color }}
                />
                <span>{route.vehicleName}</span>
              </button>
            );
          })}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden sm:flex items-center justify-center p-1 text-slate-400 hover:text-slate-200 ml-1 rounded hover:bg-slate-800"
            title={isExpanded ? 'Collapse map view' : 'Expand full width'}
            aria-label="Toggle full width"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Illustrative Notice Banner */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 text-slate-400">
          <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>Note: Illustrative schematic map for planning demo — not live GPS navigation.</span>
        </span>
        <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">
          Grid: Metro Sector 4
        </span>
      </div>

      {/* SVG Map Canvas Area */}
      <div className="relative bg-[#090e1a] p-4 flex-1 flex flex-col justify-center items-center min-h-[380px] select-none overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

        <svg
          viewBox="0 0 100 100"
          className="w-full h-full max-h-[420px] filter drop-shadow-md overflow-visible relative z-10"
        >
          <defs>
            {/* Glow filters for routes */}
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="depotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
          </defs>

          {/* Schematic city arterial lines */}
          <g stroke="#1e293b" strokeWidth="0.3" strokeDasharray="1,1" fill="none">
            <line x1="5" y1="50" x2="95" y2="50" />
            <line x1="50" y1="5" x2="50" y2="95" />
            <circle cx="50" cy="50" r="28" />
            <circle cx="50" cy="50" r="42" />
            <path d="M 15 20 Q 50 40 85 25" />
            <path d="M 10 75 Q 40 65 90 80" />
          </g>

          {/* District boundary water/park zone */}
          <path
            d="M 5 35 Q 25 38 40 48 T 85 58 T 95 62 L 95 72 Q 75 66 50 56 T 5 45 Z"
            fill="#0f172a"
            opacity="0.6"
          />

          {/* Render Route Paths */}
          {displayedRoutes.map((route) => {
            const pathData = route.points.reduce(
              (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`,
              ''
            );

            return (
              <g key={`path-${route.vehicleId}`}>
                {/* Thick background route line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={route.color}
                  strokeWidth="0.8"
                  strokeOpacity="0.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#routeGlow)"
                />
                {/* Animated dash line to imply direction */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.3"
                  strokeOpacity="0.45"
                  strokeDasharray="1.2, 1.8"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Render Delivery Stop Markers */}
          {displayedRoutes.map((route) =>
            route.points.map((pt, pIdx) => {
              const isDepot = pt.label.includes('Hub');
              if (isDepot && pIdx > 0) return null; // Avoid duplicate depot markers

              const isSelected = activeStop?.label === pt.label;

              if (isDepot) {
                return (
                  <g
                    key={`depot-${pIdx}`}
                    className="cursor-pointer group"
                    onClick={() =>
                      setActiveStop({
                        label: CENTRAL_DEPOT.name,
                        vehicleName: 'Depot Base',
                        color: '#14b8a6',
                        x: CENTRAL_DEPOT.x,
                        y: CENTRAL_DEPOT.y,
                      })
                    }
                  >
                    {/* Pulsing ring around central hub */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="3.2"
                      fill="none"
                      stroke="#2dd4bf"
                      strokeWidth="0.3"
                      strokeOpacity="0.4"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="2"
                      fill="url(#depotGrad)"
                      stroke="#ffffff"
                      strokeWidth="0.4"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 3.2}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="2.1"
                      fontWeight="bold"
                      className="select-none font-sans"
                    >
                      Central Depot
                    </text>
                  </g>
                );
              }

              return (
                <g
                  key={`stop-${route.vehicleId}-${pIdx}`}
                  className="cursor-pointer group"
                  onClick={() => handleStopClick(pt, route)}
                >
                  {/* Outer selection ring if active */}
                  {isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="2.8"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="0.5"
                    />
                  )}
                  {/* Stop Marker Node */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="1.7"
                    fill="#0f172a"
                    stroke={route.color}
                    strokeWidth="0.7"
                    className="transition-transform duration-150 group-hover:scale-125"
                  />
                  <circle cx={pt.x} cy={pt.y} r="0.7" fill={route.color} />

                  {/* Marker label */}
                  <text
                    x={pt.x}
                    y={pt.y + 3.2}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="1.7"
                    fontWeight="500"
                    className="pointer-events-none select-none transition-all group-hover:fill-white font-sans"
                  >
                    {pt.label.length > 14 ? pt.label.substring(0, 12) + '..' : pt.label}
                  </text>
                </g>
              );
            })
          )}
        </svg>

        {/* Selected stop inspection popup overlay */}
        {activeStop && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-72 bg-slate-900/95 border border-slate-700/80 rounded-lg p-3 shadow-xl backdrop-blur-md z-20 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400">
                  {activeStop.vehicleName || 'Stop Point'}
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">{activeStop.label}</h4>
              </div>
              <button
                onClick={() => setActiveStop(null)}
                className="text-slate-400 hover:text-white text-xs px-1"
                aria-label="Dismiss stop details"
              >
                ✕
              </button>
            </div>
            {activeStop.orderId && (
              <div className="mt-2 pt-2 border-t border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-400">Order ID:</span>
                <span className="font-mono text-teal-300 font-semibold">{activeStop.orderId}</span>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Click &quot;View Details&quot; in the table below to inspect full delivery metadata.
            </p>
          </div>
        )}
      </div>

      {/* Map Legend & Summary Footer */}
      <div className="p-3.5 bg-slate-900/80 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {DEMO_ROUTES.map((route) => {
          const isSelected = selectedVehicle === 'all' || selectedVehicle === route.vehicleId;
          return (
            <div
              key={route.vehicleId}
              onClick={() => setSelectedVehicle(route.vehicleId)}
              className={`p-2 rounded-lg cursor-pointer transition-colors border ${
                isSelected
                  ? 'bg-slate-850 border-slate-700'
                  : 'bg-transparent border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: route.color }}
                />
                <span className="font-semibold text-slate-200 truncate">{route.vehicleName}</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{route.driverName}</p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>{route.points.length - 1} waypoints</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
