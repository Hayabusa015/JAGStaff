import { useMemo, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useApp } from '../../ClassroomContext.jsx';
import Card from '../../components/Card.jsx';
import { calcPeriodGrade, letterGrade, gradePct, effectivePoints, gradeTier } from '../../../gradebook.js';
import { PERIOD_LABELS, TIER_COLORS } from '../../../components/gradebook-constants.js';
import EmptyState from '../../components/EmptyState.jsx';

function pctToColor(pct) {
  if (pct == null) return 'rgba(255,255,255,0.25)';
  if (pct >= 90) return '#F5C025';
  if (pct >= 80) return '#22c55e';
  if (pct >= 70) return '#eab308';
  if (pct >= 60) return '#f97316';
  return '#ef4444';
}

export default function StudentGradesView() {
  const { myAssignments: assignments, myGrades: grades, myGradeProfile: profile } = useApp();

  const categories = profile?.categories || [];
  const gradeMap = useMemo(
    () => Object.fromEntries(grades.map((g) => [g.assignment_id, g])),
    [grades]
  );
  const periodsWithAssignments = useMemo(
    () => [...new Set(assignments.map((a) => a.grading_period))].sort((a, b) => a - b),
    [assignments]
  );
  const [activePeriod, setActivePeriod] = useState(1);
  const effectivePeriod = periodsWithAssignments.includes(activePeriod)
    ? activePeriod
    : periodsWithAssignments[0] ?? 1;

  if (assignments.length === 0) {
    return (
      <Card>
        <EmptyState icon={GraduationCap} title="No grades yet" subtitle="Your teacher hasn't posted any assignments yet." />
      </Card>
    );
  }

  const periodAssignments = assignments.filter((a) => a.grading_period === effectivePeriod);
  const { pct, byCategory } = calcPeriodGrade(periodAssignments, gradeMap, categories);
  const letter = letterGrade(pct);
  const gradeColor = pctToColor(pct);

  const sortedAssignments = [...periodAssignments].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(b.due_date) - new Date(a.due_date);
  });

  return (
    <Card>
      {/* Header row: title + period tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <GraduationCap style={{ width: 15, height: 15, color: '#F5C025' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F5C025', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            My Grades
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {periodsWithAssignments.map((p) => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              style={{
                padding: '0.22rem 0.6rem', borderRadius: 999,
                border: 'none', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
                background: effectivePeriod === p ? '#F5C025' : 'rgba(255,255,255,0.07)',
                color: effectivePeriod === p ? '#0a0700' : 'rgba(255,255,255,0.45)',
                transition: 'all 0.15s',
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Grade summary: badge + category bars */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 20, padding: '14px 20px' }}>
        {/* Grade badge */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minWidth: 90, borderRadius: 14,
          background: `${gradeColor}18`,
          border: `1px solid ${gradeColor}38`,
          padding: '14px 18px',
        }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 900, lineHeight: 1, color: gradeColor }}>
            {pct != null ? `${Math.round(pct)}%` : '—'}
          </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 900, color: gradeColor, marginTop: 3, letterSpacing: '0.04em' }}>
            {letter}
          </span>
        </div>

        {/* Category bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, justifyContent: 'center' }}>
          {categories.length > 0 ? categories.map((cat) => {
            const catPct = byCategory[cat.name]?.pct;
            return (
              <div key={cat.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                    {cat.name}{' '}
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.62rem' }}>{cat.weight}%</span>
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: catPct != null ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)' }}>
                    {catPct != null ? `${Math.round(catPct)}%` : '—'}
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
                  <div style={{
                    height: 5, borderRadius: 99,
                    width: `${Math.min(100, catPct ?? 0)}%`,
                    background: cat.color || '#F5C025',
                    transition: 'width 0.45s ease',
                  }} />
                </div>
              </div>
            );
          }) : (
            <p style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.3)' }}>No categories set up yet.</p>
          )}
        </div>
      </div>

      {/* Assignment list */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ padding: '8px 20px 3px', fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Assignments
        </p>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {sortedAssignments.length === 0 ? (
            <p style={{ padding: '8px 20px 16px', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>
              No assignments this period.
            </p>
          ) : sortedAssignments.map((a) => {
            const g = gradeMap[a.id];
            const ep = g ? effectivePoints(g, a) : null;
            const apct = gradePct(g, a);
            const isMissing = g?.missing;
            const isExcused = g?.excused;
            const isUngraded = !g || (g.points_earned == null && !g.missing && !g.excused);
            const dotColor = isMissing ? '#ef4444'
              : isExcused ? 'rgba(255,255,255,0.2)'
              : isUngraded ? 'rgba(255,255,255,0.15)'
              : TIER_COLORS[gradeTier(apct)];
            const scoreColor = isMissing ? '#ef4444'
              : isUngraded || isExcused ? 'rgba(255,255,255,0.28)'
              : 'rgba(255,255,255,0.88)';
            const scoreText = isMissing ? 'missing'
              : isExcused ? 'excused'
              : isUngraded ? '—'
              : `${ep != null ? (Number.isInteger(ep) ? ep : ep.toFixed(1)) : '?'} / ${a.max_points}`;

            return (
              <div
                key={a.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: dotColor }} />
                <span style={{ flex: 1, fontSize: '0.78rem', color: 'rgba(255,255,255,0.78)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name}
                </span>
                <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>
                  {a.category}
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, flexShrink: 0, color: scoreColor }}>
                  {scoreText}
                </span>
                {!isMissing && !isExcused && !isUngraded && (
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, flexShrink: 0, color: pctToColor(apct) }}>
                    {letterGrade(apct)}
                  </span>
                )}
                {a.due_date && (
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.22)', flexShrink: 0 }}>
                    {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
