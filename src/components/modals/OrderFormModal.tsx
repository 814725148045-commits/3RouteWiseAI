import React, { useState, useEffect } from 'react';
import {
  X,
  PackagePlus,
  Edit3,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Building,
  Phone,
  FileText,
  Truck,
  Scale,
} from 'lucide-react';
import { DeliveryOrder, OrderPriority, OrderStatus, Vehicle } from '../../types';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveOrder: (order: DeliveryOrder) => void;
  initialOrder?: DeliveryOrder | null;
  existingOrdersCount: number;
  vehicles?: Vehicle[];
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  onSaveOrder,
  initialOrder,
  existingOrdersCount,
  vehicles = [],
}) => {
  const isEditing = Boolean(initialOrder);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pickupAddress, setPickupAddress] = useState('RouteWise Central Depot, Bay 4');
  const [destination, setDestination] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [priority, setPriority] = useState<OrderPriority>('normal');
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [deadlineTime, setDeadlineTime] = useState('14:30');
  const [timeWindowEarliest, setTimeWindowEarliest] = useState('08:30');
  const [timeWindowLatest, setTimeWindowLatest] = useState('14:30');
  const [serviceTimeMinutes, setServiceTimeMinutes] = useState('10');
  const [assignedVehicleId, setAssignedVehicleId] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Sync state when modal opens or initialOrder changes
  useEffect(() => {
    if (initialOrder) {
      setCustomerName(initialOrder.customerName || '');
      setPhoneNumber(initialOrder.phoneNumber || '');
      setPickupAddress(initialOrder.pickupAddress || 'RouteWise Central Depot, Bay 4');
      setDestination(initialOrder.destination || initialOrder.deliveryAddress || '');
      setWeightKg(initialOrder.weightKg ? initialOrder.weightKg.toString() : '');
      setPackageDescription(initialOrder.packageDescription || '');
      setPriority(initialOrder.priority || 'normal');
      setStatus(initialOrder.status || 'pending');
      setDeadlineTime(initialOrder.deliveryDeadline || initialOrder.estimatedArrival || '14:30');
      setTimeWindowEarliest(initialOrder.timeWindowEarliest || '08:30');
      setTimeWindowLatest(initialOrder.timeWindowLatest || initialOrder.deliveryDeadline || '14:30');
      setServiceTimeMinutes(initialOrder.serviceTimeMinutes ? initialOrder.serviceTimeMinutes.toString() : '10');
      setAssignedVehicleId(initialOrder.assignedVehicleId || '');
      setSpecialInstructions(initialOrder.specialInstructions || initialOrder.notes || '');
      setErrors({});
      setIsSubmittedSuccess(false);
    } else {
      // Default for New Order
      setCustomerName('');
      setPhoneNumber('');
      setPickupAddress('RouteWise Central Depot, Bay 4');
      setDestination('');
      setWeightKg('');
      setPackageDescription('');
      setPriority('normal');
      setStatus('pending');
      setDeadlineTime('14:30');
      setTimeWindowEarliest('08:30');
      setTimeWindowLatest('14:30');
      setServiceTimeMinutes('10');
      setAssignedVehicleId('');
      setSpecialInstructions('');
      setErrors({});
      setIsSubmittedSuccess(false);
    }
  }, [initialOrder, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!customerName.trim()) {
      errs.customerName = 'Customer or business name is required.';
    } else if (customerName.trim().length < 2) {
      errs.customerName = 'Customer name must be at least 2 characters.';
    }

    if (!pickupAddress.trim()) {
      errs.pickupAddress = 'Pickup address is required.';
    }

    if (!destination.trim()) {
      errs.destination = 'Delivery destination address is required.';
    }

    if (!packageDescription.trim()) {
      errs.packageDescription = 'Package description is required.';
    }

    const weightNum = parseFloat(weightKg);
    if (!weightKg.trim() || isNaN(weightNum) || weightNum <= 0) {
      errs.weightKg = 'Please enter a valid weight greater than 0 kg.';
    } else if (weightNum > 5000) {
      errs.weightKg = 'Package weight exceeds system payload limit of 5,000 kg.';
    }

    // Vehicle Assignment & Capacity Constraints
    if (assignedVehicleId) {
      const selectedVehicle = vehicles.find((v) => v.id === assignedVehicleId);
      if (selectedVehicle) {
        if (
          (selectedVehicle.status === 'Maintenance' || selectedVehicle.status === 'Offline') &&
          initialOrder?.assignedVehicleId !== assignedVehicleId
        ) {
          errs.assignedVehicleId = `${selectedVehicle.id} is currently ${selectedVehicle.status} and cannot accept new deliveries.`;
        } else if (!isNaN(weightNum) && weightNum > selectedVehicle.capacityKg) {
          errs.assignedVehicleId = `Package weight (${weightNum} kg) exceeds ${selectedVehicle.id} maximum capacity (${selectedVehicle.capacityKg} kg).`;
        }
      }
    }

    if (!deadlineTime.trim()) {
      errs.deadlineTime = 'Delivery deadline is required.';
    }

    // Optional phone validation
    if (phoneNumber.trim() && phoneNumber.trim().length < 7) {
      errs.phoneNumber = 'Please enter a valid phone number or leave blank.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const formatDisplayTime = (timeStr: string) => {
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      return timeStr;
    }
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 === 0 ? 12 : h % 12;
    return `${formattedH.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const formattedDeadline = formatDisplayTime(deadlineTime);
    const formattedEarliest = formatDisplayTime(timeWindowEarliest);
    const formattedLatest = formatDisplayTime(timeWindowLatest);

    // Generate unique ID if new
    const id = isEditing && initialOrder ? initialOrder.id : `ORD-${8020 + existingOrdersCount + 1}`;

    const orderData: DeliveryOrder = {
      id,
      customerName: customerName.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      pickupAddress: pickupAddress.trim(),
      destination: destination.trim(),
      deliveryAddress: destination.trim(),
      weightKg: parseFloat(weightKg),
      packageWeightKg: parseFloat(weightKg),
      packageDescription: packageDescription.trim(),
      priority,
      status: isEditing && initialOrder ? status : assignedVehicleId ? 'assigned' : 'pending',
      deliveryDeadline: formattedDeadline,
      timeWindowEarliest: formattedEarliest,
      timeWindowLatest: formattedLatest,
      serviceTimeMinutes: parseInt(serviceTimeMinutes, 10) || 10,
      estimatedArrival: formattedDeadline,
      assignedVehicleId: assignedVehicleId || undefined,
      specialInstructions: specialInstructions.trim() || undefined,
      notes: specialInstructions.trim() || undefined,
      createdAt: isEditing && initialOrder ? initialOrder.createdAt : new Date().toISOString(),
      coordinates:
        isEditing && initialOrder?.coordinates
          ? initialOrder.coordinates
          : {
              x: Math.floor(20 + Math.random() * 60),
              y: Math.floor(20 + Math.random() * 60),
            },
    };

    setIsSubmittedSuccess(true);
    setTimeout(() => {
      onSaveOrder(orderData);
      setIsSubmittedSuccess(false);
      onClose();
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl my-auto rounded-xl bg-[#0f172a] border border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              {isEditing ? <Edit3 className="w-4 h-4" /> : <PackagePlus className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isEditing ? `Edit Order: ${initialOrder?.id}` : 'Create Delivery Request'}
                </h3>
                {isEditing && (
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    Modifying Existing
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? 'Update order specifications, destination, and dispatch constraints.'
                  : 'Register a new order into the logistics dispatch manifest.'}
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {isSubmittedSuccess ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">
                {isEditing ? 'Order Updated Successfully' : 'Order Created Successfully'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Saved changes to delivery manifest. Synchronizing dashboard metrics and route state.
              </p>
            </div>
          ) : (
            <form id="order-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Customer & Phone Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Customer / Business Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Metro Fresh Groceries"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border text-xs ${
                      errors.customerName ? 'border-rose-500' : 'border-slate-700/80'
                    } focus:outline-hidden focus:border-teal-500 transition-colors`}
                  />
                  {errors.customerName && (
                    <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.customerName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Phone Number <span className="text-slate-400 text-[10px]">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="e.g. (555) 234-8901"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={`w-full pl-8 pr-3 py-2 bg-slate-900 text-slate-100 rounded-lg border text-xs ${
                        errors.phoneNumber ? 'border-rose-500' : 'border-slate-700/80'
                      } focus:outline-hidden focus:border-teal-500 transition-colors`}
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.phoneNumber && (
                    <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.phoneNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Pickup & Destination Addresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-teal-400" />
                    <span>Pickup Address / Hub</span> <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RouteWise Central Depot, Bay 4"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border text-xs ${
                      errors.pickupAddress ? 'border-rose-500' : 'border-slate-700/80'
                    } focus:outline-hidden focus:border-teal-500 transition-colors`}
                  />
                  {errors.pickupAddress && (
                    <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.pickupAddress}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delivery Address (Destination)</span>{' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 442 Market St, Suite 100"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border text-xs ${
                      errors.destination ? 'border-rose-500' : 'border-slate-700/80'
                    } focus:outline-hidden focus:border-teal-500 transition-colors`}
                  />
                  {errors.destination && (
                    <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.destination}
                    </p>
                  )}
                </div>
              </div>

              {/* Package Description */}
              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <span>Package Description / Cargo Type</span>{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Organic produce crates and refrigerated dairy"
                  value={packageDescription}
                  onChange={(e) => setPackageDescription(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border text-xs ${
                    errors.packageDescription ? 'border-rose-500' : 'border-slate-700/80'
                  } focus:outline-hidden focus:border-teal-500 transition-colors`}
                />
                {errors.packageDescription && (
                  <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.packageDescription}
                  </p>
                )}
              </div>

              {/* Weight, Priority & Deadline Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Weight */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                    <span>Weight (kg)</span> <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="500"
                    placeholder="e.g. 15.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border font-mono text-xs ${
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
                    className="w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 focus:outline-hidden focus:border-teal-500 transition-colors cursor-pointer text-xs"
                  >
                    <option value="low">Low (Standard SLA)</option>
                    <option value="normal">Normal (Routine delivery)</option>
                    <option value="high">High (Time sensitive)</option>
                    <option value="urgent">Urgent (Express immediate)</option>
                  </select>
                </div>

                {/* Delivery Deadline / Latest Time Window */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Latest Allowed Arrival</span> <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={deadlineTime.includes('M') ? '14:30' : deadlineTime}
                    onChange={(e) => {
                      setDeadlineTime(e.target.value);
                      setTimeWindowLatest(e.target.value);
                    }}
                    className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border font-mono text-xs ${
                      errors.deadlineTime ? 'border-rose-500' : 'border-slate-700/80'
                    } focus:outline-hidden focus:border-teal-500 transition-colors`}
                  />
                  {errors.deadlineTime && (
                    <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.deadlineTime}
                    </p>
                  )}
                </div>
              </div>

              {/* Time Window Earliest & Service Dwell Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>Earliest Allowed Arrival</span>
                  </label>
                  <input
                    type="time"
                    value={timeWindowEarliest.includes('M') ? '08:30' : timeWindowEarliest}
                    onChange={(e) => setTimeWindowEarliest(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 font-mono text-xs focus:outline-hidden focus:border-teal-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Vehicle waits if arriving earlier</p>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Estimated Service Time (Minutes)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={serviceTimeMinutes}
                    onChange={(e) => setServiceTimeMinutes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 font-mono text-xs focus:outline-hidden focus:border-teal-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Dwell time at customer stop</p>
                </div>
              </div>

              {/* Assigned Vehicle & Status (Status visible when editing) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Assigned Vehicle</span>{' '}
                    <span className="text-slate-400 text-[10px]">(Optional)</span>
                  </label>
                  <select
                    value={assignedVehicleId}
                    onChange={(e) => {
                      setAssignedVehicleId(e.target.value);
                      setErrors((prev) => {
                        const { assignedVehicleId: _, ...rest } = prev;
                        return rest;
                      });
                    }}
                    className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border text-xs focus:outline-hidden focus:border-teal-500 transition-colors cursor-pointer ${
                      errors.assignedVehicleId ? 'border-rose-500' : 'border-slate-700/80'
                    }`}
                  >
                    <option value="">Unassigned (Awaiting dispatch)</option>
                    {vehicles.map((v) => {
                      const isUnavailable = v.status === 'Maintenance' || v.status === 'Offline';
                      const isCurrent = initialOrder?.assignedVehicleId === v.id;
                      const disabled = isUnavailable && !isCurrent;

                      return (
                        <option
                          key={v.id}
                          value={v.id}
                          disabled={disabled}
                          className={disabled ? 'bg-slate-950 text-slate-500' : 'bg-slate-900 text-slate-100'}
                        >
                          {v.id} — {v.driverName} ({v.status} · Max {v.capacityKg} kg{disabled ? ' · Unavailable' : ''})
                        </option>
                      );
                    })}
                  </select>
                  {errors.assignedVehicleId && (
                    <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {errors.assignedVehicleId}
                    </p>
                  )}
                </div>

                {isEditing ? (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Current Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as OrderStatus)}
                      className="w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 focus:outline-hidden focus:border-teal-500 transition-colors cursor-pointer text-xs capitalize"
                    >
                      <option value="pending">Pending</option>
                      <option value="assigned">Assigned</option>
                      <option value="in-transit">In Transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Initial Status</label>
                    <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 text-xs">
                      {assignedVehicleId ? 'Assigned to selected fleet unit' : 'Pending dispatch queue'}
                    </div>
                  </div>
                )}
              </div>

              {/* Special Instructions / Notes */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Special Instructions &amp; Handling Notes{' '}
                  <span className="text-slate-400 text-[10px]">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Loading dock code #4490, temperature-sensitive storage, call upon arrival..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 focus:outline-hidden focus:border-teal-500 transition-colors resize-none text-xs"
                />
              </div>
            </form>
          )}
        </div>

        {/* Modal Actions Footer */}
        {!isSubmittedSuccess && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              All records sync directly to active dashboard manifest
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="order-form"
                className="px-4 py-2 text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 active:bg-teal-500 font-semibold rounded-lg transition-colors shadow-xs shadow-teal-500/20"
              >
                {isEditing ? 'Save Changes' : 'Create Delivery Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
