/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { VehicleRoutePlan, RouteStopPlan } from '../../services/routing/types';
import { UserProfile } from '../../types/user';
import {
  MapPin,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Info,
  Maximize2,
  Minimize2,
  Navigation,
  Compass,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Package,
} from 'lucide-react';

interface GoogleRouteMapProps {
  routes: VehicleRoutePlan[];
  userProfile: UserProfile;
  selectedVehicleId?: string;
  onSelectVehicle?: (vehicleId: string | undefined) => void;
  onSelectOrder?: (orderId: string) => void;
}

// Subcomponent to fit map bounds to current route stops and depot
function MapBoundsFitter({
  routes,
  depot,
  selectedVehicleId,
}: {
  routes: VehicleRoutePlan[];
  depot: UserProfile['depot'];
  selectedVehicleId?: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    try {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: depot.lat, lng: depot.lng });

      const filteredRoutes = selectedVehicleId
        ? routes.filter((r) => r.vehicle.id === selectedVehicleId)
        : routes;

      let stopsCount = 0;
      filteredRoutes.forEach((route) => {
        route.stops.forEach((stop) => {
          if (stop.order.lat && stop.order.lng) {
            bounds.extend({ lat: stop.order.lat, lng: stop.order.lng });
            stopsCount++;
          }
        });
      });

      if (stopsCount > 0) {
        map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      } else {
        map.setCenter({ lat: depot.lat, lng: depot.lng });
        map.setZoom(13);
      }
    } catch {
      // Fallback
    }
  }, [map, routes, depot, selectedVehicleId]);

  return null;
}

// Subcomponent to render vehicle polyline tracks on Google Maps
function RoutePolylines({
  routes,
  depot,
  selectedVehicleId,
}: {
  routes: VehicleRoutePlan[];
  depot: UserProfile['depot'];
  selectedVehicleId?: string;
}) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    // Clean up previous lines
    polylinesRef.current.forEach((line) => line.setMap(null));
    polylinesRef.current = [];

    const filteredRoutes = selectedVehicleId
      ? routes.filter((r) => r.vehicle.id === selectedVehicleId)
      : routes;

    filteredRoutes.forEach((r) => {
      if (r.stops.length === 0) return;

      const path: google.maps.LatLngLiteral[] = [
        { lat: depot.lat, lng: depot.lng },
      ];

      r.stops.forEach((s) => {
        if (s.order.lat && s.order.lng) {
          path.push({ lat: s.order.lat, lng: s.order.lng });
        }
      });

      // Loop back to depot
      path.push({ lat: depot.lat, lng: depot.lng });

      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: r.vehicle.color || '#0d9488',
        strokeOpacity: selectedVehicleId && selectedVehicleId !== r.vehicle.id ? 0.25 : 0.85,
        strokeWeight: selectedVehicleId === r.vehicle.id ? 5 : 3,
        map,
      });

      polylinesRef.current.push(polyline);
    });

    return () => {
      polylinesRef.current.forEach((line) => line.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, routes, depot, selectedVehicleId]);

  return null;
}

export const GoogleRouteMap: React.FC<GoogleRouteMapProps> = ({
  routes,
  userProfile,
  selectedVehicleId,
  onSelectVehicle,
  onSelectOrder,
}) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const hasValidMapsKey = Boolean(
    apiKey &&
      apiKey !== 'MY_GOOGLE_MAPS_API_KEY' &&
      apiKey !== 'undefined' &&
      apiKey.length > 10
  );

  const [activeTab, setActiveTab] = useState<'map' | 'schematic'>('map');
  const [selectedStop, setSelectedStop] = useState<{
    stop: RouteStopPlan;
    vehicleId: string;
    vehicleColor: string;
    stopIndex: number;
  } | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Active routes with at least 1 stop
  const activeRoutes = useMemo(() => {
    return routes.filter((r) => r.stops.length > 0);
  }, [routes]);

  const displayedRoutes = useMemo(() => {
    if (!selectedVehicleId) return activeRoutes;
    return activeRoutes.filter((r) => r.vehicle.id === selectedVehicleId);
  }, [activeRoutes, selectedVehicleId]);

  const totalAssignedStops = useMemo(() => {
    return routes.reduce((acc, r) => acc + r.stops.length, 0);
  }, [routes]);

  return (
    <div
      className={`bg-slate-900/95 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col transition-all duration-200 ${
        isExpanded ? 'fixed inset-4 z-50 rounded-2xl' : 'relative'
      }`}
    >
      {/* 1. Header Toolbar */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Interactive Route Map
              {hasValidMapsKey ? (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Google Maps API Active
                </span>
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Interactive Vector Road Map
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {userProfile.city} · Depot: <strong className="text-slate-300">{userProfile.depot.name}</strong> ({totalAssignedStops} stops)
            </p>
          </div>
        </div>

        {/* Action Controls & Legend */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Key status & setup trigger */}
          {!hasValidMapsKey && (
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-md transition-all cursor-pointer"
              title="Click to view Google Maps API key instructions"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Map Key Info</span>
            </button>
          )}

          {/* Toggle between Vector Map and Schematic View */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Road Map
            </button>
            <button
              onClick={() => setActiveTab('schematic')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                activeTab === 'schematic'
                  ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Schematic
            </button>
          </div>

          {/* Expand / Minimize */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title={isExpanded ? 'Minimize Map' : 'Full Screen Map'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Vehicle Route Selector Pills */}
      <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mr-1">
          Vehicle Filter:
        </span>
        <button
          onClick={() => onSelectVehicle && onSelectVehicle(undefined)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
            !selectedVehicleId
              ? 'bg-slate-800 text-white border border-teal-500/50 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          All Routes ({activeRoutes.length})
        </button>

        {activeRoutes.map((r) => {
          const isSelected = selectedVehicleId === r.vehicle.id;
          return (
            <button
              key={r.vehicle.id}
              onClick={() =>
                onSelectVehicle &&
                onSelectVehicle(isSelected ? undefined : r.vehicle.id)
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 ring-1 ring-teal-400 text-teal-200 shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: r.vehicle.color || '#0d9488' }}
              />
              <span>{r.vehicle.id}</span>
              <span className="text-[10px] text-slate-400">
                ({r.stops.length} stops · {r.totalDistanceKm}km)
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Map Viewport Canvas */}
      <div className={`relative w-full ${isExpanded ? 'flex-1' : 'h-[440px]'} bg-slate-950 overflow-hidden`}>
        {activeTab === 'map' && hasValidMapsKey ? (
          /* LIVE GOOGLE MAPS PLATFORM EMBED */
          <APIProvider apiKey={apiKey} solutionChannel="GMP_aistudio">
            <Map
              defaultCenter={userProfile.defaultCenter}
              defaultZoom={userProfile.defaultCenter.zoom}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              gestureHandling="greedy"
              disableDefaultUI={false}
              className="w-full h-full"
            >
              <MapBoundsFitter
                routes={routes}
                depot={userProfile.depot}
                selectedVehicleId={selectedVehicleId}
              />
              <RoutePolylines
                routes={routes}
                depot={userProfile.depot}
                selectedVehicleId={selectedVehicleId}
              />

              {/* Depot Marker */}
              <AdvancedMarker
                position={{ lat: userProfile.depot.lat, lng: userProfile.depot.lng }}
                title={`Depot: ${userProfile.depot.name}`}
              >
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center font-bold shadow-lg border-2 border-white ring-2 ring-teal-500/50">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[10px] font-semibold text-teal-300 whitespace-nowrap shadow-sm">
                    {userProfile.depot.name}
                  </div>
                </div>
              </AdvancedMarker>

              {/* Delivery Stop Markers */}
              {displayedRoutes.map((route) =>
                route.stops.map((stop, stopIdx) => {
                  if (!stop.order.lat || !stop.order.lng) return null;
                  const isLate = stop.isLate;

                  return (
                    <AdvancedMarker
                      key={stop.order.id}
                      position={{ lat: stop.order.lat, lng: stop.order.lng }}
                      onClick={() =>
                        setSelectedStop({
                          stop,
                          vehicleId: route.vehicle.id,
                          vehicleColor: route.vehicle.color,
                          stopIndex: stopIdx + 1,
                        })
                      }
                    >
                      <div className="flex flex-col items-center cursor-pointer group">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md border-2 border-slate-900 transition-transform group-hover:scale-115 ${
                            isLate ? 'ring-2 ring-amber-400 animate-pulse' : ''
                          }`}
                          style={{ backgroundColor: route.vehicle.color }}
                        >
                          {stopIdx + 1}
                        </div>
                        {isLate && (
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-950 -mt-1" />
                        )}
                      </div>
                    </AdvancedMarker>
                  );
                })
              )}

              {/* Selected Stop InfoWindow */}
              {selectedStop && selectedStop.stop.order.lat && selectedStop.stop.order.lng && (
                <InfoWindow
                  position={{
                    lat: selectedStop.stop.order.lat,
                    lng: selectedStop.stop.order.lng,
                  }}
                  onCloseClick={() => setSelectedStop(null)}
                >
                  <div className="p-1 max-w-xs text-slate-900 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                      <span className="font-bold text-sm text-teal-700">
                        Stop #{selectedStop.stopIndex} · {selectedStop.stop.order.id}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                        style={{ backgroundColor: selectedStop.vehicleColor }}
                      >
                        {selectedStop.vehicleId}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800">
                      {selectedStop.stop.order.customerName}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {selectedStop.stop.order.destination}
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-500">ETA:</span>{' '}
                        <strong className="text-slate-800">{selectedStop.stop.estimatedArrival}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Window:</span>{' '}
                        <span className="text-slate-700">
                          {selectedStop.stop.order.timeWindowEarliest || '08:00'} -{' '}
                          {selectedStop.stop.order.timeWindowLatest || selectedStop.stop.order.deliveryDeadline}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Weight:</span>{' '}
                        <span>{selectedStop.stop.order.weightKg} kg</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Service:</span>{' '}
                        <span>{selectedStop.stop.order.serviceTimeMinutes || 15} min</span>
                      </div>
                    </div>
                    {selectedStop.stop.isLate && (
                      <div className="mt-1 p-1 rounded bg-amber-50 text-amber-800 text-[10px] font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Violates customer time window SLA</span>
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        ) : (
          /* HIGH-FIDELITY INTERACTIVE VECTOR ROAD MAP SIMULATOR (Transparent Fallback) */
          <div className="relative w-full h-full select-none">
            {/* GIS Road Network Vector Canvas */}
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <defs>
                {/* City street grid pattern */}
                <pattern id="streetGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path
                    d="M 10 0 L 0 0 0 10"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="0.5"
                    strokeDasharray="1,1"
                  />
                </pattern>
                {/* Major arterial road pattern */}
                <pattern id="arterials" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path
                    d="M 25 0 L 0 0 0 25"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="0.8"
                  />
                </pattern>
                {/* Subtle water / bay feature */}
                <linearGradient id="bayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#082f49" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Background Map Canvas */}
              <rect width="100%" height="100%" fill="#0b1329" />
              <rect width="100%" height="100%" fill="url(#streetGrid)" opacity="0.6" />
              <rect width="100%" height="100%" fill="url(#arterials)" opacity="0.4" />

              {/* Stylized bay / river feature depending on city */}
              {userProfile.id === 'user-sf' && (
                <path
                  d="M 0 0 Q 30 15 60 5 Q 85 0 100 20 L 100 0 Z"
                  fill="url(#bayGradient)"
                />
              )}
              {userProfile.id === 'user-sea' && (
                <path
                  d="M 0 0 Q 20 50 15 100 L 0 100 Z"
                  fill="url(#bayGradient)"
                />
              )}
              {userProfile.id === 'user-atx' && (
                <path
                  d="M 0 55 Q 50 50 100 65 L 100 70 Q 50 55 0 60 Z"
                  fill="url(#bayGradient)"
                />
              )}

              {/* Active Vehicle Route Paths */}
              {displayedRoutes.map((route) => {
                if (route.stops.length === 0) return null;
                const depotX = userProfile.depot.x;
                const depotY = userProfile.depot.y;

                // Build path string: Depot -> Stop 1 -> Stop 2 -> ... -> Depot
                const points = [
                  { x: depotX, y: depotY },
                  ...route.stops.map((s) => ({
                    x: s.order.coordinates?.x ?? 50,
                    y: s.order.coordinates?.y ?? 50,
                  })),
                  { x: depotX, y: depotY },
                ];

                const d = points
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                  .join(' ');

                const isSelected = selectedVehicleId === route.vehicle.id;

                return (
                  <g key={`path-${route.vehicle.id}`}>
                    {/* Route line glow */}
                    <path
                      d={d}
                      fill="none"
                      stroke={route.vehicle.color || '#0d9488'}
                      strokeWidth={isSelected ? '2.5' : '1.4'}
                      strokeOpacity={isSelected ? '0.9' : selectedVehicleId ? '0.15' : '0.6'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Directional markers along legs */}
                    {points.slice(0, -1).map((p, i) => {
                      const next = points[i + 1];
                      const midX = (p.x + next.x) / 2;
                      const midY = (p.y + next.y) / 2;
                      return (
                        <circle
                          key={`mid-${route.vehicle.id}-${i}`}
                          cx={midX}
                          cy={midY}
                          r={isSelected ? '0.8' : '0.5'}
                          fill={route.vehicle.color || '#0d9488'}
                          opacity={isSelected ? '0.9' : selectedVehicleId ? '0.2' : '0.7'}
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Starting Depot Marker */}
              <g className="cursor-pointer">
                {/* Pulse ring */}
                <circle
                  cx={userProfile.depot.x}
                  cy={userProfile.depot.y}
                  r="3.5"
                  fill="#0d9488"
                  opacity="0.25"
                  className="animate-ping"
                />
                <circle
                  cx={userProfile.depot.x}
                  cy={userProfile.depot.y}
                  r="2.8"
                  fill="#0d9488"
                  stroke="#ffffff"
                  strokeWidth="0.6"
                />
                {/* Depot Icon Symbol */}
                <rect
                  x={userProfile.depot.x - 1.2}
                  y={userProfile.depot.y - 1.2}
                  width="2.4"
                  height="2.4"
                  fill="#090e1a"
                  rx="0.4"
                />
              </g>

              {/* Customer Delivery Stop Markers */}
              {displayedRoutes.map((route) =>
                route.stops.map((stop, stopIdx) => {
                  const x = stop.order.coordinates?.x ?? 50;
                  const y = stop.order.coordinates?.y ?? 50;
                  const isLate = stop.isLate;
                  const isSelected = selectedStop?.stop.order.id === stop.order.id;

                  return (
                    <g
                      key={`stop-marker-${stop.order.id}`}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedStop({
                          stop,
                          vehicleId: route.vehicle.id,
                          vehicleColor: route.vehicle.color,
                          stopIndex: stopIdx + 1,
                        });
                        if (onSelectOrder) {
                          onSelectOrder(stop.order.id);
                        }
                      }}
                    >
                      {/* Selection ring */}
                      {isSelected && (
                        <circle
                          cx={x}
                          cy={y}
                          r="3"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="0.6"
                        />
                      )}

                      {/* Stop Pin Circle */}
                      <circle
                        cx={x}
                        cy={y}
                        r="2.2"
                        fill={route.vehicle.color || '#0d9488'}
                        stroke="#090e1a"
                        strokeWidth="0.5"
                      />

                      {/* Stop Sequence Number */}
                      <text
                        x={x}
                        y={y + 0.7}
                        fontSize="1.8"
                        fontWeight="bold"
                        textAnchor="middle"
                        fill="#ffffff"
                        pointerEvents="none"
                      >
                        {stopIdx + 1}
                      </text>

                      {/* Late warning dot */}
                      {isLate && (
                        <circle
                          cx={x + 1.6}
                          cy={y - 1.6}
                          r="0.8"
                          fill="#f59e0b"
                          stroke="#090e1a"
                          strokeWidth="0.3"
                        />
                      )}
                    </g>
                  );
                })
              )}
            </svg>

            {/* Depot Floating Badge */}
            <div
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-8"
              style={{
                left: `${userProfile.depot.x}%`,
                top: `${userProfile.depot.y}%`,
              }}
            >
              <div className="px-2 py-0.5 rounded-full bg-slate-900/90 border border-teal-500/60 text-[10px] font-bold text-teal-300 shadow-lg whitespace-nowrap flex items-center gap-1">
                <Truck className="w-3 h-3 text-teal-400" />
                <span>DEPOT: {userProfile.depot.name}</span>
              </div>
            </div>

            {/* Interactive Stop Details Popover (Float) */}
            {selectedStop && (
              <div
                className="absolute z-20 w-72 rounded-xl bg-slate-900/95 border border-slate-700/80 p-3 shadow-2xl text-xs space-y-2 backdrop-blur-md animate-in fade-in duration-150"
                style={{
                  left: `${Math.min(70, Math.max(10, selectedStop.stop.order.coordinates?.x ?? 50))}%`,
                  top: `${Math.min(65, Math.max(10, selectedStop.stop.order.coordinates?.y ?? 50))}%`,
                }}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white"
                      style={{ backgroundColor: selectedStop.vehicleColor }}
                    >
                      {selectedStop.stopIndex}
                    </span>
                    <span className="font-bold text-slate-100">{selectedStop.stop.order.id}</span>
                  </div>
                  <button
                    onClick={() => setSelectedStop(null)}
                    className="text-slate-400 hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <div className="font-semibold text-slate-200">{selectedStop.stop.order.customerName}</div>
                  <div className="text-[11px] text-slate-400 leading-snug">{selectedStop.stop.order.destination}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-400">ETA Arrival:</span>
                    <div className="font-semibold text-teal-300">{selectedStop.stop.estimatedArrival}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Time Window:</span>
                    <div className="font-semibold text-slate-200">
                      {selectedStop.stop.order.timeWindowEarliest || '08:00'} -{' '}
                      {selectedStop.stop.order.timeWindowLatest || selectedStop.stop.order.deliveryDeadline}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Cargo Weight:</span>
                    <div className="font-medium text-slate-200">{selectedStop.stop.order.weightKg} kg</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Service Dwell:</span>
                    <div className="font-medium text-slate-200">{selectedStop.stop.order.serviceTimeMinutes || 15} min</div>
                  </div>
                </div>

                {selectedStop.stop.isLate ? (
                  <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Arrival violates time window SLA.</span>
                  </div>
                ) : (
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Estimated arrival satisfies customer window.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Transparent Simulation Notice Banner */}
        {!hasValidMapsKey && activeTab === 'map' && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-slate-950/90 border border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-300 shadow-lg backdrop-blur-sm flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px]">
              <span className="font-semibold text-slate-200">Demo Road Network Model</span>
              <p className="text-slate-400 leading-tight">
                Simulated street vectors for {userProfile.city}. Real road network distance evaluated with 1.35x circuity factor.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Google Maps Configuration Guide Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Google Maps Platform Integration</h4>
                  <span className="text-[11px] text-slate-400">Live Tiles, Advanced Markers & Satellite</span>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>
                RouteWise AI includes native support for <strong className="text-teal-300">@vis.gl/react-google-maps</strong>. To enable live Google Maps satellite, terrain, and road views:
              </p>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-teal-300 space-y-1">
                <div className="text-slate-500"># In .env or AI Studio Secrets</div>
                <div>VITE_GOOGLE_MAPS_API_KEY="AIzaSy..."</div>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Required API: Maps JavaScript API</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Map ID configured: DEMO_MAP_ID</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Attribution ID: gmp_mcp_codeassist_v1_aistudio</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                When no key is configured, RouteWise AI seamlessly presents the interactive vector road map with full stop order inspection, vehicle color tracks, and time window validation.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 font-semibold cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
