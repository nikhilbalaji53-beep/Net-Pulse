import React from 'react';

export function StatCard({ title, value, subtitle, icon: Icon, color = 'indigo' }) {
  const colorStyles = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  };

  const style = colorStyles[color] || colorStyles.indigo;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all duration-200 backdrop-blur-sm shadow-sm relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${style}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">{subtitle}</p>
      )}
    </div>
  );
}
