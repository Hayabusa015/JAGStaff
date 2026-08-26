// Per-student hall pass drill-down for staff: full history (where, when,
// how long) plus that student's restrictions — a daily cap and/or the
// bell-schedule periods their passes are allowed in. Limits are enforced
// server-side in student_request_pass; teacher-issued passes bypass them
// by design (staff override).
import { useEffect, useState } from "react";
import { GOLD } from "../constants.js";
import { getStudentPassHistory, getPassLimits, savePassLimits } from "../supabase.js";
import { DestIcon } from "./hallPassIcons.jsx";

function fmtWhen(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function StudentPassInspector({ student, periodNames, user, onClose }) {
  const [history, setHistory] = useState(null); // null = loading
  const [dailyMax, setDailyMax] = useState("");
  const [allowed, setAllowed] = useState([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { ok, text }

  useEffect(() => {
    let live = true;
    setHistory(null);
    getStudentPassHistory(student.id).then(h => { if (live) setHistory(h); });
    getPassLimits(student.id).then(lim => {
      if (!live) return;
      setDailyMax(lim?.daily_max != null ? String(lim.daily_max) : "");
      setAllowed(lim?.allowed_periods || []);
      setNote(lim?.note || "");
    });
    return () => { live = false; };
  }, [student.id]);

  const rows = history || [];
  const todayKey = new Date().toDateString();
  const todayCount = rows.filter(r => new Date(r.out_time).toDateString() === todayKey).length;
  const weekCount = rows.filter(r => Date.now() - new Date(r.out_time).getTime() < 7 * 86400000).length;
  const avgMin = rows.length ? Math.round(rows.reduce((a, r) => a + (r.duration || 0), 0) / rows.length) : 0;
  const hasLimits = dailyMax !== "" || allowed.length > 0;

  async function save() {
    if (saving) return;
    setSaving(true);
    setSaveMsg(null);
    const res = await savePassLimits(student.id, {
      dailyMax: dailyMax === "" ? null : Math.max(1, parseInt(dailyMax, 10) || 1),
      allowedPeriods: allowed,
      note,
    }, user?.email);
    setSaving(false);
    setSaveMsg(res.ok
      ? { ok: true, text: res.cleared ? "Restrictions cleared." : "Restrictions saved — applies to their next request." }
      : { ok: false, text: res.error });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ width: "min(640px, 94vw)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{student.name}</div>
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
              Hall pass history &amp; restrictions
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
        </div>

        {/* Summary */}
        <div style={{ display: "flex", gap: "1.25rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {[["Today", todayCount], ["Last 7 days", weekCount], ["Avg duration", `${avgMin} min`], ["On record", rows.length]].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: GOLD }}>{val}</div>
              <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Restrictions */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${hasLimits ? GOLD + "44" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: hasLimits ? GOLD : "rgba(255,255,255,0.4)", marginBottom: "0.6rem" }}>
            Restrictions {hasLimits ? "· active" : "· none"}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "0.6rem" }}>
            <div>
              <label>Max passes / day</label>
              <input type="number" min={1} max={20} value={dailyMax} placeholder="No limit"
                onChange={e => setDailyMax(e.target.value)} style={{ width: 110 }} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label>Allowed periods (none selected = any)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.25rem" }}>
                {periodNames.map(name => {
                  const on = allowed.includes(name);
                  return (
                    <button key={name} type="button"
                      onClick={() => setAllowed(a => on ? a.filter(x => x !== name) : [...a, name])}
                      style={{
                        background: on ? "rgba(245,192,37,0.16)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${on ? GOLD : "rgba(255,255,255,0.12)"}`,
                        color: on ? GOLD : "rgba(255,255,255,0.55)",
                        borderRadius: 999, padding: "0.2rem 0.6rem", cursor: "pointer",
                        fontSize: "0.72rem", fontWeight: 600,
                      }}>{name}</button>
                  );
                })}
              </div>
            </div>
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Private note (optional — students never see this)"
            style={{ marginBottom: "0.6rem", fontSize: "0.82rem" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Restrictions"}
            </button>
            {saveMsg && (
              <span style={{ fontSize: "0.78rem", color: saveMsg.ok ? "#4ade80" : "#fca5a5" }}>{saveMsg.text}</span>
            )}
          </div>
          <div className="text-muted" style={{ fontSize: "0.7rem", marginTop: "0.5rem" }}>
            Applies only to passes the student requests from their own device. You can always issue or approve past any limit.
          </div>
        </div>

        {/* History */}
        <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem" }}>
          Pass History
        </div>
        {history === null ? (
          <p className="text-muted" style={{ fontSize: "0.82rem" }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-muted" style={{ fontSize: "0.82rem" }}>No passes on record.</p>
        ) : (
          <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            {rows.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.35rem 0.25rem", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.82rem" }}>
                <span style={{ color: GOLD, display: "flex", flexShrink: 0 }}><DestIcon dest={r.destination} size={15} /></span>
                <span style={{ width: 92, flexShrink: 0 }}>{r.destination}</span>
                <span className="text-muted" style={{ flex: 1, fontSize: "0.76rem" }}>{fmtWhen(r.out_time)}{r.room ? ` · Rm ${r.room}` : ""}</span>
                <span className={`tag ${(r.duration || 0) >= 10 ? "tag-red" : "tag-gold"}`}>{r.duration ?? "—"} min</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
