import { useState, useMemo } from "react";
import { GOLD } from "../constants.js";
import { useGmailSend } from "../supabase.js";
import { missingItemsFor } from "../gradebook.js";

const PERIOD_LABELS = { 1: "Period 1", 2: "Period 2", 3: "Period 3", 4: "Period 4", 5: "Midterm", 6: "Final" };

// Consolidated missing / past-due-blank work across the whole roster, with one-click
// outreach to parents and students. Reuses the calc-engine `missingItemsFor` helper and
// the Gmail-send + mailto fallback pattern from the Reports tab.
export default function GradebookMissingWork({ students, assignments, gradeMap, period, setPeriod, autoZeroOpts, user, onMark, onOpenStudent }) {
  const nameLink = { cursor: "pointer", borderBottom: "1px dotted rgba(245,192,37,0.5)" };
  const [groupBy, setGroupBy] = useState("student"); // "student" | "assignment"
  const [allPeriods, setAllPeriods] = useState(false);
  const [pastDueOnly, setPastDueOnly] = useState(false);
  const { sendEmail, requestGmailToken } = useGmailSend();

  const periodAssignments = useMemo(() =>
    assignments.filter(a => allPeriods || a.grading_period === period),
    [assignments, period, allPeriods]
  );

  // Build the flat list of missing items per student.
  const rows = useMemo(() => {
    const out = [];
    for (const s of students) {
      const sg = gradeMap[s.id] || {};
      const items = missingItemsFor(periodAssignments, sg, autoZeroOpts);
      for (const it of items) {
        if (pastDueOnly && it.status !== "pastdue-blank") continue;
        out.push({ student: s, assignment: it.assignment, status: it.status });
      }
    }
    return out;
  }, [students, periodAssignments, gradeMap, autoZeroOpts, pastDueOnly]);

  const studentsWithMissing = new Set(rows.map(r => r.student.id)).size;

  async function emailMissing(student, target) {
    const items = rows.filter(r => r.student.id === student.id);
    if (!items.length) return;
    const to = target === "student" ? (student.studentEmail || student.parentEmail) : student.parentEmail;
    if (!to) return;
    const greeting = target === "student"
      ? `Hi ${student.firstName},`
      : `Dear Parent/Guardian of ${student.firstName} ${student.lastName},`;
    const body = [
      greeting,
      "",
      `The following assignments are currently missing or past due:`,
      "",
      ...items.map(it => `  • ${it.assignment.name}${it.assignment.due_date ? ` (due ${it.assignment.due_date})` : ""} — ${it.assignment.category}`),
      "",
      `Please turn in this work as soon as possible. Reply to this email with any questions.`,
      "",
      "Thank you,",
      `${user?.name || "Your Teacher"}`,
      "James A. Garfield High School",
    ].join("\n");
    const subject = `Missing Work — ${student.firstName} ${student.lastName}`;
    try {
      const token = await requestGmailToken();
      await sendEmail(token, { to, from: user?.email, subject, body });
    } catch {
      window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    }
  }

  const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.3rem 0.65rem", color: "#fff", fontSize: "0.78rem", outline: "none", cursor: "pointer" };
  const statusTag = status => status === "missing"
    ? <span className="tag tag-red" style={{ fontSize: "0.62rem" }}>MISSING</span>
    : <span className="tag tag-amber" style={{ fontSize: "0.62rem" }}>PAST DUE</span>;

  // Per-row quick actions (mark Missing / Excused).
  function RowActions({ student, assignment }) {
    return (
      <div style={{ display: "flex", gap: "0.3rem" }}>
        <button onClick={() => onMark(assignment.id, student, { missing: true, excused: false, points_earned: null })} style={{ ...inp, fontSize: "0.7rem", padding: "0.2rem 0.5rem", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }} title="Record as Missing (0)">Missing</button>
        <button onClick={() => onMark(assignment.id, student, { excused: true, missing: false, points_earned: null })} style={{ ...inp, fontSize: "0.7rem", padding: "0.2rem 0.5rem" }} title="Excuse this assignment">Excuse</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Controls */}
      <div className="card">
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
          {[1,2,3,4,5,6].map(p => (
            <button key={p} disabled={allPeriods} onClick={() => setPeriod(p)} style={{
              background: !allPeriods && period === p ? GOLD : "rgba(255,255,255,0.06)",
              border: !allPeriods && period === p ? "none" : "1px solid rgba(255,255,255,0.12)",
              color: allPeriods ? "rgba(255,255,255,0.3)" : (period === p ? "#000" : "rgba(255,255,255,0.6)"),
              borderRadius: 6, padding: "0.3rem 0.7rem", cursor: allPeriods ? "default" : "pointer", fontWeight: 700, fontSize: "0.78rem",
            }}>{p <= 4 ? `P${p}` : p === 5 ? "Mid" : "Final"}</button>
          ))}
          <label style={{ fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginLeft: "0.5rem" }}>
            <input type="checkbox" checked={allPeriods} onChange={e => setAllPeriods(e.target.checked)} /> All periods
          </label>
          <label style={{ fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <input type="checkbox" checked={pastDueOnly} onChange={e => setPastDueOnly(e.target.checked)} /> Past-due only
          </label>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.3rem" }}>
            <button onClick={() => setGroupBy("student")} style={{ ...inp, background: groupBy === "student" ? GOLD : "rgba(255,255,255,0.06)", color: groupBy === "student" ? "#000" : "rgba(255,255,255,0.6)", fontWeight: 700 }}>By student</button>
            <button onClick={() => setGroupBy("assignment")} style={{ ...inp, background: groupBy === "assignment" ? GOLD : "rgba(255,255,255,0.06)", color: groupBy === "assignment" ? "#000" : "rgba(255,255,255,0.6)", fontWeight: 700 }}>By assignment</button>
          </div>
        </div>
        {/* Summary */}
        <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
          <div><span style={{ fontWeight: 800, fontSize: "1.2rem", color: GOLD }}>{rows.length}</span> <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>missing items</span></div>
          <div><span style={{ fontWeight: 800, fontSize: "1.2rem" }}>{studentsWithMissing}</span> <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>students affected</span></div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>
          🎉 No missing work {allPeriods ? "across all periods" : `for ${PERIOD_LABELS[period]}`}
          {pastDueOnly ? " (past-due filter on)" : ""}.
        </div>
      ) : groupBy === "student" ? (
        // ── Grouped by student ──
        students.filter(s => rows.some(r => r.student.id === s.id)).map(s => {
          const items = rows.filter(r => r.student.id === s.id);
          return (
            <div key={s.id} className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ fontWeight: 700 }}>
                  <span onClick={() => onOpenStudent?.(s)} title="Open full analytics" style={nameLink}>{s.lastName}, {s.firstName}</span> <span className="tag tag-amber" style={{ fontSize: "0.62rem" }}>{s.grade}</span>
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.78rem", color: "#ef4444" }}>{items.length} missing</span>
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {s.parentEmail && <button onClick={() => emailMissing(s, "parent")} style={{ ...inp, color: GOLD, border: "1px solid rgba(245,192,37,0.3)", fontSize: "0.74rem" }}>📧 Parent</button>}
                  {(s.studentEmail || s.parentEmail) && <button onClick={() => emailMissing(s, "student")} style={{ ...inp, color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)", fontSize: "0.74rem" }}>📧 Student</button>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {items.map(it => (
                  <div key={it.assignment.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0.6rem", background: "rgba(255,255,255,0.03)", borderRadius: 6, gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.82rem" }}>{it.assignment.name} <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem" }}>· {it.assignment.category}{it.assignment.due_date ? ` · due ${it.assignment.due_date}` : ""}</span></span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>{statusTag(it.status)}<RowActions student={s} assignment={it.assignment} /></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        // ── Grouped by assignment ──
        Array.from(new Set(rows.map(r => r.assignment.id))).map(aid => {
          const items = rows.filter(r => r.assignment.id === aid);
          const a = items[0].assignment;
          return (
            <div key={aid} className="card">
              <div style={{ fontWeight: 700, marginBottom: "0.6rem" }}>
                {a.name} <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.4)" }}>· {a.category} · {PERIOD_LABELS[a.grading_period]}{a.due_date ? ` · due ${a.due_date}` : ""}</span>
                <span style={{ marginLeft: "0.5rem", fontSize: "0.78rem", color: "#ef4444" }}>{items.length} missing</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {items.map(it => (
                  <div key={it.student.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0.6rem", background: "rgba(255,255,255,0.03)", borderRadius: 6, gap: "0.5rem", flexWrap: "wrap" }}>
                    <span onClick={() => onOpenStudent?.(it.student)} title="Open full analytics" style={{ fontSize: "0.82rem", ...nameLink }}>{it.student.lastName}, {it.student.firstName}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>{statusTag(it.status)}<RowActions student={it.student} assignment={a} /></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
