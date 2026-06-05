import { GOLD, ALLOWED_DOMAIN, SESSION_TIMEOUT_MS } from "../constants.js";
import { useAdminStaff } from "../supabase.js";

export default function AdminSettings({ user }) {
  const { staffList, toggleAdmin } = useAdminStaff();

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
