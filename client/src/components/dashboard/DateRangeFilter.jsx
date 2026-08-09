const PRESETS = [
  { id: 'today', label: 'Hoje', days: 0 },
  { id: '7d', label: '7 dias', days: 6 },
  { id: '30d', label: '30 dias', days: 29 },
];

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function presetRange(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: toISODate(from), to: toISODate(to) };
}

export default function DateRangeFilter({ range, activePreset, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
      <div className="flex gap-1 rounded-lg bg-slate-950 p-1">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange({ ...presetRange(p.days), preset: p.id })}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              activePreset === p.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-slate-500">personalizado:</span>
      <input
        type="date"
        value={range.from}
        onChange={(e) => onChange({ from: e.target.value, to: range.to, preset: null })}
        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
      />
      <span className="text-xs text-slate-500">até</span>
      <input
        type="date"
        value={range.to}
        onChange={(e) => onChange({ from: range.from, to: e.target.value, preset: null })}
        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
      />
    </div>
  );
}
