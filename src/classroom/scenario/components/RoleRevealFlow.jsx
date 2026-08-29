import { useState } from 'react';
import { Eye, EyeOff, ArrowRight, Users, Lock, Swords } from 'lucide-react';
import Card, { CardHeader } from '../../components/Card.jsx';

// One shared device, five secret roles. Pass-and-reveal flow, party-game
// style: only the student holding the device at that moment sees their
// hidden goal, then it's hidden again before the device moves on.
export default function RoleRevealFlow({ scenario, roleAssignments, onSetRole, onBegin }) {
  const roles = scenario.roles;
  const [step, setStep] = useState(0); // -1 = intro, 0..4 = a role, roles.length = summary
  const [revealed, setRevealed] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  if (step === -1) {
    return (
      <Card>
        <CardHeader title="Assemble the Team" subtitle={`${roles.length} roles, one shared device`} icon={Users} />
        <div className="space-y-4 p-5 text-sm text-zinc-300">
          <p>{scenario.designNote}</p>
          <p className="text-zinc-400">
            Each teammate will get a turn holding the device. Your public goal is fine to say out loud — your
            hidden goal is not. Read it, remember it, hide it, pass the device on.
          </p>
          <button
            onClick={() => setStep(0)}
            className="font-display flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink-950 hover:bg-gold-400"
          >
            Start Assigning Roles <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Card>
    );
  }

  if (step >= roles.length) {
    return (
      <Card>
        <CardHeader title="Team Assembled" subtitle="Everyone knows their public goal — and only their own secret" icon={Swords} />
        <div className="space-y-4 p-5">
          <ul className="space-y-1.5 text-sm text-zinc-300">
            {roles.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg bg-ink-850/60 px-3 py-2">
                <span className="font-semibold text-zinc-100">{r.name}</span>
                <span className="text-xs text-zinc-500">{roleAssignments[r.id] || 'unnamed player'}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={onBegin}
            className="font-display flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink-950 hover:bg-gold-400"
          >
            Begin the Investigation <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Card>
    );
  }

  const role = roles[step];

  if (!revealed) {
    return (
      <Card className="text-center">
        <div className="space-y-4 p-8">
          <Lock className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="font-display text-xs font-bold uppercase tracking-widest text-zinc-500">Pass the device to</p>
          <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-50">{role.name}</h3>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Your name (optional)"
            className="mx-auto block w-full max-w-xs rounded-lg border border-white/10 bg-ink-950/60 px-3 py-2 text-center text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-gold-500/50 focus:outline-none"
          />
          <button
            onClick={() => { onSetRole(role.id, nameDraft.trim()); setRevealed(true); }}
            className="font-display mx-auto flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink-950 hover:bg-gold-400"
          >
            <Eye className="h-4 w-4" /> Reveal My Card
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={role.name} subtitle="Only you should be reading this" icon={Eye} />
      <div className="space-y-3 p-5 text-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Public goal</p>
          <p className="text-zinc-200">{role.publicGoal}</p>
        </div>
        <div className="rounded-lg bg-gold-500/10 px-3 py-2.5 ring-1 ring-gold-500/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gold-400">Secret — don't say this out loud</p>
          <p className="text-gold-100">{role.hiddenGoal}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">You hold</p>
          <p className="text-zinc-200">{role.holds}</p>
        </div>
        <button
          onClick={() => { setRevealed(false); setNameDraft(''); setStep((s) => s + 1); }}
          className="font-display mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-zinc-200 ring-1 ring-white/10 hover:bg-white/10"
        >
          <EyeOff className="h-4 w-4" /> Hide &amp; Pass the Device
        </button>
      </div>
    </Card>
  );
}
