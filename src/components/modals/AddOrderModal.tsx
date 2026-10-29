import React, { useState } from 'react';
import { X, PackagePlus, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { DeliveryOrder, OrderPriority } from '../../types';

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: (newOrder: DeliveryOrder) => void;
  existingCount: number;
}

export const AddOrderModal: React.FC<AddOrderModalProps> = ({
  isOpen,
  onClose,
  onAddOrder,
  existingCount,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [destination, setDestination] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [priority, setPriority] = useState<OrderPriority>('normal');
  const [deadlineTime, setDeadlineTime] = useState('14:30');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!customerName.trim()) {
      errs.customerName = 'Customer name is required.';
    }
    if (!destination.trim()) {
      errs.destination = 'Delivery destination address is required.';
    }
    const weightNum = parseFloat(weightKg);
    if (!weightKg.trim() || isNaN(weightNum) || weightNum <= 0) {
      errs.weightKg = 'Please specify a valid weight greater than 0 kg.';
    } else if (weightNum > 500) {
      errs.weightKg = 'Single package cannot exceed standard vehicle limit of 500 kg.';
    }
    if (!deadlineTime.trim()) {
      errs.deadlineTime = 'Delivery deadline time is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const formatDisplayTime = (timeStr: string) => {
    // converts "14:30" to "02:30 PM"
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 === 0 ? 12 : h % 12;
    return `${formattedH.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const newId = `ORD-${8020 + existingCount + 1}`;
    const formattedDeadline = formatDisplayTime(deadlineTime);
    const newOrder: DeliveryOrder = {
      id: newId,
      customerName: customerName.trim(),
      pickupAddress: 'RouteWise Central Depot, Bay 4',
      destination: destination.trim(),
      deliveryAddress: destination.trim(),
      weightKg: parseFloat(weightKg),
      packageWeightKg: parseFloat(weightKg),
      packageDescription: 'Standard delivery freight',
      priority,
      status: 'pending',
      deliveryDeadline: formattedDeadline,
      estimatedArrival: formattedDeadline,
      notes: notes.trim() || 'Standard dispatch instructions.',
      specialInstructions: notes.trim() || 'Standard dispatch instructions.',
      createdAt: new Date().toISOString(),
      coordinates: {
        x: Math.floor(20 + Math.random() * 60),
        y: Math.floor(20 + Math.random() * 60),
      },
    };

    setIsSubmittedSuccess(true);
    setTimeout(() => {
      onAddOrder(newOrder);
      setIsSubmittedSuccess(false);
      // Reset form
      setCustomerName('');
      setDestination('');
      setWeightKg('');
      setPriority('normal');
      setDeadlineTime('14:30');
      setNotes('');
      setErrors({});
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-[#0f172a] border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add Delivery Order</h3>
              <p className="text-xs text-slate-400">
                Register order into today&apos;s dispatch queue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {isSubmittedSuccess ? (
            <div className="py-10 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Order Registered Successfully</h4>
              <p className="text-xs text-slate-400 mt-1">
                Adding order to active delivery manifest and updating metrics...
              </p>
            </div>
          ) : (
            <>
              {/* Customer Name */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Customer / Business Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Silverline Medical Supply"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border ${
                    errors.customerName ? 'border-rose-500' : 'border-slate-700/80'
                  } focus:outline-hidden focus:border-teal-500 transition-colors`}
                />
                {errors.customerName && (
                  <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.customerName}
                  </p>
                )}
              </div>

              {/* Destination Address */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Destination Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 842 Commercial Way, Suite 210"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border ${
                    errors.destination ? 'border-rose-500' : 'border-slate-700/80'
                  } focus:outline-hidden focus:border-teal-500 transition-colors`}
                />
                {errors.destination && (
                  <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.destination}
                  </p>
                )}
              </div>

              {/* Weight + Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Package Weight */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Package Weight (kg) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="e.g. 15.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border font-mono ${
                      errors.weightKg ? 'border-rose-500' : 'border-slate-700/80'
                    } focus:outline-hidden focus:border-teal-500 transition-colors`}
                  />
                  {errors.weightKg && (
                    <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.weightKg}
                    </p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Priority Level <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as OrderPriority)}
                    className="w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 focus:outline-hidden focus:border-teal-500 transition-colors cursor-pointer"
                  >
                    <option value="low">Low (Flexible delivery)</option>
                    <option value="normal">Normal (Standard SLA)</option>
                    <option value="high">High (Time sensitive)</option>
                    <option value="urgent">Urgent (Express immediate)</option>
                  </select>
                </div>
              </div>

              {/* Delivery Deadline */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Delivery Deadline Time <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border font-mono ${
                      errors.deadlineTime ? 'border-rose-500' : 'border-slate-700/80'
                    } focus:outline-hidden focus:border-teal-500 transition-colors`}
                  />
                  <Clock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {errors.deadlineTime && (
                  <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.deadlineTime}
                  </p>
                )}
              </div>

              {/* Special Instructions / Notes */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Handling Notes / Delivery Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Gate code #4490, leave with receptionist..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 focus:outline-hidden focus:border-teal-500 transition-colors resize-none"
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-slate-950 bg-teal-400 hover:bg-teal-300 active:bg-teal-500 font-semibold rounded-lg transition-colors shadow-xs shadow-teal-500/20"
                >
                  Create &amp; Enqueue Order
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
