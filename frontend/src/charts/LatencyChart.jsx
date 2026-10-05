import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export function LatencyChart({ data = [], range = '24h', onRangeChange }) {
  const ranges = ['1h', '6h', '24h', '7d'];

  // Calculate quick metrics
  const validPoints = data.filter((d) => d.latency_ms !== null && d.latency_ms !== undefined);
  const latencies = validPoints.map((d) => d.latency_ms);
  const minLat = latencies.length ? Math.min(...latencies).toFixed(1) : 'N/A';
  const maxLat = latencies.length ? Math.max(...latencies).toFixed(1) : 'N/A';
  const avgLat = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) : 'N/A';

  // Format timestamp for X axis
  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    if (range === '1h' || range === '6h') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    if (range === '24h') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
  };

  const chartData = data.map((d) => ({
    ...d,
    formattedTime: formatTime(d.timestamp),
    displayLatency: d.status === 'UP' ? d.latency_ms : null,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs backdrop-blur-md">
          <div className="text-slate-400 mb-1">{new Date(p.timestamp).toLocaleString()}</div>
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-medium">Status:</span>
            <span
              className={`font-semibold ${
                p.status === 'UP'
                  ? 'text-emerald-400'
                  : p.status === 'TIMEOUT'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {p.status}
            </span>
          </div>
          {p.latency_ms !== null && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-300 font-medium">Latency:</span>
              <span className="text-indigo-400 font-bold">{p.latency_ms.toFixed(2)} ms</span>
            </div>
          )}
          {p.packet_loss > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-300 font-medium">Packet Loss:</span>
              <span className="text-rose-400">{p.packet_loss}%</span>
            </div>
          )}
          {p.error_message && (
            <div className="text-rose-400/90 text-[11px] mt-1 max-w-xs break-words">
              {p.error_message}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight">Real-Time Latency History</h3>
          <p className="text-xs text-slate-400 mt-0.5">Live round-trip response duration across network checks</p>
        </div>

        {/* Range Buttons & Quick Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Min: <strong className="text-emerald-400">{minLat}ms</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Avg: <strong className="text-indigo-400">{avgLat}ms</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Max: <strong className="text-rose-400">{maxLat}ms</strong></span>
          </div>

          {onRangeChange && (
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => onRangeChange(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    range === r
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            No check results recorded yet in this time frame.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="formattedTime"
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                unit="ms"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="displayLatency"
                stroke="#818cf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#latencyGradient)"
                isAnimationActive={false}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
