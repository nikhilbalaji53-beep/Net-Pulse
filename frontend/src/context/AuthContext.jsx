import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('netpulse_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('netpulse_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyUser() {
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
          localStorage.setItem('netpulse_user', JSON.stringify(userData));
        } catch (err) {
          console.error("Auth validation failed", err);
          logout();
        }
      }
      setLoading(false);
    }
    verifyUser();
  }, [token]);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('netpulse_token', data.access_token);
    localStorage.setItem('netpulse_user', JSON.stringify(data.user));
    return data;
  };

  const register = async (name, email, password, role = 'Admin') => {
    const data = await authApi.register(name, email, password, role);
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('netpulse_token', data.access_token);
    localStorage.setItem('netpulse_user', JSON.stringify(data.user));
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('netpulse_token');
    localStorage.removeItem('netpulse_user');
  };

  const isAdmin = user?.role === 'Admin';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
