import React from 'react';
import { Truck, BatteryCharging, CheckCircle2, AlertCircle, Compass, Wrench, AlertOctagon } from 'lucide-react';
import { Vehicle, VehicleStatus, DeliveryOrder } from '../../types';
import { computeVehicleMetrics } from '../../utils/fleetStorage';

interface FleetStatusCardProps {
  vehicles: Vehicle[];
  orders?: DeliveryOrder[];
  onSelectVehicle?: (vehicleId: string) => void;
  selectedVehicleId?: string;
}

export const FleetStatusCard: React.FC<FleetStatusCardProps> = ({
  vehicles,
  orders = [],
  onSelectVehicle,
  selectedVehicleId,
}) => {
  const getStatusBadge = (status: VehicleStatus) => {
    switch (status) {
      case 'Available':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Available
          </span>
        );
      case 'On Route':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Compass className="w-3 h-3" /> On Route
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Wrench className="w-3 h-3" /> Maintenance
          </span>
        );
      case 'Offline':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertOctagon className="w-3 h-3" /> Offline
          </span>
        );
      case 'At Capacity':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" /> {status}
          </span>
        );
    }
  };

  const getCapacityColor = (percentage: number, isOverCapacity: boolean) => {
    if (isOverCapacity) return 'bg-rose-500';
    if (percentage >= 90) return 'bg-amber-400';
    if (percentage >= 70) return 'bg-teal-400';
    return 'bg-emerald-400';
  };

  return (
    <div className="rounded-xl bg-[#0f172a] border border-slate-800 flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Fleet Status</h2>
            <p className="text-xs text-slate-400">Real-time capacity and assignment tracking</p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-400">{vehicles.length} Vehicles</span>
      </div>

      {/* Vehicle List */}
      <div className="p-4 space-y-3.5 flex-1 overflow-y-auto">
        {vehicles.map((v) => {
          // If orders is provided, calculate load dynamically from orders!
          const metrics = computeVehicleMetrics(v, orders);
          const currentLoad = orders.length > 0 ? metrics.currentLoadKg : v.currentLoadKg || 0;
          const loadPercent = Math.round((currentLoad / (v.capacityKg || 500)) * 100);
          const stops = orders.length > 0 ? metrics.stopsCount : v.stopsCount || 0;
          const isSelected = selectedVehicleId === v.id;

          return (
            <div
              key={v.id}
              onClick={() => onSelectVehicle?.(v.id)}
              className={`p-3.5 rounded-lg border transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/80 border-teal-500/50 shadow-xs'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              {/* Row 1: ID, Plate, Status */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: v.color }}
                  />
                  <span className="font-mono font-bold text-sm text-white tracking-tight">
                    {v.id}
                  </span>
                  <span className="text-xs font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/50">
                    {v.registrationNumber || v.licensePlate}
                  </span>
                </div>
                {getStatusBadge(v.status)}
              </div>

              {/* Row 2: Driver & Route */}
              <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Driver:</span>
                  <span className="font-medium text-slate-200">{v.driverName}</span>
                </div>
                <div className="text-slate-400 text-[11px] truncate max-w-[150px]" title={v.activeRouteName}>
                  {v.activeRouteName || v.vehicleType}
                </div>
              </div>

              {/* Row 3: Capacity Progress Bar */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[11px] text-slate-400 font-medium">Capacity Usage</span>
                  <span className="font-mono text-xs text-slate-300 font-medium tabular-nums">
                    {currentLoad} / {v.capacityKg} kg{' '}
                    <span
                      className={`font-normal ${
                        metrics.isOverCapacity ? 'text-rose-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      ({loadPercent}%)
                    </span>
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getCapacityColor(
                      loadPercent,
                      metrics.isOverCapacity
                    )}`}
                    style={{ width: `${Math.min(loadPercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Row 4: Telemetry meta */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <BatteryCharging className="w-3.5 h-3.5 text-teal-400" />
                  <span className="font-mono">{v.fuelOrBattery || v.fuelType}</span>
                </span>
                <span className="text-slate-400">
                  Zone: <span className="text-slate-300 font-medium">{v.currentZone || 'Central'}</span>
                </span>
                <span className="font-mono text-slate-400">{stops} stops</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
