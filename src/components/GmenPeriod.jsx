import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { GOLD } from "../constants.js";
import {
  useGmenRequests, useGmenClasses, useGmenEnrollments,
  useGmenChangeRequests, useGmenSettings, useGmailSend, useBellSchedule,
} from "../supabase.js";

function fmt12(hhmm) {
  if (!hhmm || !hhmm.includes(":")) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ap}`;
}
import GmenClassManager from "./GmenClassManager.jsx";

function initials(s) {
  const f = s?.firstName || s?.name || "";
  const l = s?.lastName || "";
  if (l) return `${f[0] || ""}${l[0] || ""}`.toUpperCase();
  const parts = f.split(" ");
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : (f[0] || "?").toUpperCase();
}
function fmtClockDisplay() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDay() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function todayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

function useFullscreen() {
  const [isFs, setIsFs] = useState(!!document.fullscreenElement);
  useEffect(() => {
    const handler = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  function toggle() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
  return { isFs, toggle };
}

function KioskDisplay({ requests, onClose }) {
  const [clock, setClock] = useState(fmtClockDisplay());
  const { isFs, toggle: toggleFs } = useFullscreen();

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

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "#0a0800", color: "#fff", display: "flex", flexDirection: "column", fontFamily: "inherit", zIndex: 1000 }}>
      <img src="/logo.png" alt="" aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(70vw,600px)", opacity: 0.06, pointerEvents: "none", userSelect: "none" }} />
      <div style={{ background: "#0f0a00", borderBottom: `2px solid ${GOLD}`, padding: "0 1.5rem", height: 80, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <img src="/logo.png" alt="G-Men" style={{ height: 52, width: 52, objectFit: "contain" }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.15rem", letterSpacing: "0.12em", color: GOLD, lineHeight: 1.1 }}>G-MEN ENRICHMENT PERIOD</div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em" }}>JAMES A. GARFIELD HIGH SCHOOL</div>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.8rem", fontWeight: 900, color: GOLD, lineHeight: 1, letterSpacing: "0.04em" }}>{clock}</div>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginTop: "0.15rem" }}>{fmtDay()}</div>
        </div>
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
          <button onClick={toggleFs} title={isFs ? "Exit Fullscreen" : "Fullscreen"} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "rgba(255,255,255,0.6)", padding: "0.45rem 0.7rem", cursor: "pointer", display: "flex", alignItems: "center" }}>
            {isFs
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V3h4"/><path d="M21 7V3h-4"/><path d="M3 17v4h4"/><path d="M21 17v4h-4"/></svg>
            }
          </button>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "rgba(255,255,255,0.7)", padding: "0.45rem 1rem", cursor: "pointer", fontWeight: 600 }}>
            🔒 Close
          </button>
        </div>
      </div>
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${GOLD}25`, border: `1px solid ${GOLD}60`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.8rem", color: GOLD, flexShrink: 0 }}>
                    {teacherInitials(teacher)}
                  </div>
                  <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "0.08em", color: GOLD, textTransform: "uppercase" }}>Requested by {teacher}</span>
                  <div style={{ flex: 1, height: 1, background: `${GOLD}30` }} />
                  <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{studs.length} Student{studs.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px,1fr))", gap: "1rem" }}>
                  {studs.map(r => (
                    <div key={r.id} style={{ background: "rgba(255,255,255,0.10)", border: `2px solid ${GOLD}`, borderRadius: "14px", padding: "1.25rem 1rem", textAlign: "center" }}>
                      <div style={{ width: 64, height: 64, borderRadius: "50%", background: GOLD, margin: "0 auto 0.75rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#000", fontSize: "1.3rem" }}>
                        {initials(r.student)}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#fff" }}>{r.student.name}</div>
                      {r.student.grade && (
                        <div style={{ display: "inline-block", background: `rgba(245,192,37,0.2)`, border: `1px solid ${GOLD}`, borderRadius: "999px", padding: "0.15rem 0.6rem", fontSize: "0.75rem", color: GOLD, fontWeight: 700, marginTop: "0.4rem" }}>{r.student.grade}</div>
                      )}
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", marginTop: "0.5rem" }}>Requested {r.requestedAt}</div>
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
      <div style={{ background: "#0f0a00", borderTop: `1px solid ${GOLD}25`, padding: "0.5rem 1.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", flexShrink: 0, zIndex: 1 }}>
        <span>GARFIELD G-MEN · ENRICHMENT PERIOD · 12:40–1:10 PM</span>
        <span>{pending.length} pending · {arrived.length} arrived · {requests.length} total</span>
      </div>
    </div>,
    document.body
  );
}

export default function GmenPeriod({ setAlerts, students, user, isAdmin }) {
  const { requests: gmenRequests, addRequest: addRequestDB, markArrived: markArrivedDB } = useGmenRequests();
  const { settings, setEnrollmentOpen, setActivePeriod, setPeriodEndDate } = useGmenSettings();
  const { classes, addGmenClass, updateGmenClass, deleteGmenClass, toggleOpen } = useGmenClasses();
  const { enrollments, seatCount, adminMoveStudent } = useGmenEnrollments(settings.active_period || 1);
  const { changeRequests, approveChange, denyChange } = useGmenChangeRequests();
  const { schedules } = useBellSchedule();

  // G-Men is 4th period on Tue/Wed/Thu — pull its real time from the bell schedule
  const gmenBlock = (schedules?.twt || []).find(p => /g-?men/i.test(p.name));
  const gmenTime = gmenBlock ? `${fmt12(gmenBlock.start)}–${fmt12(gmenBlock.end)}` : "10:15–10:47 AM";

  const [subTab, setSubTab] = useState("today");
  const [search, setSearch] = useState("");
  const [kioskMode, setKioskMode] = useState(false);

  const period = settings.active_period || 1;

  // Determine if today is this teacher's request day or a class day
  const myClass = classes.find(c => c.teacher_email === user?.email && c.grading_period === period);
  const today = todayName(); // e.g. "Wednesday"
  const isGmenDay = ["Tuesday", "Wednesday", "Thursday"].includes(today);
  const isRequestDay = myClass ? myClass.request_day === today : false;

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

  // Change requests pending approval
  const pendingChanges = changeRequests.filter(r => r.status === "pending");

  if (kioskMode) return <KioskDisplay requests={gmenRequests} onClose={() => setKioskMode(false)} />;

  const subTabs = [
    { key: "today", label: "Today" },
    { key: "myclass", label: "My Class" },
    { key: "admin", label: `Admin${pendingChanges.length > 0 ? ` (${pendingChanges.length})` : ""}` },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb2">
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem" }}>G-Men Enrichment Period</h2>
          <div className="text-muted">{gmenTime} · 4th Period · Tue / Wed / Thu · Grading Period {period}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setKioskMode(true)}>📺 Launch Projector Display</button>
      </div>

      {/* Day banner */}
      {isGmenDay && myClass && (
        <div style={{
          background: isRequestDay ? "rgba(245,192,37,0.08)" : "rgba(59,130,246,0.08)",
          border: `1px solid ${isRequestDay ? "rgba(245,192,37,0.3)" : "rgba(59,130,246,0.3)"}`,
          borderRadius: 8, padding: "0.6rem 1rem", marginBottom: "1rem",
          fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          {isRequestDay
            ? <><span style={{ color: GOLD }}>📋</span> Today is your <strong>Request Day</strong> ({today}) — use the pull/request system below.</>
            : <><span style={{ color: "#60a5fa" }}>🏫</span> Today is a <strong>Class Day</strong> — <strong>{enrollments.filter(e => e.class_id === myClass.id).length}</strong> students should be in Room {myClass.room || "your room"}.</>
          }
        </div>
      )}

      {/* Period-end warning banner */}
      {(() => {
        const endKey = `period_${period}_end`;
        const endDate = settings[endKey];
        if (!endDate) return null;
        const daysLeft = Math.ceil((new Date(endDate) - new Date()) / 86400000);
        if (daysLeft > 28 || daysLeft < 0) return null;
        const urgent = daysLeft <= 7;
        return (
          <div style={{
            background: urgent ? "rgba(239,68,68,0.08)" : "rgba(245,192,37,0.07)",
            border: `1px solid ${urgent ? "rgba(239,68,68,0.3)" : "rgba(245,192,37,0.25)"}`,
            borderRadius: 8, padding: "0.6rem 1rem", marginBottom: "1rem",
            fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem",
          }}>
            <span>{urgent ? "🚨" : "⏰"}</span>
            <span>
              <strong>Period {period} ends {new Date(endDate).toLocaleDateString("en-US", { month: "long", day: "numeric" })}</strong>
              {" — "}{daysLeft <= 0 ? "today!" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left.`}
              {daysLeft <= 28 && " Time to set up classes for the next grading period."}
            </span>
          </div>
        );
      })()}

      {/* Sub-tabs */}
      <div className="flex gap1 mb2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.5rem" }}>
        {subTabs.map(t => (
          <button
            key={t.key}
            className={`btn btn-sm ${subTab === t.key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setSubTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* ── TODAY tab ─────────────────────────────────────────────────────── */}
      {subTab === "today" && (
        <div>
          {/* Classes overview */}
          <div className="card mb2">
            <div className="section-title">Classes This Period</div>
            {classes.filter(c => c.grading_period === period && c.is_open).length === 0 ? (
              <div className="text-muted" style={{ fontSize: "0.85rem" }}>No classes are open for enrollment yet.</div>
            ) : (
              <div className="grid3">
                {classes.filter(c => c.grading_period === period && c.is_open).map(cls => {
                  const seats = seatCount(cls.id);
                  const full = seats >= cls.max_seats;
                  const pct = Math.min(100, Math.round((seats / cls.max_seats) * 100));
                  return (
                    <div key={cls.id} className="card" style={{ padding: "0.75rem" }}>
                      <div style={{ fontWeight: 700 }}>{cls.class_name}</div>
                      <div className="text-muted" style={{ fontSize: "0.78rem" }}>{cls.teacher_name}{cls.room ? ` · Room ${cls.room}` : ""}</div>
                      <div className="flex items-center justify-between mt1">
                        <span className={`tag ${full ? "tag-red" : "tag-green"}`}>{seats}/{cls.max_seats}</span>
                        {full && <span className="tag tag-red">FULL</span>}
                      </div>
                      <div className="progress-track mt1">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: full ? "#dc2626" : GOLD }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid2">
            {/* Remediation Request */}
            <div className="card" style={{ position: "relative", zIndex: 10 }}>
              <div className="section-title">Remediation Request</div>
              <div style={{ position: "relative" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student name…" />
                {results.length > 0 && (
                  <div className="autocomplete-list">
                    {results.map(s => (
                      <div key={s.id} onClick={() => addRequest(s)} className="autocomplete-item">
                        {s.firstName} {s.lastName} <span className="tag tag-amber">{s.grade}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {students.length === 0 && <p className="text-muted mt1" style={{ fontSize: "0.8rem" }}>Import a student roster first.</p>}
            </div>

            {/* Today's Summary */}
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
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: r.arrived ? "#16a34a" : GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.8rem", color: r.arrived ? "#fff" : "#000" }}>
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
      )}

      {/* ── MY CLASS tab ──────────────────────────────────────────────────── */}
      {subTab === "myclass" && (
        <GmenClassManager
          user={user}
          classes={classes}
          enrollments={enrollments}
          settings={settings}
          addGmenClass={addGmenClass}
          updateGmenClass={updateGmenClass}
          deleteGmenClass={deleteGmenClass}
          toggleOpen={toggleOpen}
        />
      )}

      {/* ── ADMIN tab ─────────────────────────────────────────────────────── */}
      {subTab === "admin" && (
        <AdminPanel
          settings={settings}
          classes={classes}
          enrollments={enrollments}
          changeRequests={pendingChanges}
          setEnrollmentOpen={setEnrollmentOpen}
          setActivePeriod={setActivePeriod}
          setPeriodEndDate={setPeriodEndDate}
          approveChange={approveChange}
          denyChange={denyChange}
          adminMoveStudent={adminMoveStudent}
          addGmenClass={addGmenClass}
          user={user}
          students={students}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

function AdminPanel({ settings, classes, enrollments, changeRequests, setEnrollmentOpen, setActivePeriod, setPeriodEndDate, approveChange, denyChange, adminMoveStudent, addGmenClass, user, students, isAdmin }) {
  const [working, setWorking] = useState(null);
  const [pushState, setPushState] = useState("idle"); // idle | confirm | sending | done | error
  const [pushProgress, setPushProgress] = useState({ sent: 0, total: 0 });
  const [pushError, setPushError] = useState(null);
  const [pushDates, setPushDates] = useState({
    1: settings.period_1_end || "",
    2: settings.period_2_end || "",
    3: settings.period_3_end || "",
    4: settings.period_4_end || "",
  });
  const [moveSelections, setMoveSelections] = useState({}); // studentEmail → classId
  const [movingStudent, setMovingStudent] = useState(null);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const { requestGmailToken, sendEmail } = useGmailSend();
  const period = settings.active_period || 1;
  const appUrl = window.location.origin;

  // Keep local date state in sync when settings load
  useState(() => {
    setPushDates({
      1: settings.period_1_end || "",
      2: settings.period_2_end || "",
      3: settings.period_3_end || "",
      4: settings.period_4_end || "",
    });
  });

  async function handleMoveStudent(studentEmail) {
    const toClassId = moveSelections[studentEmail];
    if (!toClassId) return;
    setMovingStudent(studentEmail);
    await adminMoveStudent(studentEmail, toClassId, period);
    setMoveSelections(s => { const n = { ...s }; delete n[studentEmail]; return n; });
    setMovingStudent(null);
  }

  async function handleSeedDemo() {
    setSeedingDemo(true);
    const demoClasses = [
      { teacher_email: "ms.johnson@jagschools.org", teacher_name: "Ms. Johnson", room: "101", class_name: "Study Hall", description: "Quiet study time with direct teacher support for homework and test prep.", grading_period: period, request_day: "Tuesday", max_seats: 25, is_open: true },
      { teacher_email: "mr.williams@jagschools.org", teacher_name: "Mr. Williams", room: "Gym", class_name: "Fitness & Wellness", description: "Physical activity, stretching, and mindfulness in the gym.", grading_period: period, request_day: "Wednesday", max_seats: 30, is_open: true },
      { teacher_email: "ms.rodriguez@jagschools.org", teacher_name: "Ms. Rodriguez", room: "Library", class_name: "Reading Club", description: "Independent reading and literacy enrichment with librarian support.", grading_period: period, request_day: "Thursday", max_seats: 20, is_open: true },
      { teacher_email: "mr.patel@jagschools.org", teacher_name: "Mr. Patel", room: "302", class_name: "STEM Exploration", description: "Hands-on science, coding, and engineering projects.", grading_period: period, request_day: "Tuesday", max_seats: 18, is_open: true },
    ];
    for (const cls of demoClasses) {
      await addGmenClass(cls);
    }
    setSeedingDemo(false);
  }

  async function handleApprove(id) {
    setWorking(id);
    await approveChange(id, user?.name || user?.email || "Admin");
    setWorking(null);
  }

  async function handleDeny(id) {
    setWorking(id);
    await denyChange(id, user?.name || user?.email || "Admin");
    setWorking(null);
  }

  async function handlePushSignup() {
    setPushState("sending");
    setPushError(null);
    const targets = students.filter(s => s.studentEmail);
    setPushProgress({ sent: 0, total: targets.length });

    let token;
    try {
      token = await requestGmailToken();
    } catch (e) {
      setPushState("error");
      setPushError("Could not get Gmail permission: " + e.message);
      return;
    }

    const senderName = user?.name || "Staff";
    const periodEndDate = settings[`period_${period}_end`];
    const deadlineNote = periodEndDate
      ? ` Please sign up before ${new Date(periodEndDate).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.`
      : "";

    let sent = 0;
    for (const student of targets) {
      try {
        const subject = `G-Men Period Enrollment is Open — Period ${period}`;
        const body = [
          `Hi ${student.firstName},`,
          "",
          `G-Men Enrichment Period enrollment is now open for Grading Period ${period}.${deadlineNote}`,
          "",
          "Click the link below to sign in with your school Google account and pick your class:",
          "",
          appUrl,
          "",
          "Once you sign in, you will see a list of available classes with descriptions and seat counts. Choose your class and you're all set.",
          "",
          "If you have any questions, reply to this email or see your teacher.",
          "",
          "— James A. Garfield High School",
          `   ${senderName}`,
        ].join("\n");

        await sendEmail(token, {
          to: student.studentEmail,
          from: user?.email || "",
          subject,
          body,
        });
        sent++;
        setPushProgress({ sent, total: targets.length });
      } catch {
        // skip individual failures — continue the batch
      }
    }

    setPushProgress({ sent, total: targets.length });
    setPushState("done");
  }

  const studentsWithEmail = students.filter(s => s.studentEmail).length;
  const inputStyle = {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6, padding: "0.35rem 0.6rem", color: "#fff", fontSize: "0.82rem",
    outline: "none",
  };
  const labelStyle = {
    fontSize: "0.7rem", color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 3,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── School-wide controls — admin only ───────────────────────────── */}
      {!isAdmin && (
        <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
          <div style={{ fontSize: "1.1rem", marginBottom: "0.4rem" }}>🔒</div>
          <div style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.4)" }}>
            School-wide enrollment settings are managed by admin staff.
          </div>
        </div>
      )}

      {isAdmin && (
      <>

      {/* ── Enrollment Settings ──────────────────────────────────────────── */}
      <div className="card">
        <div className="section-title">Enrollment Settings</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "2rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Enrollment Status</div>
            <button onClick={() => setEnrollmentOpen(!settings.enrollment_open, user?.email)} style={{
              background: settings.enrollment_open ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.1)",
              border: settings.enrollment_open ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(239,68,68,0.3)",
              color: settings.enrollment_open ? "#22c55e" : "#ef4444",
              borderRadius: 8, padding: "0.5rem 1.25rem", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem",
            }}>
              {settings.enrollment_open ? "✓ Open" : "✗ Closed"} — Click to Toggle
            </button>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Active Period</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {[1, 2, 3, 4].map(p => (
                <button key={p} onClick={() => setActivePeriod(p, user?.email)} style={{
                  background: period === p ? GOLD : "rgba(255,255,255,0.06)",
                  border: period === p ? "none" : "1px solid rgba(255,255,255,0.12)",
                  color: period === p ? "#000" : "rgba(255,255,255,0.6)",
                  borderRadius: 6, padding: "0.4rem 0.75rem", cursor: "pointer", fontWeight: 700,
                }}>P{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Grading Period End Dates ─────────────────────────────────────── */}
      <div className="card">
        <div className="section-title">Grading Period End Dates</div>
        <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", marginBottom: "1rem" }}>
          A reminder banner appears on the G-Men tab 28 days before the active period ends.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
          {[1, 2, 3, 4].map(p => (
            <div key={p}>
              <label style={labelStyle}>Period {p} End Date</label>
              <input
                type="date"
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                value={pushDates[p]}
                onChange={e => setPushDates(d => ({ ...d, [p]: e.target.value }))}
                onBlur={e => setPeriodEndDate(p, e.target.value || null, user?.email)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Push Signup to Students ──────────────────────────────────────── */}
      <div className="card">
        <div className="section-title">Push Signup to Students</div>
        <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", marginBottom: "1rem" }}>
          Sends an enrollment invitation email to every student who has a school email on file.
          The email comes from your <strong style={{ color: "rgba(255,255,255,0.65)" }}>{user?.email}</strong> address and links directly to the enrollment page.
        </div>

        {pushState === "idle" && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
              {studentsWithEmail > 0
                ? <><strong style={{ color: "#fff" }}>{studentsWithEmail}</strong> student{studentsWithEmail !== 1 ? "s" : ""} have school emails on file.</>
                : "No student emails on file yet — sync from Google Classroom first."}
            </div>
            {studentsWithEmail > 0 && (
              <button onClick={() => setPushState("confirm")} style={{
                background: GOLD, border: "none", color: "#000",
                fontWeight: 700, borderRadius: 8, padding: "0.55rem 1.25rem",
                cursor: "pointer", fontSize: "0.9rem",
              }}>📨 Push Signup to Students</button>
            )}
          </div>
        )}

        {pushState === "confirm" && (
          <div style={{
            background: "rgba(245,192,37,0.06)", border: "1px solid rgba(245,192,37,0.2)",
            borderRadius: 10, padding: "1rem 1.25rem",
          }}>
            <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>Ready to send?</div>
            <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", marginBottom: "1rem" }}>
              This will send a G-Men enrollment email to <strong style={{ color: "#fff" }}>{studentsWithEmail} student{studentsWithEmail !== 1 ? "s" : ""}</strong> from your school Gmail account.
              {settings[`period_${period}_end`] && (
                <> The email will include a deadline of <strong style={{ color: "#fff" }}>{new Date(settings[`period_${period}_end`]).toLocaleDateString("en-US", { month: "long", day: "numeric" })}</strong>.</>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={handlePushSignup} style={{
                background: GOLD, border: "none", color: "#000",
                fontWeight: 700, borderRadius: 7, padding: "0.5rem 1.25rem", cursor: "pointer",
              }}>Send Now</button>
              <button onClick={() => setPushState("idle")} style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.5)", borderRadius: 7, padding: "0.5rem 1rem", cursor: "pointer",
              }}>Cancel</button>
            </div>
          </div>
        )}

        {pushState === "sending" && (
          <div>
            <div style={{ fontSize: "0.88rem", marginBottom: "0.6rem" }}>
              Sending… <strong>{pushProgress.sent}</strong> of <strong>{pushProgress.total}</strong>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, background: GOLD,
                width: `${pushProgress.total > 0 ? Math.round((pushProgress.sent / pushProgress.total) * 100) : 0}%`,
                transition: "width 0.3s",
              }} />
            </div>
          </div>
        )}

        {pushState === "done" && (
          <div style={{
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 8, padding: "0.75rem 1rem",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem",
          }}>
            <span style={{ fontSize: "0.9rem" }}>
              ✓ Sent to <strong>{pushProgress.sent}</strong> student{pushProgress.sent !== 1 ? "s" : ""}.
            </span>
            <button onClick={() => setPushState("idle")} style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.5)", borderRadius: 6, padding: "0.3rem 0.75rem",
              cursor: "pointer", fontSize: "0.8rem",
            }}>Send Again</button>
          </div>
        )}

        {pushState === "error" && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 8, padding: "0.75rem 1rem",
          }}>
            <div style={{ color: "#ef4444", fontSize: "0.88rem", marginBottom: "0.5rem" }}>{pushError}</div>
            <button onClick={() => setPushState("idle")} style={{
              background: "transparent", border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444", borderRadius: 6, padding: "0.3rem 0.75rem",
              cursor: "pointer", fontSize: "0.8rem",
            }}>Try Again</button>
          </div>
        )}
      </div>

      {/* ── Move Students (admin direct override) ───────────────────────── */}
      <div className="card">
        <div className="section-title">Move Students Between Classes</div>
        <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", marginBottom: "1rem" }}>
          Admin-only direct move — no change request required. Select a new class for any enrolled student and click Move.
        </div>
        {enrollments.length === 0 ? (
          <div className="text-muted" style={{ fontSize: "0.85rem" }}>No students enrolled in Period {period} yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {enrollments.map(enr => {
              const currentCls = classes.find(c => c.id === enr.class_id);
              const availableClasses = classes.filter(c => c.grading_period === period && c.id !== enr.class_id);
              const selectedClass = moveSelections[enr.student_email];
              const isMoving = movingStudent === enr.student_email;
              return (
                <div key={enr.id || enr.student_email} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 8, padding: "0.6rem 0.9rem",
                }}>
                  <div style={{ minWidth: 160, flexGrow: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{enr.student_name}</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
                      Currently: {currentCls?.class_name || "Unknown class"}
                    </div>
                  </div>
                  {availableClasses.length > 0 ? (
                    <>
                      <select
                        value={selectedClass || ""}
                        onChange={e => setMoveSelections(s => ({ ...s, [enr.student_email]: e.target.value }))}
                        style={{
                          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 6, padding: "0.35rem 0.6rem", color: "#fff", fontSize: "0.82rem",
                          outline: "none",
                        }}
                      >
                        <option value="">Move to…</option>
                        {availableClasses.map(c => (
                          <option key={c.id} value={c.id}>{c.class_name} ({c.teacher_name})</option>
                        ))}
                      </select>
                      <button
                        disabled={!selectedClass || isMoving}
                        onClick={() => handleMoveStudent(enr.student_email)}
                        style={{
                          background: selectedClass ? GOLD : "rgba(255,255,255,0.06)",
                          border: "none", color: selectedClass ? "#000" : "rgba(255,255,255,0.3)",
                          borderRadius: 6, padding: "0.35rem 0.85rem",
                          cursor: selectedClass ? "pointer" : "default",
                          fontWeight: 700, fontSize: "0.82rem",
                          opacity: isMoving ? 0.5 : 1,
                        }}
                      >{isMoving ? "Moving…" : "Move"}</button>
                    </>
                  ) : (
                    <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.25)" }}>No other classes</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      </> /* end isAdmin block */
      )}

      {/* ── Pending change requests ──────────────────────────────────────── */}
      <div className="card">
        <div className="section-title">Pending Change Requests{changeRequests.length > 0 ? ` (${changeRequests.length})` : ""}</div>
        {changeRequests.length === 0 ? (
          <div className="text-muted" style={{ fontSize: "0.85rem" }}>No pending change requests.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {changeRequests.map(req => {
              const fromCls = classes.find(c => c.id === req.from_class_id);
              const toCls = classes.find(c => c.id === req.to_class_id);
              return (
                <div key={req.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, padding: "0.75rem 1rem", gap: "1rem", flexWrap: "wrap",
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{req.student_name}</div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                      {fromCls?.class_name || "—"} → {toCls?.class_name || "Unknown class"}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                      {new Date(req.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => handleApprove(req.id)} disabled={!!working} style={{
                      background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)",
                      color: "#22c55e", borderRadius: 6, padding: "0.35rem 0.85rem",
                      cursor: "pointer", fontWeight: 600, fontSize: "0.82rem",
                      opacity: working ? 0.5 : 1,
                    }}>{working === req.id ? "…" : "Approve"}</button>
                    <button onClick={() => handleDeny(req.id)} disabled={!!working} style={{
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                      color: "#ef4444", borderRadius: 6, padding: "0.35rem 0.85rem",
                      cursor: "pointer", fontWeight: 600, fontSize: "0.82rem",
                      opacity: working ? 0.5 : 1,
                    }}>{working === req.id ? "…" : "Deny"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── All classes overview ─────────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div className="section-title" style={{ margin: 0 }}>All Classes — Period {period}</div>
          {isAdmin && classes.filter(c => c.grading_period === period).length < 3 && (
            <button
              onClick={handleSeedDemo}
              disabled={seedingDemo}
              style={{
                background: "transparent", border: `1px solid ${GOLD}50`,
                color: GOLD, borderRadius: 6, padding: "0.3rem 0.85rem",
                cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                opacity: seedingDemo ? 0.5 : 1,
              }}
            >{seedingDemo ? "Seeding…" : "🌱 Seed Demo Classes"}</button>
          )}
        </div>
        {classes.filter(c => c.grading_period === period).length === 0 ? (
          <div className="text-muted" style={{ fontSize: "0.85rem" }}>No classes created for this period. Use "Seed Demo Classes" to add sample data.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {classes.filter(c => c.grading_period === period).map(cls => {
              const seats = enrollments.filter(e => e.class_id === cls.id).length;
              const pct = Math.min(100, Math.round((seats / cls.max_seats) * 100));
              return (
                <div key={cls.id} style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 8, padding: "0.65rem 1rem",
                }}>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{cls.class_name}</div>
                    <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>{cls.teacher_name}{cls.room ? ` · Room ${cls.room}` : ""}</div>
                  </div>
                  <div style={{ width: 100 }}>
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", textAlign: "right", marginBottom: 3 }}>{seats}/{cls.max_seats}</div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                      <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: pct >= 100 ? "#ef4444" : GOLD }} />
                    </div>
                  </div>
                  <div style={{
                    fontSize: "0.72rem", fontWeight: 700,
                    color: cls.is_open ? "#22c55e" : "rgba(255,255,255,0.3)",
                    minWidth: 45, textAlign: "right",
                  }}>{cls.is_open ? "Open" : "Closed"}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
