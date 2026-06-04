import { useState, useRef } from "react";
import { GOLD } from "../constants.js";
import { useStudents } from "../supabase.js";

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return null;
  const delim = lines[0].includes("\t") ? "\t" : lines[0].includes("|") ? "|" : ",";
  const headers = lines[0].split(delim).map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows = lines.slice(1).map(l => l.split(delim).map(c => c.trim().replace(/^"|"$/g, "")));
  return { headers, rows };
}

function guessCol(headers, patterns) {
  for (const p of patterns) {
    const i = headers.findIndex(h => h.includes(p));
    if (i !== -1) return String(i);
  }
  return "0";
}

export default function StudentRoster() {
  const { students, loading, importStudents, addStudent, updateStudent, removeStudent } = useStudents();
  const [drag, setDrag] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [colMap, setColMap] = useState({ first: "0", last: "1", grade: "2" });
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All");
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState({});
  const [manualForm, setManualForm] = useState({ firstName: "", lastName: "", grade: "" });
  const fileRef = useRef();

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const result = parseCSV(e.target.result);
      if (!result) return;
      setColMap({
        first: guessCol(result.headers, ["first","fname","given"]),
        last:  guessCol(result.headers, ["last","lname","surname","family"]),
        grade: guessCol(result.headers, ["grade","yr","year","level"]),
      });
      setParsed(result);
      setImported(false);
    };
    reader.readAsText(file);
  }

  async function doImport() {
    if (!parsed) return;
    setImporting(true);
    const { rows } = parsed;
    const fi = Number(colMap.first), li = Number(colMap.last), gi = Number(colMap.grade);
    const newStudents = rows
      .filter(r => r[fi]?.trim() || r[li]?.trim())
      .map(r => ({ firstName: r[fi]?.trim() || "", lastName: r[li]?.trim() || "", grade: r[gi]?.trim() || "" }));
    await importStudents(newStudents);
    setParsed(null);
    setImporting(false);
    setImported(true);
  }

  async function addManual(e) {
    e.preventDefault();
    if (!manualForm.firstName.trim() && !manualForm.lastName.trim()) return;
    await addStudent({ firstName: manualForm.firstName.trim(), lastName: manualForm.lastName.trim(), grade: manualForm.grade.trim() });
    setManualForm({ firstName: "", lastName: "", grade: "" });
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

  return (
    <div>
      <div className="flex items-center justify-between mb2">
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem" }}>Student Roster</h2>
          <p className="text-muted" style={{ fontSize: "0.8rem" }}>
            {loading ? "Loading from database…" : "Saved to Supabase — shared with all staff. Powers G-Men, Hall Pass & Infractions."}
          </p>
        </div>
        <div className="flex items-center gap1">
          <span className="tag tag-gold">{students.length} students</span>
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Import CSV</button>
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
            Needs at least: First Name, Last Name, Grade columns (any delimiter)
          </div>
        </div>
      )}

      {parsed && (
        <div className="card mb2">
          <div className="section-title">Map Columns</div>
          <p className="text-muted mb1" style={{ fontSize: "0.82rem" }}>
            Found {parsed.rows.length} rows · {parsed.headers.length} columns. This will <strong>replace</strong> the current roster.
          </p>
          <div className="grid3 mb1">
            {[["First Name", "first"], ["Last Name", "last"], ["Grade", "grade"]].map(([label, key]) => (
              <div key={key}>
                <label>{label}</label>
                <select value={colMap[key]} onChange={e => setColMap(m => ({ ...m, [key]: e.target.value }))}>
                  {parsed.headers.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: "1rem", overflowX: "auto" }}>
            <table className="stu-table">
              <thead><tr><th>Last Name</th><th>First Name</th><th>Grade</th></tr></thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    <td>{r[Number(colMap.last)]  || <em className="text-muted">blank</em>}</td>
                    <td>{r[Number(colMap.first)] || <em className="text-muted">blank</em>}</td>
                    <td><span className="tag tag-amber">{r[Number(colMap.grade)] || "—"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap1">
            <button className="btn btn-ghost" onClick={() => setParsed(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={doImport} disabled={importing}>
              {importing ? "Saving…" : `Import ${parsed.rows.length} Students`}
            </button>
          </div>
        </div>
      )}

      {imported && (
        <div className="card mb2" style={{ borderLeft: "4px solid #22c55e" }}>
          <span className="text-green bold">✓ Roster saved to Supabase — {students.length} students loaded on every device.</span>
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
            <thead><tr><th>#</th><th>Last Name</th><th>First Name</th><th>Grade</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-muted" style={{ textAlign: "center", padding: "1rem" }}>No students match.</td></tr>
              )}
              {filtered.map((s, i) => (
                <tr key={s.id}>
                  {editId === s.id ? (
                    <>
                      <td className="text-muted">{i + 1}</td>
                      <td><input value={editVal.lastName}  onChange={e => setEditVal(v => ({ ...v, lastName: e.target.value }))} /></td>
                      <td><input value={editVal.firstName} onChange={e => setEditVal(v => ({ ...v, firstName: e.target.value }))} /></td>
                      <td><input style={{ width: 70 }} value={editVal.grade} onChange={e => setEditVal(v => ({ ...v, grade: e.target.value }))} /></td>
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
                      <td className="flex gap1">
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => { setEditId(s.id); setEditVal({ firstName: s.firstName, lastName: s.lastName, grade: s.grade }); }}>
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
          <div className="text-muted mt1" style={{ fontSize: "0.78rem" }}>{students.length} total students in roster</div>
        </div>
      )}
    </div>
  );
}
