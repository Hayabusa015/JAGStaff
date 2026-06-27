import { useEffect, useRef, useState } from 'react';
import { X, ChevronRight, Loader2, CheckCircle2, AlertCircle, Users, RefreshCw } from 'lucide-react';
import { useApp } from '../ClassroomContext.jsx';
import { useClassroomSync } from '../../supabase.js';

// GCSyncModal — multi-step Google Classroom roster import for the classroom portal.
// Steps: requesting → mapping → previewing → syncing → done | error

function fuzzyMatch(localName, gcName) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return norm(gcName).includes(norm(localName)) || norm(localName).includes(norm(gcName));
}

export default function GCSyncModal({ onClose }) {
  const { classes, bulkProvisionStudents } = useApp();
  const { requestToken, listCourses, listStudents } = useClassroomSync();

  const [step, setStep] = useState('requesting');
  const [, setToken] = useState(null);
  const [gcCourses, setGcCourses] = useState([]);
  // mapping: { [localClassId]: gcCourseId | '' }
  const [mapping, setMapping] = useState({});
  // preview: [{ localClass, gcCourse, students: [{firstName,lastName,studentEmail,gcUserId}] }]
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const tokenRef = useRef(null);

  // Step 1: request GIS token on mount
  useEffect(() => {
    let cancelled = false;
    async function go() {
      try {
        const t = await requestToken();
        if (cancelled) return;
        tokenRef.current = t;
        setToken(t);
        const courses = await listCourses(t);
        if (cancelled) return;
        setGcCourses(courses);

        // Auto-match local classes to GC courses by name similarity
        const autoMap = {};
        classes.forEach((cls) => {
          const match = courses.find((c) => fuzzyMatch(cls.name, c.name));
          autoMap[cls.id] = match?.id || '';
        });
        setMapping(autoMap);
        setStep('mapping');
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e.message || 'Failed to connect to Google Classroom.');
          setStep('error');
        }
      }
    }
    go();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 2 → 3: load student preview
  async function loadPreview() {
    setStep('previewing');
    try {
      const t = tokenRef.current;
      const entries = [];
      for (const cls of classes) {
        const gcId = mapping[cls.id];
        if (!gcId) continue;
        const gcCourse = gcCourses.find((c) => c.id === gcId);
        const students = await listStudents(t, gcId);
        entries.push({ localClass: cls, gcCourse, students });
      }
      setPreview(entries);
    } catch (e) {
      setErrorMsg(e.message || 'Failed to load student roster.');
      setStep('error');
    }
  }

  // Step 3 → 4: run bulk provision
  async function runSync() {
    setStep('syncing');
    try {
      const rows = preview.flatMap(({ localClass, students }) =>
        students.map((s) => ({
          classId: localClass.id,
          studentEmail: s.studentEmail,
          studentName: `${s.firstName} ${s.lastName}`.trim(),
        }))
      );
      const res = await bulkProvisionStudents(rows);
      setResult(res);
      setStep('done');
    } catch (e) {
      setErrorMsg(e.message || 'Sync failed. Please try again.');
      setStep('error');
    }
  }

  const totalStudents = preview.reduce((n, e) => n + e.students.length, 0);
  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={step !== 'syncing' ? onClose : undefined}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎓</span>
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-zinc-50">
                Sync from Google Classroom
              </h2>
              <p className="text-[11px] text-zinc-500">Import your roster directly into the portal</p>
            </div>
          </div>
          {step !== 'syncing' && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* ── Step: requesting ── */}
          {step === 'requesting' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-gold-400" />
              <p className="text-sm text-zinc-300">Connecting to Google Classroom…</p>
              <p className="text-[11px] text-zinc-500">
                A browser pop-up may appear asking for permission.
              </p>
            </div>
          )}

          {/* ── Step: mapping ── */}
          {step === 'mapping' && (
            <div className="space-y-4">
              {classes.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-ink-950/60 px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-zinc-300">No classes yet</p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Create your classes in the classroom settings first, then sync.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-zinc-400">
                    Match each of your portal classes to the corresponding Google Classroom course.
                    Unmatched classes are skipped.
                  </p>
                  <div className="space-y-2">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="grid grid-cols-2 items-center gap-3 rounded-xl border border-white/8 bg-ink-950/40 px-4 py-3"
                      >
                        <div>
                          <p className="text-xs font-semibold text-zinc-100">{cls.name}</p>
                          <p className="text-[10px] text-zinc-500">Period {cls.period} · {cls.subject}</p>
                        </div>
                        <select
                          value={mapping[cls.id] || ''}
                          onChange={(e) => setMapping((m) => ({ ...m, [cls.id]: e.target.value }))}
                          className="rounded-lg border border-white/10 bg-ink-900 px-2.5 py-2 text-xs text-zinc-200 focus:border-gold-500 focus:outline-none"
                        >
                          <option value="">— Skip —</option>
                          {gcCourses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}{c.section ? ` · ${c.section}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step: previewing (loading) ── */}
          {step === 'previewing' && preview.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-gold-400" />
              <p className="text-sm text-zinc-300">Loading student rosters…</p>
            </div>
          )}

          {/* ── Step: previewing (loaded) ── */}
          {step === 'previewing' && preview.length > 0 && (
            <div className="space-y-4">
              <p className="text-[11px] text-zinc-400">
                Review the roster below. Only students not yet in the portal will be added.
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {preview.map(({ localClass, gcCourse, students }) => (
                  <div
                    key={localClass.id}
                    className="rounded-xl border border-white/8 bg-ink-950/40 px-4 py-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold text-zinc-100">{localClass.name}</p>
                      <span className="rounded-full bg-gold-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-gold-300">
                        {students.length} students
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      from GC: {gcCourse?.name}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 px-4 py-3">
                <p className="text-sm font-bold text-gold-300">
                  {totalStudents} student{totalStudents !== 1 ? 's' : ''} ready to sync
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  Each new student will start the Welcome Wizard on first login.
                </p>
              </div>
            </div>
          )}

          {/* ── Step: syncing ── */}
          {step === 'syncing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-gold-400" />
              <p className="text-sm text-zinc-300">Syncing roster to the portal…</p>
            </div>
          )}

          {/* ── Step: done ── */}
          {step === 'done' && result && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-400" />
              <div>
                <p className="font-display text-lg font-bold text-zinc-50">Sync Complete</p>
                <p className="mt-1 text-sm text-zinc-300">
                  <span className="font-bold text-gold-300">{result.added}</span> student
                  {result.added !== 1 ? 's' : ''} added
                  {result.skipped > 0 && (
                    <span className="text-zinc-500"> · {result.skipped} already in portal</span>
                  )}
                </p>
              </div>
              {result.added > 0 && (
                <div className="w-full rounded-xl border border-white/8 bg-ink-950/40 px-4 py-3 text-left">
                  <p className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <Users className="h-3.5 w-3.5 shrink-0 text-gold-400" />
                    New students will complete the Welcome Wizard on their first login — where they
                    set up their Gizmos credentials, sign the safety contract, and add a guardian
                    contact.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Step: error ── */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <div>
                <p className="font-display text-base font-bold text-zinc-50">Something went wrong</p>
                <p className="mt-1 text-[11px] text-zinc-400">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-white/8 px-6 py-4">
          {step === 'mapping' && classes.length > 0 && (
            <>
              <button
                onClick={onClose}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={loadPreview}
                disabled={mappedCount === 0}
                className="font-display flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Preview Roster <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {step === 'previewing' && preview.length > 0 && (
            <>
              <button
                onClick={() => setStep('mapping')}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              >
                Back
              </button>
              <button
                onClick={runSync}
                disabled={totalStudents === 0}
                className="font-display flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                🎓 Sync {totalStudents} Student{totalStudents !== 1 ? 's' : ''}
              </button>
            </>
          )}

          {step === 'done' && (
            <button
              onClick={onClose}
              className="font-display flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400"
            >
              Done
            </button>
          )}

          {step === 'error' && (
            <>
              <button
                onClick={onClose}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setStep('requesting');
                  setGcCourses([]);
                  setMapping({});
                  setPreview([]);
                  setErrorMsg('');
                  // re-trigger the effect by toggling a key — remount instead
                }}
                className="font-display flex items-center gap-2 rounded-xl border border-gold-500/40 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-gold-300 transition-all hover:bg-gold-500/10"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </>
          )}

          {(step === 'mapping' && classes.length === 0) && (
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-400 hover:border-white/20 hover:text-zinc-200"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
