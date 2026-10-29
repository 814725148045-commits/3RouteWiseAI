/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UnassignedOrderReport } from '../../services/routing/types';
import { AlertCircle, PackageX, LifeBuoy } from 'lucide-react';

interface UnassignedOrdersPanelProps {
  unassigned: UnassignedOrderReport[];
}

export const UnassignedOrdersPanel: React.FC<UnassignedOrdersPanelProps> = ({ unassigned }) => {
  if (unassigned.length === 0) return null;

  return (
    <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <PackageX className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Unassigned Delivery Orders ({unassigned.length})
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Action Required
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Orders excluded from current optimization passes due to physical capacity or vehicle constraints
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
          <LifeBuoy className="w-3.5 h-3.5" />
          <span>Eligible for Module 6 Route Rescue</span>
        </div>
      </div>

      {/* Grid of Unassigned Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {unassigned.map((item) => (
          <div
            key={item.order.id}
            className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs space-y-2 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">{item.order.id}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {item.reason}
              </span>
            </div>

            <div className="text-slate-300 font-medium truncate">{item.order.customerName}</div>
            <div className="text-slate-400 text-[11px] truncate">{item.order.destination}</div>

            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/80">
              <span className="text-slate-400">Package Weight:</span>
              <span className="font-mono font-bold text-slate-200">{item.order.weightKg} kg</span>
            </div>

            <p className="text-[11px] text-amber-200/80 bg-amber-500/5 p-1.5 rounded border border-amber-500/10 leading-snug">
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
