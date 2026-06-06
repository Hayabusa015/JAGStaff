import { useState, useMemo, useCallback } from "react";
import { GOLD } from "../constants.js";
import { useGradebook } from "../supabase.js";
import { useGmailSend } from "../supabase.js";
import {
  calcPeriodGrade, calcSemesterGrade, letterGrade, gradePct, gradeTier,
  effectivePoints, assignmentStats, rubricTotal, DEFAULT_SCALE,
  DEFAULT_PERIOD_WEIGHTS, letterRank,
} from "../gradebook.js";
import GradebookSettings from "./GradebookSettings.jsx";
import GradebookRubric from "./GradebookRubric.jsx";

const PERIOD_LABELS = { 1: "Period 1", 2: "Period 2", 3: "Period 3", 4: "Period 4", 5: "Midterm", 6: "Final" };
const PERIOD_KEYS   = { 5: "midterm", 6: "final" };
const TIER_COLORS   = { a: "#22c55e", b: "#84cc16", c: "#eab308", d: "#f97316", f: "#ef4444", ungraded: "rgba(255,255,255,0.15)" };

function cellColor(pct) {
  if (pct == null) return "rgba(255,255,255,0.04)";
  if (pct >= 90) return "rgba(34,197,94,0.12)";
  if (pct >= 80) return "rgba(132,204,22,0.10)";
  if (pct >= 70) return "rgba(234,179,8,0.10)";
  if (pct >= 60) return "rgba(249,115,22,0.10)";
  return "rgba(239,68,68,0.12)";
}
function pctText(pct) { return pct == null ? "—" : `${Math.round(pct)}%`; }

// ── Assignment Form ──────────────────────────────────────────────────────────
function AssignmentForm({ initial, categories, period, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: "", category: categories[0]?.name || "Tests", grading_period: period,
    max_points: 100, due_date: "", description: "", extra_credit: false,
    rubric: [],
  });
  const [rubricMode, setRubricMode] = useState(!!(initial?.rubric?.length));
  const [retakeMode, setRetakeMode] = useState(false);

  function updateRubric(i, key, val) {
    setForm(f => ({ ...f, rubric: f.rubric.map((r, idx) => idx === i ? { ...r, [key]: val } : r) }));
  }
  const rubricTotal = (form.rubric || []).reduce((s, c) => s + (Number(c.max_points) || 0), 0);

  const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.35rem 0.6rem", color: "#fff", fontSize: "0.82rem", outline: "none" };

  return (
    <div className="card" style={{ border: `1px solid ${GOLD}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div className="section-title" style={{ marginBottom: 0 }}>{initial ? "Edit Assignment" : "New Assignment"}</div>
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
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem" }}>Rubric Criteria <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>— total: {rubricTotal} pts</span></div>
          {(form.rubric || []).map((c, i) => (
            <div key={c.id} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
              <input value={c.criterion} onChange={e => updateRubric(i, "criterion", e.target.value)} placeholder="Criterion name" style={{ ...inp, flex: "1 1 140px" }} />
              <input value={c.description || ""} onChange={e => updateRubric(i, "description", e.target.value)} placeholder="Description (optional)" style={{ ...inp, flex: "2 1 200px" }} />
              <input type="number" min={1} value={c.max_points} onChange={e => updateRubric(i, "max_points", Number(e.target.value))} style={{ ...inp, width: 60 }} />
              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>pts</span>
              <button onClick={() => setForm(f => ({ ...f, rubric: f.rubric.filter((_, j) => j !== i) }))} style={{ ...inp, color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", padding: "0.25rem 0.5rem" }}>✕</button>
            </div>
          ))}
          <button onClick={() => setForm(f => ({ ...f, rubric: [...(f.rubric || []), { id: `r-${Date.now()}`, criterion: "", description: "", max_points: 10 }] }))} style={{ ...inp, cursor: "pointer", marginTop: "0.25rem" }}>+ Add Criterion</button>
          {form.rubric?.length > 0 && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
              Max points will be set to rubric total ({rubricTotal}) on save.
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", borderRadius: 6, padding: "0.4rem 1rem", cursor: "pointer" }}>Cancel</button>
        <button disabled={!form.name} onClick={() => {
          const final = { ...form };
          if (rubricMode && final.rubric?.length) final.max_points = rubricTotal;
          onSave(final);
        }} style={{ background: form.name ? GOLD : "rgba(255,255,255,0.1)", border: "none", color: form.name ? "#000" : "rgba(255,255,255,0.3)", fontWeight: 700, borderRadius: 6, padding: "0.4rem 1.25rem", cursor: form.name ? "pointer" : "not-allowed" }}>
          {initial ? "Save Changes" : "Add Assignment"}
        </button>
      </div>
    </div>
  );
}

// ── Grade Cell ───────────────────────────────────────────────────────────────
function GradeCell({ assignment, grade, student, onSave, onOpenRubric }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  const pts = effectivePoints(grade, assignment);
  const pct = gradePct(grade, assignment);
  const hasRubric = !!(assignment?.rubric?.length);

  function open() {
    setDraft({
      points_earned: grade?.points_earned ?? "",
      excused: grade?.excused || false,
      missing: grade?.missing || false,
      retake_score: grade?.retake_score ?? "",
      retake_policy: grade?.retake_policy || "higher",
      notes: grade?.notes || "",
    });
    setEditing(true);
  }

  async function commit() {
    const d = { ...draft };
    if (d.points_earned === "") d.points_earned = null;
    if (d.retake_score === "") d.retake_score = null;
    if (d.points_earned != null) d.points_earned = Number(d.points_earned);
    if (d.retake_score != null) d.retake_score = Number(d.retake_score);
    await onSave(d);
    setEditing(false);
  }

  const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, padding: "0.25rem 0.45rem", color: "#fff", fontSize: "0.78rem", outline: "none" };

  if (editing) return (
    <td style={{ padding: "0.3rem", minWidth: 110, verticalAlign: "top" }}>
      <div style={{ background: "#1a1400", border: `1px solid ${GOLD}`, borderRadius: 7, padding: "0.5rem", zIndex: 20, position: "relative" }}>
        {hasRubric ? (
          <button onClick={() => { setEditing(false); onOpenRubric(); }} style={{ ...inp, cursor: "pointer", width: "100%", marginBottom: "0.4rem", color: GOLD, border: `1px solid rgba(245,192,37,0.3)` }}>📋 Open Rubric</button>
        ) : (
          <input type="number" min={0} max={assignment.max_points} value={draft.points_earned} onChange={e => setDraft(d => ({ ...d, points_earned: e.target.value }))} placeholder={`/ ${assignment.max_points}`} style={{ ...inp, width: "100%", boxSizing: "border-box", marginBottom: "0.4rem" }} autoFocus />
        )}
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
          <label style={{ fontSize: "0.68rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}><input type="checkbox" checked={draft.excused} onChange={e => setDraft(d => ({ ...d, excused: e.target.checked }))} /> Excused</label>
          <label style={{ fontSize: "0.68rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}><input type="checkbox" checked={draft.missing} onChange={e => setDraft(d => ({ ...d, missing: e.target.checked }))} /> Missing</label>
        </div>
        <div style={{ marginBottom: "0.4rem" }}>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Retake score</div>
          <input type="number" min={0} max={assignment.max_points} value={draft.retake_score} onChange={e => setDraft(d => ({ ...d, retake_score: e.target.value }))} placeholder="—" style={{ ...inp, width: "100%", boxSizing: "border-box", marginBottom: "0.25rem" }} />
          <select value={draft.retake_policy} onChange={e => setDraft(d => ({ ...d, retake_policy: e.target.value }))} style={{ ...inp, width: "100%", fontSize: "0.68rem" }}>
            <option value="higher">Take Higher Score</option>
            <option value="average">Average Scores</option>
          </select>
        </div>
        <input value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Notes…" style={{ ...inp, width: "100%", boxSizing: "border-box", marginBottom: "0.4rem" }} />
        <div style={{ display: "flex", gap: "0.3rem" }}>
          <button onClick={() => setEditing(false)} style={{ ...inp, cursor: "pointer", flex: 1 }}>✕</button>
          <button onClick={commit} style={{ background: GOLD, border: "none", color: "#000", fontWeight: 700, borderRadius: 5, padding: "0.25rem 0.6rem", cursor: "pointer", flex: 2 }}>Save</button>
        </div>
      </div>
    </td>
  );

  return (
    <td onClick={open} style={{
      padding: "0.4rem 0.5rem", cursor: "pointer", textAlign: "center",
      background: cellColor(pct), minWidth: 72, transition: "background 0.15s",
    }}>
      {grade?.excused ? (
        <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>EXC</span>
      ) : grade?.missing ? (
        <span style={{ fontSize: "0.7rem", color: "#f97316" }}>MIS</span>
      ) : pts != null ? (
        <>
          <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{pts}</div>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)" }}>{Math.round(pct)}%</div>
          {grade?.retake_score != null && <div style={{ fontSize: "0.6rem", color: "#60a5fa" }}>↩ retake</div>}
          {hasRubric && <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)" }}>📋</div>}
        </>
      ) : (
        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.2)" }}>—</span>
      )}
    </td>
  );
}

// ── Reports sub-tab ──────────────────────────────────────────────────────────
function GradebookReports({ students, assignments, grades, profiles, settings, user }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [viewPeriod, setViewPeriod] = useState(1);
  const { sendEmail, requestGmailToken } = useGmailSend();

  const activeProfile = profiles.find(p => p.is_active) || profiles[0];
  const categories = activeProfile?.categories || [];
  const scale = settings?.grading_scale || DEFAULT_SCALE;
  const periodWeights = settings?.period_weights || DEFAULT_PERIOD_WEIGHTS;

  useMemo(() => {
    if (!search.trim()) { setResults([]); return; }
    setResults(students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8));
  }, [search, students]);

  function studentGradeForPeriod(student, period) {
    const periodAssignments = assignments.filter(a => a.grading_period === period);
    const gradeMap = Object.fromEntries(grades.filter(g => g.student_id === student.id).map(g => [g.assignment_id, g]));
    return calcPeriodGrade(periodAssignments, gradeMap, categories);
  }

  async function emailReport(student) {
    const periodData = [1,2,3,4,5,6].map(p => {
      const { pct } = studentGradeForPeriod(student, p);
      return { label: PERIOD_LABELS[p], pct };
    });
    const semester = calcSemesterGrade(
      Object.fromEntries(periodData.map((d, i) => [PERIOD_KEYS[i+1] || (i+1), d.pct])),
      periodWeights
    );
    const body = [
      `Dear Parent/Guardian of ${student.firstName} ${student.lastName},`,
      "",
      `Here is the current grade summary for ${student.firstName}:`,
      "",
      ...periodData.filter(d => d.pct != null).map(d => `  ${d.label}: ${Math.round(d.pct)}% (${letterGrade(d.pct, scale)})`),
      semester != null ? `\n  Semester Average: ${Math.round(semester)}% (${letterGrade(semester, scale)})` : "",
      "",
      `If you have any questions, please reply to this email or contact ${user?.name || "your teacher"} at ${user?.email}.`,
      "",
      "Thank you,",
      `${user?.name || "Your Teacher"}`,
      "James A. Garfield High School",
    ].join("\n");
    try {
      const token = await requestGmailToken();
      await sendEmail(token, { to: student.parentEmail, from: user?.email, subject: `Grade Report — ${student.firstName} ${student.lastName}`, body });
    } catch {
      window.open(`mailto:${student.parentEmail}?subject=${encodeURIComponent(`Grade Report — ${student.firstName} ${student.lastName}`)}&body=${encodeURIComponent(body)}`);
    }
  }

  // Class distribution for selected period
  const periodAssignments = assignments.filter(a => a.grading_period === viewPeriod);
  const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  students.forEach(s => {
    const gradeMap = Object.fromEntries(grades.filter(g => g.student_id === s.id).map(g => [g.assignment_id, g]));
    const { pct } = calcPeriodGrade(periodAssignments, gradeMap, categories);
    if (pct == null) return;
    const l = letterGrade(pct, scale);
    const top = l[0];
    if (distribution[top] !== undefined) distribution[top]++;
  });
  const distMax = Math.max(1, ...Object.values(distribution));

  const distColors = { A: "#22c55e", B: "#84cc16", C: "#eab308", D: "#f97316", F: "#ef4444" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Student Report */}
      <div className="card">
        <div className="section-title">Student Report Card</div>
        <div style={{ position: "relative", marginBottom: selectedStudent ? "1rem" : 0 }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setSelectedStudent(null); }} placeholder="Search student…" />
          {results.length > 0 && (
            <div className="autocomplete-list">
              {results.map(s => (
                <div key={s.id} className="autocomplete-item" onClick={() => { setSelectedStudent(s); setSearch(`${s.firstName} ${s.lastName}`); setResults([]); }}>
                  {s.firstName} {s.lastName} <span className="tag tag-amber">{s.grade}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedStudent && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>{selectedStudent.firstName} {selectedStudent.lastName} <span className="tag tag-amber">{selectedStudent.grade}</span></div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {selectedStudent.parentEmail && (
                  <button onClick={() => emailReport(selectedStudent)} style={{ background: "rgba(245,192,37,0.1)", border: `1px solid rgba(245,192,37,0.3)`, color: GOLD, borderRadius: 6, padding: "0.3rem 0.85rem", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>
                    📧 Email Parent
                  </button>
                )}
                <button onClick={() => window.print()} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", borderRadius: 6, padding: "0.3rem 0.85rem", cursor: "pointer", fontSize: "0.8rem" }}>
                  🖨 Print
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.6rem", marginBottom: "0.75rem" }}>
              {[1,2,3,4,5,6].map(p => {
                const { pct, byCategory } = studentGradeForPeriod(selectedStudent, p);
                const letter = letterGrade(pct, scale);
                const tier = pct == null ? "ungraded" : pct >= 90 ? "a" : pct >= 80 ? "b" : pct >= 70 ? "c" : pct >= 60 ? "d" : "f";
                return (
                  <div key={p} style={{ background: cellColor(pct), border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8, padding: "0.7rem 0.75rem", textAlign: "center" }}>
                    <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{PERIOD_LABELS[p]}</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TIER_COLORS[tier] || "#fff", lineHeight: 1 }}>{pct != null ? letter : "—"}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{pct != null ? `${Math.round(pct)}%` : "No data"}</div>
                  </div>
                );
              })}
            </div>

            {/* Semester */}
            {(() => {
              const periodPcts = {};
              [1,2,3,4].forEach(p => { const { pct } = studentGradeForPeriod(selectedStudent, p); periodPcts[p] = pct; });
              const { pct: mp } = studentGradeForPeriod(selectedStudent, 5); periodPcts.midterm = mp;
              const { pct: fp } = studentGradeForPeriod(selectedStudent, 6); periodPcts.final = fp;
              const sem = calcSemesterGrade(periodPcts, periodWeights);
              if (sem == null) return null;
              return (
                <div style={{ background: "rgba(245,192,37,0.06)", border: `1px solid rgba(245,192,37,0.25)`, borderRadius: 8, padding: "0.65rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700 }}>Semester Average</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800, color: GOLD }}>{letterGrade(sem, scale)}</span>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>{Math.round(sem)}%</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Class Distribution */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Class Grade Distribution</div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {[1,2,3,4].map(p => (
              <button key={p} onClick={() => setViewPeriod(p)} style={{ background: viewPeriod === p ? GOLD : "rgba(255,255,255,0.06)", border: viewPeriod === p ? "none" : "1px solid rgba(255,255,255,0.12)", color: viewPeriod === p ? "#000" : "rgba(255,255,255,0.6)", borderRadius: 6, padding: "0.25rem 0.65rem", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>P{p}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "1.5rem", height: 120, paddingTop: "0.5rem" }}>
          {Object.entries(distribution).map(([letter, count]) => (
            <div key={letter} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: 4 }}>{count}</div>
              <div style={{ width: "100%", maxWidth: 48, borderRadius: "5px 5px 0 0", background: distColors[letter], height: `${Math.max(count > 0 ? 8 : 2, (count / distMax) * 100)}%`, transition: "height 0.3s" }} />
              <div style={{ marginTop: 5, fontWeight: 800, fontSize: "0.88rem", color: distColors[letter] }}>{letter}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Failing students */}
      {(() => {
        const failing = students.map(s => {
          const gradeMap = Object.fromEntries(grades.filter(g => g.student_id === s.id).map(g => [g.assignment_id, g]));
          const { pct } = calcPeriodGrade(periodAssignments, gradeMap, categories);
          return { ...s, pct };
        }).filter(s => s.pct != null && s.pct < 70).sort((a, b) => a.pct - b.pct);
        if (!failing.length) return null;
        return (
          <div className="card">
            <div className="section-title">⚠ At Risk — Period {viewPeriod}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {failing.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.45rem 0.75rem", background: s.pct < 60 ? "rgba(239,68,68,0.08)" : "rgba(249,115,22,0.07)", borderRadius: 7, border: `1px solid ${s.pct < 60 ? "rgba(239,68,68,0.25)" : "rgba(249,115,22,0.2)"}` }}>
                  <span style={{ fontWeight: 600 }}>{s.firstName} {s.lastName}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {s.parentEmail && <button onClick={() => emailReport(s)} style={{ fontSize: "0.7rem", background: "rgba(245,192,37,0.1)", border: `1px solid rgba(245,192,37,0.25)`, color: GOLD, borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer" }}>📧</button>}
                    <span className={`tag ${s.pct < 60 ? "tag-red" : "tag-amber"}`}>{Math.round(s.pct)}% {letterGrade(s.pct, scale)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Main Gradebook ───────────────────────────────────────────────────────────
export default function Gradebook({ students, user }) {
  const { assignments, grades, profiles, settings, addAssignment, updateAssignment, deleteAssignment, saveGrade, saveProfile, setActiveProfile, deleteProfile, saveSettings } = useGradebook(user?.email);
  const { requestGmailToken, sendEmail } = useGmailSend();

  const [subTab, setSubTab] = useState("grades");
  const [period, setPeriod] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [rubricState, setRubricState] = useState(null); // { assignment, student, grade }
  const [expandedAssignment, setExpandedAssignment] = useState(null);

  const activeProfile = profiles.find(p => p.is_active) || profiles[0] || null;
  const categories = activeProfile?.categories || [];
  const scale = settings?.grading_scale || DEFAULT_SCALE;
  const periodWeights = settings?.period_weights || DEFAULT_PERIOD_WEIGHTS;

  const periodAssignments = useMemo(() =>
    assignments.filter(a => a.grading_period === period)
      .sort((a, b) => {
        const ci = categories.findIndex(c => c.name === a.category);
        const cj = categories.findIndex(c => c.name === b.category);
        if (ci !== cj) return ci - cj;
        return new Date(a.created_at) - new Date(b.created_at);
      }),
    [assignments, period, categories]
  );

  const gradeMap = useMemo(() => {
    const m = {};
    grades.forEach(g => {
      if (!m[g.student_id]) m[g.student_id] = {};
      m[g.student_id][g.assignment_id] = g;
    });
    return m;
  }, [grades]);

  const sortedStudents = useMemo(() =>
    [...students].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)),
    [students]
  );

  async function handleSaveGrade(assignmentId, student, data) {
    const assignment = assignments.find(a => a.id === assignmentId);
    await saveGrade(assignmentId, student.id, `${student.firstName} ${student.lastName}`, data);

    // Auto-email parent on fail
    if (data.points_earned != null && assignment && student.parentEmail && settings?.auto_email_fail !== false) {
      const pct = (data.points_earned / assignment.max_points) * 100;
      if (pct < 60 && assignment.category !== "Homework") {
        const body = `Dear Parent/Guardian,\n\n${student.firstName} ${student.lastName} received a failing grade on "${assignment.name}" (${Math.round(pct)}%).\n\nPlease reach out if you have questions.\n\n— ${user?.name}, ${user?.email}`;
        try {
          const token = await requestGmailToken();
          await sendEmail(token, { to: student.parentEmail, from: user?.email, subject: `Failing Grade Notice — ${student.firstName} ${student.lastName}`, body });
        } catch {
          // Silently fail — teacher can email manually from Reports
        }
      }
    }
  }

  async function handleAddAssignment(data) {
    await addAssignment(data);
    setShowForm(false);
  }

  async function handleUpdateAssignment(data) {
    await updateAssignment(editingAssignment.id, data);
    setEditingAssignment(null);
  }

  const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.35rem 0.6rem", color: "#fff", fontSize: "0.82rem", outline: "none" };

  if (!activeProfile) {
    return (
      <div>
        <h2 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "1rem" }}>Gradebook</h2>
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📊</div>
          <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Set up your gradebook first</div>
          <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", marginBottom: "1.25rem" }}>Choose a grade weight profile to get started.</div>
          <button onClick={() => setSubTab("settings")} style={{ background: GOLD, border: "none", color: "#000", fontWeight: 700, borderRadius: 8, padding: "0.6rem 1.5rem", cursor: "pointer" }}>Go to Settings →</button>
        </div>
        <div style={{ marginTop: "1.5rem" }}>
          <GradebookSettings profiles={profiles} settings={settings} saveProfile={saveProfile} setActiveProfile={setActiveProfile} deleteProfile={deleteProfile} saveSettings={saveSettings} user={user} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb2">
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem" }}>Gradebook</h2>
          <div className="text-muted" style={{ fontSize: "0.82rem" }}>
            {activeProfile.name} weights · {categories.map(c => `${c.name} ${c.weight}%`).join(" · ")}
          </div>
        </div>
        {subTab === "grades" && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">+ Assignment</button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap1 mb2">
        {[{ key: "grades", label: "Grades" }, { key: "assignments", label: "Assignments" }, { key: "reports", label: "Reports" }, { key: "settings", label: "⚙ Settings" }].map(t => (
          <button key={t.key} className={`btn btn-sm ${subTab === t.key ? "btn-primary" : "btn-ghost"}`} onClick={() => setSubTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── GRADES tab ──────────────────────────────────────────────────── */}
      {subTab === "grades" && (
        <div>
          {showForm && <div style={{ marginBottom: "1rem" }}><AssignmentForm categories={categories} period={period} onSave={handleAddAssignment} onClose={() => setShowForm(false)} /></div>}

          {/* Period selector */}
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            {[1,2,3,4,5,6].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ background: period === p ? GOLD : "rgba(255,255,255,0.06)", border: period === p ? "none" : "1px solid rgba(255,255,255,0.12)", color: period === p ? "#000" : "rgba(255,255,255,0.6)", borderRadius: 6, padding: "0.3rem 0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>
                {p <= 4 ? `P${p}` : p === 5 ? "Mid" : "Final"}
              </button>
            ))}
          </div>

          {periodAssignments.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>
              No assignments for {PERIOD_LABELS[period]} yet. <button onClick={() => setShowForm(true)} style={{ background: "none", border: "none", color: GOLD, cursor: "pointer", fontWeight: 700 }}>Add one →</button>
            </div>
          ) : (
            <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.82rem" }}>
                <thead>
                  {/* Category band */}
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", minWidth: 140, position: "sticky", left: 0, background: "#111", zIndex: 2 }}>Student</th>
                    {categories.map(cat => {
                      const catCols = periodAssignments.filter(a => a.category === cat.name);
                      if (!catCols.length) return null;
                      return <th key={cat.name} colSpan={catCols.length} style={{ padding: "0.4rem 0.5rem", background: cat.color + "22", color: cat.color, fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", borderLeft: `2px solid ${cat.color}44` }}>{cat.name} · {cat.weight}%</th>;
                    })}
                    <th style={{ padding: "0.4rem 0.5rem", color: GOLD, fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", minWidth: 80, borderLeft: "1px solid rgba(255,255,255,0.1)" }}>Period %</th>
                    <th style={{ padding: "0.4rem 0.5rem", color: GOLD, fontWeight: 800, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", minWidth: 56 }}>Grade</th>
                  </tr>
                  {/* Assignment names */}
                  <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
                    <th style={{ padding: "0.4rem 0.75rem", textAlign: "left", position: "sticky", left: 0, background: "#111", zIndex: 2, fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>
                      {sortedStudents.length} students
                    </th>
                    {periodAssignments.map(a => {
                      const cat = categories.find(c => c.name === a.category);
                      const stats = assignmentStats(a, grades.filter(g => g.assignment_id === a.id));
                      return (
                        <th key={a.id} style={{ padding: "0.4rem 0.5rem", textAlign: "center", borderLeft: `1px solid rgba(255,255,255,0.05)`, maxWidth: 100, minWidth: 72 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.72rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 90, margin: "0 auto" }} title={a.name}>{a.name}</div>
                          <div style={{ fontSize: "0.63rem", color: "rgba(255,255,255,0.35)" }}>/ {a.max_points}</div>
                          {stats && <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)" }}>avg {Math.round(stats.avg)}%</div>}
                          {a.extra_credit && <div style={{ fontSize: "0.6rem", color: "#22c55e" }}>EC</div>}
                          {a.rubric?.length > 0 && <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)" }}>📋</div>}
                          {a.due_date && <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)" }}>{a.due_date}</div>}
                        </th>
                      );
                    })}
                    <th style={{ borderLeft: "1px solid rgba(255,255,255,0.1)" }} />
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map(student => {
                    const sg = gradeMap[student.id] || {};
                    const { pct } = calcPeriodGrade(periodAssignments, sg, categories);
                    const letter = letterGrade(pct, scale);
                    const tier = pct == null ? "ungraded" : pct >= 90 ? "a" : pct >= 80 ? "b" : pct >= 70 ? "c" : pct >= 60 ? "d" : "f";
                    return (
                      <tr key={student.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "0.4rem 0.75rem", fontWeight: 600, position: "sticky", left: 0, background: "#0d0d0d", zIndex: 1, whiteSpace: "nowrap" }}>
                          {student.lastName}, {student.firstName}
                          <span className="tag tag-amber" style={{ marginLeft: "0.4rem", fontSize: "0.62rem" }}>{student.grade}</span>
                        </td>
                        {periodAssignments.map(a => (
                          <GradeCell
                            key={a.id}
                            assignment={a}
                            grade={sg[a.id] || null}
                            student={student}
                            onSave={data => handleSaveGrade(a.id, student, data)}
                            onOpenRubric={() => setRubricState({ assignment: a, student, grade: sg[a.id] || null })}
                          />
                        ))}
                        <td style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.08)", fontWeight: 700, color: TIER_COLORS[tier] }}>
                          {pct != null ? `${Math.round(pct)}%` : "—"}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 800, fontSize: "1rem", color: TIER_COLORS[tier] }}>
                          {pct != null ? letter : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Class average row */}
                  <tr style={{ borderTop: "2px solid rgba(255,255,255,0.1)", background: "rgba(245,192,37,0.04)" }}>
                    <td style={{ padding: "0.4rem 0.75rem", fontWeight: 700, fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", position: "sticky", left: 0, background: "#111", zIndex: 1 }}>Class Avg</td>
                    {periodAssignments.map(a => {
                      const stats = assignmentStats(a, grades.filter(g => g.assignment_id === a.id));
                      return (
                        <td key={a.id} style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", padding: "0.4rem 0.5rem" }}>
                          {stats ? `${Math.round(stats.avg)}%` : "—"}
                        </td>
                      );
                    })}
                    <td colSpan={2} style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                      {(() => {
                        const avgs = sortedStudents.map(s => calcPeriodGrade(periodAssignments, gradeMap[s.id] || {}, categories).pct).filter(Boolean);
                        const avg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
                        return avg ? <span style={{ fontWeight: 700, color: GOLD }}>{Math.round(avg)}%</span> : "—";
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ASSIGNMENTS tab ──────────────────────────────────────────────── */}
      {subTab === "assignments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            {[1,2,3,4,5,6].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ background: period === p ? GOLD : "rgba(255,255,255,0.06)", border: period === p ? "none" : "1px solid rgba(255,255,255,0.12)", color: period === p ? "#000" : "rgba(255,255,255,0.6)", borderRadius: 6, padding: "0.3rem 0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>
                {p <= 4 ? `P${p}` : p === 5 ? "Midterm" : "Final"}
              </button>
            ))}
            <button onClick={() => { setEditingAssignment(null); setShowForm(true); }} className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}>+ Add</button>
          </div>

          {showForm && !editingAssignment && <AssignmentForm categories={categories} period={period} onSave={handleAddAssignment} onClose={() => setShowForm(false)} />}
          {editingAssignment && <AssignmentForm initial={editingAssignment} categories={categories} period={period} onSave={handleUpdateAssignment} onClose={() => setEditingAssignment(null)} />}

          {categories.map(cat => {
            const catAssignments = assignments.filter(a => a.grading_period === period && a.category === cat.name);
            return (
              <div key={cat.name}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem", marginTop: "0.5rem" }}>
                  <span style={{ color: cat.color, fontWeight: 800, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>■ {cat.name}</span>
                  <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>{cat.weight}%{cat.drop_lowest ? ` · drop lowest ${cat.drop_lowest}` : ""}</span>
                </div>
                {catAssignments.length === 0 ? (
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.25)", padding: "0.3rem 0.75rem" }}>No assignments yet</div>
                ) : (
                  catAssignments.map(a => {
                    const stats = assignmentStats(a, grades.filter(g => g.assignment_id === a.id));
                    return (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.55rem 0.85rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, marginBottom: "0.35rem", flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{a.name} {a.extra_credit && <span className="tag tag-green" style={{ fontSize: "0.62rem" }}>EC</span>} {a.rubric?.length > 0 && <span style={{ fontSize: "0.72rem" }}>📋</span>}</div>
                          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                            {a.max_points} pts{a.due_date ? ` · Due ${a.due_date}` : ""}
                            {a.description ? ` · ${a.description}` : ""}
                          </div>
                        </div>
                        {stats && (
                          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", textAlign: "right" }}>
                            <div>Avg: <strong style={{ color: "#fff" }}>{Math.round(stats.avg)}%</strong></div>
                            <div>{stats.failing} failing · {stats.count} graded</div>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button onClick={() => { setEditingAssignment(a); setShowForm(false); }} style={{ ...inp, cursor: "pointer", fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}>Edit</button>
                          <button onClick={() => deleteAssignment(a.id)} style={{ ...inp, cursor: "pointer", fontSize: "0.75rem", padding: "0.25rem 0.6rem", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>Delete</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── REPORTS tab ─────────────────────────────────────────────────── */}
      {subTab === "reports" && (
        <GradebookReports students={students} assignments={assignments} grades={grades} profiles={profiles} settings={settings} user={user} />
      )}

      {/* ── SETTINGS tab ────────────────────────────────────────────────── */}
      {subTab === "settings" && (
        <GradebookSettings profiles={profiles} settings={settings} saveProfile={saveProfile} setActiveProfile={setActiveProfile} deleteProfile={deleteProfile} saveSettings={saveSettings} user={user} />
      )}

      {/* ── Rubric modal ─────────────────────────────────────────────────── */}
      {rubricState && (
        <GradebookRubric
          assignment={rubricState.assignment}
          student={rubricState.student}
          existingGrade={rubricState.grade}
          onSave={async (rubric_scores, total) => {
            await handleSaveGrade(rubricState.assignment.id, rubricState.student, {
              rubric_scores,
              points_earned: total,
            });
            setRubricState(null);
          }}
          onClose={() => setRubricState(null)}
        />
      )}
    </div>
  );
}
