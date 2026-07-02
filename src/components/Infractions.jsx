import { useState, useMemo } from "react";
import { GOLD } from "../constants.js";
import { useInfractions } from "../supabase.js";
import { openGmailCompose } from "../email.js";

const INFRACTION_TYPES = [
  { group: "Phone",   label: "Phone: Visible" },
  { group: "Phone",   label: "Phone: In Use" },
  { group: "Phone",   label: "Phone: Refused to Surrender" },
  { group: "General", label: "Talking / Disruption" },
  { group: "General", label: "Dress Code" },
  { group: "General", label: "Tardy" },
  { group: "General", label: "Other" },
];

const ESCALATION_THRESHOLD = 3; // infractions in rolling 7 days

function typeColor(type) {
  if (type.startsWith("Phone")) return "tag-red";
  if (type === "Tardy") return "tag-blue";
  if (type === "Dress Code") return "tag-amber";
  return "tag-gold";
}

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function rollingCount(list, studentId, days = 7) {
  const cutoff = Date.now() - days * 86400000;
  return list.filter(r => r.student_id === studentId && new Date(r.created_at).getTime() >= cutoff).length;
}

function buildSummary(studentName, studentGrade, records) {
  if (!records.length) return "";
  const oldest = records[records.length - 1];
  const since = new Date(oldest.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const latest = records[0];
  const latestDate = new Date(latest.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const counts = {};
  records.forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });
  const breakdown = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t} (${n})`)
    .join(", ");

  const notifiedCount = records.filter(r => r.parent_notified).length;
  const notifiedNote = notifiedCount > 0 ? ` Parent notified ${notifiedCount} time${notifiedCount !== 1 ? "s" : ""}.` : "";

  return `${studentName}${studentGrade ? ` (Gr ${studentGrade})` : ""} — ${records.length} infraction${records.length !== 1 ? "s" : ""} since ${since}: ${breakdown}. Most recent: ${latestDate}.${notifiedNote}`;
}

export default function Infractions({ students, user }) {
  const { infractions, addInfraction } = useInfractions();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ studentSearch: "", studentId: "", studentName: "", studentGrade: "", studentParentEmail: "", type: INFRACTION_TYPES[0].label, notes: "", notifyParent: false });
  const [searchResults, setSearchResults] = useState([]);
  const [filterStudent, setFilterStudent] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterGrade, setFilterGrade] = useState("All");
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [copied, setCopied] = useState(null);

  // ── Escalation watch: students with 3+ infractions in last 7 days ──
  const escalated = useMemo(() => {
    const map = {};
    infractions.forEach(r => {
      const cutoff = Date.now() - 7 * 86400000;
      if (new Date(r.created_at).getTime() < cutoff) return;
      if (!map[r.student_id]) map[r.student_id] = { name: r.student_name, count: 0 };
      map[r.student_id].count++;
    });
    return Object.entries(map)
      .filter(([, v]) => v.count >= ESCALATION_THRESHOLD)
      .sort((a, b) => b[1].count - a[1].count);
  }, [infractions]);

  // ── Today's count ──
  const todayCount = useMemo(() => {
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    return infractions.filter(r => new Date(r.created_at) >= midnight).length;
  }, [infractions]);

  // ── Filtered log ──
  const filtered = useMemo(() => infractions.filter(r => {
    const matchStu = !filterStudent.trim() || r.student_name.toLowerCase().includes(filterStudent.toLowerCase());
    const matchType = filterType === "All" || r.type === filterType;
    const matchGrade = filterGrade === "All" || (() => {
      const s = students.find(x => x.id === r.student_id);
      return s?.grade === filterGrade;
    })();
    return matchStu && matchType && matchGrade;
  }), [infractions, filterStudent, filterType, filterGrade, students]);

  // ── Per-student summary ──
  const studentSummaries = useMemo(() => {
    const map = {};
    infractions.forEach(r => {
      if (!map[r.student_id]) {
        const s = students.find(x => x.id === r.student_id);
        map[r.student_id] = { id: r.student_id, name: r.student_name, grade: s?.grade || "", records: [] };
      }
      map[r.student_id].records.push(r);
    });
    return Object.values(map).sort((a, b) => b.records.length - a.records.length);
  }, [infractions, students]);

  const grades = ["All", ...Array.from(new Set(students.map(s => s.grade))).sort()];

  // ── Form handlers ──
  function handleStudentSearch(q) {
    setForm(f => ({ ...f, studentSearch: q, studentId: "", studentName: "", studentGrade: "" }));
    setSearchResults(q.trim() ? students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : []);
  }

  function selectStudent(s) {
    setForm(f => ({ ...f, studentSearch: `${s.firstName} ${s.lastName}`, studentId: s.id, studentName: `${s.firstName} ${s.lastName}`, studentGrade: s.grade, studentParentEmail: s.parentEmail || "" }));
    setSearchResults([]);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.studentName.trim()) return;
    const parentNotified = form.notifyParent && !!form.studentParentEmail;
    await addInfraction({
      studentId: form.studentId || "manual-" + Date.now(),
      studentName: form.studentName.trim(),
      type: form.type,
      notes: form.notes.trim(),
      teacherName: user?.name || "Staff",
      room: "",
      parentNotified,
    });
    if (parentNotified) {
      const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const subject = `Behavior Notice — ${form.studentName.trim()} — ${date}`;
      const body = [
        `Dear Parent/Guardian,`,
        ``,
        `This is an automated notice from James A. Garfield High School.`,
        ``,
        `${form.studentName.trim()} received a behavioral note today for: ${form.type}.`,
        form.notes.trim() ? `\nDetails: ${form.notes.trim()}\n` : "",
        `This message is to keep you informed of classroom behavior. If you have any questions, please reply to this email or contact ${user?.name || "your teacher"} directly at ${user?.email || "the school"}.`,
        ``,
        `Thank you, and have a wonderful day!`,
        ``,
        `James A. Garfield High School Staff Portal`,
      ].join("\n");
      // Opens Gmail compose pre-filled. Parent email is prefilled from the
      // roster but stays editable in Gmail before the teacher sends.
      openGmailCompose({ to: form.studentParentEmail, subject, body });
    }
    setForm({ studentSearch: "", studentId: "", studentName: "", studentGrade: "", studentParentEmail: "", type: INFRACTION_TYPES[0].label, notes: "", notifyParent: false });
    setShowForm(false);
  }

  function copyPBIS(summary) {
    const sid = summary.id;
    const text = buildSummary(summary.name, summary.grade, summary.records);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(sid);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb2">
        <div>
          <h2 className="page-title">Infraction Log</h2>
          <p className="text-muted" style={{ fontSize: "0.8rem" }}>
            Quick-log warnings before escalating to a formal PBIS referral.
          </p>
        </div>
        <div className="flex items-center gap1">
          {todayCount > 0 && <span className="tag tag-red">{todayCount} today</span>}
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? "✕ Cancel" : "+ Log Infraction"}
          </button>
        </div>
      </div>

      {/* Quick-log form */}
      {showForm && (
        <div className="card mb2" style={{ borderLeft: `4px solid ${GOLD}` }}>
          <div className="section-title">New Infraction</div>
          <form onSubmit={submit}>
            <div className="grid2 mb1" style={{ overflow: "visible" }}>
              {/* Student search */}
              <div style={{ position: "relative", zIndex: 20 }}>
                <label>Student *</label>
                <input
                  value={form.studentSearch}
                  onChange={e => handleStudentSearch(e.target.value)}
                  placeholder="Search by name…"
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <ul className="autocomplete-list" style={{ zIndex: 100 }}>
                    {searchResults.map(s => (
                      <li
                        key={s.id}
                        onClick={() => selectStudent(s)}
                        className="autocomplete-item"
                      >
                        {s.firstName} {s.lastName} <span className="tag tag-amber">{s.grade}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {/* Allow free-text entry if student not in roster */}
                {form.studentSearch && !form.studentId && searchResults.length === 0 && (
                  <div className="text-muted mt1" style={{ fontSize: "0.75rem" }}>
                    Not in roster — will log by name only.{" "}
                    <button type="button" style={{ background: "none", border: "none", color: GOLD, fontWeight: 600, cursor: "pointer", fontSize: "0.75rem" }}
                      onClick={() => setForm(f => ({ ...f, studentName: f.studentSearch, studentId: "manual-" + Date.now() }))}>
                      Use "{form.studentSearch}"
                    </button>
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <label>Infraction Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <optgroup label="📱 Phone">
                    {INFRACTION_TYPES.filter(t => t.group === "Phone").map(t => <option key={t.label}>{t.label}</option>)}
                  </optgroup>
                  <optgroup label="General">
                    {INFRACTION_TYPES.filter(t => t.group === "General").map(t => <option key={t.label}>{t.label}</option>)}
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="mb1">
              <label>Notes (optional)</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. 2nd warning this period, refused twice…" />
            </div>

            {/* Parent notification checkbox */}
            <div className="mb1" style={{ padding: "0.6rem 0.75rem", background: "rgba(245,192,37,0.07)", borderRadius: "8px", border: "1px solid rgba(245,192,37,0.2)" }}>
              {form.studentParentEmail ? (
                <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontWeight: 600 }}>
                  <input type="checkbox" checked={form.notifyParent}
                    onChange={e => setForm(f => ({ ...f, notifyParent: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: GOLD, cursor: "pointer" }} />
                  <span>📧 Notify parent via email</span>
                  <span style={{ fontWeight: 400, fontSize: "0.78rem", color: "rgba(240,234,216,0.5)" }}>{form.studentParentEmail}</span>
                </label>
              ) : (
                <span style={{ fontSize: "0.8rem", color: "rgba(240,234,216,0.4)" }}>
                  📧 No parent email on file —{" "}
                  <span style={{ color: GOLD }}>add one in Student Roster to enable email notifications</span>
                </span>
              )}
            </div>

            <div className="flex gap1">
              <button type="submit" className="btn btn-primary" disabled={!form.studentName && !form.studentSearch}>
                {form.notifyParent && form.studentParentEmail ? "Log & Email Parent" : "Log Infraction"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Escalation alerts */}
      {escalated.length > 0 && (
        <div className="card mb2" style={{ borderLeft: "4px solid #dc2626" }}>
          <div className="flex items-center gap1 mb1">
            <span className="pulse-dot" />
            <span style={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.08em", color: "#dc2626", textTransform: "uppercase" }}>
              Escalation Watch — Consider PBIS Referral
            </span>
          </div>
          {escalated.map(([sid, { name, count }]) => (
            <div key={sid} className="flex items-center justify-between" style={{ padding: "0.3rem 0", borderBottom: "1px solid rgba(200,200,200,0.15)" }}>
              <span style={{ fontWeight: 600 }}>⚠ {name}</span>
              <span className="tag tag-red">{count} this week</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters + log table */}
      <div className="card mb2">
        <div className="flex items-center gap1 mb1" style={{ flexWrap: "wrap" }}>
          <input style={{ flex: 1, minWidth: 180 }} value={filterStudent} onChange={e => setFilterStudent(e.target.value)} placeholder="Filter by student…" />
          <select style={{ width: 190 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="All">All types</option>
            <optgroup label="Phone">
              {INFRACTION_TYPES.filter(t => t.group === "Phone").map(t => <option key={t.label}>{t.label}</option>)}
            </optgroup>
            <optgroup label="General">
              {INFRACTION_TYPES.filter(t => t.group === "General").map(t => <option key={t.label}>{t.label}</option>)}
            </optgroup>
          </select>
          <select style={{ width: 110 }} value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
            {grades.map(g => <option key={g}>{g}</option>)}
          </select>
          <span className="tag tag-gold">{filtered.length} shown</span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted" style={{ textAlign: "center", padding: "1.5rem" }}>
            {infractions.length === 0 ? "No infractions logged yet. Use the Log Infraction button to start." : "No records match your filters."}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="stu-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Grade</th>
                  <th>Type</th>
                  <th className="infraction-col-teacher">Notes</th>
                  <th className="infraction-col-teacher">Logged by</th>
                  <th title="Parent notified">📧</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const s = students.find(x => x.id === r.student_id);
                  const weekCount = rollingCount(infractions, r.student_id);
                  return (
                    <tr key={r.id}>
                      <td className="text-muted" style={{ whiteSpace: "nowrap", fontSize: "0.78rem" }}>{fmtTime(r.created_at)}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{r.student_name}</span>
                        {weekCount >= ESCALATION_THRESHOLD && (
                          <span className="tag tag-red" style={{ marginLeft: "0.4rem", fontSize: "0.65rem" }}>⚠ {weekCount}×/wk</span>
                        )}
                      </td>
                      <td>{s ? <span className="tag tag-amber">{s.grade}</span> : <span className="text-muted">—</span>}</td>
                      <td><span className={`tag ${typeColor(r.type)}`}>{r.type}</span></td>
                      <td className="infraction-col-teacher text-muted" style={{ fontSize: "0.8rem", maxWidth: 220 }}>{r.notes || "—"}</td>
                      <td className="infraction-col-teacher text-muted" style={{ fontSize: "0.78rem" }}>{r.teacher_name}</td>
                      <td style={{ textAlign: "center", fontSize: "1rem" }} title={r.parent_notified ? "Parent was notified" : "Parent not notified"}>
                        {r.parent_notified ? "📧" : <span style={{ color: "rgba(240,234,216,0.2)" }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-student summaries */}
      {studentSummaries.length > 0 && (
        <div className="card">
          <div className="section-title">Per-Student Summary</div>
          {studentSummaries.map(summary => {
            const thisWeek = rollingCount(infractions, summary.id, 7);
            const thisMonth = rollingCount(infractions, summary.id, 30);
            const typeCounts = {};
            summary.records.forEach(r => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; });
            const isExpanded = expandedStudent === summary.id;

            return (
              <div key={summary.id} style={{ borderBottom: "1px solid rgba(200,200,200,0.2)", paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap1">
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: thisWeek >= ESCALATION_THRESHOLD ? "rgba(220,38,38,0.15)" : "rgba(245,192,37,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.75rem", color: thisWeek >= ESCALATION_THRESHOLD ? "#dc2626" : "#92700a" }}>
                      {summary.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700 }}>{summary.name}</span>
                      {summary.grade && <span className="tag tag-amber" style={{ marginLeft: "0.4rem" }}>{summary.grade}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap1">
                    {/* Mini stats */}
                    <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "rgba(240,234,216,0.5)" }}>
                      <span><strong style={{ color: thisWeek >= ESCALATION_THRESHOLD ? "#f87171" : "#f0ead8" }}>{thisWeek}</strong> this week</span>
                      <span><strong style={{ color: "#f0ead8" }}>{thisMonth}</strong> this month</span>
                      <span><strong style={{ color: "#f0ead8" }}>{summary.records.length}</strong> total</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const s = students.find(x => x.id === summary.id);
                        setForm({ studentSearch: summary.name, studentId: summary.id, studentName: summary.name, studentGrade: s?.grade || summary.grade, type: INFRACTION_TYPES[0].label, notes: "" });
                        setSearchResults([]);
                        setShowForm(true);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      + Add
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: copied === summary.id ? "#16a34a" : undefined }}
                      onClick={() => copyPBIS(summary)}
                      title="Copy summary for PBIS referral"
                    >
                      {copied === summary.id ? "✓ Copied!" : "📋 Copy for PBIS"}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setExpandedStudent(isExpanded ? null : summary.id)}>
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {/* Type breakdown chips + parent notification badge */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.4rem", paddingLeft: "2.75rem" }}>
                  {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, n]) => (
                    <span key={type} className={`tag ${typeColor(type)}`}>{type} × {n}</span>
                  ))}
                  {(() => {
                    const notifiedCount = summary.records.filter(r => r.parent_notified).length;
                    return notifiedCount > 0 ? (
                      <span className="tag tag-gold" title="Parent email notifications sent">📧 Parent notified × {notifiedCount}</span>
                    ) : null;
                  })()}
                </div>

                {/* Expanded: recent record list */}
                {isExpanded && (
                  <div style={{ marginTop: "0.5rem", paddingLeft: "2.75rem" }}>
                    {summary.records.slice(0, 10).map(r => (
                      <div key={r.id} style={{ fontSize: "0.78rem", color: "rgba(240,234,216,0.6)", marginBottom: "0.2rem" }}>
                        {fmtTime(r.created_at)} · <span className={`tag ${typeColor(r.type)}`} style={{ fontSize: "0.65rem" }}>{r.type}</span>
                        {r.notes ? ` — ${r.notes}` : ""}
                        {" "}<span style={{ color: "rgba(240,234,216,0.35)" }}>({r.teacher_name})</span>
                      </div>
                    ))}
                    {summary.records.length > 10 && (
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>+{summary.records.length - 10} older records</div>
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
