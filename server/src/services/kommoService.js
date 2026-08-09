import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import * as leadRepository from '../repositories/leadRepository.js';
import { addTimelineEvent } from '../repositories/timelineRepository.js';

function baseUrl() {
  return `https://${env.kommo.subdomain}.kommo.com/api/v4`;
}

async function kommoFetch(path, options = {}) {
  if (!env.kommo.subdomain || !env.kommo.accessToken) {
    throw new Error('Kommo não configurado (KOMMO_SUBDOMAIN / KOMMO_ACCESS_TOKEN ausentes)');
  }

  const response = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.kommo.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = body?.detail || body?.title || `Kommo respondeu ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

/** Busca um contato no Kommo pelo telefone. Retorna null se não encontrado. */
export async function findContactByPhone(phone) {
  const data = await kommoFetch(
    `/contacts?query=${encodeURIComponent(phone)}&with=leads`,
  );
  return data?._embedded?.contacts?.[0] ?? null;
}

/** Cria um contato + lead no Kommo já com o telefone preenchido. */
export async function createContactWithLead(phone) {
  const payload = [
    {
      name: phone,
      _embedded: {
        contacts: [{ custom_fields_values: null }],
      },
    },
  ];

  const leadsPayload = [
    {
      name: `Lead WhatsApp ${phone}`,
      ...(env.kommo.pipelineId ? { pipeline_id: Number(env.kommo.pipelineId) } : {}),
      _embedded: {
        contacts: [
          {
            name: phone,
            custom_fields_values: [
              {
                field_code: 'PHONE',
                values: [{ value: phone, enum_code: 'WORK' }],
              },
            ],
          },
        ],
      },
    },
  ];

  const data = await kommoFetch('/leads/complex', {
    method: 'POST',
    body: JSON.stringify(leadsPayload),
  });

  const created = data?.[0];
  return {
    leadId: created?.id ?? null,
    contactId: created?.contact_id ?? null,
  };
}

/** Grava o ctwa_clid no campo customizado configurado do lead no Kommo. */
export async function updateLeadCtwaField(kommoLeadId, ctwaClid) {
  if (!env.kommo.ctwaFieldId) {
    throw new Error('KOMMO_CTWA_FIELD_ID não configurado');
  }

  return kommoFetch(`/leads/${kommoLeadId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      custom_fields_values: [
        {
          field_id: Number(env.kommo.ctwaFieldId),
          values: [{ value: ctwaClid }],
        },
      ],
    }),
  });
}

const pipelineStatusCache = new Map();

/** Resolve o nome de uma etapa (status) a partir de pipeline_id/status_id, com cache em memória. */
export async function getStatusName(pipelineId, statusId) {
  const cacheKey = `${pipelineId}`;

  if (!pipelineStatusCache.has(cacheKey)) {
    const data = await kommoFetch(`/leads/pipelines/${pipelineId}`);
    const statuses = data?._embedded?.statuses ?? [];
    const map = new Map(statuses.map((status) => [String(status.id), status.name]));
    pipelineStatusCache.set(cacheKey, map);
  }

  return pipelineStatusCache.get(cacheKey).get(String(statusId)) ?? `status_${statusId}`;
}

/**
 * Lista todos os pipelines e suas etapas (id + nome), usado para alimentar o
 * seletor de etapas do editor de mapeamento no painel — evita que o admin
 * precise digitar IDs do Kommo manualmente, e deixa explícito quando duas
 * etapas compartilham o mesmo nome (ex.: "Venda Realizada" intermediária vs.
 * o status final "Ganho" do kanban).
 */
export async function listPipelinesWithStatuses() {
  const data = await kommoFetch('/leads/pipelines');
  const pipelines = data?._embedded?.pipelines ?? [];

  return pipelines.map((pipeline) => ({
    pipelineId: String(pipeline.id),
    pipelineName: pipeline.name,
    statuses: (pipeline._embedded?.statuses ?? []).map((status) => ({
      statusId: String(status.id),
      name: status.name,
    })),
  }));
}

/**
 * Encontra ou cria o lead correspondente no Kommo para um lead capturado via
 * CTWA, grava o ctwa_clid no campo customizado e associa os IDs do Kommo ao
 * lead local. Registra cada passo na timeline.
 */
export async function syncLeadToKommo(lead) {
  try {
    const contact = await findContactByPhone(lead.phone);
    let kommoLeadId = contact?._embedded?.leads?.[0]?.id ?? null;
    let kommoContactId = contact?.id ?? null;

    if (!kommoLeadId) {
      const created = await createContactWithLead(lead.phone);
      kommoLeadId = created.leadId;
      kommoContactId = created.contactId;
    }

    if (kommoLeadId && lead.ctwaClid) {
      await updateLeadCtwaField(kommoLeadId, lead.ctwaClid);
    }

    await leadRepository.updateLead(lead.id, { kommoLeadId: String(kommoLeadId), kommoContactId: kommoContactId ? String(kommoContactId) : null });

    await addTimelineEvent({
      leadId: lead.id,
      type: 'info',
      status: 'success',
      title: 'Lead sincronizado com o Kommo',
      description: `kommo_lead_id=${kommoLeadId}`,
    });

    return { kommoLeadId, kommoContactId };
  } catch (error) {
    logger.error('Erro ao sincronizar lead com o Kommo', { leadId: lead.id, error: error.message });
    await addTimelineEvent({
      leadId: lead.id,
      type: 'info',
      status: 'failure',
      title: 'Falha ao sincronizar lead com o Kommo',
      description: error.message,
    });
    throw error;
  }
}
