import { useState, useEffect, useCallback } from "react";
import { Lock } from "lucide-react";
import "./styles.css";
import { ALLOWED_DOMAIN, SESSION_TIMEOUT_MS, GOLD } from "./constants.js";
import { useAuth, useStudents, useWeeklyEvents, useTripRosters, SUPABASE_READY, isStaffEmail } from "./supabase.js";
import AdminSettings from "./components/AdminSettings.jsx";
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
import StaffWelcomeTour, { tourDone } from "./components/StaffWelcomeTour.jsx";

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

// When VITE_CLASSROOM_OWNER_EMAIL is set, only that address can access the Classroom zone.
// Leave it unset (or empty) to allow all staff in — useful during dev / initial rollout.
const CLASSROOM_OWNER_EMAIL = import.meta.env.VITE_CLASSROOM_OWNER_EMAIL || "";

function ZoneToggle({ zone, setZone, isClassroomOwner }) {
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
      {/* School tab */}
      <button
        role="tab"
        aria-selected={zone === "school"}
        onClick={() => setZone("school")}
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
          background: zone === "school" ? GOLD : "transparent",
          color: zone === "school" ? "#0a0700" : "rgba(255,255,255,0.6)",
          boxShadow: zone === "school" ? "0 0 12px -2px rgba(245,179,1,0.55)" : "none",
        }}
      >
        School
      </button>

      {/* Classroom tab — locked for non-owners */}
      <button
        role="tab"
        aria-selected={zone === "classroom"}
        onClick={() => setZone("classroom")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          padding: "0.3rem 0.85rem",
          borderRadius: 999,
          border: "none",
          cursor: isClassroomOwner ? "pointer" : "default",
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          transition: "all 0.15s",
          background: zone === "classroom" ? (isClassroomOwner ? GOLD : "rgba(255,255,255,0.07)") : "transparent",
          color: zone === "classroom"
            ? (isClassroomOwner ? "#0a0700" : "rgba(255,255,255,0.45)")
            : (isClassroomOwner ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)"),
          boxShadow: zone === "classroom" && isClassroomOwner ? "0 0 12px -2px rgba(245,179,1,0.55)" : "none",
        }}
      >
        {!isClassroomOwner && <Lock style={{ width: 10, height: 10, flexShrink: 0 }} />}
        My Classroom
      </button>
    </div>
  );
}

function LoginScreen({ signInWithGoogle, loading, error }) {
  return (
    <div className="login-bg">
      {/* Breathing background orbs */}
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />
      <div className="login-orb login-orb-3" aria-hidden="true" />

      <div className="login-mascot" aria-hidden="true" />

      <div className="login-card">
        {/* Logo with pulse ring */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <div className="login-logo">
            <img src="/logo.png" alt="JAG" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        <h1 className="login-enter-1" style={{
          fontSize: "2rem", fontWeight: 900, letterSpacing: "0.1em",
          color: GOLD, marginBottom: "0.45rem", textTransform: "uppercase",
        }}>
          James A. Garfield
        </h1>

        {/* Gold divider */}
        <div className="login-enter-1" style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(245,192,37,0.3), transparent)",
          margin: "0 auto 0.6rem",
          width: "65%",
        }} />

        <p className="login-enter-2" style={{
          color: "rgba(240,234,216,0.5)", fontSize: "0.72rem",
          letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.25rem",
        }}>
          G-Men Portal
        </p>
        <p className="login-enter-2" style={{
          color: "rgba(255,255,255,0.2)", fontSize: "0.58rem",
          letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "0.7rem",
        }}>
          powered by G-MEN COMMAND
        </p>

        <div className="login-enter-3" style={{
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
          <div className="login-btn-shimmer login-enter-4">
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
          </div>
        ) : (
          <div className="login-enter-4" style={{
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "8px", padding: "0.85rem 1rem", fontSize: "0.82rem",
            color: "rgba(245,192,37,0.8)", textAlign: "left",
          }}>
            <strong>Supabase not configured.</strong><br />
            Copy <code>.env.example</code> to <code>.env.local</code>, add your
            project URL + anon key, then restart the dev server.
          </div>
        )}

        <p className="login-enter-5" style={{ marginTop: "1.5rem", fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", lineHeight: 1.7 }}>
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
    isStaffEmail(user.email).then(({ isStaff: staff, isAdmin: admin }) => {
      setIsStaff(staff);
      setIsAdmin(admin);
      if (staff && !tourDone(user.email)) setShowTour(true);
    });
  }, [user]);

  const [showTour, setShowTour] = useState(false);
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

  const isClassroomOwner = !CLASSROOM_OWNER_EMAIL || user.email.toLowerCase() === CLASSROOM_OWNER_EMAIL.toLowerCase();

  const sharedProps = { user, students, weeklyEvents, tripRosters, alerts, setAlerts };

  return (
    <div className="app-shell app-backdrop">
      {showTour && (
        <StaffWelcomeTour
          userEmail={user.email}
          onClose={() => setShowTour(false)}
          onGoToClassroom={() => { setZone("classroom"); setShowTour(false); }}
        />
      )}

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
            <ZoneToggle zone={zone} setZone={setZone} isClassroomOwner={isClassroomOwner} />
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

      {zone === "classroom" && isClassroomOwner ? (
        <ClassroomProvider user={user} isStaff={true}>
          <ClassroomApp user={user} students={students} isAdmin={isAdmin} />
        </ClassroomProvider>
      ) : zone === "classroom" ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{
            textAlign: "center", maxWidth: 400,
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${GOLD}22`,
            borderRadius: 20, padding: "3rem 2.5rem",
          }}>
            <Lock style={{ width: 44, height: 44, color: `${GOLD}55`, margin: "0 auto 1.25rem" }} />
            <h2 style={{ color: GOLD, fontWeight: 900, fontSize: "1.05rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              My Classroom
            </h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", lineHeight: 1.65 }}>
              This zone is currently set up for one teacher. It'll open up to the rest of the staff when it's ready.
            </p>
          </div>
        </div>
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
