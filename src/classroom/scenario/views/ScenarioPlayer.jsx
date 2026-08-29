import { useState } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { getScenario } from '../scenarioLibrary.js';
import { useScenarioSession } from '../useScenarioSession.js';
import ScenarioLobby from './ScenarioLobby.jsx';
import RoleRevealFlow from '../components/RoleRevealFlow.jsx';
import RoundStage from '../components/RoundStage.jsx';
import RevealScreen from '../components/RevealScreen.jsx';
import DebriefScreen from '../components/DebriefScreen.jsx';
import CompleteScreen from '../components/CompleteScreen.jsx';
import MeterBar from '../components/MeterBar.jsx';
import CharacterDossier from '../components/CharacterDossier.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';

const PHASE_LABEL = {
  gate: 'Reading the Evidence', actions: 'Round Actions', decision: 'The Decision',
  closing: 'What Happens Next', reveal: 'The Reveal', debrief: 'Debrief', complete: 'Complete',
};

export default function ScenarioPlayer() {
  const [active, setActive] = useState(null); // { scenarioId, teamName }

  if (!active) {
    return <ScenarioLobby onEnter={(scenarioId, teamName) => setActive({ scenarioId, teamName })} />;
  }
  return <ActiveSession scenarioId={active.scenarioId} teamName={active.teamName} onExit={() => setActive(null)} />;
}

function ActiveSession({ scenarioId, teamName, onExit }) {
  const scenario = getScenario(scenarioId);
  const { session, actions } = useScenarioSession(scenario, teamName);
  if (!scenario || !session) return null;

  const showSidebar = session.phase !== 'roles';
  const round = session.phase !== 'roles' && session.phase !== 'reveal' && session.phase !== 'debrief' && session.phase !== 'complete'
    ? scenario.rounds[session.roundIndex] : null;

  return (
    <div className="space-y-4">
      <div>
        <button onClick={onExit} className="mb-1 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Switch Team / Scenario
        </button>
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-50">{scenario.title}</h2>
        <p className="text-xs text-zinc-500">
          Team "{session.teamName}"
          {round && ` · Day ${round.day} · Round ${session.roundIndex + 1} of ${scenario.rounds.length} — ${round.title}`}
          {PHASE_LABEL[session.phase] && ` · ${PHASE_LABEL[session.phase]}`}
        </p>
      </div>

      <div className={showSidebar ? 'grid items-start gap-4 lg:grid-cols-3' : ''}>
        <div className={showSidebar ? 'lg:col-span-2' : ''}>
          {session.phase === 'roles' && (
            <RoleRevealFlow scenario={scenario} roleAssignments={session.roleAssignments} onSetRole={actions.setRole} onBegin={actions.begin} />
          )}
          {['gate', 'actions', 'decision', 'closing'].includes(session.phase) && (
            <RoundStage scenario={scenario} session={session} actions={actions} />
          )}
          {session.phase === 'reveal' && <RevealScreen scenario={scenario} session={session} actions={actions} />}
          {session.phase === 'debrief' && <DebriefScreen scenario={scenario} session={session} actions={actions} />}
          {session.phase === 'complete' && <CompleteScreen scenario={scenario} session={session} onReset={actions.resetSession} />}
        </div>

        {showSidebar && (
          <div className="space-y-4">
            <Card>
              <CardHeader title="The County" subtitle="Shared meters" />
              <div className="space-y-2 p-4">
                {scenario.meters.map((m) => <MeterBar key={m.id} meterDef={m} value={session.meters[m.id]} />)}
              </div>
            </Card>
            <Card>
              <CardHeader title="Characters" subtitle="Trust moves with how they're treated" icon={Users} />
              <div className="p-4">
                <CharacterDossier characters={scenario.characters} charTrust={session.charTrust} />
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
