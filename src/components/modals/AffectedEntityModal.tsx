/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DeliveryOrder, Vehicle } from '../../types';
import { X, Package, Truck, Clock, Scale, AlertTriangle, CheckCircle2, User, MapPin } from 'lucide-react';

interface AffectedEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string | null;
  orders: DeliveryOrder[];
  vehicles: Vehicle[];
}

export const AffectedEntityModal: React.FC<AffectedEntityModalProps> = ({
  isOpen,
  onClose,
  entityId,
  orders,
  vehicles,
}) => {
  if (!isOpen || !entityId) return null;

  const matchedOrder = orders.find((o) => o.id === entityId);
  const matchedVehicle = vehicles.find((v) => v.id === entityId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              {matchedOrder ? <Package className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {entityId}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                  {matchedOrder ? 'Delivery Order' : matchedVehicle ? 'Fleet Vehicle' : 'Referenced ID'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Operational inspection from Gemini AI Risk Telemetry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-300 max-h-[70vh] overflow-y-auto">
          {matchedOrder && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-100">{matchedOrder.customerName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-teal-500/10 text-teal-300 border-teal-500/30">
                    {matchedOrder.status}
                  </span>
                </div>
                <div className="text-slate-400 text-xs flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{matchedOrder.destination}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Weight</span>
                  <div className="font-bold text-slate-100 mt-0.5">{matchedOrder.weightKg} kg</div>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Priority</span>
                  <div className="font-bold text-slate-100 mt-0.5 uppercase">{matchedOrder.priority}</div>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Delivery Deadline</span>
                  <div className="font-bold text-slate-100 mt-0.5">{matchedOrder.deliveryDeadline}</div>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Assigned Vehicle</span>
                  <div className="font-bold text-teal-300 mt-0.5">
                    {matchedOrder.assignedVehicleId || 'Unassigned (Pending)'}
                  </div>
                </div>
              </div>

              {matchedOrder.packageDescription && (
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Description</span>
                  <p className="mt-1 text-slate-300">{matchedOrder.packageDescription}</p>
                </div>
              )}
            </div>
          )}

          {matchedVehicle && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-100">{matchedVehicle.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      matchedVehicle.status === 'Available'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : matchedVehicle.status === 'On Route'
                        ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {matchedVehicle.status}
                  </span>
                </div>
                <div className="text-slate-400 text-xs flex items-center gap-2">
                  <span>Reg: <strong className="text-slate-200">{matchedVehicle.registrationNumber}</strong></span>
                  <span>•</span>
                  <span>Type: <strong className="text-slate-200">{matchedVehicle.vehicleType}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Driver</span>
                  <div className="font-bold text-slate-100 mt-0.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{matchedVehicle.driverName}</span>
                  </div>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Max Capacity</span>
                  <div className="font-bold text-slate-100 mt-0.5">{matchedVehicle.capacityKg} kg</div>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Max Stops Limit</span>
                  <div className="font-bold text-slate-100 mt-0.5">{matchedVehicle.maxStops} stops</div>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Depot Hub</span>
                  <div className="font-bold text-slate-100 mt-0.5 truncate">{matchedVehicle.currentDepot}</div>
                </div>
              </div>

              {matchedVehicle.notes && (
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Notes</span>
                  <p className="mt-1 text-slate-300">{matchedVehicle.notes}</p>
                </div>
              )}
            </div>
          )}

          {!matchedOrder && !matchedVehicle && (
            <div className="text-center py-6 text-slate-400">
              No matching entity found for ID {entityId}.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
