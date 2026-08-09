import { prisma } from '../db/prisma.js';
import { parseDateRange } from '../lib/dateRange.js';

// Ordem canônica dos eventos válidos da Meta CAPI (vocabulário documentado no
// README) — usada para ordenar o funil como um funil de verdade em vez de
// ordem alfabética/de descoberta.
export const CANONICAL_EVENT_ORDER = [
  'LeadSubmitted',
  'AppointmentBooked',
  'QualifiedLead',
  'InitiateCheckout',
  'AddToCart',
  'ViewContent',
  'Purchase',
];

function parseEventName(payload) {
  if (!payload) return null;
  try {
    return JSON.parse(payload)?.data?.[0]?.event_name ?? null;
  } catch {
    return null;
  }
}

/** KPIs escopados a um período (equivalente ao /api/metrics, mas com from/to em vez de "hoje"/"todo o histórico"). */
export async function getSummary({ from, to } = {}) {
  const range = parseDateRange({ from, to });
  const leadWhere = range ? { firstContactAt: range } : {};
  const eventWhere = range ? { createdAt: range } : {};

  const [totalLeads, leadsWithCtwaClid, capiSuccess, capiFailure] = await Promise.all([
    prisma.lead.count({ where: leadWhere }),
    prisma.lead.count({ where: { ...leadWhere, ctwaClid: { not: null } } }),
    prisma.timelineEvent.count({ where: { ...eventWhere, type: 'capi_event', status: 'success' } }),
    prisma.timelineEvent.count({ where: { ...eventWhere, type: 'capi_event', status: 'failure' } }),
  ]);

  const attempts = capiSuccess + capiFailure;

  return {
    totalLeads,
    leadsWithCtwaClid,
    ctwaCaptureRate: totalLeads ? (leadsWithCtwaClid / totalLeads) * 100 : 0,
    eventsSent: capiSuccess,
    capiSuccessRate: attempts ? (capiSuccess / attempts) * 100 : null,
  };
}

/**
 * Leads por dia (total / via anúncio / orgânico) no período. Agrupamento em
 * memória — adequado ao volume atual (centenas de leads); se crescer muito,
 * trocar por SQL bruto com strftime('%Y-%m-%d', ...) agrupando no banco.
 */
export async function getLeadsTimeseries({ from, to } = {}) {
  const range = parseDateRange({ from, to });
  const leads = await prisma.lead.findMany({
    where: range ? { firstContactAt: range } : {},
    select: { firstContactAt: true, isOrganic: true },
  });

  const byDay = new Map();
  for (const lead of leads) {
    const d = new Date(lead.firstContactAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const entry = byDay.get(key) ?? { date: key, total: 0, withAd: 0, organic: 0 };
    entry.total += 1;
    if (lead.isOrganic) entry.organic += 1;
    else entry.withAd += 1;
    byDay.set(key, entry);
  }

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Funil de conversão: eventos CAPI enviados com sucesso NO PERÍODO, agrupados
 * por nome do evento Meta — visão de "atividade no período" (o que a fila
 * processou nessa janela), não de coorte.
 */
export async function getFunnel({ from, to } = {}) {
  const range = parseDateRange({ from, to });
  const events = await prisma.timelineEvent.findMany({
    where: { ...(range ? { createdAt: range } : {}), type: 'capi_event', status: 'success' },
    select: { payload: true },
  });

  const counts = new Map();
  for (const event of events) {
    const eventName = parseEventName(event.payload);
    if (!eventName) continue;
    counts.set(eventName, (counts.get(eventName) ?? 0) + 1);
  }

  const known = CANONICAL_EVENT_ORDER.filter((name) => counts.has(name));
  const extra = [...counts.keys()].filter((name) => !CANONICAL_EVENT_ORDER.includes(name));

  return [...known, ...extra].map((eventName) => ({ eventName, count: counts.get(eventName) }));
}

/**
 * Ranking de campanhas: leads CAPTADOS no período, com o resultado (Compareceu
 * / Venda) desses mesmos leads A QUALQUER MOMENTO depois — não só dentro da
 * mesma janela. Dado o ciclo de venda mais longo do negócio, um lead captado
 * nos últimos 7 dias pode só converter duas semanas depois; filtrar o evento
 * pela mesma janela do lead penalizaria artificialmente períodos recentes.
 */
export async function getCampaignRanking({ from, to } = {}) {
  const range = parseDateRange({ from, to });
  const leadWhere = {
    campaignName: { not: null },
    ...(range ? { firstContactAt: range } : {}),
  };

  const [leadCounts, leadsInRange] = await Promise.all([
    prisma.lead.groupBy({ by: ['campaignName'], where: leadWhere, _count: { _all: true } }),
    prisma.lead.findMany({ where: leadWhere, select: { id: true, campaignName: true } }),
  ]);

  const campaignByLeadId = new Map(leadsInRange.map((l) => [l.id, l.campaignName]));

  const qualifyingEvents = campaignByLeadId.size
    ? await prisma.timelineEvent.findMany({
        where: {
          type: 'capi_event',
          status: 'success',
          leadId: { in: [...campaignByLeadId.keys()] },
        },
        select: { leadId: true, payload: true },
      })
    : [];

  const qualifiedByCampaign = new Map();
  const purchasesByCampaign = new Map();
  for (const event of qualifyingEvents) {
    const campaignName = campaignByLeadId.get(event.leadId);
    const eventName = parseEventName(event.payload);
    if (!campaignName || !eventName) continue;
    if (eventName === 'QualifiedLead') {
      qualifiedByCampaign.set(campaignName, (qualifiedByCampaign.get(campaignName) ?? 0) + 1);
    }
    if (eventName === 'Purchase') {
      purchasesByCampaign.set(campaignName, (purchasesByCampaign.get(campaignName) ?? 0) + 1);
    }
  }

  return leadCounts
    .map((row) => ({
      campaignName: row.campaignName,
      totalLeads: row._count._all,
      qualifiedLeads: qualifiedByCampaign.get(row.campaignName) ?? 0,
      purchases: purchasesByCampaign.get(row.campaignName) ?? 0,
    }))
    .sort((a, b) => b.purchases - a.purchases || b.qualifiedLeads - a.qualifiedLeads || b.totalLeads - a.totalLeads);
}
