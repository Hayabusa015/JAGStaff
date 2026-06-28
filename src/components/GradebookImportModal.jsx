import { useState } from "react";
import { GOLD } from "../constants.js";
import { parseCSV } from "../csv.js";

export default function ImportGradesModal({ periodAssignments, students, periodLabel, onApply, onClose }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [applying, setApplying] = useState(false);

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setText(String(r.result || ""));
    r.readAsText(f);
  }

  function buildPreview() {
    const { headers, rows } = parseCSV(text);
    if (!headers.length) { setPreview({ error: "Couldn't parse any columns." }); return; }
    const skip = new Set(["period %", "period%", "letter"]);
    const byName = new Map(periodAssignments.map(a => [a.name.trim().toLowerCase(), a]));
    const colMap = headers.map((h, i) => (i === 0 || skip.has(h.trim().toLowerCase())) ? null : (byName.get(h.trim().toLowerCase()) || null));
    const unmatchedCols = headers.filter((h, i) => i > 0 && !skip.has(h.trim().toLowerCase()) && !colMap[i]);

    const norm = s => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
    const lookup = new Map();
    students.forEach(s => {
      lookup.set(norm(`${s.lastName}, ${s.firstName}`), s);
      lookup.set(norm(`${s.firstName} ${s.lastName}`), s);
      lookup.set(norm(`${s.lastName} ${s.firstName}`), s);
      if (s.id) lookup.set(norm(s.id), s);
    });

    const updates = [];
    let matchedStudents = 0;
    const unmatchedRows = [];
    rows.forEach(r => {
      const st = lookup.get(norm(r[0]));
      if (!st) { if ((r[0] || "").trim()) unmatchedRows.push(r[0]); return; }
      matchedStudents++;
      colMap.forEach((a, i) => {
        if (!a) return;
        const raw = (r[i] ?? "").trim();
        if (raw === "") return;
        const low = raw.toLowerCase();
        if (low === "exc" || low === "excused") updates.push({ assignmentId: a.id, student: st, data: { excused: true, missing: false, points_earned: null } });
        else if (low === "mis" || low === "missing") updates.push({ assignmentId: a.id, student: st, data: { missing: true, excused: false, points_earned: null } });
        else if (!isNaN(Number(raw))) updates.push({ assignmentId: a.id, student: st, data: { points_earned: Number(raw), missing: false, excused: false } });
      });
    });
    setPreview({ updates, matchedCols: colMap.filter(Boolean).length, unmatchedCols, matchedStudents, unmatchedRows });
  }

  async function apply() {
    if (!preview?.updates?.length) return;
    setApplying(true);
    await onApply(preview.updates);
  }

  const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "0.4rem 0.6rem", color: "#fff", fontSize: "0.82rem", outline: "none" };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: "min(640px, 95vw)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Import Grades — {periodLabel}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
        </div>
        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
          Columns are matched to assignments <strong>by name</strong>; rows are matched to students by
          "Last, First". Cell values can be a number, <strong>EXC</strong>, or <strong>MIS</strong>; blanks are skipped.
          Tip: use <strong>⬇ CSV</strong> to export a template first.
        </div>
        <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ ...inp, width: "100%", boxSizing: "border-box", marginBottom: "0.5rem" }} />
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setPreview(null); }}
          placeholder="…or paste CSV here"
          style={{ ...inp, width: "100%", boxSizing: "border-box", minHeight: 110, resize: "vertical", fontFamily: "monospace", marginBottom: "0.5rem" }}
        />

        {preview?.error && <div style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: "0.5rem" }}>{preview.error}</div>}
        {preview && !preview.error && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "0.6rem 0.85rem", marginBottom: "0.6rem", fontSize: "0.8rem" }}>
            <div>✓ {preview.matchedStudents} students matched · {preview.matchedCols} assignment columns matched · <strong style={{ color: GOLD }}>{preview.updates.length}</strong> scores to import</div>
            {preview.unmatchedCols.length > 0 && <div style={{ color: "#f97316", marginTop: 4 }}>Unmatched columns (skipped): {preview.unmatchedCols.join(", ")}</div>}
            {preview.unmatchedRows.length > 0 && <div style={{ color: "#f97316", marginTop: 4 }}>Unmatched students (skipped): {preview.unmatchedRows.slice(0, 6).join(", ")}{preview.unmatchedRows.length > 6 ? "…" : ""}</div>}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...inp, cursor: "pointer" }}>Cancel</button>
          {!preview || preview.error
            ? <button onClick={buildPreview} disabled={!text.trim()} style={{ background: text.trim() ? GOLD : "rgba(255,255,255,0.1)", border: "none", color: text.trim() ? "#000" : "rgba(255,255,255,0.3)", fontWeight: 700, borderRadius: 6, padding: "0.4rem 1.25rem", cursor: text.trim() ? "pointer" : "not-allowed" }}>Preview</button>
            : <button onClick={apply} disabled={applying || !preview.updates.length} style={{ background: preview.updates.length ? GOLD : "rgba(255,255,255,0.1)", border: "none", color: "#000", fontWeight: 700, borderRadius: 6, padding: "0.4rem 1.25rem", cursor: "pointer" }}>{applying ? "Importing…" : `Import ${preview.updates.length} scores`}</button>}
        </div>
      </div>
    </div>
  );
}
