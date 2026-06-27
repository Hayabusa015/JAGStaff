// Small inline trend indicator (↑ / ↓ / →) used in grade tables and report cards.
export default function TrendArrow({ trend, belowPassing }) {
  if (!trend || trend.delta == null || trend.direction === "flat") return null;
  const up = trend.direction === "up";
  return (
    <span
      title={`${up ? "Trending up" : "Trending down"} ${Math.abs(Math.round(trend.delta))} pts`}
      style={{ fontSize: "0.72rem", fontWeight: 700, color: up ? "#22c55e" : "#ef4444", marginLeft: 4 }}
    >
      {up ? "▲" : "▼"}{!up && belowPassing ? " 🚩" : ""}
    </span>
  );
}
