
export default function Card({
  children,
  className = '',
  accent = '',
  hover = false,
  hairline = false,
  ...props
}) {
  return (
    <div
      className={[
        'relative rounded-2xl border border-white/10 bg-ink-850/70 backdrop-blur-sm shadow-lg shadow-black/40',
        hairline ? 'brand-hairline' : '',
        accent ? `border-l-4 ${accent}` : '',
        hover
          ? 'transition-all duration-200 hover:border-gold-500/40 hover:shadow-gold-sm hover:-translate-y-0.5'
          : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, action, accentText = 'text-gold-400' }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink-750 ring-1 ring-white/10">
            <Icon className={`h-5 w-5 ${accentText}`} />
          </div>
        )}
        <div>
          <h3 className="font-display text-base font-semibold uppercase tracking-wider text-zinc-50">
            {title}
          </h3>
          {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
