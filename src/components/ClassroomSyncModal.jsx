import { useState, useEffect } from "react";
import { useClassroomSync } from "../supabase.js";
import { GOLD } from "../constants.js";

// Steps: idle → requesting → picking → previewing → syncing → done
export default function ClassroomSyncModal({ onClose, students, syncClassroomStudents }) {
  const { requestToken, listCourses, listStudents } = useClassroomSync();
  const [step, setStep] = useState("idle");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState({});
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (step === "idle") startSync();
  }, []);

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
      // Deduplicate by name
      const seen = new Set();
      const deduped = flat.filter(s => {
        const key = `${s.firstName}|${s.lastName}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const existingKeys = new Set(students.map(s => `${s.firstName}|${s.lastName}`));
      const annotated = deduped.map(s => ({ ...s, isNew: !existingKeys.has(`${s.firstName}|${s.lastName}`) }));
      setPreview(annotated);
      setStep("previewing");
    } catch (e) {
      setError(e.message);
      setStep("error");
    }
  }

  async function doSync() {
    setStep("syncing");
    const toAdd = preview.filter(s => s.isNew);
    try {
      const r = await syncClassroomStudents(toAdd);
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
        <div className="flex items-center justify-between mb2">
          <h3 style={{ fontWeight: 700, fontSize: "1rem" }}>Sync from Google Classroom</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {step === "requesting" && (
          <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>⏳</div>
            Waiting for Google permission…
            <div style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>A popup should appear — check your browser if it was blocked.</div>
          </div>
        )}

        {step === "loading-preview" && (
          <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)" }}>
            Loading student lists…
          </div>
        )}

        {step === "syncing" && (
          <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)" }}>
            Adding students…
          </div>
        )}

        {step === "error" && (
          <div>
            <div style={{ color: "var(--red)", marginBottom: "1rem", fontSize: "0.88rem" }}>
              {error}
            </div>
            {error.includes("VITE_GOOGLE_CLIENT_ID") && (
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "0.75rem", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Add <code style={{ color: GOLD }}>VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com</code> to your <code>.env.local</code> file, then restart the dev server.
              </div>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          </div>
        )}

        {step === "picking" && (
          <div>
            {courses.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                No active Google Classroom courses found for your account.
              </p>
            ) : (
              <>
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "0.75rem" }}>
                  Select courses to import students from. Students already in the roster won't be duplicated.
                </p>
                <div style={{ marginBottom: "0.5rem" }}>
                  <button className="btn btn-ghost btn-sm" onClick={toggleAll}>
                    {courses.every(c => selected[c.id]) ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem", maxHeight: "300px", overflowY: "auto" }}>
                  {courses.map(c => (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.75rem", background: "var(--bg-card)", borderRadius: 8, cursor: "pointer", border: selected[c.id] ? `1px solid ${GOLD}` : "1px solid transparent" }}>
                      <input type="checkbox" checked={!!selected[c.id]} onChange={() => toggleCourse(c.id)} style={{ accentColor: GOLD }} />
                      <span style={{ fontSize: "0.88rem" }}>{c.name}{c.section ? <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem" }}>· {c.section}</span> : null}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap1" style={{ justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                  <button
                    className="btn btn-sm"
                    style={{ background: GOLD, color: "#000", fontWeight: 700 }}
                    disabled={selectedCount === 0}
                    onClick={loadPreview}
                  >
                    Preview Students ({selectedCount} course{selectedCount !== 1 ? "s" : ""})
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === "previewing" && (
          <div>
            <div style={{ marginBottom: "0.75rem", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--green)", fontWeight: 600 }}>{newCount} new</span>
              <span style={{ color: "var(--text-muted)", margin: "0 0.4rem" }}>·</span>
              <span style={{ color: "var(--text-muted)" }}>{skipCount} already in roster</span>
            </div>
            {preview.length > 0 ? (
              <div style={{ maxHeight: "320px", overflowY: "auto", marginBottom: "1rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ textAlign: "left", padding: "0.35rem 0.5rem" }}>Last</th>
                      <th style={{ textAlign: "left", padding: "0.35rem 0.5rem" }}>First</th>
                      <th style={{ textAlign: "left", padding: "0.35rem 0.5rem" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((s, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)", opacity: s.isNew ? 1 : 0.45 }}>
                        <td style={{ padding: "0.35rem 0.5rem" }}>{s.lastName}</td>
                        <td style={{ padding: "0.35rem 0.5rem" }}>{s.firstName}</td>
                        <td style={{ padding: "0.35rem 0.5rem" }}>
                          {s.isNew
                            ? <span style={{ color: "var(--green)", fontSize: "0.78rem" }}>+ Add</span>
                            : <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>In roster</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>No students found in the selected courses.</p>
            )}
            <div className="flex items-center gap1" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep("picking")}>Back</button>
              <button
                className="btn btn-sm"
                style={{ background: GOLD, color: "#000", fontWeight: 700 }}
                disabled={newCount === 0}
                onClick={doSync}
              >
                Add {newCount} Student{newCount !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>✅</div>
            <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Sync complete</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
              {result?.added} student{result?.added !== 1 ? "s" : ""} added · {result?.skipped} already in roster
            </div>
            <button className="btn btn-sm mt2" style={{ background: GOLD, color: "#000", fontWeight: 700 }} onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
