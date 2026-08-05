async function request(path, options) {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  getLeads: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    return request(`/leads?${qs.toString()}`);
  },
  getLead: (id) => request(`/leads/${id}`),
  getStages: () => request('/leads/meta/stages'),
  getEvents: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    return request(`/events?${qs.toString()}`);
  },
  getMetrics: () => request('/metrics'),
  getHealth: () => request('/health'),
  getEventMappings: () => request('/event-mappings'),
  getKommoStatuses: () => request('/kommo/statuses'),
  saveEventMapping: (mapping) =>
    mapping.id
      ? request(`/event-mappings/${mapping.id}`, { method: 'PUT', body: JSON.stringify(mapping) })
      : request('/event-mappings', { method: 'POST', body: JSON.stringify(mapping) }),
  deleteEventMapping: (id) => request(`/event-mappings/${id}`, { method: 'DELETE' }),
  sendTestEvent: (payload) =>
    request('/test-events/send', { method: 'POST', body: JSON.stringify(payload) }),
};
