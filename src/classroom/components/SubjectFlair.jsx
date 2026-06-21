// Decorative subject-themed SVG watermark for class cards/hero sections.
// Parent must be `relative overflow-hidden`. Color and opacity are controlled
// via props so the same component works on both light (gold) and dark backgrounds.

const SVG_STYLE = {
  position: 'absolute',
  right: '-0.5rem',
  top: '50%',
  transform: 'translateY(-50%)',
  height: '130%',
  width: 'auto',
};

// ── Subject SVGs ───────────────────────────────────────────────────────────────
// Each renders the full <svg> so size/position is self-contained.
// Uses stroke="currentColor" — color is inherited from the wrapper div.

function ChemistrySvg() {
  return (
    <svg style={SVG_STYLE} viewBox="0 0 230 80" fill="none" stroke="currentColor"
      strokeLinecap="round" strokeLinejoin="round">
      {/* Naphthalene: two fused hexagons (pointy-top orientation) */}
      <path d="M55,14 L74,25 L93,14 L112,25 L112,55 L93,66 L74,55 L55,66 L36,55 L36,25 Z" strokeWidth="1.5" />
      <line x1="74" y1="25" x2="74" y2="55" strokeWidth="1.4" />
      {/* Aromatic inner circles */}
      <circle cx="55" cy="40" r="13" strokeWidth="1.1" />
      <circle cx="93" cy="40" r="13" strokeWidth="1.1" />
      {/* Extending bond lines */}
      <line x1="55" y1="14" x2="55" y2="3"   strokeWidth="1.1" />
      <line x1="36" y1="25" x2="23" y2="17"  strokeWidth="1.1" />
      <line x1="36" y1="55" x2="23" y2="63"  strokeWidth="1.1" />
      <line x1="93" y1="14" x2="93" y2="3"   strokeWidth="1.1" />
      <line x1="112" y1="25" x2="125" y2="17" strokeWidth="1.1" />
      <line x1="112" y1="55" x2="125" y2="63" strokeWidth="1.1" />
      {/* Atom terminus dots */}
      <circle cx="55" cy="2"  r="2.5" strokeWidth="1" />
      <circle cx="22" cy="16" r="2.5" strokeWidth="1" />
      {/* Erlenmeyer flask */}
      <line x1="168" y1="10" x2="168" y2="36" strokeWidth="1.3" />
      <line x1="178" y1="10" x2="178" y2="36" strokeWidth="1.3" />
      <line x1="165" y1="10" x2="181" y2="10" strokeWidth="1.3" />
      <path d="M168,36 L151,65 Q168,75 185,65 L178,36" strokeWidth="1.3" />
      {/* Liquid level line */}
      <path d="M155,60 Q168,67 181,60" strokeWidth="1" />
    </svg>
  );
}

function PhysicsSvg() {
  return (
    <svg style={SVG_STYLE} viewBox="0 0 230 80" fill="none" stroke="currentColor"
      strokeLinecap="round">
      {/* Bohr atom: nucleus + three orbital ellipses */}
      <circle cx="36" cy="40" r="5" fill="currentColor" fillOpacity="0.28" strokeWidth="1.3" />
      <ellipse cx="36" cy="40" rx="30" ry="11" strokeWidth="1.3" />
      <ellipse cx="36" cy="40" rx="30" ry="11" transform="rotate(60 36 40)"  strokeWidth="1.15" />
      <ellipse cx="36" cy="40" rx="30" ry="11" transform="rotate(-60 36 40)" strokeWidth="1.0"  />
      {/* EM / sine wave */}
      <path d="M83,40 C90,25 98,25 105,40 C112,55 120,55 127,40
               C134,25 142,25 149,40 C156,55 164,55 171,40
               C178,25 186,25 193,40" strokeWidth="1.4" />
      {/* Momentum arrow */}
      <line x1="86" y1="65" x2="130" y2="65" strokeWidth="1.2" />
      <polyline points="126,61 130,65 126,69" strokeWidth="1.2" />
    </svg>
  );
}

function GeologySvg() {
  return (
    <svg style={SVG_STYLE} viewBox="0 0 230 80" fill="none" stroke="currentColor"
      strokeLinecap="round">
      {/* Mountain silhouettes */}
      <polyline points="4,74 40,10 76,74"  strokeWidth="1.6" />
      <polyline points="52,74 82,34 112,74" strokeWidth="1.4" />
      {/* Wavy strata lines (rock layers) */}
      <path d="M118,16 Q140,12 162,16 Q184,20 206,16 Q220,12 232,16" strokeWidth="1.4" />
      <path d="M118,30 Q138,26 160,31 Q184,36 206,30 Q220,26 232,30" strokeWidth="1.3" />
      <path d="M118,45 Q140,41 163,46 Q186,51 207,45 Q220,41 232,45" strokeWidth="1.2" />
      <path d="M118,59 Q140,55 164,60 Q188,65 208,59 Q221,55 232,59" strokeWidth="1.1" />
      <path d="M118,73 Q143,69 167,74 Q190,77 210,73" strokeWidth="1.0" />
    </svg>
  );
}

function CalculusSvg() {
  return (
    <svg style={SVG_STYLE} viewBox="0 0 230 80" fill="none" stroke="currentColor"
      strokeLinecap="round">
      {/* Coordinate axes */}
      <line x1="32" y1="70" x2="32" y2="5"   strokeWidth="1.2" />
      <polyline points="29,9 32,5 35,9"        strokeWidth="1.2" />
      <line x1="5"  y1="56" x2="110" y2="56" strokeWidth="1.2" />
      <polyline points="106,53 110,56 106,59"  strokeWidth="1.2" />
      {/* Parabola (vertex at axis origin) */}
      <path d="M5,24 Q32,73 59,24" strokeWidth="1.4" />
      {/* Integration region markers */}
      <line x1="46" y1="56" x2="46" y2="40" strokeWidth="1" strokeDasharray="2.5,2" />
      <line x1="59" y1="56" x2="59" y2="24" strokeWidth="1" strokeDasharray="2.5,2" />
      {/* Tangent / derivative line */}
      <line x1="29" y1="50" x2="64" y2="30" strokeWidth="1" strokeDasharray="2,2" />
      {/* ∫ integral symbol */}
      <text x="118" y="66" fontSize="36"
        style={{ fontStyle:'italic', fontFamily:"Georgia,'Times New Roman',serif" }}
        stroke="none" fill="currentColor">∫</text>
      {/* d/dx */}
      <text x="158" y="36" fontSize="11"
        style={{ fontStyle:'italic', fontFamily:"Georgia,'Times New Roman',serif" }}
        stroke="none" fill="currentColor">d</text>
      <line x1="158" y1="38" x2="173" y2="38" strokeWidth="0.9" />
      <text x="158" y="50" fontSize="11"
        style={{ fontStyle:'italic', fontFamily:"Georgia,'Times New Roman',serif" }}
        stroke="none" fill="currentColor">dx</text>
    </svg>
  );
}

function BiologySvg() {
  return (
    <svg style={SVG_STYLE} viewBox="0 0 230 80" fill="none" stroke="currentColor"
      strokeLinecap="round">
      {/* DNA double helix (horizontal) */}
      {/* Left strand */}
      <path d="M5,40 C12,28 18,28 25,40 C32,52 38,52 45,40
               C52,28 58,28 65,40 C72,52 78,52 85,40
               C92,28 98,28 105,40" strokeWidth="1.4" />
      {/* Right strand (opposite phase) */}
      <path d="M5,40 C12,52 18,52 25,40 C32,28 38,28 45,40
               C52,52 58,52 65,40 C72,28 78,28 85,40
               C92,52 98,52 105,40" strokeWidth="1.4" />
      {/* Base-pair rungs at separation maxima */}
      <line x1="15" y1="28" x2="15" y2="52" strokeWidth="1" />
      <line x1="35" y1="52" x2="35" y2="28" strokeWidth="1" />
      <line x1="55" y1="28" x2="55" y2="52" strokeWidth="1" />
      <line x1="75" y1="52" x2="75" y2="28" strokeWidth="1" />
      <line x1="95" y1="28" x2="95" y2="52" strokeWidth="1" />
      {/* Cell (right side): membrane + nucleus */}
      <circle cx="158" cy="40" r="30" strokeWidth="1.4" />
      <circle cx="158" cy="40" r="14" strokeWidth="1.1" />
      <circle cx="158" cy="40" r="6"  strokeWidth="0.9" />
      {/* Organelle hints */}
      <ellipse cx="148" cy="28" rx="8" ry="4" strokeWidth="0.9" />
      <ellipse cx="170" cy="52" rx="7" ry="3" strokeWidth="0.9" />
      <ellipse cx="172" cy="32" rx="5" ry="3" transform="rotate(-30 172 32)" strokeWidth="0.9" />
    </svg>
  );
}

// ── Registry ──────────────────────────────────────────────────────────────────

const FLAIRS = {
  chemistry: ChemistrySvg,
  physics:   PhysicsSvg,
  geology:   GeologySvg,
  calculus:  CalculusSvg,
  biology:   BiologySvg,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubjectFlair({ subject, color, opacity = 0.09 }) {
  const Svg = FLAIRS[subject];
  if (!Svg) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ color, opacity }}
      aria-hidden="true"
    >
      <Svg />
    </div>
  );
}
