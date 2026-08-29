import { useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import Card, { CardHeader } from '../../components/Card.jsx';
import { GATE_VISUALS } from './visuals/index.js';

export default function EvidenceGateCard({ gate, onSubmit }) {
  const [choiceId, setChoiceId] = useState(null);
  const [reasoning, setReasoning] = useState('');
  const Visual = GATE_VISUALS[gate.visual];

  return (
    <Card accent="border-gold-500/60">
      <CardHeader title={gate.title} subtitle="Evidence Gate — read it as a team" icon={Sparkles} />
      <div className="space-y-4 p-5">
        <p className="text-sm text-zinc-400">{gate.prompt}</p>
        {Visual && (
          <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
            <Visual data={gate.data} />
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold text-zinc-100">{gate.question}</p>
          <div className="space-y-2">
            {gate.choices.map((c) => (
              <button
                key={c.id}
                onClick={() => setChoiceId(c.id)}
                className={[
                  'flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors',
                  choiceId === c.id
                    ? 'border-gold-500/60 bg-gold-500/10 text-gold-100'
                    : 'border-white/10 bg-ink-850/50 text-zinc-300 hover:border-white/20',
                ].join(' ')}
              >
                <span className={[
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full border',
                  choiceId === c.id ? 'border-gold-400 bg-gold-400/20' : 'border-zinc-600',
                ].join(' ')}
                >
                  {choiceId === c.id && <Check className="h-3 w-3 text-gold-300" />}
                </span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-zinc-500">
            {gate.reasoningPrompt}
          </label>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            rows={3}
            placeholder="Write your team's reasoning here (2-4 sentences)..."
            className="w-full rounded-lg border border-white/10 bg-ink-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-gold-500/50 focus:outline-none"
          />
        </div>

        <button
          disabled={!choiceId}
          onClick={() => onSubmit(choiceId, reasoning)}
          className="font-display w-full rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink-950 transition-opacity hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Submit the Team's Answer
        </button>
      </div>
    </Card>
  );
}
