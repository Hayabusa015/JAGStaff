import { useState, useMemo } from "react";

// Add a student to the teacher's gradebook roster: either pick one who
// already exists in the shared school roster (search by name), or quick-add
// a brand-new one. Never touches any other student already on the roster.
export default function GradebookAddStudentModal({ onClose, allStudents, rosterStudentIds, sections, defaultSection, onAddExisting, onAddNew }) {
  const [tab, setTab] = useState("existing");
  const [search, setSearch] = useState("");
  const [section, setSection] = useState(defaultSection || "");
  const [busyId, setBusyId] = useState(null);
  const [newForm, setNewForm] = useState({ firstName: "", lastName: "", grade: "" });
  const [savingNew, setSavingNew] = useState(false);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStudents
      .filter(s => !rosterStudentIds.has(s.id))
      .filter(s => !q || `${s.firstName} ${s.lastName}`.toLowerCase().includes(q))
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
      .slice(0, 30);
  }, [allStudents, rosterStudentIds, search]);

  const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.4rem 0.65rem", color: "#fff", fontSize: "0.85rem", outline: "none" };

  async function addExisting(student) {
    setBusyId(student.id);
    try { await onAddExisting(student.id, section || null); } finally { setBusyId(null); }
  }

  async function submitNew(e) {
    e.preventDefault();
    if (!newForm.firstName.trim() && !newForm.lastName.trim()) return;
    setSavingNew(true);
    try {
      await onAddNew({ ...newForm, firstName: newForm.firstName.trim(), lastName: newForm.lastName.trim(), section: section || null });
      onClose();
    } finally { setSavingNew(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>Add Student to Your Roster</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: "1rem", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.9rem" }}>
          <button className={`btn btn-sm ${tab === "existing" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("existing")}>Existing Student</button>
          <button className={`btn btn-sm ${tab === "new" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("new")}>Brand New Student</button>
        </div>

        {/* Section picker, shared by both tabs */}
        <div style={{ marginBottom: "0.85rem" }}>
          <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Add to class (optional)</label>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
            <select value={sections.includes(section) ? section : ""} onChange={e => setSection(e.target.value)} style={{ ...inp }}>
              <option value="">— Unassigned —</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>or</span>
            <input value={sections.includes(section) ? "" : section} onChange={e => setSection(e.target.value)} placeholder="type a new class name" style={{ ...inp, flex: 1, minWidth: 140 }} />
          </div>
        </div>

        {tab === "existing" ? (
          <div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…" style={{ ...inp, width: "100%", boxSizing: "border-box", marginBottom: "0.6rem" }} autoFocus />
            <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              {results.length === 0 ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" }}>
                  {search ? "No matches." : "Type a name to search the school roster."}
                </div>
              ) : results.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{s.lastName}, {s.firstName}</span>
                    {s.grade && <span className="tag tag-amber" style={{ marginLeft: "0.4rem", fontSize: "0.6rem" }}>{s.grade}</span>}
                  </div>
                  <button className="btn btn-primary btn-sm" disabled={busyId === s.id} onClick={() => addExisting(s)}>
                    {busyId === s.id ? "Adding…" : "+ Add"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={submitNew}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Last Name</label>
                <input value={newForm.lastName} onChange={e => setNewForm(f => ({ ...f, lastName: e.target.value }))} style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>First Name</label>
                <input value={newForm.firstName} onChange={e => setNewForm(f => ({ ...f, firstName: e.target.value }))} style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Grade</label>
                <input value={newForm.grade} onChange={e => setNewForm(f => ({ ...f, grade: e.target.value }))} style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginBottom: "0.85rem" }}>
              This creates a new student in the school roster and adds them straight to your gradebook.
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingNew || (!newForm.firstName.trim() && !newForm.lastName.trim())}>
                {savingNew ? "Adding…" : "+ Add Student"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
