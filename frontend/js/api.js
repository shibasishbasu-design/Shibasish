(() => {
  const API_BASE = (window.CAMPUSGIG_CONFIG && window.CAMPUSGIG_CONFIG.apiBase) || '/api';

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    let data = null;
    try { data = await response.json(); } catch { /* empty body */ }
    if (!response.ok) throw new Error((data && data.error) || `Request failed (${response.status})`);
    return data;
  }

  function query(params = {}) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') usp.set(key, value);
    });
    const str = usp.toString();
    return str ? `?${str}` : '';
  }

  window.api = {
    identify: (name, email) => request('/users/identify', { method: 'POST', body: JSON.stringify({ name, email }) }),
    getGigs: (filters = {}) => request(`/gigs${query(filters)}`),
    getGig: id => request(`/gigs/${encodeURIComponent(id)}`),
    createGig: payload => request('/gigs', { method: 'POST', body: JSON.stringify(payload) }),
    takeGig: (id, payload) => request(`/gigs/${encodeURIComponent(id)}/take`, { method: 'POST', body: JSON.stringify(payload) }),
    updateReward: (id, payload) => request(`/gigs/${encodeURIComponent(id)}/reward`, { method: 'PATCH', body: JSON.stringify(payload) }),
    updateArchitecture: (id, payload) => request(`/gigs/${encodeURIComponent(id)}/architecture`, { method: 'PATCH', body: JSON.stringify(payload) }),
    completeGig: (id, payload) => request(`/gigs/${encodeURIComponent(id)}/complete`, { method: 'POST', body: JSON.stringify(payload) }),
    getActivity: (filters = {}) => request(`/activity${query(filters)}`)
  };
})();
