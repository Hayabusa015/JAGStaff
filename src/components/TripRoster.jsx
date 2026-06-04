import { useState } from "react";

const TRIP_TYPES = ["Field Trip", "Early Release", "Athletic Event", "Competition"];
const blank = { type: "Field Trip", title: "", teacher: "", date: "", depart: "", returnTime: "", notes: "", selectedIds: [], manual: "" };

export default function TripRoster({ tripRosters, setTripRosters, students }) {
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");

  function toggleStu(id) {
    setForm(f => ({
      ...f,
      selectedIds: f.selectedIds.includes(id) ? f.selectedIds.filter(x => x !== id) : [...f.selectedIds, id],
    }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.date) { setErr("Title and date are required."); return; }
    const fromRoster = students.filter(s => form.selectedIds.includes(s.id)).map(s => ({ name: `${s.firstName} ${s.lastName}`, grade: s.grade }));
    const fromManual = form.manual.split("\n").map(l => l.trim()).filter(Boolean).map(n => ({ name: n, grade: "" }));
    const roster = [...fromRoster, ...fromManual];
    setTripRosters(t => [...t, {
      id: Date.now().toString(),
      type: form.type, title: form.title.trim(),
      teacher: form.teacher.trim(), date: form.date,
      depart: form.depart, returnTime: form.returnTime,
      notes: form.notes.trim(), students: roster,
    }]);
    setForm(blank);
    setErr("");
  }

  function remove(id) { setTripRosters(t => t.filter(x => x.id !== id)); }

  return (
    <div>
      <div className="flex items-center justify-between mb2">
        <h2 style={{ fontWeight: 800, fontSize: "1.1rem" }}>Trip Rosters &amp; Early Releases</h2>
        <span className="tag tag-gold">{tripRosters.length} rosters</span>
      </div>

      <div className="card mb2">
        <div className="section-title">Create Roster</div>
        <form onSubmit={submit}>
          <div className="grid2 mb1">
            <div>
              <label>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TRIP_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>Event / Destination *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Varsity Golf @ Pine Hills" />
            </div>
          </div>
          <div className="grid2 mb1">
            <div>
              <label>Posted By</label>
              <input value={form.teacher} onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))} placeholder="Coach / Teacher name" />
            </div>
            <div>
              <label>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="grid2 mb1">
            <div>
              <label>Leaving</label>
              <input type="time" value={form.depart} onChange={e => setForm(f => ({ ...f, depart: e.target.value }))} />
            </div>
            {form.type !== "Early Release" && (
              <div>
                <label>Returning</label>
                <input type="time" value={form.returnTime} onChange={e => setForm(f => ({ ...f, returnTime: e.target.value }))} />
              </div>
            )}
          </div>

          {students.length > 0 && (
            <div className="mb1">
              <label>Select Students from Roster</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0.5rem", border: "1px solid rgba(200,200,200,0.4)", borderRadius: "7px", maxHeight: "120px", overflowY: "auto" }}>
                {students.map(s => (
                  <button
                    type="button" key={s.id}
                    className={`btn btn-sm ${form.selectedIds.includes(s.id) ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => toggleStu(s.id)}
                  >
                    {s.firstName} {s.lastName}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb1">
            <label>Additional Students (one per line)</label>
            <textarea rows={3} value={form.manual} onChange={e => setForm(f => ({ ...f, manual: e.target.value }))} placeholder="Student Name&#10;Another Student" />
          </div>
          <div className="mb1">
            <label>Notes</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Transportation, chaperones, etc." />
          </div>
          {err && <p className="text-red mb1" style={{ fontSize: "0.8rem" }}>{err}</p>}
          <button type="submit" className="btn btn-primary">+ Create Roster</button>
        </form>
      </div>

      {tripRosters.map(trip => {
        const [open, setOpen] = useState(false);
        const d = trip.date ? new Date(trip.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
        return (
          <div key={trip.id} className="card mb1">
            <div className="flex items-center justify-between">
              <div>
                <span className="tag tag-amber" style={{ marginRight: "0.4rem" }}>{trip.type}</span>
                <span style={{ fontWeight: 700 }}>{trip.title}</span>
              </div>
              <div className="flex gap1">
                <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>{open ? "▲ Hide" : "▼ Show"} Roster</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(trip.id)}>✕</button>
              </div>
            </div>
            <div className="text-muted mt1">{trip.teacher}{trip.teacher ? " · " : ""}{d}{trip.depart ? ` · ${trip.depart}${trip.returnTime ? `–${trip.returnTime}` : ""}` : ""}</div>
            {trip.notes && <div className="text-muted">{trip.notes}</div>}
            {open && (
              <div className="mt1">
                {trip.students.length === 0 && <p className="text-muted">No students listed.</p>}
                <ul style={{ paddingLeft: "1.25rem" }}>
                  {trip.students.map((s, i) => (
                    <li key={i} style={{ fontSize: "0.82rem", marginBottom: "0.2rem" }}>
                      {s.name}{s.grade ? <span className="tag tag-amber" style={{ marginLeft: "0.4rem" }}>{s.grade}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
