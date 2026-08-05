import TimelineEntry from './TimelineEntry.jsx';

export default function LogsFeed({ events, onSelectLead }) {
  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900">
        <p className="text-sm text-slate-500">Nenhum evento encontrado com os filtros atuais.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
      <ol>
        {events.map((event) => (
          <TimelineEntry
            key={event.id}
            event={event}
            leadLabel={event.lead?.phone}
            onClick={() => onSelectLead(event.leadId)}
          />
        ))}
      </ol>
    </div>
  );
}
