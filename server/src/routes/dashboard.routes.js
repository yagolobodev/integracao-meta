import { Router } from 'express';
import * as dashboardService from '../services/dashboardService.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', async (req, res, next) => {
  try {
    res.json(await dashboardService.getSummary(req.query));
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get('/leads-timeseries', async (req, res, next) => {
  try {
    res.json(await dashboardService.getLeadsTimeseries(req.query));
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get('/funnel', async (req, res, next) => {
  try {
    res.json(await dashboardService.getFunnel(req.query));
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get('/campaigns', async (req, res, next) => {
  try {
    res.json(await dashboardService.getCampaignRanking(req.query));
  } catch (error) {
    next(error);
  }
});
