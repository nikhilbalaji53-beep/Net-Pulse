import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, Server, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCustomBackendUrl, setCustomBackendUrl, healthApi, getBaseApiUrl } from '../services/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [backendUrlInput, setBackendUrlInput] = useState(() => getCustomBackendUrl());
  const [serverTesting, setServerTesting] = useState(false);
  const [serverStatus, setServerStatus] = useState(null); // 'connected' | 'error' | null
  const [serverMessage, setServerMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const isLiveStaticDeploy = typeof window !== 'undefined' && window.location.hostname.includes('onrender.com');

  useEffect(() => {
    // If on live Render site without a backend URL, expand the config automatically so the user can connect
    if (isLiveStaticDeploy && !getCustomBackendUrl()) {
      setShowServerConfig(true);
    }
  }, [isLiveStaticDeploy]);

  const handleTestAndSaveServer = async () => {
    setServerTesting(true);
    setServerStatus(null);
    setServerMessage('');
    try {
      const cleanUrl = backendUrlInput.trim().replace(/\/+$/, '');
      if (!cleanUrl) {
        setCustomBackendUrl('');
        setServerStatus('connected');
        setServerMessage('Reset to default (/api)');
        return;
      }
      const data = await healthApi.check(cleanUrl);
      if (data && (data.status === 'healthy' || data.status === 'degraded' || data.service)) {
        setCustomBackendUrl(cleanUrl);
        setServerStatus('connected');
        setServerMessage('Backend connected successfully! You can now log in.');
      } else {
        setCustomBackendUrl(cleanUrl);
        setServerStatus('connected');
        setServerMessage('Backend responded. Saved as active endpoint.');
      }
    } catch (err) {
      // Even if health returns an error, allow saving if user confirms
      const cleanUrl = backendUrlInput.trim().replace(/\/+$/, '');
      if (cleanUrl) {
        setCustomBackendUrl(cleanUrl);
        setServerStatus('error');
        setServerMessage('Saved URL, but could not verify /health right now. If the backend is spinning up on Render, please wait ~45s and try logging in.');
      }
    } finally {
      setServerTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      let msg = err.response?.data?.detail || err.message || 'Invalid email or password.';
      if (err.message?.includes('static HTML') || err.message === 'Network Error' || !err.response) {
        msg = 'Cannot reach backend server. If using Render, please check your Backend Web Service URL below (free-tier services take ~45s to wake from sleep).';
        setShowServerConfig(true);
      }
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoAdmin = async () => {
    setEmail('admin@netpulse.com');
    setPassword('admin123');
    setLoading(true);
    setError('');
    try {
      try {
        await login('admin@netpulse.com', 'admin123');
      } catch (firstErr) {
        await login('admin@netpulse.io', 'admin123');
      }
      navigate('/dashboard');
    } catch (err) {
      let msg = err.response?.data?.detail || err.message || 'Demo login failed';
      if (err.message?.includes('static HTML') || err.message === 'Network Error' || !err.response) {
        msg = 'Backend not reached. Enter your Render backend URL below and click "Connect".';
        setShowServerConfig(true);
      }
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 items-center justify-center shadow-lg shadow-indigo-500/25 mb-3">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">NetPulse</h1>
          <p className="text-xs font-semibold tracking-wider uppercase text-indigo-400 mt-1">
            Monitor. Detect. Respond.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@netpulse.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Fill */}
        <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
          <button
            onClick={handleQuickDemoAdmin}
            disabled={loading}
            type="button"
            className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Quick Demo Login (Default Admin)
          </button>

          {/* Backend Connection Selector */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="w-full text-center text-[11px] text-slate-400 hover:text-indigo-400 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Server className="w-3.5 h-3.5" />
              <span>{showServerConfig ? 'Hide Backend Connection Settings' : 'Connect / Change Backend URL'}</span>
            </button>

            {showServerConfig && (
              <div className="mt-3 p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Backend API URL</span>
                  <span className="text-[10px] font-mono text-slate-500 truncate max-w-[180px]">
                    Current: {getBaseApiUrl()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={backendUrlInput}
                    onChange={(e) => setBackendUrlInput(e.target.value)}
                    placeholder="https://your-backend.onrender.com"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    disabled={serverTesting}
                    onClick={handleTestAndSaveServer}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50"
                  >
                    {serverTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Connect'}
                  </button>
                </div>
                {serverMessage && (
                  <p className={`text-[11px] flex items-center gap-1.5 ${serverStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {serverStatus === 'connected' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    <span>{serverMessage}</span>
                  </p>
                )}
                <p className="text-[10px] text-slate-500">
                  Paste your live Render Web Service URL here to connect the frontend to your live backend.
                </p>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-slate-400 pt-1">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
