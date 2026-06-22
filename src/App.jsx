import { useState, useEffect, useCallback } from "react";
import "./styles.css";
import { ALLOWED_DOMAIN, SESSION_TIMEOUT_MS, GOLD } from "./constants.js";
import { useAuth, useStudents, useWeeklyEvents, useTripRosters, SUPABASE_READY, isStaffEmail } from "./supabase.js";
import AdminSettings from "./components/AdminSettings.jsx";
import GmenEnrollmentView from "./components/GmenEnrollmentView.jsx";
import StudentClassroomPortal from "./components/StudentClassroomPortal.jsx";
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
// Gradebook + AI Grader now live in the Classroom zone (see ClassroomApp).
import { AppProvider as ClassroomProvider } from "./classroom/ClassroomContext.jsx";
import ClassroomApp from "./classroom/ClassroomApp.jsx";

const TABS = [
  { key: "dashboard",   label: "Dashboard"        },
  { key: "events",      label: "Weekly Events"    },
  { key: "trips",       label: "Trip Rosters"     },
  { key: "gmen",        label: "G-Men Period"     },
  { key: "hallpass",    label: "Hall Pass"        },
  { key: "infractions", label: "Infractions"      },
  { key: "resources",   label: "Teacher Resources"},
  { key: "admin",       label: "⚙ Admin", adminOnly: true },
];

const RESOURCE_TABS = [
  { key: "ceu",         label: "CEU Tracker"         },
  { key: "requisition", label: "Requisitions"         },
  { key: "fieldtrip",   label: "Field Trip Request"   },
  { key: "roster",      label: "Student Roster"       },
];

function SchoolLogo({ size = 42 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${GOLD}`,
      background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", flexShrink: 0,
      boxShadow: `0 0 ${size * 0.35}px rgba(245,192,37,0.3)`,
    }}>
      <img src="/logo.png" alt="JAG" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
}

function ZoneToggle({ zone, setZone }) {
  const opts = [
    { key: "school",    label: "School" },
    { key: "classroom", label: "My Classroom" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Switch zone"
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${GOLD}33`,
      }}
    >
      {opts.map(o => {
        const active = zone === o.key;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => setZone(o.key)}
            style={{
              padding: "0.3rem 0.85rem",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: "0.68rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              background: active ? GOLD : "transparent",
              color: active ? "#0a0700" : "rgba(255,255,255,0.6)",
              boxShadow: active ? "0 0 12px -2px rgba(245,179,1,0.55)" : "none",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function LoginScreen({ signInWithGoogle, loading, error }) {
  return (
    <div className="login-bg">
      <div className="login-mascot" aria-hidden="true" />
      <div className="login-card">

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <SchoolLogo size={84} />
        </div>

        <h1 style={{
          fontSize: "1.5rem", fontWeight: 900, letterSpacing: "0.1em",
          color: GOLD, marginBottom: "0.2rem", textTransform: "uppercase",
        }}>
          James A. Garfield
        </h1>
        <p style={{
          color: "rgba(240,234,216,0.45)", fontSize: "0.72rem",
          letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.75rem",
        }}>
          G-Men Portal
        </p>
        <div style={{
          display: "inline-block",
          border: "1px solid rgba(245,192,37,0.25)",
          borderRadius: "999px", padding: "0.22rem 0.9rem",
          fontSize: "0.65rem", color: "rgba(245,192,37,0.5)",
          letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2.25rem",
        }}>
          Students &amp; Staff
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "8px", padding: "0.65rem 0.9rem", marginBottom: "1.25rem",
            fontSize: "0.82rem", color: "#f87171", textAlign: "left",
          }}>
            {error}
          </div>
        )}

        {SUPABASE_READY ? (
          <button
            className="btn w-full"
            style={{
              justifyContent: "center", gap: "0.75rem",
              background: "linear-gradient(135deg, #F5C025 0%, #e8b020 100%)",
              color: "#0a0700", fontSize: "0.92rem", fontWeight: 700,
              padding: "0.9rem 1rem", borderRadius: "10px",
              boxShadow: "0 4px 24px rgba(245,192,37,0.4)",
              opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer",
            }}
            onClick={signInWithGoogle}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.4 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.9 6.1C12.6 13 17.9 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.8-2.1 5.1-4.4 6.7l6.9 5.4c4-3.7 6.2-9.2 6.2-16.1z"/>
              <path fill="#FBBC05" d="M10.7 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.4 13.3A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.2-6z"/>
              <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-6.9-5.4c-2.1 1.4-4.8 2.3-8.3 2.3-6.1 0-11.4-4-13.3-9.4l-8.2 6.1C6.6 42.5 14.7 48 24 48z"/>
            </svg>
            {loading ? "Signing in…" : "Sign in with School Google Account"}
          </button>
        ) : (
          <div style={{
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "8px", padding: "0.85rem 1rem", fontSize: "0.82rem",
            color: "rgba(245,192,37,0.8)", textAlign: "left",
          }}>
            <strong>Supabase not configured.</strong><br />
            Copy <code>.env.example</code> to <code>.env.local</code>, add your
            project URL + anon key, then restart the dev server.
          </div>
        )}

        <p style={{ marginTop: "1.5rem", fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", lineHeight: 1.7 }}>
          Use your <strong style={{ color: "rgba(245,192,37,0.5)" }}>@{ALLOWED_DOMAIN}</strong> school Google account.<br />
          Sessions expire after 7 hours of inactivity.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading, error, signInWithGoogle, signOut } = useAuth(ALLOWED_DOMAIN);
  const [isStaff, setIsStaff] = useState(null); // null = checking
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsStaff(null); setIsAdmin(false); return; }
    isStaffEmail(user.email).then(({ isStaff, isAdmin }) => {
      setIsStaff(isStaff);
      setIsAdmin(isAdmin);
    });
  }, [user]);

  const [tab, setTab] = useState("dashboard");
  const [resourceTab, setResourceTab] = useState("ceu");
  // Top-level zone: building-wide "school" vs the teacher's own "classroom".
  const [zone, setZoneState] = useState(() => {
    try { return localStorage.getItem("jag-zone") || "school"; } catch { return "school"; }
  });
  const setZone = useCallback((z) => {
    setZoneState(z);
    try { localStorage.setItem("jag-zone", z); } catch { /* ignore */ }
  }, []);
  const { students } = useStudents();
  const { events: weeklyEvents, addEvent, removeEvent } = useWeeklyEvents();
  const { rosters: tripRosters, addRoster, removeRoster } = useTripRosters();
  const [alerts, setAlerts] = useState([]);

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

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-deep)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <SchoolLogo size={56} />
        <div style={{ color: GOLD, fontWeight: 800, letterSpacing: "0.15em", fontSize: "0.8rem" }}>
          LOADING…
        </div>
      </div>
    </div>
  );

  if (!user) return <LoginScreen signInWithGoogle={signInWithGoogle} loading={loading} error={error} />;

  // While checking staff status, show spinner
  if (isStaff === null) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-deep)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <SchoolLogo size={56} />
        <div style={{ color: GOLD, fontWeight: 800, letterSpacing: "0.15em", fontSize: "0.8rem" }}>LOADING…</div>
      </div>
    </div>
  );

  // Non-staff @jagschools.org account → student portal (My Classroom + G-Men Period)
  if (isStaff === false) return <StudentClassroomPortal user={user} signOut={signOut} />;

  const sharedProps = { user, students, weeklyEvents, tripRosters, alerts, setAlerts };

  return (
    <div className="app-shell app-backdrop">
      {/* Top nav — two rows */}
      <nav className="top-nav">
        {/* Row 1: brand + zone toggle + user */}
        <div className="nav-row1">
          <div className="nav-brand">
            <SchoolLogo size={36} />
            <div className="nav-school-name">
              <span className="name-line1">James A. Garfield</span>
              <span className="name-line2">G-Men Portal</span>
            </div>
          </div>
          <div style={{ marginLeft: "1rem" }}>
            <ZoneToggle zone={zone} setZone={setZone} />
          </div>
          <div className="nav-user">
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt="" className="nav-avatar" />
            )}
            <span className="nav-user-name">{user.name}</span>
            <button className="btn btn-sm btn-ghost" onClick={signOut}>Sign Out</button>
          </div>
        </div>

        {/* Row 2: school tabs (the Classroom zone has its own SideNav) */}
        {zone === "school" && (
          <div className="nav-row2">
            {TABS.filter(t => !t.adminOnly || isAdmin).map(t => (
              <button
                key={t.key}
                className={`tab-btn${tab === t.key ? " active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {zone === "classroom" ? (
        <ClassroomProvider user={user} isStaff={true}>
          <ClassroomApp user={user} students={students} isAdmin={isAdmin} />
        </ClassroomProvider>
      ) : (
      /* Page content */
      <div className="content-area">
        {/* Mascot watermark */}
        <img
          src="/logo.png"
          aria-hidden="true"
          style={{
            position: "fixed", bottom: "-60px", right: "-60px",
            width: 420, height: 420, objectFit: "contain",
            opacity: 0.045, pointerEvents: "none", zIndex: 0,
            userSelect: "none",
          }}
        />

        <div key={tab} className="page-enter">
        {tab === "dashboard"   && <Dashboard   {...sharedProps} />}
        {tab === "events"      && <WeeklyEvents weeklyEvents={weeklyEvents} addEvent={addEvent} removeEvent={removeEvent} />}
        {tab === "trips"       && <TripRoster   tripRosters={tripRosters} addRoster={addRoster} removeRoster={removeRoster} students={students} />}
        {tab === "gmen"        && <GmenPeriod   students={students} user={user} setAlerts={setAlerts} isAdmin={isAdmin} />}
        {tab === "admin"       && isAdmin && <AdminSettings user={user} />}
        {tab === "hallpass"    && <HallPass      {...sharedProps} />}
        {tab === "infractions" && <Infractions  students={students} user={user} />}

        {tab === "resources" && (
          <>
            {/* Sub-tab bar */}
            <div style={{
              display: "flex", gap: 0, marginBottom: "1.25rem",
              borderBottom: "1px solid var(--gold-border)",
            }}>
              {RESOURCE_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setResourceTab(t.key)}
                  style={{
                    padding: "0.55rem 1.1rem",
                    fontSize: "0.75rem", fontWeight: 600,
                    background: "none", border: "none",
                    borderBottom: resourceTab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
                    color: resourceTab === t.key ? "var(--gold)" : "var(--text-muted)",
                    cursor: "pointer", letterSpacing: "0.04em",
                    textTransform: "uppercase", transition: "all 0.15s",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {resourceTab === "ceu"         && <CeuTracker   {...sharedProps} />}
            {resourceTab === "requisition" && <Requisition  {...sharedProps} />}
            {resourceTab === "fieldtrip"   && <FieldTrip    {...sharedProps} />}
            {resourceTab === "roster"      && <StudentRoster />}
          </>
        )}
        </div>
      </div>
      )}
    </div>
  );
}
