import { useState, useEffect } from "react";
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

// ─── Kiosk iconography ───────────────────────────────────────────────────────
// Line icons keep the kiosk feeling like signage rather than a chat window.
// 1.6 stroke on a 24-grid reads cleanly at both 20px and 40px.
function Ico({ d, size = 24, stroke = 1.6, fill = "none", children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
         strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children || <path d={d} />}
    </svg>
  );
}

const DEST_ICON = {
  Bathroom:  (p) => <Ico {...p}><path d="M4 21V6a2 2 0 0 1 2-2h5v17"/><path d="M11 21h9V9a2 2 0 0 0-2-2h-7"/><circle cx="8" cy="13" r="1"/></Ico>,
  Water:     (p) => <Ico {...p}><path d="M12 2.7s6 6.2 6 10.3a6 6 0 0 1-12 0C6 8.9 12 2.7 12 2.7Z"/></Ico>,
  Office:    (p) => <Ico {...p}><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M15 9h2a2 2 0 0 1 2 2v10"/><path d="M9 7h2M9 11h2M9 15h2"/></Ico>,
  Nurse:     (p) => <Ico {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M12 11v5M9.5 13.5h5"/></Ico>,
  Counselor: (p) => <Ico {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.8 9.8 0 0 1-2.9-.5L3 21l1.6-4.6A8.2 8.2 0 0 1 3.6 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8.4 8.4Z"/></Ico>,
  Library:   (p) => <Ico {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></Ico>,
  Locker:    (p) => <Ico {...p}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></Ico>,
};

const DestIcon = ({ dest, size = 24 }) => {
  const C = DEST_ICON[dest];
  return C ? <C size={size} /> : <Ico size={size}><circle cx="12" cy="10" r="3"/><path d="M12 21s-7-5.7-7-11a7 7 0 1 1 14 0c0 5.3-7 11-7 11Z"/></Ico>;
};

const IconSearch = (p) => <Ico {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Ico>;
const IconLock   = (p) => <Ico {...p}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></Ico>;
const IconWalk   = (p) => <Ico {...p}><circle cx="13" cy="4" r="1.6"/><path d="m11 21 1.5-5.5L9 13l1-5 3 2 3 1"/><path d="m10 8-2.5 3M12.5 15.5 15 21"/></Ico>;
const IconSwap   = (p) => <Ico {...p}><path d="M8 3 4 7l4 4"/><path d="M4 7h12a4 4 0 0 1 4 4v1"/><path d="m16 21 4-4-4-4"/><path d="M20 17H8a4 4 0 0 1-4-4v-1"/></Ico>;
const IconBack   = (p) => <Ico {...p}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></Ico>;
const IconReturn = (p) => <Ico {...p}><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/></Ico>;
const IconCheck  = (p) => <Ico {...p}><path d="m5 13 4 4L19 7"/></Ico>;
const IconAlert  = (p) => <Ico {...p}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></Ico>;

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

function KioskScreen({ passes, addPass, returnPass, settings, students, onClose, allRoomPasses = [] }) {
  const [screen, setScreen] = useState("home"); // home | destination | confirm-return | locator
  const [selected, setSelected] = useState(null);
  const [kioskSearch, setKioskSearch] = useState("");
  const [flash, setFlash] = useState(null); // {type:'in'|'out', name, dest}
  const [focused, setFocused] = useState(false);
  const [, setTick] = useState(0);
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

      {flash && (
        <div style={{
          position: "fixed", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "1.25rem", zIndex: 2000,
          background: flash.type === "in"
            ? "radial-gradient(60% 50% at 50% 50%, rgba(22,163,74,0.97), rgba(8,60,30,0.98))"
            : "radial-gradient(60% 50% at 50% 50%, rgba(202,42,42,0.97), rgba(70,10,10,0.98))",
          animation: "kiosk-flash-in 0.22s ease-out",
        }}>
          <div style={{
            width: 92, height: 92, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid rgba(255,255,255,0.55)", color: "#fff",
          }}>
            {flash.type === "in" ? <IconCheck size={44} stroke={2.4} /> : <IconWalk size={44} stroke={2.2} />}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "0.02em", lineHeight: 1.1 }}>{flash.name}</div>
            <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>
              {flash.type === "in" ? "Welcome back" : `Signed out · ${flash.dest}`}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        position: "relative", height: 86, flexShrink: 0, zIndex: 1,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 1.75rem",
        background: "linear-gradient(180deg, rgba(20,16,6,0.92), rgba(10,8,4,0.72))",
        backdropFilter: "blur(12px)",
      }}>
        {/* Gradient hairline instead of a hard 2px rule */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}66 15%, ${GOLD}66 85%, transparent)` }} />

        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", minWidth: 0 }}>
          <img src="/logo.png" alt="G-Men" style={{ height: 50, width: 50, objectFit: "contain" }} />
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
        <div style={{ textAlign: "center", position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          <div style={{
            fontSize: "2.5rem", fontWeight: 300, color: GOLD, lineHeight: 1, letterSpacing: "0.06em",
            textShadow: `0 0 34px ${GOLD}44`, ...NUM,
          }}>{clockStr}</div>
          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: "0.3rem", letterSpacing: "0.14em" }}>
            {fmtDayShort()}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.15rem" }}>
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
          <div style={{ width: 1, height: 34, background: "rgba(255,255,255,0.1)" }} />
          <GhostButton onClick={() => setScreen(s => s === "locator" ? "home" : "locator")} active={screen === "locator"}>
            <IconSearch size={15} /> Locator
          </GhostButton>
          <GhostButton onClick={toggleFs} title={isFs ? "Exit fullscreen" : "Fullscreen"} style={{ padding: "0.5rem 0.6rem" }}>
            {isFs
              ? <Ico size={16}><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></Ico>
              : <Ico size={16}><path d="M3 7V3h4"/><path d="M21 7V3h-4"/><path d="M3 17v4h4"/><path d="M21 17v4h-4"/></Ico>}
          </GhostButton>
          <GhostButton onClick={onClose}><IconLock size={15} /> Close</GhostButton>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "2rem 2.25rem", zIndex: 1 }}>

        {/* ── Students currently out ── */}
        {screen !== "locator" && activePasses.length > 0 ? (
          <div style={{ marginBottom: "2.25rem" }}>
            <Rule tone="#fca5a5" dot={<span className="pulse-dot" />}>Currently Out</Rule>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(196px,1fr))", gap: "1rem" }}>
              {activePasses.map(p => {
                const secs = elapsed(p.outTime);
                const flagSecs = settings.flagAfter * 60;
                const critical = secs > flagSecs * 1.5;
                const flagged = secs > flagSecs;
                const ac = critical ? "#f87171" : flagged ? "#fb923c" : GOLD;
                return (
                  <div key={p.id}
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
                      const secs = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 1000);
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
      <div style={{
        position: "relative", flexShrink: 0, zIndex: 1,
        padding: "0.6rem 1.75rem", display: "flex", justifyContent: "space-between",
        fontSize: "0.63rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.18em",
        textTransform: "uppercase", background: "rgba(10,8,4,0.6)", backdropFilter: "blur(10px)",
      }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}22 20%, ${GOLD}22 80%, transparent)` }} />
        <span>Garfield G-Men · Room {settings.room}</span>
        <span style={NUM}>{activePasses.length} out · max {settings.maxOut}</span>
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
  const { periodsToday: bellPeriods } = useBellSchedule();

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
