import { Router } from 'express';
import { env } from '../config/env.js';
import { buildEventPayload, sendToCapi } from '../services/metaCapiService.js';
import * as leadRepository from '../repositories/leadRepository.js';
import { addTimelineEvent } from '../repositories/timelineRepository.js';
import { logger } from '../lib/logger.js';

export const testEventsRouter = Router();

// Dispara um evento para o Test Events da Meta (test_event_code), sem sujar
// dados reais. Se `leadId` for informado e o lead tiver ctwa_clid, usa os
// dados reais do lead; caso contrário usa um ctwa_clid sintético.
testEventsRouter.post('/send', async (req, res, next) => {
  try {
    const { leadId, eventName = 'LeadSubmitted' } = req.body ?? {};

    if (!env.meta.testEventCode) {
      return res.status(400).json({
        error: 'META_TEST_EVENT_CODE não configurado no .env — obtenha em Events Manager > Testar eventos.',
      });
    }

    let lead = leadId ? await leadRepository.findLeadById(leadId) : null;
    if (!lead) {
      lead = { id: 'test', ctwaClid: `TEST_CLID_${Date.now()}`, dedupToken: null };
    }

    const payload = buildEventPayload(
      lead,
      { metaEvent: eventName, value: null, currency: 'BRL' },
      { testEventCode: env.meta.testEventCode, eventTime: Math.floor(Date.now() / 1000) },
    );

    const response = await sendToCapi(payload);

    if (leadId) {
      await addTimelineEvent({
        leadId,
        type: 'capi_event',
        status: 'success',
        title: `Evento de teste "${eventName}" enviado (Test Events)`,
        payload,
        response,
      });
    }

    res.json({ payload, response });
  } catch (error) {
    logger.error('Falha ao enviar evento de teste à Meta CAPI', error);

    if (req.body?.leadId) {
      await addTimelineEvent({
        leadId: req.body.leadId,
        type: 'capi_event',
        status: 'failure',
        title: 'Falha ao enviar evento de teste',
        description: error.message,
      }).catch(() => {});
    }

    res.status(502).json({ error: error.message });
  }
});
