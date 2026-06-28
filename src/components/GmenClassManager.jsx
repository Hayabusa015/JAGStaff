import { useState } from "react";

const GOLD = "#F5C025";
const DAYS = ["Tuesday", "Wednesday", "Thursday"];

export default function GmenClassManager({
  user, classes, enrollments, settings,
  addGmenClass, updateGmenClass, _deleteGmenClass, toggleOpen,
}) {
  const period = settings?.active_period || 1;
  const myClass = classes.find(
    c => c.teacher_email === user.email && c.grading_period === period
  );
  const myStudents = enrollments.filter(e => e.class_id === myClass?.id);
  const allPeriodClasses = classes.filter(c => c.grading_period === period);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    class_name: "", description: "", request_day: "Wednesday", max_seats: 20,
  });
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState(null);

  function startCreate() {
    setForm({ class_name: "", description: "", request_day: "Wednesday", max_seats: 20 });
    setEditing(true);
  }

  async function handleCreate() {
    if (!form.class_name.trim()) return;
    setSaving(true);
    const staffName = user.user_metadata?.full_name || user.email;
    await addGmenClass({
      teacher_email: user.email,
      teacher_name: staffName,
      room: user.room || "",
      class_name: form.class_name.trim(),
      description: form.description.trim(),
      grading_period: period,
      request_day: form.request_day,
      max_seats: Number(form.max_seats) || 20,
      is_open: false,
    });
    setSaving(false);
    setEditing(false);
  }

  async function handleSaveEdit() {
    if (!editForm || !myClass) return;
    setSaving(true);
    await updateGmenClass(myClass.id, {
      class_name: editForm.class_name.trim(),
      description: editForm.description.trim(),
      request_day: editForm.request_day,
      max_seats: Number(editForm.max_seats) || 20,
    });
    setSaving(false);
    setEditForm(null);
  }

  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 7, padding: "0.5rem 0.75rem", color: "#fff", fontSize: "0.9rem",
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle = {
    fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", textTransform: "uppercase",
    letterSpacing: "0.07em", marginBottom: 4, display: "block",
  };

  // ── No class yet ──────────────────────────────────────────────────────────
  if (!myClass && !editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "2rem 0" }}>
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: "2rem", textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No class for Period {period}</div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
            Create your G-Men class offering for this grading period.
          </div>
          <button onClick={startCreate} style={{
            background: GOLD, border: "none", color: "#000",
            fontWeight: 700, borderRadius: 8, padding: "0.6rem 1.5rem",
            cursor: "pointer", fontSize: "0.9rem",
          }}>+ Create Class</button>
        </div>
        <MasterList classes={allPeriodClasses} enrollments={enrollments} myClassId={null} />
      </div>
    );
  }

  // ── Create form ───────────────────────────────────────────────────────────
  if (!myClass && editing) {
    return (
      <div style={{ padding: "1.5rem 0" }}>
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: "1.5rem",
        }}>
          <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "1.25rem", color: GOLD }}>
            Create Class — Period {period}
          </div>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Class Name</label>
              <input style={inputStyle} placeholder="e.g. Study Hall, Art, Fitness"
                value={form.class_name} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Description (optional)</label>
              <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
                placeholder="What will students do in your room?"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Your Request Day</label>
                <select style={{ ...inputStyle, background: "#1a1a1a" }}
                  value={form.request_day} onChange={e => setForm(f => ({ ...f, request_day: e.target.value }))}>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Max Seats</label>
                <input type="number" style={inputStyle} min={1} max={40}
                  value={form.max_seats} onChange={e => setForm(f => ({ ...f, max_seats: e.target.value }))} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            <button onClick={handleCreate} disabled={saving || !form.class_name.trim()} style={{
              background: GOLD, border: "none", color: "#000", fontWeight: 700,
              borderRadius: 8, padding: "0.55rem 1.25rem", cursor: "pointer",
              opacity: (!form.class_name.trim() || saving) ? 0.5 : 1,
            }}>{saving ? "Saving…" : "Create Class"}</button>
            <button onClick={() => setEditing(false)} style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.5)", borderRadius: 8, padding: "0.55rem 1rem",
              cursor: "pointer",
            }}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Existing class card ───────────────────────────────────────────────────
  const isEditing = !!editForm;
  const ef = editForm || {};

  return (
    <div style={{ padding: "1rem 0", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Class card */}
      <div style={{
        background: myClass.is_open ? "rgba(245,192,37,0.05)" : "rgba(255,255,255,0.03)",
        border: myClass.is_open ? `1px solid ${GOLD}30` : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, padding: "1.25rem",
      }}>
        <div style={{ fontSize: "0.7rem", color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.75rem" }}>
          Your Class — Period {period}
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ flexGrow: 1 }}>
            {isEditing ? (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div>
                  <label style={labelStyle}>Class Name</label>
                  <input style={inputStyle} value={ef.class_name}
                    onChange={e => setEditForm(f => ({ ...f, class_name: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
                    value={ef.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={labelStyle}>Request Day</label>
                    <select style={{ ...inputStyle, background: "#1a1a1a" }}
                      value={ef.request_day} onChange={e => setEditForm(f => ({ ...f, request_day: e.target.value }))}>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Max Seats</label>
                    <input type="number" style={inputStyle} min={1} max={40}
                      value={ef.max_seats} onChange={e => setEditForm(f => ({ ...f, max_seats: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", marginTop: 4 }}>
                  <button onClick={handleSaveEdit} disabled={saving} style={{
                    background: GOLD, border: "none", color: "#000", fontWeight: 700,
                    borderRadius: 7, padding: "0.45rem 1rem", cursor: "pointer",
                  }}>{saving ? "Saving…" : "Save"}</button>
                  <button onClick={() => setEditForm(null)} style={{
                    background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.5)", borderRadius: 7, padding: "0.45rem 0.85rem", cursor: "pointer",
                  }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 2 }}>{myClass.class_name}</div>
                {myClass.description && (
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem", marginBottom: 6 }}>{myClass.description}</div>
                )}
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
                  Request day: <span style={{ color: "rgba(255,255,255,0.7)" }}>{myClass.request_day}</span>
                  {" · "}Seats: <span style={{ color: "rgba(255,255,255,0.7)" }}>{myStudents.length} / {myClass.max_seats}</span>
                </div>
              </>
            )}
          </div>
          {!isEditing && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 120 }}>
              <button onClick={() => toggleOpen(myClass.id, !myClass.is_open)} style={{
                background: myClass.is_open ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
                border: myClass.is_open ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.12)",
                color: myClass.is_open ? "#22c55e" : "rgba(255,255,255,0.5)",
                borderRadius: 7, padding: "0.4rem 0.75rem", fontSize: "0.82rem",
                cursor: "pointer", fontWeight: 600, textAlign: "center",
              }}>
                {myClass.is_open ? "Open ✓" : "Closed"}
              </button>
              <button onClick={() => setEditForm({
                class_name: myClass.class_name,
                description: myClass.description || "",
                request_day: myClass.request_day,
                max_seats: myClass.max_seats,
              })} style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.5)", borderRadius: 7, padding: "0.4rem 0.75rem",
                fontSize: "0.82rem", cursor: "pointer", textAlign: "center",
              }}>Edit</button>
            </div>
          )}
        </div>
      </div>

      {/* Enrolled students */}
      {myStudents.length > 0 && (
        <div>
          <div style={{
            fontSize: "0.75rem", color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem",
          }}>
            Enrolled Students ({myStudents.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {myStudents.map(s => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 8, padding: "0.5rem 0.85rem", fontSize: "0.88rem",
              }}>
                <span>{s.student_name}</span>
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
                  {new Date(s.enrolled_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* School-wide master list — all classes including teacher's own */}
      <MasterList classes={allPeriodClasses} enrollments={enrollments} myClassId={myClass?.id} />
    </div>
  );
}

function MasterList({ classes, enrollments, myClassId }) {
  const [expanded, setExpanded] = useState({});
  if (classes.length === 0) return null;

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <div style={{
        fontSize: "0.72rem", color: "rgba(255,255,255,0.35)",
        textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.75rem",
      }}>
        All Classes This Period ({classes.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {classes.map(cls => {
          const students = enrollments.filter(e => e.class_id === cls.id);
          const seats = students.length;
          const pct = Math.min(100, Math.round((seats / cls.max_seats) * 100));
          const full = seats >= cls.max_seats;
          const isOpen = expanded[cls.id];
          const isMine = cls.id === myClassId;
          return (
            <div key={cls.id} style={{
              background: isMine ? "rgba(245,192,37,0.04)" : "rgba(255,255,255,0.025)",
              border: isMine ? `1px solid rgba(245,192,37,0.2)` : "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10, overflow: "hidden",
            }}>
              {/* Class header row */}
              <button
                onClick={() => toggle(cls.id)}
                style={{
                  width: "100%", background: "none", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "0.85rem",
                  padding: "0.7rem 1rem", textAlign: "left",
                }}
              >
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "#fff" }}>{cls.class_name}</span>
                    {isMine && (
                      <span style={{
                        fontSize: "0.65rem", fontWeight: 700, color: "#F5C025",
                        background: "rgba(245,192,37,0.12)", border: "1px solid rgba(245,192,37,0.3)",
                        borderRadius: 4, padding: "0.1rem 0.4rem", letterSpacing: "0.06em",
                      }}>YOUR CLASS</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                    {cls.teacher_name}{cls.room ? ` · Room ${cls.room}` : ""} · Request day: {cls.request_day}
                  </div>
                </div>
                <div style={{ width: 80, flexShrink: 0 }}>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", textAlign: "right", marginBottom: 3 }}>
                    {seats}/{cls.max_seats}
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                    <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: full ? "#ef4444" : "#F5C025" }} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 700,
                    color: cls.is_open ? "#22c55e" : "rgba(255,255,255,0.25)",
                  }}>{cls.is_open ? "Open" : "Closed"}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {/* Expanded student roster */}
              {isOpen && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "0.5rem 1rem 0.75rem" }}>
                  {students.length === 0 ? (
                    <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.28)", padding: "0.4rem 0" }}>
                      No students enrolled yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      {students.map(s => (
                        <div key={s.id || s.student_email} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          fontSize: "0.85rem", padding: "0.3rem 0",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}>
                          <span style={{ color: "rgba(255,255,255,0.8)" }}>{s.student_name}</span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
                            {s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString() : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
