// Student-facing hall pass: request a pass from your own device, watch it
// go pending -> approved as a teacher clears it, sign back in when you're
// back. All state mutation goes through useStudentHallPass's RPC calls —
// this component only ever reads myPass/myStudentRow and calls its actions.
import { useEffect, useState } from "react";
import { GOLD, DESTINATIONS } from "../constants.js";
import { useStudentHallPass, useStaffDirectory, getActivePassCount, getMyPassStats } from "../supabase.js";
import { pickPassMessage } from "./passMessages.js";
import { DestIcon, IconClock, IconSend, IconReturn, IconBack, IconAlert } from "./hallPassIcons.jsx";

const LAST_TEACHER_KEY = "student-hallpass-last-teacher";

function elapsedMinutes(outTime) {
  if (!outTime) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(outTime).getTime()) / 60000));
}

function fmtElapsed(mins) {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// Informational only — a student can always submit or keep waiting
// regardless of what this shows. A teacher can (and often will) approve
// past their own limit.
function CapacityNote({ activeOut, maxOut }) {
  if (activeOut == null) return null;
  const atOrOver = maxOut != null && activeOut >= maxOut;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      fontSize: "0.76rem", color: atOrOver ? "#fbbf24" : "rgba(255,255,255,0.4)",
      marginBottom: "1rem", justifyContent: "center",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: atOrOver ? "#fbbf24" : "rgba(255,255,255,0.3)", flexShrink: 0,
      }} />
      {maxOut != null
        ? `${activeOut}/${maxOut} students already out right now`
        : `${activeOut} students already out right now`}
      {atOrOver && " — your teacher can still approve you"}
    </div>
  );
}

export default function StudentHallPass({ user }) {
  const { myStudentRow, myPass, loading, error, requestPass, returnFromPass, cancelRequest } = useStudentHallPass(user);
  const teachers = useStaffDirectory(user);

  const [destination, setDestination] = useState(DESTINATIONS[0].key);
  const [teacherEmail, setTeacherEmail] = useState(() => {
    try { return localStorage.getItem(LAST_TEACHER_KEY) || ""; } catch { return ""; }
  });
  const [busy, setBusy] = useState(false);
  const [, forceTick] = useState(0);
  const [activeOut, setActiveOut] = useState(null); // building-wide count, or null while unknown
  const [stats, setStats] = useState(null);         // my counts/rank/limits, from my_pass_stats
  const [funMsg, setFunMsg] = useState("");

  // Advisory only — never gates the request. Refreshed when the picked
  // teacher changes, when the pass status changes (form <-> pending), and
  // on a light poll so a student waiting on approval sees it move as
  // other students return.
  useEffect(() => {
    let active = true;
    function refresh() { getActivePassCount().then(n => { if (active) setActiveOut(n); }); }
    refresh();
    const id = setInterval(refresh, 20000);
    return () => { active = false; clearInterval(id); };
  }, [teacherEmail, myPass?.status]);

  // Personal stats: powers the fun message and the daily-limit meter.
  useEffect(() => {
    let live = true;
    getMyPassStats().then(st => { if (live) setStats(st); });
    return () => { live = false; };
  }, [myPass?.status]);

  // Live-updating elapsed timer while a pass is active. The display only
  // shows whole minutes, so a 15s tick keeps it accurate without waking a
  // battery-powered Chromebook every second.
  useEffect(() => {
    if (myPass?.status !== "active") return;
    const id = setInterval(() => forceTick(t => t + 1), 15000);
    return () => clearInterval(id);
  }, [myPass?.status]);

  useEffect(() => {
    if (!teacherEmail && teachers.length > 0) setTeacherEmail(teachers[0].email);
  }, [teachers, teacherEmail]);

  async function handleRequest(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = await requestPass(destination, teacherEmail || null);
    if (ok && teacherEmail) {
      try { localStorage.setItem(LAST_TEACHER_KEY, teacherEmail); } catch { /* ignore */ }
    }
    if (ok) {
      // Stats-aware one-liner, varied and never the same twice in a row.
      let last = null;
      try { last = localStorage.getItem("hallpass-last-msg"); } catch { /* ignore */ }
      const st = await getMyPassStats();
      const msg = pickPassMessage({ stats: st, destination, lastMessage: last });
      setFunMsg(msg);
      try { localStorage.setItem("hallpass-last-msg", msg); } catch { /* ignore */ }
    }
    setBusy(false);
  }

  async function handleReturn() {
    if (busy) return;
    setBusy(true);
    await returnFromPass();
    setBusy(false);
  }

  async function handleCancel() {
    if (busy) return;
    setBusy(true);
    await cancelRequest();
    setBusy(false);
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", letterSpacing: "0.1em" }}>LOADING…</div>
      </div>
    );
  }

  if (!myStudentRow) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{
          maxWidth: 420, textAlign: "center",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,192,37,0.2)",
          borderRadius: 16, padding: "2rem",
        }}>
          <div style={{ display: "flex", justifyContent: "center", color: GOLD, marginBottom: "1rem" }}>
            <IconAlert size={36} stroke={1.6} />
          </div>
          <h2 style={{ color: GOLD, fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            Not on the Roster Yet
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", lineHeight: 1.6 }}>
            Your account (<strong style={{ color: "rgba(255,255,255,0.8)" }}>{user?.email}</strong>) isn't in the
            student roster yet, so hall passes aren't available. Ask the office to add you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "1.5rem", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
            Hi {myStudentRow.first_name}
          </div>
          <h1 style={{ color: GOLD, fontWeight: 800, fontSize: "1.4rem", marginTop: "0.25rem" }}>Hall Pass</h1>
        </div>

        {error && (
          <div style={{
            display: "flex", gap: "0.5rem", alignItems: "flex-start",
            background: "rgba(220,38,38,0.08)", border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem",
            fontSize: "0.82rem", color: "#fca5a5",
          }}>
            <IconAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* ── No pass: request form ── */}
        {!myPass && (
          <form onSubmit={handleRequest} style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, padding: "1.5rem",
          }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
              Where are you going?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px,1fr))", gap: "0.5rem", marginBottom: "1.25rem" }}>
              {DESTINATIONS.map(d => (
                <button key={d.key} type="button" onClick={() => setDestination(d.key)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem",
                    background: destination === d.key ? "rgba(245,192,37,0.14)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${destination === d.key ? GOLD : "rgba(255,255,255,0.1)"}`,
                    color: destination === d.key ? GOLD : "rgba(255,255,255,0.7)",
                    borderRadius: 12, padding: "0.9rem 0.5rem", cursor: "pointer",
                    fontSize: "0.78rem", fontWeight: 600, transition: "all 0.15s",
                  }}>
                  <DestIcon dest={d.key} size={22} />
                  {d.key}
                </button>
              ))}
            </div>

            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Which teacher?
            </div>
            <select value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)}
              style={{ marginBottom: "1.25rem" }}>
              {teachers.length === 0 && <option value="">No teachers listed</option>}
              {teachers.map(t => (
                <option key={t.email} value={t.email}>{t.name}{t.room ? ` · Rm ${t.room}` : ""}</option>
              ))}
            </select>

            <CapacityNote activeOut={activeOut} maxOut={teachers.find(t => t.email === teacherEmail)?.max_out} />

            {stats?.dailyMax != null && (
              <div style={{ textAlign: "center", fontSize: "0.76rem", marginBottom: "1rem",
                color: stats.today >= stats.dailyMax ? "#fca5a5" : "rgba(255,255,255,0.45)" }}>
                {Math.min(stats.today, stats.dailyMax)} of {stats.dailyMax} daily passes used
                {stats.allowedPeriods?.length ? ` · allowed during ${stats.allowedPeriods.join(", ")}` : ""}
              </div>
            )}
            {stats?.dailyMax == null && stats?.allowedPeriods?.length > 0 && (
              <div style={{ textAlign: "center", fontSize: "0.76rem", marginBottom: "1rem", color: "rgba(255,255,255,0.45)" }}>
                Passes allowed during: {stats.allowedPeriods.join(", ")}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
              disabled={busy || !teacherEmail}>
              <IconSend size={16} /> {busy ? "Sending…" : "Request Hall Pass"}
            </button>
          </form>
        )}

        {/* ── Pending: waiting on a teacher ── */}
        {myPass?.status === "pending" && (
          <div style={{
            textAlign: "center",
            background: "rgba(245,192,37,0.06)", border: `1px solid ${GOLD}44`,
            borderRadius: 16, padding: "2rem 1.5rem",
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%", margin: "0 auto 1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${GOLD}88`, color: GOLD,
              background: `radial-gradient(circle at 50% 30%, ${GOLD}22, transparent 70%)`,
            }}>
              <IconClock size={26} />
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.15rem", marginBottom: "0.35rem" }}>
              <DestIcon dest={myPass.destination} size={16} style={{ verticalAlign: "-2px", marginRight: "0.35rem" }} />
              {myPass.destination}
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: funMsg ? "0.75rem" : "1.5rem" }}>
              Waiting for {myPass.teacherName || "your teacher"} to approve…
            </div>
            {funMsg && (
              <div style={{
                display: "inline-block", background: "rgba(245,192,37,0.1)",
                border: `1px solid ${GOLD}33`, borderRadius: 999,
                padding: "0.4rem 1rem", fontSize: "0.82rem", color: GOLD,
                marginBottom: "1.5rem",
              }}>{funMsg}</div>
            )}
            <CapacityNote activeOut={activeOut} maxOut={teachers.find(t => t.email === myPass.teacherEmail)?.max_out} />

            <button className="btn btn-ghost" style={{ color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.2)" }}
              onClick={handleCancel} disabled={busy}>
              <IconBack size={14} style={{ marginRight: "0.35rem" }} /> Cancel Request
            </button>
          </div>
        )}

        {/* ── Active: out right now ── */}
        {myPass?.status === "active" && (
          <div style={{
            textAlign: "center",
            background: "rgba(245,192,37,0.06)", border: `1px solid ${GOLD}66`,
            borderRadius: 16, padding: "2rem 1.5rem",
          }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.2em", color: GOLD, textTransform: "uppercase", marginBottom: "0.75rem" }}>
              You're signed out
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontWeight: 700, fontSize: "1.3rem", marginBottom: "0.5rem" }}>
              <DestIcon dest={myPass.destination} size={20} /> {myPass.destination}
            </div>
            <div style={{ color: GOLD, fontWeight: 300, fontSize: "2.6rem", letterSpacing: "0.03em", fontVariantNumeric: "tabular-nums", margin: "0.5rem 0 1.75rem" }}>
              {fmtElapsed(elapsedMinutes(myPass.outTime))}
            </div>
            <button className="btn btn-primary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
              onClick={handleReturn} disabled={busy}>
              <IconReturn size={16} /> {busy ? "Signing in…" : "I'm Back — Sign In"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
