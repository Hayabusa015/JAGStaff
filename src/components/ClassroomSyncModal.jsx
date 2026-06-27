import { useState, useEffect } from "react";
import { useClassroomSync } from "../supabase.js";
import { GOLD } from "../constants.js";

// Strip emojis and extra whitespace from Classroom course names
function cleanName(name) {
  return name.replace(/\p{Extended_Pictographic}/gu, "").replace(/[^ -~]/g, "").replace(/\s+/g, " ").trim();
}

// Steps: idle → requesting → picking → loading-preview → previewing → syncing → done → error
export default function ClassroomSyncModal({ onClose, students, syncClassroomStudents }) {
  const { requestToken, listCourses, listStudents } = useClassroomSync();
  const [step, setStep] = useState("idle");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState({});
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { startSync(); }, []);

  async function startSync() {
    setStep("requesting");
    setError("");
    try {
      const t = await requestToken();
      setToken(t);
      const c = await listCourses(t);
      setCourses(c);
      setStep("picking");
    } catch (e) {
      setError(e.message);
      setStep("error");
    }
  }

  function toggleCourse(id) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleAll() {
    const allSelected = courses.every(c => selected[c.id]);
    const next = {};
    courses.forEach(c => { next[c.id] = !allSelected; });
    setSelected(next);
  }

  async function loadPreview() {
    setStep("loading-preview");
    const ids = courses.filter(c => selected[c.id]).map(c => c.id);
    try {
      const results = await Promise.all(ids.map(id => listStudents(token, id).then(rows => rows.map(r => ({ ...r, courseId: id })))));
      const flat = results.flat();
      const seen = new Set();
      const deduped = flat.filter(s => {
        const key = `${s.firstName}|${s.lastName}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const existingKeys = new Set(students.map(s => `${s.firstName}|${s.lastName}`));
      setPreview(deduped.map(s => ({ ...s, isNew: !existingKeys.has(`${s.firstName}|${s.lastName}`) })));
      setStep("previewing");
    } catch (e) {
      setError(e.message);
      setStep("error");
    }
  }

  async function doSync() {
    setStep("syncing");
    try {
      const r = await syncClassroomStudents(preview.filter(s => s.isNew));
      setResult(r);
      setStep("done");
    } catch (e) {
      setError(e.message);
      setStep("error");
    }
  }

  const selectedCount = courses.filter(c => selected[c.id]).length;
  const newCount = preview.filter(s => s.isNew).length;
  const skipCount = preview.length - newCount;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.1rem" }}>🎓</span>
            <span style={{ fontWeight: 700, fontSize: "1rem" }}>Sync from Google Classroom</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: "1rem", lineHeight: 1 }}>✕</button>
        </div>

        {/* Requesting token */}
        {step === "requesting" && (
          <div style={{ textAlign: "center", padding: "2.5rem 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>⏳</div>
            <div style={{ fontSize: "0.9rem" }}>Waiting for Google permission…</div>
            <div style={{ fontSize: "0.78rem", marginTop: "0.4rem", opacity: 0.6 }}>Check your browser if the popup was blocked.</div>
          </div>
        )}

        {/* Loading preview */}
        {(step === "loading-preview" || step === "syncing") && (
          <div style={{ textAlign: "center", padding: "2.5rem 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {step === "loading-preview" ? "Loading student lists…" : "Adding students…"}
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div>
            <div style={{ color: "var(--red)", marginBottom: "1rem", fontSize: "0.88rem", lineHeight: 1.5 }}>{error}</div>
            {error.includes("VITE_GOOGLE_CLIENT_ID") && (
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "0.75rem", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Add <code style={{ color: GOLD }}>VITE_GOOGLE_CLIENT_ID=…</code> to your <code>.env.local</code> and restart the dev server.
              </div>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          </div>
        )}

        {/* Course picker */}
        {step === "picking" && (
          <div>
            {courses.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>No active Google Classroom courses found.</p>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    {courses.length} course{courses.length !== 1 ? "s" : ""} found
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: "0.78rem", padding: "0.2rem 0.6rem" }}
                    onClick={toggleAll}
                  >
                    {courses.every(c => selected[c.id]) ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1.25rem", maxHeight: "280px", overflowY: "auto" }}>
                  {courses.map(c => {
                    const name = cleanName(c.name);
                    const isChecked = !!selected[c.id];
                    return (
                      <label
                        key={c.id}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.75rem",
                          padding: "0.55rem 0.8rem",
                          background: isChecked ? "rgba(245,192,37,0.08)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isChecked ? "rgba(245,192,37,0.35)" : "rgba(255,255,255,0.07)"}`,
                          borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCourse(c.id)}
                          style={{ accentColor: GOLD, width: 15, height: 15, flexShrink: 0 }}
                        />
                        <span style={{ fontSize: "0.88rem", fontWeight: isChecked ? 600 : 400, lineHeight: 1.3 }}>
                          {name}
                          {c.section && <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: "0.4rem", fontSize: "0.8rem" }}>{cleanName(c.section)}</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                  <button
                    className="btn btn-sm"
                    style={{ background: selectedCount > 0 ? GOLD : "rgba(245,192,37,0.3)", color: "#000", fontWeight: 700, opacity: selectedCount > 0 ? 1 : 0.5 }}
                    disabled={selectedCount === 0}
                    onClick={loadPreview}
                  >
                    Preview Students {selectedCount > 0 ? `(${selectedCount})` : ""}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Preview */}
        {step === "previewing" && (
          <div>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "0.9rem", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--green)", fontWeight: 600 }}>+{newCount} new</span>
              {skipCount > 0 && <span style={{ color: "var(--text-muted)" }}>{skipCount} already in roster</span>}
            </div>

            {preview.length > 0 ? (
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: "1.25rem" }}>
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid var(--border)" }}>
                        <th style={{ textAlign: "left", padding: "0.45rem 0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Last Name</th>
                        <th style={{ textAlign: "left", padding: "0.45rem 0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>First Name</th>
                        <th style={{ textAlign: "right", padding: "0.45rem 0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((s, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)", opacity: s.isNew ? 1 : 0.4 }}>
                          <td style={{ padding: "0.4rem 0.75rem" }}>{s.lastName}</td>
                          <td style={{ padding: "0.4rem 0.75rem" }}>{s.firstName}</td>
                          <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>
                            {s.isNew
                              ? <span style={{ color: "var(--green)", fontSize: "0.75rem", fontWeight: 600 }}>NEW</span>
                              : <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>exists</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>No students found in the selected courses.</p>
            )}

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep("picking")}>← Back</button>
              <button
                className="btn btn-sm"
                style={{ background: newCount > 0 ? GOLD : "rgba(245,192,37,0.3)", color: "#000", fontWeight: 700, opacity: newCount > 0 ? 1 : 0.5 }}
                disabled={newCount === 0}
                onClick={doSync}
              >
                Add {newCount} Student{newCount !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.6rem" }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.4rem" }}>Sync complete</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
              {result?.added} student{result?.added !== 1 ? "s" : ""} added · {result?.skipped} already in roster
            </div>
            <button className="btn btn-sm" style={{ background: GOLD, color: "#000", fontWeight: 700, marginTop: "1.25rem" }} onClick={onClose}>Done</button>
          </div>
        )}

      </div>
    </div>
  );
}
