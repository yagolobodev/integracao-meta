import { Router } from 'express';
import * as leadRepository from '../repositories/leadRepository.js';
import { listTimelineForLead } from '../repositories/timelineRepository.js';
import { prisma } from '../db/prisma.js';

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
