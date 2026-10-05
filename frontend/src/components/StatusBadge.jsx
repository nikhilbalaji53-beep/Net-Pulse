import React from 'react';

export function StatusBadge({ status, size = 'md' }) {
  const norm = (status || 'PENDING').toUpperCase();

  const configs = {
    ONLINE: {
      label: 'Online',
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-500',
      ping: true,
    },
    OFFLINE: {
      label: 'Offline',
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      dot: 'bg-rose-500',
      ping: false,
    },
    WARNING: {
      label: 'Warning',
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dot: 'bg-amber-500',
      ping: true,
    },
    PAUSED: {
      label: 'Paused',
      bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      dot: 'bg-slate-500',
      ping: false,
    },
    PENDING: {
      label: 'Pending',
      bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      dot: 'bg-blue-500',
      ping: false,
    },
  };

  const current = configs[norm] || configs.PENDING;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${current.bg} ${
        isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs tracking-wide'
      }`}
    >
      <span className="relative flex h-2 w-2">
        {current.ping && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot}`} />
      </span>
      {current.label}
    </span>
  );
}
