import { Router } from 'express';
import * as leadRepository from '../repositories/leadRepository.js';
import { addTimelineEvent, listTimelineForLead } from '../repositories/timelineRepository.js';
import { prisma } from '../db/prisma.js';
import { findContactByPhone } from '../services/kommoService.js';
import { logger } from '../lib/logger.js';

export const leadsRouter = Router();

leadsRouter.get('/', async (req, res, next) => {
  try {
    const { search, stage, status } = req.query;
    const leads = await leadRepository.listLeads({ search, stage, status });
    res.json(leads);
  } catch (error) {
    next(error);
  }
});

leadsRouter.get('/:id', async (req, res, next) => {
  try {
    const lead = await leadRepository.findLeadById(req.params.id);
    if (!lead) return res.sendStatus(404);

    const timeline = await listTimelineForLead(lead.id);
    const parsedTimeline = timeline.map((event) => ({
      ...event,
      payload: event.payload ? JSON.parse(event.payload) : null,
      response: event.response ? JSON.parse(event.response) : null,
    }));

    res.json({ ...lead, timeline: parsedTimeline });
  } catch (error) {
    next(error);
  }
});

/**
 * Backfill único: vincula leads locais já existentes (kommoLeadId nulo) a
 * leads já existentes no Kommo, buscando por telefone. Não cria leads novos
 * no Kommo — só liga o que já existe lá, pra habilitar o rastreamento de
 * mudança de etapa em leads capturados antes desse recurso existir.
 */
leadsRouter.post('/backfill-kommo-links', async (req, res, next) => {
  try {
    const leads = await leadRepository.listLeads({});
    const unlinked = leads.filter((lead) => !lead.kommoLeadId);

    const results = { total: unlinked.length, linked: 0, notFound: 0, failed: 0 };

    for (const lead of unlinked) {
      try {
        const contact = await findContactByPhone(lead.phone);
        const kommoLeadId = contact?._embedded?.leads?.[0]?.id ?? null;
        const kommoContactId = contact?.id ?? null;

        if (!kommoLeadId) {
          results.notFound += 1;
          continue;
        }

        await leadRepository.updateLead(lead.id, {
          kommoLeadId: String(kommoLeadId),
          kommoContactId: kommoContactId ? String(kommoContactId) : null,
        });

        await addTimelineEvent({
          leadId: lead.id,
          type: 'info',
          status: 'success',
          title: 'Lead vinculado retroativamente ao Kommo (backfill)',
          description: `kommo_lead_id=${kommoLeadId}`,
        });

        results.linked += 1;
      } catch (error) {
        logger.error('Falha ao vincular lead ao Kommo (backfill)', {
          leadId: lead.id,
          error: error.message,
        });
        results.failed += 1;
      }
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

leadsRouter.get('/meta/stages', async (req, res, next) => {
  try {
    const stages = await prisma.lead.findMany({
      where: { currentStage: { not: null } },
      select: { currentStage: true },
      distinct: ['currentStage'],
    });
    res.json(stages.map((s) => s.currentStage));
  } catch (error) {
    next(error);
  }
});
