export default function CampaignRankingTable({ rows }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Ranking de campanhas</p>
      <p className="mt-1 text-xs text-slate-500">
        Leads captados no período selecionado — "Compareceu" e "Vendas" mostram o resultado desses leads até
        agora (mesmo que a conversão tenha acontecido depois do período, já que o ciclo de venda pode ser
        mais longo). Ordenado por vendas, depois por leads que compareceram.
      </p>
      <div className="mt-3 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Sem leads com campanha identificada no período.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Campanha</th>
                <th className="py-2 pr-4 text-right">Leads</th>
                <th className="py-2 pr-4 text-right">Compareceu</th>
                <th className="py-2 pr-4 text-right">Vendas</th>
                <th className="py-2 text-right">Leads → venda</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.campaignName} className="border-b border-slate-900 last:border-0">
                  <td className="py-2 pr-4 text-slate-200">{r.campaignName}</td>
                  <td className="py-2 pr-4 text-right text-slate-300">{r.totalLeads}</td>
                  <td className="py-2 pr-4 text-right text-slate-300">{r.qualifiedLeads}</td>
                  <td className="py-2 pr-4 text-right font-medium text-emerald-400">{r.purchases}</td>
                  <td className="py-2 text-right text-slate-400">
                    {r.totalLeads ? `${((r.purchases / r.totalLeads) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
