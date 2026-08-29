import { Trophy, RotateCcw, Printer } from 'lucide-react';
import Card, { CardHeader } from '../../components/Card.jsx';
import MeterBar from './MeterBar.jsx';
import NarrativeLog from './NarrativeLog.jsx';

export default function CompleteScreen({ scenario, session, onReset }) {
  return (
    <div className="space-y-4">
      <Card accent="border-gold-500/60">
        <CardHeader title="Case Closed" subtitle={`${session.teamName} — final standing`} icon={Trophy} />
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {scenario.meters.map((m) => (
              <MeterBar key={m.id} meterDef={m} value={session.meters[m.id]} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.print()}
              className="font-display flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200 ring-1 ring-white/10 hover:bg-white/10"
            >
              <Printer className="h-4 w-4" /> Print / Save Report
            </button>
            <button
              onClick={onReset}
              className="font-display flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200 ring-1 ring-white/10 hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" /> Start This Team Over
            </button>
          </div>
        </div>
      </Card>
      <NarrativeLog entries={session.narrativeLog} autoScroll={false} />
    </div>
  );
}
