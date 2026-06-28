import { Fragment, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  Users,
  Link2,
  ArrowRight,
  ArrowLeft,
  PenLine,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useApp } from '../ClassroomContext.jsx';
import { SAFETY_RULES } from '../data/mockData.js';
import { formatDateTime } from '../utils/format.js';

const STEPS = [
  { id: 1, label: 'Roster Match', icon: Link2 },
  { id: 2, label: 'Lab & Safety', icon: ShieldCheck },
  { id: 3, label: 'Gizmos Lockbox', icon: KeyRound },
  { id: 4, label: 'Guardian Intake', icon: Users },
];

export default function WelcomeWizard() {
  const { activeStudent, getClass, completeWizard, teacherProfile } = useApp();
  const cls = getClass(activeStudent.classId);

  const [step, setStep] = useState(1);
  const [signName, setSignName] = useState('');
  const [signedAt, setSignedAt] = useState(null);
  const [gizmo, setGizmo] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [guardian, setGuardian] = useState({ name: '', phone: '', email: '' });

  const nameMatches =
    signName.trim().toLowerCase() === activeStudent.name.trim().toLowerCase();

  const sign = () => {
    if (nameMatches) setSignedAt(new Date().toISOString());
  };

  const canAdvance = useMemo(() => {
    if (step === 1) return true;
    if (step === 2) return nameMatches && !!signedAt;
    if (step === 3) return gizmo.username.trim() && gizmo.password.trim();
    if (step === 4) return guardian.name.trim() && guardian.phone.trim() && guardian.email.trim();
    return false;
  }, [step, nameMatches, signedAt, gizmo, guardian]);

  const finish = () => {
    completeWizard(activeStudent.id, {
      gizmo,
      guardian,
      safety: { signedName: signName.trim(), signedAt },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto app-backdrop p-4">
      <div className="my-8 w-full max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-ink-850 ring-1 ring-gold-500/30 shadow-gold">
            <img src="/gmen-logo.png" alt="G-MEN" className="h-[4.5rem] w-[4.5rem] object-contain" />
          </div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-gold-500">
            G-MEN · {teacherProfile.classroom}
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold uppercase tracking-wide text-zinc-50 sm:text-4xl">
            Welcome to {cls?.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Let's get your lab profile set up — this only takes a minute.
          </p>
        </div>

        {/* Step progress bar */}
        <div className="mb-6 flex items-center">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = s.id < step;
            const active = s.id === step;
            return (
              <Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={[
                      'grid h-11 w-11 place-items-center rounded-2xl ring-2 transition-all',
                      done
                        ? 'bg-gold-500 text-ink-950 ring-gold-400'
                        : active
                        ? 'bg-gold-500 text-ink-950 ring-white/40 scale-110 shadow-gold'
                        : 'bg-ink-800 text-zinc-500 ring-white/10',
                    ].join(' ')}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={`font-display text-[10px] font-semibold uppercase tracking-wide ${
                      active ? 'text-zinc-50' : done ? 'text-gold-400' : 'text-zinc-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-1 mb-5 h-0.5 flex-1 rounded-full transition-all ${
                      s.id < step ? 'bg-gold-500' : 'bg-white/10'
                    }`}
                  />
                )}
              </Fragment>
            );
          })}
        </div>

        {/* Step body */}
        <div className="rounded-2xl border border-white/10 bg-ink-850/80 p-6 shadow-2xl backdrop-blur brand-hairline">
          {step === 1 && <StepRoster student={activeStudent} cls={cls} />}
          {step === 2 && (
            <StepSafety
              signName={signName}
              setSignName={setSignName}
              nameMatches={nameMatches}
              signedAt={signedAt}
              sign={sign}
              studentName={activeStudent.name}
            />
          )}
          {step === 3 && (
            <StepGizmo
              gizmo={gizmo}
              setGizmo={setGizmo}
              showPw={showPw}
              setShowPw={setShowPw}
            />
          )}
          {step === 4 && <StepGuardian guardian={guardian} setGuardian={setGuardian} teacherName={teacherProfile.name} />}
        </div>

        {/* Footer nav */}
        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="font-display text-xs uppercase tracking-wide text-zinc-500">
            Step {step} of {STEPS.length}
          </span>
          {step < STEPS.length ? (
            <button
              onClick={() => canAdvance && setStep((s) => s + 1)}
              disabled={!canAdvance}
              className="font-display flex items-center gap-1.5 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => canAdvance && finish()}
              disabled={!canAdvance}
              className="font-display flex items-center gap-1.5 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" /> Enter the Lab
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Step 1: Roster Match -----------------------------------------------------
function StepRoster({ student, cls }) {
  return (
    <div className="space-y-4">
      <StepHeading
        icon={Link2}
        title="Roster Match"
        subtitle="Connecting to your Jag Schools account…"
      />
      <div className="flex items-center gap-3 rounded-xl border border-gold-500/30 bg-gold-500/10 p-4">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-gold-400" />
        <div>
          <p className="text-sm font-semibold text-zinc-50">Google Classroom connected</p>
          <p className="text-xs text-gold-300/80">{student.email}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InfoTile label="Mapped Student" value={student.name} />
        <InfoTile label="Class Period" value={`Period ${cls?.period}`} />
        <InfoTile label="Course" value={cls?.name} />
        <InfoTile label="Lab Room" value={cls?.room} />
      </div>
      <p className="text-center text-xs text-zinc-500">
        Everything look right? Continue to review your lab safety contract.
      </p>
    </div>
  );
}

// --- Step 2: Lab & Safety Contract -------------------------------------------
function StepSafety({ signName, setSignName, nameMatches, signedAt, sign, studentName }) {
  return (
    <div className="space-y-4">
      <StepHeading
        icon={ShieldCheck}
        title="Lab & Safety Contract"
        subtitle="Read carefully, then digitally sign to acknowledge."
      />
      <ul className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-ink-950/60 p-4">
        {SAFETY_RULES.map((rule, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
            <span className="mt-0.5 font-bold text-gold-400">{i + 1}.</span>
            {rule}
          </li>
        ))}
      </ul>

      <div className="rounded-xl border border-white/10 bg-ink-950/60 p-4">
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
          <PenLine className="h-3.5 w-3.5" /> Type your full name to sign:{' '}
          <span className="text-zinc-500">({studentName})</span>
        </label>
        <input
          value={signName}
          onChange={(e) => setSignName(e.target.value)}
          placeholder="Your full legal name"
          disabled={!!signedAt}
          className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 font-serif text-lg italic text-white placeholder:not-italic placeholder:font-sans placeholder:text-sm placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none disabled:opacity-70"
        />
        {!signedAt ? (
          <button
            onClick={sign}
            disabled={!nameMatches}
            className="font-display mt-3 w-full rounded-lg bg-gold-500 py-2 text-sm font-bold uppercase tracking-wide text-ink-950 transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-zinc-500"
          >
            {nameMatches ? 'Digitally Sign Contract' : 'Name must match exactly'}
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-xs text-gold-300">
            <CheckCircle2 className="h-4 w-4" />
            Signed by <strong>{signName}</strong> · {formatDateTime(signedAt)}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Step 3: Gizmos Password Lockbox -----------------------------------------
function StepGizmo({ gizmo, setGizmo, showPw, setShowPw }) {
  return (
    <div className="space-y-4">
      <StepHeading
        icon={KeyRound}
        title="Gizmos Password Lockbox"
        subtitle="Save your ExploreLearning Gizmos login — we'll show it back only to you when you forget."
      />
      <Field
        label="Gizmo Class Username"
        value={gizmo.username}
        onChange={(v) => setGizmo((g) => ({ ...g, username: v }))}
        placeholder="e.g. jdoe.chem"
      />
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-300">Gizmo Password</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={gizmo.password}
            onChange={(e) => setGizmo((g) => ({ ...g, password: e.target.value }))}
            placeholder="Your Gizmo password"
            className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 pr-10 text-sm text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-2 top-2 text-zinc-400 hover:text-white"
          >
            {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-ink-950/60 p-3 text-xs text-zinc-400">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
        Stored privately in your lockbox. Only <strong>you</strong> can reveal it later from your
        dashboard — your teacher and classmates never see it.
      </div>
    </div>
  );
}

// --- Step 4: Guardian Contact Intake -----------------------------------------
function StepGuardian({ guardian, setGuardian, teacherName }) {
  return (
    <div className="space-y-4">
      <StepHeading
        icon={Users}
        title="Guardian Contact Intake"
        subtitle={`So ${teacherName} can share great news (and the occasional heads-up) with your family.`}
      />
      <Field
        label="Parent / Guardian Full Name"
        value={guardian.name}
        onChange={(v) => setGuardian((g) => ({ ...g, name: v }))}
        placeholder="e.g. Jane Doe"
      />
      <Field
        label="Phone Number"
        value={guardian.phone}
        onChange={(v) => setGuardian((g) => ({ ...g, phone: v }))}
        placeholder="(555) 123-4567"
        type="tel"
      />
      <Field
        label="Email Address"
        value={guardian.email}
        onChange={(v) => setGuardian((g) => ({ ...g, email: v }))}
        placeholder="guardian@email.com"
        type="email"
      />
    </div>
  );
}

// --- Shared bits --------------------------------------------------------------
function StepHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-500/10 ring-1 ring-gold-500/40">
        <Icon className="h-6 w-6 text-gold-400" />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-50">{title}</h2>
        <p className="text-xs text-zinc-400">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-zinc-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
      />
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-sm font-bold text-zinc-50">{value}</p>
    </div>
  );
}
