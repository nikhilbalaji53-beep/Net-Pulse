import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  Pause, 
  Play, 
  Trash2, 
  Edit2, 
  ExternalLink,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import { monitorsApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { AddMonitorModal } from '../components/AddMonitorModal';
import { formatLatency, formatUptime, formatRelativeTime } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export function MonitorsPage() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [envFilter, setEnvFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);

  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const fetchMonitors = useCallback(async () => {
    try {
      const params = {
        search: search || undefined,
        status: statusFilter || undefined,
        monitoring_type: typeFilter || undefined,
        environment: envFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      const data = await monitorsApi.getMonitors(params);
      setMonitors(data);
    } catch (err) {
      console.error('Error fetching monitors:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, envFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  const handlePauseResume = async (m, e) => {
    e.stopPropagation();
    try {
      if (m.enabled) {
        await monitorsApi.pauseMonitor(m.id);
      } else {
        await monitorsApi.resumeMonitor(m.id);
      }
      fetchMonitors();
    } catch (err) {
      console.error('Error toggling pause/resume:', err);
    }
  };

  const handleDelete = async (id, name, e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete monitor '${name}'? This will also remove historical metrics.`)) {
      try {
        await monitorsApi.deleteMonitor(id);
        fetchMonitors();
      } catch (err) {
        console.error('Error deleting monitor:', err);
      }
    }
  };

  const handlePingNow = async (id, e) => {
    e.stopPropagation();
    try {
      await monitorsApi.checkNow(id);
      fetchMonitors();
    } catch (err) {
      console.error('Error triggering ping:', err);
    }
  };

  const handleEdit = (m, e) => {
    e.stopPropagation();
    setEditingTarget(m);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Monitored Targets</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage probing endpoints, check intervals, port checks, and diagnostic logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMonitors}
            title="Refresh monitor list"
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setEditingTarget(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Add Target
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, host, IP..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="ONLINE">Online</option>
          <option value="OFFLINE">Offline</option>
          <option value="WARNING">Warning</option>
          <option value="PAUSED">Paused</option>
        </select>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Types</option>
          <option value="ICMP">ICMP Ping</option>
          <option value="TCP">TCP Port</option>
          <option value="HTTP">HTTP/HTTPS</option>
          <option value="HOSTNAME">Hostname / DNS</option>
        </select>

        {/* Environment Filter */}
        <select
          value={envFilter}
          onChange={(e) => setEnvFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Environments</option>
          <option value="Production">Production</option>
          <option value="Development">Development</option>
          <option value="Testing">Testing</option>
          <option value="Office">Office</option>
          <option value="Home">Home Lab</option>
          <option value="Cloud">Cloud</option>
        </select>

        {/* Sorting */}
        <div className="flex gap-1.5">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="name">Sort by Name</option>
            <option value="latency">Sort by Latency</option>
            <option value="uptime">Sort by Uptime</option>
            <option value="last_checked">Sort by Last Checked</option>
          </select>
          <button
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="px-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Monitors Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Name & Environment</th>
                <th className="py-3.5 px-4">Host / Endpoint</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Latency</th>
                <th className="py-3.5 px-4">24h Uptime</th>
                <th className="py-3.5 px-4">Interval</th>
                <th className="py-3.5 px-4">Last Checked</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {monitors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No matching monitored targets found.
                  </td>
                </tr>
              ) : (
                monitors.map((m) => {
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
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                          {m.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span>{m.environment}</span>
                          <span>•</span>
                          <span>{m.location}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {m.host}
                        {m.port ? `:${m.port}` : ''}
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
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {m.interval_seconds}s
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {formatRelativeTime(m.last_checked_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => handlePingNow(m.id, e)}
                            title="Check now"
                            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={(e) => handlePauseResume(m, e)}
                                title={m.enabled ? 'Pause monitoring' : 'Resume monitoring'}
                                className="p-1.5 text-slate-300 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                              >
                                {m.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                onClick={(e) => handleEdit(m, e)}
                                title="Edit target"
                                className="p-1.5 text-slate-300 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={(e) => handleDelete(m.id, m.name, e)}
                                title="Delete monitor"
                                className="p-1.5 text-slate-300 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddMonitorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTarget(null);
        }}
        onCreated={fetchMonitors}
        editTarget={editingTarget}
      />
    </div>
  );
}
