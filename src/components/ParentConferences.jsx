import { useState, useEffect, useMemo } from "react";
import SchoolLogo from "./SchoolLogo.jsx";
import { GOLD, CONFERENCE_REASONS, CONFERENCE_TZ } from "../constants.js";
import { listConferenceTeachers, listOpenConferenceSlots, bookConference, cancelConference, sendConferenceConfirmation } from "../supabase.js";

// Public page at /conferences — no sign-in. Parents pick a teacher, pick an
// open time, and leave their details. A teacher's direct link is
// /conferences?teacher=<email>; a cancel link is /conferences?cancel=<token>.

function fmtDay(iso) {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: CONFERENCE_TZ, weekday: "long", month: "long", day: "numeric" });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: CONFERENCE_TZ, hour: "numeric", minute: "2-digit" });
}

const EMPTY_FORM = { parentName: "", parentEmail: "", parentPhone: "", studentName: "", reason: "check_in", notes: "" };

export default function ParentConferences() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const cancelToken = params.get("cancel");

  const [teachers, setTeachers] = useState(null);
  const [teacher, setTeacher] = useState(params.get("teacher")?.toLowerCase() || "");
  const [slots, setSlots] = useState(null);
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [booked, setBooked] = useState(null); // { slot, teacherName, token, email, emailed }
  const [cancelState, setCancelState] = useState(cancelToken ? "idle" : null);

  useEffect(() => { if (!cancelToken) listConferenceTeachers().then(setTeachers); }, [cancelToken]);

  useEffect(() => {
    setSlot(null);
    setSlots(null);
    if (!teacher) return;
    listOpenConferenceSlots(teacher).then(setSlots);
  }, [teacher]);

  const teacherName = teachers?.find(t => t.teacher_email === teacher)?.teacher_name || teacher;

  const byDay = useMemo(() => {
    const m = new Map();
    (slots || []).forEach(s => {
      const d = fmtDay(s.starts_at);
      if (!m.has(d)) m.set(d, []);
      m.get(d).push(s);
    });
    return [...m.entries()];
  }, [slots]);

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    setErr("");
    if (!form.parentEmail.trim() && !form.parentPhone.trim()) {
      setErr("Please leave an email or phone number so the teacher can reach you.");
      return;
    }
    setSubmitting(true);
    const res = await bookConference({ ...form, slotId: slot.id });
    setSubmitting(false);
    if (!res.ok) {
      setErr(res.error);
      listOpenConferenceSlots(teacher).then(setSlots);
      return;
    }
    const email = form.parentEmail.trim();
    setBooked({ slot, teacherName, token: res.token, email, emailed: null });
    if (email) {
      sendConferenceConfirmation(res.token).then(r =>
        setBooked(b => (b && b.token === res.token ? { ...b, emailed: !!r?.sent } : b)));
    }
    setForm(f => ({ ...EMPTY_FORM, parentName: f.parentName, parentEmail: f.parentEmail, parentPhone: f.parentPhone }));
    setSlot(null);
  }

  async function doCancel() {
    setCancelState("working");
    setCancelState(await cancelConference(cancelToken) ? "done" : "failed");
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const cancelUrl = booked ? `${window.location.origin}/conferences?cancel=${booked.token}` : "";

  return (
    <div className="app-shell app-backdrop" style={{ minHeight: "100vh" }}>
      <main style={{ maxWidth: 680, width: "100%", margin: "0 auto", padding: "1.5rem 1rem 3rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <header style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <SchoolLogo size={44} />
          <div>
            <div style={{ color: GOLD, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "0.8rem" }}>James A. Garfield</div>
            <h1 className="page-title" style={{ margin: 0 }}>Parent-Teacher Conferences</h1>
          </div>
        </header>

        {cancelState !== null ? (
          <div className="card">
            <div className="section-title">Cancel a Conference</div>
            {cancelState === "done" ? (
              <p>Your conference has been cancelled and the time is open again. <a href="/conferences" style={{ color: GOLD }}>Book a different time</a>.</p>
            ) : cancelState === "failed" ? (
              <p className="text-red">We couldn't find that booking. It may already be cancelled or already past. Contact the teacher directly if you need help.</p>
            ) : (
              <>
                <p className="text-muted" style={{ marginBottom: "1rem" }}>This will free up your time slot so another family can use it.</p>
                <button className="btn btn-danger" onClick={doCancel} disabled={cancelState === "working"}>
                  {cancelState === "working" ? "Cancelling…" : "Yes, cancel my conference"}
                </button>
              </>
            )}
          </div>
        ) : booked ? (
          <div className="card card-gold">
            <div className="section-title section-title-gold">You're booked ✓</div>
            <p style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.25rem" }}>{booked.teacherName}</p>
            <p style={{ marginBottom: "0.25rem" }}>{fmtDay(booked.slot.starts_at)} at {fmtTime(booked.slot.starts_at)} ({booked.slot.duration_min} min)</p>
            {booked.slot.location && <p className="text-muted">{booked.slot.location}</p>}
            <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: "1rem" }}>
              {booked.emailed
                ? <>A confirmation was emailed to <strong>{booked.email}</strong> with a link to cancel if plans change. You can also cancel here:</>
                : <>Take a screenshot of this page. If you need to cancel, use this link:</>}
            </p>
            <a href={cancelUrl} style={{ color: GOLD, fontSize: "0.8rem", wordBreak: "break-all" }}>{cancelUrl}</a>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => { setBooked(null); setTeacher(""); listConferenceTeachers().then(setTeachers); }}>
                Book with another teacher
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="card">
              <div className="section-title">1. Choose a teacher</div>
              {teachers === null ? (
                <p className="text-muted">Loading…</p>
              ) : teachers.length === 0 ? (
                <p className="text-muted">No teachers have open conference times right now. Please check back later.</p>
              ) : (
                <select value={teacher} onChange={e => setTeacher(e.target.value)} style={{ width: "100%" }}>
                  <option value="">Select a teacher…</option>
                  {teachers.map(t => (
                    <option key={t.teacher_email} value={t.teacher_email}>{t.teacher_name} ({t.open_slots} open)</option>
                  ))}
                  {teacher && !teachers.some(t => t.teacher_email === teacher) && <option value={teacher}>{teacher}</option>}
                </select>
              )}
            </div>

            {teacher && (
              <div className="card">
                <div className="section-title">2. Pick a time</div>
                {slots === null ? (
                  <p className="text-muted">Loading…</p>
                ) : slots.length === 0 ? (
                  <p className="text-muted">This teacher has no open times left.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {byDay.map(([day, list]) => (
                      <div key={day}>
                        <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>{day}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                          {list.map(s => (
                            <button key={s.id} type="button" onClick={() => setSlot(s)}
                              className={`btn btn-sm ${slot?.id === s.id ? "btn-primary" : "btn-ghost"}`}>
                              {fmtTime(s.starts_at)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {slot && (
              <form className="card" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className="section-title" style={{ marginBottom: 0 }}>3. Your information</div>
                <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                  {teacherName} · {fmtDay(slot.starts_at)} at {fmtTime(slot.starts_at)}{slot.location ? ` · ${slot.location}` : ""}
                </div>
                <input required maxLength={100} placeholder="Your name *" value={form.parentName} onChange={set("parentName")} />
                <input required maxLength={100} placeholder="Student's name *" value={form.studentName} onChange={set("studentName")} />
                <input type="email" maxLength={200} placeholder="Email" value={form.parentEmail} onChange={set("parentEmail")} />
                <input type="tel" maxLength={40} placeholder="Phone" value={form.parentPhone} onChange={set("parentPhone")} />
                <div>
                  <div style={{ fontSize: "0.85rem", marginBottom: "0.4rem" }}>Reason for the conference</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {CONFERENCE_REASONS.map(r => (
                      <button key={r.key} type="button" onClick={() => setForm(f => ({ ...f, reason: r.key }))}
                        className={`btn btn-sm ${form.reason === r.key ? "btn-primary" : "btn-ghost"}`}>{r.label}</button>
                    ))}
                  </div>
                </div>
                <textarea maxLength={1000} rows={3} placeholder="Anything you'd like the teacher to know ahead of time? (optional)" value={form.notes} onChange={set("notes")} />
                {err && <p className="text-red" style={{ fontSize: "0.85rem" }}>{err}</p>}
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Booking…" : "Book this time"}
                </button>
                <p className="text-muted" style={{ fontSize: "0.75rem" }}>
                  Your information is only shared with the teacher you're booking with.
                </p>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
