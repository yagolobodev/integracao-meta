import { describe, it, expect, vi, beforeEach } from 'vitest';

const mappingsDb = new Map();
const key = (pipelineId, statusId) => `${pipelineId}::${statusId}`;

vi.mock('../src/db/prisma.js', () => ({
  prisma: {
    eventMapping: {
      findUnique: vi.fn(({ where: { pipelineId_statusId } }) =>
        Promise.resolve(
          mappingsDb.get(key(pipelineId_statusId.pipelineId, pipelineId_statusId.statusId)) ?? null,
        ),
      ),
      upsert: vi.fn(({ where: { pipelineId_statusId }, create, update }) => {
        const k = key(pipelineId_statusId.pipelineId, pipelineId_statusId.statusId);
        const existing = mappingsDb.get(k);
        const value = existing ? { ...existing, ...update } : { id: k, ...create };
        mappingsDb.set(k, value);
        return Promise.resolve(value);
      }),
    },
  },
}));

const { resolveMapping, upsertMapping } = await import('../src/services/eventMappingService.js');

describe('mapeamento etapa -> evento (por pipelineId/statusId)', () => {
  beforeEach(() => {
    mappingsDb.clear();
  });

  it('resolve o evento Meta configurado para uma etapa do Kommo (por id)', async () => {
    await upsertMapping({
      pipelineId: '13166667',
      statusId: '101573691',
      kommoStageName: 'Contato Inicial',
      metaEvent: 'LeadSubmitted',
    });

    const mapping = await resolveMapping('13166667', '101573691');
    expect(mapping.metaEvent).toBe('LeadSubmitted');
  });

  it('retorna null para uma etapa sem mapeamento cadastrado', async () => {
    expect(await resolveMapping('13166667', '999999')).toBeNull();
  });

  it('distingue duas etapas com o MESMO nome mas IDs diferentes', async () => {
    // Cenário real: "Venda Realizada" intermediária (id 109822756) vs. o
    // status final "Ganho" do kanban, também chamado "Venda Realizada" (id 142).
    await upsertMapping({
      pipelineId: '13166667',
      statusId: '142',
      kommoStageName: 'Venda Realizada',
      metaEvent: 'Purchase',
    });

    // A etapa intermediária de mesmo nome NÃO deve ter sido mapeada.
    expect(await resolveMapping('13166667', '109822756')).toBeNull();
    // Só a etapa final (id 142), que foi explicitamente mapeada, resolve.
    const mapping = await resolveMapping('13166667', '142');
    expect(mapping.metaEvent).toBe('Purchase');
  });

  it('retorna null quando o mapeamento existe mas está inativo', async () => {
    await upsertMapping({
      pipelineId: '13166667',
      statusId: '101573707',
      kommoStageName: 'Descartado',
      metaEvent: 'LeadSubmitted',
      active: false,
    });

    expect(await resolveMapping('13166667', '101573707')).toBeNull();
  });

  it('converte value vazio/undefined para null e mantém currency BRL por padrão', async () => {
    const mapping = await upsertMapping({
      pipelineId: '13166667',
      statusId: '101573691',
      kommoStageName: 'Contato Inicial',
      metaEvent: 'LeadSubmitted',
      value: '',
    });

    expect(mapping.value).toBeNull();
    expect(mapping.currency).toBe('BRL');
  });

  it('converte value string numérica para Number', async () => {
    const mapping = await upsertMapping({
      pipelineId: '13166667',
      statusId: '142',
      kommoStageName: 'Venda Realizada',
      metaEvent: 'Purchase',
      value: '199.90',
      currency: 'BRL',
    });

    expect(mapping.value).toBe(199.9);
  });
});
