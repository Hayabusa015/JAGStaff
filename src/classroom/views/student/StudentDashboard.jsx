import React, { useState } from 'react';
import {
  Coins,
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

export default function StudentDashboard() {
  const { activeStudent, getClass, getTheme, moleMilestone, tickets, moleRequests, setActiveView, teacherProfile, currencyName, currencySymbol } =
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
          <div className="relative text-ink-950">
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
