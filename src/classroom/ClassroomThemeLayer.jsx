// Injects a scoped CSS theme + background layers for the teacher's custom design.
// Wrap ClassroomApp content with this inside AppProvider.

import { useMemo } from 'react';
import { useApp } from './ClassroomContext.jsx';

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = (hex || '#F5C025').replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Shift each channel toward white by `amount` (0-255).
function lighten(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const c = (n) => Math.min(255, n + amount).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

// ── Pattern data-URIs ─────────────────────────────────────────────────────────

export const PATTERNS = {
  none: null,
  dots:
    "url(\"data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='white'/%3E%3C/svg%3E\")",
  grid:
    "url(\"data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h32v.5H0z' fill='white'/%3E%3Cpath d='M0 0v32h.5V0z' fill='white'/%3E%3C/svg%3E\")",
  diagonal:
    "url(\"data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='16' x2='16' y2='0' stroke='white' stroke-width='.5'/%3E%3C/svg%3E\")",
  hexagon:
    "url(\"data:image/svg+xml,%3Csvg width='24' height='42' viewBox='0 0 24 42' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 1l11 6.5v13L12 27 1 20.5V7.5z' fill='none' stroke='white' stroke-width='.5'/%3E%3C/svg%3E\")",
  circuit:
    "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0v10M20 30v10M0 20h10M30 20h10' stroke='white' stroke-width='.5'/%3E%3Ccircle cx='20' cy='20' r='3' fill='none' stroke='white' stroke-width='.5'/%3E%3C/svg%3E\")",
  waves:
    "url(\"data:image/svg+xml,%3Csvg width='80' height='20' viewBox='0 0 80 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10c10-8 20-8 40 0s30 8 40 0' fill='none' stroke='white' stroke-width='.5'/%3E%3C/svg%3E\")",
};

// ── CSS injection ─────────────────────────────────────────────────────────────

function buildThemeCSS(d) {
  const [r, g, b] = hexToRgb(d.accentColor);
  hexToRgb(d.accentAlt); // pre-warms cache; individual channels unused for now
  const a = d.accentColor;
  const aa = d.accentAlt;
  // Ink shades derived from bgColor
  const bg  = d.bgColor;
  const bg9 = lighten(bg, 4);
  const bg85 = lighten(bg, 8);
  const bg8  = lighten(bg, 14);
  const bg75 = lighten(bg, 22);
  const bg7  = lighten(bg, 30);
  const bg6  = lighten(bg, 44);
  const [br, bg2, bb2] = hexToRgb(bg);

  return `
/* ── Classroom Theme (scoped to .ct) ── */

/* Text */
.ct .text-gold-200,.ct .text-gold-300,.ct .text-gold-400,.ct .text-gold-500{color:${a}}
.ct .text-glow-gold{text-shadow:0 0 24px rgba(${r},${g},${b},.6)}

/* Solid backgrounds */
.ct .bg-gold-300,.ct .bg-gold-400,.ct .bg-gold-500,.ct .bg-gold-600{background-color:${a}}
.ct .hover\\:bg-gold-400:hover,.ct .hover\\:bg-gold-500:hover{background-color:${a};filter:brightness(1.1)}

/* Transparent backgrounds */
.ct .bg-gold-300\\/10,.ct .bg-gold-400\\/10,.ct .bg-gold-500\\/10{background-color:rgba(${r},${g},${b},.10)}
.ct .bg-gold-500\\/15{background-color:rgba(${r},${g},${b},.15)}
.ct .bg-gold-500\\/20{background-color:rgba(${r},${g},${b},.20)}
.ct .bg-gold-500\\/30{background-color:rgba(${r},${g},${b},.30)}

/* Borders */
.ct .border-gold-500,.ct .border-gold-400{border-color:${a}}
.ct .border-gold-300\\/40,.ct .border-gold-400\\/40,.ct .border-gold-500\\/30,.ct .border-gold-500\\/40{border-color:rgba(${r},${g},${b},.40)}

/* Rings */
.ct .ring-gold-500,.ct .ring-gold-400{--tw-ring-color:${a}}
.ct .ring-gold-300\\/40,.ct .ring-gold-400\\/40,.ct .ring-gold-500\\/30,.ct .ring-gold-500\\/40,.ct .ring-gold-500\\/60{--tw-ring-color:rgba(${r},${g},${b},.40)}

/* Gradient stops */
.ct .from-gold-200,.ct .from-gold-300,.ct .from-gold-400,.ct .from-gold-500{--tw-gradient-from:${a} var(--tw-gradient-from-position);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)}
.ct .to-gold-200,.ct .to-gold-300,.ct .to-gold-400{--tw-gradient-to:${aa} var(--tw-gradient-to-position)}

/* Shadows */
.ct .shadow-gold{box-shadow:0 0 24px -4px rgba(${r},${g},${b},.45)}
.ct .shadow-gold-sm{box-shadow:0 0 12px -2px rgba(${r},${g},${b},.35)}

/* Ink backgrounds — derived from teacher's bgColor */
.ct .bg-ink-950{background-color:${bg}}
.ct .bg-ink-900{background-color:${bg9}}
.ct .bg-ink-850{background-color:${bg85}}
.ct .bg-ink-800{background-color:${bg8}}
.ct .bg-ink-750{background-color:${bg75}}
.ct .bg-ink-700{background-color:${bg7}}
.ct .bg-ink-600{background-color:${bg6}}

/* Ink opacity variants */
.ct .bg-ink-950\\/50{background-color:rgba(${br},${bg2},${bb2},.50)}
.ct .bg-ink-950\\/60{background-color:rgba(${br},${bg2},${bb2},.60)}
.ct .bg-ink-950\\/80{background-color:rgba(${br},${bg2},${bb2},.80)}
.ct .bg-ink-950\\/95{background-color:rgba(${br},${bg2},${bb2},.95)}
.ct .bg-ink-850\\/80{background-color:rgba(${br},${bg2},${bb2},.80)}

/* Hover ink */
.ct .hover\\:bg-ink-600:hover{background-color:${bg6}}
.ct .hover\\:bg-ink-700:hover{background-color:${bg7}}
.ct .hover\\:bg-white\\/5:hover{background-color:rgba(255,255,255,.05)}
`.trim();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClassroomThemeLayer({ children }) {
  const { classroomDesign } = useApp();
  const d = classroomDesign;

  const bgStyle = useMemo(() => {
    if (d.bgType === 'gradient')
      return { background: `linear-gradient(135deg, ${d.bgGradientFrom}, ${d.bgGradientTo})` };
    return { backgroundColor: d.bgColor };
  }, [d]);

  const css = useMemo(() => buildThemeCSS(d), [d]);
  const patternEl = PATTERNS[d.pattern];

  return (
    <div className="ct relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Custom background (behind everything) */}
      <div className="pointer-events-none absolute inset-0 z-0" style={bgStyle} />

      {/* Background image */}
      {d.bgType === 'image' && d.bgImageUrl && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${d.bgImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: d.bgImageOpacity,
          }}
        />
      )}

      {/* Pattern overlay */}
      {patternEl && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: patternEl,
            backgroundRepeat: 'repeat',
            opacity: d.patternOpacity,
          }}
        />
      )}

      {/* Inject theme overrides (scoped to .ct) */}
      <style>{css}</style>

      {/* Content sits above background layers */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
