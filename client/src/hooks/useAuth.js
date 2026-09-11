import { useState, useEffect, useCallback } from 'react';
import * as api from '../api';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkStatus = useCallback(async () => {
    try {
      const data = await api.checkAuth();
      setAuthenticated(data.authenticated);
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleLogin = async (username, password) => {
    setError(null);
    try {
      await api.login(username, password);
      setAuthenticated(true);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors
    } finally {
      setAuthenticated(false);
    }
  };

  return { authenticated, loading, error, login: handleLogin, logout: handleLogout };
}
