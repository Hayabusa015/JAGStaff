import { describe, it, expect } from "vitest";
import { pickPassMessage, MESSAGES } from "./components/passMessages.js";

// Deterministic random source from a fixed sequence.
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };

describe("pass message picker", () => {
  it("uses a frequent-flier message with rank filled in for heavy users", () => {
    const msg = pickPassMessage({
      stats: { today: 4, week: 9, rankToday: 3 },
      destination: "Water",
      random: seq(0.1, 0.0), // 0.1 < 0.7 -> frequentFlier pool, first entry
    });
    expect(msg).toContain("#3");
  });

  it("praises rare pass users", () => {
    const msg = pickPassMessage({
      stats: { today: 0, week: 1, rankToday: 40 },
      destination: "Water",
      random: seq(0.2, 0.0), // 0.2 < 0.5 -> homebody pool
    });
    expect(MESSAGES.homebody).toContain(msg);
  });

  it("tells destination jokes", () => {
    const msg = pickPassMessage({
      stats: { today: 1, week: 3, rankToday: 10 },
      destination: "Water",
      random: seq(0.3, 0.0), // 0.3 < 0.65 -> Water pool, first entry
    });
    expect(msg).toBe("Save some for the fishes 🐟");
  });

  it("falls back to generic for unknown destinations", () => {
    const msg = pickPassMessage({
      stats: null,
      destination: "Narnia",
      random: seq(0.9, 0.0),
    });
    expect(MESSAGES.generic).toContain(msg);
  });

  it("never repeats the same message back-to-back within a pool", () => {
    const first = pickPassMessage({ stats: null, destination: "Water", random: seq(0.3, 0.0) });
    const second = pickPassMessage({ stats: null, destination: "Water", random: seq(0.3, 0.0), lastMessage: first });
    expect(second).not.toBe(first);
    expect(MESSAGES.destination.Water).toContain(second);
  });

  it("does not treat a heavy user as a homebody", () => {
    // week=1 but today>=3 & top rank -> frequent flier wins
    const msg = pickPassMessage({
      stats: { today: 3, week: 1, rankToday: 1 },
      destination: "Water",
      random: seq(0.1, 0.0),
    });
    expect(msg).toContain("#1");
  });
});
