// Decorative subject-themed SVG watermark for class cards/hero sections.
// Parent must be `relative overflow-hidden`. Color and opacity are controlled
// via props so the same component works on both light (gold) and dark backgrounds.

const S = {
  position: 'absolute',
  right: '-0.5rem',
  top: '50%',
  transform: 'translateY(-50%)',
  height: '130%',
  width: 'auto',
};

// ── Subject SVGs ───────────────────────────────────────────────────────────────
// Each renders a full <svg>. stroke="currentColor" inherits color from wrapper.

// SCIENCE ──────────────────────────────────────────────────────────────────────

function ChemistrySvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M55,14 L74,25 L93,14 L112,25 L112,55 L93,66 L74,55 L55,66 L36,55 L36,25 Z" strokeWidth="1.5" />
      <line x1="74" y1="25" x2="74" y2="55" strokeWidth="1.4" />
      <circle cx="55" cy="40" r="13" strokeWidth="1.1" />
      <circle cx="93" cy="40" r="13" strokeWidth="1.1" />
      <line x1="55" y1="14" x2="55" y2="3"    strokeWidth="1.1" />
      <line x1="36" y1="25" x2="23" y2="17"   strokeWidth="1.1" />
      <line x1="36" y1="55" x2="23" y2="63"   strokeWidth="1.1" />
      <line x1="93" y1="14" x2="93" y2="3"    strokeWidth="1.1" />
      <line x1="112" y1="25" x2="125" y2="17" strokeWidth="1.1" />
      <line x1="112" y1="55" x2="125" y2="63" strokeWidth="1.1" />
      <circle cx="55" cy="2"  r="2.5" strokeWidth="1" />
      <circle cx="22" cy="16" r="2.5" strokeWidth="1" />
      <line x1="168" y1="10" x2="168" y2="36" strokeWidth="1.3" />
      <line x1="178" y1="10" x2="178" y2="36" strokeWidth="1.3" />
      <line x1="165" y1="10" x2="181" y2="10" strokeWidth="1.3" />
      <path d="M168,36 L151,65 Q168,75 185,65 L178,36" strokeWidth="1.3" />
      <path d="M155,60 Q168,67 181,60" strokeWidth="1" />
    </svg>
  );
}

function PhysicsSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      <circle cx="36" cy="40" r="5" fill="currentColor" fillOpacity="0.28" strokeWidth="1.3" />
      <ellipse cx="36" cy="40" rx="30" ry="11" strokeWidth="1.3" />
      <ellipse cx="36" cy="40" rx="30" ry="11" transform="rotate(60 36 40)"  strokeWidth="1.15" />
      <ellipse cx="36" cy="40" rx="30" ry="11" transform="rotate(-60 36 40)" strokeWidth="1.0" />
      <path d="M83,40 C90,25 98,25 105,40 C112,55 120,55 127,40
               C134,25 142,25 149,40 C156,55 164,55 171,40
               C178,25 186,25 193,40" strokeWidth="1.4" />
      <line x1="86" y1="65" x2="130" y2="65" strokeWidth="1.2" />
      <polyline points="126,61 130,65 126,69" strokeWidth="1.2" />
    </svg>
  );
}

function BiologySvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M5,40 C12,28 18,28 25,40 C32,52 38,52 45,40
               C52,28 58,28 65,40 C72,52 78,52 85,40
               C92,28 98,28 105,40" strokeWidth="1.4" />
      <path d="M5,40 C12,52 18,52 25,40 C32,28 38,28 45,40
               C52,52 58,52 65,40 C72,28 78,28 85,40
               C92,52 98,52 105,40" strokeWidth="1.4" />
      <line x1="15" y1="28" x2="15" y2="52" strokeWidth="1" />
      <line x1="35" y1="52" x2="35" y2="28" strokeWidth="1" />
      <line x1="55" y1="28" x2="55" y2="52" strokeWidth="1" />
      <line x1="75" y1="52" x2="75" y2="28" strokeWidth="1" />
      <line x1="95" y1="28" x2="95" y2="52" strokeWidth="1" />
      <circle cx="158" cy="40" r="30" strokeWidth="1.4" />
      <circle cx="158" cy="40" r="14" strokeWidth="1.1" />
      <circle cx="158" cy="40" r="6"  strokeWidth="0.9" />
      <ellipse cx="148" cy="28" rx="8" ry="4" strokeWidth="0.9" />
      <ellipse cx="170" cy="52" rx="7" ry="3" strokeWidth="0.9" />
    </svg>
  );
}

function GeologySvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      <polyline points="4,74 40,10 76,74"   strokeWidth="1.6" />
      <polyline points="52,74 82,34 112,74" strokeWidth="1.4" />
      <path d="M118,16 Q140,12 162,16 Q184,20 206,16 Q220,12 232,16" strokeWidth="1.4" />
      <path d="M118,30 Q138,26 160,31 Q184,36 206,30 Q220,26 232,30" strokeWidth="1.3" />
      <path d="M118,45 Q140,41 163,46 Q186,51 207,45 Q220,41 232,45" strokeWidth="1.2" />
      <path d="M118,59 Q140,55 164,60 Q188,65 208,59 Q221,55 232,59" strokeWidth="1.1" />
      <path d="M118,73 Q143,69 167,74 Q190,77 210,73" strokeWidth="1.0" />
    </svg>
  );
}

function AstronomySvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Saturn */}
      <circle cx="46" cy="40" r="18" strokeWidth="1.5" />
      <ellipse cx="46" cy="40" rx="34" ry="10" strokeWidth="1.3" />
      {/* Stars */}
      <circle cx="105" cy="14" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="126" cy="6"  r="2"   fill="currentColor" stroke="none" />
      <circle cx="148" cy="20" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="138" cy="44" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="165" cy="10" r="2"   fill="currentColor" stroke="none" />
      <circle cx="183" cy="38" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="200" cy="18" r="2"   fill="currentColor" stroke="none" />
      <circle cx="115" cy="58" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="212" cy="52" r="1.8" fill="currentColor" stroke="none" />
      {/* Crescent moon */}
      <path d="M200,56 C188,52 185,42 192,34 C202,30 216,36 218,46 C216,58 206,62 200,56 Z" strokeWidth="1.3" />
      <path d="M194,36 C200,34 208,36 212,42" strokeWidth="1" />
      {/* Orbit trail */}
      <path d="M8,72 Q42,18 78,72" strokeWidth="0.9" strokeDasharray="3,2.5" />
    </svg>
  );
}

function EnvironmentalSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Pine trees */}
      <polyline points="38,68 38,56" strokeWidth="1.5" />
      <polyline points="22,56 38,28 54,56" strokeWidth="1.4" />
      <polyline points="26,44 38,22 50,44" strokeWidth="1.4" />
      <polyline points="62,68 62,58" strokeWidth="1.4" />
      <polyline points="50,58 62,36 74,58" strokeWidth="1.3" />
      <polyline points="53,48 62,30 71,48" strokeWidth="1.3" />
      {/* Recycling / cycle arrow */}
      <path d="M130,25 A25,25 0 1,1 105,50" strokeWidth="1.3" />
      <polyline points="100,42 105,50 113,44" strokeWidth="1.3" />
      {/* Water droplet */}
      <path d="M192,14 C200,28 208,38 208,46 A16,16 0 0,1 176,46 C176,38 184,28 192,14 Z" strokeWidth="1.3" />
      {/* Sun */}
      <circle cx="218" cy="14" r="8" strokeWidth="1.2" />
      <line x1="218" y1="3"  x2="218" y2="0"  strokeWidth="1" />
      <line x1="218" y1="25" x2="218" y2="28" strokeWidth="1" />
      <line x1="207" y1="14" x2="204" y2="14" strokeWidth="1" />
      <line x1="229" y1="14" x2="232" y2="14" strokeWidth="1" />
    </svg>
  );
}

function EarthScienceSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Globe */}
      <circle cx="42" cy="40" r="30" strokeWidth="1.5" />
      <path d="M12,40 Q42,54 72,40" strokeWidth="1.1" />
      <path d="M12,40 Q42,26 72,40" strokeWidth="1.1" strokeDasharray="3,2" />
      <path d="M42,10 Q55,40 42,70" strokeWidth="1.1" />
      <path d="M42,10 Q29,40 42,70" strokeWidth="1.1" strokeDasharray="3,2" />
      {/* Simplified continent */}
      <path d="M28,24 Q22,34 28,42 Q36,48 48,44 Q56,38 52,28 Q46,20 36,20 Q32,20 28,24 Z" strokeWidth="1.2" />
      {/* Tectonic plate boundary (zigzag) */}
      <path d="M110,40 L120,28 L132,46 L144,28 L156,46 L168,28 L180,46 L192,28 L204,46 L216,28" strokeWidth="1.4" />
      {/* Atmosphere arcs */}
      <path d="M12,40 Q2,10 42,6 Q82,2 72,40" strokeWidth="0.9" strokeDasharray="3,2" />
    </svg>
  );
}

function AnatomySvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Anatomical heart */}
      <path d="M48,60 C30,48 14,32 24,18 C30,9 40,11 44,18 C48,11 58,9 64,18 C66,22 66,28 62,34 L48,60 Z" strokeWidth="1.5" />
      <path d="M38,18 C36,6 50,2 56,10" strokeWidth="1.2" />
      <path d="M40,30 C36,26 26,28 24,36" strokeWidth="1" />
      {/* EKG / heartbeat line */}
      <path d="M85,40 L100,40 L108,22 L116,58 L124,40 L132,40 L140,30 L148,50 L156,40 L175,40" strokeWidth="1.4" />
      {/* Femur bone */}
      <line x1="188" y1="15" x2="200" y2="68" strokeWidth="6" strokeLinecap="round" stroke="none" />
      <line x1="188" y1="15" x2="200" y2="68" strokeWidth="1.3" />
      <circle cx="186" cy="14" r="8"  strokeWidth="1.3" />
      <circle cx="202" cy="68" r="7"  strokeWidth="1.2" />
      <circle cx="194" cy="62" r="5"  strokeWidth="1.1" />
    </svg>
  );
}

function ForensicsSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Fingerprint concentric arcs */}
      <path d="M30,65 C30,44 38,30 52,22 C66,14 78,22 84,36 C90,50 84,64 70,68" strokeWidth="1.5" />
      <path d="M37,65 C37,47 44,35 55,28 C64,22 72,27 76,38 C80,50 74,62 62,65" strokeWidth="1.2" />
      <path d="M44,65 C44,50 50,41 58,35 C64,30 70,34 72,42 C74,51 69,61 58,64" strokeWidth="1.0" />
      <path d="M51,65 C51,53 56,46 61,42 C65,39 68,42 68,48 C68,55 64,62 55,64" strokeWidth="0.9" />
      {/* Magnifying glass */}
      <circle cx="152" cy="34" r="22" strokeWidth="1.5" />
      <line x1="168" y1="50" x2="188" y2="70" strokeWidth="2.2" />
      {/* Lens shine */}
      <path d="M136,20 Q140,15 148,17" strokeWidth="1" />
      {/* Small evidence marker */}
      <circle cx="106" cy="35" r="7"  strokeWidth="1.1" />
      <line x1="101" y1="30" x2="111" y2="40" strokeWidth="1" />
      <line x1="111" y1="30" x2="101" y2="40" strokeWidth="1" />
    </svg>
  );
}

// MATH ─────────────────────────────────────────────────────────────────────────

function CalculusSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      <line x1="32" y1="70" x2="32" y2="5"   strokeWidth="1.2" />
      <polyline points="29,9 32,5 35,9"        strokeWidth="1.2" />
      <line x1="5"  y1="56" x2="110" y2="56" strokeWidth="1.2" />
      <polyline points="106,53 110,56 106,59"  strokeWidth="1.2" />
      <path d="M5,24 Q32,73 59,24" strokeWidth="1.4" />
      <line x1="46" y1="56" x2="46" y2="40" strokeWidth="1" strokeDasharray="2.5,2" />
      <line x1="59" y1="56" x2="59" y2="24" strokeWidth="1" strokeDasharray="2.5,2" />
      <line x1="29" y1="50" x2="64" y2="30" strokeWidth="1" strokeDasharray="2,2" />
      <text x="118" y="66" fontSize="36"
        style={{ fontStyle:'italic', fontFamily:"Georgia,'Times New Roman',serif" }}
        stroke="none" fill="currentColor">∫</text>
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

function AlgebraSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Balance scale */}
      <line x1="45" y1="12" x2="45" y2="68" strokeWidth="1.3" />
      <line x1="15" y1="30" x2="75" y2="30" strokeWidth="1.4" />
      <path d="M15,30 L10,50 Q15,55 20,50 L15,30" strokeWidth="1.2" />
      <path d="M75,30 L70,50 Q75,55 80,50 L75,30" strokeWidth="1.2" />
      <path d="M40,68 L50,68 L48,62 L42,62 Z" strokeWidth="1.2" />
      {/* Equations */}
      <text x="100" y="28" fontSize="11"
        style={{ fontStyle:'italic', fontFamily:"Georgia,'Times New Roman',serif" }}
        stroke="none" fill="currentColor">ax² + bx + c = 0</text>
      <text x="100" y="48" fontSize="11"
        style={{ fontStyle:'italic', fontFamily:"Georgia,'Times New Roman',serif" }}
        stroke="none" fill="currentColor">x = (–b ± √D)</text>
      <line x1="100" y1="50" x2="186" y2="50" strokeWidth="0.9" />
      <text x="128" y="62" fontSize="11"
        style={{ fontStyle:'italic', fontFamily:"Georgia,'Times New Roman',serif" }}
        stroke="none" fill="currentColor">2a</text>
    </svg>
  );
}

function GeometrySvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Triangle */}
      <polygon points="45,10 10,70 80,70" strokeWidth="1.5" />
      {/* Right angle mark at bottom-left */}
      <polyline points="10,60 20,60 20,70" strokeWidth="1.1" />
      {/* Angle arc at top */}
      <path d="M38,28 A14,14 0 0,1 52,28" strokeWidth="1.1" />
      {/* Circle with radius */}
      <circle cx="148" cy="40" r="26" strokeWidth="1.4" />
      <line x1="148" y1="40" x2="168" y2="20" strokeWidth="1.2" />
      <line x1="148" y1="40" x2="168" y2="60" strokeWidth="1.2" />
      <circle cx="148" cy="40" r="2.5" fill="currentColor" stroke="none" />
      {/* Perpendicular bisector */}
      <line x1="100" y1="18" x2="100" y2="62" strokeWidth="1" strokeDasharray="3,2" />
      {/* Parallel marks */}
      <line x1="88" y1="34" x2="94" y2="34" strokeWidth="1.2" />
      <line x1="90" y1="30" x2="96" y2="30" strokeWidth="1.2" />
    </svg>
  );
}

function PrecalculusSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Unit circle */}
      <circle cx="40" cy="40" r="28" strokeWidth="1.4" />
      <line x1="12" y1="40" x2="68" y2="40" strokeWidth="1" />
      <line x1="40" y1="12" x2="40" y2="68" strokeWidth="1" />
      {/* Angle radius line */}
      <line x1="40" y1="40" x2="60" y2="22" strokeWidth="1.3" />
      {/* Angle arc θ */}
      <path d="M52,40 A12,12 0 0,0 46,30" strokeWidth="1.1" />
      {/* sin/cos projection lines */}
      <line x1="60" y1="22" x2="60" y2="40" strokeWidth="1" strokeDasharray="2.5,2" />
      <line x1="40" y1="22" x2="60" y2="22" strokeWidth="1" strokeDasharray="2.5,2" />
      {/* Trig waves */}
      <path d="M88,40 C95,26 103,26 110,40 C117,54 125,54 132,40
               C139,26 147,26 154,40 C161,54 169,54 176,40
               C183,26 191,26 198,40" strokeWidth="1.4" />
      {/* Cosine offset */}
      <path d="M88,25 C95,25 103,40 110,55 C117,40 125,25 132,25
               C139,25 147,40 154,55" strokeWidth="1" strokeDasharray="3,2" />
    </svg>
  );
}

function StatisticsSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Bell curve (normal distribution) */}
      <path d="M10,68 C20,68 30,65 38,58 C46,50 50,38 58,28 C62,22 68,18 76,18
               C84,18 90,22 94,28 C102,38 106,50 114,58 C122,65 132,68 142,68" strokeWidth="1.5" />
      {/* Mean line */}
      <line x1="76" y1="12" x2="76" y2="68" strokeWidth="1" strokeDasharray="3,2" />
      {/* ±1σ markers */}
      <line x1="58" y1="28" x2="58" y2="68" strokeWidth="0.9" strokeDasharray="2,2" />
      <line x1="94" y1="28" x2="94" y2="68" strokeWidth="0.9" strokeDasharray="2,2" />
      {/* Bar chart (right side) */}
      <rect x="158" y="50" width="10" height="18" strokeWidth="1.2" />
      <rect x="172" y="34" width="10" height="34" strokeWidth="1.2" />
      <rect x="186" y="20" width="10" height="48" strokeWidth="1.2" />
      <rect x="200" y="38" width="10" height="30" strokeWidth="1.2" />
      <rect x="214" y="55" width="10" height="13" strokeWidth="1.2" />
      <line x1="155" y1="68" x2="228" y2="68" strokeWidth="1.1" />
    </svg>
  );
}

// HUMANITIES ───────────────────────────────────────────────────────────────────

function HistorySvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Ionic columns */}
      <rect x="10" y="18" width="12" height="48" strokeWidth="1.3" />
      <path d="M7,18 Q16,12 23,18" strokeWidth="1.2" />
      <line x1="7" y1="66" x2="23" y2="66" strokeWidth="1.2" />
      <rect x="32" y="18" width="12" height="48" strokeWidth="1.3" />
      <path d="M29,18 Q38,12 45,18" strokeWidth="1.2" />
      <line x1="29" y1="66" x2="45" y2="66" strokeWidth="1.2" />
      <rect x="54" y="18" width="12" height="48" strokeWidth="1.3" />
      <path d="M51,18 Q60,12 67,18" strokeWidth="1.2" />
      <line x1="51" y1="66" x2="67" y2="66" strokeWidth="1.2" />
      {/* Entablature (top beam) */}
      <rect x="4" y="10" width="68" height="8" strokeWidth="1.3" />
      {/* Pediment (triangular roof) */}
      <polyline points="4,10 38,2 72,10" strokeWidth="1.2" />
      {/* Timeline */}
      <line x1="92" y1="50" x2="222" y2="50" strokeWidth="1.3" />
      <polyline points="218,46 222,50 218,54" strokeWidth="1.2" />
      <line x1="110" y1="44" x2="110" y2="56" strokeWidth="1.1" />
      <line x1="140" y1="44" x2="140" y2="56" strokeWidth="1.1" />
      <line x1="170" y1="44" x2="170" y2="56" strokeWidth="1.1" />
      <line x1="200" y1="44" x2="200" y2="56" strokeWidth="1.1" />
      <circle cx="110" cy="50" r="3" fill="currentColor" stroke="none" />
      <circle cx="140" cy="50" r="3" fill="currentColor" stroke="none" />
      <circle cx="170" cy="50" r="3" fill="currentColor" stroke="none" />
      <circle cx="200" cy="50" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function EnglishSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Open book */}
      <path d="M10,65 L10,18 Q38,15 52,22 L52,68 Q38,62 10,65 Z" strokeWidth="1.4" />
      <path d="M94,65 L94,18 Q66,15 52,22 L52,68 Q66,62 94,65 Z" strokeWidth="1.4" />
      {/* Book spine */}
      <line x1="52" y1="22" x2="52" y2="68" strokeWidth="1.2" />
      {/* Text lines left page */}
      <line x1="18" y1="30" x2="44" y2="30" strokeWidth="1" />
      <line x1="18" y1="38" x2="44" y2="38" strokeWidth="1" />
      <line x1="18" y1="46" x2="44" y2="46" strokeWidth="1" />
      <line x1="18" y1="54" x2="36" y2="54" strokeWidth="1" />
      {/* Text lines right page */}
      <line x1="60" y1="30" x2="86" y2="30" strokeWidth="1" />
      <line x1="60" y1="38" x2="86" y2="38" strokeWidth="1" />
      <line x1="60" y1="46" x2="86" y2="46" strokeWidth="1" />
      <line x1="60" y1="54" x2="78" y2="54" strokeWidth="1" />
      {/* Quill pen */}
      <path d="M120,70 C130,55 150,38 180,12" strokeWidth="1.4" />
      <path d="M180,12 C175,25 160,40 148,52 C155,38 168,20 180,12 Z" strokeWidth="1.1" />
      <line x1="120" y1="70" x2="124" y2="60" strokeWidth="1.2" />
      {/* Writing flourish */}
      <path d="M130,60 C145,55 160,58 175,52" strokeWidth="1" strokeDasharray="3,2" />
      {/* Large quotation mark */}
      <text x="200" y="42" fontSize="28"
        style={{ fontFamily:"Georgia,'Times New Roman',serif" }}
        stroke="none" fill="currentColor">"</text>
    </svg>
  );
}

function PsychologySvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Brain outline (simplified lateral view) */}
      <path d="M18,50 C12,42 12,28 22,20 C30,14 40,14 46,20
               C50,14 60,12 68,18 C76,24 78,34 74,42
               C80,40 84,46 80,52 C76,58 68,56 66,50
               C62,58 54,62 46,58 C40,64 30,64 24,58 Z" strokeWidth="1.5" />
      {/* Cerebellum */}
      <path d="M24,58 Q28,68 34,70 Q42,72 46,66" strokeWidth="1.2" />
      {/* Brain folds / sulci */}
      <path d="M32,30 Q38,24 46,28" strokeWidth="1.1" />
      <path d="M50,22 Q58,18 64,26" strokeWidth="1.1" />
      <path d="M28,42 Q36,36 44,40" strokeWidth="1" />
      {/* Thought bubble */}
      <circle cx="120" cy="52" r="4"  strokeWidth="1.1" />
      <circle cx="130" cy="42" r="6"  strokeWidth="1.1" />
      <circle cx="144" cy="30" r="9"  strokeWidth="1.2" />
      <circle cx="162" cy="20" r="14" strokeWidth="1.3" />
      {/* ? mark in bubble */}
      <text x="156" y="26" fontSize="14"
        style={{ fontFamily:"Georgia,'Times New Roman',serif" }}
        stroke="none" fill="currentColor">?</text>
    </svg>
  );
}

function EconomicsSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Axes */}
      <line x1="18" y1="72" x2="18" y2="8"  strokeWidth="1.2" />
      <polyline points="15,12 18,8 21,12"    strokeWidth="1.2" />
      <line x1="18" y1="72" x2="110" y2="72" strokeWidth="1.2" />
      <polyline points="106,69 110,72 106,75" strokeWidth="1.2" />
      {/* Demand curve (downward sloping) */}
      <path d="M22,16 Q50,40 104,68" strokeWidth="1.4" />
      {/* Supply curve (upward sloping) */}
      <path d="M22,68 Q54,44 104,16" strokeWidth="1.4" />
      {/* Equilibrium point */}
      <circle cx="63" cy="42" r="4" fill="currentColor" stroke="none" />
      {/* Equilibrium dashes */}
      <line x1="18" y1="42" x2="63" y2="42" strokeWidth="1" strokeDasharray="2.5,2" />
      <line x1="63" y1="42" x2="63" y2="72" strokeWidth="1" strokeDasharray="2.5,2" />
      {/* $ sign */}
      <text x="128" y="52" fontSize="36"
        style={{ fontFamily:"Georgia,'Times New Roman',serif" }}
        stroke="none" fill="currentColor">$</text>
      <line x1="146" y1="16" x2="146" y2="64" strokeWidth="1.2" />
    </svg>
  );
}

function GovernmentSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Capitol dome */}
      <rect x="18" y="50" width="60" height="18" strokeWidth="1.3" />
      <path d="M18,50 L48,12 L78,50" strokeWidth="1.3" />
      <path d="M40,50 L40,36" strokeWidth="1.2" />
      <path d="M56,50 L56,36" strokeWidth="1.2" />
      <ellipse cx="48" cy="26" rx="12" ry="8" strokeWidth="1.2" />
      {/* Flagpole + flag */}
      <line x1="48" y1="12" x2="48" y2="2" strokeWidth="1.3" />
      <polygon points="48,2 68,8 48,14" strokeWidth="1.1" />
      {/* Steps */}
      <line x1="12" y1="68" x2="84" y2="68" strokeWidth="1.2" />
      <line x1="16" y1="72" x2="80" y2="72" strokeWidth="1.2" />
      {/* Stars (right) */}
      <circle cx="120" cy="20" r="3" fill="currentColor" stroke="none" />
      <circle cx="138" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="156" cy="22" r="3" fill="currentColor" stroke="none" />
      <circle cx="128" cy="36" r="2" fill="currentColor" stroke="none" />
      <circle cx="148" cy="38" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="165" cy="14" r="2" fill="currentColor" stroke="none" />
      {/* Gavel */}
      <rect x="175" y="45" width="25" height="10" rx="3" transform="rotate(-40 187 50)" strokeWidth="1.3" />
      <line x1="195" y1="42" x2="215" y2="68" strokeWidth="1.4" />
    </svg>
  );
}

// ELECTIVES ────────────────────────────────────────────────────────────────────

function ComputerScienceSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Circuit board traces */}
      <line x1="10" y1="20" x2="40" y2="20" strokeWidth="1.3" />
      <line x1="40" y1="20" x2="40" y2="50" strokeWidth="1.3" />
      <line x1="40" y1="50" x2="70" y2="50" strokeWidth="1.3" />
      <line x1="70" y1="50" x2="70" y2="30" strokeWidth="1.3" />
      <line x1="70" y1="30" x2="95" y2="30" strokeWidth="1.3" />
      <line x1="10" y1="40" x2="30" y2="40" strokeWidth="1.3" />
      <line x1="30" y1="40" x2="30" y2="60" strokeWidth="1.3" />
      <line x1="30" y1="60" x2="60" y2="60" strokeWidth="1.3" />
      <line x1="60" y1="60" x2="60" y2="40" strokeWidth="1.1" />
      <line x1="50" y1="10" x2="50" y2="25" strokeWidth="1.3" />
      <line x1="80" y1="10" x2="80" y2="22" strokeWidth="1.3" />
      {/* Component nodes */}
      <circle cx="40" cy="20" r="3" fill="currentColor" stroke="none" />
      <circle cx="40" cy="50" r="3" fill="currentColor" stroke="none" />
      <circle cx="70" cy="30" r="3" fill="currentColor" stroke="none" />
      <circle cx="30" cy="40" r="3" fill="currentColor" stroke="none" />
      <rect x="45" y="4"  width="10" height="12" rx="1" strokeWidth="1.2" />
      <rect x="75" y="4"  width="10" height="12" rx="1" strokeWidth="1.2" />
      {/* Code */}
      <text x="112" y="30" fontSize="14"
        style={{ fontFamily:"'Courier New',monospace", fontWeight:'bold' }}
        stroke="none" fill="currentColor">{"{ }"}</text>
      <text x="112" y="48" fontSize="11"
        style={{ fontFamily:"'Courier New',monospace" }}
        stroke="none" fill="currentColor">{"</>"}</text>
      {/* Binary */}
      <text x="148" y="22" fontSize="9"
        style={{ fontFamily:"'Courier New',monospace" }}
        stroke="none" fill="currentColor">1 0 1 1 0</text>
      <text x="148" y="34" fontSize="9"
        style={{ fontFamily:"'Courier New',monospace" }}
        stroke="none" fill="currentColor">0 1 1 0 1</text>
      <text x="148" y="46" fontSize="9"
        style={{ fontFamily:"'Courier New',monospace" }}
        stroke="none" fill="currentColor">1 0 0 1 1</text>
      <text x="148" y="58" fontSize="9"
        style={{ fontFamily:"'Courier New',monospace" }}
        stroke="none" fill="currentColor">0 1 0 1 0</text>
    </svg>
  );
}

function ArtSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Artist palette */}
      <path d="M22,50 C10,44 8,28 18,18 C28,8 46,8 56,18 C66,28 64,44 52,52
               C46,56 44,58 46,62 C48,66 42,70 38,66 C34,62 34,56 28,54 C26,54 24,52 22,50 Z"
        strokeWidth="1.4" />
      {/* Thumb hole */}
      <circle cx="44" cy="44" r="6" strokeWidth="1.2" />
      {/* Paint dots on palette */}
      <circle cx="22" cy="28" r="4" fill="currentColor" fillOpacity="0.4" strokeWidth="1" />
      <circle cx="34" cy="16" r="4" fill="currentColor" fillOpacity="0.3" strokeWidth="1" />
      <circle cx="50" cy="16" r="4" fill="currentColor" fillOpacity="0.5" strokeWidth="1" />
      <circle cx="60" cy="28" r="4" fill="currentColor" fillOpacity="0.35" strokeWidth="1" />
      {/* Paintbrush */}
      <line x1="76" y1="10" x2="110" y2="50" strokeWidth="1.4" />
      <path d="M110,50 C112,54 108,60 104,58 C100,56 98,50 102,47 Z" strokeWidth="1.2" />
      {/* Brush strokes (expressive) */}
      <path d="M130,22 C140,16 155,20 160,30" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M128,42 C142,36 158,40 165,52" strokeWidth="2" strokeLinecap="round" />
      <path d="M132,60 C148,54 168,58 176,68" strokeWidth="1.8" strokeLinecap="round" />
      {/* Color theory circles */}
      <circle cx="200" cy="28" r="14" strokeWidth="1.2" />
      <circle cx="214" cy="50" r="14" strokeWidth="1.2" />
      <circle cx="186" cy="50" r="14" strokeWidth="1.2" />
    </svg>
  );
}

function MusicSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Staff lines */}
      <line x1="10" y1="24" x2="115" y2="24" strokeWidth="1" />
      <line x1="10" y1="32" x2="115" y2="32" strokeWidth="1" />
      <line x1="10" y1="40" x2="115" y2="40" strokeWidth="1" />
      <line x1="10" y1="48" x2="115" y2="48" strokeWidth="1" />
      <line x1="10" y1="56" x2="115" y2="56" strokeWidth="1" />
      {/* Treble clef */}
      <path d="M22,58 C18,54 16,46 20,38 C24,30 30,24 28,16 C26,8 20,6 18,12 C16,18 20,24 24,22
               C28,20 30,14 26,10" strokeWidth="1.4" />
      <path d="M24,42 C20,40 16,44 18,48 C20,52 26,52 26,48" strokeWidth="1.3" />
      {/* Quarter notes */}
      <ellipse cx="52" cy="42" rx="5" ry="4" transform="rotate(-15 52 42)" strokeWidth="1.2" />
      <line x1="56" y1="40" x2="56" y2="18" strokeWidth="1.2" />
      <ellipse cx="72" cy="34" rx="5" ry="4" transform="rotate(-15 72 34)" strokeWidth="1.2" />
      <line x1="76" y1="32" x2="76" y2="10" strokeWidth="1.2" />
      {/* Eighth note beam */}
      <ellipse cx="90" cy="42" rx="5" ry="4" transform="rotate(-15 90 42)" strokeWidth="1.2" />
      <line x1="94" y1="40" x2="94" y2="18" strokeWidth="1.2" />
      <ellipse cx="106" cy="38" rx="5" ry="4" transform="rotate(-15 106 38)" strokeWidth="1.2" />
      <line x1="110" y1="36" x2="110" y2="14" strokeWidth="1.2" />
      <line x1="94" y1="18" x2="110" y2="14" strokeWidth="1.6" />
      {/* Musical symbol ♪ */}
      <text x="128" y="52" fontSize="32"
        style={{ fontFamily:"Georgia,'Times New Roman',serif" }}
        stroke="none" fill="currentColor">♪</text>
      <text x="170" y="40" fontSize="22"
        style={{ fontFamily:"Georgia,'Times New Roman',serif" }}
        stroke="none" fill="currentColor">♫</text>
    </svg>
  );
}

function PESvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Dumbbell */}
      <rect x="10" y="32" width="16" height="16" rx="3" strokeWidth="1.4" />
      <rect x="10" y="26" width="16" height="8"  rx="2" strokeWidth="1.2" />
      <rect x="10" y="46" width="16" height="8"  rx="2" strokeWidth="1.2" />
      <line x1="26" y1="40" x2="68" y2="40" strokeWidth="3" strokeLinecap="round" />
      <rect x="68" y="32" width="16" height="16" rx="3" strokeWidth="1.4" />
      <rect x="68" y="26" width="16" height="8"  rx="2" strokeWidth="1.2" />
      <rect x="68" y="46" width="16" height="8"  rx="2" strokeWidth="1.2" />
      {/* Heartbeat / EKG line */}
      <path d="M102,50 L116,50 L122,32 L130,68 L138,50 L146,50 L152,40 L158,60 L164,50 L185,50" strokeWidth="1.4" />
      {/* Running figure (stick figure) */}
      <circle cx="205" cy="14" r="6" strokeWidth="1.3" />
      <line x1="205" y1="20" x2="202" y2="36" strokeWidth="1.3" />
      <path d="M202,36 L194,48 M202,36 L214,44" strokeWidth="1.2" />
      <path d="M196,26 L208,30" strokeWidth="1.2" />
      <path d="M194,48 L186,56 M214,44 L220,54" strokeWidth="1.1" />
    </svg>
  );
}

function LanguageSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Speech bubble 1 (left) */}
      <path d="M10,12 L72,12 Q78,12 78,18 L78,46 Q78,52 72,52 L36,52 L24,65 L28,52 L16,52 Q10,52 10,46 L10,18 Q10,12 16,12 Z" strokeWidth="1.4" />
      {/* Text lines in bubble 1 */}
      <line x1="20" y1="24" x2="68" y2="24" strokeWidth="1" />
      <line x1="20" y1="32" x2="68" y2="32" strokeWidth="1" />
      <line x1="20" y1="40" x2="52" y2="40" strokeWidth="1" />
      {/* Speech bubble 2 (right, offset) */}
      <path d="M100,28 L185,28 Q192,28 192,34 L192,62 Q192,68 185,68 L150,68 L140,78 L144,68 L106,68 Q100,68 100,62 L100,34 Q100,28 106,28 Z" strokeWidth="1.3" />
      <line x1="110" y1="40" x2="182" y2="40" strokeWidth="0.9" />
      <line x1="110" y1="48" x2="182" y2="48" strokeWidth="0.9" />
      <line x1="110" y1="56" x2="162" y2="56" strokeWidth="0.9" />
    </svg>
  );
}

function HealthSvg() {
  return (
    <svg style={S} viewBox="0 0 230 80" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Medical cross */}
      <rect x="22" y="10" width="20" height="60" rx="4" strokeWidth="1.4" />
      <rect x="8"  y="24" width="48" height="20" rx="4" strokeWidth="1.4" />
      {/* Stethoscope */}
      <path d="M76,20 C76,30 80,36 90,36 C100,36 104,30 104,20 C104,10 110,6 116,10" strokeWidth="1.4" />
      <circle cx="90" cy="44" r="12" strokeWidth="1.3" />
      <path d="M116,10 L125,22" strokeWidth="1.3" />
      <circle cx="127" cy="24" r="5" strokeWidth="1.2" />
      {/* Heartbeat / pulse line */}
      <path d="M148,45 L162,45 L168,28 L178,62 L186,45 L196,45 L202,36 L208,54 L214,45 L228,45" strokeWidth="1.4" />
      {/* Apple (health) */}
      <path d="M80,60 C72,60 66,68 68,74 C70,80 78,80 82,76 C86,80 94,80 96,74 C98,68 92,60 84,60 Z" strokeWidth="1.3" />
      <path d="M82,60 C82,52 88,50 90,52" strokeWidth="1.2" />
      <path d="M82,60 C78,56 74,56 74,60" strokeWidth="1.1" />
    </svg>
  );
}

// ── Registry ──────────────────────────────────────────────────────────────────

const FLAIRS = {
  // Science
  chemistry:            ChemistrySvg,
  physics:              PhysicsSvg,
  biology:              BiologySvg,
  geology:              GeologySvg,
  astronomy:            AstronomySvg,
  environmental_science: EnvironmentalSvg,
  earth_science:        EarthScienceSvg,
  anatomy:              AnatomySvg,
  forensics:            ForensicsSvg,
  // Math
  calculus:             CalculusSvg,
  algebra:              AlgebraSvg,
  geometry:             GeometrySvg,
  precalculus:          PrecalculusSvg,
  statistics:           StatisticsSvg,
  computer_science:     ComputerScienceSvg,
  // Humanities
  history:              HistorySvg,
  english:              EnglishSvg,
  psychology:           PsychologySvg,
  economics:            EconomicsSvg,
  government:           GovernmentSvg,
  // Electives
  art:                  ArtSvg,
  music:                MusicSvg,
  pe:                   PESvg,
  language:             LanguageSvg,
  health:               HealthSvg,
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
