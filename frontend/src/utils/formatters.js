export function formatLatency(latency) {
  if (latency === null || latency === undefined) return { text: 'N/A', class: 'text-slate-400 bg-slate-800/50' };
  const val = Number(latency);
  if (val < 50) return { text: `${val.toFixed(1)} ms`, label: 'Excellent', class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (val < 100) return { text: `${val.toFixed(1)} ms`, label: 'Good', class: 'text-teal-400 bg-teal-500/10 border-teal-500/20' };
  if (val < 200) return { text: `${val.toFixed(1)} ms`, label: 'Moderate', class: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  if (val < 500) return { text: `${val.toFixed(1)} ms`, label: 'High', class: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
  return { text: `${val.toFixed(1)} ms`, label: 'Critical', class: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
}

export function formatUptime(uptime) {
  if (uptime === null || uptime === undefined) return { text: '100%', class: 'text-emerald-400' };
  const val = Number(uptime);
  if (val >= 99.9) return { text: `${val.toFixed(2)}%`, class: 'text-emerald-400' };
  if (val >= 98.0) return { text: `${val.toFixed(2)}%`, class: 'text-amber-400' };
  return { text: `${val.toFixed(2)}%`, class: 'text-rose-400' };
}

export function formatPacketLoss(loss) {
  if (loss === null || loss === undefined) return '0%';
  return `${Number(loss).toFixed(1)}%`;
}

export function formatRelativeTime(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const sec = Math.floor(seconds);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min < 60) return `${min}m ${remSec}s`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hr}h ${remMin}m`;
}
