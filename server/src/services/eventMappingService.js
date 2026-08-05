import { prisma } from '../db/prisma.js';

// Não há mapa padrão pré-populado: pipeline_id/status_id são específicos de
// cada conta Kommo, então um exemplo genérico nunca casaria com nada. O admin
// configura o mapa pelo painel, escolhendo entre as etapas reais da conta
// (ver GET /api/kommo/statuses).
//
// IMPORTANTE: para action_source="business_messaging", a Meta só aceita um
// vocabulário restrito de nomes de evento — nomes intuitivos como "Lead" ou
// "Schedule" são REJEITADOS (confirmado empiricamente contra a API real).
// Nomes validados: LeadSubmitted, AppointmentBooked, QualifiedLead,
// InitiateCheckout, AddToCart, ViewContent, Purchase.

export function listMappings() {
  return prisma.eventMapping.findMany({ orderBy: { kommoStageName: 'asc' } });
}

/**
 * Retorna o mapeamento ativo para uma etapa do Kommo, identificada por
 * (pipelineId, statusId) — nunca por nome, já que nomes podem se repetir
 * entre etapas diferentes de uma mesma conta (ex.: duas etapas "Venda
 * Realizada": uma intermediária e o status final "Ganho" do kanban).
 */
export async function resolveMapping(pipelineId, statusId) {
  const mapping = await prisma.eventMapping.findUnique({
    where: { pipelineId_statusId: { pipelineId: String(pipelineId), statusId: String(statusId) } },
  });
  if (!mapping || !mapping.active) return null;
  return mapping;
}

export async function upsertMapping({
  id,
  pipelineId,
  statusId,
  kommoStageName,
  metaEvent,
  value,
  currency,
  active,
}) {
  const data = {
    pipelineId: String(pipelineId),
    statusId: String(statusId),
    kommoStageName,
    metaEvent,
    value: value === '' || value === undefined ? null : Number(value),
    currency: currency || 'BRL',
    active: active ?? true,
  };

  if (id) {
    return prisma.eventMapping.update({ where: { id }, data });
  }

  return prisma.eventMapping.upsert({
    where: { pipelineId_statusId: { pipelineId: data.pipelineId, statusId: data.statusId } },
    update: data,
    create: data,
  });
}

export function deleteMapping(id) {
  return prisma.eventMapping.delete({ where: { id } });
}
