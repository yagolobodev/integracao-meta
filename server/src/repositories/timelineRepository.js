import { prisma } from '../db/prisma.js';
import { eventBus, TIMELINE_EVENT_CREATED } from '../lib/eventBus.js';

/**
 * Cria uma entrada de timeline para um lead e notifica assinantes em tempo
 * real (SSE). `payload`/`response` são serializados como JSON quando objetos.
 */
export async function addTimelineEvent({
  leadId,
  type,
  status,
  title,
  description,
  payload,
  response,
}) {
  const event = await prisma.timelineEvent.create({
    data: {
      leadId,
      type,
      status,
      title,
      description: description ?? null,
      payload: payload ? JSON.stringify(payload) : null,
      response: response ? JSON.stringify(response) : null,
    },
  });

  eventBus.emit(TIMELINE_EVENT_CREATED, event);
  return event;
}

export function listTimelineForLead(leadId) {
  return prisma.timelineEvent.findMany({
    where: { leadId },
    orderBy: { createdAt: 'asc' },
  });
}

export function listRecentTimelineEvents({ limit = 200, status, type } = {}) {
  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;

  return prisma.timelineEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { lead: { select: { phone: true, ctwaClid: true } } },
  });
}

export function countTimelineEventsSince(date, filters = {}) {
  return prisma.timelineEvent.count({
    where: { createdAt: { gte: date }, ...filters },
  });
}
