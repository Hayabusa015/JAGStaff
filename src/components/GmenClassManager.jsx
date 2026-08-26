// Admin tools for building real G-Men classes: a manual Add Class form and
// a roster import that accepts a Google Sheet (pasted cells or a CSV
// export). Parsing reuses the tested CSV engine from the student roster
// import; all decisions live in buildImportPlan (pure, unit-tested) so this
// component only renders the plan and executes it.
import { useRef, useState } from "react";
import { GOLD } from "../constants.js";
import { bulkEnrollGmen } from "../supabase.js";
import { parseCSV } from "./StudentRoster.jsx";
import { buildImportPlan } from "./gmenImport.js";

const DAYS = ["", "Tuesday", "Wednesday", "Thursday"];

export function AddGmenClassForm({ addGmenClass, period }) {
  const blank = { class_name: "", teacher_name: "", room: "", request_day: "", max_seats: 25, description: "" };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okName, setOkName] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (busy || !form.class_name.trim()) return;
    setBusy(true); setErr(""); setOkName("");
    const { error } = await addGmenClass({
      ...form,
      class_name: form.class_name.trim(),
      teacher_name: form.teacher_name.trim(),
      teacher_email: null,
      room: form.room.trim(),
      max_seats: Math.max(1, Number(form.max_seats) || 25),
      grading_period: period,
      is_open: true,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOkName(form.class_name.trim());
    setForm(blank);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <div style={{ flex: "2 1 180px" }}>
        <label>Class Name *</label>
        <input value={form.class_name} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))} placeholder="e.g. Study Hall" />
      </div>
      <div style={{ flex: "1 1 140px" }}>
        <label>Teacher</label>
        <input value={form.teacher_name} onChange={e => setForm(f => ({ ...f, teacher_name: e.target.value }))} placeholder="Mr. Walker" />
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
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !form.class_name.trim()}>
        {busy ? "Adding…" : "+ Add Class"}
      </button>
      {err && <div className="text-red" style={{ flexBasis: "100%", fontSize: "0.8rem" }}>{err}</div>}
      {okName && <div className="text-green" style={{ flexBasis: "100%", fontSize: "0.8rem" }}>✓ "{okName}" created.</div>}
    </form>
  );
}

export function GmenRosterImport({ classes, enrollments, addGmenClass, students, period }) {
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
        student_email: e.student_email,
        student_name: e.student_name,
        class_id: idByKey.get(e.classKey),
        grading_period: period,
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
        are picked up when present. Students without an email column are matched to the school roster by
        name. Missing classes are created; nobody already enrolled this period is ever moved.
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
