import { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, X, Trash2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { parseUnitSheetFile, parseOutlineText } from '../utils/unitSheetParser.js';
import { MATERIAL_TYPES, MATERIAL_TYPE_ORDER } from '../data/mockData.js';
import { useApp } from '../ClassroomContext.jsx';
import Card, { CardHeader } from './Card.jsx';

// Drop a unit-breakdown sheet (.csv, tab-separated, or a plain-text outline —
// see unitSheetParser.js for the exact shapes) and review the detected
// Units → Sections → assignment items before bulk-creating them for `classId`.
// Each item is created as a titled placeholder with no file; the teacher attaches
// the real file afterward from that material's row ("Attach File").
export default function UnitSheetImportPanel({ classId, className, onClose, onImported }) {
  const { importUnitBreakdown } = useApp();
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null); // { units, warnings, sourceType }
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [creating, setCreating] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      setParsed(await parseUnitSheetFile(file));
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = () => {
    if (!pasteText.trim()) return;
    setParsed(parseOutlineText(pasteText));
  };

  // ---- Editing the preview before committing ------------------------------
  const updateUnitTitle = (ui, title) =>
    setParsed((p) => ({ ...p, units: p.units.map((u, i) => (i === ui ? { ...u, title } : u)) }));

  const removeUnit = (ui) =>
    setParsed((p) => ({ ...p, units: p.units.filter((_, i) => i !== ui) }));

  const removeUnitMaterial = (ui, mi) =>
    setParsed((p) => ({
      ...p,
      units: p.units.map((u, i) => (i === ui ? { ...u, materials: u.materials.filter((_, j) => j !== mi) } : u)),
    }));

  const setUnitMaterialType = (ui, mi, type) =>
    setParsed((p) => ({
      ...p,
      units: p.units.map((u, i) =>
        i === ui ? { ...u, materials: u.materials.map((m, j) => (j === mi ? { ...m, type } : m)) } : u
      ),
    }));

  const removeSection = (ui, si) =>
    setParsed((p) => ({
      ...p,
      units: p.units.map((u, i) => (i === ui ? { ...u, sections: u.sections.filter((_, j) => j !== si) } : u)),
    }));

  const removeSectionMaterial = (ui, si, mi) =>
    setParsed((p) => ({
      ...p,
      units: p.units.map((u, i) =>
        i !== ui
          ? u
          : {
              ...u,
              sections: u.sections.map((s, j) =>
                j === si ? { ...s, materials: s.materials.filter((_, k) => k !== mi) } : s
              ),
            }
      ),
    }));

  const totals = parsed
    ? parsed.units.reduce(
        (acc, u) => ({
          units: acc.units + 1,
          sections: acc.sections + u.sections.length,
          items: acc.items + u.materials.length + u.sections.reduce((n, s) => n + s.materials.length, 0),
        }),
        { units: 0, sections: 0, items: 0 }
      )
    : null;

  const commit = () => {
    if (!parsed?.units.length || creating) return;
    setCreating(true);
    const result = importUnitBreakdown(classId, parsed.units);
    setCreating(false);
    onImported?.(result);
  };

  return (
    <Card>
      <CardHeader
        title="Import Unit Breakdown"
        subtitle={`Bulk-create units & sections in ${className}`}
        icon={FileSpreadsheet}
        action={
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        }
      />

      <div className="space-y-4 p-4">
        {!parsed && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => inputRef.current?.click()}
              className={[
                'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all',
                drag ? 'border-gold-400 bg-gold-500/10' : 'border-white/15 bg-ink-950/40 hover:border-gold-500/40 hover:bg-gold-500/5',
              ].join(' ')}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.txt,.tsv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {loading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
                  <p className="text-sm font-semibold text-zinc-200">Reading sheet…</p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-6 w-6 text-gold-400" />
                  <p className="text-sm font-semibold text-zinc-200">Drop your unit breakdown sheet or click to upload</p>
                  <p className="text-[11px] text-zinc-500">
                    .csv or a tab-separated export, with Unit / Section / Assignment columns
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="h-px flex-1 bg-white/10" />
              or
              <span className="h-px flex-1 bg-white/10" />
            </div>

            {!pasteMode ? (
              <button
                onClick={() => setPasteMode(true)}
                className="w-full rounded-lg border border-dashed border-white/15 py-2 text-xs font-bold uppercase tracking-wide text-zinc-400 transition-all hover:border-gold-500/40 hover:text-gold-300"
              >
                Paste an outline instead
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={8}
                  placeholder={'Unit 1: Stoichiometry\nOverall Powerpoint for unit\nGuided notes for unit\nStudy guide for unit\nSection 1.1: Mole Conversions\nHomework — mole conversions practice\nDensity Lab'}
                  className="w-full resize-y rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
                />
                <button
                  onClick={handlePaste}
                  disabled={!pasteText.trim()}
                  className="font-display rounded-lg bg-gold-500 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-950 transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Parse Outline
                </button>
              </div>
            )}
          </>
        )}

        {parsed && (
          <div className="space-y-4">
            {parsed.warnings?.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-gold-500/30 bg-gold-500/10 p-3 text-xs text-gold-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  {parsed.warnings.map((w, i) => <p key={i}>{w}</p>)}
                </div>
              </div>
            )}

            {parsed.units.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Nothing came out of that — check the sheet's structure and try again, or use the paste-outline option.
              </p>
            ) : (
              <>
                <p className="text-xs text-zinc-500">
                  Review what was detected below — remove anything wrong, fix titles, or reassign a type — then create.
                </p>
                <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                  {parsed.units.map((u, ui) => (
                    <div key={ui} className="rounded-xl border border-white/10 bg-ink-950/40 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <input
                          value={u.title}
                          onChange={(e) => updateUnitTitle(ui, e.target.value)}
                          className="flex-1 rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-sm font-semibold text-white focus:border-gold-500 focus:outline-none"
                        />
                        <button
                          onClick={() => removeUnit(ui)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-red-500/15 hover:text-red-300"
                          aria-label="Remove unit"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {u.materials.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {u.materials.map((m, mi) => (
                            <span key={mi} className="flex items-center gap-1 rounded-full bg-white/5 py-1 pl-2.5 pr-1 text-[11px] text-zinc-300">
                              <select
                                value={m.type}
                                onChange={(e) => setUnitMaterialType(ui, mi, e.target.value)}
                                className="bg-transparent text-gold-300 focus:outline-none"
                              >
                                {MATERIAL_TYPE_ORDER.map((t) => (
                                  <option key={t} value={t} className="bg-ink-900 text-white">{MATERIAL_TYPES[t].label}</option>
                                ))}
                              </select>
                              {m.title}
                              <button onClick={() => removeUnitMaterial(ui, mi)} className="grid h-4 w-4 place-items-center rounded-full hover:bg-red-500/20 hover:text-red-300">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {u.sections.length > 0 && (
                        <div className="space-y-1.5 border-t border-white/10 pt-2">
                          {u.sections.map((s, si) => (
                            <div key={si} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-zinc-300">{s.title}</span>
                                <button
                                  onClick={() => removeSection(ui, si)}
                                  className="grid h-6 w-6 place-items-center rounded-lg text-zinc-500 hover:bg-red-500/15 hover:text-red-300"
                                  aria-label="Remove section"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              {s.materials.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {s.materials.map((m, mi) => (
                                    <span key={mi} className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
                                      {(MATERIAL_TYPES[m.type] || MATERIAL_TYPES.other).label} · {m.title}
                                      <button onClick={() => removeSectionMaterial(ui, si, mi)} className="grid h-3.5 w-3.5 place-items-center rounded-full hover:bg-red-500/20 hover:text-red-300">
                                        <X className="h-2.5 w-2.5" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={commit}
                    disabled={!totals.units || creating}
                    className="font-display flex items-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-950 transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {creating
                      ? 'Creating…'
                      : `Create ${totals.units} Unit${totals.units === 1 ? '' : 's'}, ${totals.sections} Section${totals.sections === 1 ? '' : 's'}, ${totals.items} Item${totals.items === 1 ? '' : 's'}`}
                  </button>
                  <button
                    onClick={() => setParsed(null)}
                    className="rounded-lg bg-ink-750 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-300 hover:bg-ink-700"
                  >
                    Start Over
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
