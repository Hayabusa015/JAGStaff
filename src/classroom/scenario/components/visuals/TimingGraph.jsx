// Gate 2 visual — 14 months of injection volume vs. felt earthquakes, each
// series normalized to its own max so the lag pattern is easy to compare.
export default function TimingGraph({ data }) {
  const { volume, quakes } = data;
  const n = volume.length;
  const left = 34, right = 388, top = 20, bottom = 200;
  const x = (i) => left + (i / (n - 1)) * (right - left);
  const volMax = Math.max(...volume) * 1.1;
  const quakeMax = Math.max(...quakes) * 1.1;
  const yVol = (v) => bottom - (v / volMax) * (bottom - top);
  const yQuake = (v) => bottom - (v / quakeMax) * (bottom - top);

  const volPath = volume.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${yVol(v)}`).join(' ');
  const quakePath = quakes.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${yQuake(v)}`).join(' ');

  return (
    <svg viewBox="0 0 400 235" className="w-full" role="img" aria-label="Line graph of monthly injection volume versus felt earthquakes over 14 months">
      {/* Axis */}
      <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#52525b" strokeWidth="1" />
      <line x1={left} y1={top} x2={left} y2={bottom} stroke="#52525b" strokeWidth="1" />

      {/* Month ticks */}
      {volume.map((_, i) => (i % 2 === 0 ? (
        <text key={i} x={x(i)} y={bottom + 14} textAnchor="middle" fontSize="8" fill="#a1a1aa">M{i + 1}</text>
      ) : null))}

      {/* Volume (blue) */}
      <path d={volPath} fill="none" stroke="#60a5fa" strokeWidth="2" />
      {volume.map((v, i) => <circle key={i} cx={x(i)} cy={yVol(v)} r="2.4" fill="#60a5fa" />)}

      {/* Quakes (red) */}
      <path d={quakePath} fill="none" stroke="#f87171" strokeWidth="2" />
      {quakes.map((v, i) => <circle key={i} cx={x(i)} cy={yQuake(v)} r="2.4" fill="#f87171" />)}

      {/* Marker: month 9, quakes begin */}
      <line x1={x(8)} y1={top} x2={x(8)} y2={bottom} stroke="#F5B301" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
      <text x={x(8) + 4} y={top + 10} fontSize="8" fill="#F5B301">quakes begin</text>

      {/* Legend */}
      <g transform={`translate(${left}, 6)`}>
        <circle cx="0" cy="0" r="3" fill="#60a5fa" /><text x="8" y="3" fontSize="9" fill="#d4d4d8">Monthly injection volume</text>
        <circle cx="150" cy="0" r="3" fill="#f87171" /><text x="158" y="3" fontSize="9" fill="#d4d4d8">Felt earthquakes</text>
      </g>
    </svg>
  );
}
