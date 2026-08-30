import { useState } from 'react';
import { ChevronDown, Plus, Trash2, ListChecks, Loader2 } from 'lucide-react';
import { MATERIAL_TYPES, SECTION_MATERIAL_TYPES, bucketTypesFor } from '../data/mockData.js';
import { useApp } from '../ClassroomContext.jsx';
import CategoryBucket from './CategoryBucket.jsx';
import FileDropzone from './FileDropzone.jsx';

// A named section inside a unit (e.g. "1.1 · Mole Conversions") holding its own
// homework/lab/project assignments, collapsed behind an "Assignments" dropdown
// so a unit with several sections doesn't turn into one long undifferentiated
// list. Assignments are further split into drag-and-drop category buckets
// (Homework / Lab / Project, …) — dragging a card between them recategorizes
// it; dragging one up into the unit's own materials above makes it unit-wide.
export default function SectionBlock({ unit, section, canManage }) {
  const { addMaterial, deleteSection } = useApp();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ type: SECTION_MATERIAL_TYPES[0], title: '', description: '' });
  const [file, setFile] = useState(null);

  const materials = section.materials || [];
  const sectionBucketTypes = bucketTypesFor(SECTION_MATERIAL_TYPES, materials);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || busy) return;
    setBusy(true);
    await addMaterial(unit.id, form, file, section.id);
    setBusy(false);
    setForm({ type: SECTION_MATERIAL_TYPES[0], title: '', description: '' });
    setFile(null);
    setAdding(false);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-ink-950/30">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? '' : '-rotate-90'}`}
          />
          <span className="truncate text-sm font-semibold text-zinc-200">{section.title}</span>
          {section.description && (
            <span className="hidden truncate text-xs text-zinc-500 sm:inline">— {section.description}</span>
          )}
        </button>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
          <ListChecks className="h-3 w-3" /> {materials.length} assignment{materials.length === 1 ? '' : 's'}
        </span>
        {canManage && (
          <button
            onClick={() => {
              if (confirm(`Delete section "${section.title}" and its assignments?`)) deleteSection(unit.id, section.id);
            }}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/15 hover:text-red-300"
            aria-label="Delete section"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-3 border-t border-white/8 p-3">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {sectionBucketTypes.map((t) => (
              <CategoryBucket
                key={t}
                unitId={unit.id}
                sectionId={section.id}
                type={t}
                materials={materials.filter((m) => m.type === t)}
                canManage={canManage}
                compact
              />
            ))}
          </div>

          {canManage && (
            <div>
              {!adding ? (
                <button
                  onClick={() => setAdding(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-400 transition-all hover:border-gold-500/40 hover:text-gold-300"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Assignment
                </button>
              ) : (
                <form onSubmit={submit} className="space-y-2 rounded-lg border border-white/10 bg-ink-950/40 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
                    >
                      {SECTION_MATERIAL_TYPES.map((t) => (
                        <option key={t} value={t}>{MATERIAL_TYPES[t].label}</option>
                      ))}
                    </select>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Mole Conversions Homework"
                      autoFocus
                      className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
                    />
                  </div>
                  <FileDropzone file={file} onFile={setFile} />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={!form.title.trim() || busy}
                      className="font-display flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-950 transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      {busy ? 'Saving…' : 'Save Assignment'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAdding(false); setFile(null); }}
                      className="rounded-lg bg-ink-750 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-300 hover:bg-ink-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
