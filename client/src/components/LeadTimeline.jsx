import { useEffect, useState } from 'react';
import { api } from '../api.js';
import MaskedClid from './MaskedClid.jsx';
import TimelineEntry from './TimelineEntry.jsx';
import { formatDateTime } from '../utils.js';

export default function LeadTimeline({ leadId, onClose, refreshKey }) {
  const [lead, setLead] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getLead(leadId)
      .then((data) => !cancelled && setLead(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [leadId, refreshKey]);

  if (error) return <p className="p-4 text-sm text-red-400">{error}</p>;
  if (!lead) return <p className="p-4 text-sm text-slate-500">Carregando…</p>;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex items-start justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">{lead.phone}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span>
              ctwa_clid: <MaskedClid clid={lead.ctwaClid} />
            </span>
            <span>ad_source_id: {lead.adSourceId ?? '—'}</span>
            <span>etapa: {lead.currentStage ?? 'sem etapa'}</span>
            <span>1º contato: {formatDateTime(lead.firstContactAt)}</span>
          </div>
          {(lead.campaignName || lead.adsetName || lead.creativeName) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>Campanha: {lead.campaignName ?? '—'}</span>
              <span>Conjunto: {lead.adsetName ?? '—'}</span>
              <span>Criativo: {lead.creativeName ?? '—'}</span>
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">
          fechar ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {lead.timeline.length === 0 ? (
          <p className="text-sm text-slate-500">Sem eventos registrados ainda.</p>
        ) : (
          <ol>
            {lead.timeline.map((event) => (
              <TimelineEntry key={event.id} event={event} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
