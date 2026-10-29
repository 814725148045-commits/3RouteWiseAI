/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DeliveryOrder } from '../../types';
import { DisruptionIncident } from '../../services/rescue/types';
import {
  Zap,
  X,
  User,
  MapPin,
  Clock,
  Weight,
  FileText,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface AddUrgentDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingOrdersCount: number;
  onAddUrgentOrder: (order: DeliveryOrder, incident: DisruptionIncident) => void;
  onOpenRecoveryReviewForIncident: (incident: DisruptionIncident) => void;
}

export const AddUrgentDeliveryModal: React.FC<AddUrgentDeliveryModalProps> = ({
  isOpen,
  onClose,
  existingOrdersCount,
  onAddUrgentOrder,
  onOpenRecoveryReviewForIncident,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('RouteWise Central Depot, 100 Logistics Blvd');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [weightKg, setWeightKg] = useState('15');
  const [deliveryDeadline, setDeliveryDeadline] = useState('11:30 AM');
  const [packageDescription, setPackageDescription] = useState('Urgent Medical Supplies (Cold Chain)');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success state after insertion
  const [createdOrder, setCreatedOrder] = useState<DeliveryOrder | null>(null);
  const [createdIncident, setCreatedIncident] = useState<DisruptionIncident | null>(null);

  if (!isOpen) return null;

  const handleResetModal = () => {
    setCustomerName('');
    setDeliveryAddress('');
    setWeightKg('15');
    setDeliveryDeadline('11:30 AM');
    setPackageDescription('Urgent Medical Supplies (Cold Chain)');
    setSpecialInstructions('');
    setCreatedOrder(null);
    setCreatedIncident(null);
    setFormError(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validation
    if (!customerName.trim()) {
      setFormError('Customer or recipient name is required.');
      return;
    }
    if (!deliveryAddress.trim()) {
      setFormError('Delivery destination address is required.');
      return;
    }
    const weightNum = parseFloat(weightKg);
    if (isNaN(weightNum) || weightNum <= 0) {
      setFormError('Please enter a valid positive weight in kilograms.');
      return;
    }
    if (!deliveryDeadline.trim()) {
      setFormError('Delivery deadline is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    // Deterministic order ID generation matching application pattern
    const orderId = `ORD-9${(existingOrdersCount + 10).toString().slice(-3)}`;
    const incidentId = `INC-${Date.now().toString().slice(-4)}`;

    const newOrder: DeliveryOrder = {
      id: orderId,
      customerName: customerName.trim(),
      pickupAddress: pickupAddress.trim(),
      destination: deliveryAddress.trim(),
      deliveryAddress: deliveryAddress.trim(),
      weightKg: Number(weightNum.toFixed(1)),
      packageWeightKg: Number(weightNum.toFixed(1)),
      packageDescription: packageDescription.trim() || 'Urgent Priority Parcel',
      priority: 'urgent',
      status: 'pending',
      deliveryDeadline: deliveryDeadline.trim(),
      estimatedArrival: 'Pending Recovery Calculation',
      createdAt: new Date().toISOString(),
      specialInstructions: specialInstructions.trim() || undefined,
    };

    const newIncident: DisruptionIncident = {
      id: incidentId,
      type: 'urgent_delivery',
      title: `Urgent Delivery Request: ${newOrder.id} (${newOrder.customerName})`,
      description: `New high-priority urgent order registered. Weight: ${newOrder.weightKg} kg, Deadline: ${newOrder.deliveryDeadline}. Requires route recovery insertion.`,
      createdAt: new Date().toISOString(),
      status: 'active',
      orderId: newOrder.id,
      affectedOrderIds: [newOrder.id],
      affectedVehicleIds: [],
    };

    onAddUrgentOrder(newOrder, newIncident);
    setCreatedOrder(newOrder);
    setCreatedIncident(newIncident);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Register Urgent Delivery Drop
              </h3>
              <p className="text-xs text-slate-400">
                Insert time-critical freight into today's operational routing schedule
              </p>
            </div>
          </div>
          <button
            onClick={handleResetModal}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Form or Post-Creation Confirmation */}
        {!createdOrder ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Notice regarding feasibility */}
            <div className="p-3 rounded-lg bg-teal-500/5 border border-teal-500/20 text-slate-300 text-[11px] leading-relaxed">
              <strong>Notice:</strong> Registering an urgent parcel marks it as{' '}
              <span className="text-teal-300 font-semibold">Urgent &amp; Pending</span>. Feasibility and vehicle stop slotting will be verified by the route optimizer during recovery planning.
            </div>

            {/* Recipient & Customer */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-400" />
                <span>Recipient / Client Name *</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Apex Health Clinic or Dr. Aris Thorne"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500"
              />
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  <span>Pickup Staging Hub *</span>
                </label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  <span>Delivery Destination *</span>
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. 882 Broadway Medical Center"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>

            {/* Weight, Deadline, and Description */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Weight className="w-3.5 h-3.5 text-teal-400" />
                  <span>Weight (kg) *</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="1000"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  <span>Hard Deadline *</span>
                </label>
                <input
                  type="text"
                  value={deliveryDeadline}
                  onChange={(e) => setDeliveryDeadline(e.target.value)}
                  placeholder="e.g. 11:30 AM or 14:00"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Package Type</label>
                <input
                  type="text"
                  value={packageDescription}
                  onChange={(e) => setPackageDescription(e.target.value)}
                  placeholder="Parcel description"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>

            {/* Special Instructions */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                <span>Special Instructions (Optional)</span>
              </label>
              <textarea
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Direct signature required. Temperature-controlled parcel."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-teal-500 resize-none"
              />
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleResetModal}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-md shadow-teal-500/20 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Register Urgent Delivery</span>
              </button>
            </div>
          </form>
        ) : (
          /* Success Screen following submission */
          <div className="p-6 space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-slate-100">
                Urgent Order {createdOrder.id} Registered
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Created order for <strong className="text-slate-200">{createdOrder.customerName}</strong> ({createdOrder.weightKg} kg, deadline {createdOrder.deliveryDeadline}). Order status is <span className="text-teal-300 font-semibold">Pending</span>.
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span>Associated Incident:</span>
                <span className="font-mono text-teal-400">{createdIncident?.id}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                This order has not been placed on a route yet. To find the optimal vehicle and sequence without violating deadline constraints, calculate a Route Rescue recovery plan now.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleResetModal}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Close &amp; View Incidents
              </button>
              <button
                onClick={() => {
                  if (createdIncident) {
                    onOpenRecoveryReviewForIncident(createdIncident);
                    handleResetModal();
                  }
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-md shadow-teal-500/20 cursor-pointer"
              >
                <span>Calculate Recovery Plan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
