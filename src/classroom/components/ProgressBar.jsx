import React from 'react';

// Gamified gold progress bar.
export default function ProgressBar({
  value,
  max,
  gradient = 'from-gold-500 to-gold-300',
  height = 'h-3',
  showShimmer = true,
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-ink-750 ring-1 ring-white/10 ${height}`}>
      <div
        className={`relative h-full rounded-full bg-gradient-to-r ${gradient} shadow-gold-sm transition-all duration-700 ease-out`}
        style={{ width: `${pct}%` }}
      >
        {showShimmer && pct > 0 && (
          <div
            className="absolute inset-0 animate-shimmer rounded-full"
            style={{
              backgroundImage:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
              backgroundSize: '200% 100%',
            }}
          />
        )}
      </div>
    </div>
  );
}
