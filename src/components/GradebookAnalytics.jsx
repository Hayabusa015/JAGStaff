import { useState, useMemo } from "react";
import { GOLD } from "../constants.js";
import {
  calcPeriodGrade, calcSemesterGrade, letterGrade, gradePct, assignmentStats,
  gradeTrend, missingItemsFor, DEFAULT_SCALE, DEFAULT_PERIOD_WEIGHTS,
} from "../gradebook.js";

const PERIOD_LABELS = { 1: "Period 1", 2: "Period 2", 3: "Period 3", 4: "Period 4", 5: "Midterm", 6: "Final" };
const PERIOD_SHORT  = { 1: "P1", 2: "P2", 3: "P3", 4: "P4", 5: "Mid", 6: "Fin" };
const PERIOD_KEYS   = { 1: 1, 2: 2, 3: 3, 4: 4, 5: "midterm", 6: "final" };
const DIST_COLORS   = { A: "#22c55e", B: "#84cc16", C: "#eab308", D: "#f97316", F: "#ef4444" };

const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
const median = arr => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const tierColor = pct => pct == null ? "rgba(255,255,255,0.3)" : pct >= 90 ? "#22c55e" : pct >= 80 ? "#84cc16" : pct >= 70 ? "#eab308" : pct >= 60 ? "#f97316" : "#ef4444";

// ── Small reusable visual primitives (pure CSS / inline SVG, no deps) ─────────
function Kpi({ label, value, sub, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0.85rem 1rem", flex: "1 1 130px", minWidth: 120 }}>
      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: color || "#fff", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      {sub && <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function HBar({ label, value, color, suffix = "%", sub }) {
  const w = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
      <div style={{ width: 120, flexShrink: 0, fontSize: "0.78rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={label}>{label}</div>
      <div style={{ flex: 1, height: 18, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
        <div style={{ height: "100%", width: `${w}%`, background: color || GOLD, borderRadius: 4, transition: "width 0.4s" }} />
      </div>
      <div style={{ width: 84, flexShrink: 0, textAlign: "right", fontSize: "0.76rem", color: "rgba(255,255,255,0.7)" }}>
        {value == null ? "—" : `${Math.round(value)}${suffix}`}{sub ? <span style={{ color: "rgba(255,255,255,0.35)" }}> {sub}</span> : null}
      </div>
    </div>
  );
}

// Vertical bar chart (used for grade distribution & histogram).
function VBars({ data, height = 130 }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height, paddingTop: "0.5rem" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, marginBottom: 3, color: "rgba(255,255,255,0.7)" }}>{d.value}</div>
          <div style={{ width: "100%", maxWidth: 46, borderRadius: "4px 4px 0 0", background: d.color || GOLD, height: `${Math.max(d.value > 0 ? 6 : 2, (d.value / max) * 100)}%`, transition: "height 0.4s" }} />
          <div style={{ marginTop: 5, fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 1.1 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// Inline SVG line chart for trends (0-100 scale). Skips null points (gaps).
function LineChart({ data, height = 170, color = GOLD }) {
  const W = 640, H = height, padL = 34, padR = 12, padT = 12, padB = 26;
  const n = data.length;
  const xFor = i => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const yFor = v => padT + (1 - v / 100) * (H - padT - padB);
  const pts = data.map((d, i) => ({ ...d, x: xFor(i), y: d.value == null ? null : yFor(d.value) }));
  // Build polyline segments across non-null runs.
  const segments = [];
  let cur = [];
  pts.forEach(p => {
    if (p.y == null) { if (cur.length) segments.push(cur), cur = []; }
    else cur.push(p);
  });
  if (cur.length) segments.push(cur);
  const gridY = [0, 25, 50, 75, 100];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {gridY.map(g => (
        <g key={g}>
          <line x1={padL} x2={W - padR} y1={yFor(g)} y2={yFor(g)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <text x={padL - 6} y={yFor(g) + 3} fontSize="9" fill="rgba(255,255,255,0.35)" textAnchor="end">{g}</text>
        </g>
      ))}
      {segments.map((seg, si) => (
        <polyline key={si} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          points={seg.map(p => `${p.x},${p.y}`).join(" ")} />
      ))}
      {pts.map((p, i) => p.y == null ? null : (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.2" fill={color} />
          <text x={p.x} y={p.y - 7} fontSize="9" fill="rgba(255,255,255,0.6)" textAnchor="middle">{Math.round(p.value)}</text>
        </g>
      ))}
      {pts.map((p, i) => (
        <text key={`l${i}`} x={p.x} y={H - 8} fontSize="9" fill="rgba(255,255,255,0.45)" textAnchor="middle">{p.label}</text>
      ))}
    </svg>
  );
}

function Card({ title, right, children }) {
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem", gap: "0.5rem", flexWrap: "wrap" }}>
        <div className="section-title" style={{ marginBottom: 0 }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ── Main analytics view ──────────────────────────────────────────────────────
export default function GradebookAnalytics({ students, assignments, grades, profiles, settings }) {
  const [view, setView] = useState("semester"); // 1-6 (period) or "semester"

  const activeProfile = profiles.find(p => p.is_active) || profiles[0] || null;
  const categories = activeProfile?.categories || [];
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

          {/* People lists */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            <Card title="Top Performers">
              <RankList items={topPerformers.map(x => ({ name: `${x.student.lastName}, ${x.student.firstName}`, value: `${Math.round(x.pct)}%`, color: tierColor(x.pct) }))} />
            </Card>
            <Card title="📈 Most Improved">
              {improving.length === 0 ? <Empty /> : (
                <RankList items={improving.map(x => ({ name: `${x.student.lastName}, ${x.student.firstName}`, value: `▲ ${Math.round(x.trend.delta)}`, color: "#22c55e" }))} />
              )}
            </Card>
            <Card title="📉 Needs Attention">
              {declining.length === 0 ? <Empty /> : (
                <RankList items={declining.map(x => ({ name: `${x.student.lastName}, ${x.student.firstName}`, value: `▼ ${Math.abs(Math.round(x.trend.delta))}`, color: "#ef4444" }))} />
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
                <RankList items={missing.byStudent.slice(0, 6).map(x => ({ name: `${x.student.lastName}, ${x.student.firstName}`, value: `${x.count}`, color: "#ef4444" }))} />
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RankList({ items }) {
  if (!items.length) return <Empty />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.35rem 0.6rem", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
          <span style={{ fontSize: "0.82rem" }}><span style={{ color: "rgba(255,255,255,0.3)", marginRight: 6 }}>{i + 1}</span>{it.name}</span>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: it.color || "#fff" }}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>Not enough data yet.</div>;
}
