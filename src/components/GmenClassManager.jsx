import { useState } from "react";

const GOLD = "#F5C025";
const DAYS = ["Tuesday", "Wednesday", "Thursday"];

export default function GmenClassManager({
  user, classes, enrollments, settings,
  addGmenClass, updateGmenClass, _deleteGmenClass, toggleOpen,
  students = [], enroll,
  requestChange, pendingChangeRequests = [],
}) {
  const period = settings?.active_period || 1;
  const myClass = classes.find(
    c => c.teacher_email === user.email && c.grading_period === period
  );
  const myStudents = enrollments.filter(e => e.class_id === myClass?.id);
  const allPeriodClasses = classes.filter(c => c.grading_period === period);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    class_name: "", description: "", room: user.room || "", request_day: "Wednesday", max_seats: 20,
  });
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Student add state
  const [addSearch, setAddSearch] = useState("");
  const [addError, setAddError] = useState(null);
  const [addWorking, setAddWorking] = useState(false);

  function startCreate() {
    setForm({ class_name: "", description: "", room: user.room || "", request_day: "Wednesday", max_seats: 20 });
    setEditing(true);
  }

  async function handleCreate() {
    if (!form.class_name.trim()) return;
    setSaving(true);
    const staffName = user.user_metadata?.full_name || user.email;
    await addGmenClass({
      teacher_email: user.email,
      teacher_name: staffName,
      room: form.room.trim(),
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
      room: editForm.room.trim(),
      request_day: editForm.request_day,
      max_seats: Number(editForm.max_seats) || 20,
    });
    setSaving(false);
    setEditForm(null);
  }

  const enrolledEmails = new Set(myStudents.map(s => s.student_email));
  const addResults = addSearch.trim().length > 1
    ? students
        .filter(s => s.studentEmail && !enrolledEmails.has(s.studentEmail) &&
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(addSearch.toLowerCase()))
        .slice(0, 6)
    : [];

  async function handleAddStudent(student) {
    if (!myClass || !enroll) return;
    setAddWorking(true);
    setAddError(null);
    const name = `${student.firstName} ${student.lastName}`;
    const { error } = await enroll(student.studentEmail, name, myClass.id, period);
    setAddWorking(false);
    setAddSearch("");
    if (error) {
      if (error.code === "23505") setAddError("Already enrolled elsewhere — use the change request system.");
      else setAddError("Could not add student. Please try again.");
    }
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

  const hintStyle = {
    fontSize: "0.75rem", color: "rgba(255,255,255,0.32)", marginTop: 4, lineHeight: 1.4,
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
        <MasterList
          classes={allPeriodClasses} enrollments={enrollments} myClassId={null}
          requestChange={requestChange} pendingChangeRequests={pendingChangeRequests} period={period}
        />
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
            <div>
              <label style={labelStyle}>Room Number</label>
              <input style={inputStyle} placeholder="e.g. 204"
                value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Your Remediation Day</label>
                <select style={{ ...inputStyle, background: "#1a1a1a" }}
                  value={form.request_day} onChange={e => setForm(f => ({ ...f, request_day: e.target.value }))}>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div style={hintStyle}>
                  On this day your class doesn't meet — students go to the Commons or are pulled for remediation.
                </div>
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
                <div>
                  <label style={labelStyle}>Room Number</label>
                  <input style={inputStyle} value={ef.room}
                    onChange={e => setEditForm(f => ({ ...f, room: e.target.value }))} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={labelStyle}>Remediation Day</label>
                    <select style={{ ...inputStyle, background: "#1a1a1a" }}
                      value={ef.request_day} onChange={e => setEditForm(f => ({ ...f, request_day: e.target.value }))}>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <div style={hintStyle}>
                      On this day your class doesn't meet — students go to the Commons or are pulled for remediation.
                    </div>
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
                  {myClass.room && <><span style={{ color: "rgba(255,255,255,0.6)" }}>Room {myClass.room}</span> · </>}
                  Remediation day: <span style={{ color: "rgba(255,255,255,0.7)" }}>{myClass.request_day}</span>
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
                room: myClass.room || "",
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
      {!isEditing && (
        <div>
          <div style={{
            fontSize: "0.75rem", color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem",
          }}>
            Enrolled Students ({myStudents.length})
          </div>
          {myStudents.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
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
          )}

          {/* Add student search */}
          {enroll && students.length > 0 && (
            <div style={{ position: "relative" }}>
              <input
                value={addSearch}
                onChange={e => { setAddSearch(e.target.value); setAddError(null); }}
                placeholder="Search to add a student…"
                disabled={addWorking}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 7, padding: "0.45rem 0.75rem", color: "#fff", fontSize: "0.85rem",
                  outline: "none", opacity: addWorking ? 0.5 : 1,
                }}
              />
              {addResults.length > 0 && (
                <div className="autocomplete-list">
                  {addResults.map(s => (
                    <div key={s.id} onClick={() => handleAddStudent(s)} className="autocomplete-item">
                      {s.firstName} {s.lastName}
                      {s.grade && <span className="tag tag-amber" style={{ marginLeft: 6 }}>{s.grade}</span>}
                    </div>
                  ))}
                </div>
              )}
              {addError && (
                <div style={{ fontSize: "0.78rem", color: "#ef4444", marginTop: 4 }}>{addError}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* School-wide master list */}
      <MasterList
        classes={allPeriodClasses} enrollments={enrollments} myClassId={myClass?.id}
        requestChange={requestChange} pendingChangeRequests={pendingChangeRequests} period={period}
      />
    </div>
  );
}

function MasterList({ classes, enrollments, myClassId, requestChange, pendingChangeRequests = [], period }) {
  const [expanded, setExpanded] = useState({});
  const [viewMode, setViewMode] = useState("class"); // "class" | "students"
  const [requesting, setRequesting] = useState(null); // student_email being requested

  if (classes.length === 0) return null;

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleRequest(student, fromClassId) {
    if (!requestChange || !myClassId) return;
    setRequesting(student.student_email);
    await requestChange(student.student_email, student.student_name, fromClassId, myClassId, period);
    setRequesting(null);
  }

  // Flat "All Students" view
  const allEnrolledSorted = [...enrollments].sort((a, b) => a.student_name.localeCompare(b.student_name));

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem",
      }}>
        <div style={{
          fontSize: "0.72rem", color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase", letterSpacing: "0.09em",
        }}>
          All Classes This Period ({classes.length})
        </div>
        <div style={{ display: "flex", gap: "0.3rem" }}>
          {[{ key: "class", label: "By Class" }, { key: "students", label: "All Students" }].map(v => (
            <button key={v.key} onClick={() => setViewMode(v.key)} style={{
              background: viewMode === v.key ? "rgba(245,192,37,0.15)" : "transparent",
              border: viewMode === v.key ? `1px solid ${GOLD}50` : "1px solid rgba(255,255,255,0.1)",
              color: viewMode === v.key ? GOLD : "rgba(255,255,255,0.4)",
              borderRadius: 5, padding: "0.2rem 0.65rem", cursor: "pointer",
              fontSize: "0.72rem", fontWeight: 600,
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* ── All Students flat view ── */}
      {viewMode === "students" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {allEnrolledSorted.length === 0 ? (
            <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.3)" }}>No students enrolled yet.</div>
          ) : allEnrolledSorted.map(s => {
            const cls = classes.find(c => c.id === s.class_id);
            return (
              <div key={s.id || s.student_email} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 7, padding: "0.45rem 0.85rem", fontSize: "0.85rem",
              }}>
                <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{s.student_name}</span>
                <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>
                  {cls ? `${cls.class_name} · ${cls.teacher_name}` : "Unknown class"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── By Class expandable view ── */}
      {viewMode === "class" && (
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
                          fontSize: "0.65rem", fontWeight: 700, color: GOLD,
                          background: "rgba(245,192,37,0.12)", border: "1px solid rgba(245,192,37,0.3)",
                          borderRadius: 4, padding: "0.1rem 0.4rem", letterSpacing: "0.06em",
                        }}>YOUR CLASS</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                      {cls.teacher_name}{cls.room ? ` · Room ${cls.room}` : ""} · Remediation: {cls.request_day}
                    </div>
                  </div>
                  <div style={{ width: 80, flexShrink: 0 }}>
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", textAlign: "right", marginBottom: 3 }}>
                      {seats}/{cls.max_seats}
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                      <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: full ? "#ef4444" : GOLD }} />
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
                        {students.map(s => {
                          const isPending = pendingChangeRequests.some(
                            r => r.student_email === s.student_email && r.to_class_id === myClassId && r.status === "pending"
                          );
                          const isRequesting = requesting === s.student_email;
                          return (
                            <div key={s.id || s.student_email} style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              fontSize: "0.85rem", padding: "0.3rem 0",
                              borderBottom: "1px solid rgba(255,255,255,0.04)",
                            }}>
                              <span style={{ color: "rgba(255,255,255,0.8)" }}>{s.student_name}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
                                  {s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString() : ""}
                                </span>
                                {/* Request button — only for other classes, only if teacher has a class */}
                                {!isMine && myClassId && requestChange && (
                                  isPending ? (
                                    <span style={{
                                      fontSize: "0.7rem", color: "rgba(255,192,37,0.7)",
                                      background: "rgba(245,192,37,0.08)", border: "1px solid rgba(245,192,37,0.2)",
                                      borderRadius: 4, padding: "0.15rem 0.5rem",
                                    }}>Requested ⏳</span>
                                  ) : (
                                    <button
                                      onClick={() => handleRequest(s, cls.id)}
                                      disabled={isRequesting}
                                      title="Request this student for your class"
                                      style={{
                                        background: "rgba(245,192,37,0.08)", border: `1px solid ${GOLD}40`,
                                        color: GOLD, borderRadius: 4, padding: "0.15rem 0.5rem",
                                        cursor: "pointer", fontSize: "0.7rem", fontWeight: 600,
                                        opacity: isRequesting ? 0.5 : 1,
                                      }}
                                    >{isRequesting ? "…" : "Request"}</button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
