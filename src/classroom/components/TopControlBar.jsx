import { Menu, Coins, Lock, Database, CheckCircle2, Trophy } from 'lucide-react';
import { useApp } from '../ClassroomContext.jsx';
import NotificationFlag from './NotificationFlag.jsx';

export default function TopControlBar({ onMenu }) {
  const { role, activeView, MOCK_MODE, metrics, activeStudent, getClass, teacherProfile, currencyName, currencySymbol } = useApp();
  const viewTitles = {
    dashboard: { teacher: 'Command Center', student: 'My Dashboard' },
    materials: { teacher: 'Class Materials', student: 'Class Materials' },
    mole: { teacher: `${currencyName} Vault`, student: 'Cash-In Shop' },
    helpdesk: { teacher: 'Help Desk Queue', student: 'Student Help Desk' },
    mailer: { teacher: 'Parent Communication', student: '' },
    lessons: { teacher: 'Lesson Plans', student: 'Lesson Plans' },
    settings: { teacher: 'Classroom Settings', student: '' },
  };
  const title = viewTitles[activeView]?.[role] || 'Command Center';

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-ink-950/80 px-4 py-3 backdrop-blur">
      <button
        onClick={onMenu}
        className="rounded-lg p-1.5 text-zinc-300 hover:bg-white/5 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Compact logo mark (visible on mobile where the sidebar is hidden) */}
      <img
        src="/gmen-logo.png"
        alt="G-MEN"
        className="h-9 w-9 shrink-0 object-contain lg:hidden"
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="font-display truncate text-xl font-semibold uppercase tracking-wide text-zinc-50">
            {title}
          </h1>
          {MOCK_MODE && (
            <span className="hidden items-center gap-1 rounded-full bg-gold-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-400 ring-1 ring-gold-500/30 sm:inline-flex">
              <Database className="h-3 w-3" /> Mock Mode
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          {role === 'teacher' ? `${teacherProfile.name} · Admin` : studentSub(activeStudent, getClass)}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {role === 'teacher' ? (
          <>
            <Metric icon={Trophy} label={`${currencySymbol} Approved`} value={metrics.approvedMoleDollars} />
            <Metric icon={CheckCircle2} label="Tasks Done" value={metrics.completedTasks} />
          </>
        ) : (
          <>
            <Metric icon={Coins} label={currencySymbol} value={activeStudent.balance} />
            {activeStudent.lockedBalance > 0 && (
              <Metric icon={Lock} label="Locked" value={activeStudent.lockedBalance} muted />
            )}
            <NotificationFlag />
          </>
        )}
      </div>
    </header>
  );
}

function studentSub(student, getClass) {
  if (!student) return '';
  const cls = getClass(student.classId);
  return `${student.name} · Period ${cls?.period} ${cls?.name}`;
}

function Metric({ icon: Icon, label, value, muted = false }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-ink-850/80 px-3 py-1.5 ring-1 ring-white/10">
      <Icon className={`h-4 w-4 ${muted ? 'text-zinc-400' : 'text-gold-400'}`} />
      <div className="leading-none">
        <p className="font-display text-base font-bold text-zinc-50">{value}</p>
        <p className="hidden text-[9px] uppercase tracking-wider text-zinc-500 sm:block">{label}</p>
      </div>
    </div>
  );
}
