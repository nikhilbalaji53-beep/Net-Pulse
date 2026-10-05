import React, { useState, useEffect } from 'react';
import { X, Server, AlertCircle } from 'lucide-react';
import { monitorsApi } from '../services/api';

export function AddMonitorModal({ isOpen, onClose, onCreated, editTarget = null }) {
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    monitoring_type: 'ICMP',
    port: 80,
    url: '',
    description: '',
    location: 'Primary Datacenter',
    environment: 'Production',
    interval_seconds: 30,
    timeout_seconds: 5,
    failure_threshold: 3,
    recovery_threshold: 2,
    enabled: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editTarget) {
      setFormData({
        name: editTarget.name || '',
        host: editTarget.host || '',
        monitoring_type: editTarget.monitoring_type || 'ICMP',
        port: editTarget.port || 80,
        url: editTarget.url || '',
        description: editTarget.description || '',
        location: editTarget.location || 'Primary Datacenter',
        environment: editTarget.environment || 'Production',
        interval_seconds: editTarget.interval_seconds || 30,
        timeout_seconds: editTarget.timeout_seconds || 5,
        failure_threshold: editTarget.failure_threshold || 3,
        recovery_threshold: editTarget.recovery_threshold || 2,
        enabled: editTarget.enabled ?? true,
      });
    } else {
      setFormData({
        name: '',
        host: '',
        monitoring_type: 'ICMP',
        port: 80,
        url: '',
        description: '',
        location: 'Primary Datacenter',
        environment: 'Production',
        interval_seconds: 30,
        timeout_seconds: 5,
        failure_threshold: 3,
        recovery_threshold: 2,
        enabled: true,
      });
    }
    setError(null);
  }, [editTarget, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        interval_seconds: Number(formData.interval_seconds),
        timeout_seconds: Number(formData.timeout_seconds),
        failure_threshold: Number(formData.failure_threshold),
        recovery_threshold: Number(formData.recovery_threshold),
        port: formData.monitoring_type === 'TCP' ? Number(formData.port) : null,
        url: formData.monitoring_type === 'HTTP' ? formData.url || `https://${formData.host}` : null,
      };

      if (editTarget) {
        await monitorsApi.updateMonitor(editTarget.id, payload);
      } else {
        await monitorsApi.createMonitor(payload);
      }

      onCreated();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to save monitor target';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {editTarget ? 'Edit Monitored Target' : 'Register New Monitor Target'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure network probe properties, interval frequency, and alert trigger rules.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-6 mb-0 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Core Database Server"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Host / IP Address *
              </label>
              <input
                type="text"
                name="host"
                required
                value={formData.host}
                onChange={handleChange}
                placeholder="e.g. 192.168.1.1 or api.company.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Monitoring Type *
              </label>
              <select
                name="monitoring_type"
                value={formData.monitoring_type}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ICMP">ICMP Ping (Network Layer)</option>
                <option value="TCP">TCP Port Check (Transport Layer)</option>
                <option value="HTTP">HTTP / HTTPS (Application Layer)</option>
                <option value="HOSTNAME">Hostname / DNS Resolution</option>
              </select>
            </div>

            {formData.monitoring_type === 'TCP' ? (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  TCP Port *
                </label>
                <input
                  type="number"
                  name="port"
                  min="1"
                  max="65535"
                  required
                  value={formData.port}
                  onChange={handleChange}
                  placeholder="e.g. 443, 80, 22, 5432"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            ) : formData.monitoring_type === 'HTTP' ? (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full URL *
                </label>
                <input
                  type="url"
                  name="url"
                  required
                  value={formData.url}
                  onChange={handleChange}
                  placeholder="https://example.com/api/health"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Location / Zone
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. US-East, Frankfurt DC, Branch Office"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Environment
              </label>
              <select
                name="environment"
                value={formData.environment}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Production">Production</option>
                <option value="Development">Development</option>
                <option value="Testing">Testing</option>
                <option value="Office">Office</option>
                <option value="Home">Home Lab</option>
                <option value="Cloud">Cloud</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief purpose of this monitored node"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Thresholds & Interval */}
          <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Probing & Incident Thresholds
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Interval (sec)</label>
                <input
                  type="number"
                  name="interval_seconds"
                  min="5"
                  max="3600"
                  value={formData.interval_seconds}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Timeout (sec)</label>
                <input
                  type="number"
                  name="timeout_seconds"
                  min="1"
                  max="60"
                  value={formData.timeout_seconds}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Failure Threshold</label>
                <input
                  type="number"
                  name="failure_threshold"
                  min="1"
                  max="10"
                  value={formData.failure_threshold}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Recovery Threshold</label>
                <input
                  type="number"
                  name="recovery_threshold"
                  min="1"
                  max="10"
                  value={formData.recovery_threshold}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow-lg shadow-indigo-500/20 transition-colors"
            >
              {loading ? 'Saving Target...' : editTarget ? 'Save Changes' : 'Create Monitor Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
