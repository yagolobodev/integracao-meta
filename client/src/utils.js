export function maskClid(clid) {
  if (!clid) return '—';
  if (clid.length <= 8) return '••••••••';
  return `${clid.slice(0, 4)}••••${clid.slice(-4)}`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

export const TYPE_LABELS = {
  contact_in: 'Entrada',
  stage_change: 'Mudança de etapa',
  capi_event: 'Evento CAPI',
  retry: 'Retry',
  info: 'Info',
};
