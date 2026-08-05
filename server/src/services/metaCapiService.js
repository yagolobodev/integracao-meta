import { env } from '../config/env.js';

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Gera um event_id determinístico a partir do lead + etapa, incluindo o
 * dedup_token do lead quando disponível — garante que reenvios/retries do
 * mesmo evento sejam deduplicados pela Meta.
 */
export function buildEventId(lead, mapping) {
  const base = `${lead.id}_${slugify(mapping.metaEvent)}`;
  return lead.dedupToken ? `${base}_${lead.dedupToken}` : base;
}

/**
 * Monta o payload EXATO exigido pela Meta Conversions API para eventos de
 * atribuição de anúncios Click-to-WhatsApp (CTWA). action_source e
 * messaging_channel são obrigatórios e não podem ser omitidos.
 *
 * @param {{id:string, ctwaClid:string, dedupToken?:string}} lead
 * @param {{metaEvent:string, value?:number|null, currency?:string|null}} mapping
 * @param {{testEventCode?:string, eventTime?:number}} [options]
 */
export function buildEventPayload(lead, mapping, options = {}) {
  const eventTime = options.eventTime ?? Math.floor(Date.now() / 1000);

  const event = {
    event_name: mapping.metaEvent,
    event_time: eventTime,
    action_source: 'business_messaging',
    messaging_channel: 'whatsapp',
    event_id: buildEventId(lead, mapping),
    user_data: {
      page_id: env.meta.pageId,
      ctwa_clid: lead.ctwaClid,
    },
  };

  if (mapping.value !== null && mapping.value !== undefined) {
    event.custom_data = {
      currency: mapping.currency || 'BRL',
      value: mapping.value,
    };
  }

  const body = {
    data: [event],
    partner_agent: 'kommo-ctwa-middleware',
  };

  // IMPORTANTE: test_event_code só é incluído quando explicitamente passado
  // via options (fluxo de diagnóstico/"Enviar evento de teste"). Nunca cai
  // de volta para a env var aqui — senão, configurar META_TEST_EVENT_CODE
  // para testes manuais desviaria silenciosamente TODOS os eventos reais de
  // produção (disparados por mudança de etapa) para o Test Events, e eles
  // parariam de contar como conversão real na campanha.
  if (options.testEventCode) {
    body.test_event_code = options.testEventCode;
  }

  return body;
}

function endpointUrl() {
  return `https://graph.facebook.com/${env.meta.graphApiVersion}/${env.meta.datasetId}/events`;
}

/**
 * Envia o payload já montado para a Conversions API. Não faz retry aqui —
 * isso é responsabilidade da fila (queueService).
 */
export async function sendToCapi(payload) {
  if (!env.meta.datasetId || !env.meta.capiToken) {
    throw new Error('Meta CAPI não configurada (META_DATASET_ID / META_CAPI_TOKEN ausentes)');
  }

  const response = await fetch(endpointUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.meta.capiToken}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const responseBody = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = responseBody?.error?.message || `Meta CAPI respondeu ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = responseBody;
    throw error;
  }

  return responseBody;
}
