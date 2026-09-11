const API_BASE = '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  };
  
  // Don't set Content-Type for GET/DELETE (no body)
  if (!options.body) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(url, config);
  
  // Handle CSV export (blob response)
  if (response.headers.get('content-type')?.includes('text/csv')) {
    return response;
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = response.status;
    throw error;
  }
  
  return data;
}

// Auth
export const checkAuth = () => request('/auth/status');
export const login = (username, password) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
export const logout = () => request('/auth/logout', { method: 'POST' });

// Clans
export const fetchClans = (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.filter) query.set('filter', params.filter);
  if (params.sort) query.set('sort', params.sort);
  const qs = query.toString();
  return request(`/clans${qs ? '?' + qs : ''}`);
};

export const fetchStats = () => request('/clans/stats');
export const fetchNextUnvisited = () => request('/clans/next-unvisited');

export const addClan = (clan) =>
  request('/clans', { method: 'POST', body: JSON.stringify(clan) });

export const updateClan = (id, clan) =>
  request(`/clans/${id}`, { method: 'PUT', body: JSON.stringify(clan) });

export const deleteClan = (id) =>
  request(`/clans/${id}`, { method: 'DELETE' });

export const visitClan = (id) =>
  request(`/clans/${id}/visit`, { method: 'POST' });

export const unvisitClan = (id) =>
  request(`/clans/${id}/unvisit`, { method: 'POST' });

export const importClans = (data, format, confirm = false) =>
  request('/clans/import', {
    method: 'POST',
    body: JSON.stringify({ data, format, confirm }),
  });

export const exportClans = async () => {
  const response = await request('/clans/export');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `th9-clans-export-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
