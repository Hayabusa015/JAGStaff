import { describe, it, expect } from "vitest";
import { parseCSV, guessAll, expandNameColumn } from "./components/StudentRoster.jsx";

// Mirrors the filter in StudentRoster.doImport — the rows that actually save.
function importable(text) {
  const raw = parseCSV(text);
  if (!raw) return null;
  const p = expandNameColumn(raw);
  const m = guessAll(p.headers);
  const fi = Number(m.first), li = Number(m.last);
  return {
    map: m,
    rows: p.rows.filter(r => (fi >= 0 && r[fi]?.trim()) || (li >= 0 && r[li]?.trim()))
      .map(r => ({ first: fi >= 0 ? r[fi] : "", last: li >= 0 ? r[li] : "" })),
  };
}

describe("roster CSV import", () => {
  it("maps a standard first/last/grade export", () => {
    const r = importable("First Name,Last Name,Grade\nMatt,Shull,11\nJane,Doe,10");
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toEqual({ first: "Matt", last: "Shull" });
  });

  it("splits a single 'Student Name' column in Last, First form", () => {
    const r = importable('Student Name,Grade\n"Shull, Matt",11');
    expect(r.rows[0]).toEqual({ first: "Matt", last: "Shull" });
  });

  it("splits a single 'Name' column in First Last form", () => {
    const r = importable("Name,Grade\nMatt Shull,11");
    expect(r.rows[0]).toEqual({ first: "Matt", last: "Shull" });
  });

  it("keeps quoted delimiters inside a field", () => {
    const r = importable('Last Name,First Name,Section\n"Shull","Matt","P1, Honors"');
    expect(r.rows[0]).toEqual({ first: "Matt", last: "Shull" });
  });

  it("skips a title row above the header", () => {
    const r = importable("Garfield Export\n\nFirst Name,Last Name\nMatt,Shull");
    expect(r.rows).toHaveLength(1);
  });

  it("does not bind 'Last Name' to a 'Last Login' column", () => {
    const r = importable('Last Login,Student Name\n2026-08-01,"Shull, Matt"');
    expect(r.rows[0]).toEqual({ first: "Matt", last: "Shull" });
  });

  it("does not map a student email into the parent email slot", () => {
    const r = importable("First Name,Last Name,Student Email\nMatt,Shull,m@jagschools.org");
    expect(r.map.parentEmail).toBe("-1");
  });

  it("prefers an explicit parent email over the student one", () => {
    const r = importable("First Name,Last Name,Parent Email,Student Email\nMatt,Shull,p@x.com,s@y.com");
    expect(r.map.parentEmail).toBe("2");
  });

  it("handles a BOM and tab delimiters", () => {
    const r = importable("﻿First Name\tLast Name\tGrade\nMatt\tShull\t11");
    expect(r.rows[0]).toEqual({ first: "Matt", last: "Shull" });
  });

  it("yields zero rows when no name column can be found", () => {
    // The import UI blocks on this, and importStudents refuses to wipe.
    const r = importable("Pupil,Yr\nSomebody,11");
    expect(r.rows).toHaveLength(0);
  });
});
