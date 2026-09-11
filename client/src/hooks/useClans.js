import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../api';

export function useClans() {
  const [clans, setClans] = useState([]);
  const [stats, setStats] = useState({ total: 0, visited: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('default');
  const pollingRef = useRef(null);

  const loadClans = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filter !== 'all') params.filter = filter;
      if (sort !== 'default') params.sort = sort;
      const data = await api.fetchClans(params);
      setClans(data.clans);
      setError(null);
    } catch (err) {
      if (err.status === 401) return; // Don't show error for auth issues
      setError(err.message);
    }
  }, [search, filter, sort]);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.fetchStats();
      setStats(data);
    } catch {
      // Silent fail for stats
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadClans(), loadStats()]);
    setLoading(false);
  }, [loadClans, loadStats]);

  // Initial load and when filters change
  useEffect(() => {
    refresh();
  }, [refresh]);

  // 30-second polling
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      loadClans();
      loadStats();
    }, 30000);
    return () => clearInterval(pollingRef.current);
  }, [loadClans, loadStats]);

  const addClan = async (clan) => {
    const result = await api.addClan(clan);
    await refresh();
    return result;
  };

  const updateClan = async (id, clan) => {
    const result = await api.updateClan(id, clan);
    await refresh();
    return result;
  };

  const removeClan = async (id) => {
    await api.deleteClan(id);
    await refresh();
  };

  const visit = async (id) => {
    const result = await api.visitClan(id);
    await refresh();
    return result;
  };

  const unvisit = async (id) => {
    const result = await api.unvisitClan(id);
    await refresh();
    return result;
  };

  const getNextUnvisited = async () => {
    const data = await api.fetchNextUnvisited();
    return data.clan;
  };

  return {
    clans, stats, loading, error,
    search, setSearch,
    filter, setFilter,
    sort, setSort,
    refresh,
    addClan, updateClan, removeClan,
    visit, unvisit,
    getNextUnvisited
  };
}
