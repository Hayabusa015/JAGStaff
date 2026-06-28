import { useState, useMemo } from 'react';
import { FlaskConical, Atom, Mountain, Plus, Library, X, Copy } from 'lucide-react';
import { useApp } from '../ClassroomContext.jsx';
import UnitSection from '../components/UnitSection.jsx';
import Card, { CardHeader } from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';

const SUBJECT_ICON = { chemistry: FlaskConical, physics: Atom, geology: Mountain };

export default function MaterialsView() {
  const { role, classes, activeStudent, getClass, getTheme, getUnitsForClass, addUnit } = useApp();

  const isTeacher = role === 'teacher';
  const studentClassId = activeStudent?.classId;
  const [activeClassId, setActiveClassId] = useState(
    isTeacher ? classes[0]?.id : studentClassId
  );
  const classId = isTeacher ? activeClassId : studentClassId;

  const [addingUnit, setAddingUnit] = useState(false);
  const [unitForm, setUnitForm] = useState({ title: '', description: '' });
  const [syncIds, setSyncIds] = useState([]);

  const theme = getTheme(classId);
  const cls = getClass(classId);
  const units = getUnitsForClass(classId);

  // Other classes the teacher can sync this unit to
  const otherClasses = useMemo(
    () => classes.filter((c) => c.id !== classId),
    [classes, classId]
  );

  const toggleSync = (id) =>
    setSyncIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectAllSync = () =>
    setSyncIds(otherClasses.map((c) => c.id));

  const submitUnit = (e) => {
    e.preventDefault();
    if (!unitForm.title.trim()) return;
    addUnit(classId, unitForm);
    syncIds.forEach((id) => addUnit(id, unitForm));
    setUnitForm({ title: '', description: '' });
    setSyncIds([]);
    setAddingUnit(false);
  };

  return (
    <div className="space-y-5">
      {/* Class tabs (teacher) or class banner (student) */}
      {isTeacher ? (
        <div className="flex flex-wrap gap-2">
          {classes.map((c) => {
            const t = getTheme(c.id);
            const Icon = SUBJECT_ICON[c.subject] || Library;
            const active = c.id === activeClassId;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveClassId(c.id);
                  setAddingUnit(false);
                  setSyncIds([]);
                }}
                className={[
                  'font-display flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-all',
                  active
                    ? `${t.bgSoft} ${t.border} ${t.text} ring-1 ${t.ring} shadow-gold-sm`
                    : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {c.name}
              </button>
            );
          })}
        </div>
      ) : (
        <Card hairline>
          <div className={`flex items-center gap-3 bg-gradient-to-r ${theme.gradient} px-5 py-3`}>
            <Library className="h-5 w-5 text-ink-950" />
            <div className="text-ink-950">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide">
                {cls?.name} · Materials
              </h2>
              <p className="text-xs font-semibold opacity-80">
                Notes, worksheets, labs & study tools for your class
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Teacher: add unit */}
      {isTeacher && (
        <div>
          {!addingUnit ? (
            <button
              onClick={() => setAddingUnit(true)}
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-400 transition-all hover:border-gold-500/40 hover:text-gold-300"
            >
              <Plus className="h-4 w-4" /> Add Unit
            </button>
          ) : (
            <Card>
              <CardHeader
                title="New Unit"
                subtitle={`Added to ${cls?.name}`}
                icon={Plus}
                action={
                  <button
                    onClick={() => { setAddingUnit(false); setSyncIds([]); }}
                    className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                }
              />
              <form onSubmit={submitUnit} className="space-y-3 p-4">
                <input
                  value={unitForm.title}
                  onChange={(e) => setUnitForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Unit title — e.g. Unit 7 · Gas Laws"
                  autoFocus
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
                />
                <input
                  value={unitForm.description}
                  onChange={(e) => setUnitForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description (optional)"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
                />
                {otherClasses.length > 0 && (
                  <div className="rounded-lg border border-white/8 bg-white/[0.03] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Copy className="h-3 w-3" /> Also add to
                      </p>
                      {otherClasses.length > 1 && (
                        <button
                          type="button"
                          onClick={selectAllSync}
                          className="text-[10px] font-semibold text-gold-400 hover:text-gold-300 uppercase tracking-wide"
                        >
                          Select all
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {otherClasses.map((c) => {
                        const checked = syncIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleSync(c.id)}
                            className={[
                              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                              checked
                                ? 'border-gold-500/60 bg-gold-500/15 text-gold-300'
                                : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200',
                            ].join(' ')}
                          >
                            <span className={`h-2.5 w-2.5 rounded-full border ${checked ? 'border-gold-400 bg-gold-400' : 'border-zinc-500'}`} />
                            {c.name}
                            {c.period ? ` · P${c.period}` : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={!unitForm.title.trim()}
                  className="font-display flex items-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-950 transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  {syncIds.length > 0 ? `Create Unit in ${syncIds.length + 1} Classes` : 'Create Unit'}
                </button>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* Units */}
      {units.length === 0 ? (
        <Card>
          <EmptyState
            icon={Library}
            title="No units yet"
            subtitle={isTeacher ? 'Add a unit to start building your materials library.' : 'Your teacher hasn’t posted materials yet.'}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {units.map((unit, i) => (
            <UnitSection
              key={unit.id}
              unit={unit}
              theme={theme}
              canManage={isTeacher}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
