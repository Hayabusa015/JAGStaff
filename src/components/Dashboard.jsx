import { useState, useEffect } from "react";
import { GOLD } from "../constants.js";
import { useInfractions, useGmenRequests, useLateArrivals, useBellSchedule, currentPeriodInfo } from "../supabase.js";

function fmtDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function fmtTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function DashTripCard({ trip }) {
  const [open, setOpen] = useState(false);
  const d = trip.date ? new Date(trip.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
  return (
    <div className="card" style={{ marginBottom: "0.5rem", padding: "0.75rem" }}>
      <div className="flex items-center justify-between">
        <div>
          <span className="tag tag-amber" style={{ marginRight: "0.4rem" }}>{trip.type}</span>
          <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{trip.title}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>
          {open ? "▲" : "▼"}
        </button>
      </div>
      <div className="text-muted mt1">{trip.teacher}{trip.teacher ? " · " : ""}{d}{trip.depart ? ` · ${trip.depart}${trip.returnTime ? `–${trip.returnTime}` : ""}` : ""}</div>
      {open && (
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1rem" }}>
          {trip.students.length === 0 && <li style={{ fontSize: "0.8rem" }} className="text-muted">No students listed.</li>}
          {trip.students.map((s, i) => (
            <li key={i} style={{ fontSize: "0.8rem" }}>{s.name}{s.grade ? <span className="tag tag-amber" style={{ marginLeft: "0.35rem" }}>{s.grade}</span> : null}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ESCALATION_THRESHOLD = 3;

const TICKER_TRIP_TYPES = ["Field Trip", "Early Release", "Late Start"];

function EventTicker({ events, tripRosters }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function fmtEventDate(dateStr, timeStr) {
    const d = new Date(dateStr + "T12:00:00");
    const diffDays = Math.round((d - today) / 86400000);
    const label = diffDays === 0 ? "TODAY" : diffDays === 1 ? "TOMORROW" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return timeStr ? `${label} @ ${new Date("1970-01-01T" + timeStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : label;
  }

  // Weekly events (Early Release, etc. already in here too)
  const upcomingEvents = events
    .filter(e => e.date && new Date(e.date + "T12:00:00") >= today)
    .map(e => ({ key: "ev-" + e.id, type: e.type, title: e.title, date: e.date, time: e.time || "", accent: e.type === "Early Release" || e.type === "Late Start" ? "orange" : "gold" }));

  // Trip rosters — field trips and early releases not already in weekly events
  const upcomingTrips = (tripRosters || [])
    .filter(t => t.date && new Date(t.date + "T12:00:00") >= today && TICKER_TRIP_TYPES.includes(t.type))
    .map(t => ({ key: "tr-" + t.id, type: t.type, title: t.title + (t.teacher ? ` · ${t.teacher}` : ""), date: t.date, time: t.depart || "", accent: t.type === "Field Trip" ? "blue" : "orange" }));

  const upcoming = [...upcomingEvents, ...upcomingTrips]
    .sort((a, b) => new Date(a.date + "T12:00:00") - new Date(b.date + "T12:00:00"))
    .slice(0, 8);

  if (upcoming.length === 0) return null;

  const accentColors = {
    gold:   { bg: "rgba(245,192,37,0.15)",  border: "rgba(245,192,37,0.35)",  text: GOLD },
    orange: { bg: "rgba(251,146,60,0.15)",  border: "rgba(251,146,60,0.35)",  text: "#fb923c" },
    blue:   { bg: "rgba(96,165,250,0.15)",  border: "rgba(96,165,250,0.35)",  text: "#60a5fa" },
  };

  // Repeat enough times so the track always spans well beyond the viewport.
  // We need two identical halves for the -50% seamless loop trick.
  const minReps = Math.max(2, Math.ceil(12 / upcoming.length));
  const half = Array.from({ length: minReps }, () => upcoming).flat();
  const items = [...half, ...half]; // two identical halves
  const duration = half.length * 5; // 5s per item

  return (
    <div style={{
      overflow: "hidden",
      background: "linear-gradient(90deg, #000 0%, #111 20%, #111 80%, #000 100%)",
      borderTop: `1px solid rgba(245,192,37,0.3)`,
      borderBottom: `1px solid rgba(245,192,37,0.3)`,
      position: "relative",
      marginBottom: "1rem",
      borderRadius: 8,
    }}>
      {/* Fade edges */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 60, background: "linear-gradient(90deg, #000, transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 60, background: "linear-gradient(270deg, #000, transparent)", zIndex: 2, pointerEvents: "none" }} />

      <div style={{
        display: "inline-flex",
        animation: `ticker-scroll ${duration}s linear infinite`,
        whiteSpace: "nowrap",
        padding: "0.45rem 0",
        willChange: "transform",
      }}>
        {items.map((e, i) => {
          const ac = accentColors[e.accent] || accentColors.gold;
          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", paddingRight: "4rem" }}>
              <span style={{
                background: ac.bg, border: `1px solid ${ac.border}`,
                borderRadius: 4, padding: "0.1rem 0.45rem",
                fontSize: "0.63rem", fontWeight: 800, color: ac.text,
                letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0,
              }}>{e.type}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#fff" }}>{e.title}</span>
              <span style={{ fontSize: "0.7rem", color: ac.text, opacity: 0.8, fontWeight: 700, flexShrink: 0 }}>
                {fmtEventDate(e.date, e.time)}
              </span>
              <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "0.7rem" }}>◆</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard({ alerts, setAlerts, weeklyEvents, tripRosters, user }) {
  const { infractions } = useInfractions();
  const { requests: gmenRequests, markArrived: markArrivedDB } = useGmenRequests();
  const { arrivals: lateArrivals, confirmArrival } = useLateArrivals();
  const { periods } = useBellSchedule();
  const [now, setNow] = useState({ date: fmtDate(), time: fmtTime() });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => { setNow({ date: fmtDate(), time: fmtTime() }); setTick(t => t + 1); }, 30000);
    return () => clearInterval(id);
  }, []);

  const periodInfo = currentPeriodInfo(periods);

  const pending = gmenRequests.filter(r => !r.arrived);
  const arrived = gmenRequests.filter(r => r.arrived);

  async function markArrived(id) {
    await markArrivedDB(id);
    setAlerts(a => a.filter(x => x.gmenId !== id));
  }

  return (
    <div>
      {/* Header */}
      <div className="card mb2" style={{ background: "#111", color: "#fff" }}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Command Center</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "0.2rem" }}>{now.date}</div>
            <div style={{ color: GOLD, fontWeight: 800, fontSize: "1.4rem" }}>{now.time}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            {periodInfo?.status === "in" ? (
              <div style={{ background: GOLD, color: "#1a1200", borderRadius: 10, padding: "0.4rem 0.9rem", fontWeight: 800 }}>
                <div style={{ fontSize: "0.9rem" }}>{periodInfo.period.name}</div>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, opacity: 0.75 }}>
                  {periodInfo.remaining} min remaining
                </div>
              </div>
            ) : periodInfo?.status === "before" ? (
              <div style={{ background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.4)", color: "#60a5fa", borderRadius: 10, padding: "0.4rem 0.9rem", fontWeight: 800 }}>
                <div style={{ fontSize: "0.9rem" }}>{periodInfo.next.name} next</div>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, opacity: 0.8 }}>in {periodInfo.until} min</div>
              </div>
            ) : (
              <div style={{ background: GOLD, color: "#1a1200", borderRadius: "999px", padding: "0.3rem 0.9rem", fontSize: "0.75rem", fontWeight: 800 }}>
                {periodInfo?.status === "after" ? "DAY ENDED" : "SCHOOL DAY"}
              </div>
            )}
          </div>
        </div>
      </div>

      <EventTicker events={weeklyEvents} tripRosters={tripRosters} />

      {/* Intervention Alerts */}
      {alerts.length > 0 && (
        <div className="card mb2" style={{ borderLeft: "4px solid #dc2626" }}>
          <div className="flex items-center gap1 mb1">
            <span className="pulse-dot" />
            <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#dc2626" }}>
              Intervention Alerts
            </span>
          </div>
          {alerts.map(a => (
            <div key={a.id} className="flex items-center justify-between" style={{ padding: "0.4rem 0", borderBottom: "1px solid rgba(200,200,200,0.2)" }}>
              <span style={{ fontWeight: 600 }}>{a.student}</span>
              <span className="text-muted">Requested by {a.teacher}</span>
              <span className="tag tag-red">Pending</span>
            </div>
          ))}
        </div>
      )}
      {alerts.length === 0 && (
        <div className="card mb2" style={{ borderLeft: "4px solid #16a34a" }}>
          <span className="text-green bold" style={{ fontSize: "0.85rem" }}>✓ All students accounted for — no active alerts.</span>
        </div>
      )}

      {/* Late Arrivals */}
      {lateArrivals.length > 0 && (
        <div className="card mb2" style={{ borderLeft: "4px solid #f59e0b" }}>
          <div className="flex items-center gap1 mb1">
            <span className="pulse-dot" style={{ background: "#f59e0b" }} />
            <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f59e0b" }}>
              🕐 Late Arrivals Today — {lateArrivals.length} student{lateArrivals.length !== 1 ? "s" : ""}
            </span>
          </div>
          {lateArrivals.map(a => (
            <div key={a.id} className="flex items-center justify-between" style={{ padding: "0.4rem 0", borderBottom: "1px solid rgba(200,200,200,0.15)" }}>
              <div>
                <span style={{ fontWeight: 600 }}>{a.student_name}</span>
                <span className="text-muted" style={{ marginLeft: "0.5rem", fontSize: "0.78rem" }}>
                  arrived {new Date(a.arrived_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  {a.notes ? ` · ${a.notes}` : ""}
                </span>
              </div>
              {a.confirmed_by
                ? <span className="tag tag-green">✓ {a.confirmed_by}</span>
                : <button className="btn btn-primary btn-sm" onClick={() => confirmArrival(a.id, user?.name || "Teacher")}>✓ Entered Class</button>
              }
            </div>
          ))}
        </div>
      )}

      {/* G-Men Requests */}
      {gmenRequests.length > 0 && (
        <div className="card mb2" style={{ background: "#1a1200" }}>
          <div className="section-title section-title-gold">G-Men Period · Today's Requests</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {pending.slice(0, 4).map(r => (
              <div key={r.id} style={{
                width: 44, height: 44, borderRadius: "50%", background: GOLD,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "0.85rem", color: "#1a1200",
              }}>
                {r.student.firstName[0]}{r.student.lastName[0]}
              </div>
            ))}
            {pending.length > 4 && (
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", fontWeight: 700 }}>
                +{pending.length - 4}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {pending.map(r => (
              <button key={r.id} className="btn btn-primary btn-sm" onClick={() => markArrived(r.id)}>
                ✓ {r.student.firstName} Arrived
              </button>
            ))}
          </div>
          {arrived.length > 0 && (
            <div className="mt1 text-muted" style={{ fontSize: "0.75rem" }}>
              {arrived.length} arrived: {arrived.map(r => r.student.firstName).join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Escalation Watch */}
      {(() => {
        const cutoff = Date.now() - 7 * 86400000;
        const map = {};
        infractions.forEach(r => {
          if (new Date(r.created_at).getTime() < cutoff) return;
          if (!map[r.student_id]) map[r.student_id] = { name: r.student_name, count: 0 };
          map[r.student_id].count++;
        });
        const watchList = Object.entries(map).filter(([, v]) => v.count >= ESCALATION_THRESHOLD).sort((a, b) => b[1].count - a[1].count);
        if (!watchList.length) return null;
        return (
          <div className="card mb2" style={{ borderLeft: "4px solid #f97316" }}>
            <div className="flex items-center gap1 mb1">
              <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f97316" }}>
                ⚠ Infraction Escalation Watch
              </span>
            </div>
            {watchList.map(([sid, { name, count }]) => (
              <div key={sid} className="flex items-center justify-between" style={{ padding: "0.3rem 0", borderBottom: "1px solid rgba(200,200,200,0.15)" }}>
                <span style={{ fontWeight: 600 }}>{name}</span>
                <span className="tag tag-red">{count} this week — consider PBIS referral</span>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="grid2">
        {/* Weekly Events */}
        <div className="card">
          <div className="section-title">This Week — Important Events</div>
          {weeklyEvents.length === 0 && <p className="text-muted">No events scheduled.</p>}
          {weeklyEvents.map(ev => {
            const tagClass = ev.type === "Fire Drill" ? "tag-red" : ev.type === "State Test" || ev.type === "ACT" ? "tag-blue" : ev.type === "Field Trip" ? "tag-amber" : "tag-gold";
            const d = ev.date ? new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
            return (
              <div key={ev.id} style={{ marginBottom: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(200,200,200,0.2)" }}>
                <div className="flex items-center gap1 mb1">
                  <span className={`tag ${tagClass}`}>{ev.type}</span>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{ev.title}</span>
                </div>
                <div className="text-muted">{d}{ev.time ? ` · ${ev.time}` : ""}</div>
                {ev.details && <div className="text-muted">{ev.details}</div>}
              </div>
            );
          })}
        </div>

        {/* Trip Rosters */}
        <div className="card">
          <div className="section-title">Field Trips &amp; Early Releases</div>
          {tripRosters.length === 0 && <p className="text-muted">No trips on record.</p>}
          {tripRosters.map(trip => <DashTripCard key={trip.id} trip={trip} />)}
        </div>
      </div>
    </div>
  );
}
