const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'success', label: 'Sucesso' },
  { value: 'failure', label: 'Falha' },
  { value: 'skipped', label: 'Skipped / orgânico' },
  { value: 'info', label: 'Info' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'contact_in', label: 'Entrada' },
  { value: 'stage_change', label: 'Mudança de etapa' },
  { value: 'capi_event', label: 'Evento CAPI' },
  { value: 'retry', label: 'Retry' },
  { value: 'info', label: 'Info' },
];

export default function Filters({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
      <input
        type="text"
        placeholder="Buscar por telefone ou ctwa_clid"
        value={filters.search}
        onChange={(e) => set({ search: e.target.value })}
        className="w-64 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
      />

      <select
        value={filters.status}
        onChange={(e) => set({ status: e.target.value })}
        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={filters.type}
        onChange={(e) => set({ type: e.target.value })}
        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={filters.from}
        onChange={(e) => set({ from: e.target.value })}
        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
      />
      <span className="text-xs text-slate-500">até</span>
      <input
        type="date"
        value={filters.to}
        onChange={(e) => set({ to: e.target.value })}
        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
      />

      {(filters.search || filters.status || filters.type || filters.from || filters.to) && (
        <button
          onClick={() => onChange({ search: '', status: '', type: '', from: '', to: '' })}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          limpar filtros
        </button>
      )}
    </div>
  );
}
