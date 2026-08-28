import { ArrowRight, GitBranch } from 'lucide-react';
import NarrativeLog from './NarrativeLog.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';

export default function RevealScreen({ scenario, session, actions }) {
  return (
    <div className="space-y-4">
      <NarrativeLog entries={session.narrativeLog} />

      <Card>
        <CardHeader title="Other Roads" subtitle="What the other choices would have looked like" icon={GitBranch} />
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {scenario.reveal.counterfactuals.map((cf) => (
            <div key={cf.title} className="rounded-xl border border-white/10 bg-ink-850/60 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gold-400">{cf.title}</p>
              <p className="mt-1 text-sm text-zinc-300">{cf.text}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card accent="border-gold-500/60" className="text-center">
        <div className="p-6">
          <button
            onClick={actions.continueFromReveal}
            className="font-display mx-auto flex items-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-ink-950 hover:bg-gold-400"
          >
            Continue to the Debrief <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}
