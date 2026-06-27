// Shared constants and pure helpers used across the Gradebook sub-components.

export const PERIOD_LABELS = { 1: "Period 1", 2: "Period 2", 3: "Period 3", 4: "Period 4", 5: "Midterm", 6: "Final" };
export const PERIOD_KEYS   = { 5: "midterm", 6: "final" };
export const TIER_COLORS   = { a: "#22c55e", b: "#84cc16", c: "#eab308", d: "#f97316", f: "#ef4444", ungraded: "rgba(255,255,255,0.15)" };

export function cellColor(pct) {
  if (pct == null) return "rgba(255,255,255,0.04)";
  if (pct >= 90) return "rgba(34,197,94,0.12)";
  if (pct >= 80) return "rgba(132,204,22,0.10)";
  if (pct >= 70) return "rgba(234,179,8,0.10)";
  if (pct >= 60) return "rgba(249,115,22,0.10)";
  return "rgba(239,68,68,0.12)";
}

export function pctText(pct) { return pct == null ? "—" : `${Math.round(pct)}%`; }
