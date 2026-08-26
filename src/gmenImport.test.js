import { describe, it, expect } from "vitest";
import { parseCSV } from "./components/StudentRoster.jsx";
import { buildImportPlan } from "./components/gmenImport.js";

const roster = [
  { firstName: "Scarlett", lastName: "Adkins", studentEmail: "sadkins@jagschools.org" },
  { firstName: "Cooper", lastName: "Albert", studentEmail: "calbert@jagschools.org" },
  { firstName: "Taylor", lastName: "Brown", studentEmail: "tbrown@jagschools.org" },
  // Deliberate duplicate name, both on roster:
  { firstName: "Jordan", lastName: "Lee", studentEmail: "jlee1@jagschools.org" },
  { firstName: "Jordan", lastName: "Lee", studentEmail: "jlee2@jagschools.org" },
];

function plan(text, { existingClasses = [], existingEnrollments = [], period = 1 } = {}) {
  const { headers, rows } = parseCSV(text);
  return buildImportPlan({ headers, rows, rosterStudents: roster, existingClasses, existingEnrollments, period });
}

describe("gmen class roster import plan", () => {
  it("creates classes and enrolls students matched by name", () => {
    const p = plan(
      "Student Name,Class,Teacher,Room\n" +
      "Scarlett Adkins,Study Hall,Mr. Walker,212\n" +
      "Cooper Albert,Study Hall,Mr. Walker,212\n" +
      "Taylor Brown,Robotics,Ms. Bell,216"
    );
    expect(p.error).toBeUndefined();
    expect(p.classesToCreate.map(c => c.class_name).sort()).toEqual(["Robotics", "Study Hall"]);
    expect(p.enrollments).toHaveLength(3);
    expect(p.enrollments[0]).toMatchObject({ student_email: "sadkins@jagschools.org", student_name: "Scarlett Adkins" });
  });

  it("prefers an email column over name matching", () => {
    const p = plan("Student Email,Class\nsadkins@jagschools.org,Study Hall");
    expect(p.enrollments[0].student_email).toBe("sadkins@jagschools.org");
    expect(p.enrollments[0].student_name).toBe("Scarlett Adkins");
  });

  it("handles Last, First names pasted from a sheet (tab-delimited)", () => {
    const p = plan('Student Name\tClass\n"Adkins, Scarlett"\tStudy Hall');
    expect(p.enrollments[0].student_email).toBe("sadkins@jagschools.org");
  });

  it("reuses an existing class instead of duplicating it", () => {
    const existing = [{ id: "c1", class_name: "Study Hall", grading_period: 1 }];
    const p = plan("Student Name,Class\nScarlett Adkins,study hall", { existingClasses: existing });
    expect(p.classesToCreate).toHaveLength(0);
    expect(p.existingClassesUsed).toEqual(["Study Hall"]);
    expect(p.enrollments).toHaveLength(1);
  });

  it("skips students already enrolled this period", () => {
    const p = plan("Student Name,Class\nScarlett Adkins,Study Hall", {
      existingEnrollments: [{ student_email: "sadkins@jagschools.org", grading_period: 1 }],
    });
    expect(p.enrollments).toHaveLength(0);
    expect(p.skipped.alreadyEnrolled).toHaveLength(1);
  });

  it("refuses to guess between duplicate roster names", () => {
    const p = plan("Student Name,Class\nJordan Lee,Study Hall");
    expect(p.enrollments).toHaveLength(0);
    expect(p.skipped.ambiguousName[0]).toMatch(/Jordan Lee/);
  });

  it("reports names not on the roster instead of inventing emails", () => {
    const p = plan("Student Name,Class\nGhost Kid,Study Hall");
    expect(p.enrollments).toHaveLength(0);
    expect(p.skipped.noRosterMatch[0]).toMatch(/Ghost Kid/);
  });

  it("keeps only the first row when a student appears twice in the sheet", () => {
    const p = plan("Student Name,Class\nScarlett Adkins,Study Hall\nScarlett Adkins,Robotics");
    expect(p.enrollments).toHaveLength(1);
    expect(p.skipped.duplicateInSheet).toHaveLength(1);
  });

  it("uses an explicit seats column, else head-count plus headroom", () => {
    const withSeats = plan("Student Name,Class,Max Seats\nScarlett Adkins,Study Hall,30");
    expect(withSeats.classesToCreate[0].max_seats).toBe(30);
    const without = plan("Student Name,Class\nScarlett Adkins,Study Hall");
    expect(without.classesToCreate[0].max_seats).toBe(25); // max(1+5, 25)
  });

  it("errors clearly when there is no class column", () => {
    const p = plan("Student Name,Grade\nScarlett Adkins,11");
    expect(p.error).toMatch(/class/i);
  });
});
