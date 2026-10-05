import React, { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useWebSocket } from '../hooks/useWebSocket';
import { Bell, X } from 'lucide-react';

export function AppLayout() {
  const [liveToast, setLiveToast] = useState(null);
  const [systemStatus, setSystemStatus] = useState('HEALTHY');

  const handleWsEvent = useCallback((event) => {
    if (event.type === 'alert_triggered') {
      setLiveToast({
        title: 'ALERT DISPATCHED',
        message: event.alert?.message || 'New network incident triggered',
        type: event.alert?.alert_type || 'OFFLINE',
      });
      setTimeout(() => setLiveToast(null), 6000);
    } else if (event.type === 'incident_created') {
      setSystemStatus('CRITICAL');
      setLiveToast({
        title: 'TARGET DOWN',
        message: `Monitor '${event.incident?.target_name}' is unreachable: ${event.incident?.reason}`,
        type: 'OFFLINE',
      });
      setTimeout(() => setLiveToast(null), 6000);
    } else if (event.type === 'incident_resolved') {
      setSystemStatus('HEALTHY');
      setLiveToast({
        title: 'RECOVERED',
        message: `Monitor '${event.incident?.target_name}' is back online!`,
        type: 'ONLINE',
      });
      setTimeout(() => setLiveToast(null), 6000);
    }
  }, []);

  const { isConnected } = useWebSocket(handleWsEvent);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
      {/* Real-time Toast Banner */}
      {liveToast && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div className={`p-4 rounded-xl border shadow-2xl backdrop-blur-xl flex items-start gap-3 max-w-md ${
            liveToast.type === 'ONLINE'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
          }`}>
            <Bell className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold tracking-wide uppercase">{liveToast.title}</div>
              <div className="mt-0.5">{liveToast.message}</div>
            </div>
            <button
              onClick={() => setLiveToast(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Navbar isWsConnected={isConnected} systemStatus={systemStatus} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        NetPulse — Intelligent Ping Monitoring System &copy; 2026. “Monitor. Detect. Respond.”
      </footer>
    </div>
  );
}
