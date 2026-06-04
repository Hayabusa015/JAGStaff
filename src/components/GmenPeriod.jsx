import { useState, useEffect } from "react";
import { GOLD, SEED_ELECTIVES } from "../constants.js";
import { useGmenRequests } from "../supabase.js";

function initials(s) { return `${s.firstName[0]}${s.lastName[0]}`; }
function fmtTime() { return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }); }
function fmtDateLong() { return new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); }

function fmtClockDisplay() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDay() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function KioskDisplay({ requests, onClose }) {
  const [clock, setClock] = useState(fmtClockDisplay());

  useEffect(() => {
    const id = setInterval(() => setClock(fmtClockDisplay()), 10000);
    return () => clearInterval(id);
  }, []);

  const pending = requests.filter(r => !r.arrived);
  const arrived = requests.filter(r => r.arrived);

  const byTeacher = {};
  pending.forEach(r => {
    const key = r.requestedBy || "Unknown";
    if (!byTeacher[key]) byTeacher[key] = [];
    byTeacher[key].push(r);
  });

  const teacherInitials = name => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0800", color: "#fff", display: "flex", flexDirection: "column", fontFamily: "inherit", zIndex: 1000 }}>

      {/* Watermark */}
      <img src="/logo.png" alt="" aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(70vw,600px)", opacity: 0.06, pointerEvents: "none", userSelect: "none" }} />

      {/* Header */}
      <div style={{ background: "#0f0a00", borderBottom: `2px solid ${GOLD}`, padding: "0 1.5rem", height: 80, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, zIndex: 1 }}>
        {/* Left: logo + title */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <img src="/logo.png" alt="G-Men" style={{ height: 52, width: 52, objectFit: "contain" }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.15rem", letterSpacing: "0.12em", color: GOLD, lineHeight: 1.1 }}>G-MEN ENRICHMENT PERIOD</div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em" }}>JAMES A. GARFIELD HIGH SCHOOL</div>
          </div>
        </div>

        {/* Center: clock */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.8rem", fontWeight: 900, color: GOLD, lineHeight: 1, letterSpacing: "0.04em" }}>{clock}</div>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginTop: "0.15rem" }}>{fmtDay()}</div>
        </div>

        {/* Right: stat bubbles + close */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: GOLD, lineHeight: 1 }}>{pending.length}</div>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>REQUESTED</div>
          </div>
          <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#4ade80", lineHeight: 1 }}>{arrived.length}</div>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>ARRIVED</div>
          </div>
          <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.12)" }} />
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "rgba(255,255,255,0.7)", padding: "0.45rem 1rem", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            🔒 Close
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2rem 2.5rem", zIndex: 1 }}>
        {pending.length === 0 && arrived.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "6rem" }}>
            <div style={{ fontSize: "5rem", marginBottom: "1rem" }}>🕵️</div>
            <div style={{ fontWeight: 900, fontSize: "1.8rem", letterSpacing: "0.12em", color: GOLD }}>NO STUDENTS REQUESTED YET</div>
            <div style={{ color: "rgba(255,255,255,0.4)", marginTop: "0.75rem", fontSize: "1rem" }}>Use the G-Men Period tab to request students for remediation.</div>
          </div>
        ) : (
          <>
            {Object.entries(byTeacher).map(([teacher, studs]) => (
              <div key={teacher} style={{ marginBottom: "2.5rem" }}>
                {/* Teacher row */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${GOLD}25`, border: `1px solid ${GOLD}60`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.8rem", color: GOLD, flexShrink: 0 }}>
                    {teacherInitials(teacher)}
                  </div>
                  <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "0.08em", color: GOLD, textTransform: "uppercase" }}>Requested by {teacher}</span>
                  <div style={{ flex: 1, height: 1, background: `${GOLD}30` }} />
                  <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{studs.length} Student{studs.length !== 1 ? "s" : ""}</span>
                </div>
                {/* Student cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: "1rem" }}>
                  {studs.map(r => (
                    <div key={r.id} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}35`, borderRadius: "14px", padding: "1.25rem 1rem", textAlign: "center", backdropFilter: "blur(4px)" }}>
                      <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${GOLD}22`, border: `2px solid ${GOLD}`, margin: "0 auto 0.75rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: GOLD, fontSize: "1.2rem" }}>
                        {initials(r.student)}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>{r.student.name}</div>
                      {r.student.grade && (
                        <div style={{ display: "inline-block", background: `${GOLD}25`, border: `1px solid ${GOLD}50`, borderRadius: "999px", padding: "0.15rem 0.6rem", fontSize: "0.75rem", color: GOLD, fontWeight: 700, marginTop: "0.4rem" }}>{r.student.grade}</div>
                      )}
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginTop: "0.5rem" }}>Requested {r.requestedAt}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {arrived.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "0.08em", color: "#4ade80", textTransform: "uppercase" }}>✓ Arrived</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(74,222,128,0.2)" }} />
                  <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>{arrived.length}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
                  {arrived.map(r => (
                    <div key={r.id} style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "999px", padding: "0.35rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                      <span style={{ background: "#16a34a", color: "#fff", borderRadius: "50%", width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800 }}>{initials(r.student)}</span>
                      <span style={{ fontWeight: 600 }}>{r.student.name}</span>
                      <span style={{ color: "#4ade80" }}>✓</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer ticker */}
      <div style={{ background: "#0f0a00", borderTop: `1px solid ${GOLD}25`, padding: "0.5rem 1.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", flexShrink: 0, zIndex: 1 }}>
        <span>GARFIELD G-MEN · ENRICHMENT PERIOD · 12:40–1:10 PM</span>
        <span>{pending.length} pending · {arrived.length} arrived · {requests.length} total</span>
      </div>
    </div>
  );
}

export default function GmenPeriod({ setAlerts, students, user }) {
  const { requests: gmenRequests, addRequest: addRequestDB, markArrived: markArrivedDB } = useGmenRequests();
  const [activeDay, setActiveDay] = useState("Tuesday");
  const [electives] = useState(SEED_ELECTIVES);
  const [search, setSearch] = useState("");
  const [kioskMode, setKioskMode] = useState(false);

  const days = ["Tuesday", "Wednesday", "Thursday"];
  const dayElectives = electives.filter(e => e.day === activeDay);

  const results = search.trim().length > 0
    ? students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  async function addRequest(student) {
    if (gmenRequests.find(r => r.student.id === student.id)) return;
    const teacherName = user?.name || "Staff";
    const id = await addRequestDB(student, teacherName);
    setAlerts(a => [...a, { id, gmenId: id, student: `${student.firstName} ${student.lastName}`, teacher: teacherName }]);
    setSearch("");
  }

  async function markArrived(id) {
    await markArrivedDB(id);
    setAlerts(a => a.filter(x => x.gmenId !== id));
  }

  const pending = gmenRequests.filter(r => !r.arrived);
  const arrived = gmenRequests.filter(r => r.arrived);

  if (kioskMode) return <KioskDisplay requests={gmenRequests} onClose={() => setKioskMode(false)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb2">
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem" }}>G-Men Enrichment Period</h2>
          <div className="text-muted">12:40–1:10 PM · Tue / Wed / Thu</div>
        </div>
        <button className="btn btn-primary" onClick={() => setKioskMode(true)}>📺 Launch Projector Display</button>
      </div>

      {/* Day Selector + Electives */}
      <div className="card mb2">
        <div className="section-title">Elective Offerings</div>
        <div className="flex gap1 mb2">
          {days.map(d => (
            <button key={d} className={`btn btn-sm ${activeDay === d ? "btn-primary" : "btn-ghost"}`} onClick={() => setActiveDay(d)}>{d}</button>
          ))}
        </div>
        <div className="grid3">
          {dayElectives.map(el => {
            const full = el.count >= el.max;
            const pct = Math.min(100, Math.round((el.count / el.max) * 100));
            return (
              <div key={el.id} className="card" style={{ padding: "0.75rem" }}>
                <div style={{ fontWeight: 700 }}>{el.title}</div>
                <div className="text-muted" style={{ fontSize: "0.78rem" }}>{el.teacher}</div>
                <div className="flex items-center justify-between mt1">
                  <span className={`tag ${full ? "tag-red" : "tag-green"}`}>{el.count}/{el.max}</span>
                  {full && <span className="tag tag-red">FULL</span>}
                </div>
                <div className="progress-track mt1">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: full ? "#dc2626" : GOLD }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid2">
        {/* Remediation Request */}
        <div className="card">
          <div className="section-title">Remediation Request</div>
          <div style={{ position: "relative" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student name…" />
            {results.length > 0 && (
              <div className="autocomplete-list">
                {results.map(s => (
                  <div key={s.id}
                    onClick={() => addRequest(s)}
                    className="autocomplete-item"
                  >
                    {s.firstName} {s.lastName} <span className="tag tag-amber">{s.grade}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {students.length === 0 && <p className="text-muted mt1" style={{ fontSize: "0.8rem" }}>Import a student roster first.</p>}
        </div>

        {/* Attendance Analytics */}
        <div className="card">
          <div className="section-title">Today's Summary</div>
          <div className="grid2">
            <div style={{ textAlign: "center" }}>
              <div className="stat-num" style={{ color: GOLD }}>{pending.length}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="stat-num" style={{ color: "#16a34a" }}>{arrived.length}</div>
              <div className="stat-label">Arrived</div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Grid */}
      {gmenRequests.length > 0 && (
        <div className="card mt2">
          <div className="section-title">Today's Attendance Grid</div>
          {gmenRequests.map(r => (
            <div key={r.id} className="flex items-center justify-between" style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(200,200,200,0.2)" }}>
              <div className="flex items-center gap1">
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: r.arrived ? "#16a34a" : GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.8rem", color: r.arrived ? "#fff" : "#1a1200" }}>
                  {initials(r.student)}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.student.name}</div>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>Grade {r.student.grade} · {r.requestedBy} · {r.requestedAt}</div>
                </div>
              </div>
              {r.arrived
                ? <span className="tag tag-green">✓ Arrived</span>
                : <button className="btn btn-primary btn-sm" onClick={() => markArrived(r.id)}>Mark Arrived</button>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
