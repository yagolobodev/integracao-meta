import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';

const EVENT_LABELS = {
  LeadSubmitted: 'Contato',
  AppointmentBooked: 'Agendado',
  QualifiedLead: 'Compareceu',
  Purchase: 'Venda',
  InitiateCheckout: 'Checkout iniciado',
  AddToCart: 'Adicionou ao carrinho',
  ViewContent: 'Visualizou conteúdo',
};

const BAR_COLOR = '#6366f1';

export default function FunnelChart({ data }) {
  const chartData = data.map((d) => ({ ...d, label: EVENT_LABELS[d.eventName] ?? d.eventName }));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Funil de conversão</p>
      <p className="mt-1 text-xs text-slate-500">Eventos CAPI enviados com sucesso no período selecionado.</p>
      <div className="mt-3 h-72">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Nenhum evento CAPI enviado com sucesso no período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={110} tick={{ fill: '#e2e8f0', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="count" name="Eventos" fill={BAR_COLOR} radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fillOpacity={Math.max(1 - i * 0.12, 0.4)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
