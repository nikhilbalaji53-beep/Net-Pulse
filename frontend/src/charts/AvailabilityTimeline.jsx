import React from 'react';

export function AvailabilityTimeline({ results = [], totalBars = 40 }) {
  // Take last N results or evenly distribute
  const displayResults = results.slice(-totalBars);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-white tracking-tight">Availability Timeline</h4>
          <p className="text-xs text-slate-400 mt-0.5">Consecutive monitoring check points (hover to inspect)</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> UP
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> WARNING
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> DOWN
          </span>
        </div>
      </div>

      {displayResults.length === 0 ? (
        <div className="h-10 flex items-center justify-center text-slate-500 text-xs">
          No check results recorded yet.
        </div>
      ) : (
        <div className="flex items-center gap-1 h-9 bg-slate-950 p-1.5 rounded-lg border border-slate-800/80 overflow-x-auto">
          {displayResults.map((r, idx) => {
            const isUp = r.status === 'UP';
            const isWarning = isUp && r.latency_ms && r.latency_ms > 200;
            const isDown = !isUp;

            const bgClass = isDown
              ? 'bg-rose-500 hover:bg-rose-400'
              : isWarning
              ? 'bg-amber-500 hover:bg-amber-400'
              : 'bg-emerald-500 hover:bg-emerald-400';

            return (
              <div
                key={r.id || idx}
                className={`flex-1 h-full rounded-[2px] transition-all cursor-pointer relative group ${bgClass}`}
              >
                {/* Hover Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                  <div className="bg-slate-900 border border-slate-700 p-2.5 rounded shadow-2xl text-[11px] whitespace-nowrap text-slate-200">
                    <div className="font-semibold text-white mb-0.5">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </div>
                    <div>Status: <span className="font-bold text-slate-100">{r.status}</span></div>
                    {r.latency_ms !== null && <div>Latency: <span className="text-indigo-300 font-bold">{r.latency_ms} ms</span></div>}
                    {r.error_message && <div className="text-rose-400 text-[10px] mt-0.5">{r.error_message}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
