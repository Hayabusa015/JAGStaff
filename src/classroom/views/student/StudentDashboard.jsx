import { useMemo, useState } from 'react';
import {
  Coins,
  GraduationCap,
  KeyRound,
  Eye,
  EyeOff,
  LifeBuoy,
  Lock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Bell,
} from 'lucide-react';
import { useApp } from '../../ClassroomContext.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';
import Badge from '../../components/Badge.jsx';
import { formatDateTime, timeAgo } from '../../utils/format.js';
import SubjectFlair from '../../components/SubjectFlair.jsx';
import { calcPeriodGrade, letterGrade, gradePct, effectivePoints, gradeTier } from '../../../gradebook.js';
import { PERIOD_LABELS, TIER_COLORS } from '../../../components/gradebook-constants.js';

export default function StudentDashboard() {
  const { activeStudent, getClass, getTheme, moleMilestone, tickets, moleRequests, setActiveView, teacherProfile, currencyName, currencySymbol, classroomDesign, myAssignments, myGrades, myGradeProfile } =
    useApp();
  const cls = getClass(activeStudent.classId);
  const theme = getTheme(activeStudent.classId);
  const [revealPw, setRevealPw] = useState(false);

  const openTickets = tickets.filter(
    (t) => t.studentId === activeStudent.id && t.status !== 'completed'
  );
  const pendingMole = moleRequests.filter(
    (r) => r.studentId === activeStudent.id && r.status === 'pending'
  );
  const recentNotes = (activeStudent.notifications || []).slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Hero greeting */}
      <Card className="overflow-hidden" hairline>
        <div className={`relative flex items-center justify-between gap-4 bg-gradient-to-r ${theme.gradient} px-6 py-6`}>
          <img src="/gmen-logo.png" alt="" className="mascot-watermark" />
          {/* Subject-specific decorative background on the gold hero banner */}
          <SubjectFlair subject={cls?.subject} color="#0a0500" opacity={0.11} />
          <div className="relative" style={{ color: classroomDesign.heroText }}>
            <p className="font-display text-xs font-bold uppercase tracking-widest opacity-80">
              {cls?.name} · Period {cls?.period}
            </p>
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide">
              Hey, {activeStudent.name.split(' ')[0]}!
            </h2>
          </div>
          <div className="relative z-10 grid h-16 w-16 shrink-0 place-items-center rounded-full bg-ink-950/20 font-display text-2xl font-bold text-ink-950 ring-2 ring-ink-950/30">
            {activeStudent.avatar}
          </div>
        </div>
      </Card>

      <StudentGradesPanel assignments={myAssignments} grades={myGrades} profile={myGradeProfile} />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Currency progress */}
        <Card className="lg:col-span-2">
          <CardHeader title={`${currencyName} Tracker`} subtitle="Earn toward a test-bonus milestone" icon={Coins} />
          <div className="space-y-4 p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="font-display text-5xl font-bold text-gold-400 text-glow-gold">
                  {activeStudent.balance}
                </p>
                <p className="text-xs text-zinc-500">spendable {currencyName}s</p>
              </div>
              {activeStudent.lockedBalance > 0 && (
                <Badge tone="neutral" icon={Lock}>
                  {activeStudent.lockedBalance} locked
                </Badge>
              )}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                <span>Milestone bonus at {moleMilestone} {currencySymbol}</span>
                <span className="font-bold text-zinc-50">
                  {Math.max(0, moleMilestone - activeStudent.balance)} to go
                </span>
              </div>
              <ProgressBar value={activeStudent.balance} max={moleMilestone} height="h-4" />
            </div>
            <button
              onClick={() => setActiveView('mole')}
              className="font-display flex items-center gap-1.5 rounded-xl bg-gold-500/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-gold-300 ring-1 ring-gold-500/30 transition-all hover:bg-gold-500/20"
            >
              <Sparkles className="h-4 w-4" /> Visit the Cash-In Shop <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </Card>

        {/* Gizmo lockbox */}
        <Card>
          <CardHeader title="Gizmos Lockbox" subtitle="Your private login" icon={KeyRound} />
          <div className="space-y-3 p-5">
            <LockField label="Username" value={activeStudent.gizmo.username} mono />
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">Password</p>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-ink-950/60 px-3 py-2">
                <span className="flex-1 font-mono text-sm text-white">
                  {revealPw ? activeStudent.gizmo.password : '•'.repeat(Math.max(8, activeStudent.gizmo.password.length))}
                </span>
                <button
                  onClick={() => setRevealPw((s) => !s)}
                  className="text-zinc-400 hover:text-gold-300"
                >
                  {revealPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="flex items-start gap-1.5 text-[11px] text-zinc-500">
              <Lock className="mt-0.5 h-3 w-3 shrink-0" />
              Visible only to you. Forgot it? It's safe right here.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Help desk snapshot */}
        <Card className="lg:col-span-1" hover>
          <CardHeader title="Help Desk" subtitle="Open tickets" icon={LifeBuoy} />
          <div className="p-5">
            <p className="font-display text-4xl font-bold text-zinc-50">{openTickets.length}</p>
            <p className="text-xs text-zinc-500">tickets in progress</p>
            <button
              onClick={() => setActiveView('helpdesk')}
              className="mt-3 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gold-400 hover:text-gold-300"
            >
              Open Help Desk <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Card>

        {/* Pending requests */}
        <Card className="lg:col-span-1" hover>
          <CardHeader title="Pending Redemptions" subtitle={`Awaiting ${teacherProfile.name}`} icon={Coins} />
          <div className="p-5">
            <p className="font-display text-4xl font-bold text-zinc-50">{pendingMole.length}</p>
            <p className="text-xs text-zinc-500">
              {pendingMole.reduce((sum, r) => sum + r.cost, 0)} {currencySymbol} locked
            </p>
          </div>
        </Card>

        {/* Safety status */}
        <Card className="lg:col-span-1" hover>
          <CardHeader title="Lab Safety" subtitle="Contract status" icon={ShieldCheck} />
          <div className="p-5">
            <Badge tone="goldSolid" icon={ShieldCheck}>
              Signed
            </Badge>
            <p className="mt-2 text-[11px] text-zinc-500">
              {activeStudent.safety.signedAt
                ? formatDateTime(activeStudent.safety.signedAt)
                : '—'}
            </p>
          </div>
        </Card>
      </div>

      {/* Recent notifications */}
      {recentNotes.length > 0 && (
        <Card>
          <CardHeader title="Recent Activity" subtitle={`Flags from ${teacherProfile.name}`} icon={Bell} />
          <div className="divide-y divide-white/5">
            {recentNotes.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <p className="text-sm text-zinc-200">{n.text}</p>
                <span className="shrink-0 text-[11px] text-zinc-500">{timeAgo(n.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function LockField({ label, value, mono }) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="rounded-lg border border-white/10 bg-ink-950/60 px-3 py-2">
        <span className={`text-sm text-white ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
      </div>
    </div>
  );
}

function pctToColor(pct) {
  if (pct == null) return 'rgba(255,255,255,0.25)';
  if (pct >= 90) return '#F5C025';
  if (pct >= 80) return '#22c55e';
  if (pct >= 70) return '#eab308';
  if (pct >= 60) return '#f97316';
  return '#ef4444';
}

function StudentGradesPanel({ assignments, grades, profile }) {
  const categories = profile?.categories || [];
  const gradeMap = useMemo(
    () => Object.fromEntries(grades.map(g => [g.assignment_id, g])),
    [grades]
  );
  const periodsWithAssignments = useMemo(
    () => [...new Set(assignments.map(a => a.grading_period))].sort((a, b) => a - b),
    [assignments]
  );
  const [activePeriod, setActivePeriod] = useState(1);
  const effectivePeriod = periodsWithAssignments.includes(activePeriod)
    ? activePeriod
    : periodsWithAssignments[0] ?? 1;

  if (assignments.length === 0) return null;

  const periodAssignments = assignments.filter(a => a.grading_period === effectivePeriod);
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
          {periodsWithAssignments.map(p => (
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
          {categories.length > 0 ? categories.map(cat => {
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
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {sortedAssignments.length === 0 ? (
            <p style={{ padding: '8px 20px 16px', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>
              No assignments this period.
            </p>
          ) : sortedAssignments.map(a => {
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
