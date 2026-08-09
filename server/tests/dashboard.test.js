import { describe, it, expect, vi, beforeEach } from 'vitest';

let leads = [];
let timelineEvents = [];

function matchesLeadWhere(lead, where) {
  if (where.campaignName?.not === null && lead.campaignName === null) return false;
  if (where.ctwaClid?.not === null && lead.ctwaClid === null) return false;
  if (where.firstContactAt) {
    const t = new Date(lead.firstContactAt).getTime();
    if (where.firstContactAt.gte && t < where.firstContactAt.gte.getTime()) return false;
    if (where.firstContactAt.lte && t > where.firstContactAt.lte.getTime()) return false;
  }
  return true;
}

function matchesEventWhere(event, where) {
  if (where.type && event.type !== where.type) return false;
  if (where.status && event.status !== where.status) return false;
  if (where.leadId?.in && !where.leadId.in.includes(event.leadId)) return false;
  if (where.createdAt) {
    const t = new Date(event.createdAt).getTime();
    if (where.createdAt.gte && t < where.createdAt.gte.getTime()) return false;
    if (where.createdAt.lte && t > where.createdAt.lte.getTime()) return false;
  }
  return true;
}

vi.mock('../src/db/prisma.js', () => ({
  prisma: {
    lead: {
      count: vi.fn(({ where = {} } = {}) =>
        Promise.resolve(leads.filter((l) => matchesLeadWhere(l, where)).length),
      ),
      findMany: vi.fn(({ where = {} } = {}) =>
        Promise.resolve(leads.filter((l) => matchesLeadWhere(l, where))),
      ),
      groupBy: vi.fn(({ where = {} } = {}) => {
        const filtered = leads.filter((l) => matchesLeadWhere(l, where));
        const groups = new Map();
        for (const l of filtered) groups.set(l.campaignName, (groups.get(l.campaignName) ?? 0) + 1);
        return Promise.resolve(
          [...groups.entries()].map(([campaignName, count]) => ({
            campaignName,
            _count: { _all: count },
          })),
        );
      }),
    },
    timelineEvent: {
      count: vi.fn(({ where = {} } = {}) =>
        Promise.resolve(timelineEvents.filter((e) => matchesEventWhere(e, where)).length),
      ),
      findMany: vi.fn(({ where = {} } = {}) =>
        Promise.resolve(timelineEvents.filter((e) => matchesEventWhere(e, where))),
      ),
    },
  },
}));

const { getSummary, getLeadsTimeseries, getFunnel, getCampaignRanking } = await import(
  '../src/services/dashboardService.js'
);

function capiEvent({ leadId, eventName, status = 'success', createdAt }) {
  return {
    leadId,
    type: 'capi_event',
    status,
    createdAt,
    payload: eventName ? JSON.stringify({ data: [{ event_name: eventName }] }) : null,
  };
}

beforeEach(() => {
  leads = [];
  timelineEvents = [];
});

describe('getSummary', () => {
  it('calcula taxa de captura de ctwa_clid e taxa de sucesso da CAPI dentro do período', async () => {
    leads = [
      { id: 'l1', ctwaClid: 'abc', firstContactAt: '2026-08-05T10:00:00Z' },
      { id: 'l2', ctwaClid: null, firstContactAt: '2026-08-05T11:00:00Z' },
      { id: 'l3', ctwaClid: 'xyz', firstContactAt: '2026-08-20T10:00:00Z' }, // fora do período
    ];
    timelineEvents = [
      capiEvent({ leadId: 'l1', eventName: 'LeadSubmitted', status: 'success', createdAt: '2026-08-05T12:00:00Z' }),
      capiEvent({ leadId: 'l1', eventName: 'AppointmentBooked', status: 'failure', createdAt: '2026-08-05T13:00:00Z' }),
    ];

    const summary = await getSummary({ from: '2026-08-01', to: '2026-08-09' });

    expect(summary.totalLeads).toBe(2);
    expect(summary.leadsWithCtwaClid).toBe(1);
    expect(summary.ctwaCaptureRate).toBe(50);
    expect(summary.eventsSent).toBe(1);
    expect(summary.capiSuccessRate).toBe(50);
  });

  it('retorna capiSuccessRate null quando não há tentativas de envio', async () => {
    leads = [{ id: 'l1', ctwaClid: null, firstContactAt: '2026-08-05T10:00:00Z' }];
    const summary = await getSummary({ from: '2026-08-01', to: '2026-08-09' });
    expect(summary.capiSuccessRate).toBeNull();
    expect(summary.ctwaCaptureRate).toBe(0);
  });
});

describe('getLeadsTimeseries', () => {
  it('agrupa leads por dia, separando via anúncio de orgânico', async () => {
    leads = [
      { firstContactAt: '2026-08-05T10:00:00Z', isOrganic: false },
      { firstContactAt: '2026-08-05T20:00:00Z', isOrganic: true },
      { firstContactAt: '2026-08-06T09:00:00Z', isOrganic: false },
    ];

    const series = await getLeadsTimeseries({ from: '2026-08-01', to: '2026-08-09' });

    expect(series).toEqual([
      { date: '2026-08-05', total: 2, withAd: 1, organic: 1 },
      { date: '2026-08-06', total: 1, withAd: 1, organic: 0 },
    ]);
    for (const day of series) {
      expect(day.total).toBe(day.withAd + day.organic);
    }
  });
});

describe('getFunnel', () => {
  it('ordena eventos conhecidos na ordem canônica do funil', async () => {
    timelineEvents = [
      capiEvent({ leadId: 'l1', eventName: 'Purchase', createdAt: '2026-08-05T10:00:00Z' }),
      capiEvent({ leadId: 'l2', eventName: 'LeadSubmitted', createdAt: '2026-08-05T10:00:00Z' }),
      capiEvent({ leadId: 'l3', eventName: 'QualifiedLead', createdAt: '2026-08-05T10:00:00Z' }),
      capiEvent({ leadId: 'l4', eventName: 'LeadSubmitted', createdAt: '2026-08-05T10:00:00Z' }),
    ];

    const funnel = await getFunnel({ from: '2026-08-01', to: '2026-08-09' });

    expect(funnel).toEqual([
      { eventName: 'LeadSubmitted', count: 2 },
      { eventName: 'QualifiedLead', count: 1 },
      { eventName: 'Purchase', count: 1 },
    ]);
  });

  it('anexa nomes de evento não previstos no fim, sem descartar dado', async () => {
    timelineEvents = [
      capiEvent({ leadId: 'l1', eventName: 'LeadSubmitted', createdAt: '2026-08-05T10:00:00Z' }),
      capiEvent({ leadId: 'l2', eventName: 'SomeFutureEvent', createdAt: '2026-08-05T10:00:00Z' }),
    ];

    const funnel = await getFunnel({ from: '2026-08-01', to: '2026-08-09' });

    expect(funnel.map((f) => f.eventName)).toEqual(['LeadSubmitted', 'SomeFutureEvent']);
  });

  it('ignora eventos com payload ausente ou malformado sem quebrar', async () => {
    timelineEvents = [
      { leadId: 'l1', type: 'capi_event', status: 'success', createdAt: '2026-08-05T10:00:00Z', payload: null },
      { leadId: 'l2', type: 'capi_event', status: 'success', createdAt: '2026-08-05T10:00:00Z', payload: '{not json' },
      capiEvent({ leadId: 'l3', eventName: 'LeadSubmitted', createdAt: '2026-08-05T10:00:00Z' }),
    ];

    const funnel = await getFunnel({ from: '2026-08-01', to: '2026-08-09' });

    expect(funnel).toEqual([{ eventName: 'LeadSubmitted', count: 1 }]);
  });
});

describe('getCampaignRanking', () => {
  it('exclui leads sem campanha identificada', async () => {
    leads = [
      { id: 'l1', campaignName: 'Campanha A', firstContactAt: '2026-08-05T10:00:00Z' },
      { id: 'l2', campaignName: null, firstContactAt: '2026-08-05T10:00:00Z' },
    ];

    const rows = await getCampaignRanking({ from: '2026-08-01', to: '2026-08-09' });

    expect(rows).toEqual([{ campaignName: 'Campanha A', totalLeads: 1, qualifiedLeads: 0, purchases: 0 }]);
  });

  it('ordena por vendas, depois compareceu, depois volume de leads', async () => {
    leads = [
      { id: 'l1', campaignName: 'Campanha volume', firstContactAt: '2026-08-05T10:00:00Z' },
      { id: 'l2', campaignName: 'Campanha volume', firstContactAt: '2026-08-05T10:00:00Z' },
      { id: 'l3', campaignName: 'Campanha volume', firstContactAt: '2026-08-05T10:00:00Z' },
      { id: 'l4', campaignName: 'Campanha vendas', firstContactAt: '2026-08-05T10:00:00Z' },
    ];
    timelineEvents = [capiEvent({ leadId: 'l4', eventName: 'Purchase', createdAt: '2026-08-05T10:00:00Z' })];

    const rows = await getCampaignRanking({ from: '2026-08-01', to: '2026-08-09' });

    expect(rows.map((r) => r.campaignName)).toEqual(['Campanha vendas', 'Campanha volume']);
  });

  it('conta conversão de um lead captado no período mesmo que o evento tenha ocorrido FORA da janela (ciclo de venda longo)', async () => {
    leads = [{ id: 'l1', campaignName: 'Campanha ciclo longo', firstContactAt: '2026-08-01T10:00:00Z' }];
    // Lead captado em 01/08 (dentro do período consultado), mas só "vendeu"
    // em 01/09 — bem depois da janela de 01 a 09/08 consultada no dashboard.
    timelineEvents = [
      capiEvent({ leadId: 'l1', eventName: 'Purchase', createdAt: '2026-09-01T10:00:00Z' }),
    ];

    const rows = await getCampaignRanking({ from: '2026-08-01', to: '2026-08-09' });

    expect(rows).toEqual([
      { campaignName: 'Campanha ciclo longo', totalLeads: 1, qualifiedLeads: 0, purchases: 1 },
    ]);
  });
});
