// =============================================================================
//  SCENARIO LIBRARY — registry of playable scenario games.
//  Add a new scenario by dropping a data file in ./data/ (same shape as
//  marlowCounty.js) and listing it here. The engine + UI are fully generic.
// =============================================================================
import marlowCounty from './data/marlowCounty.js';

export const SCENARIOS = [marlowCounty];

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id) || null;
}

export function listScenarios() {
  return SCENARIOS;
}
