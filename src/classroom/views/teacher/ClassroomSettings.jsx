import React, { useState } from 'react';
import { Settings2, User, School, Tag, CheckCircle2, Coins } from 'lucide-react';
import { useApp } from '../../ClassroomContext.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';

export default function ClassroomSettings() {
  const { teacherProfile, updateTeacherProfile } = useApp();

  const [name, setName] = useState(teacherProfile.name);
  const [classroom, setClassroom] = useState(teacherProfile.classroom);
  const [tagline, setTagline] = useState(teacherProfile.tagline);
  const [currencyName, setCurrencyName] = useState(teacherProfile.currencyName || 'Mole Dollar');
  const [currencySymbol, setCurrencySymbol] = useState(teacherProfile.currencySymbol || 'MD');
  const [saved, setSaved] = useState(false);

  const isDirty =
    name.trim() !== teacherProfile.name ||
    classroom.trim() !== teacherProfile.classroom ||
    tagline.trim() !== teacherProfile.tagline ||
    currencyName.trim() !== (teacherProfile.currencyName || 'Mole Dollar') ||
    currencySymbol.trim() !== (teacherProfile.currencySymbol || 'MD');

  const save = () => {
    if (!name.trim() || !classroom.trim() || !tagline.trim() || !currencyName.trim() || !currencySymbol.trim()) return;
    updateTeacherProfile({
      name: name.trim(),
      classroom: classroom.trim(),
      tagline: tagline.trim(),
      currencyName: currencyName.trim(),
      currencySymbol: currencySymbol.trim().toUpperCase(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') save();
  };

  return (
    <div className="space-y-5">
      <Card hairline>
        <CardHeader
          title="Classroom Settings"
          subtitle="Personalise how your command center appears to you and your students"
          icon={Settings2}
        />
        <div className="space-y-5 p-5">
          {/* Teacher identity */}
          <section className="space-y-4">
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-500">
              Teacher Identity
            </h3>

            <Field
              label="Your Name"
              icon={User}
              value={name}
              onChange={setName}
              onKeyDown={handleKey}
              placeholder="e.g. Mr. Shull"
              hint="Shown in notifications, emails, and student-facing messages."
            />

            <Field
              label="Classroom / Department Name"
              icon={School}
              value={classroom}
              onChange={setClassroom}
              onKeyDown={handleKey}
              placeholder="e.g. Shull Science"
              hint="Appears in the sidebar header and the Welcome Wizard."
            />

            <Field
              label="Command Center Tagline"
              icon={Tag}
              value={tagline}
              onChange={setTagline}
              onKeyDown={handleKey}
              placeholder="e.g. G-MEN Command"
              hint="The gold label shown beneath your classroom name in the sidebar."
            />
          </section>

          {/* Classroom economy */}
          <section className="space-y-4">
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-500">
              Classroom Economy
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Currency Name"
                icon={Coins}
                value={currencyName}
                onChange={setCurrencyName}
                onKeyDown={handleKey}
                placeholder="e.g. Spirit Points"
                hint="What students earn — shown in balance cards and shop."
              />
              <Field
                label="Symbol / Abbreviation"
                icon={Coins}
                value={currencySymbol}
                onChange={(v) => setCurrencySymbol(v.toUpperCase().slice(0, 4))}
                onKeyDown={handleKey}
                placeholder="e.g. SP"
                hint="Short form used in compact displays and badges."
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] text-zinc-500">
              Example: <span className="font-bold text-gold-300">{currencyName || 'Spirit Points'}</span> · badge shows{' '}
              <span className="font-bold text-gold-300">{currencySymbol || 'SP'}</span>
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={save}
              disabled={!isDirty || !name.trim() || !classroom.trim() || !tagline.trim() || !currencyName.trim() || !currencySymbol.trim()}
              className="font-display flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save Changes
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-gold-400 animate-pop-in">
                <CheckCircle2 className="h-4 w-4" /> Saved!
              </span>
            )}
          </div>

          {/* Live preview */}
          <div className="rounded-xl border border-white/10 bg-ink-950/60 p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Sidebar Preview
            </p>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-ink-850 ring-1 ring-gold-500/30 shadow-gold-sm">
                <img src="/gmen-logo.png" alt="G-MEN" className="h-11 w-11 object-contain" />
              </div>
              <div className="leading-tight">
                <p className="font-display text-lg font-bold uppercase tracking-wide text-zinc-50">
                  {classroom || '…'}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-500">
                  {tagline || '…'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, icon: Icon, value, onChange, onKeyDown, placeholder, hint }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
        <Icon className="h-3.5 w-3.5 text-zinc-500" />
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
      />
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}
