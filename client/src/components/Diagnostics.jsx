import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDateTime } from '../utils.js';
import EventMappingEditor from './EventMappingEditor.jsx';

function IntegrationCard({ name, integration }) {
  const ok = integration?.ok;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">{name}</h3>
        <span
          className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
          title={ok ? 'ok' : 'com problema'}
        />
      </div>
      <p className="mt-1 text-xs text-slate-400">{integration?.message}</p>
    </div>
  );
}

export default function Diagnostics() {
  const [health, setHealth] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [sending, setSending] = useState(false);
  const [eventName, setEventName] = useState('LeadSubmitted');
  const [leadId, setLeadId] = useState('');

  const loadHealth = () => api.getHealth().then(setHealth).catch(() => {});

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 15_000);
    return () => clearInterval(interval);
  }, []);

  async function sendTest() {
    setSending(true);
    setTestError(null);
    setTestResult(null);
    try {
      const result = await api.sendTestEvent({ eventName, leadId: leadId || undefined });
      setTestResult(result);
    } catch (err) {
      setTestError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Saúde das integrações</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <IntegrationCard name="Kommo" integration={health?.integrations?.kommo} />
          <IntegrationCard name="Meta Conversions API" integration={health?.integrations?.meta} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Últimos erros</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
          {(health?.recentFailures ?? []).length === 0 && (
            <p className="p-4 text-sm text-slate-500">Nenhum erro recente registrado.</p>
          )}
          {(health?.recentFailures ?? []).map((f) => (
            <div key={f.id} className="p-3 text-sm">
              <p className="text-red-400">{f.title}</p>
              <p className="text-xs text-slate-500">
                {f.leadPhone} · {formatDateTime(f.createdAt)}
              </p>
              {f.description && <p className="mt-1 text-xs text-slate-400">{f.description}</p>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Enviar evento de teste (Test Events)</h2>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <select
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
          >
            {['LeadSubmitted', 'QualifiedLead', 'AppointmentBooked', 'InitiateCheckout', 'AddToCart', 'ViewContent', 'Purchase'].map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="ID do lead (opcional — usa ctwa_clid sintético se vazio)"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            className="w-96 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600"
          />
          <button
            onClick={sendTest}
            disabled={sending}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {sending ? 'Enviando…' : 'Enviar evento de teste'}
          </button>
        </div>
        {testError && (
          <p className="mt-2 rounded-lg bg-red-950 p-3 text-sm text-red-400">{testError}</p>
        )}
        {testResult && (
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-emerald-400">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        )}
      </div>

      <EventMappingEditor />
    </div>
  );
}
