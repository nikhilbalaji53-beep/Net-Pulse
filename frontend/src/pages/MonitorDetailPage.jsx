import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Pause, 
  Play, 
  Edit2, 
  Server, 
  Globe, 
  Layers, 
  MapPin, 
  Calendar 
} from 'lucide-react';
import { monitorsApi, incidentsApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { LatencyChart } from '../charts/LatencyChart';
import { AvailabilityTimeline } from '../charts/AvailabilityTimeline';
import { AddMonitorModal } from '../components/AddMonitorModal';
import { formatLatency, formatUptime, formatRelativeTime, formatDuration } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export function MonitorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [target, setTarget] = useState(null);
  const [results, setResults] = useState([]);
  const [uptimeStats, setUptimeStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [range, setRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const fetchTargetData = useCallback(async () => {
    try {
      const [tData, rData, uData, iData] = await Promise.all([
        monitorsApi.getMonitor(id),
        monitorsApi.getResults(id, range, 250),
        monitorsApi.getUptime(id),
        incidentsApi.getIncidents({ target_id: id }),
      ]);
      setTarget(tData);
      setResults(rData);
      setUptimeStats(uData);
      setIncidents(iData);
    } catch (err) {
      console.error('Error fetching target details:', err);
    } finally {
      setLoading(false);
    }
  }, [id, range]);

  useEffect(() => {
    fetchTargetData();
    const interval = setInterval(fetchTargetData, 10000);
    return () => clearInterval(interval);
  }, [fetchTargetData]);

  const handlePingNow = async () => {
    setChecking(true);
    try {
      await monitorsApi.checkNow(id);
      await fetchTargetData();
    } catch (err) {
      console.error('Check trigger failed:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleTogglePause = async () => {
    if (!target) return;
    try {
      if (target.enabled) {
        await monitorsApi.pauseMonitor(target.id);
      } else {
        await monitorsApi.resumeMonitor(target.id);
      }
      fetchTargetData();
    } catch (err) {
      console.error('Error toggling pause:', err);
    }
  };

  if (loading && !target) {
    return <div className="p-8 text-center text-slate-500 text-xs">Loading target diagnostics...</div>;
  }

  if (!target) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Monitor target not found.</p>
        <button onClick={() => navigate('/monitors')} className="mt-3 text-indigo-400 hover:underline text-xs">
          Return to monitors list
        </button>
      </div>
    );
  }

  const latInfo = formatLatency(target.latest_latency_ms);

  return (
    <div className="space-y-6">
      {/* Header with Navigation & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/monitors')}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white">{target.name}</h1>
              <StatusBadge status={target.enabled ? target.current_status : 'PAUSED'} />
            </div>
            <div className="text-xs font-mono text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{target.host}{target.port ? `:${target.port}` : ''}</span>
              <span>•</span>
              <span className="uppercase text-slate-500 font-semibold">{target.monitoring_type}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePingNow}
            disabled={checking}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-indigo-400' : ''}`} />
            {checking ? 'Probing...' : 'Check Now'}
          </button>

          {isAdmin && (
            <>
              <button
                onClick={handleTogglePause}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
              >
                {target.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {target.enabled ? 'Pause' : 'Resume'}
              </button>

              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Target Details Grid & Uptime Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">Current Latency</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${latInfo.class.split(' ')[0]}`}>
              {latInfo.text}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Classification: {latInfo.label || 'Unknown'}</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">24h Uptime</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {uptimeStats ? `${uptimeStats.uptime_24h}%` : '100%'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">30d: {uptimeStats ? `${uptimeStats.uptime_30d}%` : '100%'}</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">Check Interval</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {target.interval_seconds}s
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Timeout: {target.timeout_seconds}s</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">Last Checked</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {formatRelativeTime(target.last_checked_at)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Online since: {target.last_online_at ? new Date(target.last_online_at).toLocaleTimeString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* Target Metadata Bar */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-500 block mb-0.5">Environment</span>
          <span className="font-semibold text-slate-200">{target.environment}</span>
        </div>
        <div>
          <span className="text-slate-500 block mb-0.5">Location / Zone</span>
          <span className="font-semibold text-slate-200">{target.location}</span>
        </div>
        <div>
          <span className="text-slate-500 block mb-0.5">Thresholds</span>
          <span className="font-semibold text-slate-200">
            Fail: {target.failure_threshold}x / Rec: {target.recovery_threshold}x
          </span>
        </div>
        <div>
          <span className="text-slate-500 block mb-0.5">Registered</span>
          <span className="font-semibold text-slate-200">
            {new Date(target.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Real Latency Chart */}
      <LatencyChart
        data={results}
        range={range}
        onRangeChange={setRange}
      />

      {/* Availability Timeline */}
      <AvailabilityTimeline results={results} />

      {/* Target Incidents History */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm shadow-sm">
        <h3 className="text-sm font-semibold text-white tracking-tight mb-3">
          Target Incidents History ({incidents.length})
        </h3>
        {incidents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No incidents recorded for this target. 100% stable reachability.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Started At</th>
                  <th className="py-2.5 px-3">Resolved At</th>
                  <th className="py-2.5 px-3">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {incidents.map((inc) => (
                  <tr key={inc.id}>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        inc.status === 'OPEN'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">{inc.reason}</td>
                    <td className="py-2.5 px-3 text-slate-400">{new Date(inc.started_at).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {inc.resolved_at ? new Date(inc.resolved_at).toLocaleString() : 'Ongoing'}
                    </td>
                    <td className="py-2.5 px-3 text-indigo-400 font-mono">
                      {inc.duration_seconds ? formatDuration(inc.duration_seconds) : 'Active'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddMonitorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onCreated={fetchTargetData}
        editTarget={target}
      />
    </div>
  );
}
