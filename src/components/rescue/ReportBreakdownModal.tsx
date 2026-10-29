/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Vehicle, DeliveryOrder } from '../../types';
import { DisruptionIncident } from '../../services/rescue/types';
import {
  AlertTriangle,
  X,
  Truck,
  MapPin,
  Clock,
  Wrench,
  FileText,
  Package,
} from 'lucide-react';

interface ReportBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  orders: DeliveryOrder[];
  existingIncidents: DisruptionIncident[];
  onReportBreakdown: (incident: DisruptionIncident) => void;
}

export const ReportBreakdownModal: React.FC<ReportBreakdownModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  orders,
  existingIncidents,
  onReportBreakdown,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [location, setLocation] = useState('');
  const [breakdownTime, setBreakdownTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
  const [reason, setReason] = useState('Flat Tire / Puncture');
  const [customReason, setCustomReason] = useState('');
  const [estimatedRepairTime, setEstimatedRepairTime] = useState('2 hours');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Active breakdown vehicles cannot be reported twice
  const activeBreakdownVehicleIds = new Set(
    existingIncidents
      .filter((inc) => inc.status === 'active' && inc.type === 'vehicle_breakdown' && inc.vehicleId)
      .map((inc) => inc.vehicleId!)
  );

  // Eligible vehicles: not already broken down
  const selectableVehicles = vehicles.filter(
    (v) => !activeBreakdownVehicleIds.has(v.id)
  );

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  // Identify affected orders currently assigned to this vehicle (excluding delivered/cancelled)
  const affectedOrders = selectedVehicle
    ? orders.filter(
        (o) =>
          o.assignedVehicleId === selectedVehicle.id &&
          o.status !== 'delivered' &&
          o.status !== 'cancelled'
      )
    : [];

  const completedOrders = selectedVehicle
    ? orders.filter((o) => o.assignedVehicleId === selectedVehicle.id && o.status === 'delivered')
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedVehicleId) {
      setFormError('Please select a vehicle that experienced the breakdown.');
      return;
    }

    if (!location.trim()) {
      setFormError('Please provide the breakdown or last known location.');
      return;
    }

    const finalReason = reason === 'Other' ? (customReason.trim() || 'Unspecified mechanical fault') : reason;

    setIsSubmitting(true);
    setFormError(null);

    const newIncident: DisruptionIncident = {
      id: `INC-${Date.now().toString().slice(-4)}`,
      type: 'vehicle_breakdown',
      title: `Breakdown: ${selectedVehicle?.name || selectedVehicleId} (${finalReason})`,
      description: `Vehicle ${selectedVehicleId} reported disabled at ${location.trim()} at ${breakdownTime}. ${affectedOrders.length} active deliveries affected.`,
      createdAt: new Date().toISOString(),
      status: 'active',
      vehicleId: selectedVehicleId,
      breakdownLocation: location.trim(),
      breakdownTime,
      reason: finalReason,
      estimatedRepairTime: estimatedRepairTime.trim() || undefined,
      additionalNotes: notes.trim() || undefined,
      affectedOrderIds: affectedOrders.map((o) => o.id),
      affectedVehicleIds: [selectedVehicleId],
    };

    onReportBreakdown(newIncident);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Report Vehicle Breakdown
              </h3>
              <p className="text-xs text-slate-400">
                Record mechanical failure, flag vehicle as unavailable, and prepare delivery recovery
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
              {formError}
            </div>
          )}

          {/* Vehicle Selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-teal-400" />
              <span>Select Disabled Vehicle *</span>
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => {
                setSelectedVehicleId(e.target.value);
                const veh = vehicles.find((v) => v.id === e.target.value);
                if (veh) {
                  setLocation(veh.currentZone ? `${veh.currentZone} corridor` : 'North Central Corridor');
                }
              }}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500"
            >
              <option value="">-- Choose a vehicle from active fleet roster --</option>
              {selectableVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} — {v.name} ({v.driverName}, {v.capacityKg} kg capacity, Status: {v.status})
                </option>
              ))}
            </select>
            {selectableVehicles.length === 0 && (
              <p className="text-amber-400 text-[11px]">
                All vehicles in the fleet already have active breakdown reports.
              </p>
            )}
          </div>

          {/* Breakdown Location & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>Breakdown / Last Known Location *</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. 450 Market St or North Sector interchange"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>Breakdown Time *</span>
              </label>
              <input
                type="text"
                value={breakdownTime}
                onChange={(e) => setBreakdownTime(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>

          {/* Reason for Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-teal-400" />
                <span>Mechanical Reason *</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500"
              >
                <option value="Flat Tire / Puncture">Flat Tire / Puncture</option>
                <option value="Engine Overheating">Engine Overheating</option>
                <option value="EV Battery &amp; Drivetrain Fault">EV Battery &amp; Drivetrain Fault</option>
                <option value="Brake System Failure">Brake System Failure</option>
                <option value="Transmission / Gear Slippage">Transmission / Gear Slippage</option>
                <option value="Minor Traffic Collision">Minor Traffic Collision</option>
                <option value="Other">Other Reason (Specify Below)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Estimated Repair / Tow Window</label>
              <input
                type="text"
                value={estimatedRepairTime}
                onChange={(e) => setEstimatedRepairTime(e.target.value)}
                placeholder="e.g. 2 hours, Tomorrow morning"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>

          {reason === 'Other' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Custom Breakdown Reason</label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe failure details"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>Dispatcher &amp; Driver Notes (Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Driver is safe with hazard lights on. Tow truck dispatched."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500 resize-none"
            />
          </div>

          {/* Incident Impact Preview Box */}
          {selectedVehicle && (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-teal-400" />
                  <span>Delivery Impact Preview</span>
                </span>
                <span className="font-mono text-teal-300">
                  {affectedOrders.length} active order(s) affected
                </span>
              </div>

              {affectedOrders.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Reporting this breakdown will mark <strong className="text-slate-200">{selectedVehicle.id}</strong> as{' '}
                    <span className="text-amber-300 font-semibold">Maintenance</span> and generate an incident to reassign these {affectedOrders.length} package(s):
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {affectedOrders.map((o) => (
                      <span
                        key={o.id}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-teal-300"
                      >
                        {o.id} ({o.weightKg}kg)
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-400">
                  Vehicle has zero active deliveries assigned. Breakdown incident will be logged for maintenance tracking without requiring cargo reassignment.
                </p>
              )}

              {completedOrders.length > 0 && (
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                  ✓ {completedOrders.length} previously delivered order(s) on this vehicle will remain preserved and completed.
                </div>
              )}
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedVehicleId}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 fill-current" />
                  <span>Record Breakdown &amp; Alert Dispatch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
