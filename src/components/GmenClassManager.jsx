// Admin tools for building real G-Men classes: a manual Add Class form and
// a roster import that accepts a Google Sheet (pasted cells or a CSV
// export). Parsing reuses the tested CSV engine from the student roster
// import; all decisions live in buildImportPlan (pure, unit-tested) so this
// component only renders the plan and executes it.
//
// The default export, GmenClassManager, is the "My Class" tab: a teacher's
// own view of the class they're running this period — set it up if they
// haven't yet, otherwise see the roster, toggle enrollment, and add a
// student by hand.
import { useRef, useState } from "react";
import { GOLD } from "../constants.js";
import { bulkEnrollGmen } from "../supabase.js";
import { parseCSV } from "./StudentRoster.jsx";
import { buildImportPlan } from "./gmenImport.js";

const DAYS = ["", "Tuesday", "Wednesday", "Thursday"];
const REQUEST_DAYS = ["Tuesday", "Wednesday", "Thursday"];

// G-Men only meets Tue/Wed/Thu — attendance has nothing to do on Mon/Fri.
function isGmenDayToday() {
  const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
  return REQUEST_DAYS.includes(day);
}

const ATTENDANCE_STATUSES = [
  { key: "present", label: "P", color: "#22c55e" },
  { key: "absent", label: "A", color: "#ef4444" },
  { key: "tardy", label: "T", color: "#f59e0b" },
];

export function AddGmenClassForm({ addGmenClass, period, staffDirectory }) {
  const blank = { teacherEmail: "", class_name: "", room: "", request_day: "", max_seats: 25, description: "" };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okName, setOkName] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (busy || !form.class_name.trim() || !form.teacherEmail) return;
    const teacher = staffDirectory.find(s => s.email === form.teacherEmail);
    setBusy(true); setErr(""); setOkName("");
    const { error } = await addGmenClass({
      class_name: form.class_name.trim(),
      teacher_name: teacher?.name || form.teacherEmail,
      teacher_email: form.teacherEmail,
      room: form.room.trim(),
      max_seats: Math.max(1, Number(form.max_seats) || 25),
      description: form.description.trim(),
      grading_period: period,
      request_day: form.request_day || null,
      is_open: true,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOkName(form.class_name.trim());
    setForm(blank);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <div style={{ flex: "1 1 170px" }}>
        <label>Teacher *</label>
        <select value={form.teacherEmail} onChange={e => setForm(f => ({ ...f, teacherEmail: e.target.value }))}>
          <option value="">Select teacher…</option>
          {staffDirectory.map(s => <option key={s.email} value={s.email}>{s.name}</option>)}
        </select>
      </div>
      <div style={{ flex: "2 1 180px" }}>
        <label>Class Name *</label>
        <input value={form.class_name} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))} placeholder="e.g. Study Hall" />
      </div>
      <div style={{ flex: "0 1 90px" }}>
        <label>Room</label>
        <input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="212" />
      </div>
      <div style={{ flex: "0 1 130px" }}>
        <label>Request Day</label>
        <select value={form.request_day} onChange={e => setForm(f => ({ ...f, request_day: e.target.value }))}>
          {DAYS.map(d => <option key={d} value={d}>{d || "—"}</option>)}
        </select>
      </div>
      <div style={{ flex: "0 1 90px" }}>
        <label>Seats</label>
        <input type="number" min={1} max={200} value={form.max_seats} onChange={e => setForm(f => ({ ...f, max_seats: e.target.value }))} />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !form.class_name.trim() || !form.teacherEmail}>
        {busy ? "Adding…" : "+ Add Class"}
      </button>
      {err && <div className="text-red" style={{ flexBasis: "100%", fontSize: "0.8rem" }}>{err}</div>}
      {okName && <div className="text-green" style={{ flexBasis: "100%", fontSize: "0.8rem" }}>✓ "{okName}" created.</div>}
    </form>
  );
}

export function GmenRosterImport({ classes, enrollments, addGmenClass, students, staffDirectory, period }) {
  const [plan, setPlan] = useState(null);
  const [parseErr, setParseErr] = useState("");
  const [pasted, setPasted] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const periodClasses = classes.filter(c => c.grading_period === period);

  function analyze(text) {
    setResult(null);
    setParseErr("");
    const raw = parseCSV(text);
    if (!raw) { setParseErr("Couldn't read that — it needs a header row plus at least one student row."); setPlan(null); return; }
    const p = buildImportPlan({
      headers: raw.headers, rows: raw.rows,
      rosterStudents: students,
      existingClasses: periodClasses,
      existingEnrollments: enrollments,
      staffDirectory,
      period,
    });
    if (p.error) { setParseErr(p.error); setPlan(null); return; }
    setPlan(p);
  }

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = e => analyze(e.target.result);
    reader.onerror = () => setParseErr("Could not read that file.");
    reader.readAsText(file);
  }

  async function runImport() {
    if (!plan || running) return;
    setRunning(true);
    setParseErr("");
    try {
      // 1. Create missing classes, collecting their new ids.
      const idByKey = new Map([...plan.classByKey].map(([k, c]) => [k, c.id]));
      for (const cls of plan.classesToCreate) {
        const { data, error } = await addGmenClass(cls);
        if (error || !data) throw new Error(`Couldn't create class "${cls.class_name}": ${error?.message || "no data"}`);
        idByKey.set(cls.class_name.trim().toLowerCase(), data.id);
      }
      // 2. Enroll everyone. ignoreDuplicates makes re-runs safe.
      const rows = plan.enrollments.map(e => ({
        student_id: e.student_id,
        student_email: e.student_email,
        student_name: e.student_name,
        class_id: idByKey.get(e.classKey),
        grading_period: period,
        choice_rank: "admin",
      })).filter(r => r.class_id);
      const { added, error } = await bulkEnrollGmen(rows);
      if (error) throw new Error(`Enrollment failed partway: ${error.message}. Classes already created were kept; re-running the import is safe.`);
      setResult({ classesCreated: plan.classesToCreate.length, enrolled: added, skipped: plan.skipped });
      setPlan(null);
      setPasted("");
    } catch (err) {
      setParseErr(err.message);
    } finally {
      setRunning(false);
    }
  }

  const skippedFlat = plan
    ? Object.values(plan.skipped).flat()
    : result ? Object.values(result.skipped).flat() : [];

  return (
    <div>
      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
        In your Google Sheet, select the cells (with the header row) and copy — then paste below. Or use
        File → Download → CSV and upload it. Needs a <strong>Class</strong> column plus <strong>Student
        Name</strong> or <strong>Student Email</strong>; Teacher, Room, Request Day and Max Seats columns
        are picked up when present. A new class needs a <strong>Teacher</strong> column that matches a
        name in the staff directory exactly — otherwise its students are skipped with a reason, and you
        can add that class manually first. Students without an email column are matched to the school
        roster by name. Missing classes are created; nobody already enrolled this period is ever moved.
      </div>

      <textarea
        rows={4}
        value={pasted}
        onChange={e => { setPasted(e.target.value); if (e.target.value.trim()) analyze(e.target.value); else { setPlan(null); setParseErr(""); } }}
        placeholder={"Paste sheet cells here…\nStudent Name\tClass\tTeacher\tRoom"}
        style={{ width: "100%", fontFamily: "monospace", fontSize: "0.78rem", marginBottom: "0.5rem" }}
      />
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
        <input type="file" accept=".csv,.tsv,.txt" ref={fileRef} style={{ display: "none" }}
          onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
          📄 Upload CSV instead
        </button>
      </div>

      {parseErr && <p className="text-red mb1" style={{ fontSize: "0.82rem" }}>{parseErr}</p>}

      {plan && (
        <div style={{ background: "rgba(245,192,37,0.05)", border: `1px solid ${GOLD}33`, borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "0.75rem" }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.4rem" }}>Ready to import</div>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            {plan.classesToCreate.length > 0 && (
              <li>Create {plan.classesToCreate.length} class{plan.classesToCreate.length !== 1 ? "es" : ""}: {plan.classesToCreate.map(c => c.class_name).join(", ")}</li>
            )}
            {plan.existingClassesUsed.length > 0 && (
              <li>Add to existing: {plan.existingClassesUsed.join(", ")}</li>
            )}
            <li>Enroll {plan.enrollments.length} student{plan.enrollments.length !== 1 ? "s" : ""} into Period {period}</li>
            {skippedFlat.length > 0 && <li style={{ color: "#fbbf24" }}>{skippedFlat.length} row{skippedFlat.length !== 1 ? "s" : ""} will be skipped (details below)</li>}
          </ul>
          <button className="btn btn-primary btn-sm" style={{ marginTop: "0.75rem" }} disabled={running || plan.enrollments.length === 0} onClick={runImport}>
            {running ? "Importing…" : `Import ${plan.enrollments.length} Students`}
          </button>
        </div>
      )}

      {result && (
        <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "0.75rem" }}>
          <span className="text-green bold" style={{ fontSize: "0.85rem" }}>
            ✓ Imported — {result.classesCreated} class{result.classesCreated !== 1 ? "es" : ""} created, {result.enrolled} student{result.enrolled !== 1 ? "s" : ""} enrolled.
          </span>
        </div>
      )}

      {skippedFlat.length > 0 && (
        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          {skippedFlat.map((msg, i) => <div key={i}>⚠ {msg}</div>)}
        </div>
      )}
    </div>
  );
}

// A teacher's own class for the active grading period: set it up if it
// doesn't exist yet, otherwise the roster, seat count, open/closed toggle,
// a way to add a student by hand, and any change requests touching it.
function SetupMyClassForm({ addGmenClass, period, user }) {
  const blank = { class_name: "", room: "", request_day: "", max_seats: 20, description: "" };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (busy || !form.class_name.trim()) return;
    setBusy(true); setErr("");
    const { error } = await addGmenClass({
      class_name: form.class_name.trim(),
      teacher_email: user.email,
      teacher_name: user.name || user.email,
      room: form.room.trim(),
      request_day: form.request_day || null,
      max_seats: Math.max(1, Number(form.max_seats) || 20),
      description: form.description.trim(),
      grading_period: period,
      is_open: true,
    });
    setBusy(false);
    if (error) setErr(error.message);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <div style={{ flex: "2 1 180px" }}>
        <label>Class Name *</label>
        <input value={form.class_name} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))} placeholder="e.g. Study Hall" />
      </div>
      <div style={{ flex: "0 1 90px" }}>
        <label>Room</label>
        <input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="212" />
      </div>
      <div style={{ flex: "0 1 150px" }}>
        <label>Enrichment Day</label>
        <select value={form.request_day} onChange={e => setForm(f => ({ ...f, request_day: e.target.value }))}>
          <option value="">No enrichment day</option>
          {REQUEST_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div style={{ flex: "0 1 90px" }}>
        <label>Seats</label>
        <input type="number" min={1} max={200} value={form.max_seats} onChange={e => setForm(f => ({ ...f, max_seats: e.target.value }))} />
      </div>
      <div style={{ flex: "3 1 220px" }}>
        <label>Description</label>
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Shown to students choosing this class" />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !form.class_name.trim()}>
        {busy ? "Creating…" : "Create My Class"}
      </button>
      {err && <div className="text-red" style={{ flexBasis: "100%", fontSize: "0.8rem" }}>{err}</div>}
    </form>
  );
}

export default function GmenClassManager({
  user, classes, enrollments, settings, addGmenClass, updateGmenClass,
  deleteGmenClass, toggleOpen, students, enroll, pendingChangeRequests,
  recordsForClass, hasSubmitted, submitAttendance,
}) {
  const period = settings.active_period || 1;
  const myClass = classes.find(c => c.teacher_email === user?.email && c.grading_period === period);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState("");
  const [copyingPrevious, setCopyingPrevious] = useState(false);
  const [copyErr, setCopyErr] = useState("");
  const [attendanceEdits, setAttendanceEdits] = useState({}); // studentId -> status, local taps only
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false);

  async function handleCopyPrevious(prevCls) {
    if (copyingPrevious) return;
    setCopyingPrevious(true);
    setCopyErr("");
    const { error } = await addGmenClass({
      class_name: prevCls.class_name,
      teacher_email: user.email,
      teacher_name: user.name || user.email,
      room: prevCls.room || "",
      request_day: prevCls.request_day || null,
      max_seats: prevCls.max_seats,
      description: prevCls.description || "",
      grading_period: period,
      is_open: true,
    });
    setCopyingPrevious(false);
    if (error) setCopyErr(error.message);
  }

  if (!myClass) {
    const previousClass = classes
      .filter(c => c.teacher_email === user?.email && c.grading_period !== period)
      .sort((a, b) => b.grading_period - a.grading_period)[0];

    return (
      <div className="card">
        <div className="section-title">Set Up Your G-Men Class — Period {period}</div>
        <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", marginBottom: "0.9rem" }}>
          You haven't picked a class to run this grading period yet. Once created, open it for enrollment
          from here (or from Admin) so students can sign up.
        </div>
        {previousClass && (
          <div style={{
            background: "rgba(245,192,37,0.05)", border: `1px solid ${GOLD}33`, borderRadius: 8,
            padding: "0.75rem 1rem", marginBottom: "1rem",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem",
          }}>
            <span style={{ fontSize: "0.85rem" }}>
              You ran <strong>{previousClass.class_name}</strong> in Period {previousClass.grading_period} — copy it forward?
            </span>
            <button className="btn btn-primary btn-sm" disabled={copyingPrevious} onClick={() => handleCopyPrevious(previousClass)}>
              {copyingPrevious ? "Copying…" : "📋 Copy to This Period"}
            </button>
          </div>
        )}
        {copyErr && <p className="text-red mb1" style={{ fontSize: "0.8rem" }}>{copyErr}</p>}
        <SetupMyClassForm addGmenClass={addGmenClass} period={period} user={user} />
      </div>
    );
  }

  const roster = enrollments.filter(e => e.class_id === myClass.id).slice().sort((a, b) => a.student_name.localeCompare(b.student_name));
  const seats = roster.length;
  const full = seats >= myClass.max_seats;
  const incoming = pendingChangeRequests.filter(r => r.to_class_id === myClass.id && r.status === "pending");
  const outgoing = pendingChangeRequests.filter(r => r.from_class_id === myClass.id && r.status === "pending");

  // Attendance — see the "Attendance" card below. Local taps take priority
  // over an already-saved status so a resubmit reflects exactly what's on
  // screen; falling through to today's saved record, then "present" by
  // default, is what makes marking a full roster present a zero-tap action.
  const isGmenDay = isGmenDayToday();
  const existingAttendance = recordsForClass(myClass.id);
  const existingStatusByStudent = Object.fromEntries(existingAttendance.map(r => [r.student_id, r.status]));
  const attendanceSubmitted = hasSubmitted(myClass.id);
  const markableRoster = roster.filter(r => r.student_id);

  function statusFor(studentId) {
    return attendanceEdits[studentId] ?? existingStatusByStudent[studentId] ?? "present";
  }
  function setAttendanceStatus(studentId, status) {
    setAttendanceEdits(prev => ({ ...prev, [studentId]: status }));
  }
  async function handleSubmitAttendance() {
    if (attendanceSubmitting || markableRoster.length === 0) return;
    setAttendanceSubmitting(true);
    const entries = markableRoster.map(r => ({ studentId: r.student_id, status: statusFor(r.student_id) }));
    await submitAttendance(myClass.id, entries, user.email);
    setAttendanceSubmitting(false);
  }

  function startEdit() {
    setEditForm({
      room: myClass.room || "",
      request_day: myClass.request_day || "",
      max_seats: myClass.max_seats,
      description: myClass.description || "",
    });
    setEditing(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSavingEdit(true);
    await updateGmenClass(myClass.id, {
      room: editForm.room.trim(),
      request_day: editForm.request_day || null,
      max_seats: Math.max(1, Number(editForm.max_seats) || myClass.max_seats),
      description: editForm.description.trim(),
    });
    setSavingEdit(false);
    setEditing(false);
  }

  async function handleDelete() {
    await deleteGmenClass(myClass.id);
    setConfirmDelete(false);
  }

  const searchResults = addSearch.trim().length > 0
    ? students.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(addSearch.toLowerCase()) &&
        !roster.some(r => r.student_email === s.studentEmail)
      ).slice(0, 8)
    : [];

  async function handleAdd(s) {
    if (addBusy) return;
    if (!s.studentEmail) { setAddErr(`${s.firstName} ${s.lastName} has no email on file — add one on the student roster first.`); return; }
    setAddBusy(true); setAddErr("");
    const { error } = await enroll(s.studentEmail, `${s.firstName} ${s.lastName}`, myClass.id, period, s.id);
    setAddBusy(false);
    if (error) setAddErr(error.code === "23505" ? `${s.firstName} ${s.lastName} is already enrolled this period.` : "Couldn't add that student.");
    else setAddSearch("");
  }

  return (
    <div>
      {/* Class card */}
      <div className="card mb2">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div className="section-title" style={{ marginBottom: 2 }}>{myClass.class_name}</div>
            <div className="text-muted" style={{ fontSize: "0.82rem" }}>
              {myClass.room ? `Room ${myClass.room}` : "No room set"}
              {myClass.request_day ? ` · Enrichment day: ${myClass.request_day}` : " · No enrichment day"}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className={`tag ${full ? "tag-red" : "tag-green"}`}>{seats}/{myClass.max_seats}</span>
            <button className={`btn btn-sm ${myClass.is_open ? "btn-ghost" : "btn-primary"}`} onClick={() => toggleOpen(myClass.id, !myClass.is_open)}>
              {myClass.is_open ? "Close Enrollment" : "Open Enrollment"}
            </button>
          </div>
        </div>

        {myClass.description && <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginTop: "0.6rem" }}>{myClass.description}</p>}

        {!editing ? (
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-ghost btn-sm" onClick={startEdit}>Edit Details</button>
            {!confirmDelete ? (
              <button className="btn btn-ghost btn-sm text-red" onClick={() => setConfirmDelete(true)}>Delete Class</button>
            ) : (
              <>
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                  Delete "{myClass.class_name}" and unenroll {seats} student{seats !== 1 ? "s" : ""}?
                </span>
                <button className="btn btn-sm" style={{ background: "#dc2626", color: "#fff", border: "none" }} onClick={handleDelete}>Confirm Delete</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={saveEdit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end", marginTop: "0.85rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.75rem" }}>
            <div style={{ flex: "0 1 100px" }}>
              <label>Room</label>
              <input value={editForm.room} onChange={e => setEditForm(f => ({ ...f, room: e.target.value }))} />
            </div>
            <div style={{ flex: "0 1 150px" }}>
              <label>Enrichment Day</label>
              <select value={editForm.request_day} onChange={e => setEditForm(f => ({ ...f, request_day: e.target.value }))}>
                <option value="">No enrichment day</option>
                {REQUEST_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ flex: "0 1 90px" }}>
              <label>Seats</label>
              <input type="number" min={1} max={200} value={editForm.max_seats} onChange={e => setEditForm(f => ({ ...f, max_seats: e.target.value }))} />
            </div>
            <div style={{ flex: "2 1 220px" }}>
              <label>Description</label>
              <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Shown to students choosing this class" />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingEdit}>{savingEdit ? "Saving…" : "Save"}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </form>
        )}
      </div>

      {/* Attendance — the whole point is that this takes under 15 seconds */}
      {isGmenDay && (
        <div className="card mb2">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.6rem" }}>
            <div className="section-title" style={{ margin: 0 }}>Attendance — Today</div>
            {attendanceSubmitted && <span className="tag tag-green">✓ Submitted</span>}
          </div>
          {markableRoster.length === 0 ? (
            <div className="text-muted" style={{ fontSize: "0.85rem" }}>No students to mark yet.</div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                {markableRoster.map(e => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: "0.86rem", fontWeight: 500 }}>{e.student_name}</span>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      {ATTENDANCE_STATUSES.map(s => {
                        const active = statusFor(e.student_id) === s.key;
                        return (
                          <button key={s.key} onClick={() => setAttendanceStatus(e.student_id, s.key)} title={s.key} style={{
                            width: 30, padding: "0.25rem 0", borderRadius: 6, fontSize: "0.75rem", fontWeight: 800,
                            cursor: "pointer", border: active ? "none" : "1px solid rgba(255,255,255,0.15)",
                            background: active ? s.color : "transparent",
                            color: active ? "#000" : "rgba(255,255,255,0.5)",
                          }}>{s.label}</button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary btn-sm mt1" disabled={attendanceSubmitting} onClick={handleSubmitAttendance}>
                {attendanceSubmitting ? "Saving…" : attendanceSubmitted ? "Update Attendance" : `Submit Attendance (${markableRoster.length})`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Pending swap requests touching this class */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <div className="card mb2">
          <div className="section-title">Pending Change Requests</div>
          {incoming.map(r => (
            <div key={r.id} style={{ fontSize: "0.85rem", padding: "0.35rem 0" }}>
              <span className="tag tag-amber" style={{ marginRight: "0.5rem" }}>Incoming</span>
              {r.student_name} wants to switch into this class — awaiting admin approval.
            </div>
          ))}
          {outgoing.map(r => (
            <div key={r.id} style={{ fontSize: "0.85rem", padding: "0.35rem 0" }}>
              <span className="tag" style={{ marginRight: "0.5rem" }}>Outgoing</span>
              {r.student_name} wants to switch out of this class — awaiting admin approval.
            </div>
          ))}
        </div>
      )}

      {/* Add a student manually */}
      <div className="card mb2" style={{ position: "relative", zIndex: 5 }}>
        <div className="section-title">Add a Student</div>
        <div style={{ position: "relative" }}>
          <input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Search by name…" disabled={addBusy} />
          {searchResults.length > 0 && (
            <div className="autocomplete-list">
              {searchResults.map(s => (
                <div key={s.id} onClick={() => handleAdd(s)} className="autocomplete-item">
                  {s.firstName} {s.lastName} <span className="tag tag-amber">{s.grade}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {addErr && <p className="text-red mt1" style={{ fontSize: "0.8rem" }}>{addErr}</p>}
      </div>

      {/* Roster */}
      <div className="card">
        <div className="section-title">Roster — {seats} Student{seats !== 1 ? "s" : ""}</div>
        {roster.length === 0 ? (
          <div className="text-muted" style={{ fontSize: "0.85rem" }}>No students enrolled yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            {roster.map(e => {
              const previousClassName = e.previous_class_id ? classes.find(c => c.id === e.previous_class_id)?.class_name : null;
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{e.student_name}</div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>{e.student_email}</div>
                    {previousClassName && (
                      <div style={{ fontSize: "0.72rem", color: "rgba(245,192,37,0.7)", marginTop: 1 }}>← moved from {previousClassName}</div>
                    )}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                    Joined {e.assigned_at ? new Date(e.assigned_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
