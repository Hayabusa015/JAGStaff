import { useState } from 'react';
import {
  CalendarRange,
  BookOpen,
  Target,
  ClipboardList,
  Tag,
  Database,
  FlaskConical,
  Atom,
  Mountain,
} from 'lucide-react';
import { LESSON_PLANS, SUBJECT_THEME, CLASSES } from '../data/mockData.js';
import Card from './Card.jsx';
import Badge from './Badge.jsx';

const SUBJECT_ICON = { chemistry: FlaskConical, physics: Atom, geology: Mountain };

// Mock-mode rendering of the embedded Common Curriculum planbook iframe — a
// clean weekly schedule per subject. `subjects` limits which modules show
// (student sees only their class; teacher sees all three). Subjects share the
// gold palette and are distinguished by icon + subtle gold tier.
export default function LessonBoard({ subjects }) {
  const subjectKeys = subjects || ['chemistry', 'physics', 'geology'];
  const [active, setActive] = useState(subjectKeys[0]);
  const plan = LESSON_PLANS[active];
  const theme = SUBJECT_THEME[active];
  const cls = CLASSES.find((c) => c.subject === active);

  return (
    <div className="space-y-4">
      {/* Subject tabs (only when more than one subject is available) */}
      {subjectKeys.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {subjectKeys.map((key) => {
            const t = SUBJECT_THEME[key];
            const Icon = SUBJECT_ICON[key] || BookOpen;
            const isActive = key === active;
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={[
                  'font-display flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-all',
                  isActive
                    ? `${t.bgSoft} ${t.border} ${t.text} ring-1 ${t.ring} shadow-gold-sm`
                    : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      <Card hairline>
        {/* Planbook header — simulated Common Curriculum embed */}
        <div className={`flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r ${theme.gradient} px-5 py-4`}>
          <div className="text-ink-950">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5" />
              <h3 className="font-display text-lg font-bold uppercase tracking-wide">{plan.unit}</h3>
            </div>
            <p className="text-xs font-semibold opacity-80">
              {cls?.name} · Period {cls?.period} · {plan.week}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-ink-950/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-950">
            <Database className="h-3 w-3" /> Common Curriculum · Mock Embed
          </span>
        </div>

        {/* Weekly grid */}
        <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-5">
          {plan.days.map((d) => (
            <div key={d.day} className="bg-ink-850/90 p-4">
              <p className={`font-display mb-2 text-xs font-bold uppercase tracking-wider ${theme.text}`}>
                {d.day}
              </p>
              <div className="space-y-2.5 text-xs">
                <Row icon={Target} label="Objective" value={d.objective} />
                <Row icon={ClipboardList} label="Activity" value={d.activity} />
                <Row icon={BookOpen} label="Homework" value={d.homework} />
                <div className="pt-1">
                  <Badge tone="gold" icon={Tag}>
                    {d.standard}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-center text-[11px] text-zinc-500">
        In production this renders the live Common Curriculum public planbook iframe. Mock Mode shows
        the formatted schedule.
      </p>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
      <div>
        <p className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</p>
        <p className="text-zinc-200">{value}</p>
      </div>
    </div>
  );
}
