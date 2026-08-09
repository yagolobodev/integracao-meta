import { Router } from 'express';
import * as leadRepository from '../repositories/leadRepository.js';
import { addTimelineEvent, listTimelineForLead } from '../repositories/timelineRepository.js';
import { prisma } from '../db/prisma.js';
import { findContactByPhone, getLead, getStatusName } from '../services/kommoService.js';
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
 * Backfill único: vincula leads locais a leads já existentes no Kommo
 * (buscando por telefone, sem criar duplicados) e grava a etapa atual real
 * de cada um — necessário porque leads já vinculados antes desse recurso
 * existir nunca vão receber um webhook de "mudança" de etapa retroativo.
 * Idempotente: pode ser chamado de novo sem duplicar vínculos ou timeline.
 */
leadsRouter.post('/backfill-kommo-links', async (req, res, next) => {
  try {
    const leads = await leadRepository.listLeads({});

    const results = { total: leads.length, linked: 0, stageUpdated: 0, notFound: 0, failed: 0 };

    for (const lead of leads) {
      try {
        let { kommoLeadId, kommoContactId } = lead;

        if (!kommoLeadId) {
          const contact = await findContactByPhone(lead.phone);
          kommoLeadId = contact?._embedded?.leads?.[0]?.id ?? null;
          kommoContactId = contact?.id ?? null;

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
        }

        if (lead.currentStage) continue;

        const kommoLead = await getLead(kommoLeadId);
        if (!kommoLead?.pipeline_id || !kommoLead?.status_id) continue;

        const statusName = await getStatusName(kommoLead.pipeline_id, kommoLead.status_id);

        await leadRepository.updateLead(lead.id, {
          currentStage: statusName,
          currentStatusId: String(kommoLead.status_id),
        });

        await addTimelineEvent({
          leadId: lead.id,
          type: 'stage_change',
          status: 'info',
          title: `Etapa atual (backfill): "${statusName}"`,
          description: `pipeline_id=${kommoLead.pipeline_id} status_id=${kommoLead.status_id}`,
        });

        results.stageUpdated += 1;
      } catch (error) {
        logger.error('Falha ao vincular/atualizar etapa do lead no Kommo (backfill)', {
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
