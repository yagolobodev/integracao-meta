import { Router } from 'express';
import { env } from '../config/env.js';
import { verifyMetaSignature } from '../lib/signature.js';
import { extractCtwaData } from '../services/ctwaExtractor.js';
import { handleIncomingMessage } from '../services/leadService.js';
import { logger } from '../lib/logger.js';

export const metaWebhookRouter = Router();

// Verificação do webhook exigida pela Meta ao registrar a URL de callback.
metaWebhookRouter.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.meta.verifyToken) {
    logger.info('Webhook da Meta verificado com sucesso');
    return res.status(200).send(challenge);
  }

  logger.warn('Falha na verificação do webhook da Meta (token inválido)');
  return res.sendStatus(403);
});

// Evento de entrada: mensagens do WhatsApp Cloud API.
metaWebhookRouter.post('/', async (req, res) => {
  const signature = req.header('X-Hub-Signature-256');
  const isValid = verifyMetaSignature(req.rawBody, signature, env.meta.appSecret);

  if (!isValid) {
    logger.warn('Assinatura X-Hub-Signature-256 inválida no webhook da Meta');
    return res.sendStatus(401);
  }

  // Responde 200 imediatamente para a Meta não reenviar; processa em seguida.
  res.sendStatus(200);

  try {
    const extracted = extractCtwaData(req.body);
    if (!extracted) {
      // Provavelmente um webhook de status (entregue/lido), sem mensagem de entrada.
      return;
    }

    await handleIncomingMessage(extracted);
  } catch (error) {
    logger.error('Erro ao processar webhook da Meta', error);
  }
});
