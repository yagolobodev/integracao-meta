function Card({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-50">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function DashboardKpis({ summary }) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card label="Leads no período" value={summary.totalLeads} />
      <Card
        label="Com ctwa_clid"
        value={`${summary.ctwaCaptureRate.toFixed(1)}%`}
        hint={`${summary.leadsWithCtwaClid} de ${summary.totalLeads}`}
      />
      <Card label="Eventos CAPI enviados" value={summary.eventsSent} />
      <Card
        label="Taxa de sucesso CAPI"
        value={summary.capiSuccessRate === null ? '—' : `${summary.capiSuccessRate.toFixed(1)}%`}
        hint="no período"
      />
    </div>
  );
}
