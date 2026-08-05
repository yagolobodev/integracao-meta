import { env } from '../config/env.js';

/** Normaliza a resposta da Graph API para o formato usado pelo Lead. */
export function parseAdDetails(raw) {
  return {
    campaignId: raw?.campaign?.id ?? null,
    campaignName: raw?.campaign?.name ?? null,
    adsetId: raw?.adset?.id ?? null,
    adsetName: raw?.adset?.name ?? null,
    creativeId: raw?.creative?.id ?? null,
    creativeName: raw?.creative?.name ?? null,
  };
}

/**
 * Busca campanha/conjunto de anúncios/criativo a partir do ID do anúncio
 * (ad_source_id, capturado no webhook). Requer que a conta de anúncio do
 * anúncio esteja atribuída ao system user do META_CAPI_TOKEN em Business
 * Settings — sem isso, a Graph API retorna 403/permissão insuficiente.
 */
export async function fetchAdDetails(adId) {
  const url = `https://graph.facebook.com/${env.meta.graphApiVersion}/${adId}?fields=campaign{id,name},adset{id,name},creative{id,name}&access_token=${env.meta.capiToken}`;

  const response = await fetch(url);
  const body = await response.json();

  if (!response.ok) {
    const message = body?.error?.message || `Graph API respondeu ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return parseAdDetails(body);
}
