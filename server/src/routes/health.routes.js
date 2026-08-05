import { Router } from 'express';
import { env, getConfigStatus } from '../config/env.js';
import { listRecentTimelineEvents } from '../repositories/timelineRepository.js';

export const healthRouter = Router();

async function checkKommo() {
  if (!env.kommo.subdomain || !env.kommo.accessToken) {
    return { configured: false, ok: false, message: 'KOMMO_SUBDOMAIN / KOMMO_ACCESS_TOKEN ausentes' };
  }

  try {
    const response = await fetch(`https://${env.kommo.subdomain}.kommo.com/api/v4/account`, {
      headers: { Authorization: `Bearer ${env.kommo.accessToken}` },
    });
    if (!response.ok) {
      return { configured: true, ok: false, message: `Kommo respondeu ${response.status}` };
    }
    return { configured: true, ok: true, message: 'Conectado' };
  } catch (error) {
    return { configured: true, ok: false, message: error.message };
  }
}

function checkMetaConfig() {
  const configured = Boolean(env.meta.datasetId && env.meta.capiToken && env.meta.pageId);
  return {
    configured,
    ok: configured,
    message: configured
      ? 'Credenciais presentes (use "Enviar evento de teste" para validar o envio real)'
      : 'META_DATASET_ID / META_CAPI_TOKEN / META_PAGE_ID ausentes',
  };
}

healthRouter.get('/', async (req, res, next) => {
  try {
    const [kommo, recentFailures] = await Promise.all([
      checkKommo(),
      listRecentTimelineEvents({ status: 'failure', limit: 10 }),
    ]);

    res.json({
      configStatus: getConfigStatus(),
      integrations: {
        kommo,
        meta: checkMetaConfig(),
      },
      recentFailures: recentFailures.map((event) => ({
        id: event.id,
        leadId: event.leadId,
        leadPhone: event.lead?.phone,
        title: event.title,
        description: event.description,
        createdAt: event.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});
