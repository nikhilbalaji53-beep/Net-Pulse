import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Server, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Percent, 
  Zap, 
  Plus, 
  ArrowUpRight, 
  ExternalLink,
  RefreshCw,
  Radio
} from 'lucide-react';
import { dashboardApi, monitorsApi, incidentsApi, alertsApi } from '../services/api';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { AddMonitorModal } from '../components/AddMonitorModal';
import { formatLatency, formatUptime, formatRelativeTime, formatDuration } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [statsData, monitorsData, incidentsData, alertsData] = await Promise.all([
        dashboardApi.getStats(),
        monitorsApi.getMonitors(),
        incidentsApi.getIncidents({ limit: 5 }),
        alertsApi.getAlerts({ limit: 5 }),
      ]);
      setStats(statsData);
      setMonitors(monitorsData);
      setIncidents(incidentsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle immediate manual probe trigger
  const handleCheckNow = async (id, e) => {
    e.stopPropagation();
    try {
      await monitorsApi.checkNow(id);
      fetchData();
    } catch (err) {
      console.error('Check trigger error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / System Health */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">Network Overview</h1>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time ICMP, TCP, HTTP, and DNS availability probing across infrastructure targets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            title="Refresh metrics"
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Add Monitor
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Monitors"
          value={stats?.total_monitors ?? 0}
          subtitle="Configured nodes"
          icon={Server}
          color="indigo"
        />
        <StatCard
          title="Online"
          value={stats?.online ?? 0}
          subtitle="Healthy endpoints"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Offline"
          value={stats?.offline ?? 0}
          subtitle="Unreachable targets"
          icon={XCircle}
          color="rose"
        />
        <StatCard
          title="Warning"
          value={stats?.warning ?? 0}
          subtitle="High latency / jitter"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Overall Uptime"
          value={`${stats?.overall_uptime_percentage ?? 100}%`}
          subtitle="Last 24 hours"
          icon={Percent}
          color="cyan"
        />
        <StatCard
          title="Avg Latency"
          value={stats?.average_latency_ms ? `${stats.average_latency_ms} ms` : 'N/A'}
          subtitle="Online responses"
          icon={Zap}
          color="indigo"
        />
      </div>

      {/* Monitors Table Preview */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Active Monitors</h2>
            <p className="text-xs text-slate-400 mt-0.5">Continuous live verification results</p>
          </div>
          <button
            onClick={() => navigate('/monitors')}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            View All Monitors <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Target Name</th>
                <th className="py-3.5 px-4">Host / Endpoint</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Latest Latency</th>
                <th className="py-3.5 px-4">24h Uptime</th>
                <th className="py-3.5 px-4">Last Checked</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {monitors.slice(0, 6).map((m) => {
                const latFormat = formatLatency(m.latest_latency_ms);
                const upFormat = formatUptime(m.uptime_percentage);

                return (
                  <tr
                    key={m.id}
                    onClick={() => navigate(`/monitors/${m.id}`)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={m.enabled ? m.current_status : 'PAUSED'} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      {m.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {m.host}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[11px]">
                        {m.monitoring_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-mono ${latFormat.class}`}>
                        {latFormat.text}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold font-mono">
                      <span className={upFormat.class}>{upFormat.text}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {formatRelativeTime(m.last_checked_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => handleCheckNow(m.id, e)}
                        title="Check connectivity now"
                        className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-medium transition-colors"
                      >
                        Ping Now
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Grid: Incidents & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Recent Incidents</h3>
              <p className="text-xs text-slate-400">Downtime lifecycle records</p>
            </div>
            <button
              onClick={() => navigate('/incidents')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              All Incidents <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {incidents.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-80" />
              No downtime incidents detected. All monitored systems operating normally.
            </div>
          ) : (
            <div className="space-y-2.5">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>{inc.target_name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        inc.status === 'OPEN'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {inc.status}
                      </span>
                    </div>
                    <div className="text-slate-400 mt-0.5 text-[11px]">{inc.reason}</div>
                  </div>
                  <div className="text-right text-slate-400">
                    <div>{formatRelativeTime(inc.started_at)}</div>
                    {inc.duration_seconds && (
                      <div className="text-indigo-400 font-mono mt-0.5">
                        Downtime: {formatDuration(inc.duration_seconds)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Alerts Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Recent Alerts</h3>
              <p className="text-xs text-slate-400">Real-time dispatched notifications</p>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Alert Center <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No recent alert events.
            </div>
          ) : (
            <div className="space-y-2.5">
              {alerts.map((alt) => (
                <div
                  key={alt.id}
                  className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="pr-3">
                    <div className="text-slate-200 font-medium">{alt.message}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Target: <span className="text-slate-400 font-mono">{alt.target_name}</span>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap text-slate-400 text-[11px]">
                    {formatRelativeTime(alt.sent_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddMonitorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchData}
      />
    </div>
  );
}
