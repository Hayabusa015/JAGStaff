import { GOLD } from "../constants.js";

// Shared, dependency-free visual primitives + small stat helpers used by both the
// class-wide gradebook analytics and the per-student analytics page.

export const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
export const median = arr => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const tierColor = pct => pct == null ? "rgba(255,255,255,0.3)"
  : pct >= 90 ? "#22c55e" : pct >= 80 ? "#84cc16" : pct >= 70 ? "#eab308" : pct >= 60 ? "#f97316" : "#ef4444";

export function Kpi({ label, value, sub, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0.85rem 1rem", flex: "1 1 130px", minWidth: 110 }}>
      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: color || "#fff", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      {sub && <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function HBar({ label, value, color, suffix = "%", sub }) {
  const w = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
      <div style={{ width: 120, flexShrink: 0, fontSize: "0.78rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={label}>{label}</div>
      <div style={{ flex: 1, height: 18, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
        <div style={{ height: "100%", width: `${w}%`, background: color || GOLD, borderRadius: 4, transition: "width 0.4s" }} />
      </div>
      <div style={{ width: 84, flexShrink: 0, textAlign: "right", fontSize: "0.76rem", color: "rgba(255,255,255,0.7)" }}>
        {value == null ? "—" : `${Math.round(value)}${suffix}`}{sub ? <span style={{ color: "rgba(255,255,255,0.35)" }}> {sub}</span> : null}
      </div>
    </div>
  );
}

// Vertical bar chart (grade distribution / histogram).
export function VBars({ data, height = 130 }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height, paddingTop: "0.5rem" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, marginBottom: 3, color: "rgba(255,255,255,0.7)" }}>{d.value}</div>
          <div style={{ width: "100%", maxWidth: 46, borderRadius: "4px 4px 0 0", background: d.color || GOLD, height: `${Math.max(d.value > 0 ? 6 : 2, (d.value / max) * 100)}%`, transition: "height 0.4s" }} />
          <div style={{ marginTop: 5, fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 1.1 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// Inline SVG line chart for trends (0-100 scale). Skips null points (gaps).
// theme "light" uses dark gridlines/labels so it prints legibly on white paper.
export function LineChart({ data, height = 170, color = GOLD, theme = "dark" }) {
  const W = 640, H = height, padL = 34, padR = 12, padT = 12, padB = 26;
  const light = theme === "light";
  const gridStroke = light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)";
  const axisFill = light ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.35)";
  const valFill = light ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.6)";
  const labelFill = light ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.45)";
  const n = data.length;
  const xFor = i => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const yFor = v => padT + (1 - v / 100) * (H - padT - padB);
  const pts = data.map((d, i) => ({ ...d, x: xFor(i), y: d.value == null ? null : yFor(d.value) }));
  const segments = [];
  let cur = [];
  pts.forEach(p => {
    if (p.y == null) { if (cur.length) { segments.push(cur); cur = []; } }
    else cur.push(p);
  });
  if (cur.length) segments.push(cur);
  const gridY = [0, 25, 50, 75, 100];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {gridY.map(g => (
        <g key={g}>
          <line x1={padL} x2={W - padR} y1={yFor(g)} y2={yFor(g)} stroke={gridStroke} strokeWidth="1" />
          <text x={padL - 6} y={yFor(g) + 3} fontSize="9" fill={axisFill} textAnchor="end">{g}</text>
        </g>
      ))}
      {segments.map((seg, si) => (
        <polyline key={si} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          points={seg.map(p => `${p.x},${p.y}`).join(" ")} />
      ))}
      {pts.map((p, i) => p.y == null ? null : (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.2" fill={color} />
          <text x={p.x} y={p.y - 7} fontSize="9" fill={valFill} textAnchor="middle">{Math.round(p.value)}</text>
        </g>
      ))}
      {pts.map((p, i) => (
        <text key={`l${i}`} x={p.x} y={H - 8} fontSize="9" fill={labelFill} textAnchor="middle">{p.label}</text>
      ))}
    </svg>
  );
}

export function Card({ title, right, children, className }) {
  return (
    <div className={className || "card"}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem", gap: "0.5rem", flexWrap: "wrap" }}>
        <div className="section-title" style={{ marginBottom: 0 }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function RankList({ items }) {
  if (!items.length) return <Empty />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.35rem 0.6rem", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
          <span style={{ fontSize: "0.82rem" }}><span style={{ color: "rgba(255,255,255,0.3)", marginRight: 6 }}>{i + 1}</span>{it.name}</span>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: it.color || "#fff" }}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Empty() {
  return <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>Not enough data yet.</div>;
}
