import { Router } from 'express';
import * as leadRepository from '../repositories/leadRepository.js';
import { countTimelineEventsSince } from '../repositories/timelineRepository.js';

export const metricsRouter = Router();

metricsRouter.get('/', async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalLeads, leadsWithCtwaClid, eventsToday, successToday, failureToday] =
      await Promise.all([
        leadRepository.countLeads(),
        leadRepository.countLeadsWithCtwaClid(),
        countTimelineEventsSince(todayStart, { type: 'capi_event' }),
        countTimelineEventsSince(todayStart, { type: 'capi_event', status: 'success' }),
        countTimelineEventsSince(todayStart, { type: 'capi_event', status: 'failure' }),
      ]);

    const attemptsToday = successToday + failureToday;

    res.json({
      totalLeads,
      leadsWithCtwaClid,
      ctwaCaptureRate: totalLeads ? (leadsWithCtwaClid / totalLeads) * 100 : 0,
      eventsSentToday: eventsToday,
      capiSuccessRateToday: attemptsToday ? (successToday / attemptsToday) * 100 : null,
    });
  } catch (error) {
    next(error);
  }
});
