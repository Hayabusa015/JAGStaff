import { useMemo, useState } from 'react';
import { Mountain, FlaskConical, Atom, ArrowLeft, ArrowRight, Users, Trash2, PlayCircle } from 'lucide-react';
import Card, { CardHeader } from '../../components/Card.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { listScenarios } from '../scenarioLibrary.js';
import { listTeamSessions, deleteTeamSession, loadLastTeam } from '../useScenarioSession.js';

const SUBJECT_ICON = { geology: Mountain, chemistry: FlaskConical, physics: Atom };

export default function ScenarioLobby({ onEnter }) {
  const scenarios = listScenarios();
  const [scenarioId, setScenarioId] = useState(scenarios.length === 1 ? scenarios[0].id : null);
  const scenario = scenarios.find((s) => s.id === scenarioId);
  const [teamName, setTeamName] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  const teams = useMemo(() => (scenario ? listTeamSessions(scenario.id) : []), [scenario, refreshTick]);
  const last = loadLastTeam();

  if (!scenario) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-50">Scenario Games</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((s) => {
            const Icon = SUBJECT_ICON[s.subject] || Mountain;
            return (
              <Card key={s.id} hover className="cursor-pointer" onClick={() => setScenarioId(s.id)}>
                <div className="space-y-3 p-5">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold-500/10 ring-1 ring-gold-500/30">
                      <Icon className="h-5 w-5 text-gold-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold-500">{s.subject}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold uppercase tracking-wide text-zinc-50">{s.title}</h3>
                  <p className="text-xs text-zinc-400">{s.tagline}</p>
                  <p className="text-[11px] text-zinc-600">{s.unitLabel} · {s.format.days} days · {s.format.rolesPerTeam} roles</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setScenarioId(scenarios.length === 1 ? scenarioId : null)} disabled={scenarios.length === 1} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-0">
        <ArrowLeft className="h-3.5 w-3.5" /> All scenarios
      </button>

      <Card>
        <CardHeader title={scenario.title} subtitle={scenario.tagline} />
        <div className="space-y-4 p-5">
          <p className="text-sm text-zinc-400">{scenario.setup[0]}</p>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-zinc-500">Your lab group / table name</label>
            <div className="flex gap-2">
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Table 3, Period 6 Group B..."
                className="flex-1 rounded-lg border border-white/10 bg-ink-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-gold-500/50 focus:outline-none"
              />
              <button
                disabled={!teamName.trim()}
                onClick={() => onEnter(scenario.id, teamName.trim())}
                className="font-display flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-sm font-bold uppercase tracking-wide text-ink-950 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Go <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {last?.scenarioId === scenario.id && last.teamName && (
              <button onClick={() => onEnter(scenario.id, last.teamName)} className="mt-2 text-xs font-semibold text-gold-400 hover:text-gold-300">
                Resume "{last.teamName}" (last played on this device)
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Teams on This Device" subtitle="Progress is saved locally to the device a team plays on" icon={Users} />
        {teams.length === 0 ? (
          <EmptyState icon={Users} title="No teams yet" subtitle="Enter a team name above to start the first one." />
        ) : (
          <div className="divide-y divide-white/5">
            {teams.map(({ key, session }) => (
              <div key={key} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{session.teamName}</p>
                  <p className="text-[11px] text-zinc-500">
                    {session.phase === 'complete' ? 'Complete' : session.phase === 'roles' ? 'Not started' : `Round ${session.roundIndex + 1} · ${session.phase}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEnter(scenario.id, session.teamName)}
                    className="flex items-center gap-1 rounded-lg bg-gold-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gold-300 ring-1 ring-gold-500/30 hover:bg-gold-500/20"
                  >
                    <PlayCircle className="h-3.5 w-3.5" /> Resume
                  </button>
                  <button
                    onClick={() => { deleteTeamSession(key); setRefreshTick((t) => t + 1); }}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                    aria-label="Delete team"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
