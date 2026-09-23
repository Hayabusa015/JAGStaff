import { describe, it, expect } from "vitest";
import { buildSlotTimes, schedulePages, scheduleHtml } from "./conferences.js";

describe("buildSlotTimes", () => {
  it("fills the window with back-to-back slots that end by the end time", () => {
    const out = buildSlotTimes("2026-10-15", "15:30", "16:30", 15);
    expect(out).toHaveLength(4);
    expect(new Date(out[1]) - new Date(out[0])).toBe(15 * 60000);
  });
  it("drops a trailing partial slot", () => {
    expect(buildSlotTimes("2026-10-15", "15:30", "16:10", 20)).toHaveLength(2);
  });
  it("skips slots that overlap the break", () => {
    // 15:30–17:30 in 15s = 8 slots; a 16:30–17:00 break removes two
    expect(buildSlotTimes("2026-10-15", "15:30", "17:30", 15, "16:30", "17:00")).toHaveLength(6);
  });
  it("returns nothing for missing or inverted input", () => {
    expect(buildSlotTimes("", "15:30", "16:30", 15)).toEqual([]);
    expect(buildSlotTimes("2026-10-15", "17:00", "16:00", 15)).toEqual([]);
  });
});

describe("schedulePages", () => {
  const slot = (email, t, booking = null) => ({ teacher_email: email, teacher_name: null, starts_at: t, duration_min: 15, location: null, booking });
  it("makes one page per teacher, sorted by last name, with booked counts", () => {
    const pages = schedulePages([
      slot("b@x", "2026-10-15T20:00:00Z"),
      slot("a@x", "2026-10-15T20:00:00Z", { student_name: "Kid", parent_name: "Mom", reason: "other" }),
      slot("a@x", "2026-10-15T20:15:00Z"),
    ], [{ email: "a@x", name: "Zed Young", room: "101" }, { email: "b@x", name: "Amy Adams", room: "" }]);
    expect(pages.map(p => p.name)).toEqual(["Amy Adams", "Zed Young"]);
    expect(pages[1]).toMatchObject({ booked: 1, total: 2, room: "101" });
  });
  it("escapes parent-typed text in the printout", () => {
    const pages = schedulePages([slot("a@x", "2026-10-15T20:00:00Z",
      { student_name: "<script>x</script>", parent_name: "P", reason: "other" })]);
    expect(scheduleHtml(pages)).not.toContain("<script>x");
  });
});
