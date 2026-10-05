import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Filter } from 'lucide-react';
import { incidentsApi } from '../services/api';
import { formatRelativeTime, formatDuration } from '../utils/formatters';

export function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchIncidents = useCallback(async () => {
    try {
      const data = await incidentsApi.getIncidents({
        status: statusFilter || undefined,
        range: rangeFilter !== 'all' ? rangeFilter : undefined,
      });
      setIncidents(data);
    } catch (err) {
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, rangeFilter]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Incident History</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit log of all detected outages, downtime durations, and resolution timestamps.
          </p>
        </div>

        <button
          onClick={fetchIncidents}
          className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Status:</span>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Incidents</option>
          <option value="OPEN">Open (Active Outages)</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        <div className="flex items-center gap-2 text-xs text-slate-400 ml-2">
          <span>Range:</span>
        </div>
        <select
          value={rangeFilter}
          onChange={(e) => setRangeFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Time</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {/* Incident Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Target Name</th>
                <th className="py-3.5 px-4">Endpoint Host</th>
                <th className="py-3.5 px-4">Root Cause / Error</th>
                <th className="py-3.5 px-4">Started At</th>
                <th className="py-3.5 px-4">Resolved At</th>
                <th className="py-3.5 px-4 text-right">Downtime Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No matching incidents found.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => navigate(`/monitors/${inc.target_id}`)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] uppercase font-bold tracking-wider ${
                        inc.status === 'OPEN'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      {inc.target_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {inc.target_host}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={inc.reason}>
                      {inc.reason}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(inc.started_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {inc.resolved_at ? new Date(inc.resolved_at).toLocaleString() : (
                        <span className="text-amber-400 font-semibold">Active Now</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-indigo-400 whitespace-nowrap">
                      {inc.duration_seconds ? formatDuration(inc.duration_seconds) : 'Ongoing'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
