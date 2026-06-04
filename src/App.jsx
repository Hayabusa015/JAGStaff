import { useState, useEffect, useCallback } from "react";
import "./styles.css";
import { ALLOWED_DOMAIN, SESSION_TIMEOUT_MS, SEED_STUDENTS, GOLD } from "./constants.js";
import { useAuth, SUPABASE_READY } from "./supabase.js";
import Dashboard from "./components/Dashboard.jsx";
import WeeklyEvents from "./components/WeeklyEvents.jsx";
import TripRoster from "./components/TripRoster.jsx";
import CeuTracker from "./components/CeuTracker.jsx";
import GmenPeriod from "./components/GmenPeriod.jsx";
import HallPass from "./components/HallPass.jsx";
import Requisition from "./components/Requisition.jsx";
import FieldTrip from "./components/FieldTrip.jsx";
import StudentRoster from "./components/StudentRoster.jsx";
import Infractions from "./components/Infractions.jsx";

const TABS = [
  { key: "dashboard",  label: "Dashboard" },
  { key: "events",     label: "Weekly Events" },
  { key: "trips",      label: "Trip Rosters" },
  { key: "ceu",        label: "CEU Tracker" },
  { key: "gmen",       label: "G-Men Period" },
  { key: "hallpass",   label: "Hall Pass" },
  { key: "requisition",label: "Requisitions" },
  { key: "fieldtrip",  label: "Field Trips" },
  { key: "roster",      label: "Student Roster" },
  { key: "infractions", label: "Infractions" },
];

function LoginScreen({ signInWithGoogle, loading, error }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#1a1200", padding: "1rem",
    }}>
      <div className="card card-raised" style={{ width: "100%", maxWidth: 400, padding: "2.5rem", textAlign: "center" }}>

        {/* Logo */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%", background: GOLD,
          margin: "0 auto 1.25rem", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "2rem", fontWeight: 900, color: "#1a1200",
        }}>G</div>

        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
          JAMES A. GARFIELD
        </h1>
        <p style={{ color: "rgba(0,0,0,0.45)", fontSize: "0.82rem", marginBottom: "2rem" }}>
          Staff Portal · Sign In
        </p>

        {/* Error (domain mismatch or OAuth failure) */}
        {error && (
          <div style={{
            background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: "8px", padding: "0.65rem 0.9rem", marginBottom: "1.25rem",
            fontSize: "0.82rem", color: "#dc2626", textAlign: "left",
          }}>
            {error}
          </div>
        )}

        {/* Google sign-in button */}
        {SUPABASE_READY ? (
          <button
            className="btn w-full"
            style={{
              justifyContent: "center", gap: "0.75rem",
              background: "#fff", border: "1px solid rgba(0,0,0,0.15)",
              color: "#1a1200", fontSize: "0.92rem", fontWeight: 600,
              padding: "0.75rem 1rem", borderRadius: "8px",
              opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer",
            }}
            onClick={signInWithGoogle}
            disabled={loading}
          >
            {/* Google "G" logo */}
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.4 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.9 6.1C12.6 13 17.9 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.8-2.1 5.1-4.4 6.7l6.9 5.4c4-3.7 6.2-9.2 6.2-16.1z"/>
              <path fill="#FBBC05" d="M10.7 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.4 13.3A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.2-6z"/>
              <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-6.9-5.4c-2.1 1.4-4.8 2.3-8.3 2.3-6.1 0-11.4-4-13.3-9.4l-8.2 6.1C6.6 42.5 14.7 48 24 48z"/>
            </svg>
            {loading ? "Signing in…" : "Sign in with Google"}
          </button>
        ) : (
          /* Supabase not configured — show a clear message instead of a broken button */
          <div style={{
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "8px", padding: "0.85rem 1rem", fontSize: "0.82rem", color: "#92700a",
          }}>
            <strong>Supabase not configured.</strong><br />
            Copy <code>.env.example</code> to <code>.env.local</code> and add your
            project URL + anon key, then restart the dev server.<br />
            See <strong>SUPABASE_SETUP.md</strong> for instructions.
          </div>
        )}

        <p style={{ marginTop: "1.25rem", fontSize: "0.75rem", color: "rgba(0,0,0,0.35)" }}>
          Only <strong>@{ALLOWED_DOMAIN}</strong> accounts are permitted.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading, error, signInWithGoogle, signOut } = useAuth(ALLOWED_DOMAIN);

  const [tab, setTab] = useState("dashboard");
  const [students, setStudents] = useState(SEED_STUDENTS);
  const [weeklyEvents, setWeeklyEvents] = useState([
    { id: "ev1", type: "Fire Drill", title: "Scheduled Fire Drill", date: "2026-06-03", time: "10:15", details: "All teachers escort students to designated areas." },
    { id: "ev2", type: "State Test", title: "ELA State Assessment", date: "2026-06-04", time: "08:00", details: "Grades 10 & 11 — quiet corridors after 7:55 AM." },
    { id: "ev3", type: "Field Trip", title: "Varsity Golf @ Pine Hills", date: "2026-06-05", time: "13:30", details: "Coach Davis. Students leave 1:30 PM." },
  ]);
  const [tripRosters, setTripRosters] = useState([
    {
      id: "tr1", type: "Athletic Event", title: "Varsity Golf @ Pine Hills",
      teacher: "Coach Davis", date: "2026-06-05", depart: "13:30", returnTime: "17:30",
      notes: "Transportation provided.",
      students: [{ name: "Marcus Thompson", grade: "10" }, { name: "Jordan Garcia", grade: "10" }],
    },
  ]);
  const [gmenRequests, setGmenRequests] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Inactivity timeout — signs the user out of Supabase after 7 hours idle.
  const resetTimer = useCallback(() => {
    clearTimeout(window._jagTimeout);
    window._jagTimeout = setTimeout(() => signOut(), SESSION_TIMEOUT_MS);
  }, [signOut]);

  useEffect(() => {
    if (!user) return;
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
      clearTimeout(window._jagTimeout);
    };
  }, [user, resetTimer]);

  // Checking for an existing session on first load.
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#1a1200", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: GOLD, fontWeight: 800, letterSpacing: "0.1em", fontSize: "0.9rem" }}>
        LOADING…
      </div>
    </div>
  );

  if (!user) return <LoginScreen signInWithGoogle={signInWithGoogle} loading={loading} error={error} />;

  const sharedProps = { user, students, setStudents, weeklyEvents, setWeeklyEvents, tripRosters, setTripRosters, gmenRequests, setGmenRequests, alerts, setAlerts };

  return (
    <div className="app-shell">
      <nav className="tab-nav">
        <div style={{ display: "flex", alignItems: "center", padding: "0 0.5rem 0 0", marginRight: "0.5rem", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
          <span style={{ color: GOLD, fontWeight: 900, fontSize: "0.9rem", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
            JAG
          </span>
        </div>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab-btn${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", padding: "0 0.5rem", gap: "0.5rem" }}>
          {user.avatarUrl && (
            <img src={user.avatarUrl} alt="" style={{ width: 26, height: 26, borderRadius: "50%", border: `1px solid ${GOLD}60` }} />
          )}
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>
            {user.name}
          </span>
          <button
            className="btn btn-sm btn-ghost"
            style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.15)" }}
            onClick={signOut}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="content-area">
        {tab === "dashboard"   && <Dashboard   {...sharedProps} />}
        {tab === "events"      && <WeeklyEvents {...sharedProps} />}
        {tab === "trips"       && <TripRoster   {...sharedProps} />}
        {tab === "ceu"         && <CeuTracker   {...sharedProps} />}
        {tab === "gmen"        && <GmenPeriod   {...sharedProps} />}
        {tab === "hallpass"    && <HallPass      {...sharedProps} />}
        {tab === "requisition" && <Requisition   {...sharedProps} />}
        {tab === "fieldtrip"   && <FieldTrip     {...sharedProps} />}
        {tab === "roster"       && <StudentRoster  {...sharedProps} />}
        {tab === "infractions"  && <Infractions students={students} user={user} />}
      </div>
    </div>
  );
}
