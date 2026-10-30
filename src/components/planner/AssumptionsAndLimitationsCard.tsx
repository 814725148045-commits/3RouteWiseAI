import React from 'react';
import { Info, Clock, Gauge, Compass, AlertCircle, Cpu } from 'lucide-react';

export const AssumptionsAndLimitationsCard: React.FC = () => {
  return (
    <div className="rounded-xl bg-[#0f172a] border border-slate-800 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Info className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-100">
            Assumptions &amp; Limitations
          </h3>
        </div>
        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700/60">
          DT-LSC-10 Specification
        </span>
      </div>

      <div className="space-y-3 text-xs leading-relaxed text-slate-300">
        {/* Time Windows */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 font-medium text-slate-200">
            <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>Time Window Interpretation</span>
          </div>
          <p className="text-[11px] text-slate-400 pl-5.5">
            Deliveries have an allowed arrival window <code className="text-teal-300 font-mono">[Earliest, Latest]</code>. Early arrivals wait until the window opens before service commences. Arrivals past the latest window are transparently flagged as SLA risks.
          </p>
        </div>

        {/* Travel Speed & Service Time */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 font-medium text-slate-200">
            <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Travel Speed &amp; Dwell Time</span>
          </div>
          <p className="text-[11px] text-slate-400 pl-5.5">
            Transit time uses a nominal speed of 45 km/h with a 1.30x urban grid circuity factor. Each stop includes a configurable dwell service time (10 min default) for cargo handover.
          </p>
        </div>

        {/* Real vs Simulated */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 font-medium text-slate-200">
            <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Simulated Coordinates &amp; Distances</span>
          </div>
          <p className="text-[11px] text-slate-400 pl-5.5">
            Addresses are positioned on a synthetic urban coordinate plane. Distances are calculated mathematically and never presented as live GPS telemetry or real-world road network measurements.
          </p>
        </div>

        {/* Algorithm Heuristic Limitations */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 font-medium text-slate-200">
            <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Algorithm Nature &amp; Scope</span>
          </div>
          <p className="text-[11px] text-slate-400 pl-5.5">
            Uses deterministic Lexicographic Fleet Minimization followed by Nearest-Neighbor route construction and 2-Opt local search. The engine provides reproducible, verifiable routes without claiming a global mathematical optimum.
          </p>
        </div>

        {/* Traffic Variance */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 font-medium text-slate-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Traffic Condition Variance</span>
          </div>
          <p className="text-[11px] text-slate-400 pl-5.5">
            Because live traffic API feeds are not integrated, estimated arrival times do not reflect rush-hour congestion, incidents, or sudden road closures.
          </p>
        </div>
      </div>
    </div>
  );
};
