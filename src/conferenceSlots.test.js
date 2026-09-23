import { describe, it, expect } from "vitest";
import { buildSlotTimes } from "./components/Conferences.jsx";

describe("buildSlotTimes", () => {
  it("fills the window with back-to-back slots that end by the end time", () => {
    const out = buildSlotTimes("2026-10-15", "15:30", "16:30", 15);
    expect(out).toHaveLength(4);
    expect(new Date(out[1]) - new Date(out[0])).toBe(15 * 60000);
  });
  it("drops a trailing partial slot", () => {
    expect(buildSlotTimes("2026-10-15", "15:30", "16:10", 20)).toHaveLength(2);
  });
  it("returns nothing for missing or inverted input", () => {
    expect(buildSlotTimes("", "15:30", "16:30", 15)).toEqual([]);
    expect(buildSlotTimes("2026-10-15", "17:00", "16:00", 15)).toEqual([]);
  });
});
