import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { GOLD } from "../constants.js";
import { useGradebook, useClassroomSync } from "../supabase.js";
import { useGmailSend } from "../supabase.js";
import { useApp as useClassroomApp } from "../classroom/ClassroomContext.jsx";
import {
  calcPeriodGrade, calcSemesterGrade, letterGrade, gradePct, gradeTier,
  effectivePoints, assignmentStats, rubricTotal, DEFAULT_SCALE,
  DEFAULT_PERIOD_WEIGHTS, letterRank, gradeTrend, isPastDue, missingItemsFor,
  gpaFromPct,
} from "../gradebook.js";
import { toCSV, parseCSV, downloadCSV } from "../csv.js";
import GradebookSettings from "./GradebookSettings.jsx";
import GradebookRubric from "./GradebookRubric.jsx";
import GradebookMissingWork from "./GradebookMissingWork.jsx";
import GradebookAnalytics from "./GradebookAnalytics.jsx";
import GradebookStudentDetail from "./GradebookStudentDetail.jsx";

// Small inline trend indicator (↑ / ↓ / →) used in tables and report cards.
function TrendArrow({ trend, belowPassing }) {
  if (!trend || trend.delta == null || trend.direction === "flat") return null;
  const up = trend.direction === "up";
  return (
    <span title={`${up ? "Trending up" : "Trending down"} ${Math.abs(Math.round(trend.delta))} pts`}
      style={{ fontSize: "0.72rem", fontWeight: 700, color: up ? "#22c55e" : "#ef4444", marginLeft: 4 }}>
      {up ? "▲" : "▼"}{!up && belowPassing ? " 🚩" : ""}
    </span>
  );
}

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
// `creating` forces create-mode labels even when `initial` is prefilled (duplicates).
function AssignmentForm({ initial, categories, period, onSave, onClose, creating }) {
  const isEdit = !!initial && !creating;
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
        <div className="section-title" style={{ marginBottom: 0 }}>{isEdit ? "Edit Assignment" : creating ? "Duplicate Assignment" : "New Assignment"}</div>
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
          {isEdit ? "Save Changes" : "Add Assignment"}
        </button>
      </div>
    </div>
  );
}

// ── Grade Cell ───────────────────────────────────────────────────────────────
function GradeCell({ assignment, grade, student, onSave, onOpenRubric, quickEntry, autoZeroOpts, gridPos, registerRef, onGridNav }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  const pts = effectivePoints(grade, assignment, autoZeroOpts);
  const pct = gradePct(grade, assignment, autoZeroOpts);
  const hasRubric = !!(assignment?.rubric?.length);
  const latePct = autoZeroOpts?.latePenaltyPct || 0;
  const autoZeroed = pts == null && !grade?.excused && !grade?.missing &&
    autoZeroOpts?.autoZeroMissing && isPastDue(assignment, autoZeroOpts.today, autoZeroOpts.graceDays);

  function open() {
    setDraft({
      points_earned: grade?.points_earned ?? "",
      excused: grade?.excused || false,
      missing: grade?.missing || false,
      late: grade?.late || false,
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

  // ── Quick-entry mode: a bare input with spreadsheet keyboard navigation ──
  if (quickEntry && !hasRubric) {
    const display = grade?.excused ? "EXC" : grade?.missing ? "MIS"
      : grade?.points_earned != null ? String(grade.points_earned) + (grade?.late ? " L" : "") : "";
    async function quickCommit(val) {
      const trimmed = (val ?? "").trim().toLowerCase();
      if (trimmed === "e") return onSave({ excused: true, missing: false, points_earned: null });
      if (trimmed === "m") return onSave({ missing: true, excused: false, points_earned: null });
      if (trimmed === "l") return onSave({ late: !grade?.late }); // toggle late, keep score
      if (trimmed === "x" || trimmed === "") return onSave({ points_earned: null, missing: false, excused: false, late: false });
      // Trailing "l" marks the entry late, e.g. "85l".
      const late = /l$/.test(trimmed);
      const n = Number(late ? trimmed.slice(0, -1) : trimmed);
      if (!isNaN(n)) return onSave({ points_earned: n, missing: false, excused: false, late });
    }
    return (
      <td style={{ padding: 1, textAlign: "center", background: grade?.missing ? "rgba(249,115,22,0.1)" : grade?.excused ? "rgba(255,255,255,0.04)" : cellColor(autoZeroed ? 0 : pct), minWidth: 54 }}>
        <input
          ref={el => registerRef?.(gridPos, el)}
          defaultValue={display}
          key={display}
          placeholder={autoZeroed ? "0" : "—"}
          onKeyDown={e => {
            if (["Enter", "ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Tab"].includes(e.key)) {
              e.preventDefault();
              quickCommit(e.currentTarget.value);
              const dir = e.key === "Enter" || e.key === "ArrowDown" ? "down"
                : e.key === "ArrowUp" ? "up"
                : e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey) ? "left" : "right";
              onGridNav?.(gridPos, dir);
            }
          }}
          onBlur={e => quickCommit(e.currentTarget.value)}
          style={{
            width: "100%", boxSizing: "border-box", textAlign: "center", background: "transparent",
            border: "1px solid transparent", borderRadius: 4, padding: "0.28rem 0.1rem", color: "#fff",
            fontSize: "0.76rem", fontWeight: 600, outline: "none",
          }}
          onFocus={e => { e.currentTarget.style.border = `1px solid ${GOLD}`; e.currentTarget.style.background = "rgba(245,192,37,0.08)"; e.currentTarget.select(); }}
        />
      </td>
    );
  }

  if (editing) return (
    <td style={{ padding: "0.3rem", minWidth: 110, verticalAlign: "top" }}>
      <div style={{ background: "#1a1400", border: `1px solid ${GOLD}`, borderRadius: 7, padding: "0.5rem", zIndex: 20, position: "relative" }}>
        {hasRubric ? (
          <button onClick={() => { setEditing(false); onOpenRubric(); }} style={{ ...inp, cursor: "pointer", width: "100%", marginBottom: "0.4rem", color: GOLD, border: `1px solid rgba(245,192,37,0.3)` }}>📋 Open Rubric</button>
        ) : (
          <input type="number" min={0} max={assignment.max_points} value={draft.points_earned} onChange={e => setDraft(d => ({ ...d, points_earned: e.target.value }))} placeholder={`/ ${assignment.max_points}`} style={{ ...inp, width: "100%", boxSizing: "border-box", marginBottom: "0.4rem" }} autoFocus />
        )}
        {/* Quick special-mark buttons */}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.4rem" }}>
          <button onClick={() => setDraft(d => ({ ...d, missing: true, excused: false, points_earned: "" }))} style={{ ...inp, flex: 1, cursor: "pointer", color: draft.missing ? "#000" : "#f97316", background: draft.missing ? "#f97316" : "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", fontSize: "0.68rem" }}>Missing</button>
          <button onClick={() => setDraft(d => ({ ...d, excused: true, missing: false, points_earned: "" }))} style={{ ...inp, flex: 1, cursor: "pointer", color: draft.excused ? "#000" : "rgba(255,255,255,0.7)", background: draft.excused ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.2)", fontSize: "0.68rem" }}>Excused</button>
          <button onClick={() => setDraft(d => ({ ...d, missing: false, excused: false, late: false }))} style={{ ...inp, flex: 1, cursor: "pointer", fontSize: "0.68rem" }}>Clear</button>
        </div>
        {latePct > 0 && (
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", cursor: "pointer", marginBottom: "0.4rem", color: draft.late ? "#f97316" : "rgba(255,255,255,0.6)" }}>
            <input type="checkbox" checked={!!draft.late} onChange={e => setDraft(d => ({ ...d, late: e.target.checked }))} /> Late (−{latePct}%)
          </label>
        )}
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
      background: cellColor(autoZeroed ? 0 : pct), minWidth: 54, transition: "background 0.15s",
    }}>
      {grade?.excused ? (
        <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>EXC</span>
      ) : grade?.missing ? (
        <span style={{ fontSize: "0.7rem", color: "#f97316" }}>MIS</span>
      ) : pts != null ? (
        <>
          <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{Math.round(pts)}</div>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)" }}>{Math.round(pct)}%</div>
          {grade?.late && latePct > 0 && <div style={{ fontSize: "0.6rem", color: "#f97316" }}>late −{latePct}%</div>}
          {grade?.retake_score != null && <div style={{ fontSize: "0.6rem", color: "#60a5fa" }}>↩ retake</div>}
          {hasRubric && <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)" }}>📋</div>}
        </>
      ) : autoZeroed ? (
        <>
          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#ef4444" }}>0</div>
          <div style={{ fontSize: "0.58rem", color: "rgba(239,68,68,0.7)" }}>past due</div>
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
  const autoZeroOpts = {
    autoZeroMissing: settings?.auto_zero_missing ?? false,
    graceDays: settings?.auto_zero_grace_days ?? 0,
    today: new Date(),
  };

  // Derive search results as a side-effect of search/roster changes. (useEffect,
  // not useMemo — setState belongs in an effect, not a memo computed in render.)
  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    setResults(students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8));
  }, [search, students]);

  function studentGradeForPeriod(student, period) {
    const periodAssignments = assignments.filter(a => a.grading_period === period);
    const gradeMap = Object.fromEntries(grades.filter(g => g.student_id === student.id).map(g => [g.assignment_id, g]));
    return calcPeriodGrade(periodAssignments, gradeMap, categories, autoZeroOpts);
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
    } catch (err) {
      // Gmail send failed — fall back to the user's mail client.
      console.warn("Grade-report Gmail send failed; opening mailto fallback:", err);
      window.open(`mailto:${student.parentEmail}?subject=${encodeURIComponent(`Grade Report — ${student.firstName} ${student.lastName}`)}&body=${encodeURIComponent(body)}`);
    }
  }

  // Class distribution for selected period
  const periodAssignments = assignments.filter(a => a.grading_period === viewPeriod);
  const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  students.forEach(s => {
    const gradeMap = Object.fromEntries(grades.filter(g => g.student_id === s.id).map(g => [g.assignment_id, g]));
    const { pct } = calcPeriodGrade(periodAssignments, gradeMap, categories, autoZeroOpts);
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
                const pAssignments = assignments.filter(a => a.grading_period === p);
                const pGradeMap = Object.fromEntries(grades.filter(g => g.student_id === selectedStudent.id).map(g => [g.assignment_id, g]));
                const trend = gradeTrend(pAssignments, pGradeMap);
                return (
                  <div key={p} style={{ background: cellColor(pct), border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8, padding: "0.7rem 0.75rem", textAlign: "center" }}>
                    <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{PERIOD_LABELS[p]}</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TIER_COLORS[tier] || "#fff", lineHeight: 1 }}>{pct != null ? letter : "—"}<TrendArrow trend={trend} belowPassing={pct != null && pct < 70} /></div>
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

            {/* Feedback & comments (notes + per-criterion rubric comments) */}
            {(() => {
              const sGrades = grades.filter(g => g.student_id === selectedStudent.id);
              const fb = sGrades.map(g => {
                const a = assignments.find(x => x.id === g.assignment_id);
                if (!a) return null;
                const critComments = g.rubric_comments
                  ? (a.rubric || []).filter(c => g.rubric_comments[c.id]?.trim())
                      .map(c => `${c.criterion}: ${g.rubric_comments[c.id].trim()}`)
                  : [];
                if (!g.notes?.trim() && critComments.length === 0) return null;
                return { assignment: a, notes: g.notes?.trim(), critComments };
              }).filter(Boolean);
              if (!fb.length) return null;
              return (
                <div style={{ marginTop: "0.75rem" }}>
                  <div className="section-title" style={{ marginBottom: "0.5rem" }}>Feedback</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {fb.map(f => (
                      <div key={f.assignment.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, padding: "0.5rem 0.75rem" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.82rem", marginBottom: 2 }}>{f.assignment.name}</div>
                        {f.notes && <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)" }}>{f.notes}</div>}
                        {f.critComments.map((c, i) => (
                          <div key={i} style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.55)", marginTop: 1 }}>• {c}</div>
                        ))}
                      </div>
                    ))}
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
          const { pct } = calcPeriodGrade(periodAssignments, gradeMap, categories, autoZeroOpts);
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
  const { requestToken: requestGCToken, listCourses, syncGradesToCourse } = useClassroomSync();
  const { moleGradeCredits = [], currentGradingPeriod = 1 } = useClassroomApp();

  const [subTab, setSubTab] = useState("grades");
  const [period, setPeriod] = useState(1);
  const [activeSection, setActiveSection] = useState(null); // null = all, string = section name
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [rubricState, setRubricState] = useState(null);
  const [expandedAssignment, setExpandedAssignment] = useState(null);
  const [quickEntry, setQuickEntry] = useState(false);
  const [bulkMenu, setBulkMenu] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [detailStudent, setDetailStudent] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [cloneDraft, setCloneDraft] = useState(null);
  const cellRefs = useRef({});

  // Google Classroom grade-sync state
  const [gcSync, setGcSync] = useState(null); // null | 'auth' | 'picking' | 'syncing' | { synced, skipped, errors }
  const [gcCourses, setGcCourses] = useState([]);
  const gcTokenRef = useRef(null);

  async function startGCSync() {
    setGcSync("auth");
    try {
      const token = await requestGCToken();
      gcTokenRef.current = token;
      const courses = await listCourses(token);
      setGcCourses(courses);
      setGcSync("picking");
    } catch (e) {
      setGcSync({ synced: 0, skipped: 0, errors: [e.message] });
    }
  }

  async function runGCSync(courseId) {
    setGcSync("syncing");
    try {
      const result = await syncGradesToCourse(gcTokenRef.current, courseId, {
        assignments: periodAssignments,
        grades,
        students: sectionStudents,
      });
      setGcSync(result);
    } catch (e) {
      setGcSync({ synced: 0, skipped: 0, errors: [e.message] });
    }
  }

  // Unique sections for the class selector tabs
  const sections = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const s of students) {
      if (s.section && !seen.has(s.section)) { seen.add(s.section); out.push(s.section); }
    }
    return out.sort();
  }, [students]);

  const activeProfile = profiles.find(p => p.is_active) || profiles[0] || null;
  const categories = activeProfile?.categories || [];
  const scale = settings?.grading_scale || DEFAULT_SCALE;
  const periodWeights = settings?.period_weights || DEFAULT_PERIOD_WEIGHTS;
  const autoZeroOpts = useMemo(() => ({
    autoZeroMissing: settings?.auto_zero_missing ?? false,
    graceDays: settings?.auto_zero_grace_days ?? 0,
    latePenaltyPct: settings?.late_penalty_pct ?? 0,
    today: new Date(),
  }), [settings?.auto_zero_missing, settings?.auto_zero_grace_days, settings?.late_penalty_pct]);

  // Order: category index → sort_order → due_date → created_at.
  const periodAssignments = useMemo(() =>
    assignments
      .filter(a => a.grading_period === period && (!activeSection || !a.section || a.section === activeSection))
      .sort((a, b) => {
        const ci = categories.findIndex(c => c.name === a.category);
        const cj = categories.findIndex(c => c.name === b.category);
        if (ci !== cj) return ci - cj;
        const ao = a.sort_order ?? Infinity;
        const bo = b.sort_order ?? Infinity;
        if (ao !== bo) return ao - bo;
        return new Date(a.created_at) - new Date(b.created_at);
      }),
    [assignments, period, categories, activeSection]
  );

  const gradeMap = useMemo(() => {
    const m = {};
    grades.forEach(g => {
      if (!m[g.student_id]) m[g.student_id] = {};
      m[g.student_id][g.assignment_id] = g;
    });
    return m;
  }, [grades]);

  const sectionStudents = useMemo(() => {
    const filtered = activeSection ? students.filter(s => s.section === activeSection) : students;
    return [...filtered].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  }, [students, activeSection]);

  // Keep alias for components that reference sortedStudents
  const sortedStudents = sectionStudents;

  async function handleSaveGrade(assignmentId, student, data) {
    const assignment = assignments.find(a => a.id === assignmentId);
    await saveGrade(assignmentId, student.id, `${student.firstName} ${student.lastName}`, data);

    // Auto-email parent on fail. Use the effective grade % (factors in retakes,
    // rubric scores, late penalties) so a passing retake doesn't trigger a false
    // "failing grade" notice — not the raw points_earned/max_points.
    if (assignment && student.parentEmail && settings?.auto_email_fail !== false) {
      const pct = gradePct(data, assignment, autoZeroOpts);
      if (pct != null && pct < 60 && assignment.category !== "Homework") {
        const body = `Dear Parent/Guardian,\n\n${student.firstName} ${student.lastName} received a failing grade on "${assignment.name}" (${Math.round(pct)}%).\n\nPlease reach out if you have questions.\n\n— ${user?.name}, ${user?.email}`;
        try {
          const token = await requestGmailToken();
          await sendEmail(token, { to: student.parentEmail, from: user?.email, subject: `Failing Grade Notice — ${student.firstName} ${student.lastName}`, body });
        } catch (err) {
          // Non-fatal — teacher can email manually from Reports. Surface it so a
          // failed send isn't completely invisible.
          console.warn("Failing-grade auto-email did not send:", err);
        }
      }
    }
  }

  async function handleAddAssignment(data) {
    // Stamp the active section so the assignment shows only in its own section
    // tab. A blank section would otherwise render across every section.
    await addAssignment({ ...data, section: data.section ?? activeSection ?? null });
    setShowForm(false);
  }

  async function handleUpdateAssignment(data) {
    await updateAssignment(editingAssignment.id, data);
    setEditingAssignment(null);
  }

  // ── Quick-entry grid navigation ────────────────────────────────────────────
  const registerRef = useCallback((pos, el) => {
    if (el) cellRefs.current[`${pos.si}:${pos.ai}`] = el;
  }, []);
  const focusCell = useCallback((si, ai) => {
    const el = cellRefs.current[`${si}:${ai}`];
    if (el) { el.focus(); el.select?.(); }
  }, []);
  const onGridNav = useCallback((pos, dir) => {
    const maxS = sortedStudents.length - 1;
    const maxA = periodAssignments.length - 1;
    let { si, ai } = pos;
    if (dir === "down") si = Math.min(maxS, si + 1);
    else if (dir === "up") si = Math.max(0, si - 1);
    else if (dir === "right") ai = Math.min(maxA, ai + 1);
    else if (dir === "left") ai = Math.max(0, ai - 1);
    focusCell(si, ai);
  }, [sortedStudents.length, periodAssignments.length, focusCell]);

  // ── Bulk column editing ────────────────────────────────────────────────────
  async function bulkColumn(assignment, action, value) {
    setBulkMenu(null);
    for (const s of sortedStudents) {
      const existing = gradeMap[s.id]?.[assignment.id];
      const hasScore = existing && (existing.points_earned != null || existing.missing || existing.excused || existing.rubric_scores);
      if (action === "fill" && !hasScore) {
        await handleSaveGrade(assignment.id, s, { points_earned: Number(value), missing: false, excused: false });
      } else if (action === "zeroBlanks" && !hasScore) {
        await handleSaveGrade(assignment.id, s, { missing: true, excused: false, points_earned: null });
      } else if (action === "excuseBlanks" && !hasScore) {
        await handleSaveGrade(assignment.id, s, { excused: true, missing: false, points_earned: null });
      } else if (action === "clear") {
        if (existing) await handleSaveGrade(assignment.id, s, { points_earned: null, missing: false, excused: false });
      }
    }
  }

  // ── CSV export / import (current period grid) ──────────────────────────────
  function exportGradesCSV() {
    const header = ["Student", ...periodAssignments.map(a => a.name), "Period %", "Letter"];
    const rows = [header];
    for (const s of sortedStudents) {
      const sg = gradeMap[s.id] || {};
      const row = [`${s.lastName}, ${s.firstName}`];
      for (const a of periodAssignments) {
        const g = sg[a.id];
        row.push(g?.excused ? "EXC" : g?.missing ? "MIS" : g?.points_earned != null ? g.points_earned : "");
      }
      const { pct } = calcPeriodGrade(periodAssignments, sg, categories, autoZeroOpts);
      row.push(pct != null ? Math.round(pct) : "");
      row.push(pct != null ? letterGrade(pct, scale) : "");
      rows.push(row);
    }
    downloadCSV(`gradebook-${PERIOD_LABELS[period].replace(/\s+/g, "-")}.csv`, toCSV(rows));
  }

  async function applyImport(updates) {
    for (const u of updates) await handleSaveGrade(u.assignmentId, u.student, u.data);
    setImportOpen(false);
  }

  // Duplicate an assignment into a fresh "create" draft.
  function duplicateAssignment(a) {
    setEditingAssignment(null);
    setShowForm(false);
    setCloneDraft({
      name: `${a.name} (copy)`,
      category: a.category,
      grading_period: a.grading_period,
      max_points: a.max_points,
      due_date: "",
      description: a.description || "",
      extra_credit: !!a.extra_credit,
      rubric: (a.rubric || []).map((c, i) => ({ ...c, id: `r-${Date.now()}-${i}` })),
    });
  }

  // ── Curve a single assignment column ───────────────────────────────────────
  async function curveColumn(assignment, mode, value) {
    setBulkMenu(null);
    // Collect raw earned points for graded, non-excused/missing students.
    const rows = sortedStudents.map(s => ({ s, g: gradeMap[s.id]?.[assignment.id] }))
      .filter(({ g }) => g && !g.excused && !g.missing && g.points_earned != null);
    if (!rows.length) return;
    const max = assignment.max_points || 100;
    const curMax = Math.max(...rows.map(({ g }) => g.points_earned));
    const curAvg = rows.reduce((s, { g }) => s + g.points_earned, 0) / rows.length;
    for (const { s, g } of rows) {
      let np = g.points_earned;
      if (mode === "add") np = g.points_earned + Number(value);
      else if (mode === "scaleMax" && curMax > 0) np = g.points_earned * (max / curMax);
      else if (mode === "setAvg") { const targetPts = (Number(value) / 100) * max; np = g.points_earned + (targetPts - curAvg); }
      np = Math.max(0, Math.min(max, Math.round(np * 10) / 10));
      await handleSaveGrade(assignment.id, s, { points_earned: np, missing: false, excused: false });
    }
  }

  // ── Drag-drop reorder & regroup (Assignments tab) ──────────────────────────
  async function handleDropOnAssignment(target) {
    if (!dragId || dragId === target.id) { setDragId(null); return; }
    const dragged = assignments.find(a => a.id === dragId);
    if (!dragged) { setDragId(null); return; }
    // Reorder within the target's category; reassign category if different.
    const catName = target.category;
    const inCat = assignments
      .filter(a => a.grading_period === period && a.category === catName && a.id !== dragId)
      .sort((a, b) => (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) || new Date(a.created_at) - new Date(b.created_at));
    const idx = inCat.findIndex(a => a.id === target.id);
    const ordered = [...inCat.slice(0, idx), dragged, ...inCat.slice(idx)];
    for (let i = 0; i < ordered.length; i++) {
      const patch = { sort_order: i };
      if (ordered[i].id === dragId && dragged.category !== catName) patch.category = catName;
      await updateAssignment(ordered[i].id, patch);
    }
    setDragId(null);
  }
  async function handleDropOnCategory(catName) {
    if (!dragId) return;
    const dragged = assignments.find(a => a.id === dragId);
    if (!dragged) { setDragId(null); return; }
    const inCat = assignments
      .filter(a => a.grading_period === period && a.category === catName && a.id !== dragId)
      .sort((a, b) => (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity));
    await updateAssignment(dragId, { category: catName, sort_order: inCat.length });
    setDragId(null);
  }
  async function sortByDueDate() {
    const byCat = {};
    assignments.filter(a => a.grading_period === period).forEach(a => {
      (byCat[a.category] ||= []).push(a);
    });
    for (const list of Object.values(byCat)) {
      list.sort((a, b) => {
        const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return ad - bd;
      });
      for (let i = 0; i < list.length; i++) await updateAssignment(list[i].id, { sort_order: i });
    }
  }

  const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.35rem 0.6rem", color: "#fff", fontSize: "0.82rem", outline: "none" };

  if (!activeProfile) {
    return (
      <div>
        <h2 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "1rem" }}>Gradebook</h2>
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📊</div>
          <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Set up your gradebook first</div>
          <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", marginBottom: "1.25rem" }}>Pick a grade weight profile below to get started — tap a preset, then Save Profile.</div>
          <button onClick={() => document.getElementById("gb-settings-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ background: GOLD, border: "none", color: "#000", fontWeight: 700, borderRadius: 8, padding: "0.6rem 1.5rem", cursor: "pointer" }}>Choose a Profile ↓</button>
        </div>
        <div id="gb-settings-anchor" style={{ marginTop: "1.5rem", scrollMarginTop: "1rem" }}>
          <GradebookSettings profiles={profiles} settings={settings} saveProfile={saveProfile} setActiveProfile={setActiveProfile} deleteProfile={deleteProfile} saveSettings={saveSettings} user={user} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb2" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem" }}>Gradebook</h2>
          <div className="text-muted" style={{ fontSize: "0.78rem" }}>
            {activeProfile.name} weights · {categories.map(c => `${c.name} ${c.weight}%`).join(" · ")}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {subTab === "grades" && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">+ Assignment</button>
          )}
        </div>
      </div>

      {/* Class section tabs */}
      {sections.length > 0 && (
        <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => setActiveSection(null)}
            style={{ background: !activeSection ? GOLD : "rgba(255,255,255,0.06)", border: !activeSection ? "none" : "1px solid rgba(255,255,255,0.12)", color: !activeSection ? "#000" : "rgba(255,255,255,0.6)", borderRadius: 6, padding: "0.28rem 0.7rem", cursor: "pointer", fontWeight: 700, fontSize: "0.76rem" }}
          >
            All Classes
          </button>
          {sections.map(sec => (
            <button key={sec}
              onClick={() => setActiveSection(sec)}
              style={{ background: activeSection === sec ? GOLD : "rgba(255,255,255,0.06)", border: activeSection === sec ? "none" : "1px solid rgba(255,255,255,0.12)", color: activeSection === sec ? "#000" : "rgba(255,255,255,0.6)", borderRadius: 6, padding: "0.28rem 0.7rem", cursor: "pointer", fontWeight: 700, fontSize: "0.76rem" }}
            >
              {sec}
            </button>
          ))}
          {/* Google Classroom grade sync */}
          {gcSync === null && (
            <button onClick={startGCSync}
              style={{ marginLeft: "auto", background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.35)", color: "#7aacf8", borderRadius: 6, padding: "0.28rem 0.7rem", cursor: "pointer", fontWeight: 700, fontSize: "0.76rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
              title="Push grades from the current period/section back to Google Classroom"
            >
              <svg width="13" height="13" viewBox="0 0 48 48" style={{ flexShrink: 0 }}><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.4 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.9 6.1C12.6 13 17.9 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.8-2.1 5.1-4.4 6.7l6.9 5.4c4-3.7 6.2-9.2 6.2-16.1z"/><path fill="#FBBC05" d="M10.7 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.4 13.3A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.2-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-6.9-5.4c-2.1 1.4-4.8 2.3-8.3 2.3-6.1 0-11.4-4-13.3-9.4l-8.2 6.1C6.6 42.5 14.7 48 24 48z"/></svg>
              Sync → Classroom
            </button>
          )}
          {gcSync === "auth" && <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>Requesting access…</span>}
          {gcSync === "syncing" && <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>Syncing grades…</span>}
          {gcSync === "picking" && (
            <div style={{ marginLeft: "auto", display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.55)" }}>Pick class:</span>
              {gcCourses.map(c => (
                <button key={c.id} onClick={() => runGCSync(c.id)}
                  style={{ background: "rgba(66,133,244,0.15)", border: "1px solid rgba(66,133,244,0.4)", color: "#7aacf8", borderRadius: 6, padding: "0.22rem 0.6rem", cursor: "pointer", fontWeight: 600, fontSize: "0.73rem" }}
                >
                  {c.name}{c.section ? ` · ${c.section}` : ""}
                </button>
              ))}
              <button onClick={() => setGcSync(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
            </div>
          )}
          {gcSync && typeof gcSync === "object" && (
            <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: gcSync.errors?.length ? "#f97316" : "#22c55e" }}>
                {gcSync.errors?.length
                  ? `⚠ ${gcSync.synced} synced · ${gcSync.errors.length} errors`
                  : `✓ ${gcSync.synced} grades synced · ${gcSync.skipped} skipped`}
              </span>
              <button onClick={() => setGcSync(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
            </div>
          )}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap1 mb2" style={{ flexWrap: "wrap" }}>
        {[{ key: "grades", label: "Grades" }, { key: "assignments", label: "Assignments" }, { key: "missing", label: "Missing Work" }, { key: "analytics", label: "📊 Analytics" }, { key: "reports", label: "Reports" }, { key: "credits", label: `🪙 Credits${moleGradeCredits.length ? ` (${moleGradeCredits.length})` : ""}` }, { key: "settings", label: "⚙ Settings" }].map(t => (
          <button key={t.key} className={`btn btn-sm ${subTab === t.key ? "btn-primary" : "btn-ghost"}`} onClick={() => setSubTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── GRADES tab ──────────────────────────────────────────────────── */}
      {subTab === "grades" && (
        <div>
          {showForm && <div style={{ marginBottom: "1rem" }}><AssignmentForm categories={categories} period={period} onSave={handleAddAssignment} onClose={() => setShowForm(false)} /></div>}

          {/* Period selector + quick-entry toggle */}
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {[1,2,3,4,5,6].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ background: period === p ? GOLD : "rgba(255,255,255,0.06)", border: period === p ? "none" : "1px solid rgba(255,255,255,0.12)", color: period === p ? "#000" : "rgba(255,255,255,0.6)", borderRadius: 6, padding: "0.3rem 0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>
                {p <= 4 ? `P${p}` : p === 5 ? "Mid" : "Final"}
              </button>
            ))}
            <button onClick={() => setQuickEntry(q => !q)} title="Type scores directly; use ↑ ↓ Tab to move, and e=Excused m=Missing l=Late x=clear"
              style={{ marginLeft: "auto", background: quickEntry ? GOLD : "rgba(255,255,255,0.06)", border: quickEntry ? "none" : "1px solid rgba(255,255,255,0.12)", color: quickEntry ? "#000" : "rgba(255,255,255,0.6)", borderRadius: 6, padding: "0.3rem 0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>
              ⚡ Quick Entry{quickEntry ? " On" : ""}
            </button>
            <button onClick={exportGradesCSV} className="btn btn-ghost btn-sm" title="Export this period's grid to CSV">⬇ CSV</button>
            <button onClick={() => setImportOpen(true)} className="btn btn-ghost btn-sm" title="Import scores from a CSV">⬆ Import</button>
          </div>
          {quickEntry && (
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem" }}>
              Type a score and press <strong>Enter</strong>/<strong>↓</strong> for the next student, <strong>Tab</strong>/<strong>→</strong> for the next assignment. Shortcuts: <strong>e</strong>=Excused, <strong>m</strong>=Missing, <strong>l</strong>=Late (e.g. <strong>85l</strong>), <strong>x</strong>=clear. Rubric columns still open the rubric editor.
            </div>
          )}

          {periodAssignments.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>
              No assignments for {PERIOD_LABELS[period]} yet. <button onClick={() => setShowForm(true)} style={{ background: "none", border: "none", color: GOLD, cursor: "pointer", fontWeight: 700 }}>Add one →</button>
            </div>
          ) : (
            <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.79rem" }}>
                <thead>
                  {/* Category band */}
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th style={{ padding: "0.4rem 0.6rem", textAlign: "left", minWidth: 118, position: "sticky", left: 0, background: "#111", zIndex: 2 }}>Student</th>
                    {categories.map(cat => {
                      const catCols = periodAssignments.filter(a => a.category === cat.name);
                      if (!catCols.length) return null;
                      return <th key={cat.name} colSpan={catCols.length} style={{ padding: "0.3rem 0.4rem", background: cat.color + "22", color: cat.color, fontWeight: 800, fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", borderLeft: `2px solid ${cat.color}44` }}>{cat.name} · {cat.weight}%</th>;
                    })}
                    <th style={{ padding: "0.3rem 0.4rem", color: GOLD, fontWeight: 800, fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", minWidth: 64, borderLeft: "1px solid rgba(255,255,255,0.1)" }}>Prd %</th>
                    <th style={{ padding: "0.3rem 0.4rem", color: GOLD, fontWeight: 800, fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", minWidth: 44 }}>Ltr</th>
                    <th style={{ padding: "0.3rem 0.4rem", color: GOLD, fontWeight: 800, fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", minWidth: 40 }}>GPA</th>
                  </tr>
                  {/* Assignment names */}
                  <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
                    <th style={{ padding: "0.3rem 0.6rem", textAlign: "left", position: "sticky", left: 0, background: "#111", zIndex: 2, fontSize: "0.67rem", color: "rgba(255,255,255,0.35)" }}>
                      {sortedStudents.length} students
                    </th>
                    {periodAssignments.map(a => {
                      const cat = categories.find(c => c.name === a.category);
                      const stats = assignmentStats(a, grades.filter(g => g.assignment_id === a.id));
                      return (
                        <th key={a.id} style={{ padding: "0.3rem 0.3rem", textAlign: "center", borderLeft: `1px solid rgba(255,255,255,0.05)`, maxWidth: 76, minWidth: 54, position: "relative" }}>
                          <button onClick={() => setBulkMenu(bulkMenu === a.id ? null : a.id)} title="Bulk edit column" style={{ position: "absolute", top: 1, right: 1, background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "0.75rem", lineHeight: 1, padding: "0 1px" }}>⋯</button>
                          <div style={{ fontWeight: 600, fontSize: "0.68rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 68, margin: "0 auto" }} title={a.name}>{a.name}</div>
                          <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)" }}>/{a.max_points}</div>
                          {stats && <div style={{ fontSize: "0.57rem", color: "rgba(255,255,255,0.3)" }}>{Math.round(stats.avg)}%</div>}
                          {a.extra_credit && <div style={{ fontSize: "0.57rem", color: "#22c55e" }}>EC</div>}
                          {a.rubric?.length > 0 && <div style={{ fontSize: "0.57rem", color: "rgba(255,255,255,0.3)" }}>📋</div>}
                          {a.due_date && <div style={{ fontSize: "0.57rem", color: "rgba(255,255,255,0.22)" }}>{a.due_date}</div>}
                          {bulkMenu === a.id && (
                            <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "100%", right: 0, zIndex: 30, background: "#1a1400", border: `1px solid ${GOLD}`, borderRadius: 7, padding: "0.4rem", minWidth: 150, textAlign: "left", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
                              {!a.rubric?.length && (
                                <button onClick={() => { const v = prompt(`Fill blank cells with how many points (out of ${a.max_points})?`); if (v != null && v !== "") bulkColumn(a, "fill", v); }} style={{ ...inp, display: "block", width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 3, fontSize: "0.74rem" }}>Fill blanks with…</button>
                              )}
                              <button onClick={() => bulkColumn(a, "zeroBlanks")} style={{ ...inp, display: "block", width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 3, fontSize: "0.74rem" }}>Mark blanks Missing (0)</button>
                              <button onClick={() => bulkColumn(a, "excuseBlanks")} style={{ ...inp, display: "block", width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 3, fontSize: "0.74rem" }}>Mark blanks Excused</button>
                              {!a.rubric?.length && <>
                                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "4px 0" }} />
                                <button onClick={() => { const v = prompt("Add how many points to every graded score? (curve)"); if (v != null && v !== "" && !isNaN(Number(v))) curveColumn(a, "add", v); }} style={{ ...inp, display: "block", width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 3, fontSize: "0.74rem" }}>Curve: add points…</button>
                                <button onClick={() => { if (confirm(`Scale scores so the top score becomes ${a.max_points} (100%)?`)) curveColumn(a, "scaleMax"); }} style={{ ...inp, display: "block", width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 3, fontSize: "0.74rem" }}>Curve: scale top to 100%</button>
                                <button onClick={() => { const v = prompt("Set the class average for this assignment to what % ?"); if (v != null && v !== "" && !isNaN(Number(v))) curveColumn(a, "setAvg", v); }} style={{ ...inp, display: "block", width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 3, fontSize: "0.74rem" }}>Curve: set average to…</button>
                              </>}
                              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "4px 0" }} />
                              <button onClick={() => { if (confirm("Clear all scores in this column?")) bulkColumn(a, "clear"); }} style={{ ...inp, display: "block", width: "100%", textAlign: "left", cursor: "pointer", fontSize: "0.74rem", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>Clear column</button>
                            </div>
                          )}
                        </th>
                      );
                    })}
                    <th style={{ borderLeft: "1px solid rgba(255,255,255,0.1)" }} />
                    <th />
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((student, si) => {
                    const sg = gradeMap[student.id] || {};
                    const { pct } = calcPeriodGrade(periodAssignments, sg, categories, autoZeroOpts);
                    const letter = letterGrade(pct, scale);
                    const tier = pct == null ? "ungraded" : pct >= 90 ? "a" : pct >= 80 ? "b" : pct >= 70 ? "c" : pct >= 60 ? "d" : "f";
                    const trend = gradeTrend(periodAssignments, sg);
                    return (
                      <tr key={student.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "0.3rem 0.6rem", fontWeight: 600, position: "sticky", left: 0, background: "#0d0d0d", zIndex: 1, whiteSpace: "nowrap" }}>
                          <span onClick={() => setDetailStudent(student)} title="Open full analytics & history" style={{ cursor: "pointer", borderBottom: "1px dotted rgba(245,192,37,0.5)", fontSize: "0.79rem" }}
                            onMouseEnter={e => e.currentTarget.style.color = GOLD} onMouseLeave={e => e.currentTarget.style.color = ""}>
                            {student.lastName}, {student.firstName}
                          </span>
                          <span className="tag tag-amber" style={{ marginLeft: "0.3rem", fontSize: "0.58rem" }}>{student.grade}</span>
                        </td>
                        {periodAssignments.map((a, ai) => (
                          <GradeCell
                            key={a.id}
                            assignment={a}
                            grade={sg[a.id] || null}
                            student={student}
                            quickEntry={quickEntry}
                            autoZeroOpts={autoZeroOpts}
                            gridPos={{ si, ai }}
                            registerRef={registerRef}
                            onGridNav={onGridNav}
                            onSave={data => handleSaveGrade(a.id, student, data)}
                            onOpenRubric={() => setRubricState({ assignment: a, student, grade: sg[a.id] || null })}
                          />
                        ))}
                        <td style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.08)", fontWeight: 700, color: TIER_COLORS[tier], fontSize: "0.77rem", padding: "0 0.3rem" }}>
                          {pct != null ? `${Math.round(pct)}%` : "—"}<TrendArrow trend={trend} belowPassing={pct != null && pct < 70} />
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 800, fontSize: "0.9rem", color: TIER_COLORS[tier], padding: "0 0.2rem" }}>
                          {pct != null ? letter : "—"}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700, fontSize: "0.75rem", color: "rgba(255,255,255,0.55)", padding: "0 0.2rem" }}>
                          {pct != null ? (gpaFromPct(pct, scale) ?? "—").toFixed?.(1) ?? "—" : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Class average row */}
                  <tr style={{ borderTop: "2px solid rgba(255,255,255,0.1)", background: "rgba(245,192,37,0.04)" }}>
                    <td style={{ padding: "0.3rem 0.6rem", fontWeight: 700, fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", position: "sticky", left: 0, background: "#111", zIndex: 1 }}>Class Avg</td>
                    {periodAssignments.map(a => {
                      const stats = assignmentStats(a, grades.filter(g => g.assignment_id === a.id));
                      return (
                        <td key={a.id} style={{ textAlign: "center", fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", padding: "0.3rem 0.3rem" }}>
                          {stats ? `${Math.round(stats.avg)}%` : "—"}
                        </td>
                      );
                    })}
                    <td colSpan={3} style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                      {(() => {
                        const avgs = sortedStudents.map(s => calcPeriodGrade(periodAssignments, gradeMap[s.id] || {}, categories, autoZeroOpts).pct).filter(Boolean);
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
            <button onClick={sortByDueDate} className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} title="Reorder assignments within each category by due date">↕ Sort by due date</button>
            <button onClick={() => { setEditingAssignment(null); setShowForm(true); }} className="btn btn-primary btn-sm">+ Add</button>
          </div>

          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.25rem" }}>
            Drag an assignment by its <strong>⠿</strong> handle to reorder it, or drop it on another category heading to move it there.
          </div>

          {showForm && !editingAssignment && <AssignmentForm categories={categories} period={period} onSave={handleAddAssignment} onClose={() => setShowForm(false)} />}
          {editingAssignment && <AssignmentForm initial={editingAssignment} categories={categories} period={period} onSave={handleUpdateAssignment} onClose={() => setEditingAssignment(null)} />}
          {cloneDraft && <AssignmentForm initial={cloneDraft} creating categories={categories} period={period} onSave={async d => { await handleAddAssignment(d); setCloneDraft(null); }} onClose={() => setCloneDraft(null)} />}

          {categories.map(cat => {
            const catAssignments = assignments.filter(a => a.grading_period === period && a.category === cat.name)
              .sort((a, b) => (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) || new Date(a.created_at) - new Date(b.created_at));
            return (
              <div key={cat.name}>
                <div
                  onDragOver={e => { if (dragId) e.preventDefault(); }}
                  onDrop={() => handleDropOnCategory(cat.name)}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem", marginTop: "0.5rem", padding: "0.2rem 0.3rem", borderRadius: 6, border: dragId ? "1px dashed rgba(245,192,37,0.4)" : "1px dashed transparent" }}>
                  <span style={{ color: cat.color, fontWeight: 800, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>■ {cat.name}</span>
                  <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>{cat.weight}%{cat.drop_lowest ? ` · drop lowest ${cat.drop_lowest}` : ""}</span>
                </div>
                {catAssignments.length === 0 ? (
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.25)", padding: "0.3rem 0.75rem" }}>No assignments yet</div>
                ) : (
                  catAssignments.map(a => {
                    const stats = assignmentStats(a, grades.filter(g => g.assignment_id === a.id));
                    return (
                      <div key={a.id}
                        onDragOver={e => { if (dragId && dragId !== a.id) e.preventDefault(); }}
                        onDrop={() => handleDropOnAssignment(a)}
                        style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.55rem 0.85rem", background: dragId === a.id ? "rgba(245,192,37,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${dragId === a.id ? "rgba(245,192,37,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 8, marginBottom: "0.35rem", flexWrap: "wrap" }}>
                        <span draggable onDragStart={() => setDragId(a.id)} onDragEnd={() => setDragId(null)} title="Drag to reorder" style={{ cursor: "grab", color: "rgba(255,255,255,0.3)", fontSize: "1rem", userSelect: "none" }}>⠿</span>
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
                          <button onClick={() => duplicateAssignment(a)} style={{ ...inp, cursor: "pointer", fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}>Duplicate</button>
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

      {/* ── MISSING WORK tab ────────────────────────────────────────────── */}
      {subTab === "missing" && (
        <GradebookMissingWork
          students={sortedStudents} assignments={assignments} gradeMap={gradeMap}
          period={period} setPeriod={setPeriod} autoZeroOpts={autoZeroOpts} user={user}
          onMark={(assignmentId, student, data) => handleSaveGrade(assignmentId, student, data)}
          onOpenStudent={setDetailStudent}
        />
      )}

      {/* ── ANALYTICS tab ───────────────────────────────────────────────── */}
      {subTab === "analytics" && (
        <GradebookAnalytics students={students} assignments={assignments} grades={grades} profiles={profiles} settings={settings} onOpenStudent={setDetailStudent} />
      )}

      {/* ── MOLE CREDITS tab ────────────────────────────────────────────── */}
      {subTab === "credits" && (
        <div style={{ padding: "1rem 0" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              🪙 Mole Dollar Grade Credits
            </p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>
              Automatically applied grade changes from approved Mole Dollar redemptions. Active quarter: Q{currentGradingPeriod}.
            </p>
          </div>
          {moleGradeCredits.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.82rem", padding: "2rem", textAlign: "center", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
              No grade credits applied yet. They appear here when you approve drop-lowest or Mole Dollar Bonus requests.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[...moleGradeCredits].reverse().map((credit, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.6rem 0.9rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: "#f4f4f5", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.15rem" }}>
                      {credit.studentName}
                      {" "}
                      <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>
                        {credit.type === "dropLowest" ? `· Drop ${credit.gradeCategory} · Q${credit.gradingPeriod}` : "· Mole Dollar Bonus"}
                      </span>
                    </p>
                    <p style={{ color: credit.result?.ok ? "#22c55e" : "rgba(255,255,255,0.35)", fontSize: "0.72rem" }}>
                      {credit.result?.ok
                        ? credit.type === "dropLowest"
                          ? `✓ Excused: ${credit.result.assignmentName}`
                          : `✓ Bonus total: ${credit.result.totalPoints} pts`
                        : credit.result?.reason === "no_supabase"
                          ? "Mock mode — will apply when connected to Supabase"
                          : `⚠ ${credit.result?.reason || "Pending"}`}
                    </p>
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", whiteSpace: "nowrap" }}>
                    {new Date(credit.appliedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
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
          onSave={async (rubric_scores, total, rubric_comments) => {
            await handleSaveGrade(rubricState.assignment.id, rubricState.student, {
              rubric_scores,
              rubric_comments: rubric_comments || {},
              points_earned: total,
            });
            setRubricState(null);
          }}
          onClose={() => setRubricState(null)}
        />
      )}

      {/* ── CSV import modal ──────────────────────────────────────────────── */}
      {importOpen && (
        <ImportGradesModal
          periodAssignments={periodAssignments}
          students={sortedStudents}
          periodLabel={PERIOD_LABELS[period]}
          onApply={applyImport}
          onClose={() => setImportOpen(false)}
        />
      )}

      {/* ── Student analytics & history modal ─────────────────────────────── */}
      {detailStudent && (
        <GradebookStudentDetail
          student={detailStudent}
          students={students}
          assignments={assignments}
          grades={grades}
          profiles={profiles}
          settings={settings}
          user={user}
          onClose={() => setDetailStudent(null)}
        />
      )}
    </div>
  );
}

// ── CSV grade import modal ────────────────────────────────────────────────────
function ImportGradesModal({ periodAssignments, students, periodLabel, onApply, onClose }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [applying, setApplying] = useState(false);

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setText(String(r.result || ""));
    r.readAsText(f);
  }

  function buildPreview() {
    const { headers, rows } = parseCSV(text);
    if (!headers.length) { setPreview({ error: "Couldn't parse any columns." }); return; }
    const skip = new Set(["period %", "period%", "letter"]);
    const byName = new Map(periodAssignments.map(a => [a.name.trim().toLowerCase(), a]));
    const colMap = headers.map((h, i) => (i === 0 || skip.has(h.trim().toLowerCase())) ? null : (byName.get(h.trim().toLowerCase()) || null));
    const unmatchedCols = headers.filter((h, i) => i > 0 && !skip.has(h.trim().toLowerCase()) && !colMap[i]);

    const norm = s => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
    const lookup = new Map();
    students.forEach(s => {
      lookup.set(norm(`${s.lastName}, ${s.firstName}`), s);
      lookup.set(norm(`${s.firstName} ${s.lastName}`), s);
      lookup.set(norm(`${s.lastName} ${s.firstName}`), s);
      if (s.id) lookup.set(norm(s.id), s);
    });

    const updates = [];
    let matchedStudents = 0;
    const unmatchedRows = [];
    rows.forEach(r => {
      const st = lookup.get(norm(r[0]));
      if (!st) { if ((r[0] || "").trim()) unmatchedRows.push(r[0]); return; }
      matchedStudents++;
      colMap.forEach((a, i) => {
        if (!a) return;
        const raw = (r[i] ?? "").trim();
        if (raw === "") return;
        const low = raw.toLowerCase();
        if (low === "exc" || low === "excused") updates.push({ assignmentId: a.id, student: st, data: { excused: true, missing: false, points_earned: null } });
        else if (low === "mis" || low === "missing") updates.push({ assignmentId: a.id, student: st, data: { missing: true, excused: false, points_earned: null } });
        else if (!isNaN(Number(raw))) updates.push({ assignmentId: a.id, student: st, data: { points_earned: Number(raw), missing: false, excused: false } });
      });
    });
    setPreview({ updates, matchedCols: colMap.filter(Boolean).length, unmatchedCols, matchedStudents, unmatchedRows });
  }

  async function apply() {
    if (!preview?.updates?.length) return;
    setApplying(true);
    await onApply(preview.updates);
  }

  const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.4rem 0.6rem", color: "#fff", fontSize: "0.82rem", outline: "none" };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: "min(640px, 95vw)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Import Grades — {periodLabel}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
        </div>
        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
          Columns are matched to assignments <strong>by name</strong>; rows are matched to students by
          “Last, First”. Cell values can be a number, <strong>EXC</strong>, or <strong>MIS</strong>; blanks are skipped.
          Tip: use <strong>⬇ CSV</strong> to export a template first.
        </div>
        <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ ...inp, width: "100%", boxSizing: "border-box", marginBottom: "0.5rem" }} />
        <textarea value={text} onChange={e => { setText(e.target.value); setPreview(null); }} placeholder="…or paste CSV here" style={{ ...inp, width: "100%", boxSizing: "border-box", minHeight: 110, resize: "vertical", fontFamily: "monospace", marginBottom: "0.5rem" }} />

        {preview?.error && <div style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: "0.5rem" }}>{preview.error}</div>}
        {preview && !preview.error && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "0.6rem 0.85rem", marginBottom: "0.6rem", fontSize: "0.8rem" }}>
            <div>✓ {preview.matchedStudents} students matched · {preview.matchedCols} assignment columns matched · <strong style={{ color: GOLD }}>{preview.updates.length}</strong> scores to import</div>
            {preview.unmatchedCols.length > 0 && <div style={{ color: "#f97316", marginTop: 4 }}>Unmatched columns (skipped): {preview.unmatchedCols.join(", ")}</div>}
            {preview.unmatchedRows.length > 0 && <div style={{ color: "#f97316", marginTop: 4 }}>Unmatched students (skipped): {preview.unmatchedRows.slice(0, 6).join(", ")}{preview.unmatchedRows.length > 6 ? "…" : ""}</div>}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...inp, cursor: "pointer" }}>Cancel</button>
          {!preview || preview.error
            ? <button onClick={buildPreview} disabled={!text.trim()} style={{ background: text.trim() ? GOLD : "rgba(255,255,255,0.1)", border: "none", color: text.trim() ? "#000" : "rgba(255,255,255,0.3)", fontWeight: 700, borderRadius: 6, padding: "0.4rem 1.25rem", cursor: text.trim() ? "pointer" : "not-allowed" }}>Preview</button>
            : <button onClick={apply} disabled={applying || !preview.updates.length} style={{ background: preview.updates.length ? GOLD : "rgba(255,255,255,0.1)", border: "none", color: "#000", fontWeight: 700, borderRadius: 6, padding: "0.4rem 1.25rem", cursor: "pointer" }}>{applying ? "Importing…" : `Import ${preview.updates.length} scores`}</button>}
        </div>
      </div>
    </div>
  );
}
