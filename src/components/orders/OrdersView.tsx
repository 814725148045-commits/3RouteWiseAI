import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Truck,
  AlertTriangle,
  XCircle,
  Eye,
  Edit3,
  RotateCcw,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Building,
  Phone,
  Scale,
} from 'lucide-react';
import { DeliveryOrder, OrderPriority, OrderStatus, Vehicle } from '../../types';

interface OrdersViewProps {
  orders: DeliveryOrder[];
  vehicles: Vehicle[];
  onOpenAddOrder: () => void;
  onOpenEditOrder: (order: DeliveryOrder) => void;
  onViewOrderDetails: (order: DeliveryOrder) => void;
  onRequestDeliverOrder: (order: DeliveryOrder) => void;
  onRequestCancelOrder: (order: DeliveryOrder) => void;
  onResetDemoData: () => void;
  onExportData: () => void;
}

type SortField = 'deadline' | 'weight' | 'created';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 8;

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  vehicles,
  onOpenAddOrder,
  onOpenEditOrder,
  onViewOrderDetails,
  onRequestDeliverOrder,
  onRequestCancelOrder,
  onResetDemoData,
  onExportData,
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'pending').length;
    const assigned = orders.filter((o) => o.status === 'assigned' || o.status === 'dispatched').length;
    const inTransit = orders.filter((o) => o.status === 'in-transit').length;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;

    // At risk: Urgent/High priority orders that are pending or assigned and need immediate dispatch
    const atRisk = orders.filter(
      (o) =>
        (o.priority === 'urgent' || o.priority === 'high') &&
        (o.status === 'pending' || o.status === 'assigned')
    ).length;

    return { total, pending, assigned, inTransit, delivered, cancelled, atRisk };
  }, [orders]);

  // Filtered and Sorted Orders
  const filteredAndSortedOrders = useMemo(() => {
    const filtered = orders.filter((order) => {
      // Text search
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        order.id.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.destination.toLowerCase().includes(query) ||
        (order.packageDescription && order.packageDescription.toLowerCase().includes(query)) ||
        (order.phoneNumber && order.phoneNumber.toLowerCase().includes(query));

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'assigned') {
          matchesStatus = order.status === 'assigned' || order.status === 'dispatched';
        } else {
          matchesStatus = order.status.toLowerCase() === statusFilter.toLowerCase();
        }
      }

      // Priority filter
      const matchesPriority =
        priorityFilter === 'all' || order.priority.toLowerCase() === priorityFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesPriority;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === 'weight') {
        const diff = a.weightKg - b.weightKg;
        return sortDirection === 'asc' ? diff : -diff;
      }
      if (sortBy === 'deadline') {
        // Compare deadline strings
        const diff = a.deliveryDeadline.localeCompare(b.deliveryDeadline);
        return sortDirection === 'asc' ? diff : -diff;
      }
      // Default: created timestamp
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      const diff = timeA - timeB;
      return sortDirection === 'asc' ? diff : -diff;
    });
  }, [orders, searchQuery, statusFilter, priorityFilter, sortBy, sortDirection]);

  // Reset pagination when filters change
  const totalPages = Math.ceil(filteredAndSortedOrders.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredAndSortedOrders.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredAndSortedOrders, safeCurrentPage]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSortBy('created');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || priorityFilter !== 'all';

  // Badges
  const getPriorityBadge = (priority: OrderPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> Urgent
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            High
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Normal
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Delivered
          </span>
        );
      case 'in-transit':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Truck className="w-3 h-3" /> In Transit
          </span>
        );
      case 'assigned':
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clock className="w-3 h-3" /> Assigned
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
            <Clock className="w-3 h-3 text-slate-400" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white">
              Orders Management
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-teal-500/10 text-teal-300 border border-teal-500/20">
              Module 2 Active
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal mt-0.5">
            Create, track, and manage delivery requests
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onResetDemoData}
            title="Reset dataset to demo baseline"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900/90 hover:bg-slate-800 rounded-lg border border-slate-700/60 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Demo</span>
          </button>

          <button
            onClick={onExportData}
            title="Export manifest as JSON"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900/90 hover:bg-slate-800 rounded-lg border border-slate-700/60 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>

          <button
            onClick={onOpenAddOrder}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 active:bg-teal-500 rounded-lg transition-colors shadow-sm shadow-teal-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Order</span>
          </button>
        </div>
      </div>

      {/* 2. Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Orders */}
        <div className="p-3.5 rounded-xl bg-[#0f172a] border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Orders</span>
            <Package className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono mt-1 tabular-nums">
            {metrics.total}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Active manifest queue</span>
        </div>

        {/* Pending */}
        <div className="p-3.5 rounded-xl bg-[#0f172a] border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Pending</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-200 font-mono mt-1 tabular-nums">
            {metrics.pending}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Awaiting assignment</span>
        </div>

        {/* In Transit */}
        <div className="p-3.5 rounded-xl bg-[#0f172a] border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">In Transit</span>
            <Truck className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-teal-300 font-mono mt-1 tabular-nums">
            {metrics.inTransit}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Active vehicle runs</span>
        </div>

        {/* Delivered */}
        <div className="p-3.5 rounded-xl bg-[#0f172a] border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1 tabular-nums">
            {metrics.delivered}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Completed drops</span>
        </div>

        {/* At Risk */}
        <div className="p-3.5 rounded-xl bg-[#0f172a] border border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">At Risk</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 font-mono mt-1 tabular-nums">
            {metrics.atRisk}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Urgent pending/assigned</span>
        </div>
      </div>

      {/* 3. Search, Filter & Sort Controls */}
      <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Order ID, customer, address, cargo..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
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

          {/* Filters & Sorters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <label htmlFor="orders-status-filter" className="sr-only">
                Filter by Status:
              </label>
              <select
                id="orders-status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All Statuses ({orders.length})</option>
                <option value="pending" className="bg-slate-900">Pending ({metrics.pending})</option>
                <option value="assigned" className="bg-slate-900">Assigned ({metrics.assigned})</option>
                <option value="in-transit" className="bg-slate-900">In Transit ({metrics.inTransit})</option>
                <option value="delivered" className="bg-slate-900">Delivered ({metrics.delivered})</option>
                <option value="cancelled" className="bg-slate-900">Cancelled ({metrics.cancelled})</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-slate-300">
              <label htmlFor="orders-priority-filter" className="sr-only">
                Filter by Priority:
              </label>
              <select
                id="orders-priority-filter"
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All Priorities</option>
                <option value="urgent" className="bg-slate-900">Urgent</option>
                <option value="high" className="bg-slate-900">High</option>
                <option value="normal" className="bg-slate-900">Normal</option>
                <option value="low" className="bg-slate-900">Low</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <label htmlFor="orders-sort-select" className="sr-only">
                Sort orders:
              </label>
              <select
                id="orders-sort-select"
                value={`${sortBy}-${sortDirection}`}
                onChange={(e) => {
                  const [f, d] = e.target.value.split('-') as [SortField, SortDirection];
                  setSortBy(f);
                  setSortDirection(d);
                }}
                className="bg-transparent text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="created-desc" className="bg-slate-900">Created: Newest First</option>
                <option value="created-asc" className="bg-slate-900">Created: Oldest First</option>
                <option value="deadline-asc" className="bg-slate-900">Deadline: Earliest First</option>
                <option value="deadline-desc" className="bg-slate-900">Deadline: Latest First</option>
                <option value="weight-desc" className="bg-slate-900">Weight: Heavy to Light</option>
                <option value="weight-asc" className="bg-slate-900">Weight: Light to Heavy</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-teal-400 hover:text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Orders Data Table */}
      <div className="rounded-xl bg-[#0f172a] border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-medium">
                <th className="py-3 px-4 whitespace-nowrap">Order ID</th>
                <th className="py-3 px-4 min-w-[180px]">Customer</th>
                <th className="py-3 px-4 min-w-[200px]">Destination</th>
                <th className="py-3 px-4 whitespace-nowrap">Time Window [Earliest–Latest]</th>
                <th className="py-3 px-4 whitespace-nowrap">Service Dwell</th>
                <th className="py-3 px-4 whitespace-nowrap">Weight</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 whitespace-nowrap">Vehicle</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => {
                  const isCancelled = order.status === 'cancelled';
                  const isDelivered = order.status === 'delivered';

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => onViewOrderDetails(order)}
                    >
                      {/* Order ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-300 whitespace-nowrap">
                        {order.id}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 text-white">
                        <div className="font-semibold truncate max-w-[200px]">
                          {order.customerName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {order.phoneNumber && <span>{order.phoneNumber}</span>}
                          {order.packageDescription && (
                            <span className="truncate max-w-[180px] text-slate-400" title={order.packageDescription}>
                              · {order.packageDescription}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="truncate max-w-[220px] font-medium" title={order.destination}>
                          {order.destination}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[220px] mt-0.5" title={order.pickupAddress}>
                          From: {order.pickupAddress}
                        </div>
                      </td>

                      {/* Delivery Time Window [Earliest - Latest] */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-teal-300 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{order.timeWindowEarliest || '08:30 AM'} – {order.timeWindowLatest || order.deliveryDeadline}</span>
                        </span>
                      </td>

                      {/* Service Dwell Time */}
                      <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                        {order.serviceTimeMinutes || 10} min
                      </td>

                      {/* Weight */}
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-200 whitespace-nowrap">
                        {order.weightKg.toFixed(1)} kg
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>

                      {/* Assigned Vehicle */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {order.assignedVehicleId ? (
                          <span className="inline-flex items-center gap-1 font-mono text-slate-200 font-semibold bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                            <Truck className="w-3 h-3 text-teal-400" />
                            <span>{order.assignedVehicleId}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {/* View details */}
                          <button
                            onClick={() => onViewOrderDetails(order)}
                            title="View full order details"
                            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
                            aria-label={`View details for ${order.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit order */}
                          <button
                            onClick={() => onOpenEditOrder(order)}
                            title="Edit order"
                            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
                            aria-label={`Edit ${order.id}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Mark delivered (disabled if cancelled or already delivered) */}
                          <button
                            onClick={() => !isCancelled && !isDelivered && onRequestDeliverOrder(order)}
                            disabled={isCancelled || isDelivered}
                            title={
                              isCancelled
                                ? 'Cancelled orders cannot be marked as delivered'
                                : isDelivered
                                ? 'Already delivered'
                                : 'Mark as Delivered'
                            }
                            className={`p-1.5 rounded-md transition-colors ${
                              isCancelled || isDelivered
                                ? 'text-slate-600 cursor-not-allowed opacity-40'
                                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                            }`}
                            aria-label={`Mark ${order.id} as Delivered`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          {/* Cancel order (disabled if already cancelled or delivered) */}
                          <button
                            onClick={() => !isCancelled && !isDelivered && onRequestCancelOrder(order)}
                            disabled={isCancelled || isDelivered}
                            title={
                              isDelivered
                                ? 'Delivered orders cannot be cancelled'
                                : isCancelled
                                ? 'Already cancelled'
                                : 'Cancel Order'
                            }
                            className={`p-1.5 rounded-md transition-colors ${
                              isCancelled || isDelivered
                                ? 'text-slate-600 cursor-not-allowed opacity-40'
                                : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                            }`}
                            aria-label={`Cancel ${order.id}`}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-14 px-4 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-300 mb-1">
                        No orders match your filter criteria
                      </p>
                      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                        Try resetting the search keyword, status, or priority filter to view orders.
                      </p>
                      <button
                        onClick={clearAllFilters}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination & Footer Summary */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400 gap-3">
          <div>
            Showing{' '}
            <span className="font-mono text-slate-200 font-semibold">
              {filteredAndSortedOrders.length === 0
                ? 0
                : (safeCurrentPage - 1) * PAGE_SIZE + 1}
            </span>{' '}
            to{' '}
            <span className="font-mono text-slate-200 font-semibold">
              {Math.min(safeCurrentPage * PAGE_SIZE, filteredAndSortedOrders.length)}
            </span>{' '}
            of{' '}
            <span className="font-mono text-slate-200 font-semibold">
              {filteredAndSortedOrders.length}
            </span>{' '}
            orders
            {filteredAndSortedOrders.length !== orders.length && (
              <span className="ml-1 text-slate-400">
                (filtered from {orders.length} total)
              </span>
            )}
          </div>

          {/* Page Buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={safeCurrentPage === 1}
                className={`p-1.5 rounded-md border text-slate-300 transition-colors ${
                  safeCurrentPage === 1
                    ? 'border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                    : 'border-slate-700 hover:bg-slate-800 hover:text-white'
                }`}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isActive = pageNum === safeCurrentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-md font-mono text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-teal-400 text-slate-950 shadow-xs'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={safeCurrentPage === totalPages}
                className={`p-1.5 rounded-md border text-slate-300 transition-colors ${
                  safeCurrentPage === totalPages
                    ? 'border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                    : 'border-slate-700 hover:bg-slate-800 hover:text-white'
                }`}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* LocalStorage Note */}
      <div className="px-1 text-[11px] text-slate-400 flex items-center justify-between">
        <span>
          Data state: Saved in browser LocalStorage. Modifying orders here syncs live to the Fleet Overview Dashboard.
        </span>
        <span className="font-mono text-teal-400">RouteWise AI · Module 2</span>
      </div>
    </div>
  );
};
