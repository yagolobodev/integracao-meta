import * as leadRepository from '../repositories/leadRepository.js';
import { addTimelineEvent } from '../repositories/timelineRepository.js';
import { syncLeadToKommo } from './kommoService.js';
import { fetchAdDetails } from './metaAdsService.js';
import { logger } from '../lib/logger.js';

/** Busca campanha/conjunto/criativo do anúncio e anota no lead + timeline. */
async function enrichAdDetails(lead, adSourceId) {
  try {
    const details = await fetchAdDetails(adSourceId);
    await leadRepository.updateLead(lead.id, details);
    await addTimelineEvent({
      leadId: lead.id,
      type: 'info',
      status: 'success',
      title: 'Dados do anúncio enriquecidos (campanha/conjunto/criativo)',
      description: [details.campaignName, details.adsetName, details.creativeName]
        .filter(Boolean)
        .join(' › ') || null,
    });
  } catch (error) {
    logger.error('Falha ao buscar dados do anúncio na Graph API', {
      leadId: lead.id,
      adSourceId,
      error: error.message,
    });
    await addTimelineEvent({
      leadId: lead.id,
      type: 'info',
      status: 'failure',
      title: 'Falha ao buscar campanha/conjunto/criativo do anúncio',
      description: error.message,
    });
  }
}

/**
 * Processa uma mensagem de entrada do WhatsApp já extraída (ver ctwaExtractor).
 * Cria o lead se ele ainda não existir, registra a entrada na timeline e,
 * quando houver ctwa_clid, dispara a sincronização assíncrona com o Kommo.
 */
export async function handleIncomingMessage(extracted) {
  const { phone, ctwaClid, adSourceId, dedupToken, isOrganic, text } = extracted;

  let lead = await leadRepository.findLeadByPhone(phone);
  let isNewLead = false;

  if (!lead) {
    isNewLead = true;
    lead = await leadRepository.createLead({
      phone,
      ctwaClid,
      adSourceId,
      dedupToken,
      isOrganic,
    });
  } else if (!lead.ctwaClid && ctwaClid) {
    // Lead já existia (ex.: reengajamento) mas ainda não tinha ctwa_clid capturado.
    lead = await leadRepository.updateLead(lead.id, {
      ctwaClid,
      adSourceId,
      dedupToken,
      isOrganic: false,
    });
  }

  const attributionNote = isOrganic
    ? 'context.ad ausente no payload — não será reportado à CAPI.'
    : `ad_source_id=${adSourceId ?? 'desconhecido'}`;

  await addTimelineEvent({
    leadId: lead.id,
    type: 'contact_in',
    status: isOrganic ? 'skipped' : 'success',
    title: isOrganic
      ? 'Contato orgânico (sem anúncio identificado)'
      : 'Contato via anúncio Click-to-WhatsApp',
    description: text ? `${attributionNote} Mensagem: "${text}"` : attributionNote,
    payload: extracted,
  });

  if (!isOrganic && ctwaClid && (isNewLead || !lead.kommoLeadId)) {
    // Fire-and-forget: falha na sincronização com o Kommo não deve derrubar o webhook.
    syncLeadToKommo(lead).catch((error) => {
      logger.error('Falha ao sincronizar lead com o Kommo', {
        leadId: lead.id,
        error: error.message,
      });
    });
  }

  if (!isOrganic && adSourceId && (isNewLead || !lead.campaignId)) {
    enrichAdDetails(lead, adSourceId).catch(() => {}); // erros já tratados/logados dentro
  }

  return lead;
}
