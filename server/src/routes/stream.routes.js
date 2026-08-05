import { Router } from 'express';
import { eventBus, TIMELINE_EVENT_CREATED } from '../lib/eventBus.js';

export const streamRouter = Router();

// Server-Sent Events: o painel abre uma conexão e recebe cada nova entrada
// de timeline em tempo real, sem precisar de polling nem de WebSocket.
streamRouter.get('/', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('retry: 3000\n\n');

  const onEvent = (event) => {
    res.write(`event: timeline_event\ndata: ${JSON.stringify(event)}\n\n`);
  };

  eventBus.on(TIMELINE_EVENT_CREATED, onEvent);

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    eventBus.off(TIMELINE_EVENT_CREATED, onEvent);
  });
});
