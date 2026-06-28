import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { GOLD } from "../constants.js";
import { getApiKey } from "../apiKey.js";
import {
  calcPeriodGrade, calcSemesterGrade, letterGrade, letterToGpa, gradePct,
  effectivePoints, assignmentStats, gradeTrend, missingItemsFor,
  DEFAULT_SCALE, DEFAULT_PERIOD_WEIGHTS,
} from "../gradebook.js";
import { mean, tierColor, Kpi, HBar, LineChart, Card } from "./charts.jsx";
import { toCSV, downloadCSV } from "../csv.js";

const PERIOD_LABELS = { 1: "Period 1", 2: "Period 2", 3: "Period 3", 4: "Period 4", 5: "Midterm", 6: "Final" };
const PERIOD_SHORT  = { 1: "P1", 2: "P2", 3: "P3", 4: "P4", 5: "Mid", 6: "Final" };
const PERIOD_KEYS   = { 1: 1, 2: 2, 3: 3, 4: 4, 5: "midterm", 6: "final" };

const trendLabel = t => !t || t.delta == null ? "—" : t.direction === "up" ? `▲ +${Math.round(t.delta)}` : t.direction === "down" ? `▼ ${Math.round(t.delta)}` : "→ steady";
const trendColor = t => !t || t.delta == null ? "rgba(255,255,255,0.4)" : t.direction === "up" ? "#22c55e" : t.direction === "down" ? "#ef4444" : "rgba(255,255,255,0.5)";

export default function GradebookStudentDetail({ student, students = [], assignments, grades, profiles, settings, user, onClose }) {
  const [periods, setPeriods] = useState(() => new Set([1, 2, 3, 4, 5, 6]));
  const [sortBy, setSortBy] = useState("date"); // "date" | "type"
  const [whatIfPeriod, setWhatIfPeriod] = useState(1);
  const [hypo, setHypo] = useState({});          // { assignmentId: percent }
  const [target, setTarget] = useState(90);
  const [aiText, setAiText] = useState("");
  const [aiState, setAiState] = useState("idle"); // idle | loading | error
  const [aiError, setAiError] = useState("");

  const activeProfile = profiles.find(p => p.is_active) || profiles[0] || null;
  const categories = useMemo(() => activeProfile?.categories || [], [activeProfile]);
  const scale = settings?.grading_scale || DEFAULT_SCALE;
  const periodWeights = settings?.period_weights || DEFAULT_PERIOD_WEIGHTS;
  const autoZeroOpts = useMemo(() => ({
    autoZeroMissing: settings?.auto_zero_missing ?? false,
    graceDays: settings?.auto_zero_grace_days ?? 0,
    latePenaltyPct: settings?.late_penalty_pct ?? 0,
    today: new Date(),
  }), [settings?.auto_zero_missing, settings?.auto_zero_grace_days, settings?.late_penalty_pct]);

  const gmap = useMemo(() =>
    Object.fromEntries(grades.filter(g => g.student_id === student.id).map(g => [g.assignment_id, g])),
    [grades, student.id]
  );

  const catOrder = name => { const i = categories.findIndex(c => c.name === name); return i < 0 ? 99 : i; };

  // Per-period summary (all 6, then filter by selection).
  const allPeriodInfo = useMemo(() => [1, 2, 3, 4, 5, 6].map(p => {
    const pa = assignments.filter(a => a.grading_period === p);
    const { pct } = calcPeriodGrade(pa, gmap, categories, autoZeroOpts);
    return { p, pct, trend: gradeTrend(pa, gmap, autoZeroOpts), count: pa.length };
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

  const overallTrend = useMemo(() => gradeTrend(scopeAssignments, gmap, autoZeroOpts), [scopeAssignments, gmap, autoZeroOpts]);

  // Chronological assignment order across scope (shared by student & class trend).
  const chronoScope = useMemo(() => [...scopeAssignments].sort((a, b) => {
    const ad = a.due_date ? new Date(a.due_date).getTime() : (a.sort_order ?? Infinity);
    const bd = b.due_date ? new Date(b.due_date).getTime() : (b.sort_order ?? Infinity);
    return ad - bd;
  }), [scopeAssignments]);

  // Student's chronological score trend; null entries keep gaps aligned with classTrend.
  const trendData = useMemo(() => chronoScope.map(a => {
    const g = gmap[a.id];
    const label = a.name.length > 8 ? a.name.slice(0, 7) + "…" : a.name;
    if (g?.excused) return { label, value: null };
    const v = gradePct(g, a, autoZeroOpts) ?? (g?.missing ? 0 : null);
    return { label, value: v };
  }), [chronoScope, gmap, autoZeroOpts]);

  // Class average per assignment (same chronological order) for the overlay.
  const classTrend = useMemo(() => chronoScope.map(a => {
    const stats = assignmentStats(a, grades.filter(g => g.assignment_id === a.id), autoZeroOpts);
    const label = a.name.length > 8 ? a.name.slice(0, 7) + "…" : a.name;
    return { label, value: stats ? stats.avg : null };
  }), [chronoScope, grades, autoZeroOpts]);

  // Category breakdown across scope.
  const categoryStats = useMemo(() => categories.map(cat => {
    const pcts = scopeAssignments.filter(a => a.category === cat.name && !a.extra_credit)
      .map(a => gradePct(gmap[a.id], a, autoZeroOpts)).filter(v => v != null);
    return { cat, avg: mean(pcts), count: pcts.length };
  }), [categories, scopeAssignments, gmap, autoZeroOpts]);

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
      const pct = gradePct(g, a, autoZeroOpts);
      const pts = effectivePoints(g, a, autoZeroOpts);
      const status = g?.late ? "Late" : g?.excused ? "Excused" : g?.missing ? "Missing"
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeAssignments, gmap, sortBy, autoZeroOpts, categories]);

  // Feedback (notes + rubric comments) for the print sheet.
  const feedback = useMemo(() => history.map(r => {
    const g = r.g; if (!g) return null;
    const crit = g.rubric_comments ? (r.a.rubric || []).filter(c => g.rubric_comments[c.id]?.trim()).map(c => `${c.criterion}: ${g.rubric_comments[c.id].trim()}`) : [];
    if (!g.notes?.trim() && !crit.length) return null;
    return { name: r.a.name, notes: g.notes?.trim(), crit };
  }).filter(Boolean), [history]);

  // Class rank for the selected scope (mean of selected-period averages, like selectedAvg).
  const rankInfo = useMemo(() => {
    const sel = [...periods];
    const avgs = students.map(s => {
      const sg = Object.fromEntries(grades.filter(g => g.student_id === s.id).map(g => [g.assignment_id, g]));
      const pcts = sel.map(p => calcPeriodGrade(assignments.filter(a => a.grading_period === p), sg, categories, autoZeroOpts).pct).filter(v => v != null);
      return { id: s.id, avg: pcts.length ? mean(pcts) : null };
    }).filter(x => x.avg != null).sort((a, b) => b.avg - a.avg);
    const idx = avgs.findIndex(x => x.id === student.id);
    return { rank: idx >= 0 ? idx + 1 : null, total: avgs.length };
  }, [students, grades, assignments, categories, autoZeroOpts, periods, student.id]);

  // What-If: ungraded, non-EC assignments in the chosen period.
  const whatIfAssignments = useMemo(() =>
    assignments.filter(a => a.grading_period === whatIfPeriod && !a.extra_credit)
      .filter(a => { const g = gmap[a.id]; return !g?.excused && effectivePoints(g, a, autoZeroOpts) == null; }),
    [assignments, whatIfPeriod, gmap, autoZeroOpts]
  );
  const whatIfCurrent = useMemo(() =>
    calcPeriodGrade(assignments.filter(a => a.grading_period === whatIfPeriod), gmap, categories, autoZeroOpts).pct,
    [assignments, whatIfPeriod, gmap, categories, autoZeroOpts]
  );
  function projectWith(map) {
    return calcPeriodGrade(assignments.filter(a => a.grading_period === whatIfPeriod), map, categories, autoZeroOpts).pct;
  }
  function fillMap(fillPct) {
    const clone = { ...gmap };
    whatIfAssignments.forEach(a => { clone[a.id] = { points_earned: (fillPct / 100) * a.max_points }; });
    return clone;
  }
  const projectedHypo = useMemo(() => {
    const clone = { ...gmap };
    whatIfAssignments.forEach(a => {
      const v = hypo[a.id];
      if (v !== "" && v != null && !isNaN(Number(v))) clone[a.id] = { points_earned: (Number(v) / 100) * a.max_points };
    });
    return projectWith(clone);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hypo, whatIfAssignments, gmap, assignments, whatIfPeriod, categories, autoZeroOpts]);
  const neededUniform = useMemo(() => {
    if (!whatIfAssignments.length) return null;
    if ((projectWith(fillMap(0)) ?? 0) >= target) return 0;
    if ((projectWith(fillMap(100)) ?? 0) < target) return Infinity;
    let lo = 0, hi = 100;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if ((projectWith(fillMap(mid)) ?? 0) >= target) hi = mid; else lo = mid; }
    return hi;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatIfAssignments, target, gmap, assignments, whatIfPeriod, categories, autoZeroOpts]);

  function exportHistoryCSV() {
    const rows = [["Due", "Assignment", "Type", "Period", "Score", "Max", "Percent", "Status", "Notes"]];
    history.forEach(r => rows.push([
      r.a.due_date || "", r.a.name, r.a.category, PERIOD_SHORT[r.a.grading_period],
      (r.pts != null && !r.g?.missing) ? Math.round(r.pts) : "", r.a.max_points,
      r.pct != null ? Math.round(r.pct) : "", r.status, r.g?.notes || "",
    ]));
    downloadCSV(`${student.lastName}-${student.firstName}-grades.csv`, toCSV(rows));
  }

  async function generateAI() {
    const apiKey = getApiKey();
    if (!apiKey) { setAiState("error"); setAiError("No Anthropic API key saved. Add one in the AI Grader tab first."); return; }
    setAiState("loading"); setAiError("");
    const lines = [
      `Student: ${student.firstName} ${student.lastName} (grade ${student.grade})`,
      `Periods included: ${periodsLabel}`,
      `Selected average: ${selectedAvg != null ? Math.round(selectedAvg) + "% (" + selLetter + ")" : "n/a"}; semester: ${semesterPct != null ? Math.round(semesterPct) + "%" : "n/a"}; class rank: ${rankInfo.rank ? rankInfo.rank + " of " + rankInfo.total : "n/a"}`,
      `Overall trend: ${trendLabel(overallTrend)}; missing assignments: ${missingItems.length}`,
      `Grade by period: ${selectedInfo.map(i => `${PERIOD_SHORT[i.p]} ${i.pct != null ? Math.round(i.pct) + "%" : "—"}`).join(", ")}`,
      `Category performance: ${categoryStats.filter(c => c.avg != null).map(c => `${c.cat.name} ${Math.round(c.avg)}%`).join(", ")}`,
    ].join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-allow-browser": "true", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 320,
          messages: [{ role: "user", content: `You are a teacher writing a brief, warm, parent-friendly progress summary for a parent-teacher conference. Use 3-4 sentences, concrete and encouraging but honest, no markdown. Base it only on this data:\n\n${lines}` }],
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error?.message || `Error ${res.status}`); }
      const data = await res.json();
      setAiText(data?.content?.[0]?.text?.trim() || "");
      setAiState("idle");
    } catch (e) {
      setAiState("error"); setAiError(e.message || "Request failed.");
    }
  }

  const trendPoints = trendData.filter(d => d.value != null).length;

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
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button onClick={generateAI} disabled={aiState === "loading"} className="btn btn-ghost btn-sm" title="Generate a parent-friendly summary with AI">{aiState === "loading" ? "✨ Generating…" : "✨ AI Summary"}</button>
            <button onClick={exportHistoryCSV} className="btn btn-ghost btn-sm">⬇ CSV</button>
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
            <Kpi label="Class Rank" value={rankInfo.rank ? `${rankInfo.rank}/${rankInfo.total}` : "—"} color={GOLD} />
            <Kpi label="Trend" value={trendLabel(overallTrend)} color={trendColor(overallTrend)} />
            <Kpi label="Missing" value={missingItems.length} color={missingItems.length ? "#ef4444" : "#22c55e"} />
            <Kpi label="Completion" value={completion.total ? `${Math.round((completion.filled / completion.total) * 100)}%` : "—"} sub={`${completion.filled}/${completion.total}`} color={GOLD} />
          </div>

          {/* AI summary (editable, included in print) */}
          {(aiText || aiState === "error") && (
            <Card title="✨ AI Summary (editable)">
              {aiState === "error"
                ? <div style={{ fontSize: "0.8rem", color: "#ef4444" }}>{aiError}</div>
                : <textarea value={aiText} onChange={e => setAiText(e.target.value)} style={{ width: "100%", boxSizing: "border-box", minHeight: 80, resize: "vertical", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.5rem 0.7rem", color: "#fff", fontSize: "0.85rem", lineHeight: 1.5, outline: "none" }} />}
            </Card>
          )}

          {/* Trend chart — student vs class average */}
          <Card title="Score Trend — student vs class">
            {trendPoints >= 2
              ? <LineChart series={[{ data: trendData, color: "#60a5fa", label: `${student.firstName}` }, { data: classTrend, color: GOLD, label: "Class avg" }]} />
              : <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>Need at least two graded assignments to chart a trend.</div>}
          </Card>

          {/* What-If / Target planner */}
          <Card title="What-If / Target Planner" right={
            <select value={whatIfPeriod} onChange={e => setWhatIfPeriod(Number(e.target.value))} style={{ ...inp }}>
              {[1, 2, 3, 4, 5, 6].map(p => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
            </select>
          }>
            <div style={{ fontSize: "0.82rem", marginBottom: "0.6rem", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
              <span>Current: <strong style={{ color: tierColor(whatIfCurrent) }}>{whatIfCurrent != null ? `${Math.round(whatIfCurrent)}% ${letterGrade(whatIfCurrent, scale)}` : "—"}</strong></span>
              <span>Projected: <strong style={{ color: tierColor(projectedHypo) }}>{projectedHypo != null ? `${Math.round(projectedHypo)}% ${letterGrade(projectedHypo, scale)}` : "—"}</strong></span>
            </div>
            {whatIfAssignments.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>No ungraded assignments in {PERIOD_LABELS[whatIfPeriod]} to plan around.</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.7rem", flexWrap: "wrap", background: "rgba(245,192,37,0.06)", border: "1px solid rgba(245,192,37,0.2)", borderRadius: 8, padding: "0.5rem 0.75rem" }}>
                  <span style={{ fontSize: "0.82rem" }}>To reach</span>
                  <input type="number" min={0} max={100} value={target} onChange={e => setTarget(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} style={{ ...inp, width: 64 }} />
                  <span style={{ fontSize: "0.82rem" }}>% ({letterGrade(target, scale)}):</span>
                  <strong style={{ fontSize: "0.85rem", color: neededUniform === Infinity ? "#ef4444" : "#22c55e" }}>
                    {neededUniform === 0 ? "Already achieved 🎉"
                      : neededUniform === Infinity ? "Not reachable even at 100%"
                      : `Need ~${Math.ceil(neededUniform)}% on each of the ${whatIfAssignments.length} remaining`}
                  </strong>
                </div>
                <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.4rem" }}>Try specific scores (enter a % per assignment):</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.4rem" }}>
                  {whatIfAssignments.map(a => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontSize: "0.76rem", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={a.name}>{a.name}</span>
                      <input type="number" min={0} max={100} value={hypo[a.id] ?? ""} placeholder="%" onChange={e => setHypo(h => ({ ...h, [a.id]: e.target.value }))} style={{ ...inp, width: 56 }} />
                    </div>
                  ))}
                </div>
              </>
            )}
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
            rankInfo={rankInfo} selectedInfo={selectedInfo} categoryStats={categoryStats}
            trendData={trendData} classTrend={classTrend} feedback={feedback} aiText={aiText}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Light-themed, ink-friendly single-page handout for conferences ───────────
function PrintSheet({ student, user, today, periodsLabel, selectedAvg, selLetter, gpa, semesterPct, scale, overallTrend, missingCount, _completion, rankInfo, selectedInfo, categoryStats, trendData, classTrend, feedback, aiText }) {
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
        {kpi("Rank", rankInfo?.rank ? `${rankInfo.rank}/${rankInfo.total}` : "—")}
        {kpi("Trend", trendLabel(overallTrend))}
        {kpi("Missing", String(missingCount))}
      </div>

      {/* AI / teacher summary */}
      {aiText?.trim() && (
        <div style={{ ...box, marginBottom: 8 }}>
          <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: 3 }}>Summary</div>
          <div style={{ fontSize: "11px", lineHeight: 1.45 }}>{aiText.trim()}</div>
        </div>
      )}

      {/* Trend chart — student vs class */}
      {trendData.filter(d => d.value != null).length >= 2 && (
        <div style={{ ...box, marginBottom: 8 }}>
          <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: 2 }}>Score Trend — student vs class</div>
          <LineChart series={[{ data: trendData, color: "#1d4ed8", label: student.firstName }, { data: classTrend, color: "#b45309", label: "Class avg" }]} theme="light" height={150} />
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
