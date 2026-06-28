import {
  LayoutDashboard,
  GraduationCap,
  Coins,
  LifeBuoy,
  Mail,
  CalendarRange,
  Library,
  BookOpenCheck,
  Sparkles,
  Settings2,
  X,
} from 'lucide-react';
import { useApp } from '../ClassroomContext.jsx';

const STUDENT_NAV = [
  { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
  { id: 'grades',    label: 'My Grades',    icon: GraduationCap },
  { id: 'materials', label: 'Materials', icon: Library },
  { id: 'mole', label: 'Cash-In Shop', icon: Coins },
  { id: 'helpdesk', label: 'Help Desk', icon: LifeBuoy },
  { id: 'lessons', label: 'Lesson Plans', icon: CalendarRange },
];

export default function SideNav({ open, onClose }) {
  const { role, activeView, setActiveView, teacherProfile, currencyName } = useApp();
  const teacherNav = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'gradebook', label: 'Gradebook', icon: BookOpenCheck },
    { id: 'aigrader', label: 'AI Grader', icon: Sparkles },
    { id: 'materials', label: 'Class Materials', icon: Library },
    { id: 'mole', label: `${currencyName} Vault`, icon: Coins },
    { id: 'helpdesk', label: 'Help Desk', icon: LifeBuoy },
    { id: 'mailer', label: 'Parent Mailer', icon: Mail },
    { id: 'lessons', label: 'Lesson Plans', icon: CalendarRange },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ];
  const nav = role === 'teacher' ? teacherNav : STUDENT_NAV;

  const go = (id) => {
    setActiveView(id);
    onClose?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed z-40 flex h-full w-64 flex-col border-r border-white/10 bg-ink-950/95 backdrop-blur transition-transform lg:static lg:z-0 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/5 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-ink-850 ring-1 ring-gold-500/30 shadow-gold-sm">
              <img src="/gmen-logo.png" alt="G-MEN" className="h-11 w-11 object-contain" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-lg font-bold uppercase tracking-wide text-zinc-50">
                {teacherProfile.classroom}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-500">
                {teacherProfile.tagline}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/5 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={[
                  'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                  active
                    ? 'bg-gold-500/10 text-zinc-50 ring-1 ring-gold-500/30'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
                ].join(' ')}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-gold-500" style={{ width: 3 }} />
                )}
                <Icon
                  className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                    active ? 'text-gold-400' : ''
                  }`}
                />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/5 px-5 py-4 text-[10px] leading-relaxed text-zinc-600">
          <p className="font-display font-bold uppercase tracking-[0.2em] text-gold-600">
            {role} mode
          </p>
          <p className="text-zinc-500">Physics · Chemistry · Geology</p>
        </div>
      </aside>
    </>
  );
}
