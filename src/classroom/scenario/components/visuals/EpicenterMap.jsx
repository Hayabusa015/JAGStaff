// Gate 3 visual — epicenters plotted around the wellpad with a 2 km scale
// bar. The three distant, unrelated events are called out rather than
// plotted to scale (they'd land 40 km off the page).
const CENTER = { x: 200, y: 190 };
const KM_TO_PX = 55;

export default function EpicenterMap({ data }) {
  const { near, far, radiusKm } = data;
  const rPx = radiusKm * KM_TO_PX;

  return (
    <svg viewBox="0 0 400 340" className="w-full" role="img" aria-label="Map of earthquake epicenters clustered around the wellpad">
      <rect x="10" y="10" width="380" height="300" fill="#0C0C0F" stroke="#3f3f46" />

      {/* 2 km radius ring */}
      <circle cx={CENTER.x} cy={CENTER.y} r={rPx} fill="#F5B301" fillOpacity="0.06" stroke="#F5B301" strokeOpacity="0.5" strokeDasharray="4,3" />
      <text x={CENTER.x} y={CENTER.y - rPx - 6} textAnchor="middle" fontSize="9" fill="#F5B301">2 km radius</text>

      {/* Wellpad */}
      <rect x={CENTER.x - 6} y={CENTER.y - 6} width="12" height="12" fill="#FFD24A" stroke="#0a0500" strokeWidth="1" />
      <text x={CENTER.x} y={CENTER.y + 22} textAnchor="middle" fontSize="9" fill="#FFD24A" fontWeight="600">Keystone #4 wellpad</text>

      {/* Near epicenters */}
      {near.map(([kx, ky], i) => (
        <circle key={i} cx={CENTER.x + kx * KM_TO_PX} cy={CENTER.y + ky * KM_TO_PX} r="3.4" fill="#f87171" fillOpacity="0.9" stroke="#450a0a" strokeWidth="0.5" />
      ))}

      {/* Scale bar */}
      <g transform="translate(30, 288)">
        <line x1="0" y1="0" x2={KM_TO_PX} y2="0" stroke="#d4d4d8" strokeWidth="1.5" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="#d4d4d8" strokeWidth="1.5" />
        <line x1={KM_TO_PX} y1="-4" x2={KM_TO_PX} y2="4" stroke="#d4d4d8" strokeWidth="1.5" />
        <text x={KM_TO_PX / 2} y="16" textAnchor="middle" fontSize="9" fill="#d4d4d8">1 km</text>
      </g>

      {/* Callout: distant, unrelated events */}
      <g transform="translate(300, 40)">
        <rect x="-6" y="-16" width="92" height="40" rx="6" fill="#16161B" stroke="#52525b" />
        <text x="40" y="-2" textAnchor="middle" fontSize="8.5" fill="#d4d4d8">{far.length} older, smaller</text>
        <text x="40" y="9" textAnchor="middle" fontSize="8.5" fill="#d4d4d8">events, ~40 km away</text>
        <line x1="20" y1="24" x2="8" y2="60" stroke="#71717a" strokeWidth="1" strokeDasharray="2,2" />
      </g>
      <g>
        {far.map((_, i) => (
          <circle key={i} cx={314 + i * 9} cy={100} r="3" fill="#a1a1aa" />
        ))}
      </g>
    </svg>
  );
}
