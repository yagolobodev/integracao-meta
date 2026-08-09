import { useState } from 'react';
import EventIcon from './EventIcon.jsx';
import { statusStyle } from './StatusIcon.jsx';
import { getEventPresentation } from '../eventPresentation.js';
import { formatDateTime, formatRelativeTime } from '../utils.js';

export default function TimelineEntry({ event, leadLabel, onClick }) {
  const [open, setOpen] = useState(false);
  const hasDetails = event.payload || event.response;
  const presentation = getEventPresentation(event);
  const style = statusStyle(presentation.tone);

  return (
    <li
      className={`relative pb-6 pl-9 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <span className="absolute left-3 top-1 h-full w-px bg-slate-800" aria-hidden="true" />
      <span className="absolute left-0 top-0">
        <EventIcon name={presentation.icon} tone={presentation.tone} />
      </span>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
          {presentation.label}
        </span>
        <span title={formatDateTime(event.createdAt)}>{formatRelativeTime(event.createdAt)}</span>
        {leadLabel && <span className="text-slate-400">· {leadLabel}</span>}
      </div>

      <p className={`mt-1 text-sm font-medium ${style.text}`}>{event.title}</p>
      {event.description && <p className="mt-0.5 text-xs text-slate-400">{event.description}</p>}

      {hasDetails && (
        <div className="mt-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            {open ? 'ocultar detalhes' : 'ver payload / resposta'}
          </button>
          {open && (
            <div className="mt-2 space-y-2">
              {event.payload && (
                <div>
                  <p className="text-[10px] uppercase text-slate-500">Payload enviado</p>
                  <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-slate-950 p-2 text-[11px] text-slate-300">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              )}
              {event.response && (
                <div>
                  <p className="text-[10px] uppercase text-slate-500">Resposta</p>
                  <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-slate-950 p-2 text-[11px] text-slate-300">
                    {JSON.stringify(event.response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
