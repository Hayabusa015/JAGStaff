import { useState, useMemo, useCallback, useRef } from "react";
import { GOLD } from "../constants.js";
import { useGradebook, useClassroomSync, useGmailSend } from "../supabase.js";
import { useApp as useClassroomApp } from "../classroom/ClassroomContext.jsx";
import {
  calcPeriodGrade, letterGrade, gradePct, assignmentStats,
  DEFAULT_SCALE, gradeTrend, gpaFromPct,
} from "../gradebook.js";
import { toCSV, downloadCSV } from "../csv.js";
import { PERIOD_LABELS, TIER_COLORS } from "./gradebook-constants.js";
import TrendArrow from "./GradebookTrendArrow.jsx";
import AssignmentForm from "./GradebookAssignmentForm.jsx";
import GradeCell from "./GradebookGradeCell.jsx";
import GradebookReports from "./GradebookReports.jsx";
import ImportGradesModal from "./GradebookImportModal.jsx";
import GradebookSettings from "./GradebookSettings.jsx";
import GradebookRubric from "./GradebookRubric.jsx";
import GradebookMissingWork from "./GradebookMissingWork.jsx";
import GradebookAnalytics from "./GradebookAnalytics.jsx";
import GradebookStudentDetail from "./GradebookStudentDetail.jsx";

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
  const categories = useMemo(() => activeProfile?.categories || [], [activeProfile]);
  const scale = settings?.grading_scale || DEFAULT_SCALE;
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

  const sortedStudents = sectionStudents;

  async function handleSaveGrade(assignmentId, student, data) {
    const assignment = assignments.find(a => a.id === assignmentId);
    await saveGrade(assignmentId, student.id, `${student.firstName} ${student.lastName}`, data);

    // Auto-email parent on fail. Use the effective grade % (factors in retakes,
    // rubric scores, late penalties) — not the raw points_earned/max_points.
    if (assignment && student.parentEmail && settings?.auto_email_fail !== false) {
      const pct = gradePct(data, assignment, autoZeroOpts);
      if (pct != null && pct < 60 && assignment.category !== "Homework") {
        const body = `Dear Parent/Guardian,\n\n${student.firstName} ${student.lastName} received a failing grade on "${assignment.name}" (${Math.round(pct)}%).\n\nPlease reach out if you have questions.\n\n— ${user?.name}, ${user?.email}`;
        try {
          const token = await requestGmailToken();
          await sendEmail(token, { to: student.parentEmail, from: user?.email, subject: `Failing Grade Notice — ${student.firstName} ${student.lastName}`, body });
        } catch (err) {
          console.warn("Failing-grade auto-email did not send:", err);
        }
      }
    }
  }

  async function handleAddAssignment(data) {
    const { selectedSections, ...rest } = data;
    if (!selectedSections || selectedSections.length === 0) {
      await addAssignment({ ...rest, section: null });
    } else {
      await Promise.all(selectedSections.map(sec => addAssignment({ ...rest, section: sec })));
    }
    setShowForm(false);
  }

  async function handleUpdateAssignment(data) {
    const { selectedSections, ...rest } = data;
    const section = selectedSections?.length ? selectedSections[0] : null;
    await updateAssignment(editingAssignment.id, { ...rest, section });
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

  // ── CSV export (current period grid) ──────────────────────────────────────
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
        {[
          { key: "grades", label: "Grades" },
          { key: "classes", label: "Classes" },
          { key: "assignments", label: "Assignments" },
          { key: "missing", label: "Missing Work" },
          { key: "analytics", label: "📊 Analytics" },
          { key: "reports", label: "Reports" },
          { key: "credits", label: `🪙 Credits${moleGradeCredits.length ? ` (${moleGradeCredits.length})` : ""}` },
          { key: "settings", label: "⚙ Settings" },
        ].map(t => (
          <button key={t.key} className={`btn btn-sm ${subTab === t.key ? "btn-primary" : "btn-ghost"}`} onClick={() => setSubTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── GRADES tab ──────────────────────────────────────────────────── */}
      {subTab === "grades" && (
        <div>
          {showForm && <div style={{ marginBottom: "1rem" }}><AssignmentForm sections={sections} defaultSection={activeSection} categories={categories} period={period} onSave={handleAddAssignment} onClose={() => setShowForm(false)} /></div>}

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

      {/* ── CLASSES tab ─────────────────────────────────────────────────── */}
      {subTab === "classes" && (
        <div>
          {/* Period selector */}
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {[1,2,3,4,5,6].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ background: period === p ? GOLD : "rgba(255,255,255,0.06)", border: period === p ? "none" : "1px solid rgba(255,255,255,0.12)", color: period === p ? "#000" : "rgba(255,255,255,0.6)", borderRadius: 6, padding: "0.3rem 0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>
                {p <= 4 ? `P${p}` : p === 5 ? "Mid" : "Final"}
              </button>
            ))}
          </div>

          {sections.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🏫</div>
              <div style={{ fontWeight: 700, marginBottom: "0.4rem", color: "rgba(255,255,255,0.7)" }}>No class sections set up yet</div>
              <div style={{ fontSize: "0.83rem", lineHeight: 1.6 }}>
                Add a <strong style={{ color: GOLD }}>Section</strong> value to students in the Student Roster
                (e.g. "P1 · Biology") to see per-class breakdowns here.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {sections.map(sec => {
                const secStudents = students
                  .filter(s => s.section === sec)
                  .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
                const secAssignments = assignments.filter(
                  a => a.grading_period === period && (!a.section || a.section === sec)
                );
                const studentGrades = secStudents.map(s => {
                  const sg = gradeMap[s.id] || {};
                  const { pct } = calcPeriodGrade(secAssignments, sg, categories, autoZeroOpts);
                  return { s, pct, letter: letterGrade(pct, scale) };
                });
                const gradedPcts = studentGrades.map(g => g.pct).filter(v => v != null);
                const classAvg = gradedPcts.length
                  ? gradedPcts.reduce((a, b) => a + b, 0) / gradedPcts.length
                  : null;

                return (
                  <div key={sec} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
                    {/* Section header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 0.85rem", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ fontWeight: 800, fontSize: "0.92rem" }}>{sec}</span>
                        <span style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, padding: "0.1rem 0.5rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
                          {secStudents.length} student{secStudents.length !== 1 ? "s" : ""}
                        </span>
                        {classAvg != null && (
                          <span style={{ background: "rgba(245,192,37,0.15)", border: "1px solid rgba(245,192,37,0.35)", borderRadius: 99, padding: "0.1rem 0.55rem", fontSize: "0.72rem", color: GOLD, fontWeight: 700 }}>
                            {PERIOD_LABELS[period]} avg: {Math.round(classAvg)}%
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => { setActiveSection(sec); setSubTab("grades"); }}
                        style={{ background: "none", border: `1px solid rgba(245,192,37,0.35)`, color: GOLD, borderRadius: 6, padding: "0.22rem 0.7rem", cursor: "pointer", fontWeight: 700, fontSize: "0.74rem" }}
                      >
                        View Full Grades →
                      </button>
                    </div>

                    {/* Student rows */}
                    {secStudents.length === 0 ? (
                      <div style={{ padding: "0.75rem 0.85rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.35)" }}>No students in this section.</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            <th style={{ padding: "0.35rem 0.85rem", textAlign: "left", fontWeight: 600, fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", width: "40%" }}>Last Name</th>
                            <th style={{ padding: "0.35rem 0.5rem", textAlign: "left", fontWeight: 600, fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", width: "35%" }}>First Name</th>
                            <th style={{ padding: "0.35rem 0.5rem", textAlign: "center", fontWeight: 600, fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", width: "13%" }}>{PERIOD_LABELS[period]}</th>
                            <th style={{ padding: "0.35rem 0.85rem", textAlign: "center", fontWeight: 600, fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", width: "12%" }}>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentGrades.map(({ s, pct, letter }) => {
                            const tier = pct == null ? "ungraded" : pct >= 90 ? "a" : pct >= 80 ? "b" : pct >= 70 ? "c" : pct >= 60 ? "d" : "f";
                            return (
                              <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <td style={{ padding: "0.3rem 0.85rem", fontWeight: 600 }}>{s.lastName}</td>
                                <td style={{ padding: "0.3rem 0.5rem" }}>{s.firstName}</td>
                                <td style={{ padding: "0.3rem 0.5rem", textAlign: "center", color: TIER_COLORS[tier], fontWeight: 700 }}>
                                  {pct != null ? `${Math.round(pct)}%` : "—"}
                                </td>
                                <td style={{ padding: "0.3rem 0.85rem", textAlign: "center", fontWeight: 800, color: TIER_COLORS[tier], fontSize: "0.88rem" }}>
                                  {pct != null ? letter : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
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

          {showForm && !editingAssignment && <AssignmentForm sections={sections} defaultSection={activeSection} categories={categories} period={period} onSave={handleAddAssignment} onClose={() => setShowForm(false)} />}
          {editingAssignment && <AssignmentForm initial={editingAssignment} sections={sections} defaultSection={activeSection} categories={categories} period={period} onSave={handleUpdateAssignment} onClose={() => setEditingAssignment(null)} />}
          {cloneDraft && <AssignmentForm initial={cloneDraft} creating sections={sections} defaultSection={activeSection} categories={categories} period={period} onSave={async d => { await handleAddAssignment(d); setCloneDraft(null); }} onClose={() => setCloneDraft(null)} />}

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
