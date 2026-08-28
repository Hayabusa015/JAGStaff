import { Check, ClipboardList } from 'lucide-react';
import Card, { CardHeader } from '../../components/Card.jsx';

export default function ActionsPanel({ actions, actionsTaken, pressAnswer, onToggle, onPressAnswer, onSubmit }) {
  const needsPressAnswer = actionsTaken.includes('public_meeting');
  const canSubmit = !needsPressAnswer || !!pressAnswer;

  return (
    <Card accent="border-gold-500/60">
      <CardHeader title="Round Actions" subtitle={actions.prompt} icon={ClipboardList} />
      <div className="space-y-4 p-5">
        <div className="space-y-2">
          {actions.options.map((opt) => {
            const checked = actionsTaken.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => onToggle(opt.id)}
                className={[
                  'flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors',
                  checked
                    ? 'border-gold-500/60 bg-gold-500/10 text-gold-100'
                    : 'border-white/10 bg-ink-850/50 text-zinc-300 hover:border-white/20',
                ].join(' ')}
              >
                <span className={[
                  'grid h-5 w-5 shrink-0 place-items-center rounded-md border',
                  checked ? 'border-gold-400 bg-gold-400/20' : 'border-zinc-600',
                ].join(' ')}
                >
                  {checked && <Check className="h-3 w-3 text-gold-300" />}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>

        {needsPressAnswer && (
          <div className="rounded-xl border border-white/10 bg-ink-850/60 p-4">
            <p className="mb-2 text-sm text-zinc-200">
              Kendra asks: "Do you think the well is causing this, and what are you doing about it?" How does the team answer?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onPressAnswer('honest')}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide ${pressAnswer === 'honest' ? 'bg-gold-500 text-ink-950' : 'bg-white/5 text-zinc-300 ring-1 ring-white/10'}`}
              >
                Answer Honestly
              </button>
              <button
                onClick={() => onPressAnswer('deflect')}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide ${pressAnswer === 'deflect' ? 'bg-gold-500 text-ink-950' : 'bg-white/5 text-zinc-300 ring-1 ring-white/10'}`}
              >
                Deflect
              </button>
            </div>
          </div>
        )}

        <button
          disabled={!canSubmit}
          onClick={onSubmit}
          className="font-display w-full rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink-950 transition-opacity hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Lock In This Round's Actions
        </button>
      </div>
    </Card>
  );
}
