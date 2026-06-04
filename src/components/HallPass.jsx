import { useState, useEffect, useRef } from "react";
import { GOLD, DESTINATIONS } from "../constants.js";
import { useSharedHallPasses, useStaffDirectory, useRoomPasses, ROOM_PASS_REASONS, SUPABASE_READY } from "../supabase.js";

function elapsed(outTime) {
  if (!outTime) return 0;
  const t = outTime?.toDate ? outTime.toDate() : new Date(outTime);
  return Math.floor((Date.now() - t.getTime()) / 1000);
}
function fmtElapsed(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}m ${s}s`;
}
function fmtClock(d) {
  if (!d) return "--:--";
  const t = d?.toDate ? d.toDate() : new Date(d);
  return t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function KioskScreen({ passes, addPass, returnPass, settings, students, onClose }) {
  const [screen, setScreen] = useState("home"); // home | destination | confirm-return
  const [selected, setSelected] = useState(null);
  const [kioskSearch, setKioskSearch] = useState("");
  const [flash, setFlash] = useState(null); // {type:'in'|'out', name, dest}
  const [tick, setTick] = useState(0);
  const [clockStr, setClockStr] = useState(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setClockStr(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const activePasses = passes.filter(p => !p.returnTime);
  const maxReached = activePasses.length >= settings.maxOut;

  const filteredStudents = kioskSearch.trim()
    ? students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(kioskSearch.toLowerCase()))
    : students;

  function selectStudent(s) {
    const out = activePasses.find(p => p.studentId === s.id);
    if (out) { setSelected({ ...s, passId: out.id, dest: out.destination, outTime: out.outTime }); setScreen("confirm-return"); }
    else if (!maxReached) { setSelected(s); setScreen("destination"); }
  }

  async function signOut(dest) {
    await addPass({
      studentId: selected.id,
      studentName: `${selected.firstName} ${selected.lastName}`,
      destination: dest,
      teacherName: settings.teacherName,
      room: settings.room,
    });
    triggerFlash("out", `${selected.firstName} ${selected.lastName}`, dest);
    setScreen("home"); setSelected(null);
  }

  async function signIn() {
    await returnPass(selected.passId, {
      studentId: selected.id,
      studentName: `${selected.firstName} ${selected.lastName}`,
      destination: selected.dest,
      outTime: selected.outTime,
      teacherName: settings.teacherName,
      room: settings.room,
    });
    triggerFlash("in", `${selected.firstName} ${selected.lastName}`, selected.dest);
    setScreen("home"); setSelected(null);
  }

  function triggerFlash(type, name, dest) {
    setFlash({ type, name, dest });
    setTimeout(() => setFlash(null), 2200);
  }

  const destIcons = Object.fromEntries(DESTINATIONS.map(d => [d.key, d.icon]));

  const fmtDayShort = () => new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0800", color: "#fff", display: "flex", flexDirection: "column", fontFamily: "inherit", zIndex: 1000 }}>

      {/* Watermark */}
      <img src="/logo.png" alt="" aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(70vw,600px)", opacity: 0.06, pointerEvents: "none", userSelect: "none" }} />

      {flash && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, background: flash.type === "in" ? "rgba(22,163,74,0.92)" : "rgba(220,38,38,0.92)", fontSize: "2rem", fontWeight: 900, letterSpacing: "0.08em" }}>
          {flash.type === "in" ? `✓ ${flash.name} — WELCOME BACK` : `🚶 ${flash.name} — SIGNED OUT · ${flash.dest}`}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#0f0a00", borderBottom: `2px solid ${GOLD}`, padding: "0 1.5rem", height: 80, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, zIndex: 1 }}>
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <img src="/logo.png" alt="G-Men" style={{ height: 52, width: 52, objectFit: "contain" }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.1rem", letterSpacing: "0.1em", color: GOLD, lineHeight: 1.1 }}>HALL PASS KIOSK</div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em" }}>Room {settings.room} · {settings.teacherName}</div>
          </div>
        </div>

        {/* Center: clock */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.8rem", fontWeight: 900, color: GOLD, lineHeight: 1, letterSpacing: "0.04em" }}>{clockStr}</div>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginTop: "0.15rem" }}>{fmtDayShort()}</div>
        </div>

        {/* Right: stat bubbles + close */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: maxReached ? "#f87171" : GOLD, lineHeight: 1 }}>{activePasses.length}</div>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>OUT NOW</div>
          </div>
          <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "rgba(255,255,255,0.5)", lineHeight: 1 }}>{settings.maxOut}</div>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>MAX</div>
          </div>
          <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.12)" }} />
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "rgba(255,255,255,0.7)", padding: "0.45rem 1rem", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            🔒 Close
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem", zIndex: 1 }}>

        {/* Status board — currently out */}
        {activePasses.length > 0 ? (
          <div style={{ marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <span className="pulse-dot" />
              <span style={{ fontWeight: 800, letterSpacing: "0.1em", fontSize: "0.85rem", color: "#fca5a5", textTransform: "uppercase" }}>Students Currently Out</span>
              <div style={{ flex: 1, height: 1, background: "rgba(252,165,165,0.2)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(180px,1fr))`, gap: "1rem" }}>
              {activePasses.map(p => {
                const secs = elapsed(p.outTime);
                const flagSecs = settings.flagAfter * 60;
                const critical = secs > flagSecs * 1.5;
                const flagged = secs > flagSecs;
                const accentColor = critical ? "#f87171" : flagged ? "#fb923c" : GOLD;
                return (
                  <div key={p.id}
                    onClick={() => { setSelected({ id: p.studentId, firstName: p.studentName?.split(" ")[0] || "", lastName: p.studentName?.split(" ").slice(1).join(" ") || "", passId: p.id, dest: p.destination, outTime: p.outTime }); setScreen("confirm-return"); setKioskSearch(""); }}
                    style={{ background: "rgba(255,255,255,0.04)", border: `2px solid ${accentColor}`, borderRadius: "14px", padding: "1.25rem 1rem", textAlign: "center", backdropFilter: "blur(4px)", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = `${accentColor}18`}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  >
                    {critical && <div style={{ background: "rgba(220,38,38,0.2)", color: "#fca5a5", fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: "4px", marginBottom: "0.5rem", letterSpacing: "0.08em" }}>⚠ CHECK ON STUDENT</div>}
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${accentColor}22`, border: `2px solid ${accentColor}`, color: accentColor, fontWeight: 900, fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem" }}>
                      {p.studentName?.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "1rem" }}>{p.studentName}</div>
                    <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", marginTop: "0.25rem" }}>{destIcons[p.destination] || "📍"} {p.destination}</div>
                    <div style={{ color: accentColor, fontWeight: 800, marginTop: "0.5rem", fontSize: "1rem" }}>{fmtElapsed(secs)}</div>
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", marginTop: "0.15rem" }}>since {fmtClock(p.outTime)}</div>
                    <div style={{ marginTop: "0.75rem", background: `${accentColor}20`, borderRadius: "6px", padding: "0.3rem 0", fontSize: "0.72rem", fontWeight: 800, color: accentColor, letterSpacing: "0.08em" }}>TAP TO RETURN ↩</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#4ade80", letterSpacing: "0.08em" }}>ALL STUDENTS PRESENT</div>
          </div>
        )}

        {/* Action zone */}
        {screen === "home" && (
          <div style={{ maxWidth: 500, margin: "0 auto" }}>
            <div style={{ textAlign: "center", fontWeight: 800, fontSize: "1.2rem", letterSpacing: "0.06em", marginBottom: "1rem" }}>TYPE YOUR NAME TO SIGN OUT OR RETURN</div>
            {maxReached && <div style={{ textAlign: "center", color: "#fca5a5", fontWeight: 700, marginBottom: "0.75rem", fontSize: "0.9rem" }}>⛔ MAX STUDENTS OUT — RETURNS ONLY</div>}
            <div style={{ position: "relative" }}>
              <input
                value={kioskSearch}
                onChange={e => setKioskSearch(e.target.value)}
                placeholder="Start typing your name…"
                autoFocus
                style={{ fontSize: "1.3rem", padding: "1rem 1.25rem", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px" }}
              />
              {kioskSearch.trim().length > 0 && filteredStudents.length > 0 && (
                <ul className="autocomplete-list" style={{ top: "calc(100% + 4px)", left: 0, right: 0, maxHeight: 320, overflowY: "auto", zIndex: 50 }}>
                  {filteredStudents.slice(0, 8).map(s => {
                    const isOut = activePasses.find(p => p.studentId === s.id);
                    const disabled = maxReached && !isOut;
                    return (
                      <li key={s.id}
                        className="autocomplete-item"
                        style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1.1rem", padding: "0.85rem 1rem" }}
                        onClick={() => { if (!disabled) { selectStudent(s); setKioskSearch(""); } }}
                      >
                        <span style={{ fontWeight: 700 }}>{s.firstName} {s.lastName}</span>
                        {isOut
                          ? <span style={{ color: GOLD, fontWeight: 800, fontSize: "0.85rem" }}>TAP TO RETURN ↩</span>
                          : <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>Sign Out →</span>
                        }
                      </li>
                    );
                  })}
                </ul>
              )}
              {kioskSearch.trim().length > 0 && filteredStudents.length === 0 && (
                <div style={{ marginTop: "0.75rem", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>No students found</div>
              )}
            </div>
          </div>
        )}

        {screen === "destination" && selected && (
          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontWeight: 800, fontSize: "1.2rem" }}>Signing out {selected.firstName} {selected.lastName}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", marginTop: "0.25rem" }}>Where are you going?</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: "0.75rem", maxWidth: 600, margin: "0 auto" }}>
              {DESTINATIONS.map(d => (
                <button key={d.key} onClick={() => signOut(d.key)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "1.25rem 0.5rem", color: "#fff", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600 }}>
                  <div style={{ fontSize: "1.8rem" }}>{d.icon}</div>
                  <div style={{ marginTop: "0.5rem" }}>{d.key}</div>
                </button>
              ))}
            </div>
            <button className="btn btn-ghost mt2" style={{ color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.2)" }} onClick={() => { setScreen("home"); setSelected(null); }}>← Back</button>
          </div>
        )}

        {screen === "confirm-return" && selected && (
          <div style={{ textAlign: "center", maxWidth: 400, margin: "2rem auto" }}>
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>RETURNING FROM {selected.dest?.toUpperCase()}</div>
            <div style={{ fontWeight: 900, fontSize: "1.5rem" }}>{selected.firstName} {selected.lastName}</div>
            <div style={{ color: GOLD, fontWeight: 800, fontSize: "2.5rem", margin: "1rem 0" }}>{fmtElapsed(elapsed(selected.outTime))}</div>
            <div className="flex gap2" style={{ justifyContent: "center" }}>
              <button className="btn btn-ghost" style={{ color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.2)" }} onClick={() => { setScreen("home"); setSelected(null); }}>← Back</button>
              <button className="btn btn-primary" onClick={signIn}>✓ Sign Back In</button>
            </div>
          </div>
        )}
      </div>

      {/* Footer ticker */}
      <div style={{ background: "#0f0a00", borderTop: `1px solid ${GOLD}25`, padding: "0.5rem 1.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", flexShrink: 0, zIndex: 1 }}>
        <span>GARFIELD G-MEN · HALL PASS KIOSK · Room {settings.room}</span>
        <span>{activePasses.length} out · max {settings.maxOut}</span>
      </div>
    </div>
  );
}

export default function HallPass({ user, students }) {
  const { passes, log, ready, addPass, returnPass } = useSharedHallPasses();
  const [kioskMode, setKioskMode] = useState(false);
  const [subTab, setSubTab] = useState("overview");
  const [settings, setSettings] = useState({
    teacherName: user?.name || "Teacher",
    room: "101",
    maxOut: 2,
    flagAfter: 10,
    lockoutMin: 5,
    periodLength: 50,
    destinations: DESTINATIONS.map(d => d.key),
  });
  const staff = useStaffDirectory(user, settings.room);
  const { sentByMe, sentToMe, sendPass, markArrived: markRoomArrived, dismiss } = useRoomPasses(user?.email);

  // Room pass form state
  const [rpStudent, setRpStudent] = useState(null);
  const [rpSearch, setRpSearch] = useState("");
  const [rpSearchResults, setRpSearchResults] = useState([]);
  const [rpTeacher, setRpTeacher] = useState("");
  const [rpReason, setRpReason] = useState(ROOM_PASS_REASONS[0]);
  const [rpSent, setRpSent] = useState(false);

  useEffect(() => {
    if (!rpSearch.trim()) { setRpSearchResults([]); return; }
    setRpSearchResults(students.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(rpSearch.toLowerCase())
    ).slice(0, 6));
  }, [rpSearch, students]);

  async function handleSendRoomPass(e) {
    e.preventDefault();
    if (!rpStudent || !rpTeacher) return;
    const toTeacher = staff.find(s => s.email === rpTeacher);
    if (!toTeacher) return;
    await sendPass({
      studentId: rpStudent.id,
      studentName: `${rpStudent.firstName} ${rpStudent.lastName}`,
      toTeacher,
      reason: rpReason,
      fromTeacher: settings.teacherName,
      fromEmail: user?.email,
      fromRoom: settings.room,
    });
    setRpStudent(null); setRpSearch(""); setRpTeacher(""); setRpReason(ROOM_PASS_REASONS[0]);
    setRpSent(true); setTimeout(() => setRpSent(false), 3000);
  }

  const incomingPending = sentToMe.filter(p => p.status === "pending");
  const [logSearch, setLogSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const activePasses = passes.filter(p => !p.returnTime);
  const todayLog = log;
  const avgDuration = todayLog.length ? Math.round(todayLog.reduce((s, p) => s + (p.duration || 0), 0) / todayLog.length) : null;

  const overviewMap = {};
  todayLog.forEach(p => {
    if (!overviewMap[p.studentId]) overviewMap[p.studentId] = { name: p.studentName, passes: 0, totalMin: 0, dests: new Set() };
    overviewMap[p.studentId].passes++;
    overviewMap[p.studentId].totalMin += p.duration || 0;
    overviewMap[p.studentId].dests.add(p.destination);
  });
  const overviewRows = Object.entries(overviewMap).sort((a, b) => b[1].totalMin - a[1].totalMin);

  const filteredLog = logSearch.trim()
    ? todayLog.filter(p => p.studentName?.toLowerCase().includes(logSearch.toLowerCase()))
    : todayLog;

  if (kioskMode) return (
    <KioskScreen
      passes={passes} addPass={addPass} returnPass={returnPass}
      settings={settings} students={students} onClose={() => setKioskMode(false)}
    />
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb2">
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem" }}>Hall Pass Manager</h2>
          <div className="text-muted">
            Room {settings.room} · {settings.teacherName} ·{" "}
            <span style={{ color: ready && SUPABASE_READY ? "#16a34a" : "#f59e0b", fontWeight: 600 }}>
              {ready && SUPABASE_READY ? "● Live Sync" : "● Local Only"}
            </span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setKioskMode(true)}>🖥 Launch Kiosk Mode</button>
      </div>

      {/* Stats */}
      <div className="grid3 mb2">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="stat-num" style={{ color: activePasses.length > 0 ? "#dc2626" : "#1a1200" }}>{activePasses.length}</div>
          <div className="stat-label">Currently Out</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="stat-num" style={{ color: GOLD }}>{todayLog.length}</div>
          <div className="stat-label">Passes Today</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="stat-num">{avgDuration ?? "—"}</div>
          <div className="stat-label">Avg Duration (min)</div>
        </div>
      </div>

      {/* Currently Out */}
      {activePasses.length > 0 && (
        <div className="card mb2" style={{ borderLeft: "4px solid #dc2626" }}>
          <div className="flex items-center gap1 mb1">
            <span className="pulse-dot" />
            <span style={{ fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.08em", color: "#dc2626" }}>CURRENTLY OUT</span>
          </div>
          {activePasses.map(p => (
            <div key={p.id} className="flex items-center justify-between" style={{ padding: "0.4rem 0", borderBottom: "1px solid rgba(200,200,200,0.2)" }}>
              <div className="flex items-center gap1">
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.78rem", color: "#1a1200" }}>
                  {p.studentName?.split(" ").map(w => w[0]).join("").slice(0,2)}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.studentName}</div>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>{p.destination} · out at {fmtClock(p.outTime)}</div>
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => returnPass(p.id, p)}>Force Return</button>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap1 mb2">
        {["overview","log","room passes","settings"].map(t => (
          <button key={t} className={`btn btn-sm ${subTab === t ? "btn-primary" : "btn-ghost"}`}
            style={{ textTransform: "capitalize", position: "relative" }}
            onClick={() => setSubTab(t)}>
            {t}
            {t === "room passes" && incomingPending.length > 0 && (
              <span style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", borderRadius: "999px", fontSize: "0.6rem", fontWeight: 800, padding: "0.1rem 0.35rem", lineHeight: 1 }}>
                {incomingPending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {subTab === "overview" && (
        <div className="card">
          <div className="section-title">Student Pass Usage Today</div>
          {overviewRows.length === 0 && <p className="text-muted">No passes issued yet today.</p>}
          <table className="stu-table">
            <thead><tr><th>Student</th><th>Passes</th><th>Total Time</th><th>Destinations</th></tr></thead>
            <tbody>
              {overviewRows.map(([id, d]) => (
                <tr key={id}>
                  <td style={{ fontWeight: 600 }}>{d.name}</td>
                  <td><span className={`tag ${d.passes >= 3 ? "tag-red" : "tag-gold"}`}>{d.passes}</span></td>
                  <td>{d.totalMin} min</td>
                  <td>{[...d.dests].map(dest => <span key={dest} className="tag tag-amber" style={{ marginRight: "0.25rem" }}>{dest}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "log" && (
        <div className="card">
          <div className="flex items-center justify-between mb1">
            <div className="section-title" style={{ margin: 0 }}>Pass Log</div>
            {confirmClear
              ? <div className="flex gap1">
                  <button className="btn btn-danger btn-sm" onClick={() => { /* log is read-only from firebase */ setConfirmClear(false); }}>Confirm Clear</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(false)}>Cancel</button>
                </div>
              : <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(true)}>Clear Log</button>
            }
          </div>
          <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search student…" style={{ marginBottom: "0.75rem" }} />
          <table className="stu-table">
            <thead><tr><th>#</th><th>Student</th><th>Destination</th><th>Time Out</th><th>Time In</th><th>Duration</th></tr></thead>
            <tbody>
              {filteredLog.map((p, i) => (
                <tr key={p.id}>
                  <td className="text-muted">{filteredLog.length - i}</td>
                  <td style={{ fontWeight: 600 }}>{p.studentName}</td>
                  <td>{p.destination}</td>
                  <td>{fmtClock(p.outTime)}</td>
                  <td>{p.returnTime ? fmtClock(p.returnTime) : <span className="tag tag-red">Out</span>}</td>
                  <td>{p.duration != null ? <span className={`tag ${p.duration > settings.flagAfter ? "tag-red" : "tag-green"}`}>{p.duration}m</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "room passes" && (
        <div>
          {/* Incoming passes alert */}
          {incomingPending.length > 0 && (
            <div className="card mb2" style={{ borderLeft: "4px solid #f97316" }}>
              <div style={{ fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.08em", color: "#f97316", marginBottom: "0.5rem" }}>
                📨 INCOMING — STUDENTS ON THEIR WAY TO YOUR ROOM
              </div>
              {incomingPending.map(p => (
                <div key={p.id} className="flex items-center justify-between" style={{ padding: "0.4rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{p.student_name}</span>
                    <span className="text-muted" style={{ marginLeft: "0.5rem", fontSize: "0.78rem" }}>
                      from {p.from_teacher} (Rm {p.from_room}) · {p.reason}
                    </span>
                  </div>
                  <div className="flex gap1">
                    <button className="btn btn-primary btn-sm" onClick={() => markRoomArrived(p.id)}>✓ Arrived</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => dismiss(p.id)}>Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Send a room pass */}
          <div className="card mb2">
            <div className="section-title">Send Student to Another Teacher's Room</div>
            {rpSent && (
              <div style={{ color: "#4ade80", fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                ✓ Pass sent — that teacher will see it immediately.
              </div>
            )}
            <form onSubmit={handleSendRoomPass}>
              {/* Student search */}
              <div className="mb1" style={{ position: "relative" }}>
                <label>Student</label>
                {rpStudent ? (
                  <div className="flex items-center gap1">
                    <span style={{ fontWeight: 600 }}>{rpStudent.firstName} {rpStudent.lastName}</span>
                    <span className="tag tag-amber">{rpStudent.grade}</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRpStudent(null); setRpSearch(""); }}>✕</button>
                  </div>
                ) : (
                  <>
                    <input value={rpSearch} onChange={e => setRpSearch(e.target.value)} placeholder="Search student name…" />
                    {rpSearchResults.length > 0 && (
                      <div className="autocomplete-list">
                        {rpSearchResults.map(s => (
                          <div key={s.id} className="autocomplete-item" onClick={() => { setRpStudent(s); setRpSearch(""); setRpSearchResults([]); }}>
                            {s.firstName} {s.lastName} <span className="tag tag-amber">{s.grade}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="grid2 mb1">
                <div>
                  <label>Send To (Teacher)</label>
                  <select value={rpTeacher} onChange={e => setRpTeacher(e.target.value)} required>
                    <option value="">— Select teacher —</option>
                    {staff.filter(s => s.email !== user?.email).map(s => (
                      <option key={s.email} value={s.email}>
                        {s.name}{s.room ? ` · Rm ${s.room}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Reason</label>
                  <select value={rpReason} onChange={e => setRpReason(e.target.value)}>
                    {ROOM_PASS_REASONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={!rpStudent || !rpTeacher}>
                Send Room Pass
              </button>
            </form>
          </div>

          {/* Passes I sent today */}
          <div className="card mb2">
            <div className="section-title">Passes I Sent Today</div>
            {sentByMe.length === 0 && <p className="text-muted">No room passes sent today.</p>}
            {sentByMe.map(p => (
              <div key={p.id} className="flex items-center justify-between" style={{ padding: "0.4rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{p.student_name}</span>
                  <span className="text-muted" style={{ marginLeft: "0.5rem", fontSize: "0.78rem" }}>→ {p.to_teacher} · {p.reason}</span>
                </div>
                <span className={`tag ${p.status === "arrived" ? "tag-green" : p.status === "dismissed" ? "tag-amber" : "tag-blue"}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>

          {/* All incoming (including arrived/dismissed) */}
          {sentToMe.filter(p => p.status !== "pending").length > 0 && (
            <div className="card">
              <div className="section-title">Received Today (History)</div>
              {sentToMe.filter(p => p.status !== "pending").map(p => (
                <div key={p.id} className="flex items-center justify-between" style={{ padding: "0.4rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{p.student_name}</span>
                    <span className="text-muted" style={{ marginLeft: "0.5rem", fontSize: "0.78rem" }}>from {p.from_teacher} · {p.reason}</span>
                  </div>
                  <span className={`tag ${p.status === "arrived" ? "tag-green" : "tag-amber"}`}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "settings" && (
        <div className="card">
          <div className="section-title">Pass Settings</div>
          <div className="grid2">
            <div>
              <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Room Settings</div>
              <div className="mb1"><label>Teacher Name</label><input value={settings.teacherName} onChange={e => setSettings(s => ({ ...s, teacherName: e.target.value }))} /></div>
              <div className="mb1"><label>Room Number</label><input value={settings.room} onChange={e => setSettings(s => ({ ...s, room: e.target.value }))} /></div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Pass Rules</div>
              <div className="mb1">
                <label>Max Students Out at Once</label>
                <select value={settings.maxOut} onChange={e => setSettings(s => ({ ...s, maxOut: Number(e.target.value) }))}>
                  {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="mb1">
                <label>Flag After (minutes)</label>
                <input type="number" min={1} max={60} value={settings.flagAfter} onChange={e => setSettings(s => ({ ...s, flagAfter: Number(e.target.value) }))} />
              </div>
              <div className="mb1">
                <label>Lockout (minutes at start/end of period)</label>
                <input type="number" min={0} max={20} value={settings.lockoutMin} onChange={e => setSettings(s => ({ ...s, lockoutMin: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
          <div className="mt2">
            <label>Active Destinations</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.25rem" }}>
              {DESTINATIONS.map(d => {
                const active = settings.destinations.includes(d.key);
                return (
                  <button key={d.key} type="button"
                    className={`btn btn-sm ${active ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setSettings(s => ({
                      ...s,
                      destinations: active ? s.destinations.filter(x => x !== d.key) : [...s.destinations, d.key],
                    }))}
                  >
                    {d.icon} {d.key}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
