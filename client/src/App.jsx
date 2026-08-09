import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import MetricsCards from './components/MetricsCards.jsx';
import Filters from './components/Filters.jsx';
import LeadsList from './components/LeadsList.jsx';
import LeadTimeline from './components/LeadTimeline.jsx';
import LogsFeed from './components/LogsFeed.jsx';
import Diagnostics from './components/Diagnostics.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';

const EMPTY_FILTERS = { search: '', status: '', type: '', from: '', to: '' };

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [connected, setConnected] = useState(false);

  const leadFilters = useMemo(
    () => ({ search: filters.search }),
    [filters.search],
  );

  const eventFilters = useMemo(
    () => ({
      search: filters.search,
      status: filters.status,
      type: filters.type,
      from: filters.from,
      to: filters.to,
    }),
    [filters],
  );

  const reload = () => {
    api.getMetrics().then(setMetrics).catch(() => {});
    api.getLeads(leadFilters).then(setLeads).catch(() => {});
    api.getEvents(eventFilters).then(setEvents).catch(() => {});
  };

  useEffect(reload, [JSON.stringify(leadFilters), JSON.stringify(eventFilters)]);

  // Tempo real: qualquer nova entrada de timeline dispara um refresh dos
  // dados exibidos (métricas, feed global e — se aplicável — o lead aberto).
  useEffect(() => {
    const source = new EventSource('/api/stream');
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.addEventListener('timeline_event', () => {
      reload();
      setRefreshKey((k) => k + 1);
    });
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(leadFilters), JSON.stringify(eventFilters)]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Kommo CTWA Middleware</h1>
            <p className="text-xs text-slate-500">
              Rastreamento de atribuição WhatsApp Ads → Kommo → Meta Conversions API
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-600'}`} />
              {connected ? 'tempo real conectado' : 'reconectando…'}
            </span>
            <nav className="flex gap-1 rounded-lg bg-slate-900 p-1">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'logs', label: 'Logs' },
                { id: 'diagnostics', label: 'Diagnóstico' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 p-6">
        {tab === 'dashboard' ? (
          <Dashboard />
        ) : tab === 'logs' ? (
          <>
            <MetricsCards metrics={metrics} />
            <Filters filters={filters} onChange={setFilters} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]" style={{ height: '65vh' }}>
              <LeadsList leads={leads} selectedLeadId={selectedLeadId} onSelect={setSelectedLeadId} />
              {selectedLeadId ? (
                <LeadTimeline
                  leadId={selectedLeadId}
                  refreshKey={refreshKey}
                  onClose={() => setSelectedLeadId(null)}
                />
              ) : (
                <LogsFeed events={events} onSelectLead={setSelectedLeadId} />
              )}
            </div>
          </>
        ) : (
          <Diagnostics />
        )}
      </main>
    </div>
  );
}
