import { useState } from 'react';
import { Settings2, User, School, Tag, CheckCircle2, Coins, Palette, Users, Pencil, Trash2, Plus, BookOpen } from 'lucide-react';
import { useApp } from '../../ClassroomContext.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';
import { PATTERNS } from '../../ClassroomThemeLayer.jsx';
import { SUPABASE_READY } from '../../../supabase.js';
import GCSyncModal from '../../components/GCSyncModal.jsx';
import { SUBJECT_THEME } from '../../data/mockData.js';

// ── Subject options ───────────────────────────────────────────────────────────

const SUBJECT_OPTIONS = Object.values(SUBJECT_THEME).map(s => ({ value: s.key, label: s.label }));
const PERIOD_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const BLANK_DRAFT = { name: '', subject: 'chemistry', period: 1, room: '' };

// ── ClassManager ──────────────────────────────────────────────────────────────

function ClassManager() {
  const { classes, addClass, updateClass, deleteClass } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(BLANK_DRAFT);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [addDraft, setAddDraft] = useState(BLANK_DRAFT);
  const [adding, setAdding] = useState(false);

  const sorted = [...classes].sort((a, b) => (a.period ?? 99) - (b.period ?? 99));

  function startEdit(cls) {
    setEditingId(cls.id);
    setEditDraft({ name: cls.name, subject: cls.subject, period: cls.period ?? 1, room: cls.room || '' });
    setConfirmDeleteId(null);
  }

  async function saveEdit() {
    if (!editDraft.name.trim()) return;
    await updateClass(editingId, { ...editDraft, name: editDraft.name.trim(), period: Number(editDraft.period) });
    setEditingId(null);
  }

  async function handleDelete(id) {
    if (confirmDeleteId === id) {
      await deleteClass(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setEditingId(null);
    }
  }

  async function handleAdd() {
    if (!addDraft.name.trim()) return;
    setAdding(true);
    await addClass({ ...addDraft, name: addDraft.name.trim(), period: Number(addDraft.period) });
    setAddDraft(BLANK_DRAFT);
    setAdding(false);
  }

  const selectCls = 'w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30';
  const inputCls = 'w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30';

  return (
    <Card hairline>
      <CardHeader title="My Classes" subtitle="Set up your class roster — required before syncing from Google Classroom" icon={BookOpen} />
      <div className="p-5 space-y-3">

        {/* Existing classes */}
        {sorted.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-4">No classes yet — add one below.</p>
        )}
        {sorted.map(cls => (
          <div
            key={cls.id}
            className="group rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
          >
            {editingId === cls.id ? (
              /* ── Inline edit form ── */
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    className={inputCls + ' sm:col-span-1'}
                    placeholder="Class name"
                    value={editDraft.name}
                    onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                    autoFocus
                  />
                  <select className={selectCls} value={editDraft.period} onChange={e => setEditDraft(d => ({ ...d, period: e.target.value }))}>
                    {PERIOD_OPTIONS.map(p => <option key={p} value={p}>Period {p}</option>)}
                  </select>
                  <select className={selectCls} value={editDraft.subject} onChange={e => setEditDraft(d => ({ ...d, subject: e.target.value }))}>
                    {SUBJECT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="px-4 py-1.5 rounded-lg text-sm text-zinc-400 border border-white/10 hover:bg-white/5">Cancel</button>
                  <button onClick={saveEdit} className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-gold-500 text-black hover:bg-gold-400">Save</button>
                </div>
              </div>
            ) : (
              /* ── Read row ── */
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-xs font-bold text-gold-400">
                  P{cls.period}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{cls.name}</div>
                  <div className="text-xs text-zinc-500 capitalize">{SUBJECT_THEME[cls.subject]?.label || cls.subject}</div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {confirmDeleteId === cls.id ? (
                    <>
                      <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-xs rounded-md text-zinc-400 hover:bg-white/5">Cancel</button>
                      <button onClick={() => handleDelete(cls.id)} className="px-2 py-1 text-xs rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30 font-semibold">Delete</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(cls)} className="p-1.5 rounded-lg text-zinc-500 hover:text-gold-400 hover:bg-gold-500/10">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(cls.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add form */}
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Add a Class</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className={inputCls + ' sm:col-span-1'}
              placeholder="e.g. AP Chemistry"
              value={addDraft.name}
              onChange={e => setAddDraft(d => ({ ...d, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <select className={selectCls} value={addDraft.period} onChange={e => setAddDraft(d => ({ ...d, period: e.target.value }))}>
              {PERIOD_OPTIONS.map(p => <option key={p} value={p}>Period {p}</option>)}
            </select>
            <select className={selectCls} value={addDraft.subject} onChange={e => setAddDraft(d => ({ ...d, subject: e.target.value }))}>
              {SUBJECT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              disabled={adding || !addDraft.name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gold-500 text-black hover:bg-gold-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              {adding ? 'Adding…' : 'Add Class'}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Color presets ─────────────────────────────────────────────────────────────

const DESIGN_PRESETS = [
  { id: 'gold',    label: 'Gold Lab',  accent: '#F5C025', alt: '#c98f00', text: '#0a0700', bg: '#08080A', bgType: 'solid' },
  { id: 'ocean',   label: 'Ocean',    accent: '#22d3ee', alt: '#0891b2', text: '#001820', bg: '#010a12', bgType: 'solid' },
  { id: 'flame',   label: 'Flame',    accent: '#fb923c', alt: '#dc2626', text: '#1c0500', bg: '#0c0200', bgType: 'solid' },
  { id: 'forest',  label: 'Forest',   accent: '#4ade80', alt: '#16a34a', text: '#001c04', bg: '#020a03', bgType: 'solid' },
  { id: 'violet',  label: 'Violet',   accent: '#c084fc', alt: '#7c3aed', text: '#0f0020', bg: '#070010', bgType: 'solid' },
  { id: 'crimson', label: 'Crimson',  accent: '#f43f5e', alt: '#be123c', text: '#1c000c', bg: '#0c0005', bgType: 'solid' },
  { id: 'arctic',  label: 'Arctic',   accent: '#bfdbfe', alt: '#60a5fa', text: '#001025', bg: '#030a16', bgType: 'solid' },
  { id: 'jade',    label: 'Jade',     accent: '#34d399', alt: '#059669', text: '#001512', bg: '#010a08', bgType: 'solid' },
  { id: 'rose',    label: 'Rose',     accent: '#fb7185', alt: '#e11d48', text: '#1c000e', bg: '#0c0008', bgType: 'solid' },
  { id: 'slate',   label: 'Slate',    accent: '#94a3b8', alt: '#64748b', text: '#08101a', bg: '#040608', bgType: 'solid' },
];

// ── Shared sub-components ─────────────────────────────────────────────────────

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

function ColorField({ label, hint, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-zinc-300">{label}</label>
      <div className="flex items-center gap-2">
        <label className="relative block h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-white/10">
          <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: value }} />
          <input
            type="color"
            value={value.length === 7 ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          maxLength={7}
          className="w-24 rounded-lg border border-white/10 bg-ink-900 px-2.5 py-2 font-mono text-xs text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

function RangeField({ label, value, min, max, step, onChange, format }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-300">{label}</label>
        <span className="font-mono text-xs font-bold text-gold-400">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: '#F5C025' }}
      />
    </div>
  );
}

function DesignPreview({ d }) {
  const bgStyle =
    d.bgType === 'gradient'
      ? { background: `linear-gradient(135deg, ${d.bgGradientFrom}, ${d.bgGradientTo})` }
      : { backgroundColor: d.bgColor };
  const patternEl = PATTERNS[d.pattern];
  const gradStyle = { background: `linear-gradient(135deg, ${d.accentColor}, ${d.accentAlt})` };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <div className="relative" style={{ height: 128 }}>
        <div className="absolute inset-0" style={bgStyle} />
        {d.bgType === 'image' && d.bgImageUrl && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${d.bgImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: d.bgImageOpacity,
            }}
          />
        )}
        {patternEl && (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: patternEl, backgroundRepeat: 'repeat', opacity: d.patternOpacity }}
          />
        )}
        <div className="absolute inset-0 flex items-center gap-3 px-4">
          <div
            className="flex h-16 flex-1 items-center justify-between rounded-xl px-4"
            style={gradStyle}
          >
            <div style={{ color: d.heroText }}>
              <p className="font-display text-[9px] font-bold uppercase tracking-widest opacity-70">
                Chemistry · Period 1
              </p>
              <p className="font-display text-sm font-bold uppercase">Hey, Alex!</p>
            </div>
            <div
              className="grid h-8 w-8 place-items-center rounded-full font-display text-sm font-bold ring-2"
              style={{
                backgroundColor: `${d.heroText}33`,
                color: d.heroText,
                borderColor: `${d.heroText}55`,
              }}
            >
              🧪
            </div>
          </div>
          <div
            className="h-16 w-24 shrink-0 rounded-xl border p-3"
            style={{ backgroundColor: `${d.bgColor}cc`, borderColor: `${d.accentColor}40` }}
          >
            <p className="font-display text-xl font-bold" style={{ color: d.accentColor }}>42</p>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full"
              style={{ backgroundColor: `${d.accentColor}25` }}
            >
              <div className="h-full rounded-full" style={{ width: '65%', backgroundColor: d.accentColor }} />
            </div>
            <p className="mt-1 text-[9px]" style={{ color: `${d.accentColor}99` }}>Tokens</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 px-4 py-2">
        <p className="text-[11px] text-zinc-500">Live preview — updates as you change settings</p>
      </div>
    </div>
  );
}

// ── Visual Design Card ────────────────────────────────────────────────────────

function VisualDesignCard() {
  const { classroomDesign, updateClassroomDesign } = useApp();
  const d = classroomDesign;

  const applyPreset = (p) => {
    updateClassroomDesign({
      preset: p.id,
      accentColor: p.accent,
      accentAlt: p.alt,
      heroText: p.text,
      bgColor: p.bg,
      bgType: p.bgType,
    });
  };

  const activePresetId = DESIGN_PRESETS.find(
    (p) => p.accent === d.accentColor && p.bg === d.bgColor
  )?.id;

  return (
    <Card hairline>
      <CardHeader
        title="Visual Design"
        subtitle="Customise your classroom colours, background, and pattern overlay"
        icon={Palette}
      />
      <div className="space-y-6 p-5">

        {/* ── Color Presets ── */}
        <section className="space-y-3">
          <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-500">
            Color Presets
          </h3>
          <div className="flex flex-wrap gap-2">
            {DESIGN_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                title={p.label}
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                  activePresetId === p.id
                    ? 'border-gold-500/40 bg-gold-500/10 text-gold-300'
                    : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                }`}
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.accent }} />
                {p.label}
              </button>
            ))}
          </div>
        </section>

        <hr className="border-white/8" />

        {/* ── Custom Colors ── */}
        <section className="space-y-3">
          <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-500">
            Custom Colors
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <ColorField
              label="Accent Color"
              hint="Buttons, badges, progress bars"
              value={d.accentColor}
              onChange={(v) => updateClassroomDesign({ accentColor: v, preset: 'custom' })}
            />
            <ColorField
              label="Accent Alt"
              hint="Gradient end / secondary"
              value={d.accentAlt}
              onChange={(v) => updateClassroomDesign({ accentAlt: v, preset: 'custom' })}
            />
            <ColorField
              label="Hero Text Color"
              hint="Text colour on the hero banner"
              value={d.heroText}
              onChange={(v) => updateClassroomDesign({ heroText: v, preset: 'custom' })}
            />
          </div>
        </section>

        <hr className="border-white/8" />

        {/* ── Background ── */}
        <section className="space-y-3">
          <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-500">
            Background
          </h3>
          <div className="flex gap-2">
            {['solid', 'gradient', 'image'].map((t) => (
              <button
                key={t}
                onClick={() => updateClassroomDesign({ bgType: t })}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold capitalize tracking-wide transition-all ${
                  d.bgType === t
                    ? 'border-gold-500/40 bg-gold-500/10 text-gold-300'
                    : 'border-white/10 text-zinc-400 hover:border-white/20'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {d.bgType === 'solid' && (
            <ColorField
              label="Background Color"
              hint="Main surface colour — keep dark for best legibility."
              value={d.bgColor}
              onChange={(v) => updateClassroomDesign({ bgColor: v })}
            />
          )}

          {d.bgType === 'gradient' && (
            <div className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField
                  label="Gradient From"
                  value={d.bgGradientFrom}
                  onChange={(v) => updateClassroomDesign({ bgGradientFrom: v })}
                />
                <ColorField
                  label="Gradient To"
                  value={d.bgGradientTo}
                  onChange={(v) => updateClassroomDesign({ bgGradientTo: v })}
                />
              </div>
              <ColorField
                label="Surface Color (cards)"
                hint="Used for card and sidebar backgrounds — usually a dark shade."
                value={d.bgColor}
                onChange={(v) => updateClassroomDesign({ bgColor: v })}
              />
            </div>
          )}

          {d.bgType === 'image' && (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                  Image URL
                </label>
                <input
                  type="url"
                  value={d.bgImageUrl}
                  onChange={(e) => updateClassroomDesign({ bgImageUrl: e.target.value })}
                  placeholder="https://example.com/your-background.jpg"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Link to a hosted image. The solid background colour shows if blank.
                </p>
              </div>
              <ColorField
                label="Surface Color (cards)"
                hint="Card and sidebar background under the image."
                value={d.bgColor}
                onChange={(v) => updateClassroomDesign({ bgColor: v })}
              />
              <RangeField
                label="Image Opacity"
                value={d.bgImageOpacity}
                min={0.05}
                max={1}
                step={0.05}
                onChange={(v) => updateClassroomDesign({ bgImageOpacity: v })}
                format={(v) => `${Math.round(v * 100)}%`}
              />
            </div>
          )}
        </section>

        <hr className="border-white/8" />

        {/* ── Pattern Overlay ── */}
        <section className="space-y-3">
          <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-500">
            Pattern Overlay
          </h3>
          <p className="text-[11px] text-zinc-500">
            Subtle SVG pattern tiled over the background. White patterns look best on dark surfaces.
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PATTERNS).map((key) => (
              <button
                key={key}
                onClick={() => updateClassroomDesign({ pattern: key })}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                  d.pattern === key
                    ? 'border-gold-500/40 bg-gold-500/10 text-gold-300'
                    : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                }`}
              >
                {key === 'none' ? 'None' : key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
          {d.pattern !== 'none' && (
            <RangeField
              label="Pattern Opacity"
              value={d.patternOpacity}
              min={0.01}
              max={0.3}
              step={0.01}
              onChange={(v) => updateClassroomDesign({ patternOpacity: v })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          )}
        </section>

        <hr className="border-white/8" />

        {/* ── Live Preview ── */}
        <section className="space-y-3">
          <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-500">
            Live Preview
          </h3>
          <DesignPreview d={d} />
        </section>
      </div>
    </Card>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ClassroomSettings() {
  const { teacherProfile, updateTeacherProfile } = useApp();
  const [showGCSync, setShowGCSync] = useState(false);

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
      <ClassManager />

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
              Example:{' '}
              <span className="font-bold text-gold-300">{currencyName || 'Spirit Points'}</span>
              {' '}· badge shows{' '}
              <span className="font-bold text-gold-300">{currencySymbol || 'SP'}</span>
            </div>
          </section>

          {/* Grading Period */}
          <section className="space-y-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-500">
              Grading Period
            </h3>
            <p className="text-[11px] text-zinc-500">
              Controls which grading period is active for Mole Dollar grade drops (drop-lowest items). Students are blocked from using the same drop type twice in the same period.
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((p) => (
                <button
                  key={p}
                  onClick={() => updateTeacherProfile({ currentGradingPeriod: p })}
                  className={`font-display flex h-10 w-16 items-center justify-center rounded-xl border text-sm font-bold uppercase tracking-wide transition-all ${
                    teacherProfile.currentGradingPeriod === p
                      ? 'border-gold-500/40 bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/40'
                      : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  Q{p}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500">
              Active: <strong className="text-zinc-200">Quarter {teacherProfile.currentGradingPeriod || 1}</strong>
            </p>
          </section>

          {/* Save */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={save}
              disabled={
                !isDirty ||
                !name.trim() ||
                !classroom.trim() ||
                !tagline.trim() ||
                !currencyName.trim() ||
                !currencySymbol.trim()
              }
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

          {/* Sidebar live preview */}
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

      <VisualDesignCard />

      {/* ── Classroom Roster ── */}
      <Card hairline>
        <CardHeader
          title="Classroom Roster"
          subtitle="Import students directly from Google Classroom"
          icon={Users}
        />
        <div className="space-y-4 p-5">
          <p className="text-[13px] text-zinc-400 leading-relaxed">
            Students join your Google Classroom on day one. Once everyone has joined,
            use this button to sync the full roster into the portal in seconds. New students
            will be prompted to complete the{' '}
            <span className="font-semibold text-zinc-200">Welcome Wizard</span> on their first login
            — where they set up Gizmos credentials, sign the safety contract, and add a guardian.
          </p>

          <div className="rounded-xl border border-white/8 bg-ink-950/40 px-4 py-3 text-[11px] text-zinc-500">
            <strong className="font-semibold text-zinc-300">How it works</strong>
            <ol className="mt-1.5 list-decimal list-inside space-y-0.5">
              <li>Students join your Google Classroom course as usual.</li>
              <li>You click Sync — the portal matches each course to your portal classes.</li>
              <li>New students are added instantly; existing ones are never duplicated.</li>
            </ol>
          </div>

          {SUPABASE_READY ? (
            <button
              onClick={() => setShowGCSync(true)}
              className="font-display flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400"
            >
              🎓 Sync from Google Classroom
            </button>
          ) : (
            <div className="rounded-xl border border-white/8 bg-ink-950/60 px-4 py-3 text-[11px] text-zinc-500">
              Connect a Supabase project to enable roster sync. Add{' '}
              <code className="font-mono text-zinc-300">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono text-zinc-300">VITE_SUPABASE_ANON_KEY</code> to your
              environment variables.
            </div>
          )}
        </div>
      </Card>

      {showGCSync && <GCSyncModal onClose={() => setShowGCSync(false)} />}
    </div>
  );
}
