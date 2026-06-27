import { useState, useEffect } from "react";
import { GOLD } from "../constants.js";
import { useGmailSend } from "../supabase.js";
import {
  calcPeriodGrade, calcSemesterGrade, letterGrade, gradeTrend,
  DEFAULT_SCALE, DEFAULT_PERIOD_WEIGHTS,
} from "../gradebook.js";
import { PERIOD_LABELS, PERIOD_KEYS, TIER_COLORS, cellColor } from "./gradebook-constants.js";
import TrendArrow from "./GradebookTrendArrow.jsx";

export default function GradebookReports({ students, assignments, grades, profiles, settings, user }) {
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

  // Derive search results as a side-effect of search/roster changes.
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
                const { pct } = studentGradeForPeriod(selectedStudent, p);
                const letter = letterGrade(pct, scale);
                const tier = pct == null ? "ungraded" : pct >= 90 ? "a" : pct >= 80 ? "b" : pct >= 70 ? "c" : pct >= 60 ? "d" : "f";
                const pAssignments = assignments.filter(a => a.grading_period === p);
                const pGradeMap = Object.fromEntries(grades.filter(g => g.student_id === selectedStudent.id).map(g => [g.assignment_id, g]));
                const trend = gradeTrend(pAssignments, pGradeMap);
                return (
                  <div key={p} style={{ background: cellColor(pct), border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8, padding: "0.7rem 0.75rem", textAlign: "center" }}>
                    <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{PERIOD_LABELS[p]}</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TIER_COLORS[tier] || "#fff", lineHeight: 1 }}>
                      {pct != null ? letter : "—"}<TrendArrow trend={trend} belowPassing={pct != null && pct < 70} />
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{pct != null ? `${Math.round(pct)}%` : "No data"}</div>
                  </div>
                );
              })}
            </div>

            {/* Semester average */}
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

            {/* Feedback & rubric comments */}
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

      {/* At-Risk students */}
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
