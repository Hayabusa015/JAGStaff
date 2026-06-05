import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GOLD, DESTINATIONS } from "../constants.js";
import { useSharedHallPasses, useStaffDirectory, useRoomPasses, ROOM_PASS_REASONS, useLateArrivals, useBellSchedule, periodForTime, SUPABASE_READY } from "../supabase.js";
import HallPassAnalytics from "./HallPassAnalytics.jsx";

const timeToMin = (s) => { if (!s || !s.includes(":")) return null; const [h, m] = s.split(":").map(Number); return h * 60 + m; };

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

function KioskScreen({ passes, addPass, returnPass, settings, students, onClose, allRoomPasses = [] }) {
  const [screen, setScreen] = useState("home"); // home | destination | confirm-return
  const [selected, setSelected] = useState(null);
  const [kioskSearch, setKioskSearch] = useState("");
  const [flash, setFlash] = useState(null); // {type:'in'|'out', name, dest}
  const [tick, setTick] = useState(0);
  const [clockStr, setClockStr] = useState(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
  const { isFs, toggle: toggleFs } = useFullscreen();

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

  return createPortal(
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
          <button
            onClick={() => setScreen(s => s === "locator" ? "home" : "locator")}
            style={{ background: screen === "locator" ? `rgba(245,192,37,0.15)` : "rgba(255,255,255,0.06)", border: `1px solid ${screen === "locator" ? "rgba(245,192,37,0.4)" : "rgba(255,255,255,0.15)"}`, borderRadius: "8px", color: screen === "locator" ? GOLD : "rgba(255,255,255,0.5)", padding: "0.45rem 1rem", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem" }}>
            🔍 Locator
          </button>
          <button onClick={toggleFs} title={isFs ? "Exit Fullscreen" : "Fullscreen"} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "rgba(255,255,255,0.6)", padding: "0.45rem 0.7rem", cursor: "pointer", display: "flex", alignItems: "center" }}>
            {isFs
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V3h4"/><path d="M21 7V3h-4"/><path d="M3 17v4h4"/><path d="M21 17v4h-4"/></svg>
            }
          </button>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "rgba(255,255,255,0.7)", padding: "0.45rem 1rem", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            🔒 Close
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem", zIndex: 1 }}>

        {/* Status board — currently out (hidden when locator is open) */}
        {screen !== "locator" && activePasses.length > 0 ? (
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
        ) : screen !== "locator" ? (
          <div style={{ textAlign: "center", padding: "2rem", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#4ade80", letterSpacing: "0.08em" }}>ALL STUDENTS PRESENT</div>
          </div>
        ) : null}

        {/* ── Admin Locator ── */}
        {screen === "locator" && (() => {
          const hallOut = activePasses.slice().sort((a, b) => elapsed(b.outTime) - elapsed(a.outTime));
          const roomOut = allRoomPasses.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          const totalOut = hallOut.length + roomOut.length;
          return (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <span style={{ fontWeight: 900, fontSize: "1.1rem", letterSpacing: "0.1em", color: GOLD, textTransform: "uppercase" }}>📍 Student Locator</span>
                <span style={{ background: totalOut > 0 ? "rgba(248,113,113,0.2)" : "rgba(74,222,128,0.15)", border: `1px solid ${totalOut > 0 ? "rgba(248,113,113,0.4)" : "rgba(74,222,128,0.3)"}`, borderRadius: 999, padding: "0.15rem 0.65rem", fontSize: "0.72rem", fontWeight: 800, color: totalOut > 0 ? "#fca5a5" : "#4ade80" }}>
                  {totalOut} student{totalOut !== 1 ? "s" : ""} out of class
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={() => setScreen("home")} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.6)", padding: "0.4rem 0.9rem", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>← Back</button>
              </div>

              {totalOut === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 0" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>✅</div>
                  <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#4ade80", letterSpacing: "0.08em" }}>ALL STUDENTS IN CLASS</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

                  {/* Hall passes */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem" }}>
                      {hallOut.length > 0 && <span className="pulse-dot" />}
                      <span style={{ fontWeight: 800, fontSize: "0.78rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>🚶 Out of Room</span>
                      <span style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999, padding: "0.1rem 0.5rem", fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{hallOut.length}</span>
                    </div>
                    {hallOut.length === 0 ? (
                      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", padding: "1rem 0" }}>No hall passes active</div>
                    ) : hallOut.map(p => {
                      const secs = elapsed(p.outTime);
                      const flagSecs = settings.flagAfter * 60;
                      const critical = secs > flagSecs * 1.5;
                      const flagged = secs > flagSecs;
                      const ac = critical ? "#f87171" : flagged ? "#fb923c" : GOLD;
                      return (
                        <div key={p.id} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ac}44`, borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
                          <div style={{ width: 42, height: 42, borderRadius: "50%", background: `${ac}22`, border: `2px solid ${ac}`, color: ac, fontWeight: 900, fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {p.studentName?.split(" ").map(w => w[0]).join("").slice(0, 2)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.92rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.studentName}</div>
                            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", marginTop: "0.1rem" }}>
                              {destIcons[p.destination] || "📍"} {p.destination} · Rm {p.room || "?"}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontWeight: 800, color: ac, fontSize: "0.88rem" }}>{fmtElapsed(secs)}</div>
                            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>since {fmtClock(p.outTime)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Room passes */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem" }}>
                      {roomOut.length > 0 && <span className="pulse-dot" style={{ background: "#60a5fa" }} />}
                      <span style={{ fontWeight: 800, fontSize: "0.78rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>🏫 Between Rooms</span>
                      <span style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999, padding: "0.1rem 0.5rem", fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{roomOut.length}</span>
                    </div>
                    {roomOut.length === 0 ? (
                      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", padding: "1rem 0" }}>No room passes active</div>
                    ) : roomOut.map(p => {
                      const secs = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 1000);
                      const flagSecs = settings.flagAfter * 60;
                      const critical = secs > flagSecs * 1.5;
                      const flagged = secs > flagSecs;
                      const ac = critical ? "#f87171" : flagged ? "#fb923c" : "#60a5fa";
                      const statusColor = p.status === "arrived" ? "#4ade80" : "#60a5fa";
                      return (
                        <div key={p.id} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ac}44`, borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
                          <div style={{ width: 42, height: 42, borderRadius: "50%", background: `${ac}22`, border: `2px solid ${ac}`, color: ac, fontWeight: 900, fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {p.student_name?.split(" ").map(w => w[0]).join("").slice(0, 2)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.92rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.student_name}</div>
                            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", marginTop: "0.1rem" }}>
                              Rm {p.from_room || "?"} → {p.to_teacher} {p.to_room ? `Rm ${p.to_room}` : ""}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ background: `${statusColor}22`, border: `1px solid ${statusColor}55`, borderRadius: 999, padding: "0.1rem 0.5rem", fontSize: "0.65rem", fontWeight: 800, color: statusColor, marginBottom: "0.2rem" }}>{p.status}</div>
                            <div style={{ fontWeight: 700, color: ac, fontSize: "0.82rem" }}>{fmtElapsed(secs)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}
            </div>
          );
        })()}

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
    </div>,
    document.body
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
  const { sentByMe, sentToMe, allActive: allActiveRoomPasses, sendPass, markArrived: markRoomArrived, dismiss } = useRoomPasses(user?.email);
  const { arrivals: lateArrivals, logArrival, confirmArrival } = useLateArrivals();
  const { periods: bellPeriods } = useBellSchedule();

  // Room pass form
  const [rpStudent, setRpStudent] = useState(null);
  const [rpSearch, setRpSearch] = useState("");
  const [rpSearchResults, setRpSearchResults] = useState([]);
  const [rpTeacher, setRpTeacher] = useState("");
  const [rpReason, setRpReason] = useState(ROOM_PASS_REASONS[0]);
  const [rpSent, setRpSent] = useState(false);

  // Late arrival form
  const [laSearch, setLaSearch] = useState("");
  const [laResults, setLaResults] = useState([]);
  const [laStudent, setLaStudent] = useState(null);
  const [laNotes, setLaNotes] = useState("");
  const [laLogged, setLaLogged] = useState(false);

  useEffect(() => {
    if (!rpSearch.trim()) { setRpSearchResults([]); return; }
    setRpSearchResults(students.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(rpSearch.toLowerCase())
    ).slice(0, 6));
  }, [rpSearch, students]);

  useEffect(() => {
    if (!laSearch.trim()) { setLaResults([]); return; }
    setLaResults(students.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(laSearch.toLowerCase())
    ).slice(0, 6));
  }, [laSearch, students]);

  async function handleSendRoomPass(e) {
    e.preventDefault();
    if (!rpStudent || !rpTeacher) return;
    const toTeacher = staff.find(s => s.email === rpTeacher);
    if (!toTeacher) return;
    await sendPass({
      studentId: rpStudent.id,
      studentName: `${rpStudent.firstName} ${rpStudent.lastName}`,
      toTeacher, reason: rpReason,
      fromTeacher: settings.teacherName,
      fromEmail: user?.email,
      fromRoom: settings.room,
    });
    setRpStudent(null); setRpSearch(""); setRpTeacher(""); setRpReason(ROOM_PASS_REASONS[0]);
    setRpSent(true); setTimeout(() => setRpSent(false), 3000);
  }

  async function handleLogLateArrival(e) {
    e.preventDefault();
    if (!laStudent) return;
    await logArrival({ studentId: laStudent.id, studentName: `${laStudent.firstName} ${laStudent.lastName}`, notes: laNotes });
    setLaStudent(null); setLaSearch(""); setLaNotes("");
    setLaLogged(true); setTimeout(() => setLaLogged(false), 3000);
  }

  const incomingPending = sentToMe.filter(p => p.status === "pending");
  const unconfirmedLate = lateArrivals.filter(a => !a.confirmed_by);
  const [logSearch, setLogSearch] = useState("");

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
    <KioskScreen passes={passes} addPass={addPass} returnPass={returnPass}
      settings={settings} students={students} onClose={() => setKioskMode(false)}
      allRoomPasses={allActiveRoomPasses} />
  );

  function fmtShortTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

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

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.25rem", alignItems: "start" }}>

        {/* ── LEFT: main hall pass content ── */}
        <div>
          {/* Stats */}
          <div className="grid3 mb2">
            <div className="card" style={{ textAlign: "center" }}>
              <div className="stat-num" style={{ color: activePasses.length > 0 ? "#dc2626" : GOLD }}>{activePasses.length}</div>
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
                <div key={p.id} className="flex items-center justify-between" style={{ padding: "0.4rem 0", borderBottom: "1px solid rgba(200,200,200,0.15)" }}>
                  <div className="flex items-center gap1">
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.75rem", color: "#1a1200" }}>
                      {p.studentName?.split(" ").map(w => w[0]).join("").slice(0, 2)}
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
            {["overview", "analytics", "log", "settings"].map(t => (
              <button key={t} className={`btn btn-sm ${subTab === t ? "btn-primary" : "btn-ghost"}`}
                style={{ textTransform: "capitalize" }} onClick={() => setSubTab(t)}>{t}
              </button>
            ))}
          </div>

          {subTab === "analytics" && <HallPassAnalytics log={log} settings={settings} />}

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
              <div className="section-title">Pass Log</div>
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
                      {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
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
                        }))}>
                        {d.icon} {d.key}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Room Passes + Late Arrivals ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Late Arrivals panel */}
          <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
            <div style={{ fontWeight: 800, fontSize: "0.75rem", letterSpacing: "0.1em", color: "#f59e0b", marginBottom: "0.75rem" }}>🕐 LATE ARRIVALS</div>

            {/* Unconfirmed alert */}
            {unconfirmedLate.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                {unconfirmedLate.map(a => (
                  <div key={a.id} style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", padding: "0.6rem 0.75rem", marginBottom: "0.4rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{a.student_name}</div>
                        <div style={{ fontSize: "0.72rem", color: "rgba(240,234,216,0.5)", marginTop: "0.1rem" }}>Arrived {fmtShortTime(a.arrived_at)}{a.notes ? ` · ${a.notes}` : ""}</div>
                      </div>
                      <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}
                        onClick={() => confirmArrival(a.id, settings.teacherName)}>
                        ✓ Entered
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {unconfirmedLate.length === 0 && lateArrivals.length === 0 && (
              <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>No late arrivals logged today.</p>
            )}

            {/* Sign-in form */}
            {laLogged && <div style={{ color: "#4ade80", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem" }}>✓ Late arrival logged.</div>}
            <form onSubmit={handleLogLateArrival}>
              <div style={{ position: "relative", marginBottom: "0.5rem" }}>
                {laStudent ? (
                  <div className="flex items-center gap1">
                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{laStudent.firstName} {laStudent.lastName}</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setLaStudent(null); setLaSearch(""); }}>✕</button>
                  </div>
                ) : (
                  <>
                    <input value={laSearch} onChange={e => setLaSearch(e.target.value)} placeholder="Student name…" style={{ fontSize: "0.85rem" }} />
                    {laResults.length > 0 && (
                      <ul className="autocomplete-list" style={{ zIndex: 20 }}>
                        {laResults.map(s => (
                          <li key={s.id} className="autocomplete-item" onClick={() => { setLaStudent(s); setLaSearch(""); setLaResults([]); }}>
                            {s.firstName} {s.lastName} <span className="tag tag-amber">{s.grade}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
              <input value={laNotes} onChange={e => setLaNotes(e.target.value)} placeholder="Notes (optional)" style={{ marginBottom: "0.5rem", fontSize: "0.85rem" }} />
              <button type="submit" className="btn btn-primary btn-sm" style={{ width: "100%" }} disabled={!laStudent}>
                + Log Late Arrival
              </button>
            </form>

            {/* Confirmed today */}
            {lateArrivals.filter(a => a.confirmed_by).length > 0 && (
              <div style={{ marginTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.5rem" }}>
                <div style={{ fontSize: "0.7rem", color: "rgba(240,234,216,0.35)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "0.35rem" }}>CONFIRMED</div>
                {lateArrivals.filter(a => a.confirmed_by).map(a => (
                  <div key={a.id} style={{ fontSize: "0.78rem", color: "rgba(240,234,216,0.5)", display: "flex", justifyContent: "space-between", padding: "0.15rem 0" }}>
                    <span>{a.student_name}</span>
                    <span style={{ color: "#4ade80" }}>✓ {a.confirmed_by}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Room Passes panel */}
          <div className="card" style={{ borderLeft: "4px solid #f97316" }}>
            <div style={{ fontWeight: 800, fontSize: "0.75rem", letterSpacing: "0.1em", color: "#f97316", marginBottom: "0.75rem" }}>
              📨 ROOM PASSES
              {incomingPending.length > 0 && <span style={{ marginLeft: "0.5rem", background: "#ef4444", color: "#fff", borderRadius: "999px", fontSize: "0.65rem", padding: "0.1rem 0.45rem", fontWeight: 800 }}>{incomingPending.length}</span>}
            </div>

            {/* Incoming */}
            {incomingPending.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.72rem", color: "rgba(240,234,216,0.4)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "0.35rem" }}>INCOMING — ON THEIR WAY</div>
                {incomingPending.map(p => (
                  <div key={p.id} style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: "8px", padding: "0.6rem 0.75rem", marginBottom: "0.4rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{p.student_name}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(240,234,216,0.5)" }}>from {p.from_teacher} · {p.reason}</div>
                    <div className="flex gap1" style={{ marginTop: "0.4rem" }}>
                      <button className="btn btn-primary btn-sm" onClick={() => markRoomArrived(p.id)}>✓ Arrived</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => dismiss(p.id)}>Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Send form */}
            {rpSent && <div style={{ color: "#4ade80", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem" }}>✓ Pass sent.</div>}
            <form onSubmit={handleSendRoomPass}>
              <div style={{ position: "relative", marginBottom: "0.5rem" }}>
                {rpStudent ? (
                  <div className="flex items-center gap1">
                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{rpStudent.firstName} {rpStudent.lastName}</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRpStudent(null); setRpSearch(""); }}>✕</button>
                  </div>
                ) : (
                  <>
                    <input value={rpSearch} onChange={e => setRpSearch(e.target.value)} placeholder="Student name…" style={{ fontSize: "0.85rem" }} />
                    {rpSearchResults.length > 0 && (
                      <ul className="autocomplete-list" style={{ zIndex: 20 }}>
                        {rpSearchResults.map(s => (
                          <li key={s.id} className="autocomplete-item" onClick={() => { setRpStudent(s); setRpSearch(""); setRpSearchResults([]); }}>
                            {s.firstName} {s.lastName} <span className="tag tag-amber">{s.grade}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
              <select value={rpTeacher} onChange={e => setRpTeacher(e.target.value)} style={{ marginBottom: "0.5rem", fontSize: "0.85rem" }} required>
                <option value="">— Send to teacher —</option>
                {staff.filter(s => s.email !== user?.email).map(s => (
                  <option key={s.email} value={s.email}>{s.name}{s.room ? ` · Rm ${s.room}` : ""}</option>
                ))}
              </select>
              <select value={rpReason} onChange={e => setRpReason(e.target.value)} style={{ marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                {ROOM_PASS_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
              <button type="submit" className="btn btn-primary btn-sm" style={{ width: "100%" }} disabled={!rpStudent || !rpTeacher}>
                Send Room Pass
              </button>
            </form>

            {/* History */}
            {sentByMe.length > 0 && (
              <div style={{ marginTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.5rem" }}>
                <div style={{ fontSize: "0.7rem", color: "rgba(240,234,216,0.35)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "0.5rem" }}>SENT TODAY</div>
                {sentByMe.slice(0, 8).map(p => {
                  const ageMin = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 60000);
                  // Prefer the real bell schedule: a pass expires when its period has ended.
                  const sentPeriod = periodForTime(bellPeriods, p.created_at);
                  const expired = sentPeriod
                    ? (new Date().getHours() * 60 + new Date().getMinutes()) >= timeToMin(sentPeriod.end)
                    : ageMin >= settings.periodLength;
                  const active = p.status !== "dismissed";
                  return (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.35rem 0.5rem", marginBottom: "0.25rem", borderRadius: 6,
                      background: expired && active ? "rgba(245,158,11,0.07)" : "transparent",
                      border: expired && active ? "1px solid rgba(245,158,11,0.2)" : "1px solid transparent",
                      gap: "0.4rem",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.78rem", color: expired && active ? "#fbbf24" : "rgba(255,255,255,0.6)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.student_name} → {p.to_teacher}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                          {ageMin < 60 ? `${ageMin}m ago` : `${Math.floor(ageMin / 60)}h ${ageMin % 60}m ago`}
                          {expired && active && " · period likely ended"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                        <span className={`tag ${p.status === "arrived" ? "tag-green" : p.status === "dismissed" ? "tag-amber" : "tag-blue"}`} style={{ fontSize: "0.6rem" }}>{p.status}</span>
                        {active && (
                          <button onClick={() => dismiss(p.id)} title="Dismiss pass" style={{
                            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 4, color: "rgba(255,255,255,0.4)", cursor: "pointer",
                            fontSize: "0.7rem", padding: "0.1rem 0.35rem", lineHeight: 1.4,
                          }}>✕</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
