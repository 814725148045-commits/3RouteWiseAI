/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { VehicleRoutePlan } from '../../services/routing/types';
import { CENTRAL_DEPOT } from '../../data/demoData';
import { getOrderCoordinates } from '../../services/routing/travelCostMatrix';
import { MapPin, Navigation, Info, Eye } from 'lucide-react';

interface SchematicRouteVisualizerProps {
  routes: VehicleRoutePlan[];
  selectedVehicleId?: string;
  onSelectVehicle?: (vehicleId: string) => void;
}

export const SchematicRouteVisualizer: React.FC<SchematicRouteVisualizerProps> = ({
  routes,
  selectedVehicleId,
  onSelectVehicle,
}) => {
  const [hoveredStop, setHoveredStop] = useState<{
    orderId: string;
    customer: string;
    eta: string;
    vehicleId: string;
    x: number;
    y: number;
  } | null>(null);

  const activeRoutes = routes.filter((r) => r.stops.length > 0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-teal-400" />
            Optimized Route Network Schematic
          </h3>
          <p className="text-xs text-slate-400">
            Ordered dispatch loops originating from Central Logistics Depot (48, 48)
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {activeRoutes.map((r) => {
            const isSelected = selectedVehicleId === r.vehicle.id;
            return (
              <button
                key={r.vehicle.id}
                onClick={() => onSelectVehicle && onSelectVehicle(r.vehicle.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all text-xs font-medium cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 ring-1 ring-teal-400 text-teal-200'
                    : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: r.vehicle.color || '#14b8a6' }}
                />
                <span>{r.vehicle.id}</span>
                <span className="text-[10px] text-slate-400">({r.stops.length})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full aspect-16/10 bg-slate-950/90 rounded-lg border border-slate-800/80 overflow-hidden">
        {/* Subtle grid background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="plannerGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="rgba(30, 41, 59, 0.4)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#plannerGrid)" />
        </svg>

        {/* Interactive SVG */}
        <svg
          viewBox="0 0 100 100"
          className="relative w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Central Depot Glow & Marker */}
          <circle
            cx={CENTRAL_DEPOT.x}
            cy={CENTRAL_DEPOT.y}
            r="4.5"
            className="fill-teal-500/20 stroke-teal-400/60"
            strokeWidth="0.8"
          />
          <circle
            cx={CENTRAL_DEPOT.x}
            cy={CENTRAL_DEPOT.y}
            r="2.2"
            className="fill-teal-400 stroke-slate-950"
            strokeWidth="0.6"
          />
          <text
            x={CENTRAL_DEPOT.x}
            y={CENTRAL_DEPOT.y - 3.8}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize="2.4"
            fontWeight="bold"
            className="select-none"
          >
            DEPOT
          </text>

          {/* Vehicle Route Paths */}
          {activeRoutes.map((route) => {
            const isHighlighted = !selectedVehicleId || selectedVehicleId === route.vehicle.id;
            const opacity = isHighlighted ? 1 : 0.2;
            const strokeColor = route.vehicle.color || '#14b8a6';

            // Build path points: Depot -> Stop1 -> ... -> StopN -> Depot
            const points = [
              { x: CENTRAL_DEPOT.x, y: CENTRAL_DEPOT.y },
              ...route.stops.map((s) => getOrderCoordinates(s.order)),
              { x: CENTRAL_DEPOT.x, y: CENTRAL_DEPOT.y },
            ];

            const pathD = points.reduce((acc, pt, idx) => {
              return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
            }, '');

            return (
              <g key={`path-${route.vehicle.id}`} opacity={opacity} className="transition-opacity duration-200">
                {/* Outer route path stroke */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isHighlighted ? 0.9 : 0.4}
                  strokeDasharray="1.5, 0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all"
                />

                {/* Delivery Stop Markers */}
                {route.stops.map((stop) => {
                  const pt = getOrderCoordinates(stop.order);
                  const isHovered = hoveredStop?.orderId === stop.order.id;

                  return (
                    <g
                      key={`stop-${stop.order.id}`}
                      onMouseEnter={() =>
                        setHoveredStop({
                          orderId: stop.order.id,
                          customer: stop.order.customerName,
                          eta: stop.estimatedArrival,
                          vehicleId: route.vehicle.id,
                          x: pt.x,
                          y: pt.y,
                        })
                      }
                      onMouseLeave={() => setHoveredStop(null)}
                      className="cursor-pointer group"
                    >
                      {/* Pulse circle on hover */}
                      {isHovered && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="3"
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="0.6"
                          className="animate-ping"
                        />
                      )}

                      {/* Main node */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 2.2 : 1.7}
                        fill={strokeColor}
                        stroke="#090e1a"
                        strokeWidth="0.5"
                        className="transition-transform"
                      />

                      {/* Stop Sequence Number */}
                      <text
                        x={pt.x}
                        y={pt.y + 0.6}
                        textAnchor="middle"
                        fill="#090e1a"
                        fontSize="1.4"
                        fontWeight="bold"
                        className="select-none pointer-events-none"
                      >
                        {stop.stopIndex}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredStop && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-900/95 border border-teal-500/50 rounded-md px-2.5 py-1.5 text-xs shadow-xl backdrop-blur-sm -translate-x-1/2 -translate-y-full mb-2"
            style={{
              left: `${hoveredStop.x}%`,
              top: `${hoveredStop.y}%`,
            }}
          >
            <div className="font-semibold text-teal-300 flex items-center gap-1">
              <span>{hoveredStop.orderId}</span>
              <span className="text-[10px] text-slate-400">({hoveredStop.vehicleId})</span>
            </div>
            <div className="text-slate-200 text-[11px] truncate max-w-44">
              {hoveredStop.customer}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
              <span>Est. Arrival:</span>
              <span className="text-emerald-400 font-medium">{hoveredStop.eta}</span>
            </div>
          </div>
        )}
      </div>

      {/* Disclosed Transparent Model Disclaimer */}
      <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        <Info className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-300">Model Disclosure:</strong> Synthetic coordinate
          space with Euclidean road winding factor (1 unit ≈ 1.25 km, 1.35x circuity). Not live
          turn-by-turn road GPS navigation.
        </span>
      </div>
    </div>
  );
};
