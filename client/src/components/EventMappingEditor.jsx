import { useEffect, useState } from 'react';
import { api } from '../api.js';

const VALID_META_EVENTS = [
  'LeadSubmitted',
  'QualifiedLead',
  'AppointmentBooked',
  'InitiateCheckout',
  'AddToCart',
  'ViewContent',
  'Purchase',
];

const EMPTY_ROW = {
  pipelineId: '',
  statusId: '',
  kommoStageName: '',
  metaEvent: VALID_META_EVENTS[0],
  value: '',
  currency: 'BRL',
  active: true,
};

export default function EventMappingEditor() {
  const [mappings, setMappings] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [draft, setDraft] = useState(EMPTY_ROW);
  const [error, setError] = useState(null);
  const [statusError, setStatusError] = useState(null);

  const load = () => api.getEventMappings().then(setMappings).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api.getKommoStatuses().then(setPipelines).catch((e) => setStatusError(e.message));
  }, []);

  // Lista achatada de opções "pipeline > etapa (id)" para o <select>, deixando
  // explícito quando duas etapas compartilham o mesmo nome.
  const statusOptions = pipelines.flatMap((p) =>
    p.statuses.map((s) => ({
      pipelineId: p.pipelineId,
      statusId: s.statusId,
      label: `${p.pipelineName} › ${s.name} (id: ${s.statusId})`,
      name: s.name,
    })),
  );

  function selectStatus(value) {
    const [pipelineId, statusId] = value.split('::');
    const opt = statusOptions.find((o) => o.pipelineId === pipelineId && o.statusId === statusId);
    setDraft({ ...draft, pipelineId, statusId, kommoStageName: opt?.name ?? '' });
  }

  async function save(row) {
    setError(null);
    try {
      await api.saveEventMapping(row);
      setDraft(EMPTY_ROW);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    setError(null);
    try {
      await api.deleteEventMapping(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-slate-200">
        Mapa de eventos (etapa do Kommo → evento Meta)
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        O casamento é feito pelo <strong>ID</strong> da etapa, não pelo nome — contas Kommo podem
        ter duas etapas com o mesmo nome (ex.: uma intermediária e o status final "Ganho" do
        kanban), e o seletor abaixo mostra o ID de cada uma para você escolher a certa.
      </p>
      {statusError && (
        <p className="mb-3 rounded-lg bg-red-950 p-3 text-sm text-red-400">
          Não foi possível carregar as etapas do Kommo: {statusError}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2">Etapa Kommo</th>
              <th className="px-3 py-2">Evento Meta</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Moeda</th>
              <th className="px-3 py-2">Ativo</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {mappings.map((m) => (
              <tr key={m.id}>
                <td className="px-3 py-2 text-slate-200">
                  {m.kommoStageName} <span className="text-slate-600">(id: {m.statusId})</span>
                </td>
                <td className="px-3 py-2 text-slate-200">{m.metaEvent}</td>
                <td className="px-3 py-2 text-slate-400">{m.value ?? '—'}</td>
                <td className="px-3 py-2 text-slate-400">{m.currency}</td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={m.active}
                    onChange={(e) => save({ ...m, active: e.target.checked })}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => remove(m.id)} className="text-xs text-red-400 hover:text-red-300">
                    remover
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td className="px-3 py-2">
                <select
                  value={draft.pipelineId && draft.statusId ? `${draft.pipelineId}::${draft.statusId}` : ''}
                  onChange={(e) => selectStatus(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
                >
                  <option value="">selecione a etapa…</option>
                  {statusOptions.map((o) => (
                    <option key={`${o.pipelineId}::${o.statusId}`} value={`${o.pipelineId}::${o.statusId}`}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2">
                <select
                  value={draft.metaEvent}
                  onChange={(e) => setDraft({ ...draft, metaEvent: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
                >
                  {VALID_META_EVENTS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2">
                <input
                  value={draft.value}
                  onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                  placeholder="opcional"
                  className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  value={draft.currency}
                  onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
                  className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
                />
              </td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => save(draft)}
                  disabled={!draft.pipelineId || !draft.statusId}
                  className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
                >
                  adicionar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
