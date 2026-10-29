import React from 'react';
import {
  X,
  Truck,
  User,
  Phone,
  Building,
  Scale,
  Fuel,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  AlertOctagon,
  Edit3,
  Package,
} from 'lucide-react';
import { Vehicle, DeliveryOrder, VehicleStatus } from '../../types';
import { computeVehicleMetrics } from '../../utils/fleetStorage';

interface VehicleDetailsModalProps {
  vehicle: Vehicle | null;
  orders: DeliveryOrder[];
  onClose: () => void;
  onEdit: (vehicle: Vehicle) => void;
  onRequestChangeStatus: (vehicle: Vehicle, newStatus: VehicleStatus) => void;
}

export const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({
  vehicle,
  orders,
  onClose,
  onEdit,
  onRequestChangeStatus,
}) => {
  if (!vehicle) return null;

  const metrics = computeVehicleMetrics(vehicle, orders);
  const isMaintenanceOrOffline = vehicle.status === 'Maintenance' || vehicle.status === 'Offline';
  const hasActiveOrders = metrics.activeOrders.length > 0;

  const getStatusBadge = (status: VehicleStatus) => {
    switch (status) {
      case 'Available':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Available
          </span>
        );
      case 'On Route':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
            <Truck className="w-3.5 h-3.5" /> On Route
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Wrench className="w-3.5 h-3.5" /> Maintenance
          </span>
        );
      case 'Offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertOctagon className="w-3.5 h-3.5" /> Offline
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const getProgressBarColor = () => {
    if (metrics.isOverCapacity) return 'bg-rose-500';
    if (metrics.isAtCapacity) return 'bg-amber-400';
    if (metrics.utilizationPercent > 50) return 'bg-teal-400';
    return 'bg-emerald-400';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl my-auto rounded-xl bg-[#0f172a] border border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-950 font-bold text-sm shrink-0 shadow-xs"
              style={{ backgroundColor: vehicle.color }}
            >
              <Truck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white tracking-tight">
                  {vehicle.id}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                  {vehicle.registrationNumber || vehicle.licensePlate}
                </span>
                {getStatusBadge(vehicle.status)}
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mt-0.5">
                {vehicle.name} · <span className="text-teal-400">{vehicle.vehicleType}</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close details dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Warning banner if inactive but has active deliveries */}
          {isMaintenanceOrOffline && hasActiveOrders && (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Action Required: Vehicle Unavailable</p>
                <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                  This vehicle is currently <strong>{vehicle.status}</strong>, but has{' '}
                  <span className="font-mono font-bold text-white">
                    {metrics.activeOrders.length} active deliveries ({metrics.currentLoadKg} kg)
                  </span>{' '}
                  assigned. Reassignment will be executed in Module 6 (Route Rescue).
                </p>
              </div>
            </div>
          )}

          {/* Over Capacity Warning */}
          {metrics.isOverCapacity && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Payload Warning: Over Capacity</p>
                <p className="text-[11px] text-rose-200/90 mt-0.5 leading-relaxed">
                  Total assigned weight ({metrics.currentLoadKg} kg) exceeds vehicle max capacity (
                  {vehicle.capacityKg} kg) by{' '}
                  <span className="font-mono font-bold text-white">
                    {(metrics.currentLoadKg - vehicle.capacityKg).toFixed(1)} kg
                  </span>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Capacity Utilization Card */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-teal-400" />
                <span>Cargo Capacity &amp; Utilization</span>
              </span>
              <span className="font-mono font-bold text-sm text-white tabular-nums">
                {metrics.currentLoadKg} / {vehicle.capacityKg} kg{' '}
                <span className={`text-xs ${metrics.isOverCapacity ? 'text-rose-400' : 'text-teal-400'}`}>
                  ({metrics.utilizationPercent}%)
                </span>
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                style={{ width: `${Math.min(metrics.utilizationPercent, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Remaining Payload: <strong className="text-slate-200 font-mono">{metrics.remainingCapacityKg} kg</strong></span>
              <span>Active Stops: <strong className="text-slate-200 font-mono">{metrics.stopsCount} / {vehicle.maxStops} max</strong></span>
            </div>
          </div>

          {/* Driver & Logistics Specs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Assigned Driver</span>
              <div className="flex items-center gap-1.5 mt-1 text-white font-semibold">
                <User className="w-3.5 h-3.5 text-teal-400" />
                <span>{vehicle.driverName}</span>
              </div>
              {vehicle.driverPhone ? (
                <a
                  href={`tel:${vehicle.driverPhone}`}
                  className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 mt-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>{vehicle.driverPhone}</span>
                </a>
              ) : (
                <span className="text-[10px] text-slate-400 mt-0.5 block">No direct phone</span>
              )}
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Base Depot Location</span>
              <div className="flex items-start gap-1.5 mt-1 text-slate-200 font-medium">
                <Building className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                <span className="truncate">{vehicle.currentDepot}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Zone: {vehicle.currentZone || 'Central'}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Fuel &amp; Powertrain</span>
              <div className="flex items-center gap-1.5 mt-1 text-slate-200 font-medium">
                <Fuel className="w-3.5 h-3.5 text-teal-400" />
                <span>{vehicle.fuelType || 'Electric (EV)'}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
                Telemetry: {vehicle.fuelOrBattery || 'Nominal'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Active Route Loop</span>
              <div className="flex items-center gap-1.5 mt-1 text-slate-200 font-medium truncate">
                <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="truncate">{vehicle.activeRouteName || 'Depot Staging'}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Stops Limit: {vehicle.maxStops}
              </span>
            </div>
          </div>

          {/* Assigned Orders List */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-teal-400" />
                <span>Assigned Deliveries ({metrics.activeOrders.length})</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Sum: {metrics.currentLoadKg} kg
              </span>
            </div>

            {metrics.activeOrders.length > 0 ? (
              <div className="divide-y divide-slate-800/80 max-h-48 overflow-y-auto">
                {metrics.activeOrders.map((order) => (
                  <div key={order.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-300 text-[11px]">
                          {order.id}
                        </span>
                        <span className="text-white font-medium truncate max-w-[180px]">
                          {order.customerName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-[240px] mt-0.5">
                        {order.destination}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-semibold text-slate-200 tabular-nums">
                        {order.weightKg.toFixed(1)} kg
                      </span>
                      <div className="text-[10px] capitalize text-slate-400 mt-0.5">
                        {order.priority} · {order.deliveryDeadline}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center italic">
                No active orders currently assigned to this vehicle.
              </p>
            )}
          </div>

          {/* Notes */}
          {vehicle.notes && (
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                <span>Fleet Notes</span>
              </span>
              <p className="text-slate-300 mt-1 leading-relaxed text-xs">{vehicle.notes}</p>
            </div>
          )}

          {/* Status Quick Transitions */}
          <div className="pt-2 border-t border-slate-800">
            <span className="block text-[11px] text-slate-400 mb-1.5 font-medium">
              Change Operating Status:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {(['Available', 'On Route', 'Maintenance', 'Offline'] as VehicleStatus[]).map((st) => {
                const isCurrent = vehicle.status === st;
                return (
                  <button
                    key={st}
                    onClick={() => !isCurrent && onRequestChangeStatus(vehicle, st)}
                    disabled={isCurrent}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-medium transition-colors ${
                      isCurrent
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 cursor-default'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(vehicle);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Vehicle Details</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
