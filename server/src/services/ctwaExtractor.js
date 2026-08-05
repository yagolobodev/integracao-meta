/**
 * Extrai os dados de atribuição CTWA (Click-to-WhatsApp) da primeira mensagem
 * de um payload de webhook do WhatsApp Cloud API.
 *
 * Formato esperado (WhatsApp Cloud API):
 * entry[0].changes[0].value.messages[0].context.ad.ctwa      -> ctwa_clid
 * entry[0].changes[0].value.messages[0].context.ad.source.id -> ad_source_id (criativo)
 * entry[0].changes[0].value.messages[0].context.conversion.data -> dedup_token
 * entry[0].changes[0].value.contacts[0].wa_id                -> telefone
 *
 * Se `context.ad` estiver ausente, o contato é considerado orgânico.
 *
 * @param {object} webhookBody - corpo JSON já parseado do webhook.
 * @returns {null | {
 *   phone: string,
 *   ctwaClid: string|null,
 *   adSourceId: string|null,
 *   dedupToken: string|null,
 *   isOrganic: boolean,
 *   messageId: string|null,
 *   timestamp: string|null,
 * }}
 *   Retorna null se o payload não contiver uma mensagem de entrada (ex.: webhook
 *   de status de mensagem, sem `messages`).
 */
export function extractCtwaData(webhookBody) {
  const value = webhookBody?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];

  if (!value || !message) return null;

  const phone = value.contacts?.[0]?.wa_id ?? message.from ?? null;
  if (!phone) return null;

  const ad = message.context?.ad ?? null;
  const isOrganic = !ad;

  const rawCtwa = ad?.ctwa;
  const ctwaClid =
    typeof rawCtwa === 'string' ? rawCtwa : (rawCtwa?.clid ?? null);

  const adSourceId = ad?.source?.id ?? null;

  const conversionData = message.context?.conversion?.data ?? null;
  const dedupToken =
    typeof conversionData === 'string'
      ? conversionData
      : conversionData
        ? JSON.stringify(conversionData)
        : null;

  return {
    phone,
    ctwaClid,
    adSourceId,
    dedupToken,
    isOrganic,
    messageId: message.id ?? null,
    timestamp: message.timestamp ?? null,
  };
}
