import { Router } from 'express';
import { logger } from '../lib/logger.js';
import { handleKommoStatusChange } from '../services/stageChangeService.js';

export const kommoWebhookRouter = Router();

// Kommo envia webhooks como application/x-www-form-urlencoded, com notação de
// colchetes (leads[status][0][id]=...). O express.urlencoded({extended:true})
// (via qs) já decodifica isso para req.body.leads.status = [{...}].
kommoWebhookRouter.post('/', async (req, res) => {
  res.sendStatus(200);

  const statusChanges = req.body?.leads?.status ?? [];
  if (statusChanges.length === 0) return;

  for (const change of statusChanges) {
    try {
      await handleKommoStatusChange({
        kommoLeadId: String(change.id),
        pipelineId: String(change.pipeline_id),
        statusId: String(change.status_id),
        oldStatusId: change.old_status_id ? String(change.old_status_id) : null,
      });
    } catch (error) {
      logger.error('Erro ao processar mudança de etapa do Kommo', error);
    }
  }
});
