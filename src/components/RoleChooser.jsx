// Shown once, only to a signed-in @jagschools.org account that matches
// neither staff_directory nor the student roster — i.e. genuinely unknown
// to the system. Recognized staff and recognized students never see this;
// they route straight to their app as always. See App.jsx for the gate.
import { useState } from "react";
import { GOLD } from "../constants.js";
import { claimStaffRole } from "../supabase.js";

function ChoiceCard({ icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem",
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16, padding: "2rem 1.5rem", cursor: "pointer",
        color: "#fff", width: "100%", transition: "all 0.18s ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}88`; e.currentTarget.style.background = "rgba(245,192,37,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
    >
      <div style={{ fontSize: "2rem" }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: "1rem" }}>{title}</div>
      <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", textAlign: "center" }}>{subtitle}</div>
    </button>
  );
}

export default function RoleChooser({ user, onContinueAsStudent, onBecameStaff }) {
  const [mode, setMode] = useState("choose"); // 'choose' | 'staff-code'
  const [name, setName] = useState(user?.name || "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClaim(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await claimStaffRole(code, name);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onBecameStaff();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-deep)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
            First time here
          </div>
          <h1 style={{ color: GOLD, fontWeight: 800, fontSize: "1.3rem", marginTop: "0.35rem" }}>
            How are you using JAG Portal?
          </h1>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginTop: "0.4rem" }}>
            {user?.email}
          </div>
        </div>

        {mode === "choose" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <ChoiceCard icon="🎓" title="I'm a Student" subtitle="Hall passes, G-Men Period, My Classroom"
              onClick={onContinueAsStudent} />
            <ChoiceCard icon="🍎" title="I'm Staff" subtitle="Requires a passcode from your admin"
              onClick={() => setMode("staff-code")} />
          </div>
        )}

        {mode === "staff-code" && (
          <form onSubmit={handleClaim} style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, padding: "1.5rem",
          }}>
            <div className="mb1">
              <label>Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="First Last" />
            </div>
            <div className="mb1">
              <label>Staff Passcode</label>
              <input type="password" value={code} onChange={e => setCode(e.target.value)}
                placeholder="Ask your admin" autoFocus />
            </div>
            {error && <p className="text-red mb1" style={{ fontSize: "0.82rem" }}>{error}</p>}
            <div className="flex gap1">
              <button type="button" className="btn btn-ghost" style={{ color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.2)" }}
                onClick={() => { setMode("choose"); setError(""); }}>
                ← Back
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy || !code.trim()}>
                {busy ? "Checking…" : "Continue"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
