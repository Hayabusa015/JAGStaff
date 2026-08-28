import { ArrowRight } from 'lucide-react';
import NarrativeLog from './NarrativeLog.jsx';
import EvidenceGateCard from './EvidenceGateCard.jsx';
import ActionsPanel from './ActionsPanel.jsx';
import DecisionPanel from './DecisionPanel.jsx';
import Card from '../../components/Card.jsx';
import { deriveTriggerState, canLockDecision, signoffCount } from '../engine.js';

export default function RoundStage({ scenario, session, actions }) {
  const round = scenario.rounds[session.roundIndex];
  const triggerState = deriveTriggerState(session);

  return (
    <div className="space-y-4">
      <NarrativeLog entries={session.narrativeLog} />

      {session.phase === 'gate' && (
        <EvidenceGateCard gate={round.gate} onSubmit={actions.submitGate} />
      )}

      {session.phase === 'actions' && round.actions && (
        <ActionsPanel
          actions={round.actions}
          actionsTaken={session.actionsTaken}
          pressAnswer={session.pressAnswer}
          onToggle={actions.toggleAction}
          onPressAnswer={actions.setPressAnswer}
          onSubmit={actions.submitActions}
        />
      )}

      {session.phase === 'decision' && round.decision && (
        <DecisionPanel
          decisionDef={round.decision}
          roles={scenario.roles}
          roleAssignments={session.roleAssignments}
          triggerState={triggerState}
          decision={session.decision}
          onChooseOption={actions.chooseOption}
          onToggleSignoff={actions.toggleSignoff}
          onRollDice={actions.rollDice}
          onLock={actions.lockDecision}
          canLock={canLockDecision(scenario, session)}
          signoffCount={signoffCount(session)}
        />
      )}

      {session.phase === 'closing' && (
        <Card accent="border-gold-500/60" className="text-center">
          <div className="p-6">
            <button
              onClick={actions.continueFromClosing}
              className="font-display mx-auto flex items-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-ink-950 hover:bg-gold-400"
            >
              {session.roundIndex >= scenario.rounds.length - 1 ? 'See What Was Really Happening' : `Continue to Round ${session.roundIndex + 2}`}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
