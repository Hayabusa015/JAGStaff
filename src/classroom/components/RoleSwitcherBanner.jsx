import { FlaskConical, GraduationCap, ShieldAlert, UserCog, ChevronDown } from 'lucide-react';
import { useApp } from '../ClassroomContext.jsx';

// TESTING-ONLY banner: flip between Teacher (admin) and Student views, and —
// in student mode — jump into any student's profile (including Demo Students).
export default function RoleSwitcherBanner() {
  const { role, setRole, students, activeStudentId, setActiveStudentId, classes, setActiveView } =
    useApp();

  const switchRole = (next) => {
    setRole(next);
    setActiveView('dashboard');
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gold-500/20 bg-gradient-to-r from-gold-500/10 via-ink-950 to-ink-950 px-4 py-2 text-xs">
      <div className="font-display flex items-center gap-2 font-semibold uppercase tracking-widest text-gold-400">
        <ShieldAlert className="h-4 w-4" />
        Testing · Role Switcher
      </div>

      <div className="flex items-center gap-1 rounded-full bg-ink-850/80 p-1 ring-1 ring-white/10">
        <button
          onClick={() => switchRole('teacher')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold transition-all ${
            role === 'teacher'
              ? 'bg-gold-500 text-ink-950 shadow-gold-sm'
              : 'text-zinc-300 hover:text-white'
          }`}
        >
          <UserCog className="h-3.5 w-3.5" />
          Teacher
        </button>
        <button
          onClick={() => switchRole('student')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold transition-all ${
            role === 'student'
              ? 'bg-gold-500 text-ink-950 shadow-gold-sm'
              : 'text-zinc-300 hover:text-white'
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Student
        </button>
      </div>

      {role === 'student' && (
        <label className="relative flex items-center gap-2 text-zinc-300">
          <span className="hidden sm:inline">Profile:</span>
          <div className="relative">
            <select
              value={activeStudentId}
              onChange={(e) => {
                setActiveStudentId(e.target.value);
                setActiveView('dashboard');
              }}
              className="appearance-none rounded-lg border border-white/10 bg-ink-850 py-1 pl-3 pr-8 font-semibold text-white focus:border-gold-500 focus:outline-none"
            >
              {classes.map((cls) => (
                <optgroup key={cls.id} label={`Period ${cls.period} · ${cls.name}`}>
                  {students
                    .filter((s) => s.classId === cls.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.isDemo ? ' ⭐ (Demo)' : ''}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1.5 h-4 w-4 text-zinc-400" />
          </div>
        </label>
      )}

      <div className="ml-auto hidden items-center gap-1.5 text-zinc-600 md:flex">
        <FlaskConical className="h-3.5 w-3.5" />
        Switch freely to test both workflows
      </div>
    </div>
  );
}
