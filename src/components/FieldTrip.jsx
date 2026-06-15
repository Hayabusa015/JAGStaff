import { useState } from "react";
import { useFieldTrips } from "../supabase.js";
import { openGmailCompose } from "../email.js";

const blank = { destination: "", date: "", depart: "", returnTime: "", grade: "", students: "", buses: "No", sub: "No", chaperones: "" };

function buildBriefing(form, user) {
  const subject = `[FIELD TRIP REQUEST] ${form.destination.trim()} — ${form.date}`;
  const body = [
    `FIELD TRIP REQUEST — James A. Garfield High School`,
    ``,
    `Submitted by: ${user?.name || "Staff"}${user?.email ? ` (${user.email})` : ""}`,
    `Destination:  ${form.destination.trim()}`,
    `Date:         ${form.date}`,
    `Departure:    ${form.depart || "—"}`,
    `Return:       ${form.returnTime || "—"}`,
    `Grade/Class:  ${form.grade || "—"}`,
    `Est. students: ${form.students || "—"}`,
    `Buses needed: ${form.buses}`,
    `Sub required: ${form.sub}`,
    `Chaperones:   ${form.chaperones || "—"}`,
    ``,
    `— Sent from the JAG Staff Portal`,
  ].join("\n");
  return { subject, body };
}

export default function FieldTrip({ user }) {
  const { trips, addTrip } = useFieldTrips(user?.email);
  const [form, setForm] = useState(blank);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!form.destination.trim() || !form.date) { setErr("Destination and date are required."); return; }
    addTrip(form);
    const { subject, body } = buildBriefing(form, user);
    // Recipient left blank — the teacher adds who it goes to in Gmail.
    openGmailCompose({ subject, body });
    setSubmitted(true);
  }

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <div style={{ fontSize: "3rem" }}>✅</div>
      <h2 style={{ marginTop: "1rem", fontWeight: 800 }}>FIELD TRIP SAVED</h2>
      <p className="text-muted mt1">
        A Gmail compose window opened with the briefing pre-filled.<br />
        Add the recipient(s) and hit send to notify them.
      </p>
      <div className="flex gap1 mt2" style={{ justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => openGmailCompose(buildBriefing(form, user))}>
          ↻ Reopen Email
        </button>
        <button className="btn btn-primary" onClick={() => { setForm(blank); setSubmitted(false); }}>New Submission</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb2">
        <h2 style={{ fontWeight: 800, fontSize: "1.1rem" }}>Field Trip Submission</h2>
      </div>

      <div className="card" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", marginBottom: "1.25rem" }}>
        <span style={{ fontWeight: 600, color: "#92700a" }}>ℹ Submitting saves the request and opens a Gmail compose window with the briefing pre-filled — add the recipient(s) and send.</span>
      </div>

      <div className="card">
        <form onSubmit={submit}>
          <div className="grid2 mb1">
            <div>
              <label>Destination *</label>
              <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="e.g. Cleveland Museum of Art" />
            </div>
            <div>
              <label>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="grid2 mb1">
            <div>
              <label>Departure Time</label>
              <input type="time" value={form.depart} onChange={e => setForm(f => ({ ...f, depart: e.target.value }))} />
            </div>
            <div>
              <label>Return Time</label>
              <input type="time" value={form.returnTime} onChange={e => setForm(f => ({ ...f, returnTime: e.target.value }))} />
            </div>
          </div>
          <div className="grid2 mb1">
            <div>
              <label>Grade / Class Name</label>
              <input value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder="e.g. 10th Grade Biology" />
            </div>
            <div>
              <label>Estimated Student Count</label>
              <input type="number" min={1} value={form.students} onChange={e => setForm(f => ({ ...f, students: e.target.value }))} placeholder="e.g. 24" />
            </div>
          </div>
          <div className="grid2 mb1">
            <div>
              <label>Transportation / Buses Needed?</label>
              <select value={form.buses} onChange={e => setForm(f => ({ ...f, buses: e.target.value }))}>
                <option>No</option><option>Yes</option>
              </select>
            </div>
            <div>
              <label>Substitute Teacher Required?</label>
              <select value={form.sub} onChange={e => setForm(f => ({ ...f, sub: e.target.value }))}>
                <option>No</option><option>Yes</option>
              </select>
            </div>
          </div>
          <div className="mb1">
            <label>Chaperone List (comma-separated)</label>
            <textarea rows={2} value={form.chaperones} onChange={e => setForm(f => ({ ...f, chaperones: e.target.value }))} placeholder="Mrs. Smith, Mr. Jones…" />
          </div>
          {err && <p className="text-red mb1" style={{ fontSize: "0.8rem" }}>{err}</p>}
          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: "center", marginTop: "0.5rem" }}>
            Submit Field Trip → Notify All
          </button>
        </form>
      </div>

      {trips.length > 0 && (
        <div className="card mt2">
          <div className="section-title">My Recent Submissions</div>
          {trips.map(t => {
            const d = t.trip_date ? new Date(t.trip_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
            return (
              <div key={t.id} className="flex items-center justify-between" style={{ padding: "0.55rem 0", borderBottom: "1px solid rgba(200,200,200,0.2)" }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{t.destination}</span>
                  <div className="text-muted mt1">
                    {d}{t.grade ? ` · ${t.grade}` : ""}{t.student_count ? ` · ${t.student_count} students` : ""}
                    {t.buses ? " · 🚌 Buses" : ""}{t.needs_sub ? " · Sub needed" : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
