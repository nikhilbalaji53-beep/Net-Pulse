import React, { useState, useEffect, useCallback } from 'react';
import { Bell, RefreshCw, AlertCircle, CheckCircle, Zap, ShieldAlert } from 'lucide-react';
import { alertsApi } from '../services/api';
import { formatRelativeTime } from '../utils/formatters';

export function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await alertsApi.getAlerts({
        alert_type: typeFilter || undefined,
      });
      setAlerts(data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const getAlertIcon = (type) => {
    switch (type) {
      case 'OFFLINE':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'ONLINE':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'HIGH_LATENCY':
        return <Zap className="w-4 h-4 text-amber-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Alert Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit history of real-time alerts dispatched to WebSockets, notifications, and email.
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'All Alerts', val: '' },
          { label: 'Offline Alerts', val: 'OFFLINE' },
          { label: 'Recovery Alerts', val: 'ONLINE' },
          { label: 'High Latency Alerts', val: 'HIGH_LATENCY' },
        ].map((tab) => (
          <button
            key={tab.val}
            onClick={() => setTypeFilter(tab.val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === tab.val
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-sm">
        {alerts.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
            No alerts found for the selected category.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="p-4 hover:bg-slate-800/30 transition-colors flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 mt-0.5">
                    {getAlertIcon(a.alert_type)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{a.message}</div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span>Target: <strong className="text-slate-300">{a.target_name}</strong> ({a.target_host})</span>
                      <span>•</span>
                      <span className="uppercase text-[11px] font-mono font-semibold text-indigo-400">
                        {a.alert_type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right whitespace-nowrap">
                  <div className="text-xs text-slate-400 font-mono">
                    {formatRelativeTime(a.sent_at)}
                  </div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {a.delivery_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
