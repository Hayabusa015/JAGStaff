import { useState } from "react";
import { GOLD } from "../constants.js";
import { calcPeriodGrade, letterGrade } from "../gradebook.js";
import { PERIOD_LABELS } from "./gradebook-constants.js";

// "Classes" tab: per-section breakdown of the teacher's OWN gradebook roster,
// plus the roster-management actions (move/remove) that make "my roster" a
// real, editable thing instead of a read-only slice of the whole school.
export default function GradebookClasses({
  period, setPeriod, students, gradeMap, assignments, categories, autoZeroOpts, scale,
  sections, onMove, onRemove, onOpenSync, onOpenAddStudent,
}) {
  const [moveMenuFor, setMoveMenuFor] = useState(null);

  const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.35rem 0.6rem", color: "#fff", fontSize: "0.82rem", outline: "none" };

  return (
    <div>
      {/* Period selector + roster actions */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        {[1,2,3,4,5,6].map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{ background: period === p ? GOLD : "rgba(255,255,255,0.06)", border: period === p ? "none" : "1px solid rgba(255,255,255,0.12)", color: period === p ? "#000" : "rgba(255,255,255,0.6)", borderRadius: 6, padding: "0.3rem 0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>
            {p <= 4 ? `P${p}` : p === 5 ? "Mid" : "Final"}
          </button>
        ))}
        <button onClick={onOpenSync}
          style={{ marginLeft: "auto", background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.35)", color: "#7aacf8", borderRadius: 6, padding: "0.3rem 0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
          title="Add students from a Google Classroom course to your roster — never removes anyone or touches grades">
          <svg width="13" height="13" viewBox="0 0 48 48" style={{ flexShrink: 0 }}><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.4 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.9 6.1C12.6 13 17.9 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.8-2.1 5.1-4.4 6.7l6.9 5.4c4-3.7 6.2-9.2 6.2-16.1z"/><path fill="#FBBC05" d="M10.7 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.4 13.3A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.2-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-6.9-5.4c-2.1 1.4-4.8 2.3-8.3 2.3-6.1 0-11.4-4-13.3-9.4l-8.2 6.1C6.6 42.5 14.7 48 24 48z"/></svg>
          Sync from Classroom
        </button>
        <button onClick={onOpenAddStudent} className="btn btn-sm btn-ghost">+ Add Student</button>
      </div>

      {students.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🎓</div>
          <div style={{ fontWeight: 700, marginBottom: "0.4rem", color: "rgba(255,255,255,0.7)" }}>Your gradebook roster is empty</div>
          <div style={{ fontSize: "0.83rem", lineHeight: 1.6, marginBottom: "1rem" }}>
            This is <em>your</em> gradebook now, not the whole school's. Sync a class from Google Classroom,
            or add students one at a time from the shared school roster.
          </div>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            <button onClick={onOpenSync} style={{ background: GOLD, border: "none", color: "#000", fontWeight: 700, borderRadius: 8, padding: "0.5rem 1.1rem", cursor: "pointer" }}>Sync from Classroom</button>
            <button onClick={onOpenAddStudent} className="btn btn-ghost btn-sm">+ Add Student</button>
          </div>
        </div>
      ) : (
        <ClassGroups
          period={period} students={students} gradeMap={gradeMap} assignments={assignments} categories={categories}
          autoZeroOpts={autoZeroOpts} scale={scale} sections={sections}
          moveMenuFor={moveMenuFor} setMoveMenuFor={setMoveMenuFor}
          onMove={onMove} onRemove={onRemove} inp={inp}
        />
      )}
    </div>
  );
}

function ClassGroups({ period, students, gradeMap, assignments, categories, autoZeroOpts, scale, sections, moveMenuFor, setMoveMenuFor, onMove, onRemove, inp }) {
  const groups = [...sections, "Unassigned"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {groups.map(label => {
        const isUnassigned = label === "Unassigned";
        const groupStudents = students
          .filter(s => (isUnassigned ? !s.section : s.section === label))
          .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
        if (groupStudents.length === 0) return null;

        const secAssignments = assignments.filter(a => a.grading_period === period && (!a.section || a.section === label));
        const rows = groupStudents.map(s => {
          const { pct } = calcPeriodGrade(secAssignments, gradeMap[s.id] || {}, categories, autoZeroOpts);
          return { s, pct, letter: letterGrade(pct, scale) };
        });
        const gradedPcts = rows.map(r => r.pct).filter(v => v != null);
        const classAvg = gradedPcts.length ? gradedPcts.reduce((a, b) => a + b, 0) / gradedPcts.length : null;

        return (
          <div key={label} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 0.85rem", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontWeight: 800, fontSize: "0.92rem", color: isUnassigned ? "rgba(255,255,255,0.5)" : "#fff" }}>{label}</span>
                <span style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, padding: "0.1rem 0.5rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
                  {groupStudents.length} student{groupStudents.length !== 1 ? "s" : ""}
                </span>
                {classAvg != null && (
                  <span style={{ background: "rgba(245,192,37,0.15)", border: "1px solid rgba(245,192,37,0.35)", borderRadius: 99, padding: "0.1rem 0.55rem", fontSize: "0.72rem", color: GOLD, fontWeight: 700 }}>
                    {PERIOD_LABELS[period]} avg: {Math.round(classAvg)}%
                  </span>
                )}
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <th style={{ padding: "0.35rem 0.85rem", textAlign: "left", fontWeight: 600, fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Last Name</th>
                  <th style={{ padding: "0.35rem 0.5rem", textAlign: "left", fontWeight: 600, fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>First Name</th>
                  <th style={{ padding: "0.35rem 0.5rem", textAlign: "center", fontWeight: 600, fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>{PERIOD_LABELS[period]}</th>
                  <th style={{ padding: "0.35rem 0.5rem", textAlign: "center", fontWeight: 600, fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Grade</th>
                  <th style={{ padding: "0.35rem 0.85rem", textAlign: "right", fontWeight: 600, fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, pct, letter }) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "0.3rem 0.85rem", fontWeight: 600 }}>{s.lastName}</td>
                    <td style={{ padding: "0.3rem 0.5rem" }}>{s.firstName}</td>
                    <td style={{ padding: "0.3rem 0.5rem", textAlign: "center", fontWeight: 700 }}>{pct != null ? `${Math.round(pct)}%` : "—"}</td>
                    <td style={{ padding: "0.3rem 0.5rem", textAlign: "center", fontWeight: 800, fontSize: "0.88rem" }}>{pct != null ? letter : "—"}</td>
                    <td style={{ padding: "0.3rem 0.85rem", textAlign: "right", position: "relative" }}>
                      <button onClick={() => setMoveMenuFor(moveMenuFor === s.id ? null : s.id)} style={{ ...inp, cursor: "pointer", fontSize: "0.72rem", padding: "0.2rem 0.55rem", marginRight: "0.3rem" }}>Move…</button>
                      <button onClick={() => { if (confirm(`Remove ${s.firstName} ${s.lastName} from your gradebook?\n\nThis only removes them from your roster — their student record and any grades you've entered stay in the system, and you can add them back any time.`)) onRemove(s.id); }}
                        style={{ ...inp, cursor: "pointer", fontSize: "0.72rem", padding: "0.2rem 0.55rem", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>Remove</button>
                      {moveMenuFor === s.id && (
                        <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "100%", right: "0.85rem", zIndex: 30, background: "#1a1400", border: `1px solid ${GOLD}`, borderRadius: 7, padding: "0.4rem", minWidth: 160, textAlign: "left", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
                          {sections.filter(sec => sec !== label).map(sec => (
                            <button key={sec} onClick={() => { onMove(s.id, sec); setMoveMenuFor(null); }} style={{ ...inp, display: "block", width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 3, fontSize: "0.74rem" }}>{sec}</button>
                          ))}
                          <button onClick={() => {
                            const v = prompt("New class/section name:");
                            if (v && v.trim()) { onMove(s.id, v.trim()); setMoveMenuFor(null); }
                          }} style={{ ...inp, display: "block", width: "100%", textAlign: "left", cursor: "pointer", marginBottom: sections.length ? 3 : 0, fontSize: "0.74rem" }}>+ New class…</button>
                          {!isUnassigned && (
                            <button onClick={() => { onMove(s.id, null); setMoveMenuFor(null); }} style={{ ...inp, display: "block", width: "100%", textAlign: "left", cursor: "pointer", marginTop: 3, fontSize: "0.74rem", color: "rgba(255,255,255,0.5)" }}>Unassign</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
