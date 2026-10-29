import React from 'react';
import { Package, Truck, Clock, Navigation2, HelpCircle } from 'lucide-react';

interface KpiCardsProps {
  totalDeliveries: number;
  activeVehiclesCount: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalDeliveries,
  activeVehiclesCount,
}) => {
  const cards = [
    {
      id: 'deliveries',
      title: 'Total Deliveries',
      value: totalDeliveries.toString(),
      subtext: '+3 staged for afternoon dispatch',
      icon: Package,
      badge: 'Today',
      accentColor: 'text-teal-400',
      borderColor: 'border-teal-500/20',
      bgColor: 'bg-teal-500/5',
    },
    {
      id: 'vehicles',
      title: 'Active Vehicles',
      value: activeVehiclesCount.toString(),
      subtext: '4 of 4 fleet units assigned',
      icon: Truck,
      badge: 'All Active',
      accentColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/20',
      bgColor: 'bg-cyan-500/5',
    },
    {
      id: 'ontime',
      title: 'On-Time Rate',
      value: '92%',
      subtext: 'Target >=90% SLA met',
      icon: Clock,
      badge: 'SLA Target',
      accentColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
      bgColor: 'bg-emerald-500/5',
    },
    {
      id: 'distance',
      title: 'Estimated Distance',
      value: '186 km',
      subtext: 'Across 4 planned delivery loops',
      icon: Navigation2,
      badge: 'Scheduled',
      accentColor: 'text-sky-400',
      borderColor: 'border-sky-500/20',
      bgColor: 'bg-sky-500/5',
    },
  ];

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Operational Key Performance Indicators
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700/60" title="Simulated sample telemetry for hackathon demo evaluation">
            <HelpCircle className="w-3 h-3 text-slate-400" /> Demo Dataset
          </span>
        </div>
        <span className="text-xs text-slate-400 hidden sm:inline">
          Refreshed on morning dispatch wave
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`p-4 rounded-xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 transition-all duration-200 relative overflow-hidden group shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">{card.title}</p>
                  <h3 className="text-2xl lg:text-3xl font-bold text-white mt-1.5 font-mono tabular-nums tracking-tight">
                    {card.value}
                  </h3>
                </div>
                <div
                  className={`w-10 h-10 rounded-lg ${card.bgColor} ${card.borderColor} border flex items-center justify-center ${card.accentColor} shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="truncate">{card.subtext}</span>
                <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
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
