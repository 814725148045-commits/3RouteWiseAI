import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Edit3,
  AlertCircle,
  CheckCircle2,
  Phone,
  Building,
  Scale,
  Fuel,
  FileText,
  User,
  ListOrdered,
} from 'lucide-react';
import { Vehicle, VehicleStatus } from '../../types';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVehicle: (vehicle: Vehicle) => void;
  initialVehicle?: Vehicle | null;
  existingVehicles: Vehicle[];
}

const VEHICLE_TYPES = [
  'Small Van',
  'Medium Van',
  'Large Cargo Truck',
  'Sprint Courier Van',
  'Refrigerated Transit Van',
  'Box Truck',
];

const FUEL_TYPES = [
  'Electric (EV)',
  'Hybrid',
  'Diesel',
  'Gasoline',
];

const DEPOTS = [
  'RouteWise Central Hub (Depot)',
  'North Sector Depot Bay',
  'East Industrial Logistics Hub',
  'West District Warehouse',
];

const PRESET_COLORS = [
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#38bdf8', // Sky Blue
  '#818cf8', // Indigo
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ec4899', // Pink
];

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  onSaveVehicle,
  initialVehicle,
  existingVehicles,
}) => {
  const isEditing = Boolean(initialVehicle);

  // Form State
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState('Medium Van');
  const [capacityKg, setCapacityKg] = useState('');
  const [maxStops, setMaxStops] = useState('15');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [status, setStatus] = useState<VehicleStatus>('Available');
  const [currentDepot, setCurrentDepot] = useState('RouteWise Central Hub (Depot)');
  const [fuelType, setFuelType] = useState('Electric (EV)');
  const [color, setColor] = useState('#06b6d4');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (initialVehicle) {
      setRegistrationNumber(initialVehicle.registrationNumber || initialVehicle.licensePlate || '');
      setName(initialVehicle.name || '');
      setVehicleType(initialVehicle.vehicleType || 'Medium Van');
      setCapacityKg(initialVehicle.capacityKg ? initialVehicle.capacityKg.toString() : '1000');
      setMaxStops(initialVehicle.maxStops ? initialVehicle.maxStops.toString() : '15');
      setDriverName(initialVehicle.driverName || '');
      setDriverPhone(initialVehicle.driverPhone || '');
      setStatus(initialVehicle.status || 'Available');
      setCurrentDepot(initialVehicle.currentDepot || initialVehicle.currentLocation || 'RouteWise Central Hub (Depot)');
      setFuelType(initialVehicle.fuelType || 'Electric (EV)');
      setColor(initialVehicle.color || '#06b6d4');
      setNotes(initialVehicle.notes || '');
      setErrors({});
      setIsSubmittedSuccess(false);
    } else {
      // Default for New Vehicle
      setRegistrationNumber('');
      setName('');
      setVehicleType('Medium Van');
      setCapacityKg('1000');
      setMaxStops('15');
      setDriverName('');
      setDriverPhone('');
      setStatus('Available');
      setCurrentDepot('RouteWise Central Hub (Depot)');
      setFuelType('Electric (EV)');
      setColor(PRESET_COLORS[existingVehicles.length % PRESET_COLORS.length]);
      setNotes('');
      setErrors({});
      setIsSubmittedSuccess(false);
    }
  }, [initialVehicle, isOpen, existingVehicles.length]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};

    // Registration number validation & duplicate check
    const regTrimmed = registrationNumber.trim().toUpperCase();
    if (!regTrimmed) {
      errs.registrationNumber = 'Registration number / License plate is required.';
    } else if (regTrimmed.length < 3) {
      errs.registrationNumber = 'Registration must be at least 3 characters.';
    } else {
      const duplicate = existingVehicles.find(
        (v) =>
          (v.registrationNumber?.toUpperCase() === regTrimmed ||
            v.licensePlate?.toUpperCase() === regTrimmed) &&
          v.id !== initialVehicle?.id
      );
      if (duplicate) {
        errs.registrationNumber = `Registration "${regTrimmed}" is already registered to ${duplicate.id}.`;
      }
    }

    if (!driverName.trim()) {
      errs.driverName = 'Assigned driver name is required.';
    }

    const capNum = parseFloat(capacityKg);
    if (!capacityKg.trim() || isNaN(capNum) || capNum <= 0) {
      errs.capacityKg = 'Maximum cargo capacity must be a positive number (> 0 kg).';
    } else if (capNum > 10000) {
      errs.capacityKg = 'Cargo capacity cannot exceed 10,000 kg.';
    }

    const stopsNum = parseInt(maxStops, 10);
    if (!maxStops.trim() || isNaN(stopsNum) || stopsNum <= 0) {
      errs.maxStops = 'Maximum delivery stops must be at least 1 stop.';
    } else if (stopsNum > 60) {
      errs.maxStops = 'Single route stops cannot exceed 60 stops.';
    }

    if (!currentDepot.trim()) {
      errs.currentDepot = 'Depot location is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Generate next unique vehicle ID
    let nextId = initialVehicle?.id;
    if (!nextId) {
      const maxExistingNum = existingVehicles.reduce((max, v) => {
        const match = v.id.match(/VAN-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 100);
      nextId = `VAN-${maxExistingNum + 1}`;
    }

    const reg = registrationNumber.trim().toUpperCase();
    const resolvedName = name.trim() || `${vehicleType} (${reg})`;

    const vehicleData: Vehicle = {
      id: nextId,
      registrationNumber: reg,
      licensePlate: reg,
      name: resolvedName,
      vehicleType,
      capacityKg: parseFloat(capacityKg),
      maxCapacityKg: parseFloat(capacityKg),
      maxStops: parseInt(maxStops, 10),
      stopsCount: initialVehicle?.stopsCount || 0,
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim() || undefined,
      status,
      currentDepot: currentDepot.trim(),
      currentLocation: currentDepot.trim(),
      currentZone: initialVehicle?.currentZone || 'Central Core',
      activeRouteName:
        initialVehicle?.activeRouteName ||
        (status === 'On Route' ? `${vehicleType} Express Loop` : 'Staged at Depot'),
      fuelType,
      fuelOrBattery:
        initialVehicle?.fuelOrBattery ||
        (fuelType.includes('Electric') ? '95% Battery' : '100% Fuel'),
      notes: notes.trim() || undefined,
      color,
      createdAt: initialVehicle?.createdAt || new Date().toISOString(),
      currentLoadKg: initialVehicle?.currentLoadKg || 0,
    };

    setIsSubmittedSuccess(true);
    setTimeout(() => {
      onSaveVehicle(vehicleData);
      setIsSubmittedSuccess(false);
      onClose();
    }, 450);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl my-auto rounded-xl bg-[#0f172a] border border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              {isEditing ? <Edit3 className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isEditing ? `Edit Vehicle: ${initialVehicle?.id}` : 'Register New Fleet Vehicle'}
                </h3>
                {isEditing && (
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    {initialVehicle?.registrationNumber || initialVehicle?.licensePlate}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? 'Update vehicle parameters, payload capacity limits, and driver assignments.'
                  : 'Register a delivery vehicle to join the RouteWise AI dispatch pool.'}
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
                {isEditing ? 'Vehicle Profile Updated' : 'Vehicle Successfully Registered'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Saved changes to fleet management roster. Capacity and assignment rules synchronized.
              </p>
            </div>
          ) : (
            <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Row 1: Registration Number & Vehicle Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Registration Number / License Plate <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7XKP-401"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border font-mono text-xs uppercase ${
                      errors.registrationNumber ? 'border-rose-500' : 'border-slate-700/80'
                    } focus:outline-hidden focus:border-teal-500 transition-colors`}
                  />
                  {errors.registrationNumber && (
                    <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.registrationNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Vehicle Descriptive Name{' '}
                    <span className="text-slate-400 text-[10px]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Small Electric Courier Van"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 text-xs focus:outline-hidden focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              {/* Row 2: Vehicle Type & Fuel Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-teal-400" />
                    <span>Vehicle Class / Type</span> <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 focus:outline-hidden focus:border-teal-500 transition-colors cursor-pointer text-xs"
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-slate-900">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5 text-teal-400" />
                    <span>Powertrain / Fuel Type</span>
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 focus:outline-hidden focus:border-teal-500 transition-colors cursor-pointer text-xs"
                  >
                    {FUEL_TYPES.map((f) => (
                      <option key={f} value={f} className="bg-slate-900">
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Max Payload & Max Delivery Stops */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                    <span>Max Cargo Capacity (kg)</span> <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="50"
                    max="10000"
                    placeholder="e.g. 500, 1000, 1500"
                    value={capacityKg}
                    onChange={(e) => setCapacityKg(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border font-mono text-xs ${
                      errors.capacityKg ? 'border-rose-500' : 'border-slate-700/80'
                    } focus:outline-hidden focus:border-teal-500 transition-colors`}
                  />
                  {errors.capacityKg ? (
                    <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.capacityKg}
                    </p>
                  ) : (
                    <p className="text-slate-400 mt-1 text-[10px]">
                      Benchmark categories: Small ~500kg · Medium ~1000kg · Heavy ~1500kg
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <ListOrdered className="w-3.5 h-3.5 text-slate-400" />
                    <span>Max Delivery Stops</span> <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    placeholder="e.g. 15"
                    value={maxStops}
                    onChange={(e) => setMaxStops(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border font-mono text-xs ${
                      errors.maxStops ? 'border-rose-500' : 'border-slate-700/80'
                    } focus:outline-hidden focus:border-teal-500 transition-colors`}
                  />
                  {errors.maxStops && (
                    <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.maxStops}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 4: Driver Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-teal-400" />
                    <span>Assigned Driver Name</span> <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Marcus Vance"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border text-xs ${
                      errors.driverName ? 'border-rose-500' : 'border-slate-700/80'
                    } focus:outline-hidden focus:border-teal-500 transition-colors`}
                  />
                  {errors.driverName && (
                    <p className="text-rose-400 mt-1 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.driverName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Driver Contact Phone</span>{' '}
                    <span className="text-slate-400 text-[10px]">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. (555) 234-9101"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 text-xs focus:outline-hidden focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              {/* Row 5: Depot & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-teal-400" />
                    <span>Depot / Base Hub</span> <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={currentDepot}
                    onChange={(e) => setCurrentDepot(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 focus:outline-hidden focus:border-teal-500 transition-colors cursor-pointer text-xs"
                  >
                    {DEPOTS.map((d) => (
                      <option key={d} value={d} className="bg-slate-900">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Operating Status <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                    className="w-full px-3 py-2 bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 focus:outline-hidden focus:border-teal-500 transition-colors cursor-pointer text-xs"
                  >
                    <option value="Available" className="bg-slate-900">Available (Ready for dispatch)</option>
                    <option value="On Route" className="bg-slate-900">On Route (Active deliveries)</option>
                    <option value="Maintenance" className="bg-slate-900">Maintenance (Service bay)</option>
                    <option value="Offline" className="bg-slate-900">Offline (Unavailable)</option>
                  </select>
                </div>
              </div>

              {/* Row 6: Color Badge Tag */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Route &amp; Map Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        color === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                  <span className="font-mono text-xs text-slate-400 ml-2">{color}</span>
                </div>
              </div>

              {/* Row 7: Notes */}
              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Maintenance or Dispatch Notes</span>{' '}
                  <span className="text-slate-400 text-[10px]">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Equipped with lift-gate, scheduled tire check next Tuesday..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
              Vehicles synchronize directly with active routing and dispatch
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
                form="vehicle-form"
                className="px-4 py-2 text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 active:bg-teal-500 font-semibold rounded-lg transition-colors shadow-xs shadow-teal-500/20"
              >
                {isEditing ? 'Save Vehicle Changes' : 'Register Vehicle'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
