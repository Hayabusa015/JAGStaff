// Pure planning logic for the G-Men class roster import. Takes parsed
// sheet rows plus current DB state and produces an execution plan —
// which classes to create, who to enroll where, and what to skip with
// reasons. No I/O here so the whole thing is unit-testable.

// Header detection for a class-roster sheet. Distinct from the student
// roster import's guessAll: this one also needs class/teacher columns.
const H = {
  first:   ["first name", "firstname", "first_name", "given name", "first", "fname"],
  last:    ["last name", "lastname", "last_name", "surname", "family name", "last", "lname"],
  name:    ["student name", "student", "name"],
  email:   ["student email", "email"],
  klass:   ["class name", "class", "gmen class", "g-men class", "course", "session"],
  teacher: ["teacher name", "teacher", "instructor", "staff"],
  room:    ["room", "location"],
  day:     ["request day", "day"],
  seats:   ["max seats", "seats", "capacity", "max"],
};
const STALE = ["login", "modified", "updated", "seen", "parent", "guardian"];

function findCol(headers, patterns, avoid = STALE) {
  for (const p of patterns) {
    const i = headers.findIndex(h => h.includes(p) && !avoid.some(a => h.includes(a)));
    if (i !== -1) return i;
  }
  return -1;
}

export function mapClassRosterHeaders(headers) {
  const m = {
    first: findCol(headers, H.first),
    last: findCol(headers, H.last),
    name: -1,
    email: findCol(headers, H.email),
    klass: findCol(headers, H.klass, [...STALE, "teacher"]),
    teacher: findCol(headers, H.teacher),
    room: findCol(headers, H.room),
    day: findCol(headers, H.day),
    seats: findCol(headers, H.seats),
  };
  // Fall back to a single name column only when split names are absent, and
  // never bind it to the class/teacher columns.
  if (m.first === -1 || m.last === -1) {
    m.name = findCol(headers, H.name, [...STALE, "class", "teacher", "email"]);
  }
  return m;
}

function splitFullName(raw) {
  const v = (raw || "").trim();
  if (!v) return null;
  if (v.includes(",")) {                 // "Last, First"
    const [l, ...rest] = v.split(",");
    return { first: rest.join(",").trim(), last: l.trim() };
  }
  const parts = v.split(/\s+/);          // "First Last"
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

const normName = (f, l) => `${(f || "").trim()} ${(l || "").trim()}`.trim().toLowerCase();
const normKey = (s) => (s || "").trim().toLowerCase();

// rows: string[][] from parseCSV. rosterStudents: [{firstName,lastName,studentEmail}]
// existingClasses: gmen_classes rows for the CURRENT period only.
// existingEnrollments: gmen_enrollments rows for the current period.
export function buildImportPlan({ headers, rows, rosterStudents, existingClasses, existingEnrollments, period }) {
  const m = mapClassRosterHeaders(headers);
  if (m.klass === -1) {
    return { error: "No class-name column found. The sheet needs a column like \"Class\" or \"Class Name\"." };
  }
  if (m.email === -1 && m.name === -1 && (m.first === -1 || m.last === -1)) {
    return { error: "No student columns found. Include a Student Name (or First/Last Name) or Student Email column." };
  }

  // Roster lookup: full name -> email (only names that appear exactly once,
  // so an ambiguous duplicate name never silently enrolls the wrong kid).
  const byName = new Map();
  const dupNames = new Set();
  for (const s of rosterStudents) {
    const k = normName(s.firstName, s.lastName);
    if (!k) continue;
    if (byName.has(k)) { dupNames.add(k); byName.delete(k); }
    else if (!dupNames.has(k)) byName.set(k, s);
  }

  const classByKey = new Map(existingClasses.map(c => [normKey(c.class_name), c]));
  const enrolledEmails = new Set(existingEnrollments.map(e => normKey(e.student_email)));

  const classesToCreate = new Map(); // key -> class fields
  const enrollments = [];            // { classKey, student_email, student_name }
  const skipped = { alreadyEnrolled: [], noRosterMatch: [], ambiguousName: [], missingFields: [], duplicateInSheet: [] };
  const seenInSheet = new Set();

  rows.forEach((r, idx) => {
    const rowNo = idx + 2; // header is row 1 in the user's sheet
    const className = (r[m.klass] || "").trim();
    if (!className) { skipped.missingFields.push(`Row ${rowNo}: no class name`); return; }
    const classKey = normKey(className);

    // Resolve the student.
    let first = m.first >= 0 ? (r[m.first] || "").trim() : "";
    let last  = m.last  >= 0 ? (r[m.last]  || "").trim() : "";
    if (!first && !last && m.name >= 0) {
      const split = splitFullName(r[m.name]);
      if (split) { first = split.first; last = split.last; }
    }
    let email = m.email >= 0 ? normKey(r[m.email]) : "";
    let displayName = `${first} ${last}`.trim();

    if (!email) {
      const k = normName(first, last);
      if (!k) { skipped.missingFields.push(`Row ${rowNo}: no student name or email`); return; }
      if (dupNames.has(k)) { skipped.ambiguousName.push(`Row ${rowNo}: "${displayName}" matches more than one roster student — add an email column for them`); return; }
      const match = byName.get(k);
      if (!match?.studentEmail) { skipped.noRosterMatch.push(`Row ${rowNo}: "${displayName}" not found on the student roster`); return; }
      email = normKey(match.studentEmail);
      displayName = `${match.firstName} ${match.lastName}`;
    } else if (!displayName) {
      const match = rosterStudents.find(s => normKey(s.studentEmail) === email);
      displayName = match ? `${match.firstName} ${match.lastName}` : email.split("@")[0];
    }

    if (seenInSheet.has(email)) { skipped.duplicateInSheet.push(`Row ${rowNo}: ${displayName} appears more than once in the sheet`); return; }
    seenInSheet.add(email);

    if (enrolledEmails.has(email)) { skipped.alreadyEnrolled.push(`${displayName} is already enrolled this period`); return; }

    // Register the class (create if it doesn't exist for this period).
    if (!classByKey.has(classKey) && !classesToCreate.has(classKey)) {
      classesToCreate.set(classKey, {
        class_name: className,
        teacher_name: m.teacher >= 0 ? (r[m.teacher] || "").trim() : "",
        teacher_email: null,
        room: m.room >= 0 ? (r[m.room] || "").trim() : "",
        description: "",
        grading_period: period,
        request_day: m.day >= 0 ? (r[m.day] || "").trim() : "",
        max_seats: m.seats >= 0 ? Math.max(1, parseInt(r[m.seats], 10) || 0) : 0, // 0 = fill in after counting
        is_open: true,
      });
    }
    enrollments.push({ classKey, student_email: email, student_name: displayName });
  });

  // Any created class with no explicit seat count gets head-count + headroom.
  for (const [key, cls] of classesToCreate) {
    if (!cls.max_seats) {
      const n = enrollments.filter(e => e.classKey === key).length;
      cls.max_seats = Math.max(n + 5, 25);
    }
  }

  return {
    mapping: m,
    classesToCreate: [...classesToCreate.values()],
    existingClassesUsed: [...new Set(enrollments.map(e => e.classKey))].filter(k => classByKey.has(k)).map(k => classByKey.get(k).class_name),
    enrollments,
    skipped,
    classByKey,
  };
}
