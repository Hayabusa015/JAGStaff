import { useState } from "react";
import { GOLD } from "../constants.js";
import { gradePct, effectivePoints, isPastDue } from "../gradebook.js";
import { cellColor } from "./gradebook-constants.js";

export default function GradeCell({ assignment, grade, _student, onSave, onOpenRubric, quickEntry, autoZeroOpts, gridPos, registerRef, onGridNav }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  const pts = effectivePoints(grade, assignment, autoZeroOpts);
  const pct = gradePct(grade, assignment, autoZeroOpts);
  const hasRubric = !!(assignment?.rubric?.length);
  const latePct = autoZeroOpts?.latePenaltyPct || 0;
  const autoZeroed = pts == null && !grade?.excused && !grade?.missing &&
    autoZeroOpts?.autoZeroMissing && isPastDue(assignment, autoZeroOpts.today, autoZeroOpts.graceDays);

  function open() {
    setDraft({
      points_earned: grade?.points_earned ?? "",
      excused: grade?.excused || false,
      missing: grade?.missing || false,
      late: grade?.late || false,
      retake_score: grade?.retake_score ?? "",
      retake_policy: grade?.retake_policy || "higher",
      notes: grade?.notes || "",
    });
    setEditing(true);
  }

  async function commit() {
    const d = { ...draft };
    if (d.points_earned === "") d.points_earned = null;
    if (d.retake_score === "") d.retake_score = null;
    if (d.points_earned != null) d.points_earned = Number(d.points_earned);
    if (d.retake_score != null) d.retake_score = Number(d.retake_score);
    await onSave(d);
    setEditing(false);
  }

  const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, padding: "0.25rem 0.45rem", color: "#fff", fontSize: "0.78rem", outline: "none" };

  // Quick-entry mode: a bare input with spreadsheet keyboard navigation.
  if (quickEntry && !hasRubric) {
    const display = grade?.excused ? "EXC" : grade?.missing ? "MIS"
      : grade?.points_earned != null ? String(grade.points_earned) + (grade?.late ? " L" : "") : "";
    async function quickCommit(val) {
      const trimmed = (val ?? "").trim().toLowerCase();
      if (trimmed === "e") return onSave({ excused: true, missing: false, points_earned: null });
      if (trimmed === "m") return onSave({ missing: true, excused: false, points_earned: null });
      if (trimmed === "l") return onSave({ late: !grade?.late });
      if (trimmed === "x" || trimmed === "") return onSave({ points_earned: null, missing: false, excused: false, late: false });
      // Trailing "l" marks the entry late, e.g. "85l".
      const late = /l$/.test(trimmed);
      const n = Number(late ? trimmed.slice(0, -1) : trimmed);
      if (!isNaN(n)) return onSave({ points_earned: n, missing: false, excused: false, late });
    }
    return (
      <td style={{ padding: 1, textAlign: "center", background: grade?.missing ? "rgba(249,115,22,0.1)" : grade?.excused ? "rgba(255,255,255,0.04)" : cellColor(autoZeroed ? 0 : pct), minWidth: 54 }}>
        <input
          ref={el => registerRef?.(gridPos, el)}
          defaultValue={display}
          key={display}
          placeholder={autoZeroed ? "0" : "—"}
          onKeyDown={e => {
            if (["Enter", "ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Tab"].includes(e.key)) {
              e.preventDefault();
              quickCommit(e.currentTarget.value);
              const dir = e.key === "Enter" || e.key === "ArrowDown" ? "down"
                : e.key === "ArrowUp" ? "up"
                : e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey) ? "left" : "right";
              onGridNav?.(gridPos, dir);
            }
          }}
          onBlur={e => quickCommit(e.currentTarget.value)}
          style={{
            width: "100%", boxSizing: "border-box", textAlign: "center", background: "transparent",
            border: "1px solid transparent", borderRadius: 4, padding: "0.28rem 0.1rem", color: "#fff",
            fontSize: "0.76rem", fontWeight: 600, outline: "none",
          }}
          onFocus={e => { e.currentTarget.style.border = `1px solid ${GOLD}`; e.currentTarget.style.background = "rgba(245,192,37,0.08)"; e.currentTarget.select(); }}
        />
      </td>
    );
  }

  if (editing) return (
    <td style={{ padding: "0.3rem", minWidth: 110, verticalAlign: "top" }}>
      <div style={{ background: "#1a1400", border: `1px solid ${GOLD}`, borderRadius: 7, padding: "0.5rem", zIndex: 20, position: "relative" }}>
        {hasRubric ? (
          <button onClick={() => { setEditing(false); onOpenRubric(); }} style={{ ...inp, cursor: "pointer", width: "100%", marginBottom: "0.4rem", color: GOLD, border: `1px solid rgba(245,192,37,0.3)` }}>📋 Open Rubric</button>
        ) : (
          <input type="number" min={0} max={assignment.max_points} value={draft.points_earned} onChange={e => setDraft(d => ({ ...d, points_earned: e.target.value }))} placeholder={`/ ${assignment.max_points}`} style={{ ...inp, width: "100%", boxSizing: "border-box", marginBottom: "0.4rem" }} autoFocus />
        )}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.4rem" }}>
          <button onClick={() => setDraft(d => ({ ...d, missing: true, excused: false, points_earned: "" }))} style={{ ...inp, flex: 1, cursor: "pointer", color: draft.missing ? "#000" : "#f97316", background: draft.missing ? "#f97316" : "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", fontSize: "0.68rem" }}>Missing</button>
          <button onClick={() => setDraft(d => ({ ...d, excused: true, missing: false, points_earned: "" }))} style={{ ...inp, flex: 1, cursor: "pointer", color: draft.excused ? "#000" : "rgba(255,255,255,0.7)", background: draft.excused ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.2)", fontSize: "0.68rem" }}>Excused</button>
          <button onClick={() => setDraft(d => ({ ...d, missing: false, excused: false, late: false }))} style={{ ...inp, flex: 1, cursor: "pointer", fontSize: "0.68rem" }}>Clear</button>
        </div>
        {latePct > 0 && (
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", cursor: "pointer", marginBottom: "0.4rem", color: draft.late ? "#f97316" : "rgba(255,255,255,0.6)" }}>
            <input type="checkbox" checked={!!draft.late} onChange={e => setDraft(d => ({ ...d, late: e.target.checked }))} /> Late (−{latePct}%)
          </label>
        )}
        <div style={{ marginBottom: "0.4rem" }}>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Retake score</div>
          <input type="number" min={0} max={assignment.max_points} value={draft.retake_score} onChange={e => setDraft(d => ({ ...d, retake_score: e.target.value }))} placeholder="—" style={{ ...inp, width: "100%", boxSizing: "border-box", marginBottom: "0.25rem" }} />
          <select value={draft.retake_policy} onChange={e => setDraft(d => ({ ...d, retake_policy: e.target.value }))} style={{ ...inp, width: "100%", fontSize: "0.68rem" }}>
            <option value="higher">Take Higher Score</option>
            <option value="average">Average Scores</option>
          </select>
        </div>
        <input value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Notes…" style={{ ...inp, width: "100%", boxSizing: "border-box", marginBottom: "0.4rem" }} />
        <div style={{ display: "flex", gap: "0.3rem" }}>
          <button onClick={() => setEditing(false)} style={{ ...inp, cursor: "pointer", flex: 1 }}>✕</button>
          <button onClick={commit} style={{ background: GOLD, border: "none", color: "#000", fontWeight: 700, borderRadius: 5, padding: "0.25rem 0.6rem", cursor: "pointer", flex: 2 }}>Save</button>
        </div>
      </div>
    </td>
  );

  return (
    <td onClick={open} style={{
      padding: "0.4rem 0.5rem", cursor: "pointer", textAlign: "center",
      background: cellColor(autoZeroed ? 0 : pct), minWidth: 54, transition: "background 0.15s",
    }}>
      {grade?.excused ? (
        <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>EXC</span>
      ) : grade?.missing ? (
        <span style={{ fontSize: "0.7rem", color: "#f97316" }}>MIS</span>
      ) : pts != null ? (
        <>
          <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{Math.round(pts)}</div>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)" }}>{Math.round(pct)}%</div>
          {grade?.late && latePct > 0 && <div style={{ fontSize: "0.6rem", color: "#f97316" }}>late −{latePct}%</div>}
          {grade?.retake_score != null && <div style={{ fontSize: "0.6rem", color: "#60a5fa" }}>↩ retake</div>}
          {hasRubric && <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)" }}>📋</div>}
        </>
      ) : autoZeroed ? (
        <>
          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#ef4444" }}>0</div>
          <div style={{ fontSize: "0.58rem", color: "rgba(239,68,68,0.7)" }}>past due</div>
        </>
      ) : (
        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.2)" }}>—</span>
      )}
    </td>
  );
}
