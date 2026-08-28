import { describe, it, expect } from 'vitest';
import marlowCounty from './data/marlowCounty.js';
import * as engine from './engine.js';

describe('scenario engine — Marlow County, best-play path', () => {
  it('starts with the scenario-defined meters and trust', () => {
    const s = engine.createSession(marlowCounty, 'Table 3');
    expect(s.meters).toEqual({ seismicRisk: 22, publicTrust: 60, countyBudget: 400000 });
    expect(s.charTrust.dolores).toBe(5);
    expect(s.phase).toBe('roles');
  });

  it('runs the full three-round best-play path to the exact expected meters', () => {
    let s = engine.createSession(marlowCounty, 'Table 3');
    s = engine.beginInvestigation(marlowCounty, s); // round 1 cold open, phase → gate

    // --- Round 1 ---
    s = engine.submitGateAnswer(marlowCounty, s, 'basement', 'basement rock is fractured and near failure');
    expect(s.gates.gate1.passed).toBe(true);
    expect(s.meters.publicTrust).toBe(65); // 60 + 5

    s = engine.toggleAction(s, 'interview_dolores');
    s = engine.toggleAction(s, 'ask_ray');
    s = engine.toggleAction(s, 'order_assessment');
    s = engine.toggleAction(s, 'call_odnr');
    s = engine.toggleAction(s, 'public_meeting');
    s = engine.setPressAnswer(s, 'honest');
    s = engine.submitActions(marlowCounty, s);

    expect(s.flags.school_known).toBe(true);
    expect(s.flags.pressure_log_hidden).toBeUndefined();
    expect(s.flags.alvarez_dismissed).toBeUndefined();
    expect(s.charTrust.dolores).toBe(8);
    expect(s.charTrust.ray).toBe(9);
    expect(s.charTrust.kendra).toBe(8);
    expect(s.meters.seismicRisk).toBe(18); // 22 - 4 (school assessed)
    expect(s.meters.publicTrust).toBe(75); // 65 + 6 (dolores) + 4 (kendra honest)
    expect(s.phase).toBe('closing');

    s = engine.continueFromClosing(marlowCounty, s); // applies +9 risk, advances to round 2
    expect(s.roundIndex).toBe(1);
    expect(s.meters.seismicRisk).toBe(27);
    expect(s.phase).toBe('gate');

    // --- Round 2 ---
    s = engine.submitGateAnswer(marlowCounty, s, 'month9', 'pressure diffuses slowly through rock');
    expect(s.gates.gate2.passed).toBe(true);
    expect(s.phase).toBe('decision');

    s = engine.chooseDecisionOption(marlowCounty, s, 'conditional');
    expect(s.decision.rollGated).toBe(true);
    for (const roleId of ['seismologist', 'commissioner', 'opsDirector']) {
      s = engine.toggleSignoff(s, roleId);
    }
    expect(engine.canLockDecision(marlowCounty, s).ok).toBe(false); // roll not made yet
    s = engine.rollDecisionDice(marlowCounty, s);
    // Modifiers alone (gate1 +3, gate2 +3, dolores ally +2, kendra fair +2 = +10)
    // exceed DC 8 even on the minimum possible roll, so this is deterministic.
    expect(s.decision.rollSuccess).toBe(true);
    expect(engine.canLockDecision(marlowCounty, s).ok).toBe(true);

    s = engine.lockDecision(marlowCounty, s);
    expect(s.beatsShown).toContain('B2-A');
    expect(s.meters.seismicRisk).toBe(31); // 27 + 4
    expect(s.meters.countyBudget).toBe(380000); // 400000 - 20000
    expect(s.meters.publicTrust).toBe(83); // 75 + 8
    expect(s.charTrust.voss).toBe(8); // 4 + 4

    s = engine.continueFromClosing(marlowCounty, s); // floors risk at 60, advances to round 3
    expect(s.meters.seismicRisk).toBe(60);
    expect(s.roundIndex).toBe(2);
    expect(s.flags.school_known).toBe(true); // still true — school beat should use the safe cold open

    // --- Round 3 --- (school_known → safe cold-open branch: +12 trust, +5 arata, clamped to 10)
    expect(s.meters.publicTrust).toBe(95); // 83 + 12
    expect(s.charTrust.arata).toBe(10); // 9 + 5, clamped to the 0-10 max

    s = engine.submitGateAnswer(marlowCounty, s, '31', 'the epicenters cluster tightly around the wellbore');
    expect(s.gates.gate3.passed).toBe(true);

    s = engine.chooseDecisionOption(marlowCounty, s, 'trafficlight');
    for (const roleId of ['seismologist', 'commissioner', 'opsDirector', 'emd']) {
      s = engine.toggleSignoff(s, roleId);
    }
    s = engine.rollDecisionDice(marlowCounty, s);
    expect(s.decision.rollSuccess).toBe(true); // +14 modifiers vs DC 9, deterministic
    s = engine.lockDecision(marlowCounty, s);
    expect(s.beatsShown).toContain('B3-A');
    expect(s.meters.seismicRisk).toBe(30); // 60 - 30
    expect(s.meters.countyBudget).toBe(320000); // 380000 - 60000
    expect(s.meters.publicTrust).toBe(100); // 95 + 20, clamped to 100

    s = engine.continueFromClosing(marlowCounty, s); // last round → straight to reveal
    expect(s.phase).toBe('reveal');

    s = engine.continueFromReveal(s);
    expect(s.phase).toBe('debrief');
    s = engine.finishDebrief(s);
    expect(s.phase).toBe('complete');
  });
});

describe('scenario engine — long fuses', () => {
  it('lights the pressure-log and Dolores long fuses when the team skips both, and they detonate in Round 2', () => {
    let s = engine.createSession(marlowCounty, 'Skippers');
    s = engine.beginInvestigation(marlowCounty, s);
    s = engine.submitGateAnswer(marlowCounty, s, 'sandstone', 'guessed wrong'); // incorrect on purpose
    expect(s.gates.gate1.passed).toBe(false);
    expect(s.meters.publicTrust).toBe(57); // 60 - 3

    // No actions at all this round.
    s = engine.submitActions(marlowCounty, s);
    expect(s.flags.alvarez_dismissed).toBe(true);
    expect(s.flags.pressure_log_hidden).toBe(true);
    expect(s.flags.school_unknown).toBe(true);
    expect(s.beatsShown).toEqual(expect.arrayContaining(['B1-B', 'B1-D', 'B1-F']));

    s = engine.continueFromClosing(marlowCounty, s); // → round 2

    // Round 2: skip the gate reasoning correctness, just get to decision.
    s = engine.submitGateAnswer(marlowCounty, s, 'sametime', 'wrong on purpose');
    s = engine.chooseDecisionOption(marlowCounty, s, 'support'); // no roll required
    for (const roleId of ['seismologist', 'commissioner', 'opsDirector']) s = engine.toggleSignoff(s, roleId);
    s = engine.lockDecision(marlowCounty, s);

    // Long-fuse beats should have detonated alongside the decision beat.
    expect(s.beatsShown).toEqual(expect.arrayContaining(['B2-B', 'B2-E', 'B2-F']));
    expect(s.flags.coverup_perception).toBe(true);
    expect(s.charTrust.ray).toBeLessThan(6); // damaged by the leak
    expect(s.charTrust.dolores).toBeLessThan(5); // damaged by both dismissal and the support vote

    // Long fuses only fire once even if the flag is still true later.
    const fuseCountBefore = s.beatsShown.filter((id) => id === 'B2-E').length;
    expect(fuseCountBefore).toBe(1);
  });
});
