import { useState } from "react";
import { GOLD, ALLOWED_DOMAIN, SESSION_TIMEOUT_MS } from "../constants.js";
import { useAdminStaff, useBellSchedule, todayScheduleKey } from "../supabase.js";

function fmt12(hhmm) {
  if (!hhmm || !hhmm.includes(":")) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${period}`;
}

export default function AdminSettings({ user }) {
  const { staffList, toggleAdmin } = useAdminStaff();
  const { schedules, saveSchedule } = useBellSchedule();
  const [schedTab, setSchedTab] = useState("twt"); // "twt" | "mf"
  const [drafts, setDrafts] = useState({}); // { twt: [...] | null, mf: [...] | null }

  const editing = !!drafts[schedTab];
  const rows = drafts[schedTab] || schedules[schedTab] || [];

  function startEdit() {
    const src = schedules[schedTab] || [];
    setDrafts(d => ({ ...d, [schedTab]: src.length ? src.map(p => ({ ...p })) : [{ name: "Period 1", start: "07:45", end: "08:33" }] }));
  }
  function cancelEdit() { setDrafts(d => ({ ...d, [schedTab]: null })); }
  function updateRow(i, key, val) { setDrafts(d => ({ ...d, [schedTab]: d[schedTab].map((p, idx) => idx === i ? { ...p, [key]: val } : p) })); }
  function addRow() {
    setDrafts(d => {
      const arr = d[schedTab];
      const last = arr[arr.length - 1];
      return { ...d, [schedTab]: [...arr, { name: `Period ${arr.length + 1}`, start: last?.end || "07:45", end: "" }] };
    });
  }
  function removeRow(i) { setDrafts(d => ({ ...d, [schedTab]: d[schedTab].filter((_, idx) => idx !== i) })); }
  async function saveEdit() {
    const clean = drafts[schedTab].filter(p => p.name && p.start && p.end);
    await saveSchedule(schedTab, clean, user?.email);
    setDrafts(d => ({ ...d, [schedTab]: null }));
  }

  const adminCount = staffList.filter(s => s.is_admin).length;

  function fmtLastSeen(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    const now = new Date();
    const diffH = Math.floor((now - d) / 3600000);
    if (diffH < 1) return "< 1 hour ago";
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const sessionHours = Math.round(SESSION_TIMEOUT_MS / 3600000);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div>
        <h2 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.25rem" }}>Admin Settings</h2>
        <div className="text-muted" style={{ fontSize: "0.85rem" }}>
          Manage admin privileges and view app configuration.
        </div>
      </div>

      {/* Staff Directory */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Staff Directory</div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)" }}>
            {staffList.length} staff · {adminCount} admin{adminCount !== 1 ? "s" : ""}
          </div>
        </div>

        {staffList.length === 0 ? (
          <div className="text-muted" style={{ fontSize: "0.85rem" }}>No staff have logged in yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {["Name", "Email", "Room", "Last Seen", "Admin"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "0.4rem 0.75rem",
                      fontSize: "0.7rem", textTransform: "uppercase",
                      letterSpacing: "0.07em", color: "rgba(255,255,255,0.35)",
                      fontWeight: 600,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffList.map(s => (
                  <tr key={s.email} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.55rem 0.75rem", fontWeight: 600 }}>{s.name || "—"}</td>
                    <td style={{ padding: "0.55rem 0.75rem", color: "rgba(255,255,255,0.55)", fontSize: "0.8rem" }}>{s.email}</td>
                    <td style={{ padding: "0.55rem 0.75rem", color: "rgba(255,255,255,0.45)" }}>{s.room || "—"}</td>
                    <td style={{ padding: "0.55rem 0.75rem", color: "rgba(255,255,255,0.35)", fontSize: "0.78rem" }}>{fmtLastSeen(s.last_seen)}</td>
                    <td style={{ padding: "0.55rem 0.75rem" }}>
                      {s.email === user?.email ? (
                        /* Can't remove your own admin — prevents lockout */
                        <span style={{ fontSize: "0.75rem", color: GOLD, fontWeight: 700 }}>You</span>
                      ) : (
                        <button
                          onClick={() => toggleAdmin(s.email, !s.is_admin)}
                          title={s.is_admin ? "Remove admin" : "Grant admin"}
                          style={{
                            width: 40, height: 22, borderRadius: 11, border: "none",
                            cursor: "pointer", position: "relative", transition: "background 0.2s",
                            background: s.is_admin ? GOLD : "rgba(255,255,255,0.15)",
                          }}
                        >
                          <span style={{
                            position: "absolute", top: 2,
                            left: s.is_admin ? "calc(100% - 20px)" : 2,
                            width: 18, height: 18, borderRadius: "50%",
                            background: s.is_admin ? "#000" : "rgba(255,255,255,0.6)",
                            transition: "left 0.2s",
                          }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bell Schedule */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Bell Schedule</div>
          {!editing && (
            <button onClick={startEdit} style={{
              background: "rgba(245,192,37,0.12)", border: `1px solid ${GOLD}`, color: GOLD,
              borderRadius: 6, padding: "0.3rem 0.85rem", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem",
            }}>Edit</button>
          )}
        </div>
        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.75rem" }}>
          Two schedules: G-Men days (Tue/Wed/Thu) and regular days (Mon/Fri). The app automatically uses today's schedule.
        </div>
        {/* Schedule type tabs */}
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.85rem" }}>
          {[{ key: "twt", label: "Tue / Wed / Thu  (G-Men)" }, { key: "mf", label: "Mon / Fri" }].map(t => {
            const isToday = todayScheduleKey() === t.key;
            return (
              <button key={t.key} onClick={() => { cancelEdit(); setSchedTab(t.key); }} style={{
                background: schedTab === t.key ? GOLD : "rgba(255,255,255,0.06)",
                border: schedTab === t.key ? "none" : "1px solid rgba(255,255,255,0.12)",
                color: schedTab === t.key ? "#000" : "rgba(255,255,255,0.55)",
                borderRadius: 6, padding: "0.3rem 0.85rem", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem",
                display: "flex", alignItems: "center", gap: "0.4rem",
              }}>
                {t.label}
                {isToday && (
                  <span style={{
                    fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.06em",
                    background: schedTab === t.key ? "rgba(0,0,0,0.2)" : "rgba(245,192,37,0.15)",
                    color: schedTab === t.key ? "#000" : GOLD,
                    borderRadius: 3, padding: "0.05rem 0.35rem",
                  }}>TODAY</span>
                )}
              </button>
            );
          })}
        </div>

        {!editing && rows.length === 0 && (
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>No periods yet — click Edit to add.</p>
        )}

        {!editing && rows.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {rows.map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.45rem 0.75rem", background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7,
              }}>
                <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{p.name}</span>
                <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)" }}>{fmt12(p.start)} – {fmt12(p.end)}</span>
              </div>
            ))}
          </div>
        )}

        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {rows.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  value={p.name}
                  onChange={e => updateRow(i, "name", e.target.value)}
                  placeholder="Period name"
                  style={{ flex: "1 1 140px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.35rem 0.6rem", color: "#fff", fontSize: "0.82rem", outline: "none" }}
                />
                <input type="time" value={p.start} onChange={e => updateRow(i, "start", e.target.value)}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.3rem 0.5rem", color: "#fff", fontSize: "0.82rem", outline: "none" }} />
                <span style={{ color: "rgba(255,255,255,0.3)" }}>–</span>
                <input type="time" value={p.end} onChange={e => updateRow(i, "end", e.target.value)}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.3rem 0.5rem", color: "#fff", fontSize: "0.82rem", outline: "none" }} />
                <button onClick={() => removeRow(i)} title="Remove" style={{
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444",
                  borderRadius: 6, padding: "0.25rem 0.6rem", cursor: "pointer", fontSize: "0.8rem",
                }}>✕</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              <button onClick={addRow} style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "0.4rem 0.85rem", cursor: "pointer", fontSize: "0.82rem",
              }}>+ Add Period</button>
              <div style={{ flex: 1 }} />
              <button onClick={cancelEdit} style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.5)", borderRadius: 6, padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.82rem",
              }}>Cancel</button>
              <button onClick={saveEdit} style={{
                background: GOLD, border: "none", color: "#000", fontWeight: 700,
                borderRadius: 6, padding: "0.4rem 1.25rem", cursor: "pointer", fontSize: "0.82rem",
              }}>Save Schedule</button>
            </div>
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="card">
        <div className="section-title">App Configuration</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {[
            { label: "Allowed Domain", value: `@${ALLOWED_DOMAIN}` },
            { label: "Session Timeout", value: `${sessionHours} hours of inactivity` },
            { label: "Logged in as", value: user?.email || "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(255,255,255,0.35)", minWidth: 130 }}>{label}</span>
              <span style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.7)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
