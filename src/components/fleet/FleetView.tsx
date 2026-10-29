import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  RotateCcw,
  CheckCircle2,
  Clock,
  Wrench,
  AlertOctagon,
  AlertTriangle,
  Eye,
  Edit3,
  Trash2,
  LayoutGrid,
  List,
  Fuel,
  User,
  Phone,
  Scale,
  Building,
  X,
} from 'lucide-react';
import { Vehicle, DeliveryOrder, VehicleStatus } from '../../types';
import { computeVehicleMetrics } from '../../utils/fleetStorage';

interface FleetViewProps {
  vehicles: Vehicle[];
  orders: DeliveryOrder[];
  onOpenAddVehicle: () => void;
  onOpenEditVehicle: (vehicle: Vehicle) => void;
  onViewVehicleDetails: (vehicle: Vehicle) => void;
  onRequestChangeStatus: (vehicle: Vehicle, newStatus: VehicleStatus) => void;
  onRequestDeleteVehicle: (vehicle: Vehicle) => void;
  onResetDemoFleet: () => void;
}

type SortField = 'registration' | 'capacity' | 'utilization';
type SortDirection = 'asc' | 'desc';

export const FleetView: React.FC<FleetViewProps> = ({
  vehicles,
  orders,
  onOpenAddVehicle,
  onOpenEditVehicle,
  onViewVehicleDetails,
  onRequestChangeStatus,
  onRequestDeleteVehicle,
  onResetDemoFleet,
}) => {
  // Search, Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('capacity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Dynamically compute KPIs from real fleet data
  const summaryKPIs = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter((v) => v.status === 'Available').length;
    const onRoute = vehicles.filter((v) => v.status === 'On Route').length;

    // Requiring attention: Maintenance, Offline, or Over Capacity
    const requiringAttention = vehicles.filter((v) => {
      const metrics = computeVehicleMetrics(v, orders);
      return v.status === 'Maintenance' || v.status === 'Offline' || metrics.isOverCapacity;
    }).length;

    return { total, available, onRoute, requiringAttention };
  }, [vehicles, orders]);

  // Extract distinct vehicle types for filter dropdown
  const vehicleTypes = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => {
      if (v.vehicleType) set.add(v.vehicleType);
    });
    return Array.from(set);
  }, [vehicles]);

  // Filter & Sort Vehicles
  const filteredAndSortedVehicles = useMemo(() => {
    const filtered = vehicles.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.id.toLowerCase().includes(q) ||
        (v.registrationNumber && v.registrationNumber.toLowerCase().includes(q)) ||
        (v.licensePlate && v.licensePlate.toLowerCase().includes(q)) ||
        (v.name && v.name.toLowerCase().includes(q)) ||
        (v.vehicleType && v.vehicleType.toLowerCase().includes(q)) ||
        (v.driverName && v.driverName.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || v.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesType = typeFilter === 'all' || v.vehicleType?.toLowerCase() === typeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesType;
    });

    return filtered.sort((a, b) => {
      const metricsA = computeVehicleMetrics(a, orders);
      const metricsB = computeVehicleMetrics(b, orders);

      if (sortBy === 'capacity') {
        const diff = a.capacityKg - b.capacityKg;
        return sortDirection === 'asc' ? diff : -diff;
      }
      if (sortBy === 'utilization') {
        const diff = metricsA.utilizationPercent - metricsB.utilizationPercent;
        return sortDirection === 'asc' ? diff : -diff;
      }
      // Registration
      const regA = a.registrationNumber || a.licensePlate || '';
      const regB = b.registrationNumber || b.licensePlate || '';
      const diff = regA.localeCompare(regB);
      return sortDirection === 'asc' ? diff : -diff;
    });
  }, [vehicles, orders, searchQuery, statusFilter, typeFilter, sortBy, sortDirection]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setSortBy('capacity');
    setSortDirection('desc');
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || typeFilter !== 'all';

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
            <Truck className="w-3 h-3" /> On Route
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
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const getProgressBarColor = (utilizationPercent: number, isOverCapacity: boolean) => {
    if (isOverCapacity) return 'bg-rose-500';
    if (utilizationPercent >= 90) return 'bg-amber-400';
    if (utilizationPercent > 50) return 'bg-teal-400';
    return 'bg-emerald-400';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white">
              Fleet Management
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-teal-500/10 text-teal-300 border border-teal-500/20">
              Module 3 Active
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal mt-0.5">
            Manage vehicles, capacities, and driver availability
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onResetDemoFleet}
            title="Reset fleet dataset to initial 5 vehicles"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900/90 hover:bg-slate-800 rounded-lg border border-slate-700/60 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Fleet</span>
          </button>

          <button
            onClick={onOpenAddVehicle}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 active:bg-teal-500 rounded-lg transition-colors shadow-sm shadow-teal-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* 2. Dynamic Summary Metric Cards (Calculated from real fleet & order data) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Vehicles */}
        <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Vehicles</span>
            <Truck className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-white font-mono mt-1.5 tabular-nums">
            {summaryKPIs.total}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Active fleet roster</span>
        </div>

        {/* Available Vehicles */}
        <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-emerald-400 font-mono mt-1.5 tabular-nums">
            {summaryKPIs.available}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Ready for assignment</span>
        </div>

        {/* Vehicles On Route */}
        <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">On Route</span>
            <Clock className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-teal-300 font-mono mt-1.5 tabular-nums">
            {summaryKPIs.onRoute}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Active loops running</span>
        </div>

        {/* Requiring Attention */}
        <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Requiring Attention</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-amber-400 font-mono mt-1.5 tabular-nums">
            {summaryKPIs.requiringAttention}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Maintenance / Offline</span>
        </div>
      </div>

      {/* 3. Search, Filter, Sort & View Mode Bar */}
      <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by ID, registration plate, vehicle type, or driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-900 text-xs text-slate-200 placeholder-slate-400 rounded-lg border border-slate-700/60 focus:outline-hidden focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/30 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                aria-label="Clear search text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters, Sorters & View Switcher */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <label htmlFor="fleet-status-filter" className="sr-only">
                Filter by Status:
              </label>
              <select
                id="fleet-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All Statuses ({vehicles.length})</option>
                <option value="available" className="bg-slate-900">Available ({summaryKPIs.available})</option>
                <option value="on route" className="bg-slate-900">On Route ({summaryKPIs.onRoute})</option>
                <option value="maintenance" className="bg-slate-900">Maintenance</option>
                <option value="offline" className="bg-slate-900">Offline</option>
              </select>
            </div>

            {/* Vehicle Type Filter */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-slate-300">
              <label htmlFor="fleet-type-filter" className="sr-only">
                Filter by Type:
              </label>
              <select
                id="fleet-type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All Vehicle Types</option>
                {vehicleTypes.map((t) => (
                  <option key={t} value={t} className="bg-slate-900">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <label htmlFor="fleet-sort-select" className="sr-only">
                Sort vehicles:
              </label>
              <select
                id="fleet-sort-select"
                value={`${sortBy}-${sortDirection}`}
                onChange={(e) => {
                  const [f, d] = e.target.value.split('-') as [SortField, SortDirection];
                  setSortBy(f);
                  setSortDirection(d);
                }}
                className="bg-transparent text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="capacity-desc" className="bg-slate-900">Capacity: High to Low</option>
                <option value="capacity-asc" className="bg-slate-900">Capacity: Low to High</option>
                <option value="utilization-desc" className="bg-slate-900">Utilization: High to Low</option>
                <option value="utilization-asc" className="bg-slate-900">Utilization: Low to High</option>
                <option value="registration-asc" className="bg-slate-900">Registration: A-Z</option>
                <option value="registration-desc" className="bg-slate-900">Registration: Z-A</option>
              </select>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-teal-400 hover:text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-700/60 rounded-lg ml-auto sm:ml-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-teal-500/20 text-teal-300'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Grid cards view"
                aria-label="Cards view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'table'
                    ? 'bg-teal-500/20 text-teal-300'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Table list view"
                aria-label="Table view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Vehicles Presentation: Cards View OR Table View */}
      {filteredAndSortedVehicles.length > 0 ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAndSortedVehicles.map((vehicle) => {
              const metrics = computeVehicleMetrics(vehicle, orders);
              const isMaintenanceOrOffline =
                vehicle.status === 'Maintenance' || vehicle.status === 'Offline';

              return (
                <div
                  key={vehicle.id}
                  className="rounded-xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 p-4 transition-all duration-150 flex flex-col justify-between shadow-xs group"
                >
                  <div>
                    {/* Top Header: ID, Plate, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: vehicle.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base text-white tracking-tight">
                              {vehicle.id}
                            </span>
                            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                              {vehicle.registrationNumber || vehicle.licensePlate}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 font-medium mt-0.5 truncate max-w-[200px]" title={vehicle.name}>
                            {vehicle.name}
                          </p>
                        </div>
                      </div>
                      <div>{getStatusBadge(vehicle.status)}</div>
                    </div>

                    {/* Driver & Type */}
                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300 truncate">
                        <User className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span className="font-semibold text-white">{vehicle.driverName}</span>
                      </div>
                      <span className="text-[11px] text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 truncate">
                        {vehicle.vehicleType}
                      </span>
                    </div>

                    {/* Capacity Progress Bar with accurate load calculation */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Scale className="w-3.5 h-3.5 text-slate-400" />
                          <span>Assigned Payload</span>
                        </span>
                        <span className="font-mono text-xs text-slate-200 font-bold tabular-nums">
                          {metrics.currentLoadKg} / {vehicle.capacityKg} kg{' '}
                          <span
                            className={`font-semibold ${
                              metrics.isOverCapacity ? 'text-rose-400' : 'text-teal-400'
                            }`}
                          >
                            ({metrics.utilizationPercent}%)
                          </span>
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(
                            metrics.utilizationPercent,
                            metrics.isOverCapacity
                          )}`}
                          style={{ width: `${Math.min(metrics.utilizationPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Operational Details Grid */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div>
                        <span className="text-[10px] uppercase font-mono block text-slate-400">
                          Active Orders
                        </span>
                        <span className="font-mono text-slate-200 font-semibold">
                          {metrics.stopsCount} stops ({metrics.currentLoadKg} kg)
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono block text-slate-400">
                          Remaining Payload
                        </span>
                        <span className="font-mono text-teal-300 font-semibold">
                          {metrics.remainingCapacityKg} kg left
                        </span>
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] uppercase font-mono block text-slate-400">
                          Powertrain
                        </span>
                        <span className="text-slate-300 truncate block">
                          {vehicle.fuelType || 'Electric'}
                        </span>
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] uppercase font-mono block text-slate-400">
                          Base Depot
                        </span>
                        <span className="text-slate-300 truncate block" title={vehicle.currentDepot}>
                          {vehicle.currentDepot.split(' ')[0]} Hub
                        </span>
                      </div>
                    </div>

                    {/* Inactive with active orders alert */}
                    {isMaintenanceOrOffline && metrics.stopsCount > 0 && (
                      <div className="mt-2 px-2.5 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span className="truncate">
                          {vehicle.status} with {metrics.stopsCount} assigned stops.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {/* Status quick select */}
                    <select
                      value={vehicle.status}
                      onChange={(e) => onRequestChangeStatus(vehicle, e.target.value as VehicleStatus)}
                      aria-label={`Change status for ${vehicle.id}`}
                      className="bg-slate-900 border border-slate-700/60 text-slate-300 text-[11px] rounded px-2 py-1 focus:outline-hidden hover:border-slate-600 cursor-pointer"
                    >
                      <option value="Available">Available</option>
                      <option value="On Route">On Route</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Offline">Offline</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onViewVehicleDetails(vehicle)}
                        title="View vehicle details & cargo breakdown"
                        className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onOpenEditVehicle(vehicle)}
                        title="Edit vehicle specifications"
                        className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onRequestDeleteVehicle(vehicle)}
                        title="Delete vehicle from fleet roster"
                        className="p-1.5 text-rose-400 hover:text-rose-300 rounded-md hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="rounded-xl bg-[#0f172a] border border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-medium">
                    <th className="py-3 px-4 whitespace-nowrap">Vehicle ID</th>
                    <th className="py-3 px-4 whitespace-nowrap">Registration</th>
                    <th className="py-3 px-4 min-w-[160px]">Vehicle Name &amp; Type</th>
                    <th className="py-3 px-4 whitespace-nowrap">Driver</th>
                    <th className="py-3 px-4 whitespace-nowrap">Max Capacity</th>
                    <th className="py-3 px-4 min-w-[160px]">Assigned Load &amp; Utilization</th>
                    <th className="py-3 px-4 whitespace-nowrap">Active Stops</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAndSortedVehicles.map((vehicle) => {
                    const metrics = computeVehicleMetrics(vehicle, orders);
                    return (
                      <tr
                        key={vehicle.id}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => onViewVehicleDetails(vehicle)}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: vehicle.color }}
                            />
                            <span>{vehicle.id}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-200 whitespace-nowrap">
                          <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 font-medium">
                            {vehicle.registrationNumber || vehicle.licensePlate}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-white">
                          <div className="font-semibold">{vehicle.name}</div>
                          <div className="text-[11px] text-teal-400 mt-0.5">
                            {vehicle.vehicleType} · {vehicle.fuelType}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-200 whitespace-nowrap">
                          <div className="font-medium">{vehicle.driverName}</div>
                          {vehicle.driverPhone && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {vehicle.driverPhone}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-200 whitespace-nowrap">
                          {vehicle.capacityKg} kg
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                            <span className="text-slate-300 tabular-nums">
                              {metrics.currentLoadKg} kg
                            </span>
                            <span
                              className={
                                metrics.isOverCapacity ? 'text-rose-400 font-bold' : 'text-teal-400'
                              }
                            >
                              {metrics.utilizationPercent}%
                            </span>
                          </div>
                          <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getProgressBarColor(
                                metrics.utilizationPercent,
                                metrics.isOverCapacity
                              )}`}
                              style={{ width: `${Math.min(metrics.utilizationPercent, 100)}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-200 whitespace-nowrap">
                          {metrics.stopsCount} / {vehicle.maxStops}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(vehicle.status)}
                        </td>

                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onViewVehicleDetails(vehicle)}
                              title="View details"
                              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onOpenEditVehicle(vehicle)}
                              title="Edit vehicle"
                              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onRequestDeleteVehicle(vehicle)}
                              title="Delete vehicle"
                              className="p-1.5 text-rose-400 hover:text-rose-300 rounded-md hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Empty State */
        <div className="rounded-xl bg-[#0f172a] border border-slate-800 p-12 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Truck className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300 mb-1">
              No fleet vehicles match your criteria
            </p>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Try adjusting the search query, status, or vehicle type filters.
            </p>
            <button
              onClick={clearAllFilters}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}

      {/* Persistence and Simulation Note */}
      <div className="px-1 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <span>
          Fleet state: Simulated demo data saved in browser LocalStorage. Dynamic cargo loads computed live from assigned orders.
        </span>
        <span className="font-mono text-teal-400">RouteWise AI · Module 3</span>
      </div>
    </div>
  );
};
