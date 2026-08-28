// =============================================================================
//  SCENARIO SESSION PERSISTENCE
//  Every lab-group "team" gets its own session, saved to localStorage on the
//  device they're playing on — same local-first pattern as the rest of the
//  classroom zone (see ClassroomContext.jsx's unit/material persistence).
//  A team can close the tab mid-round and resume later on the same device.
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as engine from './engine.js';

const STORAGE_KEY = 'jag-scenario-sessions-v1';
const LAST_TEAM_KEY = 'jag-scenario-last-team-v1';

export function slugify(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'team';
}

export function sessionKey(scenarioId, teamName) {
  return `${scenarioId}::${slugify(teamName)}`;
}

function loadAll() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(map) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

export function rememberLastTeam(scenarioId, teamName) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_TEAM_KEY, JSON.stringify({ scenarioId, teamName }));
  } catch { /* ignore */ }
}

export function loadLastTeam() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAST_TEAM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// List every saved team session for a given scenario (teacher panel + lobby).
// Not reactive across tabs — call refresh() after a change from elsewhere.
export function listTeamSessions(scenarioId) {
  const all = loadAll();
  return Object.entries(all)
    .filter(([key]) => key.startsWith(`${scenarioId}::`))
    .map(([key, session]) => ({ key, session }))
    .sort((a, b) => (b.session.updatedAt || '').localeCompare(a.session.updatedAt || ''));
}

export function deleteTeamSession(key) {
  const all = loadAll();
  delete all[key];
  saveAll(all);
}

// ---------------------------------------------------------------------------
//  useScenarioSession — the main hook a play screen binds to.
// ---------------------------------------------------------------------------
export function useScenarioSession(scenario, teamName) {
  const key = useMemo(() => (scenario && teamName ? sessionKey(scenario.id, teamName) : null), [scenario, teamName]);
  const [session, setSession] = useState(() => {
    if (!key) return null;
    const all = loadAll();
    return all[key] || engine.createSession(scenario, teamName);
  });

  // Reload if the team/scenario changes.
  useEffect(() => {
    if (!key) { setSession(null); return; }
    const all = loadAll();
    setSession(all[key] || engine.createSession(scenario, teamName));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((next) => {
    setSession(next);
    if (!key || !next) return;
    const all = loadAll();
    all[key] = next;
    saveAll(all);
    rememberLastTeam(scenario.id, teamName);
  }, [key, scenario, teamName]);

  const run = useCallback((fn) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      if (!key) return next;
      const all = loadAll();
      all[key] = next;
      saveAll(all);
      return next;
    });
  }, [key]);

  const actions = useMemo(() => ({
    setRole: (roleId, playerName) => run((s) => engine.setRoleAssignment(s, roleId, playerName)),
    begin: () => run((s) => engine.beginInvestigation(scenario, s)),
    submitGate: (choiceId, reasoning) => run((s) => engine.submitGateAnswer(scenario, s, choiceId, reasoning)),
    toggleAction: (actionId) => run((s) => engine.toggleAction(s, actionId)),
    setPressAnswer: (answer) => run((s) => engine.setPressAnswer(s, answer)),
    submitActions: () => run((s) => engine.submitActions(scenario, s)),
    chooseOption: (optionId) => run((s) => engine.chooseDecisionOption(scenario, s, optionId)),
    toggleSignoff: (roleId) => run((s) => engine.toggleSignoff(s, roleId)),
    rollDice: () => run((s) => engine.rollDecisionDice(scenario, s)),
    lockDecision: () => run((s) => engine.lockDecision(scenario, s)),
    continueFromClosing: () => run((s) => engine.continueFromClosing(scenario, s)),
    continueFromReveal: () => run((s) => engine.continueFromReveal(s)),
    setDebriefNote: (idx, text) => run((s) => engine.setDebriefNote(s, idx, text)),
    finishDebrief: () => run((s) => engine.finishDebrief(s)),
    resetSession: () => persist(engine.createSession(scenario, teamName)),
    deleteSession: () => { if (key) deleteTeamSession(key); setSession(null); },
  }), [run, persist, scenario, teamName, key]);

  return { key, session, actions };
}
