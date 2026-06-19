import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { GOLD } from "../constants.js";
import {
  calcPeriodGrade, calcSemesterGrade, letterGrade, letterToGpa, gradePct,
  effectivePoints, gradeTrend, missingItemsFor, DEFAULT_SCALE, DEFAULT_PERIOD_WEIGHTS,
} from "../gradebook.js";
import { mean, tierColor, Kpi, HBar, LineChart, Card } from "./charts.jsx";

const PERIOD_LABELS = { 1: "Period 1", 2: "Period 2", 3: "Period 3", 4: "Period 4", 5: "Midterm", 6: "Final" };
const PERIOD_SHORT  = { 1: "P1", 2: "P2", 3: "P3", 4: "P4", 5: "Mid", 6: "Final" };
const PERIOD_KEYS   = { 1: 1, 2: 2, 3: 3, 4: 4, 5: "midterm", 6: "final" };

const trendLabel = t => !t || t.delta == null ? "—" : t.direction === "up" ? `▲ +${Math.round(t.delta)}` : t.direction === "down" ? `▼ ${Math.round(t.delta)}` : "→ steady";
const trendColor = t => !t || t.delta == null ? "rgba(255,255,255,0.4)" : t.direction === "up" ? "#22c55e" : t.direction === "down" ? "#ef4444" : "rgba(255,255,255,0.5)";

export default function GradebookStudentDetail({ student, assignments, grades, profiles, settings, user, onClose }) {
  const [periods, setPeriods] = useState(() => new Set([1, 2, 3, 4, 5, 6]));
  const [sortBy, setSortBy] = useState("date"); // "date" | "type"

  const activeProfile = profiles.find(p => p.is_active) || profiles[0] || null;
  const categories = activeProfile?.categories || [];
  const scale = settings?.grading_scale || DEFAULT_SCALE;
  const periodWeights = settings?.period_weights || DEFAULT_PERIOD_WEIGHTS;
  const autoZeroOpts = useMemo(() => ({
    autoZeroMissing: settings?.auto_zero_missing ?? false,
    graceDays: settings?.auto_zero_grace_days ?? 0,
    today: new Date(),
  }), [settings?.auto_zero_missing, settings?.auto_zero_grace_days]);

  const gmap = useMemo(() =>
    Object.fromEntries(grades.filter(g => g.student_id === student.id).map(g => [g.assignment_id, g])),
    [grades, student.id]
  );

  const catOrder = name => { const i = categories.findIndex(c => c.name === name); return i < 0 ? 99 : i; };

  // Per-period summary (all 6, then filter by selection).
  const allPeriodInfo = useMemo(() => [1, 2, 3, 4, 5, 6].map(p => {
    const pa = assignments.filter(a => a.grading_period === p);
    const { pct } = calcPeriodGrade(pa, gmap, categories, autoZeroOpts);
    return { p, pct, trend: gradeTrend(pa, gmap), count: pa.length };
  }), [assignments, gmap, categories, autoZeroOpts]);

  const selectedInfo = allPeriodInfo.filter(i => periods.has(i.p));
  const selectedAvg = mean(selectedInfo.map(i => i.pct).filter(v => v != null));
  const semesterPct = calcSemesterGrade(
    Object.fromEntries(allPeriodInfo.map(i => [PERIOD_KEYS[i.p], i.pct])), periodWeights
  );

  // Assignments in scope (selected periods).
  const scopeAssignments = useMemo(() =>
    assignments.filter(a => periods.has(a.grading_period)),
    [assignments, periods]
  );

  const overallTrend = useMemo(() => gradeTrend(scopeAssignments, gmap), [scopeAssignments, gmap]);

  // Chronological score trend for this student across scope.
  const trendData = useMemo(() => {
    const chrono = [...scopeAssignments].sort((a, b) => {
      const ad = a.due_date ? new Date(a.due_date).getTime() : (a.sort_order ?? Infinity);
      const bd = b.due_date ? new Date(b.due_date).getTime() : (b.sort_order ?? Infinity);
      return ad - bd;
    });
    return chrono.map(a => {
      const g = gmap[a.id];
      if (g?.excused) return null;
      const v = gradePct(g, a) ?? (g?.missing ? 0 : null);
      if (v == null) return null;
      return { label: a.name.length > 8 ? a.name.slice(0, 7) + "…" : a.name, value: v };
    }).filter(Boolean);
  }, [scopeAssignments, gmap]);

  // Category breakdown across scope.
  const categoryStats = useMemo(() => categories.map(cat => {
    const pcts = scopeAssignments.filter(a => a.category === cat.name && !a.extra_credit)
      .map(a => gradePct(gmap[a.id], a)).filter(v => v != null);
    return { cat, avg: mean(pcts), count: pcts.length };
  }), [categories, scopeAssignments, gmap]);

  // Missing & completion.
  const missingItems = useMemo(() => missingItemsFor(scopeAssignments, gmap, autoZeroOpts), [scopeAssignments, gmap, autoZeroOpts]);
  const completion = useMemo(() => {
    let filled = 0;
    scopeAssignments.forEach(a => { const g = gmap[a.id]; if (g && (g.points_earned != null || g.missing || g.excused || g.rubric_scores)) filled++; });
    return { filled, total: scopeAssignments.length };
  }, [scopeAssignments, gmap]);

  // Sorted full grade history.
  const history = useMemo(() => {
    const rows = scopeAssignments.map(a => {
      const g = gmap[a.id] || null;
      const pct = gradePct(g, a);
      const pts = effectivePoints(g, a);
      const status = g?.excused ? "Excused" : g?.missing ? "Missing"
        : pct != null ? "Graded"
        : (autoZeroOpts.autoZeroMissing && a.due_date && new Date(a.due_date) <= autoZeroOpts.today) ? "Past due" : "—";
      return { a, g, pct, pts, status };
    });
    rows.sort((x, y) => {
      if (sortBy === "type") {
        const c = catOrder(x.a.category) - catOrder(y.a.category);
        if (c !== 0) return c;
      }
      const xd = x.a.due_date ? new Date(x.a.due_date).getTime() : Infinity;
      const yd = y.a.due_date ? new Date(y.a.due_date).getTime() : Infinity;
      if (xd !== yd) return xd - yd;
      return new Date(x.a.created_at || 0) - new Date(y.a.created_at || 0);
    });
    return rows;
  }, [scopeAssignments, gmap, sortBy, autoZeroOpts]);

  // Feedback (notes + rubric comments) for the print sheet.
  const feedback = useMemo(() => history.map(r => {
    const g = r.g; if (!g) return null;
    const crit = g.rubric_comments ? (r.a.rubric || []).filter(c => g.rubric_comments[c.id]?.trim()).map(c => `${c.criterion}: ${g.rubric_comments[c.id].trim()}`) : [];
    if (!g.notes?.trim() && !crit.length) return null;
    return { name: r.a.name, notes: g.notes?.trim(), crit };
  }).filter(Boolean), [history]);

  function togglePeriod(p) {
    setPeriods(prev => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next.size ? next : prev; // keep at least one
    });
  }

  const periodsLabel = [1, 2, 3, 4, 5, 6].filter(p => periods.has(p)).map(p => PERIOD_SHORT[p]).join(", ");
  const today = new Date().toLocaleDateString();
  const selLetter = selectedAvg != null ? letterGrade(selectedAvg, scale) : "—";
  const gpa = selectedAvg != null ? letterToGpa(letterGrade(selectedAvg, scale)) : null;

  const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.3rem 0.6rem", color: "#fff", fontSize: "0.78rem", outline: "none", cursor: "pointer" };

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: "min(960px, 96vw)", maxHeight: "94vh", overflowY: "auto" }}>

        {/* Header (screen only) */}
        <div className="gb-screen-only" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem", gap: "0.5rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Student Analytics</div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem" }}>{student.lastName}, {student.firstName} <span className="tag tag-amber" style={{ fontSize: "0.7rem" }}>{student.grade}</span></div>
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button onClick={() => window.print()} className="btn btn-primary btn-sm">🖨 Print 1-page report</button>
            <button onClick={onClose} style={{ ...inp }}>✕ Close</button>
          </div>
        </div>

        {/* Controls (screen only) */}
        <div className="gb-screen-only" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem", paddingBottom: "0.85rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.4)" }}>Periods:</span>
            {[1, 2, 3, 4, 5, 6].map(p => (
              <button key={p} onClick={() => togglePeriod(p)} style={{
                background: periods.has(p) ? GOLD : "rgba(255,255,255,0.06)", border: periods.has(p) ? "none" : "1px solid rgba(255,255,255,0.12)",
                color: periods.has(p) ? "#000" : "rgba(255,255,255,0.55)", borderRadius: 6, padding: "0.25rem 0.6rem", cursor: "pointer", fontWeight: 700, fontSize: "0.75rem",
              }}>{PERIOD_SHORT[p]}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginLeft: "auto" }}>
            <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.4)" }}>Sort history:</span>
            <button onClick={() => setSortBy("date")} style={{ ...inp, background: sortBy === "date" ? GOLD : "rgba(255,255,255,0.06)", color: sortBy === "date" ? "#000" : "rgba(255,255,255,0.6)", fontWeight: 700 }}>By date</button>
            <button onClick={() => setSortBy("type")} style={{ ...inp, background: sortBy === "type" ? GOLD : "rgba(255,255,255,0.06)", color: sortBy === "type" ? "#000" : "rgba(255,255,255,0.6)", fontWeight: 700 }}>By type</button>
          </div>
        </div>

        {/* ── Interactive analytics (screen only) ─────────────────────────── */}
        <div className="gb-screen-only" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* KPIs */}
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <Kpi label="Selected Avg" value={selectedAvg != null ? `${Math.round(selectedAvg)}%` : "—"} sub={selLetter} color={tierColor(selectedAvg)} />
            <Kpi label="Semester" value={semesterPct != null ? `${Math.round(semesterPct)}%` : "—"} sub={semesterPct != null ? letterGrade(semesterPct, scale) : ""} color={tierColor(semesterPct)} />
            <Kpi label="GPA (sel.)" value={gpa != null ? gpa.toFixed(1) : "—"} color={GOLD} />
            <Kpi label="Trend" value={trendLabel(overallTrend)} color={trendColor(overallTrend)} />
            <Kpi label="Missing" value={missingItems.length} color={missingItems.length ? "#ef4444" : "#22c55e"} />
            <Kpi label="Completion" value={completion.total ? `${Math.round((completion.filled / completion.total) * 100)}%` : "—"} sub={`${completion.filled}/${completion.total}`} color={GOLD} />
          </div>

          {/* Trend chart */}
          <Card title="Score Trend (chronological)">
            {trendData.length >= 2 ? <LineChart data={trendData} color="#60a5fa" />
              : <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>Need at least two graded assignments to chart a trend.</div>}
          </Card>

          {/* Period grades + category performance */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            <Card title="Grade by Period">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {selectedInfo.map(i => (
                  <div key={i.p} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0.6rem", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                    <span style={{ fontSize: "0.82rem" }}>{PERIOD_LABELS[i.p]}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontSize: "0.74rem", color: trendColor(i.trend) }}>{trendLabel(i.trend)}</span>
                      <span style={{ fontWeight: 800, color: tierColor(i.pct) }}>{i.pct != null ? `${Math.round(i.pct)}% ${letterGrade(i.pct, scale)}` : "—"}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Category Performance">
              {categoryStats.every(c => c.avg == null) ? <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>No graded work yet.</div>
                : categoryStats.map(c => <HBar key={c.cat.name} label={`${c.cat.name} (${c.cat.weight}%)`} value={c.avg} color={c.cat.color} sub={`n=${c.count}`} />)}
            </Card>
          </div>

          {/* Full grade history */}
          <Card title={`Full Grade History — ${history.length} assignments`}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)", textAlign: "left" }}>
                    <th style={{ padding: "0.4rem 0.5rem" }}>Due</th>
                    <th style={{ padding: "0.4rem 0.5rem" }}>Assignment</th>
                    <th style={{ padding: "0.4rem 0.5rem" }}>Type</th>
                    <th style={{ padding: "0.4rem 0.5rem" }}>Per.</th>
                    <th style={{ padding: "0.4rem 0.5rem", textAlign: "right" }}>Score</th>
                    <th style={{ padding: "0.4rem 0.5rem", textAlign: "right" }}>%</th>
                    <th style={{ padding: "0.4rem 0.5rem" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(r => {
                    const cat = categories.find(c => c.name === r.a.category);
                    return (
                      <tr key={r.a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "0.35rem 0.5rem", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>{r.a.due_date || "—"}</td>
                        <td style={{ padding: "0.35rem 0.5rem" }}>{r.a.name}</td>
                        <td style={{ padding: "0.35rem 0.5rem" }}><span style={{ color: cat?.color }}>■</span> {r.a.category}</td>
                        <td style={{ padding: "0.35rem 0.5rem", color: "rgba(255,255,255,0.45)" }}>{PERIOD_SHORT[r.a.grading_period]}</td>
                        <td style={{ padding: "0.35rem 0.5rem", textAlign: "right" }}>{r.pts != null && !r.g?.missing ? `${r.pts}/${r.a.max_points}` : "—"}</td>
                        <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontWeight: 700, color: tierColor(r.pct) }}>{r.pct != null ? `${Math.round(r.pct)}%` : "—"}</td>
                        <td style={{ padding: "0.35rem 0.5rem" }}>
                          <span style={{ fontSize: "0.7rem", color: r.status === "Missing" || r.status === "Past due" ? "#f97316" : r.status === "Excused" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.6)" }}>{r.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── Printable 1-page handout (print only) ───────────────────────── */}
        <div id="student-print">
          <PrintSheet
            student={student} user={user} today={today} periodsLabel={periodsLabel}
            selectedAvg={selectedAvg} selLetter={selLetter} gpa={gpa} semesterPct={semesterPct} scale={scale}
            overallTrend={overallTrend} missingCount={missingItems.length} completion={completion}
            selectedInfo={selectedInfo} categoryStats={categoryStats} trendData={trendData} feedback={feedback}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Light-themed, ink-friendly single-page handout for conferences ───────────
function PrintSheet({ student, user, today, periodsLabel, selectedAvg, selLetter, gpa, semesterPct, scale, overallTrend, missingCount, completion, selectedInfo, categoryStats, trendData, feedback }) {
  const box = { border: "1px solid #ccc", borderRadius: 6, padding: "8px 10px" };
  const th = { textAlign: "left", borderBottom: "1px solid #999", padding: "3px 6px", fontSize: "10px", color: "#444" };
  const td = { borderBottom: "1px solid #eee", padding: "3px 6px", fontSize: "11px" };
  const kpi = (label, value, sub) => (
    <div style={{ ...box, flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: "18px", fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.04em", color: "#666" }}>{label}</div>
      {sub ? <div style={{ fontSize: "9px", color: "#888" }}>{sub}</div> : null}
    </div>
  );
  return (
    <div style={{ color: "#111", fontFamily: "Arial, Helvetica, sans-serif", padding: "4px 2px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #111", paddingBottom: 6, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 800 }}>{student.firstName} {student.lastName} — Grade Report</div>
          <div style={{ fontSize: "11px", color: "#444" }}>Grade {student.grade} · Periods: {periodsLabel}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: "10px", color: "#444" }}>
          <div style={{ fontWeight: 700 }}>James A. Garfield High School</div>
          <div>{user?.name || "Teacher"} · {today}</div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {kpi("Average", selectedAvg != null ? `${Math.round(selectedAvg)}%` : "—", selLetter)}
        {kpi("Semester", semesterPct != null ? `${Math.round(semesterPct)}%` : "—", semesterPct != null ? letterGrade(semesterPct, scale) : "")}
        {kpi("GPA", gpa != null ? gpa.toFixed(1) : "—")}
        {kpi("Trend", trendLabel(overallTrend))}
        {kpi("Missing", String(missingCount))}
        {kpi("Completion", completion.total ? `${Math.round((completion.filled / completion.total) * 100)}%` : "—")}
      </div>

      {/* Trend chart */}
      {trendData.length >= 2 && (
        <div style={{ ...box, marginBottom: 8 }}>
          <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: 2 }}>Score Trend Over Time</div>
          <LineChart data={trendData} color="#1d4ed8" theme="light" height={150} />
        </div>
      )}

      {/* Period + category side by side */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ ...box, flex: 1 }}>
          <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: 4 }}>Grade by Period</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Period</th><th style={{ ...th, textAlign: "right" }}>Grade</th><th style={{ ...th, textAlign: "right" }}>Trend</th></tr></thead>
            <tbody>
              {selectedInfo.map(i => (
                <tr key={i.p}>
                  <td style={td}>{PERIOD_LABELS[i.p]}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{i.pct != null ? `${Math.round(i.pct)}% ${letterGrade(i.pct, scale)}` : "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{trendLabel(i.trend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ ...box, flex: 1 }}>
          <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: 4 }}>Category Performance</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Category</th><th style={{ ...th, textAlign: "right" }}>Avg</th><th style={{ ...th, textAlign: "right" }}>#</th></tr></thead>
            <tbody>
              {categoryStats.map(c => (
                <tr key={c.cat.name}>
                  <td style={td}>{c.cat.name} ({c.cat.weight}%)</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{c.avg != null ? `${Math.round(c.avg)}%` : "—"}</td>
                  <td style={{ ...td, textAlign: "right", color: "#888" }}>{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher feedback */}
      {feedback.length > 0 && (
        <div style={{ ...box, marginBottom: 8 }}>
          <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: 4 }}>Teacher Feedback</div>
          {feedback.slice(0, 6).map((f, i) => (
            <div key={i} style={{ fontSize: "10px", marginBottom: 2 }}>
              <strong>{f.name}:</strong> {f.notes}{f.crit.length ? (f.notes ? " — " : "") + f.crit.join("; ") : ""}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: "9px", color: "#888", textAlign: "center", borderTop: "1px solid #ccc", paddingTop: 4 }}>
        Prepared by {user?.name || "Teacher"} ({user?.email}) for parent-teacher conference · {today}
      </div>
    </div>
  );
}
