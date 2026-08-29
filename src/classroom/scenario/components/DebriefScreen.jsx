import { MessagesSquare, CheckCircle2 } from 'lucide-react';
import Card, { CardHeader } from '../../components/Card.jsx';

export default function DebriefScreen({ scenario, session, actions }) {
  const { debrief } = scenario;
  return (
    <Card>
      <CardHeader title="Debrief" subtitle={`Protect ${debrief.minutes} minutes — this is where the learning consolidates`} icon={MessagesSquare} />
      <div className="space-y-4 p-5">
        {debrief.questions.map((q, i) => (
          <div key={i}>
            <p className="mb-1.5 text-sm font-semibold text-zinc-100">{i + 1}. {q}</p>
            <textarea
              value={session.debriefNotes[i] || ''}
              onChange={(e) => actions.setDebriefNote(i, e.target.value)}
              rows={2}
              placeholder="Team notes (optional)..."
              className="w-full rounded-lg border border-white/10 bg-ink-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-gold-500/50 focus:outline-none"
            />
          </div>
        ))}
        {debrief.closingNote && (
          <p className="rounded-lg bg-gold-500/10 px-3 py-2 text-xs text-gold-200 ring-1 ring-gold-500/20">{debrief.closingNote}</p>
        )}
        <button
          onClick={actions.finishDebrief}
          className="font-display flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink-950 hover:bg-gold-400"
        >
          <CheckCircle2 className="h-4 w-4" /> Finish
        </button>
      </div>
    </Card>
  );
}
