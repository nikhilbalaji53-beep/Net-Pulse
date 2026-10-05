import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('netpulse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor for 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('netpulse_token');
        localStorage.removeItem('netpulse_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (name, email, password, role = 'Admin') => {
    const res = await api.post('/auth/register', { name, email, password, role });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const monitorsApi = {
  getMonitors: async (params = {}) => {
    const res = await api.get('/monitors', { params });
    return res.data;
  },
  getMonitor: async (id) => {
    const res = await api.get(`/monitors/${id}`);
    return res.data;
  },
  createMonitor: async (data) => {
    const res = await api.post('/monitors', data);
    return res.data;
  },
  updateMonitor: async (id, data) => {
    const res = await api.put(`/monitors/${id}`, data);
    return res.data;
  },
  deleteMonitor: async (id) => {
    const res = await api.delete(`/monitors/${id}`);
    return res.data;
  },
  pauseMonitor: async (id) => {
    const res = await api.post(`/monitors/${id}/pause`);
    return res.data;
  },
  resumeMonitor: async (id) => {
    const res = await api.post(`/monitors/${id}/resume`);
    return res.data;
  },
  checkNow: async (id) => {
    const res = await api.post(`/monitors/${id}/check`);
    return res.data;
  },
  getResults: async (id, range = '24h', limit = 200) => {
    const res = await api.get(`/monitors/${id}/results`, { params: { range, limit } });
    return res.data;
  },
  getUptime: async (id) => {
    const res = await api.get(`/monitors/${id}/uptime`);
    return res.data;
  },
};

export const dashboardApi = {
  getStats: async () => {
    const res = await api.get('/dashboard/stats');
    return res.data;
  },
};

export const incidentsApi = {
  getIncidents: async (params = {}) => {
    const res = await api.get('/incidents', { params });
    return res.data;
  },
};

export const alertsApi = {
  getAlerts: async (params = {}) => {
    const res = await api.get('/alerts', { params });
    return res.data;
  },
};

export const reportsApi = {
  getReport: async (startDate, endDate) => {
    const res = await api.get('/reports', {
      params: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
    });
    return res.data;
  },
  downloadCsv: async (startDate, endDate) => {
    const res = await api.get('/reports/export', {
      params: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
      responseType: 'blob',
    });
    return res.data;
  },
};

export const auditApi = {
  getAuditLogs: async (limit = 100) => {
    const res = await api.get('/audit-logs', { params: { limit } });
    return res.data;
  },
};

export const settingsApi = {
  getSettings: async () => {
    const res = await api.get('/settings');
    return res.data;
  },
  updateSettings: async (data) => {
    const res = await api.put('/settings', data);
    return res.data;
  },
};

export const healthApi = {
  check: async () => {
    const res = await axios.get('/health');
    return res.data;
  },
};

export default api;
