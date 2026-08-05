const STATUS_STYLES = {
  success: { dot: 'bg-emerald-500', ring: 'ring-emerald-500/30', text: 'text-emerald-400' },
  failure: { dot: 'bg-red-500', ring: 'ring-red-500/30', text: 'text-red-400' },
  skipped: { dot: 'bg-slate-500', ring: 'ring-slate-500/30', text: 'text-slate-400' },
  info: { dot: 'bg-sky-500', ring: 'ring-sky-500/30', text: 'text-sky-400' },
};

export function statusStyle(status) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.info;
}

export default function StatusIcon({ status }) {
  const style = statusStyle(status);
  return (
    <span
      className={`flex h-3 w-3 shrink-0 rounded-full ${style.dot} ring-4 ${style.ring}`}
      title={status}
    />
  );
}
