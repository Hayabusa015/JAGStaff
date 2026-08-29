// =============================================================================
//  SCENARIO GAME ENGINE
//  Generic, data-driven runner for D&D-style branching science scenarios.
//  A scenario module (see ./data/marlowCounty.js) supplies characters, roles,
//  meters, rounds (cold open → evidence gate → actions/decision → beats →
//  closing), a reveal, and a debrief. This file contains NO content of its
//  own — every scenario plugs into the same state machine, so a future
//  Chemistry or Physics scenario just needs a new data file with the same
//  shape.
//
//  Session state is plain JSON (safe for localStorage). Trigger predicates on
//  beats/decisions read a small derived "trigger state" object built by
//  deriveTriggerState() below.
// =============================================================================

let uidCounter = 0;
const nextId = (prefix) => `${prefix}-${Date.now().toString(36)}-${(uidCounter++).toString(36)}`;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// -----------------------------------------------------------------------------
//  Session creation
// -----------------------------------------------------------------------------
export function createSession(scenario, teamName) {
  const meters = {};
  scenario.meters.forEach((m) => { meters[m.id] = m.start; });

  const charTrust = {};
  scenario.characters.forEach((c) => { charTrust[c.id] = c.startingTrust; });

  const gates = {};
  scenario.rounds.forEach((r) => {
    gates[r.gate.id] = { answered: false, choiceId: null, correct: null, passed: false, reasoning: '' };
  });

  const now = new Date().toISOString();
  return {
    scenarioId: scenario.id,
    teamName: teamName || 'Untitled Team',
    createdAt: now,
    updatedAt: now,
    phase: 'roles', // roles → gate → actions|decision → closing → (next round) → reveal → debrief → complete
    roundIndex: 0,
    roleAssignments: {}, // { roleId: playerName }
    meters,
    charTrust,
    flags: {},
    gates,
    actionsTaken: [],
    pressAnswer: null, // 'honest' | 'deflect' | null
    decision: null,
    beatsShown: [],
    narrativeLog: [],
    debriefNotes: {},
  };
}

// -----------------------------------------------------------------------------
//  Derived view passed into scenario `when()` / `modifiers()` predicates.
// -----------------------------------------------------------------------------
export function deriveTriggerState(session) {
  return {
    round: session.roundIndex,
    actionsTaken: new Set(session.actionsTaken),
    pressAnswer: session.pressAnswer,
    flags: session.flags,
    gates: session.gates,
    charTrust: session.charTrust,
    meters: session.meters,
    decision: session.decision,
  };
}

// -----------------------------------------------------------------------------
//  Effect application — the only place meters/trust/flags actually change.
//  effects: { meters: { meterId: number | (cur)=>next }, charTrust: { id: delta }, flags: { key: bool } }
// -----------------------------------------------------------------------------
export function applyEffects(scenario, session, effects = {}) {
  const meters = { ...session.meters };
  if (effects.meters) {
    for (const [key, delta] of Object.entries(effects.meters)) {
      const def = scenario.meters.find((m) => m.id === key);
      const cur = meters[key] ?? 0;
      const raw = typeof delta === 'function' ? delta(cur) : cur + delta;
      meters[key] = def ? clamp(raw, def.min, def.max) : raw;
    }
  }
  const charTrust = { ...session.charTrust };
  if (effects.charTrust) {
    for (const [key, delta] of Object.entries(effects.charTrust)) {
      charTrust[key] = clamp((charTrust[key] ?? 0) + delta, 0, 10);
    }
  }
  const flags = effects.flags ? { ...session.flags, ...effects.flags } : session.flags;
  return { ...session, meters, charTrust, flags };
}

function pushLog(session, entry) {
  return {
    ...session,
    narrativeLog: [
      ...session.narrativeLog,
      { id: nextId('log'), ts: new Date().toISOString(), ...entry },
    ],
  };
}

function touch(session) {
  return { ...session, updatedAt: new Date().toISOString() };
}

export function getRound(scenario, session) {
  return scenario.rounds[session.roundIndex];
}

// -----------------------------------------------------------------------------
//  ROLE ASSIGNMENT (phase: 'roles')
// -----------------------------------------------------------------------------
export function setRoleAssignment(session, roleId, playerName) {
  return touch({ ...session, roleAssignments: { ...session.roleAssignments, [roleId]: playerName } });
}

export function beginInvestigation(scenario, session) {
  return enterColdOpen(scenario, touch({ ...session, roundIndex: 0 }));
}

// -----------------------------------------------------------------------------
//  COLD OPEN — pushes the narration for the current round, then opens the gate.
// -----------------------------------------------------------------------------
export function enterColdOpen(scenario, session) {
  const round = getRound(scenario, session);
  const state = deriveTriggerState(session);
  const lines = typeof round.coldOpen === 'function' ? round.coldOpen(state) : round.coldOpen;
  let next = pushLog(session, {
    kind: 'coldopen', roundId: round.id, roundTitle: round.title, title: round.title, text: lines,
  });
  if (typeof round.coldOpenEffects === 'function') {
    const result = round.coldOpenEffects(state) || {};
    if (result.effects) next = applyEffects(scenario, next, result.effects);
  }
  next.phase = 'gate';
  return touch(next);
}

// -----------------------------------------------------------------------------
//  EVIDENCE GATE (phase: 'gate')
// -----------------------------------------------------------------------------
export function submitGateAnswer(scenario, session, choiceId, reasoning) {
  const round = getRound(scenario, session);
  const gate = round.gate;
  const choice = gate.choices.find((c) => c.id === choiceId);
  const correct = !!choice?.correct;
  const gates = {
    ...session.gates,
    [gate.id]: { answered: true, choiceId, correct, passed: correct, reasoning: reasoning || '' },
  };
  let next = { ...session, gates };
  const fx = correct ? gate.effects?.correct : gate.effects?.incorrect;
  next = applyEffects(scenario, next, fx || {});
  next = pushLog(next, {
    kind: 'gate', roundId: round.id, title: gate.title, correct,
    text: [fx?.log, gate.science].filter(Boolean),
  });
  next.phase = round.actions ? 'actions' : 'decision';
  return touch(next);
}

// -----------------------------------------------------------------------------
//  ROUND ACTIONS (phase: 'actions', Round 1 only)
// -----------------------------------------------------------------------------
export function toggleAction(session, actionId) {
  const has = session.actionsTaken.includes(actionId);
  const actionsTaken = has
    ? session.actionsTaken.filter((a) => a !== actionId)
    : [...session.actionsTaken, actionId];
  return touch({ ...session, actionsTaken });
}

export function setPressAnswer(session, answer) {
  return touch({ ...session, pressAnswer: answer });
}

export function submitActions(scenario, session) {
  return resolveRoundBeats(scenario, session);
}

// -----------------------------------------------------------------------------
//  DECISIONS (phase: 'decision', Rounds 2-3)
// -----------------------------------------------------------------------------
export function chooseDecisionOption(scenario, session, optionId) {
  const round = getRound(scenario, session);
  const option = round.decision.options.find((o) => o.id === optionId);
  return touch({
    ...session,
    decision: {
      optionId,
      rollGated: !!option?.rollGated,
      signoffs: {},
      roll: null, // { d1, d2, total, mod, modNotes, grand, dc }
      rollSuccess: option?.rollGated ? null : true,
    },
  });
}

export function toggleSignoff(session, roleId) {
  if (!session.decision) return session;
  const signoffs = { ...session.decision.signoffs, [roleId]: !session.decision.signoffs[roleId] };
  return touch({ ...session, decision: { ...session.decision, signoffs } });
}

export function signoffCount(session) {
  if (!session.decision) return 0;
  return Object.values(session.decision.signoffs).filter(Boolean).length;
}

export function rollDecisionDice(scenario, session) {
  const round = getRound(scenario, session);
  const rollCfg = round.decision.roll;
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  const total = d1 + d2;
  const { mod, notes } = rollCfg.modifiers(deriveTriggerState(session));
  const grand = total + mod;
  const success = grand >= rollCfg.dc;
  return touch({
    ...session,
    decision: {
      ...session.decision,
      roll: { d1, d2, total, mod, modNotes: notes, grand, dc: rollCfg.dc },
      rollSuccess: success,
    },
  });
}

export function canLockDecision(scenario, session) {
  const round = getRound(scenario, session);
  if (!session.decision) return { ok: false, reason: 'Choose an option first.' };
  const required = round.decision.requiresSignoff || 0;
  const have = signoffCount(session);
  if (have < required) return { ok: false, reason: `${have} of 5 roles have signed off — need ${required}.` };
  if (session.decision.rollGated && session.decision.rollSuccess === null) {
    return { ok: false, reason: 'Roll the dice before locking in this option.' };
  }
  return { ok: true, reason: '' };
}

export function lockDecision(scenario, session) {
  const round = getRound(scenario, session);
  let next = pushLog(session, {
    kind: 'decision', roundId: round.id, title: round.decision.title,
    text: [decisionSummaryLine(round, session)],
  });
  return resolveRoundBeats(scenario, next);
}

function decisionSummaryLine(round, session) {
  const option = round.decision.options.find((o) => o.id === session.decision.optionId);
  const roll = session.decision.roll;
  const rollPart = roll
    ? ` Rolled ${roll.d1}+${roll.d2} (${roll.total}) ${roll.mod >= 0 ? '+' : ''}${roll.mod} = ${roll.grand} vs DC ${roll.dc} — ${session.decision.rollSuccess ? 'success' : 'fail'}.`
    : '';
  return `The team commits to: "${option?.label}."${rollPart}`;
}

// -----------------------------------------------------------------------------
//  BEAT RESOLUTION — shared by actions phase and decision phase.
// -----------------------------------------------------------------------------
export function resolveRoundBeats(scenario, session) {
  const round = getRound(scenario, session);
  let working = session;
  const resolvedIds = [];
  for (const beat of round.beats) {
    if (working.beatsShown.includes(beat.id)) continue;
    const state = deriveTriggerState(working);
    if (beat.when(state)) {
      working = applyEffects(scenario, working, beat.effects || {});
      working = { ...working, beatsShown: [...working.beatsShown, beat.id] };
      working = pushLog(working, {
        kind: 'beat', roundId: round.id, beatId: beat.id, title: beat.title,
        text: [beat.text], teachNote: beat.teachNote,
      });
      resolvedIds.push(beat.id);
    }
  }
  working.phase = 'closing';
  return touch(working);
}

// -----------------------------------------------------------------------------
//  CLOSING → next round, or → reveal
// -----------------------------------------------------------------------------
export function continueFromClosing(scenario, session) {
  const round = getRound(scenario, session);
  let next = session;
  if (round.closing?.effects && Object.keys(round.closing.effects).length) {
    next = applyEffects(scenario, next, round.closing.effects);
  }
  if (round.closing?.text?.length) {
    next = pushLog(next, { kind: 'closing', roundId: round.id, title: `${round.title} — Closing`, text: round.closing.text });
  }
  const isLast = session.roundIndex >= scenario.rounds.length - 1;
  if (isLast) {
    return enterReveal(scenario, touch(next));
  }
  next = touch({
    ...next,
    roundIndex: session.roundIndex + 1,
    actionsTaken: [],
    pressAnswer: null,
    decision: null,
  });
  return enterColdOpen(scenario, next);
}

function enterReveal(scenario, session) {
  const next = pushLog(session, {
    kind: 'reveal', title: scenario.reveal.title, text: scenario.reveal.text,
  });
  return touch({ ...next, phase: 'reveal' });
}

export function continueFromReveal(session) {
  return touch({ ...session, phase: 'debrief' });
}

export function setDebriefNote(session, index, text) {
  return touch({ ...session, debriefNotes: { ...session.debriefNotes, [index]: text } });
}

export function finishDebrief(session) {
  return touch({ ...session, phase: 'complete' });
}

// -----------------------------------------------------------------------------
//  Selectors / helpers for UI
// -----------------------------------------------------------------------------
export function meterStatus(meterDef, value) {
  const { min, max, failAt, failDirection } = meterDef;
  const margin = (max - min || 1) * 0.15;
  if (failDirection === 'high') {
    if (value >= failAt) return 'critical';
    if (value >= failAt - margin) return 'warning';
    return 'ok';
  }
  if (value <= failAt) return 'critical';
  if (value <= failAt + margin) return 'warning';
  return 'ok';
}

export function formatMeterValue(meterDef, value) {
  if (meterDef.format === 'currency') return `$${Math.round(value).toLocaleString()}`;
  return `${Math.round(value)}`;
}

export const ROLE_COUNT = 5;
