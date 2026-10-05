import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Calendar, RefreshCw, BarChart3, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { reportsApi } from '../services/api';
import { formatLatency, formatUptime, formatDuration } from '../utils/formatters';

export function ReportsPage() {
  const [days, setDays] = useState(7);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const data = await reportsApi.getReport(start, end);
      setReport(data);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDownloadCsv = async () => {
    setExporting(true);
    try {
      const end = new Date();
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const blob = await reportsApi.downloadCsv(start, end);
      
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NetPulse_Report_${days}d.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">SLA & Monitoring Reports</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Aggregated uptime compliance, failure counts, latency statistics, and CSV data export.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Preset Buttons */}
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
            {[
              { label: '24 Hours', val: 1 },
              { label: '7 Days', val: 7 },
              { label: '30 Days', val: 30 },
              { label: '90 Days', val: 90 },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => setDays(p.val)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  days === p.val
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleDownloadCsv}
            disabled={exporting}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Aggregate Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">Overall Network Uptime</span>
          <div className="mt-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">
              {report?.overall_uptime_percentage ?? 100}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Across all targets over the past {days} days
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">Total Outage Incidents</span>
          <div className="mt-2">
            <span className="text-3xl font-bold font-mono text-indigo-400">
              {report?.total_incidents ?? 0}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            State transitions declaring offline downtime
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-medium">Report Period</span>
          <div className="mt-2">
            <span className="text-lg font-semibold text-white">
              Last {days} Days
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Detailed Target Summary Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Target Performance Breakdown</h3>
          <span className="text-xs text-slate-400">
            {report?.targets?.length ?? 0} Targets Evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Target Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Total Checks</th>
                <th className="py-3 px-4">Successful</th>
                <th className="py-3 px-4">Failed</th>
                <th className="py-3 px-4">Uptime %</th>
                <th className="py-3 px-4">Downtime</th>
                <th className="py-3 px-4">Avg Latency</th>
                <th className="py-3 px-4">Max Latency</th>
                <th className="py-3 px-4 text-right">Incidents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {!report || report.targets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No data recorded yet.
                  </td>
                </tr>
              ) : (
                report.targets.map((t) => {
                  const upFmt = formatUptime(t.uptime_percentage);
                  return (
                    <tr key={t.target_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        {t.target_name}
                        <div className="text-[11px] text-slate-400 font-mono font-normal">{t.target_host}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {t.monitoring_type}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {t.total_checks}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                        {t.successful_checks}
                      </td>
                      <td className="py-3 px-4 font-mono text-rose-400 font-semibold">
                        {t.failed_checks}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        <span className={upFmt.class}>{upFmt.text}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {t.downtime_minutes > 0 ? `${t.downtime_minutes} min` : '0 min'}
                      </td>
                      <td className="py-3 px-4 font-mono text-indigo-400">
                        {t.avg_latency_ms !== null ? `${t.avg_latency_ms} ms` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {t.max_latency_ms !== null ? `${t.max_latency_ms} ms` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-200">
                        {t.incident_count}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
