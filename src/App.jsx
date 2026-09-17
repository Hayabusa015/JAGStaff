import LoginScreen from "./components/LoginScreen.jsx";
import SchoolLogo from "./components/SchoolLogo.jsx";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Lock, Home, Calendar, DoorOpen, MessageSquare, MoreHorizontal, LayoutDashboard, CalendarDays, MapPinned, AlertTriangle, Briefcase, Settings, LogOut, Command } from "lucide-react";
import "./styles.css";
import "./portal-theme.css";
import { ALLOWED_DOMAIN, SESSION_TIMEOUT_MS, GOLD } from "./constants.js";
import { useAuth, useStudents, useWeeklyEvents, useTripRosters, SUPABASE_READY, isStaffEmail, useAdminStaff, useStaffMessaging } from "./supabase.js";
import Dashboard from "./components/Dashboard.jsx";
import ErrorBoundary, { TabLoading } from "./components/ErrorBoundary.jsx";
import StaffWelcomeTour, { tourDone } from "./components/StaffWelcomeTour.jsx";
import RoleChooser from "./components/RoleChooser.jsx";
import CommandPalette from "./components/CommandPalette.jsx";

// Every tab except the Dashboard landing view is lazy-loaded so the initial
// bundle stays small — chunks download on first visit to each tab.
const StaffMessaging         = lazy(() => import("./components/StaffMessaging.jsx"));
const AdminSettings          = lazy(() => import("./components/AdminSettings.jsx"));
const StudentClassroomPortal = lazy(() => import("./components/StudentClassroomPortal.jsx"));
const WeeklyEvents           = lazy(() => import("./components/WeeklyEvents.jsx"));
const TripRoster             = lazy(() => import("./components/TripRoster.jsx"));
const CeuTracker             = lazy(() => import("./components/CeuTracker.jsx"));
const GmenPeriod             = lazy(() => import("./components/GmenPeriod.jsx"));
const HallPass               = lazy(() => import("./components/HallPass.jsx"));
const Requisition            = lazy(() => import("./components/Requisition.jsx"));
const FieldTrip              = lazy(() => import("./components/FieldTrip.jsx"));
const StudentRoster          = lazy(() => import("./components/StudentRoster.jsx"));
const Infractions            = lazy(() => import("./components/Infractions.jsx"));
// Gradebook + AI Grader now live in the Classroom zone (see ClassroomApp).
const ClassroomZone          = lazy(() => import("./classroom/ClassroomZone.jsx"));

const TABS = [
  { key: "dashboard",   label: "Dashboard",         Icon: LayoutDashboard },
  { key: "events",      label: "Events",            Icon: CalendarDays },
  { key: "trips",       label: "Trip Rosters",      Icon: MapPinned },
  { key: "gmen",        label: "G-Men Period",      Icon: Calendar },
  { key: "hallpass",    label: "Hall Pass",         Icon: DoorOpen },
  { key: "infractions", label: "Infractions",       Icon: AlertTriangle },
  { key: "resources",   label: "Teacher Resources", Icon: Briefcase },
  { key: "messages",    label: "Messages",          Icon: MessageSquare },
  { key: "admin",       label: "⚙ Admin", adminOnly: true, Icon: Settings },
];

// Primary tabs shown in the mobile bottom bar (4 + "More")
const BOTTOM_NAV_TABS = [
  { key: "dashboard", label: "Home",      Icon: Home           },
  { key: "gmen",      label: "G-Men",     Icon: Calendar       },
  { key: "hallpass",  label: "Hall Pass", Icon: DoorOpen       },
  { key: "messages",  label: "Messages",  Icon: MessageSquare  },
  { key: "__more__",  label: "More",      Icon: MoreHorizontal },
];

const RESOURCE_TABS = [
  { key: "ceu",         label: "CEU Tracker"         },
  { key: "requisition", label: "Requisitions"         },
  { key: "fieldtrip",   label: "Field Trip Request"   },
  { key: "roster",      label: "Student Roster"       },
];

// When VITE_CLASSROOM_OWNER_EMAIL is set, only that address can access the Classroom zone.
// Leave it unset (or empty) to allow all staff in — useful during dev / initial rollout.
const CLASSROOM_OWNER_EMAIL = import.meta.env.VITE_CLASSROOM_OWNER_EMAIL || "";

function ZoneToggle({ zone, setZone, isClassroomOwner }) {
  return (
    <div
      className="zone-toggle"
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
          color: zone === "school" ? "#000" : "rgba(255,255,255,0.6)",
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
            ? (isClassroomOwner ? "#000" : "rgba(255,255,255,0.45)")
            : (isClassroomOwner ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)"),
          boxShadow: zone === "classroom" && isClassroomOwner ? "0 0 12px -2px rgba(245,179,1,0.55)" : "none",
        }}
      >
        {!isClassroomOwner && <Lock style={{ width: 10, height: 10, flexShrink: 0 }} />}
        <span className="zone-label-full">My Classroom</span>
        <span className="zone-label-short">Class</span>
      </button>
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-deep)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <SchoolLogo size={56} />
        <div style={{ color: GOLD, fontWeight: 800, letterSpacing: "0.15em", fontSize: "0.8rem" }}>LOADING…</div>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading, error, signInWithGoogle, signOut } = useAuth(ALLOWED_DOMAIN);
  const [isStaff, setIsStaff] = useState(null); // null = checking
  const [isAdmin, setIsAdmin] = useState(false);
  // Session-only — an account genuinely unknown to the system (neither
  // staff_directory nor the student roster) that picked "I'm a Student".
  // Not persisted: if they aren't on the roster yet, they'll see the
  // chooser again next login, which is harmless and resolves itself the
  // moment the office adds them.
  const [continuingAsStudent, setContinuingAsStudent] = useState(false);

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
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  // Wrap setTab so opening any tab also closes the More sheet
  const goToTab = useCallback((key) => { setTab(key); setShowMoreSheet(false); }, []);

  // More sheet: Escape closes it, and the page behind it stops scrolling
  useEffect(() => {
    if (!showMoreSheet) return;
    const onKey = (e) => { if (e.key === "Escape") setShowMoreSheet(false); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [showMoreSheet]);
  // Top-level zone: building-wide "school" vs the teacher's own "classroom".
  const [zone, setZoneState] = useState(() => {
    try { return localStorage.getItem("jag-zone") || "school"; } catch { return "school"; }
  });
  const setZone = useCallback((z) => {
    setZoneState(z);
    try { localStorage.setItem("jag-zone", z); } catch { /* ignore */ }
  }, []);
  const { students, loading: studentsLoading } = useStudents();
  const { events: weeklyEvents, addEvent, removeEvent } = useWeeklyEvents();
  const { rosters: tripRosters, addRoster, removeRoster } = useTripRosters();
  const [alerts, setAlerts] = useState([]);
  const { staffList } = useAdminStaff();
  const messaging = useStaffMessaging(user?.email);

  // ── Command palette (Cmd/Ctrl+K) ────────────────────────────────────────
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  if (loading) return <FullScreenLoader />;

  if (!user) return <LoginScreen configured={SUPABASE_READY} signInWithGoogle={signInWithGoogle} loading={loading} error={error} />;

  // While checking staff status, show spinner
  if (isStaff === null) return <FullScreenLoader />;

  // Non-staff @jagschools.org account. Three cases:
  //   - already on the student roster (RLS narrows `students` to just their
  //     own row) → straight into the student portal, as always
  //   - genuinely unknown to the system (neither staff_directory nor the
  //     roster) → one-time chooser, so a new hire doesn't land in the
  //     student portal by default
  //   - picked "I'm a Student" from that chooser this session → portal,
  //     which shows its own "Not on the Roster Yet" state until the office
  //     adds them
  if (isStaff === false) {
    if (studentsLoading) return <FullScreenLoader />;

    const isRecognized = students.length > 0 || continuingAsStudent;
    if (!isRecognized) return (
      <RoleChooser
        user={user}
        onContinueAsStudent={() => setContinuingAsStudent(true)}
        onBecameStaff={() => {
          // Full reload, not a state flip. Every data hook (students, events,
          // roster, …) already fetched while this account was still non-staff
          // and got empty results under RLS; flipping isStaff in place kept
          // showing that stale emptiness — only hall passes recovered, via
          // their realtime reload. A fresh mount refetches everything as
          // staff, and the normal login effect handles the welcome tour.
          window.location.reload();
        }}
      />
    );

    return (
      <Suspense fallback={<TabLoading />}>
        <StudentClassroomPortal user={user} signOut={signOut} />
      </Suspense>
    );
  }

  const isClassroomOwner = !CLASSROOM_OWNER_EMAIL || user.email.toLowerCase() === CLASSROOM_OWNER_EMAIL.toLowerCase();

  const sharedProps = { user, students, weeklyEvents, tripRosters, alerts, setAlerts };

  // Palette commands are cheap to rebuild every render (a few plain
  // objects) — no memoization needed, and it keeps this in sync with
  // isAdmin/zone without a dependency array to maintain.
  const paletteCommands = zone === "school" ? [
    ...TABS.filter(t => !t.adminOnly || isAdmin).map(t => ({
      id: `tab-${t.key}`,
      section: "Go to",
      label: t.label.replace(/^⚙\s*/, ""), // strip the emoji glyph used in the tab bar itself
      icon: t.Icon ? <t.Icon size={15} /> : null,
      keywords: [t.key],
      run: () => goToTab(t.key),
    })),
    ...RESOURCE_TABS.map(t => ({
      id: `resource-${t.key}`,
      section: "Teacher Resources",
      label: t.label,
      keywords: [t.key, "resources"],
      run: () => { goToTab("resources"); setResourceTab(t.key); },
    })),
    {
      id: "zone-classroom",
      section: "Zone",
      label: "Switch to My Classroom",
      icon: <Lock size={15} />,
      run: () => setZone("classroom"),
    },
    {
      id: "sign-out",
      section: "Account",
      label: "Sign Out",
      icon: <LogOut size={15} />,
      run: () => signOut(),
    },
  ] : [
    {
      id: "zone-school",
      section: "Zone",
      label: "Switch to School Portal",
      icon: <Command size={15} />,
      run: () => setZone("school"),
    },
    {
      id: "sign-out",
      section: "Account",
      label: "Sign Out",
      icon: <LogOut size={15} />,
      run: () => signOut(),
    },
  ];

  return (
    <div className="app-shell app-backdrop">
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={paletteCommands} />

      {showTour && (
        <StaffWelcomeTour
          userEmail={user.email}
          onClose={() => setShowTour(false)}
          onGoToClassroom={() => { setZone("classroom"); setShowTour(false); }}
        />
      )}

      {/* Top nav — two rows */}
      <nav className="top-nav" aria-label="School portal">
        {/* Row 1: brand + zone toggle + user */}
        <div className="nav-row1">
          <div className="nav-brand">
            <SchoolLogo size={36} />
            <div className="nav-school-name">
              <span className="name-line1">JAG Portal</span>
              <span className="name-line2">James A. Garfield</span>
            </div>
          </div>
          <div className="nav-zone-wrap" style={{ marginLeft: "1rem" }}>
            <ZoneToggle zone={zone} setZone={setZone} isClassroomOwner={isClassroomOwner} />
          </div>
          <div className="nav-user">
            <button
              className="btn btn-sm btn-ghost hide-mobile"
              onClick={() => setPaletteOpen(true)}
              title="Search and jump to anything"
              style={{ gap: "0.4rem" }}
            >
              <Command size={13} /> <kbd className="kbd">K</kbd>
            </button>
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
                onClick={() => goToTab(t.key)}
                aria-current={tab === t.key ? "page" : undefined}
              >
                <t.Icon size={15} strokeWidth={1.7} aria-hidden="true" />
                {t.label.replace(/^⚙\s*/, "")}
                {t.key === "messages" && messaging.totalUnread > 0 && (
                  <span style={{
                    marginLeft: 5, background: GOLD, color: "#000",
                    borderRadius: "50%", minWidth: 17, height: 17,
                    fontSize: "0.65rem", fontWeight: 800,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px", verticalAlign: "middle",
                  }}>{messaging.totalUnread > 99 ? "99+" : messaging.totalUnread}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </nav>

      {zone === "classroom" && isClassroomOwner ? (
        <Suspense fallback={<TabLoading />}>
          <ClassroomZone user={user} students={students} isAdmin={isAdmin} />
        </Suspense>
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
      <main className="content-area" id="school-content">
        <div key={tab} className="page-enter">
        <ErrorBoundary resetKey={`${tab}/${resourceTab}`}>
        <Suspense fallback={<TabLoading />}>
        {tab === "dashboard"   && <Dashboard   {...sharedProps} messaging={messaging} staffList={staffList} onNavigate={setTab} />}
        {tab === "events"      && <WeeklyEvents weeklyEvents={weeklyEvents} addEvent={addEvent} removeEvent={removeEvent} />}
        {tab === "trips"       && <TripRoster   tripRosters={tripRosters} addRoster={addRoster} removeRoster={removeRoster} students={students} />}
        {tab === "gmen"        && <GmenPeriod   students={students} user={user} setAlerts={setAlerts} isAdmin={isAdmin} />}
        {tab === "admin"       && isAdmin && <AdminSettings user={user} />}
        {tab === "hallpass"    && <HallPass      {...sharedProps} />}
        {tab === "infractions" && <Infractions  students={students} user={user} />}
        {tab === "messages"    && <StaffMessaging user={user} staffList={staffList} {...messaging} />}

        {tab === "resources" && (
          <>
            {/* Sub-tab bar */}
            <div className="resource-tabs" role="tablist" aria-label="Teacher resources">
              {RESOURCE_TABS.map(t => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={resourceTab === t.key}
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
        </Suspense>
        </ErrorBoundary>
        </div>
      </main>
      )}

      {/* ── Mobile bottom navigation (school zone, staff only) ─────────── */}
      {zone === "school" && isStaff && (
        <>
          <nav className="bottom-nav" aria-label="Main navigation">
            {BOTTOM_NAV_TABS.map(t => {
              if (t.key === "__more__") {
                const moreActive = showMoreSheet ||
                  !BOTTOM_NAV_TABS.some(b => b.key === tab);
                return (
                  <button
                    key="__more__"
                    className={`bottom-nav-btn${moreActive ? " active" : ""}`}
                    onClick={() => setShowMoreSheet(s => !s)}
                    aria-label="More tabs"
                  >
                    <span className="bottom-nav-icon"><t.Icon size={22} strokeWidth={1.75} /></span>
                    <span className="bottom-nav-label">{t.label}</span>
                  </button>
                );
              }
              const isActive = tab === t.key && !showMoreSheet;
              const unread = t.key === "messages" ? messaging.totalUnread : 0;
              return (
                <button
                  key={t.key}
                  className={`bottom-nav-btn${isActive ? " active" : ""}`}
                  onClick={() => goToTab(t.key)}
                  aria-label={t.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="bottom-nav-icon">
                    <t.Icon size={22} strokeWidth={1.75} />
                    {unread > 0 && (
                      <span className="bottom-nav-badge">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </span>
                  <span className="bottom-nav-label">{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* More sheet — slide-up drawer for secondary tabs */}
          {showMoreSheet && (
            <div
              className="more-sheet-overlay"
              onClick={() => setShowMoreSheet(false)}
              role="dialog"
              aria-modal="true"
              aria-label="More tabs"
            >
              <div className="more-sheet" onClick={e => e.stopPropagation()}>
                <div className="more-sheet-handle" aria-hidden="true" />
                {TABS
                  .filter(t =>
                    !BOTTOM_NAV_TABS.some(b => b.key === t.key) &&
                    (!t.adminOnly || isAdmin)
                  )
                  .map(t => (
                    <button
                      key={t.key}
                      className={`more-sheet-btn${tab === t.key ? " active" : ""}`}
                      onClick={() => goToTab(t.key)}
                    >
                      {t.label}
                    </button>
                  ))
                }
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
