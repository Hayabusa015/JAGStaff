// Centralized storage for the teacher's BYOK Anthropic API key.
//
// SECURITY: we use sessionStorage, not localStorage. The key is XSS-readable
// either way, but sessionStorage is cleared when the tab closes, which bounds
// the exposure window to a single session instead of persisting indefinitely.
// The tradeoff is the teacher re-enters the key each session — acceptable for a
// bring-your-own-key tool.
const KEY = "anthropic_api_key";

export function getApiKey() {
  return sessionStorage.getItem(KEY);
}

export function setApiKey(value) {
  sessionStorage.setItem(KEY, value);
}

export function clearApiKey() {
  sessionStorage.removeItem(KEY);
}
