import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { getStoredJSON, setStoredJSON } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredJSON('netpulse_user', null));
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('netpulse_token');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifyUser() {
      if (token) {
        try {
          const userData = await authApi.getMe();
          if (isMounted) {
            setUser(userData);
            setStoredJSON('netpulse_user', userData);
          }
        } catch (err) {
          console.warn('Auth validation failed or server waking up:', err);
          // If unauthorized (401), clear the invalid token
          if (err.response?.status === 401) {
            if (isMounted) {
              setUser(null);
              setToken(null);
              try {
                localStorage.removeItem('netpulse_token');
                localStorage.removeItem('netpulse_user');
              } catch (_) {}
            }
          }
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    }

    verifyUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    const resolvedToken = data.access_token || data.token;
    const resolvedUser = data.user;

    setToken(resolvedToken);
    setUser(resolvedUser);

    try {
      localStorage.setItem('netpulse_token', resolvedToken);
      setStoredJSON('netpulse_user', resolvedUser);
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }

    return data;
  };

  const register = async (name, email, password, role = 'Admin') => {
    const data = await authApi.register(name, email, password, role);
    const resolvedToken = data.access_token || data.token;
    const resolvedUser = data.user;

    setToken(resolvedToken);
    setUser(resolvedUser);

    try {
      localStorage.setItem('netpulse_token', resolvedToken);
      setStoredJSON('netpulse_user', resolvedUser);
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }

    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('netpulse_token');
      localStorage.removeItem('netpulse_user');
    } catch (_) {}
  };

  const isAdmin = user?.role ? user.role.toLowerCase() === 'admin' : false;

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
