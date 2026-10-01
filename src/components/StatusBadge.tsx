const STYLES: Record<string, string> = {
  queued: 'bg-slate-100 text-slate-600',
  scoring: 'bg-amber-100 text-amber-700',
  tailoring: 'bg-amber-100 text-amber-700',
  rendering: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
  error: 'bg-rose-100 text-rose-700',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        STYLES[status] ?? STYLES.queued
      }`}
    >
      {status}
    </span>
  );
}
