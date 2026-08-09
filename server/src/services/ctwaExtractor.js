/**
 * Extrai os dados de atribuição CTWA (Click-to-WhatsApp) da primeira mensagem
 * de um payload de webhook do WhatsApp Cloud API.
 *
 * Formato real (WhatsApp Cloud API — mensagens originadas de anúncio trazem um
 * objeto `referral` irmão de `context`, não aninhado dentro dele):
 * entry[0].changes[0].value.messages[0].referral.ctwa_clid  -> ctwa_clid
 * entry[0].changes[0].value.messages[0].referral.source_id  -> ad_source_id (criativo)
 * entry[0].changes[0].value.contacts[0].wa_id                -> telefone
 *
 * Se `referral` estiver ausente, o contato é considerado orgânico.
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
 *   text: string|null,
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

  const referral = message.referral ?? null;
  const isOrganic = !referral;

  const ctwaClid = referral?.ctwa_clid ?? null;
  const adSourceId = referral?.source_id ?? null;

  return {
    phone,
    ctwaClid,
    adSourceId,
    dedupToken: null,
    isOrganic,
    messageId: message.id ?? null,
    timestamp: message.timestamp ?? null,
    text: message.text?.body ?? null,
    // TEMP DEBUG (remover após confirmar o campo real do click id): referral
    // bruto completo, pra descobrir onde a Meta está mandando o ctwa_clid
    // já que source_id veio certo mas ctwa_clid não apareceu no objeto.
    debugReferral: referral,
  };
}
