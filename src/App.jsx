import { useState, useEffect, useCallback } from "react";
import "./styles.css";
import { ALLOWED_DOMAIN, SESSION_TIMEOUT_MS, SEED_STUDENTS, GOLD } from "./constants.js";
import Dashboard from "./components/Dashboard.jsx";
import WeeklyEvents from "./components/WeeklyEvents.jsx";
import TripRoster from "./components/TripRoster.jsx";
import CeuTracker from "./components/CeuTracker.jsx";
import GmenPeriod from "./components/GmenPeriod.jsx";
import HallPass from "./components/HallPass.jsx";
import Requisition from "./components/Requisition.jsx";
import FieldTrip from "./components/FieldTrip.jsx";
import StudentRoster from "./components/StudentRoster.jsx";

const TABS = [
  { key: "dashboard",  label: "Dashboard" },
  { key: "events",     label: "Weekly Events" },
  { key: "trips",      label: "Trip Rosters" },
  { key: "ceu",        label: "CEU Tracker" },
  { key: "gmen",       label: "G-Men Period" },
  { key: "hallpass",   label: "Hall Pass" },
  { key: "requisition",label: "Requisitions" },
  { key: "fieldtrip",  label: "Field Trips" },
  { key: "roster",     label: "Student Roster" },
];

function parseName(email) {
  const local = email.split("@")[0];
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith("@" + ALLOWED_DOMAIN)) {
      setStatus("domain-error");
      return;
    }
    setStatus("idle");
    onLogin({ email: trimmed, name: parseName(trimmed) });
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#1a1200", padding: "1rem",
    }}>
      <div className="card card-raised" style={{ width: "100%", maxWidth: 420, padding: "2.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: GOLD, margin: "0 auto 1rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.8rem", fontWeight: 900, color: "#1a1200",
          }}>G</div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "0.05em" }}>
            JAMES A. GARFIELD
          </h1>
          <p style={{ color: "rgba(0,0,0,0.45)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
            Staff Portal · Sign In
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb2">
            <label>School Email Address</label>
            <input
              type="email"
              placeholder={`you@${ALLOWED_DOMAIN}`}
              value={email}
              onChange={e => { setEmail(e.target.value); setStatus("idle"); }}
              autoFocus
            />
          </div>

          {status === "domain-error" && (
            <p className="text-red" style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
              Only @{ALLOWED_DOMAIN} accounts may sign in.
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: "center" }}>
            Sign In with School Email
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
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

  // Session timeout
  const resetTimer = useCallback(() => {
    clearTimeout(window._jagTimeout);
    window._jagTimeout = setTimeout(() => setUser(null), SESSION_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (!user) return;
    const events = ["mousemove","keydown","click","touchstart","scroll"];
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
      clearTimeout(window._jagTimeout);
    };
  }, [user, resetTimer]);

  if (!user) return <LoginScreen onLogin={setUser} />;

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
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>
            {user.name}
          </span>
          <button
            className="btn btn-sm btn-ghost"
            style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.15)" }}
            onClick={() => setUser(null)}
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
        {tab === "roster"      && <StudentRoster {...sharedProps} />}
      </div>
    </div>
  );
}
