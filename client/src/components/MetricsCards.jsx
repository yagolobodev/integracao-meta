function Card({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-50">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function MetricsCards({ metrics }) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card label="Total de leads" value={metrics.totalLeads} />
      <Card
        label="Com ctwa_clid"
        value={`${metrics.ctwaCaptureRate.toFixed(1)}%`}
        hint={`${metrics.leadsWithCtwaClid} de ${metrics.totalLeads}`}
      />
      <Card label="Eventos enviados hoje" value={metrics.eventsSentToday} />
      <Card
        label="Taxa de sucesso CAPI"
        value={metrics.capiSuccessRateToday === null ? '—' : `${metrics.capiSuccessRateToday.toFixed(1)}%`}
        hint="hoje"
      />
    </div>
  );
}
