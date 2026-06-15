import { useState } from "react";
import { GOLD } from "../constants.js";
import { useCeu } from "../supabase.js";

const TOTAL_HOURS = 180;
const TOTAL_CREDITS = 6;
const REIMB_MAX = 1500;

export default function CeuTracker({ user }) {
  const { entries: history, reimb, addEntry, removeEntry, addReimb: addReimbEntry, removeReimb } = useCeu(user?.email);
  const [newCeu, setNewCeu] = useState({ name: "", hours: "" });
  const [expiry] = useState("2026-06-30");
  const [reimbForm, setReimbForm] = useState({ name: "", cost: "" });
  const [reimbErr, setReimbErr] = useState("");

  const totalHours = history.reduce((s, c) => s + Number(c.hours), 0);
  const pct = Math.min(100, Math.round((totalHours / TOTAL_HOURS) * 100));
  const credits = (totalHours / 30).toFixed(1);
  const totalReimb = reimb.reduce((s, r) => s + Number(r.cost), 0);

  const daysLeft = Math.max(0, Math.round((new Date(expiry) - new Date()) / 86400000));

  function addHours(e) {
    e.preventDefault();
    if (!newCeu.name.trim() || !newCeu.hours || Number(newCeu.hours) <= 0) return;
    addEntry({ name: newCeu.name.trim(), hours: Number(newCeu.hours) });
    setNewCeu({ name: "", hours: "" });
  }

  function addReimb(e) {
    e.preventDefault();
    const cost = Number(reimbForm.cost);
    if (!reimbForm.name.trim() || cost <= 0) { setReimbErr("Course name and valid cost required."); return; }
    if (totalReimb + cost > REIMB_MAX) { setReimbErr(`Exceeds $${REIMB_MAX} limit.`); return; }
    addReimbEntry({ name: reimbForm.name.trim(), cost });
    setReimbForm({ name: "", cost: "" });
    setReimbErr("");
  }

  const reimbPct = Math.min(100, Math.round((totalReimb / REIMB_MAX) * 100));

  return (
    <div>
      <div className="flex items-center justify-between mb2">
        <h2 style={{ fontWeight: 800, fontSize: "1.1rem" }}>CEU Tracker &amp; License Renewal</h2>
      </div>

      {/* Progress */}
      <div className="card mb2">
        <div className="section-title">License Renewal Progress</div>
        <div className="flex items-center justify-between mb1">
          <span style={{ fontWeight: 700, fontSize: "1.5rem", color: GOLD }}>{totalHours} <span style={{ fontSize: "0.9rem", color: "rgba(0,0,0,0.45)" }}>/ {TOTAL_HOURS} hours</span></span>
          <span style={{ fontWeight: 700 }}>{pct}% complete</span>
        </div>
        <div className="progress-track mb1">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-muted">{credits} / {TOTAL_CREDITS} credits earned</div>
      </div>

      {/* Stats */}
      <div className="grid3 mb2">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="stat-num" style={{ color: daysLeft < 30 ? "#dc2626" : GOLD }}>{daysLeft}</div>
          <div className="stat-label">Days Until Expiry</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="stat-num">{Math.max(0, TOTAL_HOURS - totalHours)}</div>
          <div className="stat-label">Hours Remaining</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="stat-num" style={{ color: GOLD }}>${(REIMB_MAX - totalReimb).toFixed(0)}</div>
          <div className="stat-label">Tuition Reimb. Left</div>
        </div>
      </div>

      <div className="grid2 mb2">
        {/* Log Hours */}
        <div className="card">
          <div className="section-title">Log CEU Hours</div>
          <form onSubmit={addHours}>
            <div className="mb1">
              <label>Course / Activity Name</label>
              <input value={newCeu.name} onChange={e => setNewCeu(f => ({ ...f, name: e.target.value }))} placeholder="e.g. ODE Reading Module" />
            </div>
            <div className="mb1">
              <label>Hours Earned</label>
              <input type="number" min="0.5" step="0.5" value={newCeu.hours} onChange={e => setNewCeu(f => ({ ...f, hours: e.target.value }))} placeholder="e.g. 15" />
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: "center" }}>Log CEU Hours</button>
          </form>
        </div>

        {/* Tuition Reimbursement */}
        <div className="card">
          <div className="section-title">Tuition Reimbursement</div>
          <div className="flex items-center justify-between mb1">
            <span className="text-muted">${totalReimb.toFixed(2)} of ${REIMB_MAX}</span>
            <span style={{ fontWeight: 700 }}>{reimbPct}%</span>
          </div>
          <div className="progress-track mb2">
            <div className="progress-fill" style={{ width: `${reimbPct}%`, background: totalReimb >= REIMB_MAX ? "#dc2626" : GOLD }} />
          </div>
          <form onSubmit={addReimb}>
            <div className="mb1">
              <label>Course Name</label>
              <input value={reimbForm.name} onChange={e => setReimbForm(f => ({ ...f, name: e.target.value }))} placeholder="Course name" />
            </div>
            <div className="mb1">
              <label>Cost ($)</label>
              <input type="number" min="1" step="0.01" value={reimbForm.cost} onChange={e => setReimbForm(f => ({ ...f, cost: e.target.value }))} placeholder="0.00" />
            </div>
            {reimbErr && <p className="text-red mb1" style={{ fontSize: "0.8rem" }}>{reimbErr}</p>}
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: "center" }}>Add Expense</button>
          </form>
        </div>
      </div>

      {/* History */}
      <div className="card mb2">
        <div className="section-title">CEU History</div>
        {history.length === 0 && <p className="text-muted">No entries yet.</p>}
        <table className="stu-table">
          <thead>
            <tr><th>Course / Activity</th><th>Hours</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {history.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td><span className="tag tag-gold">{c.hours} hrs</span></td>
                <td className="text-muted">{c.date}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-danger btn-sm" onClick={() => removeEntry(c.id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reimbursement expenses */}
      {reimb.length > 0 && (
        <div className="card mb2">
          <div className="section-title">Reimbursement Expenses</div>
          <table className="stu-table">
            <thead>
              <tr><th>Course</th><th>Cost</th><th></th></tr>
            </thead>
            <tbody>
              {reimb.map(r => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td><span className="tag tag-green">${Number(r.cost).toFixed(2)}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-danger btn-sm" onClick={() => removeReimb(r.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ohio Resources */}
      <div className="card">
        <div className="section-title">Ohio-Approved CEU Resources</div>
        {[
          { name: "ODE OHID Learn LMS", desc: "State-provided modules, standards-aligned.", price: "FREE" },
          { name: "Teacher's Learning Center", desc: "Flexible online courses accepted by Ohio.", price: "$15–$50 / course" },
          { name: "ed2go via VESi", desc: "Wide catalog of graduate-credit courses.", price: "$75–$200 / course" },
        ].map(r => (
          <div key={r.name} style={{ marginBottom: "0.6rem" }}>
            <span style={{ fontWeight: 600 }}>{r.name}</span>
            <span className="tag tag-green" style={{ marginLeft: "0.5rem" }}>{r.price}</span>
            <div className="text-muted">{r.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
