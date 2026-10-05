import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  LayoutDashboard, 
  Server, 
  AlertTriangle, 
  Bell, 
  FileText, 
  Settings, 
  LogOut, 
  User,
  Radio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar({ isWsConnected, systemStatus = 'HEALTHY' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Monitors', path: '/monitors', icon: Server },
    { label: 'Incidents', path: '/incidents', icon: AlertTriangle },
    { label: 'Alerts', path: '/alerts', icon: Bell },
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <NavLink to="/dashboard" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-white block leading-tight">
                  NetPulse
                </span>
                <span className="text-[10px] uppercase font-medium tracking-wider text-indigo-400 block -mt-0.5">
                  Monitor. Detect. Respond.
                </span>
              </div>
            </NavLink>

            {/* Live Engine Status Badge */}
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
                <Radio className={`w-3.5 h-3.5 ${isWsConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="text-slate-400 font-medium">Stream:</span>
                <span className={isWsConnected ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                  {isWsConnected ? 'LIVE' : 'CONNECTING'}
                </span>
              </span>

              <span className={`px-2.5 py-1 rounded-full border text-xs font-medium ${
                systemStatus === 'HEALTHY'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : systemStatus === 'DEGRADED'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {systemStatus}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 pl-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
                  <div className="text-[10px] text-slate-400 font-medium flex items-center justify-end gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    {user.role}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Sign In
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
