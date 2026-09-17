// Phase 5: Student-facing portal.
// Wraps the ClassroomApp in student mode with a zone toggle for G-Men Period.

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import SchoolLogo from "./SchoolLogo.jsx";
import { GOLD } from "../constants.js";

function getTeacherName() {
  try {
    const stored = localStorage.getItem("gmen-teacher-profile-v1");
    if (stored) {
      const { name } = JSON.parse(stored);
      if (name) return name;
    }
  } catch { /* ignore storage errors */ }
  return "your teacher";
}
import { AppProvider as ClassroomProvider, useApp } from "../classroom/ClassroomContext.jsx";
import ClassroomApp from "../classroom/ClassroomApp.jsx";
import GmenEnrollmentView from "./GmenEnrollmentView.jsx";
import StudentHallPass from "./StudentHallPass.jsx";

function ZoneTab({ active, locked, onClick, children }) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      title={locked ? "Ask your teacher to add you to a classroom to unlock this" : undefined}
      style={{
        display: "flex", alignItems: "center", gap: "0.3rem",
        padding: "0.3rem 0.85rem",
        borderRadius: 999,
        border: "none",
        cursor: locked ? "default" : "pointer",
        fontSize: "0.68rem",
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
        background: active ? GOLD : "transparent",
        color: locked ? "rgba(255,255,255,0.3)" : active ? "#000" : "rgba(255,255,255,0.6)",
        boxShadow: active ? "0 0 12px -2px rgba(245,179,1,0.55)" : "none",
      }}
    >
      {locked && <Lock style={{ width: 10, height: 10, flexShrink: 0 }} />}
      {children}
    </button>
  );
}

// Inner component that reads studentNotFound from ClassroomContext.
function StudentClassroomInner({ user, _zone }) {
  const { studentNotFound, studentLoading } = useApp();

  if (studentLoading) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: "1rem", background: "var(--bg-deep)",
      }}>
        <img src="/gmen-logo.png" alt="" style={{ width: 56, height: 56, objectFit: "contain", opacity: 0.7 }} />
        <div style={{ color: GOLD, fontWeight: 800, letterSpacing: "0.15em", fontSize: "0.8rem" }}>
          LOADING YOUR CLASSROOM…
        </div>
      </div>
    );
  }

  if (studentNotFound) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "2rem",
      }}>
        <div style={{
          maxWidth: 420, textAlign: "center",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(245,192,37,0.2)",
          borderRadius: 16, padding: "2rem",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
          <h2 style={{ color: GOLD, fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            Not in a Classroom Yet
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", lineHeight: 1.6 }}>
            Your account (<strong style={{ color: "rgba(255,255,255,0.8)" }}>{user?.email}</strong>) hasn't
            been added to a classroom by your teacher yet. Check back later or ask{" "}
            <strong style={{ color: "rgba(255,255,255,0.8)" }}>{getTeacherName()}</strong> to add you.
          </p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", marginTop: "1rem" }}>
            You can still sign up for G-Men Period using the tab above.
          </p>
        </div>
      </div>
    );
  }

  return <ClassroomApp user={user} />;
}

export default function StudentClassroomPortal({ user, signOut }) {
  // The provider now wraps the whole shell, not just the classroom zone, so
  // enrollment (studentNotFound) is known before the tab bar renders — that's
  // what lets the "My Classroom" tab itself stay locked for students who
  // aren't on any teacher's roster, instead of only hiding its content.
  return (
    <ClassroomProvider user={user} isStaff={false}>
      <StudentPortalShell user={user} signOut={signOut} />
    </ClassroomProvider>
  );
}

function StudentPortalShell({ user, signOut }) {
  const [zone, setZone] = useState("classroom");
  const { studentLoading, studentNotFound } = useApp();
  const enrolled = !studentLoading && !studentNotFound;
  const classroomLocked = !studentLoading && !enrolled;

  // A student who turns out not to be enrolled anywhere shouldn't land on
  // (or stay on) the classroom tab by default — steer them to G-Men Period,
  // the one zone every recognized student can always use.
  useEffect(() => {
    if (classroomLocked && zone === "classroom") setZone("gmen");
  }, [classroomLocked, zone]);

  return (
    <div className="app-shell app-backdrop" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top nav */}
      <nav className="top-nav">
        <div className="nav-row1">
          <div className="nav-brand">
            <SchoolLogo size={36} />
            <div className="nav-school-name">
              <span className="name-line1">JAG Portal</span>
              <span className="name-line2">Student Portal</span>
            </div>
          </div>

          {/* Zone toggle */}
          <div
            className="nav-zone-wrap zone-toggle student-zone-toggle"
            style={{
              display: "inline-flex",
              gap: 2,
              padding: 3,
              borderRadius: 999,
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${GOLD}33`,
              marginLeft: "1rem",
            }}
            role="tablist"
          >
            <ZoneTab active={zone === "classroom"} locked={classroomLocked} onClick={() => setZone("classroom")}>
              My Classroom
            </ZoneTab>
            <ZoneTab active={zone === "gmen"} onClick={() => setZone("gmen")}>
              G-Men Period
            </ZoneTab>
            <ZoneTab active={zone === "hallpass"} onClick={() => setZone("hallpass")}>
              Hall Pass
            </ZoneTab>
          </div>

          <div className="nav-user">
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt="" className="nav-avatar" />
            )}
            <span className="nav-user-name">{user.name}</span>
            <button className="btn btn-sm btn-ghost" onClick={signOut}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {zone === "gmen" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <GmenEnrollmentView user={user} signOut={signOut} />
        </div>
      ) : zone === "hallpass" ? (
        <StudentHallPass user={user} />
      ) : zone === "classroom" && !classroomLocked ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <StudentClassroomInner user={user} zone={zone} />
        </div>
      ) : null}
    </div>
  );
}
