import React, { useState } from 'react';
import {
  Trophy,
  CheckCircle2,
  Coins,
  Users,
  LayoutDashboard,
  Settings2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Maximize2,
  RotateCcw,
  Bell,
  LifeBuoy,
} from 'lucide-react';
import { useApp } from '../../ClassroomContext.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';
import Badge from '../../components/Badge.jsx';
import MoleApprovalQueue from './MoleApprovalQueue.jsx';
import HelpDeskKanban from './HelpDeskKanban.jsx';
import ParentMailer from './ParentMailer.jsx';
import SubjectFlair from '../../components/SubjectFlair.jsx';

const SPAN_CLASS = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
};

export default function TeacherDashboard() {
  const { dashboardLayout, toggleWidget, moveWidget, cycleWidgetSpan, resetLayout, teacherProfile } = useApp();
  const [showConfig, setShowConfig] = useState(false);

  const ordered = [...dashboardLayout].sort((a, b) => a.order - b.order);
  const visible = ordered.filter((w) => w.visible);

  return (
    <div className="space-y-5">
      {/* Brand strip */}
      <Card className="overflow-hidden" hairline>
        <div className="relative flex items-center gap-4 bg-gradient-to-r from-ink-850 to-ink-900 px-6 py-5">
          <img src="/gmen-logo.png" alt="" className="mascot-watermark" />
          <img
            src="/gmen-logo.png"
            alt="G-MEN"
            className="relative h-14 w-14 shrink-0 object-contain drop-shadow-[0_0_12px_rgba(245,179,1,0.35)]"
          />
          <div className="relative">
            <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-gold-500">
              {teacherProfile.tagline}
            </p>
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-50">
              Welcome back, {teacherProfile.name}
            </h2>
            <p className="text-xs text-zinc-400">Here's your room at a glance.</p>
          </div>
          <button
            onClick={() => setShowConfig((s) => !s)}
            className={`font-display relative ml-auto flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
              showConfig
                ? 'border-gold-500/40 bg-gold-500/15 text-gold-300'
                : 'border-white/10 text-zinc-300 hover:border-white/20'
            }`}
          >
            <Settings2 className="h-4 w-4" /> Configure
          </button>
        </div>
      </Card>

      {showConfig && (
        <Card className="animate-fade-in">
          <CardHeader
            title="Dashboard Layout Schema"
            subtitle="Toggle, resize, and reorder widgets — the grid re-renders live"
            icon={LayoutDashboard}
            action={
              <button
                onClick={resetLayout}
                className="font-display flex items-center gap-1 rounded-lg bg-ink-750 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-300 hover:bg-ink-700"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            }
          />
          <div className="space-y-2 p-4">
            {ordered.map((w, i) => (
              <div
                key={w.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-ink-950/40 px-3 py-2"
              >
                <span className="text-sm font-semibold text-zinc-50">{w.title}</span>
                <Badge tone="neutral">span {w.span}</Badge>
                <Badge tone={w.visible ? 'gold' : 'red'}>{w.visible ? 'visible' : 'hidden'}</Badge>
                <div className="ml-auto flex items-center gap-1">
                  <IconBtn title="Move up" onClick={() => moveWidget(w.id, 'up')} disabled={i === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    title="Move down"
                    onClick={() => moveWidget(w.id, 'down')}
                    disabled={i === ordered.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn title="Cycle width" onClick={() => cycleWidgetSpan(w.id)}>
                    <Maximize2 className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn title="Toggle visibility" onClick={() => toggleWidget(w.id)}>
                    {w.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </IconBtn>
                </div>
              </div>
            ))}
            <p className="px-1 pt-1 text-[11px] text-zinc-500">
              This panel mutates the <code className="text-zinc-400">dashboardLayout</code> schema in
              app state — confirming the dashboard is fully config-driven.
            </p>
          </div>
        </Card>
      )}

      {/* Widget grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {visible.map((w) => (
          <div key={w.id} className={`${SPAN_CLASS[w.span] || 'lg:col-span-1'} animate-fade-in`}>
            <WidgetRenderer widget={w} />
          </div>
        ))}
      </div>
    </div>
  );
}

function WidgetRenderer({ widget }) {
  switch (widget.type) {
    case 'metrics':
      return <MetricsWidget />;
    case 'moleQueue':
      return <MoleApprovalQueue embedded />;
    case 'helpDesk':
      return <HelpDeskKanban embedded />;
    case 'roster':
      return <RosterWidget />;
    case 'parentMailerMini':
      return <ParentMailer embedded />;
    default:
      return null;
  }
}

function MetricsWidget() {
  const { metrics, moleRequests, tickets, students, currencySymbol } = useApp();
  const pendingMole = moleRequests.filter((r) => r.status === 'pending').length;
  const openTickets = tickets.filter((t) => t.status !== 'completed').length;
  const stats = [
    { icon: Trophy, label: `${currencySymbol} Approved`, value: metrics.approvedMoleDollars },
    { icon: CheckCircle2, label: 'Tasks Completed', value: metrics.completedTasks },
    { icon: Bell, label: 'Pending Redemptions', value: pendingMole },
    { icon: LifeBuoy, label: 'Open Tickets', value: openTickets },
    { icon: Users, label: 'Active Students', value: students.length },
  ];
  return (
    <Card>
      <CardHeader title="Command Metrics" subtitle="Live productivity tally" icon={Trophy} />
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border border-white/10 bg-ink-950/40 p-3 transition-all hover:-translate-y-0.5 hover:border-gold-500/30"
            >
              <div className="mb-2 grid h-8 w-8 place-items-center rounded-lg bg-gold-500/10 text-gold-400 ring-1 ring-gold-500/30">
                <Icon className="h-4 w-4" />
              </div>
              <p className="font-display text-2xl font-bold text-zinc-50">{s.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">{s.label}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RosterWidget() {
  const { classes, students, getTheme } = useApp();
  return (
    <Card>
      <CardHeader title="Class Roster Snapshot" subtitle="Balances & lab status" icon={Users} />
      <div className="space-y-3 p-4">
        {classes.map((cls) => {
          const theme = getTheme(cls.id);
          const roster = students.filter((s) => s.classId === cls.id);
          return (
            <div key={cls.id} className="relative overflow-hidden rounded-xl bg-ink-950/30 p-3">
              {/* Subject-specific decorative background for this class section */}
              <SubjectFlair subject={cls.subject} color={theme.hex} opacity={0.07} />
              <div className="relative mb-2 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${theme.bg}`} />
                <p className="font-display text-xs font-bold uppercase tracking-wide text-zinc-200">
                  {cls.name} · P{cls.period}
                </p>
              </div>
              <div className="relative space-y-1.5">
                {roster.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-ink-950/40 px-3 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`grid h-7 w-7 place-items-center rounded-full font-display text-[10px] font-bold ${theme.bgSoft} ${theme.text} ring-1 ${theme.ring}`}>
                        {s.avatar}
                      </div>
                      <span className="text-xs font-semibold text-zinc-200">{s.name}</span>
                      {s.isDemo && <Badge tone="neutral">Demo</Badge>}
                      {!s.wizardComplete && <Badge tone="gold">Onboarding</Badge>}
                    </div>
                    <Badge tone="gold" icon={Coins}>
                      {s.balance}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function IconBtn({ children, onClick, disabled, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-lg bg-ink-750 text-zinc-300 transition-colors hover:bg-ink-700 hover:text-gold-300 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}
