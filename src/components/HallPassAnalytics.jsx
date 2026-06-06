import { useMemo } from "react";
import { GOLD, DESTINATIONS } from "../constants.js";

const DEST_ICON = Object.fromEntries(DESTINATIONS.map(d => [d.key, d.icon]));
const DAY_MS = 86400000;
const WEEKDAYS = [
  { idx: 1, label: "Mon" },
  { idx: 2, label: "Tue" },
  { idx: 3, label: "Wed" },
  { idx: 4, label: "Thu" },
  { idx: 5, label: "Fri" },
];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmtHour(h) {
  const period = h >= 12 ? "p" : "a";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${period}`;
}

export default function HallPassAnalytics({ log, settings }) {
  const a = useMemo(() => {
    const now = new Date();
    const byDay = [0, 0, 0, 0, 0, 0, 0];
    const byHour = {};
    const byDest = {};
    const last7 = {};
    const prev7 = {};
    const allTime = {};
    let totalMin = 0, withDuration = 0, longest = null;

    log.forEach(p => {
      const t = p.outTime ? new Date(p.outTime) : null;
      if (t && !isNaN(t)) {
        byDay[t.getDay()]++;
        const h = t.getHours();
        byHour[h] = (byHour[h] || 0) + 1;
        const age = now - t;
        if (age <= 7 * DAY_MS) {
          (last7[p.studentId] ||= { name: p.studentName, count: 0 }).count++;
        } else if (age <= 14 * DAY_MS) {
          (prev7[p.studentId] ||= { name: p.studentName, count: 0 }).count++;
        }
      }
      if (p.destination) byDest[p.destination] = (byDest[p.destination] || 0) + 1;

      (allTime[p.studentId] ||= { name: p.studentName, count: 0, totalMin: 0 });
      allTime[p.studentId].count++;
      allTime[p.studentId].totalMin += p.duration || 0;

      if (p.duration != null) {
        totalMin += p.duration;
        withDuration++;
        if (!longest || p.duration > longest.duration) longest = p;
      }
    });

    const ids = new Set([...Object.keys(last7), ...Object.keys(prev7)]);
    const trends = [...ids].map(id => {
      const cur = last7[id]?.count || 0;
      const prev = prev7[id]?.count || 0;
      return { id, name: last7[id]?.name || prev7[id]?.name, cur, prev, delta: cur - prev };
    });
    const trendingUp = trends.filter(t => t.delta > 0).sort((x, y) => y.delta - x.delta).slice(0, 5);
    const trendingDown = trends.filter(t => t.delta < 0).sort((x, y) => x.delta - y.delta).slice(0, 5);

    const destRows = Object.entries(byDest).sort((x, y) => y[1] - x[1]);
    const topFlyers = Object.entries(allTime).sort((x, y) => y[1].count - x[1].count).slice(0, 6);
    const avgMin = withDuration ? Math.round(totalMin / withDuration) : null;

    const busiestDayIdx = byDay.indexOf(Math.max(...byDay));
    const topDest = destRows[0]?.[0] || null;

    return { byDay, byHour, destRows, trendingUp, trendingDown, topFlyers, avgMin, longest, total: log.length, busiestDayIdx, topDest };
  }, [log]);

  if (a.total === 0) {
    return (
      <div className="card">
        <div className="section-title">Hall Pass Analytics</div>
        <p className="text-muted">No pass data yet. Charts will appear here as passes are logged.</p>
      </div>
    );
  }

  const flagAfter = settings?.flagAfter || 10;
  const maxDay = Math.max(1, ...WEEKDAYS.map(d => a.byDay[d.idx]));
  const hourKeys = Object.keys(a.byHour).map(Number);
  const minH = hourKeys.length ? Math.min(...hourKeys, 7) : 7;
  const maxH = hourKeys.length ? Math.max(...hourKeys, 14) : 14;
  const hours = [];
  for (let h = minH; h <= maxH; h++) hours.push(h);
  const maxHourCount = Math.max(1, ...hours.map(h => a.byHour[h] || 0));
  const maxDest = Math.max(1, ...a.destRows.map(d => d[1]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* ── Summary stat strip ──────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" }}>
        <StatTile label="Total Passes" value={a.total} />
        <StatTile label="Avg Duration" value={a.avgMin != null ? `${a.avgMin} min` : "—"} />
        <StatTile label="Top Destination" value={a.topDest ? `${DEST_ICON[a.topDest] || ""} ${a.topDest}` : "—"} small />
        <StatTile label="Busiest Day" value={a.byDay[a.busiestDayIdx] > 0 ? DAY_FULL[a.busiestDayIdx] : "—"} small />
      </div>

      {/* ── Row: Day of week + Destinations ─────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

        {/* Passes by Day of Week */}
        <div className="card">
          <div className="section-title">Passes by Day of Week</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: 150, gap: "0.5rem", paddingTop: "0.5rem" }}>
            {WEEKDAYS.map(d => {
              const count = a.byDay[d.idx];
              const pct = (count / maxDay) * 100;
              const isMax = d.idx === a.busiestDayIdx && count > 0;
              return (
                <div key={d.idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: count > 0 ? "#fff" : "rgba(255,255,255,0.25)", marginBottom: 3 }}>{count}</div>
                  <div style={{
                    width: "100%", maxWidth: 42, height: `${Math.max(pct, count > 0 ? 6 : 1)}%`,
                    borderRadius: "5px 5px 0 0",
                    background: isMax ? `linear-gradient(180deg, ${GOLD}, #c99a00)` : "rgba(245,192,37,0.35)",
                    transition: "height 0.4s ease", minHeight: count > 0 ? 6 : 2,
                  }} />
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: 5, fontWeight: 600 }}>{d.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Where Students Go */}
        <div className="card">
          <div className="section-title">Where Students Go</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", paddingTop: "0.25rem" }}>
            {a.destRows.map(([dest, count]) => {
              const pct = Math.round((count / a.total) * 100);
              const barPct = (count / maxDest) * 100;
              return (
                <div key={dest} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{ width: 92, flexShrink: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <span>{DEST_ICON[dest] || "📍"}</span>{dest}
                  </div>
                  <div style={{ flex: 1, height: 16, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${barPct}%`, background: `linear-gradient(90deg, ${GOLD}, rgba(245,192,37,0.5))`, borderRadius: 4, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ width: 64, flexShrink: 0, textAlign: "right", fontSize: "0.76rem", color: "rgba(255,255,255,0.5)" }}>
                    <strong style={{ color: "#fff" }}>{count}</strong> · {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Row: Trending Up / Down ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <TrendList
          title="Trending Up"
          subtitle="More passes than last week — worth a look"
          color="#fb923c"
          arrow="▲"
          rows={a.trendingUp}
        />
        <TrendList
          title="Trending Down"
          subtitle="Fewer passes than last week — improving"
          color="#22c55e"
          arrow="▼"
          rows={a.trendingDown}
        />
      </div>

      {/* ── Row: Busiest times + Frequent flyers ────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

        {/* Busiest Times of Day */}
        <div className="card">
          <div className="section-title">Busiest Times of Day</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: 130, gap: "0.3rem", paddingTop: "0.5rem" }}>
            {hours.map(h => {
              const count = a.byHour[h] || 0;
              const pct = (count / maxHourCount) * 100;
              return (
                <div key={h} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: count > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", marginBottom: 2 }}>{count || ""}</div>
                  <div style={{
                    width: "100%", maxWidth: 26, height: `${Math.max(pct, count > 0 ? 5 : 1)}%`,
                    borderRadius: "4px 4px 0 0",
                    background: count > 0 ? "rgba(96,165,250,0.6)" : "rgba(255,255,255,0.05)",
                    transition: "height 0.4s ease", minHeight: count > 0 ? 5 : 2,
                  }} />
                  <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{fmtHour(h)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Frequent Flyers */}
        <div className="card">
          <div className="section-title">Frequent Flyers · All Time</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", paddingTop: "0.25rem" }}>
            {a.topFlyers.map(([id, d], i) => (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.3rem 0", borderBottom: i < a.topFlyers.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: i === 0 ? GOLD : "rgba(255,255,255,0.08)", color: i === 0 ? "#000" : "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800 }}>{i + 1}</div>
                <div style={{ flex: 1, fontWeight: 600, fontSize: "0.85rem" }}>{d.name}</div>
                <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.4)" }}>{d.totalMin} min</div>
                <span className={`tag ${d.count >= 5 ? "tag-red" : "tag-gold"}`} style={{ fontSize: "0.68rem" }}>{d.count} passes</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {a.longest && (
        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", textAlign: "center", paddingBottom: "0.25rem" }}>
          Longest single trip: <strong style={{ color: a.longest.duration > flagAfter ? "#ef4444" : "rgba(255,255,255,0.6)" }}>{a.longest.studentName} · {a.longest.duration} min</strong> to {a.longest.destination}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, small }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "0.85rem 0.5rem" }}>
      <div style={{ fontSize: small ? "1rem" : "1.6rem", fontWeight: 800, color: GOLD, lineHeight: 1.2 }}>{value}</div>
      <div className="stat-label" style={{ marginTop: 3 }}>{label}</div>
    </div>
  );
}

function TrendList({ title, subtitle, color, arrow, rows }) {
  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginBottom: "0.75rem" }}>{subtitle}</div>
      {rows.length === 0 ? (
        <p className="text-muted" style={{ fontSize: "0.82rem" }}>Not enough data yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {rows.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.3rem 0" }}>
              <span style={{ color, fontWeight: 800, fontSize: "0.8rem", width: 16 }}>{arrow}</span>
              <div style={{ flex: 1, fontWeight: 600, fontSize: "0.85rem" }}>{t.name}</div>
              <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.4)" }}>
                {t.prev} → <strong style={{ color: "#fff" }}>{t.cur}</strong>
              </div>
              <span style={{ color, fontWeight: 700, fontSize: "0.78rem", width: 32, textAlign: "right" }}>
                {t.delta > 0 ? "+" : ""}{t.delta}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
