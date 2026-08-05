import { prisma } from '../db/prisma.js';
import { sendToCapi } from './metaCapiService.js';
import { addTimelineEvent } from '../repositories/timelineRepository.js';
import { logger } from '../lib/logger.js';

// Fila simples em memória com persistência no banco (EventQueueJob), pronta
// para ser trocada por BullMQ/Redis no futuro: basta substituir `enqueue` e
// o loop de `processQueue` por um Worker/Queue do BullMQ mantendo a mesma
// interface pública (enqueueCapiEvent / startQueueProcessor).

const BASE_DELAY_MS = 30_000; // 30s
const MAX_DELAY_MS = 30 * 60_000; // 30min
const POLL_INTERVAL_MS = 5_000;

let processing = false;
let pollTimer = null;

function backoffDelay(attempts) {
  return Math.min(BASE_DELAY_MS * 2 ** attempts, MAX_DELAY_MS);
}

/** Cria um job de envio à CAPI e o persiste no banco para processamento imediato. */
export async function enqueueCapiEvent({ leadId, eventName, eventId, payload }) {
  const job = await prisma.eventQueueJob.create({
    data: {
      leadId,
      eventName,
      eventId,
      payload: JSON.stringify(payload),
      status: 'pending',
      nextAttemptAt: new Date(),
    },
  });

  triggerProcessing();
  return job;
}

async function processJob(job) {
  await prisma.eventQueueJob.update({
    where: { id: job.id },
    data: { status: 'processing' },
  });

  const payload = JSON.parse(job.payload);

  try {
    const response = await sendToCapi(payload);

    await prisma.eventQueueJob.update({
      where: { id: job.id },
      data: { status: 'success' },
    });

    await addTimelineEvent({
      leadId: job.leadId,
      type: 'capi_event',
      status: 'success',
      title: `Evento "${job.eventName}" enviado à Meta CAPI`,
      description: job.attempts > 0 ? `Sucesso após ${job.attempts + 1} tentativa(s)` : null,
      payload,
      response,
    });
  } catch (error) {
    const attempts = job.attempts + 1;
    const willRetry = attempts < job.maxAttempts;
    const errorInfo = { message: error.message, status: error.status, body: error.body };

    await prisma.eventQueueJob.update({
      where: { id: job.id },
      data: {
        status: willRetry ? 'pending' : 'failed',
        attempts,
        lastError: error.message,
        nextAttemptAt: willRetry ? new Date(Date.now() + backoffDelay(attempts)) : job.nextAttemptAt,
      },
    });

    await addTimelineEvent({
      leadId: job.leadId,
      type: willRetry ? 'retry' : 'capi_event',
      status: 'failure',
      title: willRetry
        ? `Falha ao enviar "${job.eventName}" — nova tentativa agendada (${attempts}/${job.maxAttempts})`
        : `Falha definitiva ao enviar "${job.eventName}" após ${attempts} tentativas`,
      description: error.message,
      payload,
      response: errorInfo,
    });

    logger.error('Falha ao enviar evento à Meta CAPI', { jobId: job.id, attempts, error: error.message });
  }
}

async function processQueue() {
  if (processing) return;
  processing = true;

  try {
    const dueJobs = await prisma.eventQueueJob.findMany({
      where: { status: 'pending', nextAttemptAt: { lte: new Date() } },
      orderBy: { nextAttemptAt: 'asc' },
      take: 10,
    });

    for (const job of dueJobs) {
      await processJob(job);
    }
  } catch (error) {
    logger.error('Erro no processamento da fila de eventos CAPI', error);
  } finally {
    processing = false;
  }
}

function triggerProcessing() {
  // Dispara uma passada imediata sem esperar o próximo tick do poll.
  processQueue();
}

/** Recupera jobs "processing" órfãos (ex.: servidor reiniciado no meio do envio). */
async function recoverOrphanJobs() {
  await prisma.eventQueueJob.updateMany({
    where: { status: 'processing' },
    data: { status: 'pending', nextAttemptAt: new Date() },
  });
}

export async function startQueueProcessor() {
  await recoverOrphanJobs();
  await processQueue();
  pollTimer = setInterval(processQueue, POLL_INTERVAL_MS);
  logger.info('Processador de fila de eventos CAPI iniciado');
}

export function stopQueueProcessor() {
  if (pollTimer) clearInterval(pollTimer);
}

export function listQueueJobs({ status } = {}) {
  return prisma.eventQueueJob.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}
