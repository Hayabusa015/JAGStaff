import { Gavel, Dices, Check, Lock, ShieldCheck } from 'lucide-react';
import Card, { CardHeader } from '../../components/Card.jsx';
import Badge from '../../components/Badge.jsx';

export default function DecisionPanel({
  decisionDef, roles, roleAssignments, triggerState, decision,
  onChooseOption, onToggleSignoff, onRollDice, onLock, canLock, signoffCount,
}) {
  const selectedOption = decision ? decisionDef.options.find((o) => o.id === decision.optionId) : null;

  return (
    <Card accent="border-gold-500/60">
      <CardHeader title={decisionDef.title} subtitle={decisionDef.prompt} icon={Gavel} />
      <div className="space-y-5 p-5">
        {/* Options */}
        <div className="space-y-2">
          {decisionDef.options.map((opt) => {
            const locked = opt.requires && !opt.requires(triggerState);
            const selected = decision?.optionId === opt.id;
            return (
              <button
                key={opt.id}
                disabled={locked}
                onClick={() => onChooseOption(opt.id)}
                className={[
                  'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                  locked
                    ? 'cursor-not-allowed border-white/5 bg-ink-850/30 opacity-40'
                    : selected
                    ? 'border-gold-500/60 bg-gold-500/10'
                    : 'border-white/10 bg-ink-850/50 hover:border-white/20',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-sm font-semibold ${selected ? 'text-gold-100' : 'text-zinc-100'}`}>{opt.label}</span>
                  {opt.rollGated && <Badge tone="neutral" icon={Dices}>Roll required</Badge>}
                  {locked && <Badge tone="neutral">Locked — needs both gates</Badge>}
                </div>
                <p className="mt-1 text-xs text-zinc-500">{opt.description}</p>
                {opt.preview && <p className="mt-1 text-[11px] text-zinc-600">Estimated: {opt.preview}</p>}
              </button>
            );
          })}
        </div>

        {/* Sign-off */}
        {decision && (
          <div className="rounded-xl border border-white/10 bg-ink-850/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Role Sign-Off
              </p>
              <span className="text-xs text-zinc-500">{signoffCount} of 5 · need {decisionDef.requiresSignoff}</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {roles.map((r) => {
                const on = !!decision.signoffs[r.id];
                return (
                  <button
                    key={r.id}
                    onClick={() => onToggleSignoff(r.id)}
                    className={[
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors',
                      on ? 'bg-gold-500/15 text-gold-200 ring-1 ring-gold-500/30' : 'bg-white/5 text-zinc-400 ring-1 ring-white/10',
                    ].join(' ')}
                  >
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? 'border-gold-400 bg-gold-400/30' : 'border-zinc-600'}`}>
                      {on && <Check className="h-2.5 w-2.5 text-gold-200" />}
                    </span>
                    <span className="truncate">{r.name}{roleAssignments[r.id] ? ` — ${roleAssignments[r.id]}` : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Dice roll */}
        {decision && selectedOption?.rollGated && (
          <div className="rounded-xl border border-white/10 bg-ink-850/60 p-4">
            {!decision.roll ? (
              <button
                onClick={onRollDice}
                className="font-display flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-zinc-100 ring-1 ring-white/10 hover:bg-white/10"
              >
                <Dices className="h-4 w-4" /> Roll 2d6 vs. DC {decisionDef.roll.dc}
              </button>
            ) : (
              <div className="space-y-1.5 text-sm">
                <p className="text-zinc-300">
                  Rolled <span className="font-bold text-zinc-50">{decision.roll.d1} + {decision.roll.d2}</span> = {decision.roll.total}
                  {' '}{decision.roll.mod >= 0 ? '+' : ''}{decision.roll.mod} modifier = <span className="font-bold">{decision.roll.grand}</span> vs DC {decision.roll.dc}
                </p>
                {decision.roll.modNotes.length > 0 && (
                  <ul className="text-[11px] text-zinc-500">
                    {decision.roll.modNotes.map((n) => <li key={n}>{n}</li>)}
                  </ul>
                )}
                <p className={`font-display text-sm font-bold uppercase tracking-wide ${decision.rollSuccess ? 'text-gold-400' : 'text-red-400'}`}>
                  {decision.rollSuccess ? 'Success' : 'Failed'}
                </p>
              </div>
            )}
          </div>
        )}

        <button
          disabled={!canLock.ok}
          onClick={onLock}
          className="font-display flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink-950 transition-opacity hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Lock className="h-4 w-4" /> Lock In the Team's Decision
        </button>
        {!canLock.ok && decision && <p className="text-center text-xs text-zinc-500">{canLock.reason}</p>}
      </div>
    </Card>
  );
}
