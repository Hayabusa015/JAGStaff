import { describe, it, expect } from "vitest";
import { parseCSV } from "./components/StudentRoster.jsx";
import { buildImportPlan } from "./components/gmenImport.js";

const roster = [
  { id: "s-adkins", firstName: "Scarlett", lastName: "Adkins", studentEmail: "sadkins@jagschools.org" },
  { id: "s-albert", firstName: "Cooper", lastName: "Albert", studentEmail: "calbert@jagschools.org" },
  { id: "s-brown", firstName: "Taylor", lastName: "Brown", studentEmail: "tbrown@jagschools.org" },
  // Deliberate duplicate name, both on roster:
  { id: "s-lee1", firstName: "Jordan", lastName: "Lee", studentEmail: "jlee1@jagschools.org" },
  { id: "s-lee2", firstName: "Jordan", lastName: "Lee", studentEmail: "jlee2@jagschools.org" },
];

// gmen_classes.teacher_email is NOT NULL, so creating a class requires
// matching its sheet "Teacher" text exactly (case-insensitive) against a
// staff directory entry. Most tests below exist to enroll students, not to
// exercise that matching, so this fixture covers the teacher names they use.
const staff = [
  { email: "gwalker@jagschools.org", name: "Mr. Walker" },
  { email: "fbell@jagschools.org", name: "Ms. Bell" },
];

function plan(text, { existingClasses = [], existingEnrollments = [], period = 1, staffDirectory = staff } = {}) {
  const { headers, rows } = parseCSV(text);
  return buildImportPlan({ headers, rows, rosterStudents: roster, existingClasses, existingEnrollments, staffDirectory, period });
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
    expect(p.classesToCreate.find(c => c.class_name === "Study Hall").teacher_email).toBe("gwalker@jagschools.org");
    expect(p.enrollments).toHaveLength(3);
    expect(p.enrollments[0]).toMatchObject({ student_email: "sadkins@jagschools.org", student_name: "Scarlett Adkins", student_id: "s-adkins" });
  });

  it("prefers an email column over name matching", () => {
    const p = plan("Student Email,Class,Teacher\nsadkins@jagschools.org,Study Hall,Mr. Walker");
    expect(p.enrollments[0].student_email).toBe("sadkins@jagschools.org");
    expect(p.enrollments[0].student_name).toBe("Scarlett Adkins");
    expect(p.enrollments[0].student_id).toBe("s-adkins");
  });

  it("handles Last, First names pasted from a sheet (tab-delimited)", () => {
    const p = plan('Student Name\tClass\tTeacher\n"Adkins, Scarlett"\tStudy Hall\tMr. Walker');
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
    const p = plan("Student Name,Class,Teacher\nScarlett Adkins,Study Hall,Mr. Walker\nScarlett Adkins,Robotics,Ms. Bell");
    expect(p.enrollments).toHaveLength(1);
    expect(p.skipped.duplicateInSheet).toHaveLength(1);
  });

  it("uses an explicit seats column, else head-count plus headroom", () => {
    const withSeats = plan("Student Name,Class,Teacher,Max Seats\nScarlett Adkins,Study Hall,Mr. Walker,30");
    expect(withSeats.classesToCreate[0].max_seats).toBe(30);
    const without = plan("Student Name,Class,Teacher\nScarlett Adkins,Study Hall,Mr. Walker");
    expect(without.classesToCreate[0].max_seats).toBe(25); // max(1+5, 25)
  });

  it("errors clearly when there is no class column", () => {
    const p = plan("Student Name,Grade\nScarlett Adkins,11");
    expect(p.error).toMatch(/class/i);
  });

  it("never creates a class with no real teacher_email, even without a Teacher column", () => {
    const p = plan("Student Name,Class\nScarlett Adkins,Study Hall");
    expect(p.classesToCreate).toHaveLength(0);
    expect(p.enrollments).toHaveLength(0);
    expect(p.skipped.teacherNotFound).toHaveLength(1);
    expect(p.skipped.teacherNotFound[0]).toMatch(/Study Hall/);
  });

  it("skips a class whose teacher name doesn't match the staff directory", () => {
    const p = plan("Student Name,Class,Teacher\nScarlett Adkins,Study Hall,Nobody Special");
    expect(p.classesToCreate).toHaveLength(0);
    expect(p.enrollments).toHaveLength(0);
    expect(p.skipped.teacherNotFound[0]).toMatch(/Nobody Special/);
  });

  it("normalizes request_day to a valid value or null, never an empty string", () => {
    const lower = plan("Student Name,Class,Teacher,Request Day\nScarlett Adkins,Study Hall,Mr. Walker,tuesday");
    expect(lower.classesToCreate[0].request_day).toBe("Tuesday");
    const missing = plan("Student Name,Class,Teacher\nScarlett Adkins,Study Hall,Mr. Walker");
    expect(missing.classesToCreate[0].request_day).toBeNull();
    const bogus = plan("Student Name,Class,Teacher,Request Day\nScarlett Adkins,Study Hall,Mr. Walker,Someday");
    expect(bogus.classesToCreate[0].request_day).toBeNull();
  });

  it("still resolves student_id when both name and email columns are present", () => {
    const p = plan("Student Name,Student Email,Class,Teacher\nScarlett Adkins,sadkins@jagschools.org,Study Hall,Mr. Walker");
    expect(p.enrollments[0].student_id).toBe("s-adkins");
  });
});
