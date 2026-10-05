import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Bell, Database, Save, Check, RefreshCw, Key } from 'lucide-react';
import { settingsApi, auditApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatRelativeTime } from '../utils/formatters';

export function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const [settings, setSettings] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('thresholds');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [sData, aData] = await Promise.all([
          settingsApi.getSettings(),
          isAdmin ? auditApi.getAuditLogs(50) : Promise.resolve([]),
        ]);
        setSettings(sData);
        setAuditLogs(aData);
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    }
    load();
  }, [isAdmin]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const updated = await settingsApi.updateSettings(settings);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <div className="p-8 text-center text-slate-500 text-xs">Loading configuration parameters...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Settings & Governance</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure system probing thresholds, data retention policies, notification endpoints, and audit security logs.
          </p>
        </div>

        {isAdmin && activeTab !== 'audit' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : savedSuccess ? 'Saved Successfully!' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('thresholds')}
          className={`pb-3 px-3 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === 'thresholds'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Probing & Thresholds
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-3 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === 'notifications'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Email & Alert Notifications
        </button>
        <button
          onClick={() => setActiveTab('retention')}
          className={`pb-3 px-3 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === 'retention'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Data Retention & Storage
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 px-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'audit'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit Logs
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Tab 1: Probing & Thresholds */}
      {activeTab === 'thresholds' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Default Probe Parameters</h3>
            
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Default Ping Interval (seconds)
              </label>
              <input
                type="number"
                name="default_ping_interval"
                value={settings.default_ping_interval}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Default Timeout (seconds)
              </label>
              <input
                type="number"
                name="default_timeout"
                value={settings.default_timeout}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Consecutive Failures (Offline)
                </label>
                <input
                  type="number"
                  name="default_failure_threshold"
                  value={settings.default_failure_threshold}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Consecutive Successes (Online)
                </label>
                <input
                  type="number"
                  name="default_recovery_threshold"
                  value={settings.default_recovery_threshold}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Latency Warning Thresholds</h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Warning Latency (ms) — Triggers yellow alert status
              </label>
              <input
                type="number"
                name="latency_warning_threshold"
                value={settings.latency_warning_threshold}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Critical Latency (ms) — Triggers critical alert event
              </label>
              <input
                type="number"
                name="latency_critical_threshold"
                value={settings.latency_critical_threshold}
                onChange={handleChange}
                disabled={!isAdmin}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="allow_private_ips"
                  checked={settings.allow_private_ips}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <span>Allow probing of private/intranet IP ranges (LAN, 192.168.x.x, 10.x.x.x)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Email Notifications */}
      {activeTab === 'notifications' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 max-w-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white">SMTP Email Gateway</h3>
              <p className="text-xs text-slate-400">Outbound email dispatch for urgent alerts</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
              <input
                type="checkbox"
                name="smtp_enabled"
                checked={settings.smtp_enabled}
                onChange={handleChange}
                disabled={!isAdmin}
                className="rounded text-indigo-600"
              />
              <span>Enable SMTP</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">SMTP Server Host</label>
              <input
                type="text"
                name="smtp_host"
                value={settings.smtp_host}
                onChange={handleChange}
                disabled={!isAdmin}
                placeholder="smtp.gmail.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">SMTP Port</label>
              <input
                type="number"
                name="smtp_port"
                value={settings.smtp_port}
                onChange={handleChange}
                disabled={!isAdmin}
                placeholder="587"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">From Sender Address</label>
            <input
              type="email"
              name="smtp_from_email"
              value={settings.smtp_from_email}
              onChange={handleChange}
              disabled={!isAdmin}
              placeholder="alerts@netpulse.local"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Data Retention */}
      {activeTab === 'retention' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 max-w-2xl space-y-4">
          <h3 className="text-sm font-semibold text-white">Database Performance & Storage Retention</h3>
          <p className="text-xs text-slate-400">
            High-frequency monitoring checks automatically prune older rows to preserve database query efficiency.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Retain Historical Ping Records For
            </label>
            <select
              name="data_retention_days"
              value={settings.data_retention_days}
              onChange={handleChange}
              disabled={!isAdmin}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              <option value={7}>7 Days (High traffic / low storage)</option>
              <option value={30}>30 Days (Recommended default)</option>
              <option value={90}>90 Days (Enterprise quarterly compliance)</option>
              <option value={180}>180 Days (Half-year analysis)</option>
              <option value={365}>365 Days (Full year audit)</option>
            </select>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Administrative Audit Trail</h3>
            <span className="text-xs text-slate-400">Latest 50 recorded security actions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Admin User</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-400">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {log.user_name || 'System / Anonymous'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
