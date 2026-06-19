// Pure grade calculation engine — no React, no Supabase imports.
// All functions are stateless and side-effect free.

export const DEFAULT_SCALE = [
  { letter: "A+", min: 97 },
  { letter: "A",  min: 93 },
  { letter: "A-", min: 90 },
  { letter: "B+", min: 87 },
  { letter: "B",  min: 83 },
  { letter: "B-", min: 80 },
  { letter: "C+", min: 77 },
  { letter: "C",  min: 73 },
  { letter: "C-", min: 70 },
  { letter: "D+", min: 67 },
  { letter: "D",  min: 63 },
  { letter: "D-", min: 60 },
  { letter: "F",  min: 0  },
];

export const PRESET_PROFILES = [
  {
    name: "Standard",
    categories: [
      { name: "Tests",     weight: 70, color: "#ef4444", drop_lowest: 0 },
      { name: "Quizzes",   weight: 20, color: "#f59e0b", drop_lowest: 0 },
      { name: "Homework",  weight: 10, color: "#60a5fa", drop_lowest: 0 },
    ],
  },
  {
    name: "AP Style",
    categories: [
      { name: "Tests",     weight: 60, color: "#ef4444", drop_lowest: 0 },
      { name: "Quizzes",   weight: 25, color: "#f59e0b", drop_lowest: 0 },
      { name: "Homework",  weight: 15, color: "#60a5fa", drop_lowest: 0 },
    ],
  },
  {
    name: "College Prep",
    categories: [
      { name: "Tests",     weight: 75, color: "#ef4444", drop_lowest: 0 },
      { name: "Quizzes",   weight: 15, color: "#f59e0b", drop_lowest: 0 },
      { name: "Homework",  weight: 10, color: "#60a5fa", drop_lowest: 0 },
    ],
  },
  {
    name: "Project-Based",
    categories: [
      { name: "Projects",      weight: 50, color: "#8b5cf6", drop_lowest: 0 },
      { name: "Tests",         weight: 25, color: "#ef4444", drop_lowest: 0 },
      { name: "Participation", weight: 25, color: "#22c55e", drop_lowest: 0 },
    ],
  },
];

export const DEFAULT_PERIOD_WEIGHTS = {
  1: 20, 2: 20, 3: 20, 4: 20, midterm: 10, final: 10,
};

// --- Helpers ---

export function letterGrade(pct, scale = DEFAULT_SCALE) {
  if (pct == null || isNaN(pct)) return "—";
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  for (const { letter, min } of sorted) {
    if (pct >= min) return letter;
  }
  return sorted[sorted.length - 1]?.letter || "F";
}

export function letterToGpa(letter) {
  const map = { "A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "D-": 0.7, "F": 0.0 };
  return map[letter] ?? null;
}

// Grade tier: for cell color coding
export function gradeTier(pct) {
  if (pct == null) return "ungraded";
  if (pct >= 90) return "a";
  if (pct >= 80) return "b";
  if (pct >= 70) return "c";
  if (pct >= 60) return "d";
  return "f";
}

// Letter one step lower (for drop-detection)
export function letterRank(letter, scale = DEFAULT_SCALE) {
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  return sorted.findIndex(s => s.letter === letter);
}

// Resolve retake score
export function resolveRetake(original, retake, policy) {
  if (retake == null) return original;
  if (policy === "higher") return Math.max(original ?? 0, retake);
  return ((original ?? 0) + retake) / 2; // 'average'
}

// Drop lowest N scores (returns remaining scores)
export function dropLowest(scores, n) {
  if (!n || n <= 0) return scores;
  const sorted = [...scores].sort((a, b) => a - b);
  return sorted.slice(n);
}

// Rubric total from scores object + criteria array
export function rubricTotal(rubricScores, rubric) {
  if (!rubric?.length || !rubricScores) return null;
  return rubric.reduce((sum, c) => sum + (Number(rubricScores[c.id] ?? 0)), 0);
}

// Effective score for a grade row (handles retake, rubric, excused, missing)
export function effectivePoints(grade, assignment) {
  if (!grade || grade.excused) return null; // excused = excluded from average
  if (grade.missing) return 0;
  let pts = grade.points_earned;
  if (assignment?.rubric?.length && grade.rubric_scores) {
    pts = rubricTotal(grade.rubric_scores, assignment.rubric);
  }
  if (grade.retake_score != null) {
    pts = resolveRetake(pts, grade.retake_score, grade.retake_policy || "higher");
  }
  return pts;
}

// Percentage for one grade (0-100 scale)
export function gradePct(grade, assignment) {
  const pts = effectivePoints(grade, assignment);
  if (pts == null || !assignment?.max_points) return null;
  return Math.min(100, (pts / assignment.max_points) * 100);
}

// Is an assignment past its due date (optionally with a grace window in days)?
// Returns false when there is no due date.
export function isPastDue(assignment, today = new Date(), graceDays = 0) {
  if (!assignment?.due_date) return false;
  const due = new Date(assignment.due_date);
  if (isNaN(due)) return false;
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (Number(graceDays) || 0));
  // Compare date-only (ignore time of day).
  cutoff.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due <= cutoff;
}

/**
 * Calculate weighted category average for one student in one period.
 * @param {Array} assignments - all assignments for the period
 * @param {Object} gradeMap - { assignment_id: grade_row }
 * @param {Array} categories - [{ name, weight, drop_lowest }] weights are 0-100 summing to 100
 * @param {Object} [opts] - { autoZeroMissing, graceDays, today } — when autoZeroMissing is
 *   true, a blank (ungraded, non-excused) assignment that is past due counts as 0%.
 * @returns {{ pct: number|null, byCategory: { [name]: { pct, count, dropped } } }}
 */
export function calcPeriodGrade(assignments, gradeMap, categories, opts = {}) {
  const { autoZeroMissing = false, graceDays = 0, today = new Date() } = opts;
  const byCategory = {};

  for (const cat of categories) {
    const catAssignments = assignments.filter(a => a.category === cat.name && !a.extra_credit);
    const scored = [];
    for (const a of catAssignments) {
      const g = gradeMap[a.id];
      if (g?.excused) continue;
      const pct = gradePct(g, a);
      if (pct != null) { scored.push(pct); continue; }
      if (g?.missing) { scored.push(0); continue; }
      // Blank (no grade row, or a saved row with no score): auto-zero if past due.
      if (autoZeroMissing && isPastDue(a, today, graceDays)) { scored.push(0); continue; }
      scored.push(null);
    }
    const gradeable = scored.filter(s => s != null);
    if (gradeable.length === 0) {
      byCategory[cat.name] = { pct: null, count: 0, dropped: 0 };
      continue;
    }
    const dropped = Math.min(cat.drop_lowest || 0, gradeable.length - 1);
    const remaining = dropLowest(gradeable, dropped);
    const avg = remaining.reduce((s, v) => s + v, 0) / remaining.length;
    byCategory[cat.name] = { pct: avg, count: remaining.length, dropped };
  }

  // Extra credit — add bonus points to final pct (uncapped category)
  const ecAssignments = assignments.filter(a => a.extra_credit);
  let ecBonus = 0;
  for (const a of ecAssignments) {
    const g = gradeMap[a.id];
    const pts = effectivePoints(g, a);
    if (pts != null && a.max_points) ecBonus += (pts / a.max_points) * 100;
  }

  // Weighted average across categories that have data
  const catsWithData = categories.filter(c => byCategory[c.name]?.pct != null);
  if (catsWithData.length === 0) return { pct: null, byCategory };

  // Renormalize weights to only count categories that have graded work
  const totalWeight = catsWithData.reduce((s, c) => s + c.weight, 0);
  const weightedSum = catsWithData.reduce((s, c) => s + (byCategory[c.name].pct * c.weight), 0);
  const pct = Math.min(100 + ecBonus, (weightedSum / totalWeight) + ecBonus);

  return { pct, byCategory };
}

/**
 * Semester grade from period grades + midterm + final.
 * periodWeights: { 1: 20, 2: 20, 3: 20, 4: 20, midterm: 10, final: 10 }  (sum to 100)
 * periodGrades: { 1: pct|null, 2: pct|null, ..., midterm: pct|null, final: pct|null }
 */
export function calcSemesterGrade(periodGrades, periodWeights) {
  let weightedSum = 0, totalWeight = 0;
  for (const [key, weight] of Object.entries(periodWeights)) {
    const pct = periodGrades[key];
    if (pct != null && weight > 0) {
      weightedSum += pct * weight;
      totalWeight += weight;
    }
  }
  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

// Chronological order for an assignment list (due_date, then sort_order, then created_at).
function chronological(assignments) {
  return [...assignments].sort((a, b) => {
    const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    if (ad !== bd) return ad - bd;
    const ao = a.sort_order ?? Infinity;
    const bo = b.sort_order ?? Infinity;
    if (ao !== bo) return ao - bo;
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });
}

/**
 * Trend of a student's recent performance within a set of assignments.
 * Splits graded (non-excused) work chronologically into earlier vs recent halves and
 * compares the mean percentage. Threshold ±3 pts.
 * @returns {{ direction: "up"|"down"|"flat", delta: number|null }}
 */
export function gradeTrend(assignments, gradeMap) {
  const pcts = chronological(assignments)
    .map(a => {
      const g = gradeMap[a.id];
      if (g?.excused) return null;
      return gradePct(g, a) ?? (g?.missing ? 0 : null);
    })
    .filter(p => p != null);
  if (pcts.length < 2) return { direction: "flat", delta: null };
  const mid = Math.floor(pcts.length / 2);
  const earlier = pcts.slice(0, mid);
  const recent = pcts.slice(mid);
  const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
  const delta = mean(recent) - mean(earlier);
  const direction = delta > 3 ? "up" : delta < -3 ? "down" : "flat";
  return { direction, delta };
}

/**
 * List a student's missing / past-due-blank assignments within a set.
 * @returns {Array<{ assignment, status: "missing"|"pastdue-blank" }>}
 */
export function missingItemsFor(assignments, gradeMap, { today = new Date(), graceDays = 0 } = {}) {
  const out = [];
  for (const a of assignments) {
    const g = gradeMap[a.id];
    if (g?.excused) continue;
    if (g?.missing) { out.push({ assignment: a, status: "missing" }); continue; }
    const pts = effectivePoints(g, a);
    if (pts == null && isPastDue(a, today, graceDays)) {
      out.push({ assignment: a, status: "pastdue-blank" });
    }
  }
  return out;
}

// Class statistics for one assignment
export function assignmentStats(assignment, grades) {
  const pcts = grades
    .map(g => gradePct(g, assignment))
    .filter(p => p != null);
  if (!pcts.length) return null;
  const avg = pcts.reduce((s, v) => s + v, 0) / pcts.length;
  return {
    avg,
    high: Math.max(...pcts),
    low: Math.min(...pcts),
    count: pcts.length,
    failing: pcts.filter(p => p < 60).length,
  };
}
