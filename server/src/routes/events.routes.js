import { Router } from 'express';
import { prisma } from '../db/prisma.js';

export const eventsRouter = Router();

// Feed global de timeline (todas as leads) usado pelo painel de logs, com
// filtros por status, tipo, período e busca por telefone/ctwa_clid.
eventsRouter.get('/', async (req, res, next) => {
  try {
    const { status, type, from, to, search, limit = 200 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (search) {
      where.lead = {
        OR: [
          { phone: { contains: search } },
          { ctwaClid: { contains: search } },
        ],
      };
    }

    const events = await prisma.timelineEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      include: { lead: { select: { id: true, phone: true, ctwaClid: true, currentStage: true } } },
    });

    res.json(
      events.map((event) => ({
        ...event,
        payload: event.payload ? JSON.parse(event.payload) : null,
        response: event.response ? JSON.parse(event.response) : null,
      })),
    );
  } catch (error) {
    next(error);
  }
});
