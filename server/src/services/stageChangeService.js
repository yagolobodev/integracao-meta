import * as leadRepository from '../repositories/leadRepository.js';
import { addTimelineEvent } from '../repositories/timelineRepository.js';
import { getStatusName } from './kommoService.js';
import { resolveMapping } from './eventMappingService.js';
import { buildEventPayload, buildEventId } from './metaCapiService.js';
import { enqueueCapiEvent } from './queueService.js';
import { logger } from '../lib/logger.js';

/**
 * Processa uma mudança de etapa recebida do webhook do Kommo: localiza o lead
 * pelo kommo_lead_id, registra a transição na timeline e, se houver
 * mapeamento etapa->evento e o lead tiver ctwa_clid, enfileira o envio à CAPI.
 */
export async function handleKommoStatusChange({ kommoLeadId, pipelineId, statusId }) {
  const lead = await leadRepository.findLeadByKommoLeadId(kommoLeadId);

  if (!lead) {
    logger.warn('Webhook do Kommo recebido para um lead não rastreado pelo middleware', {
      kommoLeadId,
    });
    return;
  }

  // Comparação por status_id, não por nome — duas etapas podem ter o mesmo
  // nome (ex.: "Venda Realizada" intermediária vs. o status final "Ganho"),
  // e usar o nome faria essa transição real ser ignorada como "duplicada".
  if (lead.currentStatusId === String(statusId)) {
    return; // webhook duplicado / sem mudança real de etapa
  }

  const statusName = await getStatusName(pipelineId, statusId);

  await leadRepository.updateLead(lead.id, {
    currentStage: statusName,
    currentStatusId: String(statusId),
  });

  await addTimelineEvent({
    leadId: lead.id,
    type: 'stage_change',
    status: 'info',
    title: `Etapa alterada para "${statusName}"`,
    description: `pipeline_id=${pipelineId} status_id=${statusId}`,
  });

  const mapping = await resolveMapping(pipelineId, statusId);

  if (!mapping) {
    await addTimelineEvent({
      leadId: lead.id,
      type: 'capi_event',
      status: 'skipped',
      title: `Sem evento CAPI mapeado para "${statusName}"`,
      description: 'Nenhuma entrada ativa no mapa etapa->evento para esta etapa.',
    });
    return;
  }

  if (!lead.ctwaClid) {
    await addTimelineEvent({
      leadId: lead.id,
      type: 'capi_event',
      status: 'skipped',
      title: `Evento "${mapping.metaEvent}" não enviado`,
      description: 'skipped: sem ctwa_clid',
    });
    return;
  }

  const payload = buildEventPayload(lead, mapping);
  const eventId = buildEventId(lead, mapping);

  await enqueueCapiEvent({
    leadId: lead.id,
    eventName: mapping.metaEvent,
    eventId,
    payload,
  });
}
