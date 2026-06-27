import { useState } from "react";
import { GOLD } from "../constants.js";
import { PERIOD_LABELS } from "./gradebook-constants.js";

// `creating` forces create-mode labels even when `initial` is prefilled (duplicates).
export default function AssignmentForm({ initial, categories, period, onSave, onClose, creating, sections = [], defaultSection = null }) {
  const isEdit = !!initial && !creating;
  const [form, setForm] = useState(initial || {
    name: "", category: categories[0]?.name || "Tests", grading_period: period,
    max_points: 100, due_date: "", description: "", extra_credit: false,
    rubric: [],
  });
  const [rubricMode, setRubricMode] = useState(!!(initial?.rubric?.length));

  // selectedSections: [] = All Classes; [...names] = specific sections
  const [selectedSections, setSelectedSections] = useState(() => {
    if (initial?.section) return [initial.section];
    if (defaultSection) return [defaultSection];
    return [];
  });

  function toggleSection(sec) {
    setSelectedSections(prev =>
      prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
    );
  }

  function updateRubric(i, key, val) {
    setForm(f => ({ ...f, rubric: f.rubric.map((r, idx) => idx === i ? { ...r, [key]: val } : r) }));
  }
  const rubricSum = (form.rubric || []).reduce((s, c) => s + (Number(c.max_points) || 0), 0);

  const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.35rem 0.6rem", color: "#fff", fontSize: "0.82rem", outline: "none" };

  return (
    <div className="card" style={{ border: `1px solid ${GOLD}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          {isEdit ? "Edit Assignment" : creating ? "Duplicate Assignment" : "New Assignment"}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Assignment Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ ...inp, width: "100%", boxSizing: "border-box" }} placeholder="e.g. Chapter 5 Test" />
        </div>
        <div>
          <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Category</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inp, width: "100%" }}>
            {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Max Points</label>
          <input type="number" min={1} value={form.max_points} onChange={e => setForm(f => ({ ...f, max_points: Number(e.target.value) }))} style={{ ...inp, width: "100%" }} />
        </div>
        <div>
          <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Grading Period</label>
          <select value={form.grading_period} onChange={e => setForm(f => ({ ...f, grading_period: Number(e.target.value) }))} style={{ ...inp, width: "100%" }}>
            {[1,2,3,4,5,6].map(p => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Due Date</label>
          <input type="date" value={form.due_date || ""} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={{ ...inp, width: "100%" }} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Description (optional)</label>
          <textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inp, width: "100%", boxSizing: "border-box", minHeight: 52, resize: "vertical" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "1.25rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", cursor: "pointer" }}>
          <input type="checkbox" checked={form.extra_credit} onChange={e => setForm(f => ({ ...f, extra_credit: e.target.checked }))} /> Extra Credit
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", cursor: "pointer" }}>
          <input type="checkbox" checked={rubricMode} onChange={e => { setRubricMode(e.target.checked); if (!e.target.checked) setForm(f => ({ ...f, rubric: [] })); }} /> Use Rubric
        </label>
      </div>

      {rubricMode && (
        <div style={{ marginBottom: "0.75rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "0.75rem 1rem" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem" }}>
            Rubric Criteria <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>— total: {rubricSum} pts</span>
          </div>
          {(form.rubric || []).map((c, i) => (
            <div key={c.id} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
              <input value={c.criterion} onChange={e => updateRubric(i, "criterion", e.target.value)} placeholder="Criterion name" style={{ ...inp, flex: "1 1 140px" }} />
              <input value={c.description || ""} onChange={e => updateRubric(i, "description", e.target.value)} placeholder="Description (optional)" style={{ ...inp, flex: "2 1 200px" }} />
              <input type="number" min={1} value={c.max_points} onChange={e => updateRubric(i, "max_points", Number(e.target.value))} style={{ ...inp, width: 60 }} />
              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>pts</span>
              <button onClick={() => setForm(f => ({ ...f, rubric: f.rubric.filter((_, j) => j !== i) }))} style={{ ...inp, color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", padding: "0.25rem 0.5rem" }}>✕</button>
            </div>
          ))}
          <button
            onClick={() => setForm(f => ({ ...f, rubric: [...(f.rubric || []), { id: `r-${Date.now()}`, criterion: "", description: "", max_points: 10 }] }))}
            style={{ ...inp, cursor: "pointer", marginTop: "0.25rem" }}
          >
            + Add Criterion
          </button>
          {form.rubric?.length > 0 && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
              Max points will be set to rubric total ({rubricSum}) on save.
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "0.4rem" }}>
          {isEdit ? "Class" : "Add to Classes"}
        </label>
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setSelectedSections([])}
            style={{
              background: selectedSections.length === 0 ? GOLD : "rgba(255,255,255,0.06)",
              border: selectedSections.length === 0 ? "none" : "1px solid rgba(255,255,255,0.12)",
              color: selectedSections.length === 0 ? "#000" : "rgba(255,255,255,0.6)",
              borderRadius: 6, padding: "0.25rem 0.65rem", cursor: "pointer", fontWeight: 700, fontSize: "0.76rem",
            }}
          >
            All Classes
          </button>
          {sections.map(sec => {
            const active = selectedSections.includes(sec);
            return (
              <button
                key={sec}
                type="button"
                onClick={() => toggleSection(sec)}
                style={{
                  background: active ? GOLD : "rgba(255,255,255,0.06)",
                  border: active ? "none" : "1px solid rgba(255,255,255,0.12)",
                  color: active ? "#000" : "rgba(255,255,255,0.6)",
                  borderRadius: 6, padding: "0.25rem 0.65rem", cursor: "pointer", fontWeight: active ? 700 : 400, fontSize: "0.76rem",
                }}
              >
                {sec}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", borderRadius: 6, padding: "0.4rem 1rem", cursor: "pointer" }}>Cancel</button>
        <button
          disabled={!form.name}
          onClick={() => {
            const final = { ...form };
            if (rubricMode && final.rubric?.length) final.max_points = rubricSum;
            onSave({ ...final, selectedSections });
          }}
          style={{ background: form.name ? GOLD : "rgba(255,255,255,0.1)", border: "none", color: form.name ? "#000" : "rgba(255,255,255,0.3)", fontWeight: 700, borderRadius: 6, padding: "0.4rem 1.25rem", cursor: form.name ? "pointer" : "not-allowed" }}
        >
          {isEdit ? "Save Changes" : "Add Assignment"}
        </button>
      </div>
    </div>
  );
}
