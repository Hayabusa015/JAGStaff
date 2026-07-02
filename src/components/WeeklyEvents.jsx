import { useState } from "react";
import { EVENT_TYPES } from "../constants.js";

const blank = { type: "Fire Drill", title: "", date: "", time: "", details: "" };

export default function WeeklyEvents({ weeklyEvents, addEvent, removeEvent }) {
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");

  function add(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.date) { setErr("Title and date are required."); return; }
    addEvent({ ...form, title: form.title.trim() });
    setForm(blank);
    setErr("");
  }

  function remove(id) {
    removeEvent(id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb2">
        <h2 className="page-title">Weekly Events Manager</h2>
        <span className="tag tag-gold">{weeklyEvents.length} events</span>
      </div>

      <div className="card mb2">
        <div className="section-title">Add Event</div>
        <form onSubmit={add}>
          <div className="grid2 mb1">
            <div>
              <label>Event Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Fire Drill — East Wing" />
            </div>
          </div>
          <div className="grid2 mb1">
            <div>
              <label>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label>Time (optional)</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>
          <div className="mb1">
            <label>Details (optional)</label>
            <textarea rows={2} value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} placeholder="Any additional notes for staff…" />
          </div>
          {err && <p className="text-red mb1" style={{ fontSize: "0.8rem" }}>{err}</p>}
          <button type="submit" className="btn btn-primary">+ Add Event</button>
        </form>
      </div>

      <div className="card">
        <div className="section-title">Current Week Events</div>
        {weeklyEvents.length === 0 && <p className="text-muted">No events yet.</p>}
        {weeklyEvents.map(ev => {
          const tagMap = { "Fire Drill": "tag-red", "State Test": "tag-blue", "ACT": "tag-blue", "Field Trip": "tag-amber" };
          const cls = tagMap[ev.type] || "tag-gold";
          const d = ev.date ? new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
          return (
            <div key={ev.id} className="flex items-center justify-between" style={{ padding: "0.65rem 0", borderBottom: "1px solid rgba(200,200,200,0.2)" }}>
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap1">
                  <span className={`tag ${cls}`}>{ev.type}</span>
                  <span style={{ fontWeight: 600 }}>{ev.title}</span>
                </div>
                <div className="text-muted mt1">{d}{ev.time ? ` · ${ev.time}` : ""}{ev.details ? ` · ${ev.details}` : ""}</div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => remove(ev.id)}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
