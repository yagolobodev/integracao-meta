import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { metaWebhookRouter } from './routes/metaWebhook.routes.js';
import { kommoWebhookRouter } from './routes/kommoWebhook.routes.js';
import { leadsRouter } from './routes/leads.routes.js';
import { eventsRouter } from './routes/events.routes.js';
import { metricsRouter } from './routes/metrics.routes.js';
import { eventMapRouter } from './routes/eventMap.routes.js';
import { testEventsRouter } from './routes/testEvents.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { streamRouter } from './routes/stream.routes.js';
import { kommoStatusesRouter } from './routes/kommoStatuses.routes.js';
import { startQueueProcessor } from './services/queueService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());

// Captura o corpo bruto (rawBody) em toda requisição JSON — necessário para
// validar a assinatura X-Hub-Signature-256 do webhook da Meta.
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
// Kommo envia webhooks como x-www-form-urlencoded com notação de colchetes.
app.use(express.urlencoded({ extended: true }));

app.use('/webhooks/meta', metaWebhookRouter);
app.use('/webhooks/kommo', kommoWebhookRouter);

app.use('/api/leads', leadsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/event-mappings', eventMapRouter);
app.use('/api/test-events', testEventsRouter);
app.use('/api/health', healthRouter);
app.use('/api/stream', streamRouter);
app.use('/api/kommo/statuses', kommoStatusesRouter);

// Serve o build do painel React (client/dist) — mesma origem, sem CORS em produção.
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get(/^(?!\/api|\/webhooks).*/, (req, res, next) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

// Error handler central — nunca engole exceções silenciosamente.
app.use((err, req, res, next) => {
  logger.error('Erro não tratado numa requisição', err);
  res.status(500).json({ error: 'Erro interno' });
});

async function main() {
  await startQueueProcessor();

  app.listen(env.port, () => {
    logger.info(`Servidor iniciado na porta ${env.port}`);
  });
}

main().catch((error) => {
  logger.error('Falha fatal ao iniciar o servidor', error);
  process.exit(1);
});
