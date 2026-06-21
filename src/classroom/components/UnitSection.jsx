import React, { useState } from 'react';
import {
  ChevronDown,
  Plus,
  Trash2,
  FolderOpen,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { MATERIAL_TYPES, MATERIAL_TYPE_ORDER } from '../data/mockData.js';
import { useApp } from '../ClassroomContext.jsx';
import MaterialRow from './MaterialRow.jsx';
import FileDropzone from './FileDropzone.jsx';
import StudyToolGenerator from './StudyToolGenerator.jsx';
import Badge from './Badge.jsx';
import EmptyState from './EmptyState.jsx';

export default function UnitSection({ unit, theme, canManage, defaultOpen = false }) {
  const { addMaterial, deleteUnit } = useApp();
  const [open, setOpen] = useState(defaultOpen);
  const [showStudy, setShowStudy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    type: 'guided_notes',
    title: '',
    description: '',
    studyContent: '',
  });
  const [file, setFile] = useState(null);

  const materials = unit.materials || [];
  const grouped = MATERIAL_TYPE_ORDER.map((t) => ({
    type: t,
    items: materials.filter((m) => m.type === t),
  })).filter((g) => g.items.length > 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || busy) return;
    setBusy(true);
    await addMaterial(unit.id, form, file);
    setBusy(false);
    setForm({ type: 'guided_notes', title: '', description: '', studyContent: '' });
    setFile(null);
    setAdding(false);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-850/70">
      {/* Unit header */}
      <div className={`flex items-center gap-3 bg-gradient-to-r ${theme.gradient} px-4 py-3`}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left text-ink-950"
        >
          <ChevronDown
            className={`h-5 w-5 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
          />
          <div className="min-w-0">
            <h3 className="font-display truncate text-lg font-bold uppercase tracking-wide">
              {unit.title}
            </h3>
            {unit.description && (
              <p className="truncate text-xs font-semibold opacity-80">{unit.description}</p>
            )}
          </div>
        </button>
        <span className="shrink-0 rounded-full bg-ink-950/25 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-950">
          {materials.length} {materials.length === 1 ? 'item' : 'items'}
        </span>
        {canManage && (
          <button
            onClick={() => {
              if (confirm(`Delete "${unit.title}" and all its materials?`)) deleteUnit(unit.id);
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-950/70 transition-colors hover:bg-ink-950/20 hover:text-ink-950"
            aria-label="Delete unit"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-4 p-4">
          {/* Materials */}
          {materials.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No materials yet"
              subtitle={canManage ? 'Add your first material below.' : 'Check back soon.'}
            />
          ) : (
            <div className="space-y-3">
              {grouped.map((g) => (
                <div key={g.type}>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {MATERIAL_TYPES[g.type].label}
                  </p>
                  <div className="space-y-1.5">
                    {g.items.map((m) => (
                      <MaterialRow key={m.id} material={m} unitId={unit.id} canManage={canManage} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Teacher: add material */}
          {canManage && (
            <div>
              {!adding ? (
                <button
                  onClick={() => setAdding(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-400 transition-all hover:border-gold-500/40 hover:text-gold-300"
                >
                  <Plus className="h-4 w-4" /> Add Material
                </button>
              ) : (
                <form
                  onSubmit={submit}
                  className="space-y-3 rounded-xl border border-white/10 bg-ink-950/40 p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-zinc-300">Type</label>
                      <select
                        value={form.type}
                        onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
                      >
                        {MATERIAL_TYPE_ORDER.map((t) => (
                          <option key={t} value={t}>
                            {MATERIAL_TYPES[t].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-zinc-300">Title</label>
                      <input
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="e.g. Mole Conversions — Guided Notes"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <FileDropzone file={file} onFile={setFile} />

                  <input
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Short description (optional)"
                    className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
                  />

                  <div>
                    <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-zinc-300">
                      <Sparkles className="h-3 w-3 text-gold-400" /> Study content / key terms
                      <span className="text-zinc-500">(optional — powers the generator)</span>
                    </label>
                    <textarea
                      value={form.studyContent}
                      onChange={(e) => setForm((f) => ({ ...f, studyContent: e.target.value }))}
                      rows={3}
                      placeholder={'One per line:\nMole: 6.022 × 10²³ particles\nMolar mass: grams per mole'}
                      className="w-full resize-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
                    />
                    <p className="mt-1 text-[10px] text-zinc-600">
                      PDF uploads are auto-read. For slides/docs, paste “Term: definition” lines here.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={!form.title.trim() || busy}
                      className="font-display flex items-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-950 transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {busy ? 'Saving…' : 'Save Material'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdding(false);
                        setFile(null);
                      }}
                      className="rounded-lg bg-ink-750 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-300 hover:bg-ink-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Study tool generator */}
          <div className="border-t border-white/10 pt-3">
            {!showStudy ? (
              <button
                onClick={() => setShowStudy(true)}
                className="font-display flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500/10 py-3 text-sm font-bold uppercase tracking-wide text-gold-300 ring-1 ring-gold-500/30 transition-all hover:bg-gold-500/20"
              >
                <Sparkles className="h-4 w-4" /> Generate Study Tool
                <Badge tone="gold">flashcards · quiz</Badge>
              </button>
            ) : (
              <StudyToolGenerator materials={materials} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
