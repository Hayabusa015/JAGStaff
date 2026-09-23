import { useState } from "react";
import { GOLD, CONFERENCE_REASONS } from "../constants.js";
import { useConferenceSlots, useConferenceSessions, useAdminStaff } from "../supabase.js";
import { buildSlotTimes, fmtConfDay, fmtConfTime, schedulePages, printSchedules } from "../conferences.js";

// Parent-teacher conferences. The office (admins) sets the conference nights,
// which creates every teacher's time slots; each teacher sees their own
// schedule fill in as parents book on the public /conferences page.

const REASON_LABEL = Object.fromEntries(CONFERENCE_REASONS.map(r => [r.key, r.label]));
// Global styles make inputs full-width; these sit inline.
const INLINE = { width: "auto" };
const REASON_TAG = { check_in: "tag-green", struggling: "tag-amber", concerns: "tag-red", other: "tag-blue" };

function fmt12(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export default function Conferences({ user, isAdmin }) {
  const { slots, loading, deleteSlot, cancelBooking } = useConferenceSlots(user?.email);
  const { staffList } = useAdminStaff();
  const [copied, setCopied] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const link = `${window.location.origin}/conferences?teacher=${encodeURIComponent(user?.email || "")}`;

  const now = Date.now();
  const visible = slots.filter(s => showPast || new Date(s.starts_at).getTime() > now - 3600000);
  const dayMap = new Map();
  visible.forEach(s => {
    const d = fmtConfDay(s.starts_at, "short");
    if (!dayMap.has(d)) dayMap.set(d, []);
    dayMap.get(d).push(s);
  });
  const byDay = [...dayMap.entries()];

  const upcoming = slots.filter(s => new Date(s.starts_at).getTime() > now);
  const bookedCount = upcoming.filter(s => s.booking).length;

  function copyLink() {
    navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 className="page-title" style={{ marginBottom: "0.25rem" }}>Parent-Teacher Conferences</h2>
        <div className="text-muted" style={{ fontSize: "0.85rem" }}>
          The office sets conference nights and your times appear below. Share your link with families; your schedule fills in as parents sign up. Parents don't need an account.
        </div>
      </div>

      {isAdmin && <OfficePanel user={user} staffList={staffList} />}

      {/* Share link */}
      <div className="card card-gold">
        <div className="section-title section-title-gold">Your sign-up link</div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <code style={{ flex: "1 1 260px", fontSize: "0.8rem", wordBreak: "break-all", color: "rgba(255,255,255,0.75)" }}>{link}</code>
          <button className="btn btn-primary btn-sm" onClick={copyLink}>{copied ? "Copied ✓" : "Copy link"}</button>
        </div>
        <div className="text-muted" style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
          Or send families to <strong>{window.location.origin}/conferences</strong> to pick from every teacher.
        </div>
      </div>

      {/* My schedule */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div className="section-title" style={{ marginBottom: 0 }}>My schedule</div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem", flexWrap: "wrap" }}>
            <span style={{ color: GOLD, fontWeight: 700 }}>{bookedCount} booked</span>
            <span className="text-muted">{upcoming.length - bookedCount} open</span>
            <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer", whiteSpace: "nowrap" }} className="text-muted">
              <input type="checkbox" style={INLINE} checked={showPast} onChange={e => setShowPast(e.target.checked)} /> Show past
            </label>
            <button className="btn btn-sm btn-ghost" disabled={!visible.length}
              onClick={() => printSchedules(schedulePages(visible, staffList))}>
              🖨 Print my schedule
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : byDay.length === 0 ? (
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>No conference times yet. They'll appear here once the office sets the conference nights.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {byDay.map(([day, list]) => (
              <div key={day}>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  {day} <span className="text-muted" style={{ fontWeight: 500, fontSize: "0.75rem" }}>· {list.filter(s => s.booking).length}/{list.length} booked</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {list.map(s => <SlotRow key={s.id} s={s} deleteSlot={deleteSlot} cancelBooking={cancelBooking} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SlotRow({ s, deleteSlot, cancelBooking }) {
  const b = s.booking;
  return (
    <div style={{
      display: "flex", gap: "0.75rem", alignItems: "flex-start", flexWrap: "wrap",
      padding: "0.55rem 0.75rem", borderRadius: 8,
      background: b ? "rgba(245,192,37,0.07)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${b ? "rgba(245,192,37,0.3)" : "rgba(255,255,255,0.07)"}`,
    }}>
      <div style={{ minWidth: 72, fontWeight: 700, fontSize: "0.85rem" }}>{fmtConfTime(s.starts_at)}</div>
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
          <button className="btn btn-sm btn-ghost" title="Block this time so parents can't book it" onClick={() => {
            if (window.confirm(`Block ${fmtConfTime(s.starts_at)}? Parents won't be able to book it.`)) deleteSlot(s.id);
          }}>Block time</button>
        )}
      </div>
    </div>
  );
}

// ── Office (admin) panel ────────────────────────────────────────────────────
const EMPTY_NIGHT = { label: "Parent-Teacher Conferences", date: "", start_time: "15:30", end_time: "19:00", slot_minutes: 15, break_start: "", break_end: "" };

function OfficePanel({ user, staffList }) {
  const { sessions, createSession, deleteSession } = useConferenceSessions();
  const { slots: allSlots, reload } = useConferenceSlots(null, { all: true });
  const [night, setNight] = useState(EMPTY_NIGHT);
  const [excluded, setExcluded] = useState(() => new Set());
  const [showTeachers, setShowTeachers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [printSession, setPrintSession] = useState("all");

  const times = buildSlotTimes(night.date, night.start_time, night.end_time, Number(night.slot_minutes), night.break_start, night.break_end);
  const teachers = staffList.filter(s => !excluded.has(s.email));

  async function handleCreate(e) {
    e.preventDefault();
    if (saving || !times.length || !teachers.length) return;
    setSaving(true); setErr(""); setMsg("");
    const res = await createSession(night, teachers, times, user?.email);
    setSaving(false);
    if (!res.ok) { setErr(res.error); return; }
    setMsg(`✓ Created ${times.length} times for ${teachers.length} teachers.`);
    setNight(n => ({ ...EMPTY_NIGHT, label: n.label, start_time: n.start_time, end_time: n.end_time, slot_minutes: n.slot_minutes }));
    reload();
  }

  async function handleDelete(sess) {
    const n = allSlots.filter(s => s.session_id === sess.id && s.booking).length;
    if (!window.confirm(`Delete "${sess.label}" on ${sess.date}? This removes every teacher's times for that night${n ? `, including ${n} parent booking${n === 1 ? "" : "s"}` : ""}.`)) return;
    await deleteSession(sess.id);
    reload();
  }

  const toPrint = printSession === "all" ? allSlots : allSlots.filter(s => s.session_id === printSession);
  const pages = schedulePages(toPrint, staffList);
  const set = (k) => (e) => setNight(n => ({ ...n, [k]: e.target.value }));

  return (
    <div className="card" style={{ borderLeft: `3px solid ${GOLD}` }}>
      <div className="section-title">Office: conference nights</div>

      {sessions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1rem" }}>
          {sessions.map(sess => {
            const ss = allSlots.filter(s => s.session_id === sess.id);
            return (
              <div key={sess.id} style={{
                display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
                padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, fontSize: "0.84rem",
              }}>
                <strong style={{ flex: "1 1 200px" }}>{sess.label}</strong>
                <span>{fmtConfDay(`${sess.date}T12:00:00`, "short")} · {fmt12(sess.start_time.slice(0, 5))}–{fmt12(sess.end_time.slice(0, 5))}</span>
                <span className="text-muted">{ss.filter(s => s.booking).length}/{ss.length} booked</span>
                <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(sess)}>Delete</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Mass print */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <select style={INLINE} value={printSession} onChange={e => setPrintSession(e.target.value)}>
          <option value="all">All conference nights</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.label} · {s.date}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" disabled={!pages.length} onClick={() => printSchedules(pages)}>
          🖨 Print all teacher schedules ({pages.length} page{pages.length === 1 ? "" : "s"})
        </button>
        <span className="text-muted" style={{ fontSize: "0.75rem" }}>One teacher per sheet, sorted by last name, ready for mailboxes.</span>
      </div>

      {/* New night */}
      <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>Add a conference night</div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input value={night.label} onChange={set("label")} maxLength={80} placeholder="Name (e.g. Fall Conferences)" style={{ flex: "1 1 200px" }} required />
          <input type="date" value={night.date} onChange={set("date")} required style={INLINE} />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", fontSize: "0.82rem" }}>
          <input type="time" value={night.start_time} onChange={set("start_time")} required style={INLINE} />
          <span className="text-muted">to</span>
          <input type="time" value={night.end_time} onChange={set("end_time")} required style={INLINE} />
          <select style={INLINE} value={night.slot_minutes} onChange={e => setNight(n => ({ ...n, slot_minutes: Number(e.target.value) }))}>
            {[10, 15, 20, 30].map(m => <option key={m} value={m}>{m}-minute conferences</option>)}
          </select>
          <span className="text-muted">Break (optional)</span>
          <input type="time" value={night.break_start} onChange={set("break_start")} style={INLINE} />
          <span className="text-muted">to</span>
          <input type="time" value={night.break_end} onChange={set("break_end")} style={INLINE} />
        </div>

        <div style={{ fontSize: "0.8rem" }}>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowTeachers(v => !v)}>
            {teachers.length} of {staffList.length} staff included {showTeachers ? "▲" : "▼"}
          </button>
          {showTeachers && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.25rem", marginTop: "0.5rem" }}>
              {staffList.map(s => (
                <label key={s.email} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                  <input type="checkbox" style={INLINE} checked={!excluded.has(s.email)} onChange={() => setExcluded(prev => {
                    const next = new Set(prev);
                    if (next.has(s.email)) next.delete(s.email); else next.add(s.email);
                    return next;
                  })} />
                  {s.name || s.email}{s.room ? <span className="text-muted"> · Rm {s.room}</span> : null}
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !times.length || !teachers.length}>
            {saving ? "Creating…" : `Create ${times.length || ""} times × ${teachers.length} teachers`}
          </button>
          {times.length > 0 && (
            <span className="text-muted" style={{ fontSize: "0.78rem" }}>
              {fmtConfTime(times[0])} – {fmtConfTime(times[times.length - 1])} starts, each teacher in their own room
            </span>
          )}
        </div>
        {err && <p className="text-red" style={{ fontSize: "0.8rem" }}>{err}</p>}
        {msg && <p className="text-green" style={{ fontSize: "0.8rem" }}>{msg}</p>}
      </form>
    </div>
  );
}
