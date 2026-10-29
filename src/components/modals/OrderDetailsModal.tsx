import React from 'react';
import {
  X,
  Package,
  MapPin,
  Clock,
  Scale,
  Truck,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { DeliveryOrder, OrderStatus } from '../../types';

interface OrderDetailsModalProps {
  order: DeliveryOrder | null;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  onUpdateStatus,
}) => {
  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-[#0f172a] border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono text-xs font-bold text-teal-300">{order.id}</span>
              <h3 className="text-sm font-bold text-white truncate max-w-[240px]">
                {order.customerName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Destination */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="flex items-start gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">
                  Delivery Destination
                </span>
                <p className="text-slate-100 font-medium mt-0.5 text-xs">{order.destination}</p>
              </div>
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Package Weight</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Scale className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm font-mono font-bold text-white tabular-nums">
                  {order.weightKg.toFixed(1)} kg
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">ETA Window</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm font-mono font-bold text-white tabular-nums">
                  {order.estimatedArrival}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Priority Class</span>
              <p className="mt-1 font-semibold capitalize text-teal-300">{order.priority}</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Assigned Fleet</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono font-bold text-slate-200">
                  {order.assignedVehicleId || 'Pending Assignment'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <div className="flex items-start gap-2 text-slate-300">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">
                    Special Handling Notes
                  </span>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">{order.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Status Quick Selector */}
          {onUpdateStatus && (
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                Update Dispatch Status:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['pending', 'dispatched', 'in-transit', 'delivered'] as OrderStatus[]).map(
                  (st) => {
                    const isCurrent = order.status === st;
                    return (
                      <button
                        key={st}
                        onClick={() => onUpdateStatus(order.id, st)}
                        className={`py-1.5 px-2 rounded-md text-[11px] font-medium capitalize transition-colors ${
                          isCurrent
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">System: RouteWise AI v1.0</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
