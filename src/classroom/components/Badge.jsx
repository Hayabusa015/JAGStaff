import React from 'react';

// Strict G-MEN palette: gold = active/positive/success, neutral = default/pending,
// red = denied/error ONLY. No other hues.
const TONES = {
  neutral: 'bg-white/5 text-zinc-300 ring-white/15',
  slate: 'bg-white/5 text-zinc-300 ring-white/15', // alias kept for back-compat
  white: 'bg-transparent text-zinc-100 ring-white/30',
  gold: 'bg-gold-500/15 text-gold-300 ring-gold-500/40',
  goldSolid: 'bg-gold-500 text-ink-950 ring-gold-400 font-bold',
  red: 'bg-red-500/15 text-red-300 ring-red-500/40',
  // legacy aliases → fold onto the new palette so old call-sites stay valid
  amber: 'bg-gold-500/15 text-gold-300 ring-gold-500/40',
  emerald: 'bg-gold-500/15 text-gold-300 ring-gold-500/40',
  cyan: 'bg-white/5 text-zinc-300 ring-white/15',
  sky: 'bg-white/5 text-zinc-300 ring-white/15',
  violet: 'bg-white/5 text-zinc-300 ring-white/15',
  rose: 'bg-red-500/15 text-red-300 ring-red-500/40',
};

const STATUS_TONE = {
  submitted: 'neutral',
  in_progress: 'gold',
  completed: 'goldSolid',
  pending: 'neutral',
  approved: 'goldSolid',
  denied: 'red',
};

export default function Badge({ children, tone = 'neutral', className = '', icon: Icon }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${
        TONES[tone] || TONES.neutral
      } ${className}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }) {
  return (
    <Badge tone={STATUS_TONE[status] || 'neutral'}>{label || status.replace('_', ' ')}</Badge>
  );
}
