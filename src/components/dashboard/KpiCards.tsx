import React from 'react';
import { Package, Truck, Clock, Navigation2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface KpiCardsProps {
  totalDeliveries: number;
  availableFleetSize: number;
  vehiclesUsedCount: number;
  totalDistanceKm: number;
  deliveriesMeetingWindows: number;
  lateOrInfeasibleDeliveries: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalDeliveries,
  availableFleetSize,
  vehiclesUsedCount,
  totalDistanceKm,
  deliveriesMeetingWindows,
  lateOrInfeasibleDeliveries,
}) => {
  const cards = [
    {
      id: 'deliveries',
      title: 'Total Customer Deliveries',
      value: totalDeliveries.toString(),
      subtext: 'Registered shipment orders',
      icon: Package,
      badge: 'Deliveries',
      accentColor: 'text-teal-400',
      borderColor: 'border-teal-500/20',
      bgColor: 'bg-teal-500/5',
    },
    {
      id: 'available_fleet',
      title: 'Available Fleet Size',
      value: availableFleetSize.toString(),
      subtext: 'Operational dispatch vehicles',
      icon: Truck,
      badge: 'Available',
      accentColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/20',
      bgColor: 'bg-cyan-500/5',
    },
    {
      id: 'vehicles_used',
      title: 'Vehicles Actually Used',
      value: vehiclesUsedCount.toString(),
      subtext: 'Priority 1 minimized fleet',
      icon: Truck,
      badge: 'Priority 1',
      accentColor: 'text-teal-300',
      borderColor: 'border-teal-500/20',
      bgColor: 'bg-teal-500/5',
    },
    {
      id: 'distance',
      title: 'Total Optimized Distance',
      value: `${totalDistanceKm} km`,
      subtext: 'Priority 2 minimized route distance',
      icon: Navigation2,
      badge: 'Priority 2',
      accentColor: 'text-sky-400',
      borderColor: 'border-sky-500/20',
      bgColor: 'bg-sky-500/5',
    },
    {
      id: 'window_met',
      title: 'Meeting Time Windows',
      value: deliveriesMeetingWindows.toString(),
      subtext: 'Within allowed arrival windows',
      icon: CheckCircle2,
      badge: 'On-Time SLA',
      accentColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
      bgColor: 'bg-emerald-500/5',
    },
    {
      id: 'late_or_infeasible',
      title: 'Late or Infeasible Deliveries',
      value: lateOrInfeasibleDeliveries.toString(),
      subtext: 'Window violations or unassigned',
      icon: AlertTriangle,
      badge: lateOrInfeasibleDeliveries > 0 ? 'Action Needed' : 'Feasible',
      accentColor: lateOrInfeasibleDeliveries > 0 ? 'text-amber-400' : 'text-slate-400',
      borderColor: lateOrInfeasibleDeliveries > 0 ? 'border-amber-500/20' : 'border-slate-800',
      bgColor: lateOrInfeasibleDeliveries > 0 ? 'bg-amber-500/5' : 'bg-slate-900/40',
    },
  ];

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Essential Delivery &amp; Fleet Metrics
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-teal-300 border border-slate-700/60">
            DT-LSC-10 Core KPIs
          </span>
        </div>
        <span className="text-xs text-slate-400 hidden sm:inline">
          Refreshed dynamically with active route optimization plan
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 transition-all duration-200 relative overflow-hidden group shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium text-slate-400 leading-snug">{card.title}</p>
                  <h3 className="text-2xl font-bold text-white mt-1.5 font-mono tabular-nums tracking-tight">
                    {card.value}
                  </h3>
                </div>
                <div
                  className={`w-9 h-9 rounded-lg ${card.bgColor} ${card.borderColor} border flex items-center justify-center ${card.accentColor} shrink-0`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate">{card.subtext}</span>
                <span className="font-mono text-[9px] text-slate-400 shrink-0 ml-1.5 px-1 py-0.5 rounded bg-slate-900 border border-slate-800">
                  {card.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
