import { useState } from "react";
import { GOLD, CONFERENCE_REASONS, CONFERENCE_TZ } from "../constants.js";
import { useConferenceSlots } from "../supabase.js";

// Teacher view of parent-teacher conferences: publish open times, share the
// public sign-up link, and watch the schedule fill in as parents book.

const REASON_LABEL = Object.fromEntries(CONFERENCE_REASONS.map(r => [r.key, r.label]));
const REASON_TAG = { check_in: "tag-green", struggling: "tag-amber", concerns: "tag-red", other: "tag-blue" };

function fmtDay(iso) {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: CONFERENCE_TZ, weekday: "long", month: "short", day: "numeric" });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: CONFERENCE_TZ, hour: "numeric", minute: "2-digit" });
}

// Every start time from `start` up to (not past) `end`, `len` minutes apart.
// Times are read in the browser's local zone — staff are all in-building.
export function buildSlotTimes(date, start, end, len) {
  if (!date || !start || !end || !(len > 0)) return [];
  const out = [];
  const endMs = new Date(`${date}T${end}`).getTime();
  for (let t = new Date(`${date}T${start}`).getTime(); t + len * 60000 <= endMs; t += len * 60000) {
    out.push(new Date(t).toISOString());
    if (out.length > 200) break;
  }
  return out;
}

export default function Conferences({ user }) {
  const { slots, loading, addSlots, deleteSlot, cancelBooking } = useConferenceSlots(user?.email);
  const [gen, setGen] = useState({ date: "", start: "15:30", end: "18:00", len: 15, location: "" });
  const [genErr, setGenErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const link = `${window.location.origin}/conferences?teacher=${encodeURIComponent(user?.email || "")}`;
  const preview = buildSlotTimes(gen.date, gen.start, gen.end, Number(gen.len));

  const now = Date.now();
  const visible = slots.filter(s => showPast || new Date(s.starts_at).getTime() > now - 3600000);
  const dayMap = new Map();
  visible.forEach(s => {
    const d = fmtDay(s.starts_at);
    if (!dayMap.has(d)) dayMap.set(d, []);
    dayMap.get(d).push(s);
  });
  const byDay = [...dayMap.entries()];

  const upcoming = slots.filter(s => new Date(s.starts_at).getTime() > now);
  const bookedCount = upcoming.filter(s => s.booking).length;

  async function handleGenerate(e) {
    e.preventDefault();
    if (!preview.length || saving) return;
    setSaving(true);
    setGenErr("");
    const res = await addSlots(preview.map(starts_at => ({
      teacher_email: user.email,
      teacher_name: user.name || null,
      starts_at,
      duration_min: Number(gen.len),
      location: gen.location.trim() || null,
    })));
    setSaving(false);
    if (!res.ok) setGenErr(res.error);
  }

  function copyLink() {
    navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 className="page-title" style={{ marginBottom: "0.25rem" }}>Parent-Teacher Conferences</h2>
        <div className="text-muted" style={{ fontSize: "0.85rem" }}>
          Post your open times, share your link with families, and your schedule fills in as parents sign up. Parents don't need an account.
        </div>
      </div>

      {/* Share link */}
      <div className="card card-gold">
        <div className="section-title section-title-gold">Your sign-up link</div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <code style={{ flex: "1 1 260px", fontSize: "0.8rem", wordBreak: "break-all", color: "rgba(255,255,255,0.75)" }}>{link}</code>
          <button className="btn btn-primary btn-sm" onClick={copyLink}>{copied ? "Copied ✓" : "Copy link"}</button>
        </div>
        <div className="text-muted" style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
          Or send families to <strong>{window.location.origin}/conferences</strong> to pick from every teacher with open times.
        </div>
      </div>

      {/* Add times */}
      <form className="card" onSubmit={handleGenerate}>
        <div className="section-title">Add open times</div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input type="date" value={gen.date} onChange={e => setGen(g => ({ ...g, date: e.target.value }))} required />
          <input type="time" value={gen.start} onChange={e => setGen(g => ({ ...g, start: e.target.value }))} required />
          <span className="text-muted">to</span>
          <input type="time" value={gen.end} onChange={e => setGen(g => ({ ...g, end: e.target.value }))} required />
          <select value={gen.len} onChange={e => setGen(g => ({ ...g, len: Number(e.target.value) }))}>
            {[10, 15, 20, 30].map(n => <option key={n} value={n}>{n} min each</option>)}
          </select>
          <input placeholder="Location (e.g. Room 214, or Phone)" maxLength={120} value={gen.location}
            onChange={e => setGen(g => ({ ...g, location: e.target.value }))} style={{ flex: "1 1 200px" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!preview.length || saving}>
            {saving ? "Adding…" : `+ Add ${preview.length || ""} time${preview.length === 1 ? "" : "s"}`}
          </button>
          {preview.length > 0 && (
            <span className="text-muted" style={{ fontSize: "0.78rem" }}>
              {fmtTime(preview[0])} – {fmtTime(preview[preview.length - 1])}, {gen.len}-minute slots
            </span>
          )}
        </div>
        {genErr && <p className="text-red mt1" style={{ fontSize: "0.8rem" }}>{genErr}</p>}
      </form>

      {/* Schedule */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div className="section-title" style={{ marginBottom: 0 }}>My schedule</div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem" }}>
            <span style={{ color: GOLD, fontWeight: 700 }}>{bookedCount} booked</span>
            <span className="text-muted">{upcoming.length - bookedCount} open</span>
            <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer" }} className="text-muted">
              <input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)} /> Show past
            </label>
          </div>
        </div>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : byDay.length === 0 ? (
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>No conference times yet. Add some above.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {byDay.map(([day, list]) => (
              <div key={day}>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  {day} <span className="text-muted" style={{ fontWeight: 500, fontSize: "0.75rem" }}>· {list.filter(s => s.booking).length}/{list.length} booked</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {list.map(s => {
                    const b = s.booking;
                    return (
                      <div key={s.id} style={{
                        display: "flex", gap: "0.75rem", alignItems: "flex-start", flexWrap: "wrap",
                        padding: "0.55rem 0.75rem", borderRadius: 8,
                        background: b ? "rgba(245,192,37,0.07)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${b ? "rgba(245,192,37,0.3)" : "rgba(255,255,255,0.07)"}`,
                      }}>
                        <div style={{ minWidth: 72, fontWeight: 700, fontSize: "0.85rem" }}>{fmtTime(s.starts_at)}</div>
                        <div style={{ flex: "1 1 220px", fontSize: "0.84rem" }}>
                          {b ? (
                            <>
                              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                                <strong>{b.student_name}</strong>
                                <span className={`tag ${REASON_TAG[b.reason] || "tag-gold"}`}>{REASON_LABEL[b.reason] || b.reason}</span>
                              </div>
                              <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                                {b.parent_name}
                                {b.parent_email && <> · <a href={`mailto:${b.parent_email}`} style={{ color: GOLD }}>{b.parent_email}</a></>}
                                {b.parent_phone && <> · <a href={`tel:${b.parent_phone}`} style={{ color: GOLD }}>{b.parent_phone}</a></>}
                              </div>
                              {b.notes && <div style={{ fontSize: "0.8rem", marginTop: "0.25rem", whiteSpace: "pre-wrap" }}>“{b.notes}”</div>}
                            </>
                          ) : (
                            <span className="text-muted">Open{s.location ? ` · ${s.location}` : ""}</span>
                          )}
                        </div>
                        <div>
                          {b ? (
                            <button className="btn btn-sm btn-ghost" onClick={() => {
                              if (window.confirm(`Cancel ${b.parent_name}'s conference about ${b.student_name}? The time opens back up. Let the family know.`)) cancelBooking(b.id);
                            }}>Cancel booking</button>
                          ) : (
                            <button className="btn btn-sm btn-ghost" onClick={() => deleteSlot(s.id)} title="Remove this open time">Remove</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
