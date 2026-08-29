import { meterStatus, formatMeterValue } from '../engine.js';

const STATUS_STYLES = {
  ok: { bar: 'from-gold-500 to-gold-300', text: 'text-gold-300', ring: 'ring-gold-500/30' },
  warning: { bar: 'from-orange-500 to-amber-400', text: 'text-amber-300', ring: 'ring-amber-500/30' },
  critical: { bar: 'from-red-600 to-red-400', text: 'text-red-300', ring: 'ring-red-500/40' },
};

export default function MeterBar({ meterDef, value }) {
  const status = meterStatus(meterDef, value);
  const style = STATUS_STYLES[status];
  const pct = Math.max(0, Math.min(100, ((value - meterDef.min) / (meterDef.max - meterDef.min || 1)) * 100));

  return (
    <div className={`rounded-xl border border-white/10 bg-ink-850/70 p-3 ring-1 ${style.ring}`}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">{meterDef.label}</span>
        <span className={`font-display text-lg font-bold ${style.text}`}>{formatMeterValue(meterDef, value)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-750 ring-1 ring-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${style.bar} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-zinc-500">{meterDef.description}</p>
    </div>
  );
}
