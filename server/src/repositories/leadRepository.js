import { prisma } from '../db/prisma.js';

export function findLeadByPhone(phone) {
  return prisma.lead.findUnique({ where: { phone } });
}

export function findLeadById(id) {
  return prisma.lead.findUnique({ where: { id } });
}

export function findLeadByKommoLeadId(kommoLeadId) {
  return prisma.lead.findFirst({ where: { kommoLeadId } });
}

export function createLead(data) {
  return prisma.lead.create({ data });
}

export function updateLead(id, data) {
  return prisma.lead.update({ where: { id }, data });
}

export function listLeads({ search, stage, status } = {}) {
  const where = {};

  if (search) {
    where.OR = [
      { phone: { contains: search } },
      { ctwaClid: { contains: search } },
    ];
  }

  if (stage) {
    where.currentStage = stage;
  }

  if (status === 'organic') {
    where.isOrganic = true;
  } else if (status === 'with_ctwa') {
    where.ctwaClid = { not: null };
  }

  return prisma.lead.findMany({
    where,
    orderBy: { firstContactAt: 'desc' },
  });
}

export function countLeads() {
  return prisma.lead.count();
}

export function countLeadsWithCtwaClid() {
  return prisma.lead.count({ where: { ctwaClid: { not: null } } });
}
