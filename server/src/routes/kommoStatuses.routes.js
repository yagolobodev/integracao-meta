import { Router } from 'express';
import { listPipelinesWithStatuses } from '../services/kommoService.js';

export const kommoStatusesRouter = Router();

// Alimenta o seletor de etapas do editor de mapeamento no painel com os
// pipelines/etapas reais da conta Kommo (id + nome), evitando que o admin
// precise digitar IDs manualmente.
kommoStatusesRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listPipelinesWithStatuses());
  } catch (error) {
    next(error);
  }
});
