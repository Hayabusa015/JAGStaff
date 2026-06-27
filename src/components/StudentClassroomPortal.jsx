// Phase 5: Student-facing portal.
// Wraps the ClassroomApp in student mode with a zone toggle for G-Men Period.

import { useState } from "react";
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

function SchoolLogo({ size = 36 }) {
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

function ZoneTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
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
  const [zone, setZone] = useState("classroom");

  return (
    <div className="app-shell app-backdrop" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top nav */}
      <nav className="top-nav">
        <div className="nav-row1">
          <div className="nav-brand">
            <SchoolLogo size={36} />
            <div className="nav-school-name">
              <span className="name-line1">James A. Garfield</span>
              <span className="name-line2">Student Portal</span>
            </div>
          </div>

          {/* Zone toggle */}
          <div
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
            <ZoneTab active={zone === "classroom"} onClick={() => setZone("classroom")}>
              My Classroom
            </ZoneTab>
            <ZoneTab active={zone === "gmen"} onClick={() => setZone("gmen")}>
              G-Men Period
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
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <ClassroomProvider user={user} isStaff={false}>
            <StudentClassroomInner user={user} zone={zone} />
          </ClassroomProvider>
        </div>
      )}
    </div>
  );
}
