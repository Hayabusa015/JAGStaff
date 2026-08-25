import { useState, useRef } from "react";
import { useStudents } from "../supabase.js";
import ClassroomSyncModal from "./ClassroomSyncModal.jsx";

// Split one delimited line, honouring quoted fields. A naive split() broke on
// any quoted value containing the delimiter — "Shull, Matt" being the common
// case in SIS exports.
function splitLine(line, delim) {
  const out = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }  // escaped ""
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      out.push(cur); cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map(c => c.trim());
}

export function parseCSV(text) {
  // Strip a UTF-8 BOM — Excel adds one, and it corrupts the first header.
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return null;

  // Some exports open with a title or blank rows; the header is the first line
  // that actually carries two or more filled cells.
  const sniff = (l) => l.includes("\t") ? "\t" : l.includes("|") ? "|" : ",";
  let hi = lines.findIndex(l => splitLine(l, sniff(l)).filter(c => c).length >= 2);
  if (hi === -1) hi = 0;

  const delim = sniff(lines[hi]);
  const headers = splitLine(lines[hi], delim).map(h => h.toLowerCase());
  const rows = lines.slice(hi + 1).map(l => splitLine(l, delim));
  return { headers, rows };
}

// Header matching. `avoid` keeps "last name" from binding to "last login" and
// keeps a bare "email" from stealing the student's address into parent email.
function guessCol(headers, patterns, avoid = []) {
  for (const p of patterns) {
    const i = headers.findIndex(h => h.includes(p) && !avoid.some(a => h.includes(a)));
    if (i !== -1) return String(i);
  }
  return "-1";
}

const FIRST_PATTERNS = ["first name", "firstname", "first_name", "given name", "first", "fname", "given"];
const LAST_PATTERNS  = ["last name", "lastname", "last_name", "surname", "family name", "last", "lname", "surname", "family"];
const STALE          = ["login", "modified", "updated", "seen", "active", "changed"];

export function guessAll(headers) {
  return {
    first: guessCol(headers, FIRST_PATTERNS, STALE),
    last:  guessCol(headers, LAST_PATTERNS, STALE),
    grade: guessCol(headers, ["grade level", "gradelevel", "grade", "year level", "yr", "level"]),
    // Prefer an explicitly parent/guardian address; only fall back to a bare
    // "email" when it isn't the student's own.
    parentEmail: (() => {
      const explicit = guessCol(headers, ["parent email", "guardian email", "contact email", "parent", "guardian"]);
      if (explicit !== "-1") return explicit;
      return guessCol(headers, ["email"], ["student", "school", "pupil"]);
    })(),
  };
}

// Several SIS exports ship one "Student Name" column instead of two. Split it
// into synthetic first/last columns so the mapping UI still has something to
// point at.
export function expandNameColumn(parsed) {
  const { headers, rows } = parsed;
  const g = guessAll(headers);
  if (g.first !== "-1" && g.last !== "-1") return parsed;

  const ni = headers.findIndex(h => /name/.test(h) && !STALE.some(a => h.includes(a)));
  if (ni === -1) return parsed;

  const splitName = (raw) => {
    const v = (raw || "").trim();
    if (!v) return ["", ""];
    if (v.includes(",")) {                       // "Last, First"
      const [l, ...rest] = v.split(",");
      return [rest.join(",").trim(), l.trim()];
    }
    const parts = v.split(/\s+/);                 // "First Last"
    return [parts.shift() || "", parts.join(" ")];
  };

  return {
    headers: [...headers, "first name (split)", "last name (split)"],
    rows: rows.map(r => { const [f, l] = splitName(r[ni]); return [...r, f, l]; }),
  };
}

export default function StudentRoster() {
  const { students, loading, importStudents, syncClassroomStudents, addStudent, updateStudent, removeStudent } = useStudents();
  const [showClassroomSync, setShowClassroomSync] = useState(false);
  const [drag, setDrag] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [colMap, setColMap] = useState({ first: "0", last: "1", grade: "2", parentEmail: "-1" });
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(null);   // { added } on success
  const [importErr, setImportErr] = useState("");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All");
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState({});
  const [manualForm, setManualForm] = useState({ firstName: "", lastName: "", grade: "", parentEmail: "" });
  const fileRef = useRef();

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const raw = parseCSV(e.target.result);
      if (!raw) { setImportErr("That file didn't have a header row plus at least one student row."); return; }
      const result = expandNameColumn(raw);
      setColMap(guessAll(result.headers));
      setParsed(result);
      setImported(null);
      setImportErr("");
    };
    reader.onerror = () => setImportErr("Could not read that file.");
    reader.readAsText(file);
  }

  // Rows that will actually be saved, under the current mapping.
  const importable = (() => {
    if (!parsed) return [];
    const fi = Number(colMap.first), li = Number(colMap.last);
    const gi = Number(colMap.grade), pi = Number(colMap.parentEmail);
    return parsed.rows
      .filter(r => (fi >= 0 && r[fi]?.trim()) || (li >= 0 && r[li]?.trim()))
      .map(r => ({
        firstName:   fi >= 0 ? (r[fi]?.trim() || "") : "",
        lastName:    li >= 0 ? (r[li]?.trim() || "") : "",
        grade:       gi >= 0 ? (r[gi]?.trim() || "") : "",
        parentEmail: pi >= 0 ? (r[pi]?.trim() || "") : "",
      }));
  })();

  async function doImport() {
    if (!parsed || !importable.length) return;
    setImporting(true);
    setImportErr("");
    try {
      const res = await importStudents(importable);
      setParsed(null);
      setImported({ added: res?.added ?? importable.length });
    } catch (err) {
      // Surfaced rather than swallowed — a silent failure here used to look
      // exactly like a successful import of zero students.
      setImportErr(err.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  async function addManual(e) {
    e.preventDefault();
    if (!manualForm.firstName.trim() && !manualForm.lastName.trim()) return;
    await addStudent({ firstName: manualForm.firstName.trim(), lastName: manualForm.lastName.trim(), grade: manualForm.grade.trim(), parentEmail: manualForm.parentEmail.trim() });
    setManualForm({ firstName: "", lastName: "", grade: "", parentEmail: "" });
  }

  async function saveEdit(id) {
    await updateStudent(id, editVal);
    setEditId(null);
  }

  const grades = ["All", ...Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort()];
  const filtered = students.filter(s => {
    const matchSearch = !search.trim() || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchGrade = gradeFilter === "All" || s.grade === gradeFilter;
    return matchSearch && matchGrade;
  });

  const withEmail = students.filter(s => s.parentEmail).length;

  return (
    <div>
      {/* ── Section header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.9rem 1.1rem",
        background: "linear-gradient(135deg, rgba(245,192,37,0.07) 0%, rgba(245,192,37,0.02) 100%)",
        border: "1px solid rgba(245,192,37,0.18)",
        borderRadius: 12,
        marginBottom: "1rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <span style={{ fontSize: "1.3rem" }}>🎓</span>
          <div>
            <h2 className="page-title">Student Roster</h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
              {loading ? "Loading…" : `${students.length} students · shared school-wide · powers Hall Pass, G-Men & Infractions${withEmail > 0 ? ` · ${withEmail} with parent email` : ""}`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Sync from Classroom */}
          <button
            onClick={() => setShowClassroomSync(true)}
            style={{
              display: "flex", alignItems: "center", gap: "0.45rem",
              padding: "0.42rem 0.85rem",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.13)",
              borderRadius: 8, cursor: "pointer", color: "var(--text)",
              fontSize: "0.8rem", fontWeight: 600,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(66,133,244,0.18)"; e.currentTarget.style.borderColor = "rgba(66,133,244,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)"; }}
          >
            {/* Google Classroom icon */}
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="6" fill="#0F9D58"/>
              <rect x="8" y="12" width="32" height="24" rx="2" fill="white" opacity="0.9"/>
              <circle cx="24" cy="20" r="4" fill="#0F9D58"/>
              <path d="M15 32c0-4 4-6 9-6s9 2 9 6" fill="#0F9D58"/>
            </svg>
            Sync from Classroom
          </button>

          {/* Import CSV */}
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              display: "flex", alignItems: "center", gap: "0.45rem",
              padding: "0.42rem 0.85rem",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.13)",
              borderRadius: 8, cursor: "pointer", color: "var(--text)",
              fontSize: "0.8rem", fontWeight: 600,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(34,197,94,0.15)"; e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)"; }}
          >
            {/* Excel icon */}
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="6" fill="#1D6F42"/>
              <path d="M8 12h20v24H8z" fill="white" opacity="0.15"/>
              <path d="M28 12h12v4H28zM28 20h12v4H28zM28 28h12v4H28z" fill="white" opacity="0.7"/>
              <path d="M12 18l4 6-4 6h4l2-3 2 3h4l-4-6 4-6h-4l-2 3-2-3z" fill="white"/>
            </svg>
            Import CSV
          </button>
        </div>
      </div>

      <input type="file" accept=".csv,.tsv,.txt" ref={fileRef} style={{ display: "none" }}
        onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />

      {students.length === 0 && !parsed && !loading && (
        <div
          className={`drop-zone mb2 ${drag ? "drag-over" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📁</div>
          <div style={{ fontWeight: 600 }}>Drop your CSV file here, or click to browse</div>
          <div className="text-muted mt1" style={{ fontSize: "0.78rem" }}>
            Columns: First Name, Last Name, Grade — optional: Parent Email
          </div>
        </div>
      )}

      {parsed && (
        <div className="card mb2">
          <div className="section-title">Map Columns</div>
          <p className="text-muted mb1" style={{ fontSize: "0.82rem" }}>
            Found {parsed.rows.length} rows · {parsed.headers.length} columns.{" "}
            <strong style={{ color: importable.length ? "var(--text)" : "#fca5a5" }}>
              {importable.length} will be saved
            </strong>. This replaces the current roster.
          </p>

          {!importable.length && (
            <div style={{
              display: "flex", gap: "0.6rem", alignItems: "flex-start",
              background: "rgba(220,38,38,0.08)", border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 8, padding: "0.7rem 0.9rem", marginBottom: "0.85rem",
              fontSize: "0.82rem", color: "#fca5a5",
            }}>
              <span style={{ flexShrink: 0 }}>⚠</span>
              <span>
                No rows have a first or last name with the current mapping, so nothing would be
                saved. Point <strong>First Name</strong> or <strong>Last Name</strong> at the right
                column below — the preview updates as you change it.
              </span>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {[["First Name", "first"], ["Last Name", "last"], ["Grade", "grade"], ["Parent Email", "parentEmail"]].map(([label, key]) => (
              <div key={key}>
                <label>{label}</label>
                <select value={colMap[key]} onChange={e => setColMap(m => ({ ...m, [key]: e.target.value }))}>
                  <option value="-1">— skip —</option>
                  {parsed.headers.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: "1rem", overflowX: "auto" }}>
            <table className="stu-table">
              <thead><tr><th>Last Name</th><th>First Name</th><th>Grade</th><th>Parent Email</th></tr></thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    <td>{r[Number(colMap.last)]  || <em className="text-muted">blank</em>}</td>
                    <td>{r[Number(colMap.first)] || <em className="text-muted">blank</em>}</td>
                    <td><span className="tag tag-amber">{r[Number(colMap.grade)] || "—"}</span></td>
                    <td className="text-muted" style={{ fontSize: "0.78rem" }}>{Number(colMap.parentEmail) >= 0 ? (r[Number(colMap.parentEmail)] || "—") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap1">
            <button className="btn btn-ghost" onClick={() => setParsed(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={doImport} disabled={importing || !importable.length}>
              {importing ? "Saving…" : `Import ${importable.length} Students`}
            </button>
          </div>
        </div>
      )}

      {imported && (
        <div className="card mb2" style={{ borderLeft: "4px solid #22c55e" }}>
          <span className="text-green bold">✓ Roster saved — {imported.added} students loaded on every device.</span>
        </div>
      )}

      {importErr && (
        <div className="card mb2" style={{ borderLeft: "4px solid #ef4444" }}>
          <div style={{ fontWeight: 700, color: "#fca5a5", marginBottom: "0.25rem" }}>Import failed</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{importErr}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
            Your existing roster was left untouched.
          </div>
        </div>
      )}

      {/* Add manually */}
      <div className="card mb2">
        <div className="section-title">Add Student Manually</div>
        <form onSubmit={addManual} className="flex gap1 items-center" style={{ flexWrap: "wrap" }}>
          <input style={{ flex: 1, minWidth: 120 }} value={manualForm.lastName}
            onChange={e => setManualForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name" />
          <input style={{ flex: 1, minWidth: 120 }} value={manualForm.firstName}
            onChange={e => setManualForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name" />
          <input style={{ flex: "0 0 80px" }} value={manualForm.grade}
            onChange={e => setManualForm(f => ({ ...f, grade: e.target.value }))} placeholder="Grade" />
          <input style={{ flex: 2, minWidth: 180 }} value={manualForm.parentEmail}
            onChange={e => setManualForm(f => ({ ...f, parentEmail: e.target.value }))} placeholder="Parent email (optional)" type="email" />
          <button type="submit" className="btn btn-primary btn-sm">+ Add</button>
        </form>
      </div>

      {/* Table */}
      {students.length > 0 && (
        <div className="card">
          <div className="flex items-center gap1 mb1" style={{ flexWrap: "wrap" }}>
            <input style={{ flex: 1, minWidth: 200 }} value={search}
              onChange={e => setSearch(e.target.value)} placeholder="Search by name…" />
            <select style={{ width: 130 }} value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
              {grades.map(g => <option key={g}>{g}</option>)}
            </select>
            <span className="tag tag-gold">{filtered.length} shown</span>
          </div>

          <table className="stu-table">
            <thead><tr><th>#</th><th>Last Name</th><th>First Name</th><th>Grade</th><th>Parent Email</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-muted" style={{ textAlign: "center", padding: "1rem" }}>No students match.</td></tr>
              )}
              {filtered.map((s, i) => (
                <tr key={s.id}>
                  {editId === s.id ? (
                    <>
                      <td className="text-muted">{i + 1}</td>
                      <td><input value={editVal.lastName}  onChange={e => setEditVal(v => ({ ...v, lastName: e.target.value }))} /></td>
                      <td><input value={editVal.firstName} onChange={e => setEditVal(v => ({ ...v, firstName: e.target.value }))} /></td>
                      <td><input style={{ width: 70 }} value={editVal.grade} onChange={e => setEditVal(v => ({ ...v, grade: e.target.value }))} /></td>
                      <td><input type="email" style={{ minWidth: 160 }} value={editVal.parentEmail || ""} onChange={e => setEditVal(v => ({ ...v, parentEmail: e.target.value }))} placeholder="parent@email.com" /></td>
                      <td className="flex gap1">
                        <button className="btn btn-primary btn-sm" onClick={() => saveEdit(s.id)}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>✕</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="text-muted">{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{s.lastName}</td>
                      <td>{s.firstName}</td>
                      <td><span className="tag tag-amber">{s.grade || "—"}</span></td>
                      <td style={{ fontSize: "0.78rem" }}>
                        {s.parentEmail
                          ? <span style={{ color: "#4ade80" }}>📧 {s.parentEmail}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="flex gap1">
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => { setEditId(s.id); setEditVal({ firstName: s.firstName, lastName: s.lastName, grade: s.grade, parentEmail: s.parentEmail || "" }); }}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => removeStudent(s.id)}>✕</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-muted mt1" style={{ fontSize: "0.78rem" }}>{students.length} total · {withEmail} with parent email</div>
        </div>
      )}
      {showClassroomSync && (
        <ClassroomSyncModal
          onClose={() => setShowClassroomSync(false)}
          students={students}
          syncClassroomStudents={syncClassroomStudents}
        />
      )}
    </div>
  );
}
