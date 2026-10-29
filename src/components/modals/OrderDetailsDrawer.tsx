import React from 'react';
import {
  X,
  Package,
  MapPin,
  Building,
  Phone,
  Clock,
  Scale,
  Truck,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit3,
  AlertTriangle,
} from 'lucide-react';
import { DeliveryOrder, Vehicle } from '../../types';

interface OrderDetailsDrawerProps {
  order: DeliveryOrder | null;
  onClose: () => void;
  onEdit: (order: DeliveryOrder) => void;
  onConfirmDeliver: (order: DeliveryOrder) => void;
  onConfirmCancel: (order: DeliveryOrder) => void;
  vehicles?: Vehicle[];
}

export const OrderDetailsDrawer: React.FC<OrderDetailsDrawerProps> = ({
  order,
  onClose,
  onEdit,
  onConfirmDeliver,
  onConfirmCancel,
  vehicles = [],
}) => {
  if (!order) return null;

  const assignedVehicle = vehicles.find((v) => v.id === order.assignedVehicleId);

  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            Urgent Priority
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            High Priority
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            Normal Priority
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Low Priority
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case 'in-transit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
            <Truck className="w-3.5 h-3.5" /> In Transit
          </span>
        );
      case 'assigned':
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Clock className="w-3.5 h-3.5" /> Assigned
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Pending
          </span>
        );
    }
  };

  const formattedCreated = new Date(order.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl bg-[#0f172a] border border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-teal-300 tracking-tight">
                  {order.id}
                </span>
                {getStatusBadge(order.status)}
              </div>
              <h3 className="text-base font-bold text-white mt-0.5 truncate max-w-sm">
                {order.customerName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Cancelled Banner if applicable */}
          {isCancelled && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Order Cancelled</p>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  This order has been cancelled and removed from active route scheduling. It cannot be marked as delivered.
                </p>
              </div>
            </div>
          )}

          {/* Route: Pickup & Destination Card */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0 mt-0.5">
                <Building className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Pickup Location (Origin)
                </span>
                <p className="text-slate-100 font-medium mt-0.5">{order.pickupAddress}</p>
              </div>
            </div>

            <div className="ml-3 pl-3 border-l border-slate-700/60 py-0.5 text-[11px] text-slate-400 font-mono">
              Transit segment
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Delivery Destination
                </span>
                <p className="text-slate-100 font-medium mt-0.5">{order.destination}</p>
              </div>
            </div>
          </div>

          {/* Customer & Cargo Specs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Customer Contact</span>
              <p className="text-white font-semibold mt-1 truncate">{order.customerName}</p>
              {order.phoneNumber ? (
                <a
                  href={`tel:${order.phoneNumber}`}
                  className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 mt-0.5"
                >
                  <Phone className="w-3 h-3" />
                  <span>{order.phoneNumber}</span>
                </a>
              ) : (
                <span className="text-[11px] text-slate-400 mt-0.5 block">No phone provided</span>
              )}
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Package Weight</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Scale className="w-4 h-4 text-slate-400" />
                <span className="text-base font-mono font-bold text-white tabular-nums">
                  {order.weightKg.toFixed(1)} kg
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Standard payload</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Delivery Deadline</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-mono font-bold text-white tabular-nums">
                  {order.deliveryDeadline}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Target SLA window</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Assigned Fleet</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Truck className="w-4 h-4 text-slate-400" />
                <span className="font-mono font-bold text-slate-200">
                  {order.assignedVehicleId || 'Unassigned'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 truncate block">
                {assignedVehicle
                  ? `${assignedVehicle.driverName} (${assignedVehicle.currentZone})`
                  : 'Staged for routing'}
              </span>
            </div>
          </div>

          {/* Cargo Description */}
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-mono block flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>Package Description</span>
            </span>
            <p className="text-slate-200 mt-1 leading-relaxed">
              {order.packageDescription || 'General delivery freight'}
            </p>
          </div>

          {/* Special Instructions */}
          {(order.specialInstructions || order.notes) && (
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">
                Special Handling Instructions
              </span>
              <p className="text-slate-300 mt-1 leading-relaxed">
                {order.specialInstructions || order.notes}
              </p>
            </div>
          )}

          {/* Creation Metadata */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Registered: {formattedCreated}</span>
            </span>
            <div>{getPriorityBadge(order.priority)}</div>
          </div>
        </div>

        {/* Drawer Actions Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Left Actions: Cancel & Deliver */}
          <div className="flex items-center gap-2">
            {!isCancelled && !isDelivered && (
              <button
                type="button"
                onClick={() => onConfirmDeliver(order)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Mark Delivered</span>
              </button>
            )}

            {!isCancelled && !isDelivered && (
              <button
                type="button"
                onClick={() => onConfirmCancel(order)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Order</span>
              </button>
            )}
          </div>

          {/* Right Actions: Edit & Close */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(order);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Order</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
