export function maskClid(clid) {
  if (!clid) return '—';
  if (clid.length <= 8) return '••••••••';
  return `${clid.slice(0, 4)}••••${clid.slice(-4)}`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

export function formatRelativeTime(value) {
  if (!value) return '—';
  const diffMs = Date.now() - new Date(value).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return 'agora mesmo';
  if (diffSec < 60) return `há ${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `há ${diffHour}h`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return `há ${diffDay}d`;
  return formatDateTime(value);
}
