
export default function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {Icon && (
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-750 ring-1 ring-white/10">
          <Icon className="h-6 w-6 text-zinc-500" />
        </div>
      )}
      <p className="font-display text-sm font-semibold uppercase tracking-wide text-zinc-300">
        {title}
      </p>
      {subtitle && <p className="max-w-xs text-xs text-zinc-500">{subtitle}</p>}
    </div>
  );
}
