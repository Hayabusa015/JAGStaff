import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { GOLD } from "../constants.js";

export default function GradebookRubric({ assignment, student, existingGrade, onSave, onClose }) {
  const rubric = assignment?.rubric || [];
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState({});

  useEffect(() => {
    if (existingGrade?.rubric_scores) {
      setScores(existingGrade.rubric_scores);
    }
    if (existingGrade?.rubric_comments) {
      setComments(existingGrade.rubric_comments);
    }
  }, [existingGrade]);

  const total = rubric.reduce((sum, c) => sum + (Number(scores[c.id] ?? 0)), 0);
  const maxTotal = rubric.reduce((sum, c) => sum + (c.max_points || 0), 0);
  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  const tierColor = pct >= 90 ? "#22c55e" : pct >= 80 ? "#84cc16" : pct >= 70 ? "#eab308" : pct >= 60 ? "#f97316" : "#ef4444";

  const inp = {
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 6, padding: "0.35rem 0.6rem", color: "#fff", fontSize: "0.85rem", outline: "none",
    textAlign: "center", width: 72,
  };

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: "min(620px, 94vw)", maxHeight: "88vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Rubric Entry</div>
            <div style={{ fontWeight: 800, fontSize: "1rem", marginTop: 2 }}>{assignment?.name}</div>
            <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{student?.firstName} {student?.lastName}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.25rem", lineHeight: 1 }}>×</button>
        </div>

        {/* Criteria */}
        <div style={{ flex: 1, overflowY: "auto", marginBottom: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {rubric.map(c => {
              const val = scores[c.id] ?? "";
              const cPct = c.max_points > 0 ? (Number(val) / c.max_points) * 100 : 0;
              return (
                <div key={c.id} style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, padding: "0.85rem 1rem",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.2rem" }}>{c.criterion}</div>
                      {c.description && <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>{c.description}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
                      <input
                        type="number" min={0} max={c.max_points} value={val}
                        onChange={e => setScores(s => ({ ...s, [c.id]: e.target.value === "" ? "" : Math.min(c.max_points, Math.max(0, Number(e.target.value))) }))}
                        style={inp}
                        placeholder="—"
                      />
                      <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>/ {c.max_points}</span>
                    </div>
                  </div>
                  {val !== "" && (
                    <div style={{ marginTop: "0.5rem", height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, cPct)}%`, background: cPct >= 80 ? "#22c55e" : cPct >= 60 ? "#f59e0b" : "#ef4444", borderRadius: 2, transition: "width 0.2s" }} />
                    </div>
                  )}
                  <textarea
                    value={comments[c.id] ?? ""}
                    onChange={e => setComments(m => ({ ...m, [c.id]: e.target.value }))}
                    placeholder="Comment (optional)…"
                    style={{
                      marginTop: "0.6rem", width: "100%", boxSizing: "border-box", minHeight: 38, resize: "vertical",
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 6, padding: "0.35rem 0.6rem", color: "#fff", fontSize: "0.8rem", outline: "none",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Running total */}
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, padding: "0.85rem 1rem", marginBottom: "1rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.6)" }}>Total Score</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: tierColor }}>{total}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>/ {maxTotal}</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: tierColor }}>({pct}%)</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", borderRadius: 6, padding: "0.45rem 1rem", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onSave(scores, total, comments)} style={{ background: GOLD, border: "none", color: "#000", fontWeight: 800, borderRadius: 6, padding: "0.45rem 1.5rem", cursor: "pointer" }}>
            Save Rubric Score
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
