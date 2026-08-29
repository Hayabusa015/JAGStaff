// Gate 1 visual — a labeled geologic cross-section with the injection point
// and the earthquake dot cloud plotted by true depth.
const CHART_TOP = 30;
const CHART_HEIGHT = 280;

export default function CrossSectionDiagram({ data }) {
  const { dots, sandstoneTop, sandstoneBottom, basementTop, chartBottom, injectionDepth } = data;
  const depthToY = (d) => CHART_TOP + (d / chartBottom) * CHART_HEIGHT;
  const ticks = [0, 500, 1000, 1500, 2000, 2500, 3000];

  return (
    <svg viewBox="0 0 400 330" className="w-full" role="img" aria-label="Geologic cross-section with earthquake depths plotted">
      {/* Layer bands */}
      <rect x="30" y={depthToY(0)} width="360" height={depthToY(sandstoneTop) - depthToY(0)} fill="#24242C" />
      <rect x="30" y={depthToY(sandstoneTop)} width="360" height={depthToY(sandstoneBottom) - depthToY(sandstoneTop)} fill="#7A5708" opacity="0.55" />
      <rect x="30" y={depthToY(basementTop)} width="360" height={depthToY(chartBottom) - depthToY(basementTop)} fill="#0C0C0F" stroke="#F5B301" strokeOpacity="0.15" />
      {/* Basement hatch texture */}
      <pattern id="basementHatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="8" stroke="#F5B301" strokeOpacity="0.12" strokeWidth="1" />
      </pattern>
      <rect x="30" y={depthToY(basementTop)} width="360" height={depthToY(chartBottom) - depthToY(basementTop)} fill="url(#basementHatch)" />

      {/* Depth gridlines + labels */}
      {ticks.map((t) => (
        <g key={t}>
          <line x1="30" y1={depthToY(t)} x2="390" y2={depthToY(t)} stroke="#3f3f46" strokeWidth="0.5" strokeDasharray="2,3" />
          <text x="24" y={depthToY(t) + 3} textAnchor="end" fontSize="9" fill="#a1a1aa">{t}</text>
        </g>
      ))}
      <text x="10" y="18" fontSize="9" fill="#71717a">depth (m)</text>

      {/* Layer labels */}
      <text x="36" y={depthToY((0 + sandstoneTop) / 2) + 3} fontSize="10" fill="#d4d4d8">Shale &amp; limestone</text>
      <text x="36" y={depthToY((sandstoneTop + sandstoneBottom) / 2) + 3} fontSize="10" fill="#FFD24A" fontWeight="600">Mt. Simon Sandstone</text>
      <text x="36" y={depthToY((basementTop + chartBottom) / 2) + 3} fontSize="10" fill="#F5B301" fontWeight="600">Precambrian basement rock</text>

      {/* Injection well bore + point */}
      <line x1="200" y1={CHART_TOP} x2="200" y2={depthToY(injectionDepth)} stroke="#FFD24A" strokeWidth="2" />
      <circle cx="200" cy={depthToY(injectionDepth)} r="4.5" fill="#FFD24A" stroke="#0a0500" strokeWidth="1" />
      <text x="206" y={depthToY(injectionDepth) - 6} fontSize="9" fill="#FFD24A">Injection point · {injectionDepth.toLocaleString()} m</text>

      {/* Earthquake dots */}
      {dots.map(([x, depth], i) => (
        <circle key={i} cx={30 + (x / 400) * 360} cy={depthToY(depth)} r="3.2" fill="#f87171" fillOpacity="0.85" stroke="#450a0a" strokeWidth="0.5" />
      ))}

      {/* Frame */}
      <rect x="30" y={CHART_TOP} width="360" height={CHART_HEIGHT} fill="none" stroke="#52525b" strokeWidth="1" />
    </svg>
  );
}
