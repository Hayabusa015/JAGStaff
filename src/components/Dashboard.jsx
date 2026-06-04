import { useState, useEffect } from "react";
import { GOLD } from "../constants.js";

function fmtDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function fmtTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function Dashboard({ alerts, setAlerts, gmenRequests, setGmenRequests, weeklyEvents, tripRosters }) {
  const [now, setNow] = useState({ date: fmtDate(), time: fmtTime() });
  useEffect(() => {
    const id = setInterval(() => setNow({ date: fmtDate(), time: fmtTime() }), 30000);
    return () => clearInterval(id);
  }, []);

  const pending = gmenRequests.filter(r => !r.arrived);
  const arrived = gmenRequests.filter(r => r.arrived);

  function markArrived(id) {
    setGmenRequests(r => r.map(x => x.id === id ? { ...x, arrived: true } : x));
    setAlerts(a => a.filter(x => x.gmenId !== id));
  }

  return (
    <div>
      {/* Header */}
      <div className="card mb2" style={{ background: "#1a1200", color: "#fff" }}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Command Center</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "0.2rem" }}>{now.date}</div>
            <div style={{ color: GOLD, fontWeight: 800, fontSize: "1.4rem" }}>{now.time}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ background: GOLD, color: "#1a1200", borderRadius: "999px", padding: "0.3rem 0.9rem", fontSize: "0.75rem", fontWeight: 800 }}>
              SCHOOL DAY
            </div>
          </div>
        </div>
      </div>

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
          {tripRosters.map(trip => {
            const [open, setOpen] = useState(false);
            const d = trip.date ? new Date(trip.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
            return (
              <div key={trip.id} className="card" style={{ marginBottom: "0.5rem", padding: "0.75rem" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="tag tag-amber" style={{ marginRight: "0.4rem" }}>{trip.type}</span>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{trip.title}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>
                    {open ? "▲" : "▼"}
                  </button>
                </div>
                <div className="text-muted mt1">{trip.teacher} · {d} · {trip.depart}–{trip.returnTime}</div>
                {open && trip.students.length > 0 && (
                  <ul style={{ marginTop: "0.5rem", paddingLeft: "1rem" }}>
                    {trip.students.map((s, i) => (
                      <li key={i} style={{ fontSize: "0.8rem" }}>{s.name} <span className="tag tag-amber">{s.grade}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
