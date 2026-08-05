import { EventEmitter } from 'node:events';

// Barramento de eventos interno usado para alimentar o stream em tempo real (SSE)
// do painel sempre que uma nova entrada de timeline é criada.
export const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);

export const TIMELINE_EVENT_CREATED = 'timeline_event_created';
