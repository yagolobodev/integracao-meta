import MaskedClid from './MaskedClid.jsx';
import { formatDateTime } from '../utils.js';

export default function LeadsList({ leads, selectedLeadId, onSelect }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Leads <span className="text-slate-500">({leads.length})</span>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
        {leads.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Nenhum lead encontrado com os filtros atuais.</p>
        )}
        {leads.map((lead) => (
          <button
            key={lead.id}
            onClick={() => onSelect(lead.id)}
            className={`block w-full px-4 py-3 text-left transition-colors hover:bg-slate-800/60 ${
              selectedLeadId === lead.id ? 'bg-slate-800' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-100">{lead.phone}</span>
              {lead.isOrganic ? (
                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] uppercase text-slate-300">
                  orgânico
                </span>
              ) : (
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] uppercase text-indigo-300">
                  ctwa
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
              <MaskedClid clid={lead.ctwaClid} />
              <span>{lead.adSourceId ?? '—'}</span>
            </div>
            {lead.campaignName && (
              <p className="mt-1 truncate text-xs text-slate-500" title={lead.campaignName}>
                {lead.campaignName}
              </p>
            )}
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-400">{lead.currentStage ?? 'sem etapa'}</span>
              <span className="text-slate-600">{formatDateTime(lead.firstContactAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
