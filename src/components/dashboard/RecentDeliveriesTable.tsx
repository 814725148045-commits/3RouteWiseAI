import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  Eye,
  Plus,
  RefreshCw,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { DeliveryOrder, OrderPriority, OrderStatus } from '../../types';

interface RecentDeliveriesTableProps {
  orders: DeliveryOrder[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onViewOrder: (order: DeliveryOrder) => void;
  onOpenAddOrder: () => void;
  onUpdateStatus?: (orderId: string, newStatus: OrderStatus) => void;
}

export const RecentDeliveriesTable: React.FC<RecentDeliveriesTableProps> = ({
  orders,
  searchQuery,
  onSearchChange,
  onViewOrder,
  onOpenAddOrder,
  onUpdateStatus,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Text search
      const matchesSearch =
        !searchQuery ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.destination.toLowerCase().includes(searchQuery.toLowerCase());

      // Priority filter
      const matchesPriority =
        priorityFilter === 'all' || order.priority.toLowerCase() === priorityFilter.toLowerCase();

      // Status filter
      const matchesStatus =
        statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [orders, searchQuery, priorityFilter, statusFilter]);

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
            <AlertCircle className="w-3 h-3" /> Cancelled
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

  const clearAllFilters = () => {
    onSearchChange('');
    setPriorityFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchQuery !== '' || priorityFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="rounded-xl bg-[#0f172a] border border-slate-800 shadow-sm overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Recent Deliveries</h2>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/50">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live manifest queue with priority sorting and arrival estimations
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority select */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <label htmlFor="priority-filter" className="text-slate-400 text-[11px] sr-only">
              Priority:
            </label>
            <select
              id="priority-filter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Priorities</option>
              <option value="urgent" className="bg-slate-900">Urgent</option>
              <option value="high" className="bg-slate-900">High</option>
              <option value="normal" className="bg-slate-900">Normal</option>
              <option value="low" className="bg-slate-900">Low</option>
            </select>
          </div>

          {/* Status select */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <label htmlFor="status-filter" className="text-slate-400 text-[11px] sr-only">
              Status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Statuses</option>
              <option value="pending" className="bg-slate-900">Pending</option>
              <option value="assigned" className="bg-slate-900">Assigned</option>
              <option value="in-transit" className="bg-slate-900">In Transit</option>
              <option value="delivered" className="bg-slate-900">Delivered</option>
              <option value="cancelled" className="bg-slate-900">Cancelled</option>
            </select>
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-teal-400 hover:text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}

          {/* Add Order quick trigger */}
          <button
            onClick={onOpenAddOrder}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors ml-auto sm:ml-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-medium">
              <th className="py-3 px-4 whitespace-nowrap">Order ID</th>
              <th className="py-3 px-4 whitespace-nowrap">Customer</th>
              <th className="py-3 px-4 min-w-[200px]">Destination</th>
              <th className="py-3 px-4 whitespace-nowrap">Weight</th>
              <th className="py-3 px-4 whitespace-nowrap">Priority</th>
              <th className="py-3 px-4 whitespace-nowrap">Status</th>
              <th className="py-3 px-4 whitespace-nowrap">Estimated Arrival</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  onClick={() => onViewOrder(order)}
                >
                  {/* Order ID */}
                  <td className="py-3.5 px-4 font-mono font-bold text-teal-300 whitespace-nowrap">
                    {order.id}
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4 font-medium text-white whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{order.customerName}</span>
                    </div>
                  </td>

                  {/* Destination */}
                  <td className="py-3.5 px-4 text-slate-300">
                    <div className="truncate max-w-[240px]" title={order.destination}>
                      {order.destination}
                    </div>
                  </td>

                  {/* Weight */}
                  <td className="py-3.5 px-4 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                    {order.weightKg.toFixed(1)} kg
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getPriorityBadge(order.priority)}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>

                  {/* Estimated Arrival */}
                  <td className="py-3.5 px-4 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                    {order.estimatedArrival}
                  </td>

                  {/* Action */}
                  <td
                    className="py-3.5 px-4 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onViewOrder(order)}
                        title="View order specifications"
                        className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {onUpdateStatus && (
                        <select
                          value={order.status}
                          onChange={(e) =>
                            onUpdateStatus(order.id, e.target.value as OrderStatus)
                          }
                          aria-label={`Update status for ${order.id}`}
                          className="bg-slate-900 border border-slate-700/60 text-[11px] text-slate-300 rounded px-1.5 py-0.5 focus:outline-hidden hover:border-slate-600 cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="assigned">Assigned</option>
                          <option value="in-transit">In Transit</option>
                          <option value="delivered" disabled={order.status === 'cancelled'}>Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                      <Search className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-300 mb-1">
                      No matching deliveries found
                    </p>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      We couldn&apos;t find any delivery orders matching your filter criteria. Try adjusting your query or filters.
                    </p>
                    <button
                      onClick={clearAllFilters}
                      className="px-3 py-1.5 text-xs font-medium text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span>
            Displaying <span className="font-mono text-slate-300">{filteredOrders.length}</span> of{' '}
            <span className="font-mono text-slate-300">{orders.length}</span> recorded orders
          </span>
          <span aria-hidden="true">·</span>
          <span>SLA Target: 90%+ On-Time</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Delivered
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400" /> In Transit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Dispatched
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> Pending
          </span>
        </div>
      </div>
    </div>
  );
};
