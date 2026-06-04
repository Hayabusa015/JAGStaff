import { useState, useEffect } from "react";
import { GOLD, SEED_ELECTIVES } from "../constants.js";
import { useGmenRequests } from "../supabase.js";

function initials(s) { return `${s.firstName[0]}${s.lastName[0]}`; }
function fmtTime() { return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }); }
function fmtDateLong() { return new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); }

function KioskDisplay({ requests, setRequests, onClose }) {
  const [time, setTime] = useState(fmtTime());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => { setTime(fmtTime()); setTick(t => t+1); }, 30000);
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

  return (
    <div className="kiosk-overlay" style={{ color: "#fff", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: "#1a1200", borderBottom: `2px solid ${GOLD}`, padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="flex items-center gap2">
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#1a1200", fontSize: "1.1rem" }}>G</div>
          <div>
            <div style={{ fontWeight: 900, letterSpacing: "0.1em", fontSize: "0.9rem" }}>G-MEN ENRICHMENT PERIOD</div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>12:40–1:10 PM · {fmtDateLong()}</div>
          </div>
        </div>
        <div className="flex items-center gap2">
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: GOLD }}>{time}</div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)" }}>{pending.length} pending · {arrived.length} arrived</div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.2)" }} onClick={onClose}>Close</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
        {pending.length === 0 && arrived.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "4rem" }}>
            <div style={{ fontSize: "4rem" }}>🕵️</div>
            <div style={{ fontWeight: 900, fontSize: "1.5rem", letterSpacing: "0.1em", marginTop: "1rem" }}>NO STUDENTS REQUESTED YET</div>
            <div style={{ color: "rgba(255,255,255,0.45)", marginTop: "0.5rem" }}>Use the G-Men Period tab to request students.</div>
          </div>
        ) : (
          <>
            {Object.entries(byTeacher).map(([teacher, students]) => (
              <div key={teacher} style={{ marginBottom: "2rem" }}>
                <div className="flex items-center gap2 mb1">
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8rem" }}>
                    {teacher.split(" ").map(w => w[0]).join("").slice(0,2)}
                  </div>
                  <span style={{ fontWeight: 700, letterSpacing: "0.05em" }}>{teacher}</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>{students.length} student{students.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
                  {students.map(r => (
                    <div key={r.id} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${GOLD}40`, borderRadius: "10px", padding: "1rem", textAlign: "center" }}>
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: GOLD, margin: "0 auto 0.5rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#1a1200", fontSize: "1rem" }}>
                        {initials(r.student)}
                      </div>
                      <div style={{ fontWeight: 700 }}>{r.student.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: "0.25rem" }}>Grade {r.student.grade}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {arrived.length > 0 && (
              <div>
                <div style={{ color: "#16a34a", fontWeight: 800, letterSpacing: "0.1em", marginBottom: "0.75rem" }}>✓ ARRIVED ({arrived.length})</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {arrived.map(r => (
                    <div key={r.id} style={{ background: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.3)", borderRadius: "999px", padding: "0.3rem 0.75rem", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem" }}>
                      <span style={{ background: "#16a34a", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>{initials(r.student)}</span>
                      {r.student.name} ✓
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ticker */}
      <div style={{ background: "#1a1200", borderTop: `1px solid ${GOLD}40`, padding: "0.5rem 1.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em" }}>
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

  if (kioskMode) return <KioskDisplay requests={gmenRequests} setRequests={() => {}} onClose={() => setKioskMode(false)} />;

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
