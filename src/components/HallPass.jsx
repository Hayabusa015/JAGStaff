import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GOLD, DESTINATIONS } from "../constants.js";
import { useSharedHallPasses, useStaffDirectory, useRoomPasses, ROOM_PASS_REASONS, useLateArrivals, useBellSchedule, periodForTime, periodEndDateTime, SUPABASE_READY, saveMaxOut, nowMs } from "../supabase.js";
import HallPassAnalytics from "./HallPassAnalytics.jsx";
import { Ico, DestIcon, IconSearch, IconLock, IconSwap, IconBack, IconReturn, IconCheck, IconAlert } from "./hallPassIcons.jsx";
import StudentPassInspector from "./StudentPassInspector.jsx";

const timeToMin = (s) => { if (!s || !s.includes(":")) return null; const [h, m] = s.split(":").map(Number); return h * 60 + m; };

// Uses the server-clock-corrected nowMs() rather than the raw device clock —
// a kiosk whose own clock has drifted would otherwise show a just-signed-out
// student already several seconds (or more) into their pass.
function elapsed(outTime) {
  if (!outTime) return 0;
  const t = outTime?.toDate ? outTime.toDate() : new Date(outTime);
  return Math.max(0, Math.floor((nowMs() - t.getTime()) / 1000));
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
// Digital mm:ss countdown — distinct look from fmtElapsed's "Xm Ys" so a
// period timer counting down doesn't read like an out-of-room timer counting up.
function fmtCountdown(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function isSameLocalDay(dateVal, ref) {
  const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}
// Whether "now" falls before the first period, between two periods, or
// after the last one — only used when periodForTime finds no exact match,
// to tell "passing period" apart from "before/after school".
function schoolDayStatus(periods, now) {
  if (!periods?.length) return null;
  const mins = now.getHours() * 60 + now.getMinutes();
  const sorted = [...periods].filter(p => timeToMin(p.start) != null && timeToMin(p.end) != null).sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
  if (!sorted.length) return null;
  if (mins < timeToMin(sorted[0].start)) return "before";
  if (mins >= timeToMin(sorted[sorted.length - 1].end)) return "after";
  return "passing";
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

// Shared surface tokens — one set of values so every panel in the kiosk
// shares the same glass, radius and hairline.
const SURFACE = "linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))";
const HAIRLINE = "1px solid rgba(255,255,255,0.09)";
const LABEL = { fontSize: "0.63rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)" };
const NUM = { fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' };

function GhostButton({ onClick, active, title, children, style }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex", alignItems: "center", gap: "0.45rem",
        background: active ? "rgba(245,192,37,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? "rgba(245,192,37,0.45)" : "rgba(255,255,255,0.11)"}`,
        borderRadius: 10, color: active ? GOLD : "rgba(255,255,255,0.62)",
        padding: "0.5rem 0.9rem", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem",
        letterSpacing: "0.03em", transition: "all 0.18s ease", ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = active ? "rgba(245,192,37,0.18)" : "rgba(255,255,255,0.08)"; e.currentTarget.style.color = active ? GOLD : "#fff"; }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? "rgba(245,192,37,0.12)" : "rgba(255,255,255,0.04)"; e.currentTarget.style.color = active ? GOLD : "rgba(255,255,255,0.62)"; }}
    >{children}</button>
  );
}

// Section heading with a hairline rule that fades out to the right.
function Rule({ children, tone = "rgba(255,255,255,0.4)", dot }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "1.1rem" }}>
      {dot}
      <span style={{ ...LABEL, color: tone }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${tone}30, transparent)` }} />
    </div>
  );
}

function KioskScreen({ passes, addPass, returnPass, settings, students, onClose, allRoomPasses = [], bellPeriods = [], log = [] }) {
  const [screen, setScreen] = useState("home"); // home | destination | confirm-return | locator
  const [selected, setSelected] = useState(null);
  const [kioskSearch, setKioskSearch] = useState("");
  const [filing, setFiling] = useState(null); // {type:'in'|'out', name, dest, at, flyX, flyY}
  const outGridRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [tick, setTick] = useState(0);
  const [clockStr, setClockStr] = useState(new Date(nowMs()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
  const { isFs, toggle: toggleFs } = useFullscreen();

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setClockStr(new Date(nowMs()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // status is undefined in mock mode / for legacy rows — treat that as active.
  // Only an explicit 'pending' (an unapproved student request) is excluded.
  const activePasses = passes.filter(p => p.status !== "pending");
  const maxReached = activePasses.length >= settings.maxOut;

  // ── Current period + time left in it ── reuses periodEndDateTime (the
  // same helper the auto-return fallback is built on) so the countdown shown
  // here and the moment a forgotten pass actually auto-closes always agree.
  const now = new Date(nowMs());
  const curPeriod = periodForTime(bellPeriods, now);
  const periodSecsLeft = curPeriod ? Math.max(0, Math.round((periodEndDateTime(now, bellPeriods)?.getTime() - now.getTime()) / 1000)) : null;
  const dayStatus = curPeriod ? null : schoolDayStatus(bellPeriods, now);

  // ── Today's activity strip (footer) ── counts every pass whose out_time
  // falls on today's calendar date, active ones plus already-returned log
  // rows, and averages duration over the returned ones.
  const todaysReturned = log.filter(p => p.outTime && isSameLocalDay(p.outTime, now));
  const todaysActiveCount = activePasses.filter(p => p.outTime && isSameLocalDay(p.outTime, now)).length;
  const todaysTotal = todaysActiveCount + todaysReturned.length;
  const todaysAvgMin = todaysReturned.length
    ? Math.round(todaysReturned.reduce((sum, p) => sum + (p.duration || 0), 0) / todaysReturned.length)
    : null;

  // ── One-shot "just went critical" flash ── a brief glow pulse the instant
  // a card crosses the critical threshold, so it catches your eye from
  // across the room instead of relying on you already looking at the color.
  // Fires once per pass id, not on every render while it stays critical.
  const criticalFlaggedRef = useRef(new Set());
  const initializedRef = useRef(false);
  const [flashIds, setFlashIds] = useState(() => new Set());

  useEffect(() => {
    const flagSecs = settings.flagAfter * 60;
    const seenIds = new Set();
    const newlyCritical = [];
    passes.filter(p => p.status !== "pending").forEach(p => {
      seenIds.add(p.id);
      const critical = elapsed(p.outTime) > flagSecs * 1.5;
      if (critical && !criticalFlaggedRef.current.has(p.id)) {
        criticalFlaggedRef.current.add(p.id);
        // Don't flash cards that were already critical the moment the kiosk
        // mounted (e.g. reopening a stale window) — only real crossings.
        if (initializedRef.current) newlyCritical.push(p.id);
      }
    });
    criticalFlaggedRef.current.forEach(id => { if (!seenIds.has(id)) criticalFlaggedRef.current.delete(id); });
    initializedRef.current = true;

    if (newlyCritical.length === 0) return;
    setFlashIds(prev => new Set([...prev, ...newlyCritical]));
    const timer = setTimeout(() => {
      setFlashIds(prev => {
        const next = new Set(prev);
        newlyCritical.forEach(id => next.delete(id));
        return next;
      });
    }, 1700);
    return () => clearTimeout(timer);
  }, [tick, passes, settings.flagAfter]);

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
    triggerFiling("out", `${selected.firstName} ${selected.lastName}`, dest);
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
    triggerFiling("in", `${selected.firstName} ${selected.lastName}`, selected.dest);
    setScreen("home"); setSelected(null);
  }

  // Aim the flying file card at the Currently Out grid — offsets are measured
  // from the middle of the screen, which is where the card sits mid-flight.
  // Before the first student is out there's no grid yet, so fall back to
  // roughly where that section is about to appear.
  function triggerFiling(type, name, dest) {
    const grid = outGridRef.current;
    let flyX = Math.round(window.innerWidth * -0.3);
    let flyY = Math.round(window.innerHeight * -0.24);
    if (grid) {
      const r = grid.getBoundingClientRect();
      flyX = Math.round(Math.min(r.left + 98, r.right - 60) - window.innerWidth / 2);
      flyY = Math.round(r.top + 72 - window.innerHeight / 2);
    }
    setFiling({ type, name, dest, at: fmtClock(new Date(nowMs())), flyX, flyY });
    setTimeout(() => setFiling(null), 2650);
  }

  const initials = (name) => (name || "").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const fmtDayShort = () => new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, color: "#fff", display: "flex", flexDirection: "column",
      fontFamily: "inherit", zIndex: 1000,
      // Layered ground: a warm pool of light at the top edge falling to true black.
      background: "radial-gradient(120% 80% at 50% -10%, #17130a 0%, #0a0908 40%, #050505 70%, #000 100%)",
    }}>

      {/* Crest watermark */}
      <img src="/logo.png" alt="" aria-hidden style={{
        position: "absolute", top: "52%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(64vw,560px)", opacity: 0.045, pointerEvents: "none", userSelect: "none",
        filter: "grayscale(0.3)",
      }} />

      {/* Sign-out / return: a file card is flung in, trips, gets stamped, and
          files itself into the Currently Out grid — or, on a return, flies
          back out of the grid and drops into a folder that shuts over it.
          Purely decorative and pointer-transparent, so the next student can
          start typing while it plays. */}
      {filing && (
        <div className="kiosk-filing" aria-hidden
          style={{ "--fly-x": `${filing.flyX}px`, "--fly-y": `${filing.flyY}px` }}>
          <div className={`kiosk-filing-scrim kiosk-filing-scrim-${filing.type}`} />

          {filing.type === "in" && (
            <div className="kiosk-filing-row kiosk-filing-row-folder kiosk-filing-row-back">
              <div className="kiosk-folder-back" />
            </div>
          )}

          <div className="kiosk-filing-row kiosk-filing-row-card">
            <div className={`kiosk-file-fly kiosk-file-fly-${filing.type}`}>
              <div className="kiosk-file-glow" />
              <div className="kiosk-file-card">
                <div className="kiosk-file-head">
                  <span>G-Men Hall Pass</span>
                  <span>Room {settings.room}</span>
                </div>
                <div className="kiosk-file-rule" />
                <div className="kiosk-file-name">{filing.name}</div>
                <div className="kiosk-file-meta">
                  <DestIcon dest={filing.dest} size={15} /> {filing.dest} · {filing.at}
                </div>
                <div className={`kiosk-file-stamp kiosk-file-stamp-${filing.type}`}>
                  {filing.type === "in" ? "Returned" : "Signed Out"}
                </div>
              </div>
            </div>
          </div>

          {filing.type === "in" && (
            <div className="kiosk-filing-row kiosk-filing-row-folder kiosk-filing-row-flap">
              <div className="kiosk-folder-flap" />
            </div>
          )}

          {filing.type === "out" && (
            <div className="kiosk-filing-row kiosk-filing-row-ring">
              <div className="kiosk-land-ring" />
            </div>
          )}
        </div>
      )}

      {/* ── Header ── */}
      <div className="kiosk-header">
        {/* Gradient hairline instead of a hard 2px rule */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}66 15%, ${GOLD}66 85%, transparent)` }} />

        <div className="kiosk-brand">
          <img src="/logo.png" alt="G-Men" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.98rem", letterSpacing: "0.18em", color: GOLD, lineHeight: 1.2, textTransform: "uppercase" }}>
              Hall Pass
            </div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginTop: "0.1rem" }}>
              Room {settings.room} · {settings.teacherName}
            </div>
          </div>
        </div>

        {/* Clock */}
        <div className="kiosk-clock">
          <div className="kiosk-clock-time" style={{ color: GOLD, textShadow: `0 0 34px ${GOLD}44`, ...NUM }}>
            {clockStr}
          </div>
          <div className="kiosk-date" style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: "0.3rem", letterSpacing: "0.14em" }}>
            {fmtDayShort()}
          </div>
          {curPeriod ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem", marginTop: "0.4rem", fontSize: "0.72rem", letterSpacing: "0.06em" }}>
              <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>{curPeriod.name}</span>
              {periodSecsLeft != null && (
                <span style={{ color: periodSecsLeft <= 60 ? "#fb923c" : "rgba(255,255,255,0.35)", ...NUM }}>
                  · {fmtCountdown(periodSecsLeft)} left
                </span>
              )}
            </div>
          ) : dayStatus === "passing" ? (
            <div style={{ marginTop: "0.4rem", fontSize: "0.68rem", color: "rgba(255,255,255,0.32)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Passing Period
            </div>
          ) : null}
        </div>

        <div className="kiosk-actions">
          <div className="kiosk-stats">
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 600, lineHeight: 1, color: maxReached ? "#f87171" : GOLD, ...NUM }}>
                {activePasses.length}
              </div>
              <div style={{ ...LABEL, fontSize: "0.58rem", marginTop: "0.25rem" }}>Out</div>
            </div>
            <div style={{ width: 1, height: 34, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 300, lineHeight: 1, color: "rgba(255,255,255,0.4)", ...NUM }}>
                {settings.maxOut}
              </div>
              <div style={{ ...LABEL, fontSize: "0.58rem", marginTop: "0.25rem" }}>Max</div>
            </div>
          </div>
          <GhostButton onClick={() => setScreen(s => s === "locator" ? "home" : "locator")} active={screen === "locator"}>
            <IconSearch size={15} /> <span className="kiosk-btn-label">Locator</span>
          </GhostButton>
          <GhostButton onClick={toggleFs} title={isFs ? "Exit fullscreen" : "Fullscreen"} style={{ padding: "0.5rem 0.6rem" }}>
            {isFs
              ? <Ico size={16}><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></Ico>
              : <Ico size={16}><path d="M3 7V3h4"/><path d="M21 7V3h-4"/><path d="M3 17v4h4"/><path d="M21 17v4h-4"/></Ico>}
          </GhostButton>
          <GhostButton onClick={onClose}><IconLock size={15} /> <span className="kiosk-btn-label">Close</span></GhostButton>
        </div>
      </div>

      <div className="kiosk-body">

        {/* ── Students currently out ── */}
        {screen !== "locator" && activePasses.length > 0 ? (
          <div style={{ marginBottom: "2.25rem" }}>
            <Rule tone="#fca5a5" dot={<span className="pulse-dot" />}>Currently Out</Rule>
            <div ref={outGridRef} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(196px,1fr))", gap: "1rem" }}>
              {activePasses.map(p => {
                const secs = elapsed(p.outTime);
                const flagSecs = settings.flagAfter * 60;
                const critical = secs > flagSecs * 1.5;
                const flagged = secs > flagSecs;
                const ac = critical ? "#f87171" : flagged ? "#fb923c" : GOLD;
                return (
                  <div key={p.id}
                    className={flashIds.has(p.id) ? "kiosk-card-flash" : undefined}
                    onClick={() => { setSelected({ id: p.studentId, firstName: p.studentName?.split(" ")[0] || "", lastName: p.studentName?.split(" ").slice(1).join(" ") || "", passId: p.id, dest: p.destination, outTime: p.outTime }); setScreen("confirm-return"); setKioskSearch(""); }}
                    style={{
                      position: "relative", overflow: "hidden", background: SURFACE,
                      border: `1px solid ${ac}55`, borderRadius: 16, padding: "1.35rem 1rem 1.1rem",
                      textAlign: "center", cursor: "pointer", backdropFilter: "blur(8px)",
                      transition: "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = ac; e.currentTarget.style.boxShadow = `0 12px 34px -12px ${ac}66`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = `${ac}55`; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    {/* Accent bar reads the urgency before any text does */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${ac}, transparent)` }} />

                    {critical && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#fca5a5",
                        background: "rgba(220,38,38,0.14)", border: "1px solid rgba(248,113,113,0.3)",
                        fontSize: "0.6rem", fontWeight: 700, padding: "0.22rem 0.55rem", borderRadius: 999,
                        marginBottom: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        <IconAlert size={11} /> Check on
                      </div>
                    )}

                    <div style={{
                      width: 62, height: 62, borderRadius: "50%", margin: "0 auto 0.8rem",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `radial-gradient(circle at 50% 30%, ${ac}2e, transparent 70%)`,
                      border: `1.5px solid ${ac}88`, color: ac, fontWeight: 600, fontSize: "1.15rem", letterSpacing: "0.04em",
                    }}>{initials(p.studentName)}</div>

                    <div style={{ fontWeight: 600, fontSize: "1rem", letterSpacing: "0.01em" }}>{p.studentName}</div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
                      fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: "0.35rem" }}>
                      <DestIcon dest={p.destination} size={13} /> {p.destination}
                    </div>

                    <div style={{ color: ac, fontWeight: 500, marginTop: "0.7rem", fontSize: "1.45rem", letterSpacing: "0.02em", ...NUM }}>
                      {fmtElapsed(secs)}
                    </div>
                    <div style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.28)", marginTop: "0.15rem", letterSpacing: "0.06em" }}>
                      since {fmtClock(p.outTime)}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
                      marginTop: "0.9rem", paddingTop: "0.75rem", borderTop: `1px solid ${ac}22`,
                      fontSize: "0.66rem", fontWeight: 600, color: ac, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                      <IconReturn size={12} /> Tap to return
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : screen !== "locator" ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0 2.5rem" }}>
            <div style={{
              width: 66, height: 66, borderRadius: "50%", margin: "0 auto 1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(74,222,128,0.35)",
              background: "radial-gradient(circle at 50% 30%, rgba(74,222,128,0.14), transparent 70%)",
              color: "#4ade80",
            }}><IconCheck size={28} stroke={1.8} /></div>
            <div style={{ fontWeight: 500, fontSize: "0.82rem", color: "rgba(74,222,128,0.85)", letterSpacing: "0.26em", textTransform: "uppercase" }}>
              All students present
            </div>
          </div>
        ) : null}

        {/* ── Admin Locator ── */}
        {screen === "locator" && (() => {
          const hallOut = activePasses.slice().sort((a, b) => elapsed(b.outTime) - elapsed(a.outTime));
          const roomOut = allRoomPasses.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          const totalOut = hallOut.length + roomOut.length;
          return (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem" }}>
                <span style={{ fontWeight: 600, fontSize: "0.95rem", letterSpacing: "0.2em", color: GOLD, textTransform: "uppercase" }}>
                  Student Locator
                </span>
                <span style={{
                  background: totalOut > 0 ? "rgba(248,113,113,0.14)" : "rgba(74,222,128,0.12)",
                  border: `1px solid ${totalOut > 0 ? "rgba(248,113,113,0.35)" : "rgba(74,222,128,0.28)"}`,
                  borderRadius: 999, padding: "0.2rem 0.7rem", fontSize: "0.7rem", fontWeight: 600,
                  color: totalOut > 0 ? "#fca5a5" : "#4ade80", letterSpacing: "0.04em",
                }}>{totalOut} out of class</span>
                <div style={{ flex: 1 }} />
                <GhostButton onClick={() => setScreen("home")}><IconBack size={14} /> Back</GhostButton>
              </div>

              {totalOut === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 0" }}>
                  <div style={{
                    width: 66, height: 66, borderRadius: "50%", margin: "0 auto 1rem",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid rgba(74,222,128,0.35)",
                    background: "radial-gradient(circle at 50% 30%, rgba(74,222,128,0.14), transparent 70%)",
                    color: "#4ade80",
                  }}><IconCheck size={28} stroke={1.8} /></div>
                  <div style={{ fontWeight: 500, fontSize: "0.82rem", color: "rgba(74,222,128,0.85)", letterSpacing: "0.26em", textTransform: "uppercase" }}>
                    All students in class
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.75rem" }}>

                  {/* Hall passes */}
                  <div>
                    <Rule tone="rgba(255,255,255,0.5)" dot={hallOut.length > 0 ? <span className="pulse-dot" /> : null}>
                      Out of Room · {hallOut.length}
                    </Rule>
                    {hallOut.length === 0 ? (
                      <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.25)", padding: "0.5rem 0", letterSpacing: "0.04em" }}>No hall passes active</div>
                    ) : hallOut.map(p => {
                      const secs = elapsed(p.outTime);
                      const flagSecs = settings.flagAfter * 60;
                      const critical = secs > flagSecs * 1.5;
                      const flagged = secs > flagSecs;
                      const ac = critical ? "#f87171" : flagged ? "#fb923c" : GOLD;
                      return (
                        <div key={p.id} style={{
                          background: SURFACE, border: `1px solid ${ac}33`, borderRadius: 12,
                          padding: "0.8rem 1rem", marginBottom: "0.55rem", display: "flex",
                          alignItems: "center", gap: "0.9rem", backdropFilter: "blur(6px)",
                        }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: `radial-gradient(circle at 50% 30%, ${ac}2a, transparent 70%)`,
                            border: `1.5px solid ${ac}77`, color: ac, fontWeight: 600, fontSize: "0.82rem",
                          }}>{initials(p.studentName)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.studentName}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "rgba(255,255,255,0.42)", marginTop: "0.15rem" }}>
                              <DestIcon dest={p.destination} size={12} /> {p.destination} · Rm {p.room || "?"}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontWeight: 600, color: ac, fontSize: "0.92rem", ...NUM }}>{fmtElapsed(secs)}</div>
                            <div style={{ fontSize: "0.63rem", color: "rgba(255,255,255,0.28)" }}>since {fmtClock(p.outTime)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Room passes */}
                  <div>
                    <Rule tone="rgba(255,255,255,0.5)" dot={roomOut.length > 0 ? <span className="pulse-dot" style={{ background: "#60a5fa" }} /> : null}>
                      Between Rooms · {roomOut.length}
                    </Rule>
                    {roomOut.length === 0 ? (
                      <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.25)", padding: "0.5rem 0", letterSpacing: "0.04em" }}>No room passes active</div>
                    ) : roomOut.map(p => {
                      const secs = Math.max(0, Math.floor((nowMs() - new Date(p.created_at).getTime()) / 1000));
                      const flagSecs = settings.flagAfter * 60;
                      const critical = secs > flagSecs * 1.5;
                      const flagged = secs > flagSecs;
                      const ac = critical ? "#f87171" : flagged ? "#fb923c" : "#60a5fa";
                      const statusColor = p.status === "arrived" ? "#4ade80" : "#60a5fa";
                      return (
                        <div key={p.id} style={{
                          background: SURFACE, border: `1px solid ${ac}33`, borderRadius: 12,
                          padding: "0.8rem 1rem", marginBottom: "0.55rem", display: "flex",
                          alignItems: "center", gap: "0.9rem", backdropFilter: "blur(6px)",
                        }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: `radial-gradient(circle at 50% 30%, ${ac}2a, transparent 70%)`,
                            border: `1.5px solid ${ac}77`, color: ac, fontWeight: 600, fontSize: "0.82rem",
                          }}>{initials(p.student_name)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.student_name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "rgba(255,255,255,0.42)", marginTop: "0.15rem" }}>
                              <IconSwap size={12} /> Rm {p.from_room || "?"} → {p.to_teacher} {p.to_room ? `Rm ${p.to_room}` : ""}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{
                              background: `${statusColor}1e`, border: `1px solid ${statusColor}44`, borderRadius: 999,
                              padding: "0.1rem 0.5rem", fontSize: "0.6rem", fontWeight: 700, color: statusColor,
                              marginBottom: "0.25rem", letterSpacing: "0.1em", textTransform: "uppercase",
                            }}>{p.status}</div>
                            <div style={{ fontWeight: 600, color: ac, fontSize: "0.85rem", ...NUM }}>{fmtElapsed(secs)}</div>
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

        {/* ── Sign out / return ── */}
        {screen === "home" && (
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ ...LABEL, fontSize: "0.7rem", letterSpacing: "0.28em", color: "rgba(255,255,255,0.55)" }}>
                Type your name to sign out or return
              </div>
            </div>

            {maxReached && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                color: "#fca5a5", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(248,113,113,0.28)",
                borderRadius: 10, padding: "0.6rem 1rem", marginBottom: "1rem",
                fontWeight: 600, fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase",
              }}>
                <IconAlert size={14} /> Max students out — returns only
              </div>
            )}

            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: "1.15rem", top: "50%", transform: "translateY(-50%)",
                color: focused ? GOLD : "rgba(255,255,255,0.3)", pointerEvents: "none",
                transition: "color 0.2s ease", display: "flex",
              }}><IconSearch size={20} /></span>
              <input
                value={kioskSearch}
                onChange={e => setKioskSearch(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Start typing your name…"
                autoFocus
                style={{
                  width: "100%", fontSize: "1.25rem", fontWeight: 400, letterSpacing: "0.01em",
                  padding: "1.1rem 1.25rem 1.1rem 3.2rem",
                  background: focused ? "rgba(245,192,37,0.05)" : "rgba(255,255,255,0.045)",
                  color: "#fff", borderRadius: 14, outline: "none",
                  border: `1px solid ${focused ? `${GOLD}88` : "rgba(255,255,255,0.12)"}`,
                  boxShadow: focused ? `0 0 0 4px ${GOLD}14, 0 10px 34px -14px ${GOLD}55` : "none",
                  transition: "all 0.2s ease",
                }}
              />
              {kioskSearch.trim().length > 0 && filteredStudents.length > 0 && (
                <ul className="autocomplete-list" style={{ top: "calc(100% + 8px)", left: 0, right: 0, maxHeight: 340, overflowY: "auto", zIndex: 50, borderRadius: 14 }}>
                  {filteredStudents.slice(0, 8).map(s => {
                    const isOut = activePasses.find(p => p.studentId === s.id);
                    const disabled = maxReached && !isOut;
                    return (
                      <li key={s.id}
                        className="autocomplete-item"
                        style={{ opacity: disabled ? 0.35 : 1, cursor: disabled ? "not-allowed" : "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1.02rem", padding: "0.9rem 1.15rem" }}
                        onClick={() => { if (!disabled) { selectStudent(s); setKioskSearch(""); } }}
                      >
                        <span style={{ fontWeight: 600 }}>{s.firstName} {s.lastName}</span>
                        {isOut
                          ? <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: GOLD, fontWeight: 600, fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase" }}><IconReturn size={12} /> Return</span>
                          : <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>Sign out →</span>
                        }
                      </li>
                    );
                  })}
                </ul>
              )}
              {kioskSearch.trim().length > 0 && filteredStudents.length === 0 && (
                <div style={{ marginTop: "0.9rem", textAlign: "center", color: "rgba(255,255,255,0.32)", fontSize: "0.85rem", letterSpacing: "0.06em" }}>
                  No students found
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Destination picker ── */}
        {screen === "destination" && selected && (
          <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto" }}>
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ ...LABEL, marginBottom: "0.5rem" }}>Signing out</div>
              <div style={{ fontWeight: 600, fontSize: "1.7rem", letterSpacing: "0.01em" }}>{selected.firstName} {selected.lastName}</div>
              <div style={{ color: "rgba(255,255,255,0.42)", marginTop: "0.4rem", fontSize: "0.88rem", letterSpacing: "0.04em" }}>Where are you going?</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(142px,1fr))", gap: "0.85rem" }}>
              {DESTINATIONS.map(d => (
                <button key={d.key} onClick={() => signOut(d.key)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.7rem",
                    background: SURFACE, border: HAIRLINE, borderRadius: 16, padding: "1.5rem 0.5rem",
                    color: "rgba(255,255,255,0.85)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500,
                    letterSpacing: "0.05em", backdropFilter: "blur(6px)",
                    transition: "transform 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = `${GOLD}77`; e.currentTarget.style.color = GOLD; e.currentTarget.style.boxShadow = `0 14px 34px -16px ${GOLD}88`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <DestIcon dest={d.key} size={30} />
                  {d.key}
                </button>
              ))}
            </div>
            <div style={{ marginTop: "1.75rem", display: "flex", justifyContent: "center" }}>
              <GhostButton onClick={() => { setScreen("home"); setSelected(null); }}><IconBack size={14} /> Back</GhostButton>
            </div>
          </div>
        )}

        {/* ── Return confirmation ── */}
        {screen === "confirm-return" && selected && (
          <div style={{ textAlign: "center", maxWidth: 440, margin: "1.5rem auto 0" }}>
            <div style={{
              background: SURFACE, border: HAIRLINE, borderRadius: 20, padding: "2.25rem 2rem",
              backdropFilter: "blur(10px)", boxShadow: "0 24px 60px -30px rgba(0,0,0,0.9)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", ...LABEL, marginBottom: "0.9rem" }}>
                <DestIcon dest={selected.dest} size={13} /> Returning from {selected.dest}
              </div>
              <div style={{ fontWeight: 600, fontSize: "1.65rem", letterSpacing: "0.01em" }}>{selected.firstName} {selected.lastName}</div>
              <div style={{ color: GOLD, fontWeight: 300, fontSize: "3.1rem", margin: "1.1rem 0 0.3rem", letterSpacing: "0.03em", textShadow: `0 0 38px ${GOLD}3a`, ...NUM }}>
                {fmtElapsed(elapsed(selected.outTime))}
              </div>
              <div style={{ ...LABEL, fontSize: "0.6rem", marginBottom: "1.75rem" }}>Time out</div>

              <div style={{ display: "flex", gap: "0.7rem", justifyContent: "center" }}>
                <GhostButton onClick={() => { setScreen("home"); setSelected(null); }} style={{ padding: "0.7rem 1.2rem" }}>
                  <IconBack size={14} /> Back
                </GhostButton>
                <button onClick={signIn}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.45rem",
                    background: `linear-gradient(135deg, ${GOLD}, #e0a815)`, color: "#0a0700",
                    border: "none", borderRadius: 10, padding: "0.7rem 1.5rem", cursor: "pointer",
                    fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.06em",
                    boxShadow: `0 10px 26px -10px ${GOLD}aa`, transition: "transform 0.16s ease, box-shadow 0.16s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 16px 32px -10px ${GOLD}cc`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 10px 26px -10px ${GOLD}aa`; }}
                >
                  <IconCheck size={15} stroke={2.2} /> Sign back in
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="kiosk-footer">
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}22 20%, ${GOLD}22 80%, transparent)` }} />
        <span>Garfield G-Men · Room {settings.room}</span>
        <span style={NUM}>
          {todaysTotal > 0 ? `${todaysTotal} pass${todaysTotal === 1 ? "" : "es"} today${todaysAvgMin != null ? ` · avg ${todaysAvgMin}m` : ""}` : "No passes yet today"}
        </span>
        <span style={NUM}>{activePasses.length} out · max {settings.maxOut}</span>
      </div>
    </div>,
    document.body
  );
}

export default function HallPass({ user, students }) {
  const { passes, log, ready, addPass, returnPass, autoReturnPass, approvePass, denyPass } = useSharedHallPasses();
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
  const { periodsToday: bellPeriods, schedules: bellSchedules } = useBellSchedule();

  // Seed maxOut from the persisted directory value the first time it loads,
  // so a student's "N already out" screen and this teacher's own setting
  // start in agreement. Only runs once — after that, edits here are the
  // source of truth until saved back out.
  const [maxOutSynced, setMaxOutSynced] = useState(false);
  useEffect(() => {
    if (maxOutSynced || !user?.email || staff.length === 0) return;
    const mine = staff.find(s => s.email === user.email);
    if (mine?.max_out != null) setSettings(s => ({ ...s, maxOut: mine.max_out }));
    setMaxOutSynced(true);
  }, [staff, user?.email, maxOutSynced]);

  function updateMaxOut(n) {
    setSettings(s => ({ ...s, maxOut: n }));
    saveMaxOut(user?.email, n);
  }

  // Room pass form
  const [rpStudent, setRpStudent] = useState(null);
  const [rpSearch, setRpSearch] = useState("");
  const [rpSearchResults, setRpSearchResults] = useState([]);
  const [rpTeacher, setRpTeacher] = useState("");
  const [rpReason, setRpReason] = useState(ROOM_PASS_REASONS[0]);
  const [rpSent, setRpSent] = useState(false);

  // Issue-a-pass form (main page — mirrors what kiosk mode does, so a teacher
  // can sign a student out without blanking the screen into kiosk mode).
  const [hpSearch, setHpSearch] = useState("");
  const [hpResults, setHpResults] = useState([]);
  const [hpStudent, setHpStudent] = useState(null);
  const [hpDest, setHpDest] = useState(DESTINATIONS[0].key);
  const [hpBusy, setHpBusy] = useState(false);

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
    if (!hpSearch.trim()) { setHpResults([]); return; }
    setHpResults(students.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(hpSearch.toLowerCase())
    ).slice(0, 6));
  }, [hpSearch, students]);

  useEffect(() => {
    if (!laSearch.trim()) { setLaResults([]); return; }
    setLaResults(students.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(laSearch.toLowerCase())
    ).slice(0, 6));
  }, [laSearch, students]);

  async function handleIssuePass(e) {
    e.preventDefault();
    if (!hpStudent || hpBusy) return;
    setHpBusy(true);
    await addPass({
      studentId: hpStudent.id,
      studentName: `${hpStudent.firstName} ${hpStudent.lastName}`,
      destination: hpDest,
      teacherName: settings.teacherName,
      room: settings.room,
    });
    setHpStudent(null); setHpSearch(""); setHpDest(DESTINATIONS[0].key);
    setHpBusy(false);
  }

  async function handleReturnSelected(pass) {
    if (hpBusy) return;
    setHpBusy(true);
    await returnPass(pass.id, pass);
    setHpStudent(null); setHpSearch("");
    setHpBusy(false);
  }

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

  // status is undefined in mock mode / for legacy rows — treat that as active.
  // Only an explicit 'pending' (an unapproved student request) is excluded.
  const activePasses = passes.filter(p => p.status !== "pending");
  const pendingPasses = passes.filter(p => p.status === "pending");
  const [approvingId, setApprovingId] = useState(null);

  // Fallback for students who forget to tap back in: once the period they
  // signed out during has ended, silently close their pass out (return time
  // stamped as the bell, not whenever this happens to run) so the "Currently
  // Out" count and their elapsed timer don't stay stuck forever. Runs from
  // whichever screen(s) happen to be open — same best-effort model as the
  // rest of this app's syncing — so it's checked on a short interval rather
  // than relying on any one tab. A hard 6-hour ceiling also catches passes a
  // period couldn't be matched for (e.g. one still open from days ago).
  useEffect(() => {
    const AUTO_RETURN_MAX_MS = 6 * 60 * 60 * 1000;
    function checkOverdue() {
      const now = new Date();
      passes.filter(p => p.status !== "pending").forEach(p => {
        const periodEnd = periodEndDateTime(p.outTime, bellPeriods);
        if (periodEnd && now >= periodEnd) { autoReturnPass(p.id, periodEnd); return; }
        const outTime = p.outTime?.toDate ? p.outTime.toDate() : new Date(p.outTime);
        if (!periodEnd && now - outTime > AUTO_RETURN_MAX_MS) autoReturnPass(p.id, now);
      });
    }
    checkOverdue();
    const id = setInterval(checkOverdue, 20000);
    return () => clearInterval(id);
  }, [passes, bellPeriods, autoReturnPass]);

  async function handleApprove(passId) {
    setApprovingId(passId);
    await approvePass(passId);
    setApprovingId(null);
  }

  const todayLog = log;
  const avgDuration = todayLog.length ? Math.round(todayLog.reduce((s, p) => s + (p.duration || 0), 0) / todayLog.length) : null;

  // Per-student drill-down (history + restrictions)
  const [inspect, setInspect] = useState(null); // { id, name } | null
  const [inspectSearch, setInspectSearch] = useState("");
  const allPeriodNames = [...new Set([...(bellSchedules?.twt || []), ...(bellSchedules?.mf || [])].map(p => p.name))];
  const inspectResults = inspectSearch.trim()
    ? students.filter(st => `${st.firstName} ${st.lastName}`.toLowerCase().includes(inspectSearch.toLowerCase())).slice(0, 6)
    : [];

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
      allRoomPasses={allActiveRoomPasses} bellPeriods={bellPeriods} log={log} />
  );

  function fmtShortTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div>
      {/* Header */}
      <div className="hallpass-header flex items-center justify-between mb2">
        <div>
          <h2 className="page-title">Hall Pass Manager</h2>
          <div className="text-muted">
            Room {settings.room} · {settings.teacherName} ·{" "}
            <span style={{ color: ready && SUPABASE_READY ? "#16a34a" : "#f59e0b", fontWeight: 600 }}>
              {ready && SUPABASE_READY ? "● Live Sync" : "● Local Only"}
            </span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setKioskMode(true)}>🖥 Launch Kiosk Mode</button>
      </div>

      {/* Two-column layout — collapses to 1-col on mobile via CSS */}
      <div className="hallpass-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.25rem", alignItems: "start" }}>

        {/* ── LEFT: main hall pass content ── */}
        <div>
          {/* Stats */}
          <div className="hallpass-stats grid3 mb2">
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

          {/* Issue a pass — same actions as kiosk mode, inline on this page */}
          {(() => {
            const selectedOut = hpStudent && activePasses.find(p => p.studentId === hpStudent.id);
            const maxReached = activePasses.length >= settings.maxOut;
            const allowed = DESTINATIONS.filter(d => settings.destinations.includes(d.key));
            return (
              <div className="card mb2" style={{ borderLeft: `4px solid ${GOLD}` }}>
                <div style={{ fontWeight: 800, fontSize: "0.75rem", letterSpacing: "0.1em", color: GOLD, marginBottom: "0.75rem" }}>
                  ISSUE HALL PASS
                </div>

                <form onSubmit={handleIssuePass}>
                  {/* Student picker */}
                  <div style={{ position: "relative", marginBottom: "0.6rem" }}>
                    {hpStudent ? (
                      <div className="flex items-center gap1">
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.7rem", color: "#000", flexShrink: 0 }}>
                          {`${hpStudent.firstName} ${hpStudent.lastName}`.split(" ").map(w => w[0]).join("").slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{hpStudent.firstName} {hpStudent.lastName}</span>
                        {hpStudent.grade && <span className="tag tag-amber">{hpStudent.grade}</span>}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setHpStudent(null); setHpSearch(""); }}>✕</button>
                      </div>
                    ) : (
                      <>
                        <input value={hpSearch} onChange={e => setHpSearch(e.target.value)}
                          placeholder="Student name…" style={{ fontSize: "0.9rem" }} />
                        {hpResults.length > 0 && (
                          <ul className="autocomplete-list" style={{ zIndex: 20 }}>
                            {hpResults.map(st => {
                              const out = activePasses.find(p => p.studentId === st.id);
                              return (
                                <li key={st.id} className="autocomplete-item"
                                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                  onClick={() => { setHpStudent(st); setHpSearch(""); setHpResults([]); }}>
                                  <span>{st.firstName} {st.lastName} {st.grade ? <span className="tag tag-amber">{st.grade}</span> : null}</span>
                                  {out && <span style={{ color: GOLD, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em" }}>OUT NOW</span>}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    )}
                  </div>

                  {/* Already out → offer the return instead of a second pass */}
                  {selectedOut ? (
                    <div style={{ background: "rgba(245,192,37,0.07)", border: `1px solid ${GOLD}44`, borderRadius: 8, padding: "0.7rem 0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            Out to {selectedOut.destination} since {fmtClock(selectedOut.outTime)}
                          </div>
                          <div style={{ color: GOLD, fontWeight: 800, fontSize: "1.1rem", fontVariantNumeric: "tabular-nums" }}>
                            {fmtElapsed(elapsed(selectedOut.outTime))}
                          </div>
                        </div>
                        <button type="button" className="btn btn-primary btn-sm" disabled={hpBusy}
                          onClick={() => handleReturnSelected(selectedOut)}>
                          ✓ Sign Back In
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Destination */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.65rem" }}>
                        {allowed.map(d => (
                          <button key={d.key} type="button" onClick={() => setHpDest(d.key)}
                            style={{
                              display: "flex", alignItems: "center", gap: "0.3rem",
                              background: hpDest === d.key ? "rgba(245,192,37,0.16)" : "rgba(255,255,255,0.05)",
                              border: `1px solid ${hpDest === d.key ? GOLD : "rgba(255,255,255,0.12)"}`,
                              color: hpDest === d.key ? GOLD : "var(--text-muted)",
                              borderRadius: 999, padding: "0.32rem 0.7rem", cursor: "pointer",
                              fontSize: "0.78rem", fontWeight: 600, transition: "all 0.15s",
                            }}>
                            <DestIcon dest={d.key} size={13} /> {d.key}
                          </button>
                        ))}
                      </div>

                      {maxReached && (
                        <div style={{ fontSize: "0.78rem", color: "#fca5a5", marginBottom: "0.5rem" }}>
                          ⛔ {settings.maxOut} already out — sign someone back in first.
                        </div>
                      )}

                      <button type="submit" className="btn btn-primary btn-sm" style={{ width: "100%" }}
                        disabled={!hpStudent || maxReached || hpBusy}>
                        {hpBusy ? "Saving…" : hpStudent ? `Sign Out → ${hpDest}` : "Sign Out"}
                      </button>
                    </>
                  )}
                </form>
              </div>
            );
          })()}

          {/* Pending Requests — students who asked for a pass from their own
              device and are waiting on a teacher to clear them. Visible to
              every staff member (matches this page's existing shared/
              building-wide visibility), tagged with who it's addressed to. */}
          {pendingPasses.length > 0 && (
            <div className="card mb2" style={{ borderLeft: "4px solid " + GOLD }}>
              <div className="flex items-center gap1 mb1">
                <span className="pulse-dot" style={{ background: GOLD }} />
                <span style={{ fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.08em", color: GOLD }}>
                  PENDING REQUESTS · {pendingPasses.length}
                </span>
              </div>
              {pendingPasses.map(p => {
                const atMax = activePasses.length >= settings.maxOut;
                return (
                  <div key={p.id} className="flex items-center justify-between" style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(200,200,200,0.15)", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div className="flex items-center gap1">
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.75rem", color: "#000", flexShrink: 0 }}>
                        {p.studentName?.split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.studentName}</div>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                          Wants: {p.destination}{p.teacherName ? ` · asked ${p.teacherName}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap1" style={{ flexShrink: 0 }}>
                      {atMax && <span style={{ fontSize: "0.72rem", color: "#fca5a5", alignSelf: "center" }}>at max out</span>}
                      <button className="btn btn-ghost btn-sm" onClick={() => denyPass(p.id)}>Deny</button>
                      <button className="btn btn-primary btn-sm" disabled={approvingId === p.id}
                        onClick={() => handleApprove(p.id)}>
                        {approvingId === p.id ? "…" : "✓ Approve"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.75rem", color: "#000" }}>
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

              {/* Look up any student's full history & restrictions */}
              <div style={{ position: "relative", marginBottom: "0.75rem", maxWidth: 340 }}>
                <input value={inspectSearch} onChange={e => setInspectSearch(e.target.value)}
                  placeholder="Look up any student's history & limits…" style={{ fontSize: "0.85rem" }} />
                {inspectResults.length > 0 && (
                  <ul className="autocomplete-list" style={{ zIndex: 20 }}>
                    {inspectResults.map(st => (
                      <li key={st.id} className="autocomplete-item"
                        onClick={() => { setInspect({ id: st.id, name: `${st.firstName} ${st.lastName}` }); setInspectSearch(""); }}>
                        {st.firstName} {st.lastName} {st.grade ? <span className="tag tag-amber">{st.grade}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {overviewRows.length === 0 && <p className="text-muted">No passes issued yet today.</p>}
              {overviewRows.length > 0 && (
                <p className="text-muted" style={{ fontSize: "0.72rem", marginBottom: "0.5rem" }}>
                  Click a student for full history and per-student limits.
                </p>
              )}
              <table className="stu-table">
                <thead><tr><th>Student</th><th>Passes</th><th>Total Time</th><th>Destinations</th></tr></thead>
                <tbody>
                  {overviewRows.map(([id, d]) => (
                    <tr key={id} onClick={() => setInspect({ id, name: d.name })} style={{ cursor: "pointer" }}
                      title="View history & limits">
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td><span className={`tag ${d.passes >= 3 ? "tag-red" : "tag-gold"}`}>{d.passes}</span></td>
                      <td>{d.totalMin} min</td>
                      <td>{[...d.dests].map(dest => <span key={dest} className="tag tag-amber" style={{ marginRight: "0.25rem" }}>{dest}</span>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {inspect && (
                <StudentPassInspector student={inspect} periodNames={allPeriodNames}
                  user={user} onClose={() => setInspect(null)} />
              )}
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
                    <select value={settings.maxOut} onChange={e => updateMaxOut(Number(e.target.value))}>
                      {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <div className="text-muted" style={{ fontSize: "0.72rem", marginTop: "0.3rem" }}>
                      Visible to students as "already out" on their own request screen — approving past it is
                      always still allowed.
                    </div>
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
                  const ageMin = Math.floor((nowMs() - new Date(p.created_at).getTime()) / 60000);
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
