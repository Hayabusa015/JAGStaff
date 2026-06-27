import { useState, useMemo } from "react";
import { GOLD } from "../constants.js";
import {
  calcPeriodGrade, calcSemesterGrade, letterGrade, gradePct, assignmentStats,
  gradeTrend, missingItemsFor, gpaFromPct, DEFAULT_SCALE, DEFAULT_PERIOD_WEIGHTS,
} from "../gradebook.js";
import { mean, median, tierColor, Kpi, HBar, VBars, LineChart, Card, RankList, Empty } from "./charts.jsx";

const PERIOD_LABELS = { 1: "Period 1", 2: "Period 2", 3: "Period 3", 4: "Period 4", 5: "Midterm", 6: "Final" };
const PERIOD_SHORT  = { 1: "P1", 2: "P2", 3: "P3", 4: "P4", 5: "Mid", 6: "Fin" };
const PERIOD_KEYS   = { 1: 1, 2: 2, 3: 3, 4: 4, 5: "midterm", 6: "final" };
const DIST_COLORS   = { A: "#22c55e", B: "#84cc16", C: "#eab308", D: "#f97316", F: "#ef4444" };

// ── Main analytics view ──────────────────────────────────────────────────────
export default function GradebookAnalytics({ students, assignments, grades, profiles, settings, onOpenStudent }) {
  const [view, setView] = useState("semester"); // 1-6 (period) or "semester"

  const activeProfile = profiles.find(p => p.is_active) || profiles[0] || null;
  const categories = useMemo(() => activeProfile?.categories || [], [activeProfile]);
  const scale = settings?.grading_scale || DEFAULT_SCALE;
  const periodWeights = settings?.period_weights || DEFAULT_PERIOD_WEIGHTS;
  const autoZeroOpts = useMemo(() => ({
    autoZeroMissing: settings?.auto_zero_missing ?? false,
    graceDays: settings?.auto_zero_grace_days ?? 0,
    today: new Date(),
  }), [settings?.auto_zero_missing, settings?.auto_zero_grace_days]);

  const gradeMaps = useMemo(() => {
    const m = {};
    grades.forEach(g => { (m[g.student_id] ||= {})[g.assignment_id] = g; });
    return m;
  }, [grades]);

  const isSemester = view === "semester";

  // Assignments in scope for category / assignment / missing breakdowns.
  const scopeAssignments = useMemo(() =>
    isSemester ? assignments : assignments.filter(a => a.grading_period === view),
    [assignments, view, isSemester]
  );

  function periodPct(studentId, p) {
    const pa = assignments.filter(a => a.grading_period === p);
    return calcPeriodGrade(pa, gradeMaps[studentId] || {}, categories, autoZeroOpts).pct;
  }
  function semesterPct(studentId) {
    const pcts = {};
    [1, 2, 3, 4, 5, 6].forEach(p => { pcts[PERIOD_KEYS[p]] = periodPct(studentId, p); });
    return calcSemesterGrade(pcts, periodWeights);
  }

  // Each student's current-view percentage.
  const studentScores = useMemo(() =>
    students.map(s => ({ student: s, pct: isSemester ? semesterPct(s.id) : periodPct(s.id, view) }))
      .filter(x => x.pct != null)
      .sort((a, b) => b.pct - a.pct),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [students, view, gradeMaps, categories, autoZeroOpts, periodWeights]
  );

  const allPcts = studentScores.map(x => x.pct);
  const classMean = mean(allPcts);
  const classMedian = median(allPcts);
  const passCount = allPcts.filter(p => p >= 60).length;
  const atRisk = studentScores.filter(x => x.pct < 70);

  // Completion: graded/marked cells vs total cells in scope.
  const completion = useMemo(() => {
    let filled = 0, total = 0;
    for (const s of students) {
      const sg = gradeMaps[s.id] || {};
      for (const a of scopeAssignments) {
        total++;
        const g = sg[a.id];
        if (g && (g.points_earned != null || g.missing || g.excused || g.rubric_scores)) filled++;
      }
    }
    return { filled, total, pct: total ? (filled / total) * 100 : null };
  }, [students, scopeAssignments, gradeMaps]);

  // Grade distribution (A-F) for current view.
  const distribution = useMemo(() => {
    const d = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    allPcts.forEach(p => { const l = letterGrade(p, scale)[0]; if (d[l] != null) d[l]++; });
    return d;
  }, [allPcts, scale]);

  // Histogram of student averages in 10-point bins.
  const histogram = useMemo(() => {
    const bins = [0, 0, 0, 0, 0, 0]; // <50, 50s, 60s, 70s, 80s, 90-100
    allPcts.forEach(p => {
      const idx = p >= 90 ? 5 : p >= 80 ? 4 : p >= 70 ? 3 : p >= 60 ? 2 : p >= 50 ? 1 : 0;
      bins[idx]++;
    });
    const labels = ["<50", "50s", "60s", "70s", "80s", "90+"];
    const colors = ["#ef4444", "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];
    return bins.map((value, i) => ({ label: labels[i], value, color: colors[i] }));
  }, [allPcts]);

  // Category averages across the class (scope).
  const categoryStats = useMemo(() =>
    categories.map(cat => {
      const catAssign = scopeAssignments.filter(a => a.category === cat.name && !a.extra_credit);
      const pcts = [];
      for (const s of students) {
        const sg = gradeMaps[s.id] || {};
        for (const a of catAssign) {
          const p = gradePct(sg[a.id], a);
          if (p != null) pcts.push(p);
        }
      }
      return { cat, avg: mean(pcts), count: pcts.length };
    }),
    [categories, scopeAssignments, students, gradeMaps]
  );

  // Per-assignment performance (hardest first).
  const assignmentPerf = useMemo(() =>
    scopeAssignments.map(a => {
      const stats = assignmentStats(a, grades.filter(g => g.assignment_id === a.id));
      const cat = categories.find(c => c.name === a.category);
      return { a, stats, color: cat?.color || GOLD };
    }).filter(x => x.stats)
      .sort((a, b) => a.stats.avg - b.stats.avg),
    [scopeAssignments, grades, categories]
  );

  // Class average per period (line chart).
  const periodTrend = useMemo(() =>
    [1, 2, 3, 4, 5, 6].map(p => {
      const pcts = students.map(s => periodPct(s.id, p)).filter(v => v != null);
      return { label: PERIOD_SHORT[p], value: pcts.length ? mean(pcts) : null };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [students, gradeMaps, categories, autoZeroOpts]
  );

  // Class average per assignment in chronological order (single-period view only).
  const assignmentTrend = useMemo(() => {
    if (isSemester) return [];
    const chrono = [...scopeAssignments].sort((a, b) => {
      const ad = a.due_date ? new Date(a.due_date).getTime() : (a.sort_order ?? Infinity);
      const bd = b.due_date ? new Date(b.due_date).getTime() : (b.sort_order ?? Infinity);
      return ad - bd;
    });
    return chrono.map(a => {
      const stats = assignmentStats(a, grades.filter(g => g.assignment_id === a.id));
      return { label: a.name.length > 8 ? a.name.slice(0, 7) + "…" : a.name, value: stats ? stats.avg : null };
    });
  }, [scopeAssignments, grades, isSemester]);

  // Trends per student (improvement / decline) over scope assignments.
  const studentTrends = useMemo(() =>
    students.map(s => ({ student: s, trend: gradeTrend(scopeAssignments, gradeMaps[s.id] || {}) }))
      .filter(x => x.trend.delta != null),
    [students, scopeAssignments, gradeMaps]
  );
  const improving = [...studentTrends].filter(x => x.trend.delta > 0).sort((a, b) => b.trend.delta - a.trend.delta).slice(0, 5);
  const declining = [...studentTrends].filter(x => x.trend.delta < 0).sort((a, b) => a.trend.delta - b.trend.delta).slice(0, 5);

  // Missing-work analytics.
  const missing = useMemo(() => {
    const byCat = {};
    const byStudent = [];
    let total = 0;
    for (const s of students) {
      const items = missingItemsFor(scopeAssignments, gradeMaps[s.id] || {}, autoZeroOpts);
      if (items.length) byStudent.push({ student: s, count: items.length });
      total += items.length;
      items.forEach(it => { byCat[it.assignment.category] = (byCat[it.assignment.category] || 0) + 1; });
    }
    byStudent.sort((a, b) => b.count - a.count);
    return { total, byCat, byStudent, affected: byStudent.length };
  }, [students, scopeAssignments, gradeMaps, autoZeroOpts]);

  const topPerformers = studentScores.slice(0, 5);
  const honorRoll = studentScores.filter(x => (gpaFromPct(x.pct, scale) ?? 0) >= 3.5);

  if (!categories.length) {
    return <div className="card" style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>Set up a grade profile first to see analytics.</div>;
  }

  const viewBtn = (key, label) => (
    <button key={key} onClick={() => setView(key)} style={{
      background: view === key ? GOLD : "rgba(255,255,255,0.06)", border: view === key ? "none" : "1px solid rgba(255,255,255,0.12)",
      color: view === key ? "#000" : "rgba(255,255,255,0.6)", borderRadius: 6, padding: "0.3rem 0.7rem", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem",
    }}>{label}</button>
  );

  const scopeLabel = isSemester ? "Semester" : PERIOD_LABELS[view];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* View selector */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
        {viewBtn("semester", "Semester")}
        {[1, 2, 3, 4, 5, 6].map(p => viewBtn(p, PERIOD_SHORT[p]))}
        <span style={{ marginLeft: "auto", fontSize: "0.76rem", color: "rgba(255,255,255,0.4)" }}>
          {scopeLabel} · {studentScores.length} of {students.length} students graded
        </span>
      </div>

      {studentScores.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>
          No graded data for {scopeLabel} yet. Enter some scores to populate analytics.
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <Kpi label="Class Average" value={classMean != null ? `${Math.round(classMean)}%` : "—"} sub={classMean != null ? letterGrade(classMean, scale) : ""} color={tierColor(classMean)} />
            <Kpi label="Median" value={classMedian != null ? `${Math.round(classMedian)}%` : "—"} color={tierColor(classMedian)} />
            <Kpi label="Pass Rate" value={allPcts.length ? `${Math.round((passCount / allPcts.length) * 100)}%` : "—"} sub={`${passCount}/${allPcts.length} ≥ 60%`} color="#84cc16" />
            <Kpi label="At Risk" value={atRisk.length} sub="below 70%" color={atRisk.length ? "#f97316" : "#22c55e"} />
            <Kpi label="Missing Work" value={missing.total} sub={`${missing.affected} students`} color={missing.total ? "#ef4444" : "#22c55e"} />
            <Kpi label="Completion" value={completion.pct != null ? `${Math.round(completion.pct)}%` : "—"} sub={`${completion.filled}/${completion.total} cells`} color={GOLD} />
          </div>

          {/* Distribution + Histogram */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            <Card title={`Grade Distribution — ${scopeLabel}`}>
              <VBars data={Object.entries(distribution).map(([l, v]) => ({ label: l, value: v, color: DIST_COLORS[l] }))} />
            </Card>
            <Card title="Score Spread">
              <VBars data={histogram} />
            </Card>
          </div>

          {/* Period trend */}
          <Card title="Class Average by Period">
            <LineChart data={periodTrend} />
          </Card>

          {/* Within-period assignment trend */}
          {!isSemester && assignmentTrend.length >= 2 && (
            <Card title={`Class Average by Assignment — ${scopeLabel}`}>
              <LineChart data={assignmentTrend} color="#60a5fa" />
            </Card>
          )}

          {/* Category performance */}
          <Card title="Category Performance">
            {categoryStats.every(c => c.avg == null) ? (
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>No graded work in these categories yet.</div>
            ) : (
              categoryStats.map(c => (
                <HBar key={c.cat.name} label={`${c.cat.name} (${c.cat.weight}%)`} value={c.avg} color={c.cat.color} sub={`n=${c.count}`} />
              ))
            )}
          </Card>

          {/* Assignment difficulty */}
          <Card title="Assignment Performance — hardest first">
            {assignmentPerf.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>No graded assignments yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                {assignmentPerf.slice(0, 14).map(({ a, stats, color }) => (
                  <HBar key={a.id} label={a.name} value={stats.avg} color={color}
                    sub={stats.failing > 0 ? `${stats.failing} F` : ""} />
                ))}
              </div>
            )}
          </Card>

          {/* Class rank & honor roll */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            <Card title={`Class Rank — ${scopeLabel}`}>
              <RankList onItemClick={onOpenStudent} items={studentScores.slice(0, 12).map(x => ({ student: x.student, name: `${x.student.lastName}, ${x.student.firstName}`, value: `${Math.round(x.pct)}% · ${(gpaFromPct(x.pct, scale) ?? 0).toFixed(1)}`, color: tierColor(x.pct) }))} />
            </Card>
            <Card title={`🏅 Honor Roll (GPA ≥ 3.5) — ${honorRoll.length}`}>
              {honorRoll.length === 0 ? <Empty /> : (
                <RankList onItemClick={onOpenStudent} items={honorRoll.map(x => ({ student: x.student, name: `${x.student.lastName}, ${x.student.firstName}`, value: (gpaFromPct(x.pct, scale) ?? 0).toFixed(1), color: "#22c55e" }))} />
              )}
            </Card>
          </div>

          {/* People lists */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            <Card title="Top Performers">
              <RankList onItemClick={onOpenStudent} items={topPerformers.map(x => ({ student: x.student, name: `${x.student.lastName}, ${x.student.firstName}`, value: `${Math.round(x.pct)}%`, color: tierColor(x.pct) }))} />
            </Card>
            <Card title="📈 Most Improved">
              {improving.length === 0 ? <Empty /> : (
                <RankList onItemClick={onOpenStudent} items={improving.map(x => ({ student: x.student, name: `${x.student.lastName}, ${x.student.firstName}`, value: `▲ ${Math.round(x.trend.delta)}`, color: "#22c55e" }))} />
              )}
            </Card>
            <Card title="📉 Needs Attention">
              {declining.length === 0 ? <Empty /> : (
                <RankList onItemClick={onOpenStudent} items={declining.map(x => ({ student: x.student, name: `${x.student.lastName}, ${x.student.firstName}`, value: `▼ ${Math.abs(Math.round(x.trend.delta))}`, color: "#ef4444" }))} />
              )}
            </Card>
          </div>

          {/* Missing work breakdown */}
          {missing.total > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
              <Card title="Missing Work by Category">
                {Object.entries(missing.byCat).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
                  const cat = categories.find(c => c.name === name);
                  const maxC = Math.max(...Object.values(missing.byCat));
                  return <HBar key={name} label={name} value={(count / maxC) * 100} color={cat?.color || "#ef4444"} suffix="" sub={`${count}`} />;
                })}
              </Card>
              <Card title="Students with Most Missing">
                <RankList onItemClick={onOpenStudent} items={missing.byStudent.slice(0, 6).map(x => ({ student: x.student, name: `${x.student.lastName}, ${x.student.firstName}`, value: `${x.count}`, color: "#ef4444" }))} />
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
