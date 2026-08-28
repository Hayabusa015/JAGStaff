import { useMemo, useState } from 'react';
import {
  Mountain, Printer, PlayCircle, Users, Trash2, BookOpenText, Flag, Sparkles,
  Gavel, MessageSquareWarning, ArrowLeft,
} from 'lucide-react';
import Card, { CardHeader } from '../../components/Card.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { listScenarios } from '../scenarioLibrary.js';
import { listTeamSessions, deleteTeamSession } from '../useScenarioSession.js';
import ScenarioPlayer from './ScenarioPlayer.jsx';

export default function TeacherScenarioPanel() {
  const scenarios = listScenarios();
  const [scenarioId] = useState(scenarios[0]?.id || null);
  const [mode, setMode] = useState('guide'); // 'guide' | 'playtest'
  const scenario = scenarios.find((s) => s.id === scenarioId);
  const [refreshTick, setRefreshTick] = useState(0);
  const teams = useMemo(() => (scenario ? listTeamSessions(scenario.id) : []), [scenario, refreshTick]);

  if (!scenario) {
    return <EmptyState icon={Mountain} title="No scenarios yet" subtitle="Add one to src/classroom/scenario/data/ and list it in scenarioLibrary.js." />;
  }

  if (mode === 'playtest') {
    return (
      <div className="space-y-3">
        <button onClick={() => setMode('guide')} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Facilitator Guide
        </button>
        <ScenarioPlayer />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-50">{scenario.title}</h2>
          <p className="text-xs text-zinc-500">{scenario.unitLabel} · {scenario.format.days} class days · {scenario.format.rolesPerTeam} roles per team</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="font-display flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200 ring-1 ring-white/10 hover:bg-white/10">
            <Printer className="h-4 w-4" /> Print Guide
          </button>
          <button onClick={() => setMode('playtest')} className="font-display flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-950 hover:bg-gold-400">
            <PlayCircle className="h-4 w-4" /> Playtest It Yourself
          </button>
        </div>
      </div>

      {/* Setup + design note */}
      <Card>
        <CardHeader title="The Setup" subtitle="Read this to the class, or project it" icon={BookOpenText} />
        <div className="space-y-2 p-5 text-sm text-zinc-300">
          {scenario.setup.map((line, i) => <p key={i}>{line}</p>)}
          <p className="mt-3 rounded-lg bg-gold-500/10 px-3 py-2 text-xs text-gold-200 ring-1 ring-gold-500/20">
            <span className="font-bold uppercase tracking-wide">Design point: </span>{scenario.designNote}
          </p>
        </div>
      </Card>

      {/* Roles + characters */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Player Roles" subtitle="One per student" />
          <div className="divide-y divide-white/5">
            {scenario.roles.map((r) => (
              <div key={r.id} className="space-y-1 px-5 py-3 text-sm">
                <p className="font-semibold text-zinc-100">{r.name}</p>
                <p className="text-xs text-zinc-400">Public: {r.publicGoal}</p>
                <p className="text-xs text-gold-300">Hidden: {r.hiddenGoal}</p>
                <p className="text-xs text-zinc-500">Holds: {r.holds}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Recurring Characters" subtitle="Trust 0-10, tracked per team" />
          <div className="divide-y divide-white/5">
            {scenario.characters.map((c) => (
              <div key={c.id} className="px-5 py-3 text-sm">
                <p className="font-semibold text-zinc-100">{c.name} <span className="text-xs font-normal text-zinc-500">— starts at {c.startingTrust}/10</span></p>
                <p className="text-xs text-zinc-400">{c.role}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Round-by-round script */}
      {scenario.rounds.map((round) => (
        <Card key={round.id}>
          <CardHeader title={`Round ${round.id} — ${round.title}`} subtitle={round.subtitle} icon={Flag} />
          <div className="space-y-4 p-5 text-sm">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-zinc-500">Cold open</p>
              {typeof round.coldOpen === 'function' ? (
                <p className="text-zinc-400 italic">Branches on whether the school was assessed in Round 1 — see the data file for both versions.</p>
              ) : round.coldOpen.map((l, i) => <p key={i} className="text-zinc-300">{l}</p>)}
            </div>

            <div className="rounded-xl border border-white/10 bg-ink-850/60 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gold-400">
                <Sparkles className="h-3.5 w-3.5" /> Evidence Gate — {round.gate.title}
              </p>
              <p className="text-xs text-zinc-400">{round.gate.question}</p>
              <p className="mt-1 text-xs text-gold-300">Answer key: {round.gate.choices.find((c) => c.correct)?.label}</p>
              <p className="mt-1 text-xs text-zinc-500">{round.gate.science}</p>
            </div>

            {round.actions && (
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-zinc-500">Round actions (team checks any/all)</p>
                <ul className="list-inside list-disc text-xs text-zinc-400">
                  {round.actions.options.map((o) => <li key={o.id}>{o.label}</li>)}
                </ul>
              </div>
            )}

            {round.decision && (
              <div className="rounded-xl border border-white/10 bg-ink-850/60 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gold-400">
                  <Gavel className="h-3.5 w-3.5" /> Decision — {round.decision.title} <Badge tone="neutral">needs {round.decision.requiresSignoff}/5 sign-off</Badge>
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-zinc-400">
                  {round.decision.options.map((o) => (
                    <li key={o.id}><span className="text-zinc-200">{o.label}:</span> {o.preview}{o.rollGated ? ' (roll 2d6 vs DC ' + round.decision.roll.dc + ')' : ''}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-zinc-500">Beats in play this round</p>
              <ul className="space-y-1 text-xs text-zinc-500">
                {round.beats.map((b) => (
                  <li key={b.id}>
                    <span className="font-mono text-zinc-600">{b.id}</span> — {b.title}
                    {b.teachNote && (
                      <span className="ml-2 inline-flex items-center gap-1 text-gold-400">
                        <MessageSquareWarning className="h-3 w-3" /> {b.teachNote}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {round.closing?.text?.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-zinc-500">Closing (always happens)</p>
                {round.closing.text.map((l, i) => <p key={i} className="text-xs text-zinc-400">{l}</p>)}
              </div>
            )}
          </div>
        </Card>
      ))}

      {/* Reveal + debrief */}
      <Card>
        <CardHeader title="The Reveal" subtitle="Show this on the projector after Round 3" />
        <div className="space-y-2 p-5 text-sm text-zinc-300">
          {scenario.reveal.text.map((l, i) => <p key={i}>{l}</p>)}
        </div>
      </Card>
      <Card>
        <CardHeader title="Debrief Questions" subtitle={`Protect ${scenario.debrief.minutes} minutes`} />
        <div className="p-5">
          <ol className="list-inside list-decimal space-y-1.5 text-sm text-zinc-300">
            {scenario.debrief.questions.map((q, i) => <li key={i}>{q}</li>)}
          </ol>
          {scenario.debrief.closingNote && <p className="mt-2 text-xs italic text-gold-300">{scenario.debrief.closingNote}</p>}
        </div>
      </Card>

      {/* Team sessions on this device */}
      <Card>
        <CardHeader title="Teams on This Device" subtitle="Progress saves locally to whatever device a team plays on — this list only shows teams played on this device/browser" icon={Users} />
        {teams.length === 0 ? (
          <EmptyState icon={Users} title="No teams have played here yet" subtitle="Have students open Scenario Games from their own dashboard to start a team." />
        ) : (
          <div className="divide-y divide-white/5">
            {teams.map(({ key, session }) => (
              <div key={key} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{session.teamName}</p>
                  <p className="text-[11px] text-zinc-500">
                    {session.phase === 'complete' ? 'Complete' : session.phase === 'roles' ? 'Not started' : `Round ${session.roundIndex + 1} · ${session.phase}`}
                    {' · Seismic Risk '}{Math.round(session.meters.seismicRisk)} · Trust {Math.round(session.meters.publicTrust)}
                  </p>
                </div>
                <button
                  onClick={() => { if (confirm(`Reset "${session.teamName}"? This can't be undone.`)) { deleteTeamSession(key); setRefreshTick((t) => t + 1); } }}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                  aria-label="Reset team"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
