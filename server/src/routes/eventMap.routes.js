import { Router } from 'express';
import * as eventMappingService from '../services/eventMappingService.js';

export const eventMapRouter = Router();

eventMapRouter.get('/', async (req, res, next) => {
  try {
    res.json(await eventMappingService.listMappings());
  } catch (error) {
    next(error);
  }
});

eventMapRouter.post('/', async (req, res, next) => {
  try {
    const mapping = await eventMappingService.upsertMapping(req.body);
    res.status(201).json(mapping);
  } catch (error) {
    next(error);
  }
});

eventMapRouter.put('/:id', async (req, res, next) => {
  try {
    const mapping = await eventMappingService.upsertMapping({ ...req.body, id: req.params.id });
    res.json(mapping);
  } catch (error) {
    next(error);
  }
});

eventMapRouter.delete('/:id', async (req, res, next) => {
  try {
    await eventMappingService.deleteMapping(req.params.id);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});
