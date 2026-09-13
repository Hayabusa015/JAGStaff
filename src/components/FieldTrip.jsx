import { useState } from "react";
import { GOLD } from "../constants.js";
import { useFieldTrips } from "../supabase.js";
import { openGmailCompose } from "../email.js";

const blank = { destination: "", date: "", depart: "", returnTime: "", grade: "", students: "", buses: "No", sub: "No", chaperones: "" };

function fmtDateLong(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function fmtTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const d = new Date(); d.setHours(h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function buildBriefing(form, user) {
  const subject = `[FIELD TRIP REQUEST] ${form.destination.trim()} — ${form.date}`;
  const body = [
    `FIELD TRIP REQUEST — James A. Garfield High School`,
    ``,
    `📎 A PDF field trip request form is being generated — please attach it to this email before sending.`,
    ``,
    `Submitted by: ${user?.name || "Staff"}${user?.email ? ` (${user.email})` : ""}`,
    `Destination:  ${form.destination.trim()}`,
    `Date:         ${form.date}`,
    `Departure:    ${form.depart || "—"}`,
    `Return:       ${form.returnTime || "—"}`,
    `Grade/Class:  ${form.grade || "—"}`,
    `Est. students: ${form.students || "—"}`,
    `Buses needed: ${form.buses}`,
    `Sub required: ${form.sub}`,
    `Chaperones:   ${form.chaperones || "—"}`,
    ``,
    `— Sent from the JAG Staff Portal`,
  ].join("\n");
  return { subject, body };
}

// ── PDF generation — opens a new print-ready window, same pattern as the
// Purchase Order Request's generateRequisitionPDF ──────────────────────────
function generateFieldTripPDF(form, user) {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const baseUrl = window.location.origin;

  const rows = [
    ["Destination", form.destination.trim() || "—"],
    ["Trip Date", fmtDateLong(form.date)],
    ["Departure Time", fmtTime(form.depart)],
    ["Return Time", fmtTime(form.returnTime)],
    ["Grade / Class", form.grade || "—"],
    ["Estimated Students", form.students || "—"],
    ["Buses Needed", form.buses],
    ["Substitute Required", form.sub],
  ];
  const rowsHtml = rows.map(([label, val]) => `
    <tr><td class="label">${label}</td><td>${val}</td></tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Field Trip Request — ${form.destination.trim() || "Trip"} — ${form.date}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:#1a1a1a;background:#fff;font-size:10.5pt;line-height:1.45}

  /* ── Letterhead ── */
  .lh{background:#111;padding:18px 32px;display:flex;align-items:center;gap:18px}
  .lh-logo{width:54px;height:54px;border-radius:50%;border:2px solid #F5C025;overflow:hidden;flex-shrink:0}
  .lh-logo img{width:100%;height:100%;object-fit:cover}
  .lh h1{font-size:14.5pt;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:#F5C025}
  .lh p{font-size:8pt;color:rgba(255,255,255,.5);letter-spacing:.14em;text-transform:uppercase;margin-top:3px}
  .gold-rule{height:4px;background:linear-gradient(90deg,#F5C025,#d4970a)}

  /* ── Page ── */
  .page{padding:26px 32px}

  /* ── Meta row ── */
  .meta{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;padding-bottom:16px;border-bottom:1.5px solid #e8e8e8}
  .meta h2{font-size:14pt;font-weight:900;color:#111;margin-bottom:5px}
  .meta p{font-size:9.5pt;color:#444;margin-top:2px}
  .badge{background:#fffbea;border:1.5px solid #F5C025;color:#8a6000;font-size:7pt;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:5px 13px;border-radius:20px;white-space:nowrap}

  /* ── Details table ── */
  table{width:100%;border-collapse:collapse;font-size:10pt;border:1px solid #ddd}
  tbody td{padding:10px 14px;border-bottom:1px solid #f0f0f0;vertical-align:top}
  tbody tr:last-child td{border-bottom:none}
  tbody tr:nth-child(odd){background:#fafafa}
  .label{font-weight:700;color:#555;width:190px;text-transform:uppercase;font-size:8pt;letter-spacing:.06em}

  /* ── Chaperones ── */
  .chap-block{margin-top:20px;border:1px solid #ddd;border-radius:8px;padding:14px 16px}
  .chap-label{font-size:8pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8a6000;margin-bottom:6px}
  .chap-list{font-size:10pt;color:#333}

  /* ── Signatures ── */
  .sigs{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:34px}
  .sig{border-top:1.5px solid #333;padding-top:8px}
  .sig-name{font-size:8.5pt;font-weight:700;color:#222}
  .sig-role{font-size:7.5pt;color:#777;margin-top:1px}
  .sig-line{margin-top:32px;border-top:1px solid #aaa;font-size:7.5pt;color:#777;padding-top:4px}

  /* ── Footer ── */
  .footer{margin-top:28px;padding-top:10px;border-top:1px solid #e8e8e8;font-size:7.5pt;color:#bbb;display:flex;justify-content:space-between}

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:letter;margin:.55in}
  }
</style>
</head>
<body>

<div class="lh">
  <div class="lh-logo"><img src="${baseUrl}/logo.png" alt="JAG" /></div>
  <div>
    <h1>James A. Garfield High School</h1>
    <p>Field Trip Request &nbsp;·&nbsp; G-Men Staff Portal</p>
  </div>
</div>
<div class="gold-rule"></div>

<div class="page">
  <div class="meta">
    <div>
      <h2>Field Trip Request</h2>
      <p>Requested by: <strong>${user?.name || "Staff"}</strong>${user?.email ? ` &lt;${user.email}&gt;` : ""}</p>
      <p>Submitted: <strong>${today}</strong></p>
    </div>
    <span class="badge">Pending Approval</span>
  </div>

  <table>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="chap-block">
    <div class="chap-label">Chaperones</div>
    <div class="chap-list">${form.chaperones?.trim() || "—"}</div>
  </div>

  <div class="sigs">
    <div class="sig">
      <div class="sig-name">${user?.name || "Requesting Teacher"}</div>
      <div class="sig-role">Requesting Teacher</div>
      <div class="sig-line">Signature &amp; Date</div>
    </div>
    <div class="sig">
      <div class="sig-name">Building Principal / Administrator</div>
      <div class="sig-role">Approval</div>
      <div class="sig-line">Signature &amp; Date</div>
    </div>
  </div>

  <div class="footer">
    <span>James A. Garfield High School — G-Men Staff Portal</span>
    <span>Generated ${today}</span>
  </div>
</div>

<script>window.onload=function(){window.print();}</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=860,height=1100");
  if (win) { win.document.write(html); win.document.close(); }
}

export default function FieldTrip({ user }) {
  const { trips, addTrip } = useFieldTrips(user?.email);
  const [form, setForm] = useState(blank);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!form.destination.trim() || !form.date) { setErr("Destination and date are required."); return; }
    addTrip(form);
    // Open the PDF print window first, then Gmail (slight delay so both
    // pop-up blockers behave) — same combined flow as the Purchase Order
    // Request form.
    generateFieldTripPDF(form, user);
    setTimeout(() => openGmailCompose(buildBriefing(form, user)), 400);
    setSubmitted(true);
  }

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <div style={{ fontSize: "3rem" }}>✅</div>
      <h2 style={{ marginTop: "1rem", fontWeight: 800 }}>Almost done — two quick steps</h2>
      <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 420, margin: "1.25rem auto 0" }}>
        <div style={{ background: "rgba(245,192,37,0.07)", border: "1px solid rgba(245,192,37,0.2)", borderRadius: 10, padding: "0.85rem 1.1rem", textAlign: "left" }}>
          <div style={{ fontWeight: 800, color: GOLD, fontSize: "0.82rem", marginBottom: 4 }}>Step 1 — Save the PDF</div>
          <div className="text-muted" style={{ fontSize: "0.82rem" }}>In the print dialog that opened, choose <strong style={{ color: "#fff" }}>Save as PDF</strong> and note where it saves.</div>
        </div>
        <div style={{ background: "rgba(245,192,37,0.07)", border: "1px solid rgba(245,192,37,0.2)", borderRadius: 10, padding: "0.85rem 1.1rem", textAlign: "left" }}>
          <div style={{ fontWeight: 800, color: GOLD, fontSize: "0.82rem", marginBottom: 4 }}>Step 2 — Attach &amp; Send in Gmail</div>
          <div className="text-muted" style={{ fontSize: "0.82rem" }}>The Gmail tab is pre-filled with the briefing. Click the paperclip 📎, attach the PDF you just saved, add the recipient(s), and send.</div>
        </div>
      </div>
      <div className="flex gap1 mt2" style={{ justifyContent: "center", flexWrap: "wrap", marginTop: "1.25rem" }}>
        <button className="btn btn-ghost" onClick={() => generateFieldTripPDF(form, user)}>📄 Reprint PDF</button>
        <button className="btn btn-ghost" onClick={() => openGmailCompose(buildBriefing(form, user))}>↻ Reopen Email</button>
        <button className="btn btn-primary" onClick={() => { setForm(blank); setSubmitted(false); }}>New Submission</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb2">
        <h2 className="page-title">Field Trip Submission</h2>
      </div>

      <div className="card" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", marginBottom: "1.25rem" }}>
        <span style={{ fontWeight: 600, color: "#92700a" }}>ℹ Submitting saves the request, opens a print-ready PDF you can save, and opens a Gmail compose window with the briefing pre-filled — attach the PDF and send.</span>
      </div>

      <div className="card">
        <form onSubmit={submit}>
          <div className="grid2 mb1">
            <div>
              <label>Destination *</label>
              <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="e.g. Cleveland Museum of Art" />
            </div>
            <div>
              <label>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="grid2 mb1">
            <div>
              <label>Departure Time</label>
              <input type="time" value={form.depart} onChange={e => setForm(f => ({ ...f, depart: e.target.value }))} />
            </div>
            <div>
              <label>Return Time</label>
              <input type="time" value={form.returnTime} onChange={e => setForm(f => ({ ...f, returnTime: e.target.value }))} />
            </div>
          </div>
          <div className="grid2 mb1">
            <div>
              <label>Grade / Class Name</label>
              <input value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder="e.g. 10th Grade Biology" />
            </div>
            <div>
              <label>Estimated Student Count</label>
              <input type="number" min={1} value={form.students} onChange={e => setForm(f => ({ ...f, students: e.target.value }))} placeholder="e.g. 24" />
            </div>
          </div>
          <div className="grid2 mb1">
            <div>
              <label>Transportation / Buses Needed?</label>
              <select value={form.buses} onChange={e => setForm(f => ({ ...f, buses: e.target.value }))}>
                <option>No</option><option>Yes</option>
              </select>
            </div>
            <div>
              <label>Substitute Teacher Required?</label>
              <select value={form.sub} onChange={e => setForm(f => ({ ...f, sub: e.target.value }))}>
                <option>No</option><option>Yes</option>
              </select>
            </div>
          </div>
          <div className="mb1">
            <label>Chaperone List (comma-separated)</label>
            <textarea rows={2} value={form.chaperones} onChange={e => setForm(f => ({ ...f, chaperones: e.target.value }))} placeholder="Mrs. Smith, Mr. Jones…" />
          </div>
          {err && <p className="text-red mb1" style={{ fontSize: "0.8rem" }}>{err}</p>}
          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: "center", marginTop: "0.5rem" }}>
            📄 Submit Field Trip → PDF &amp; Notify
          </button>
        </form>
      </div>

      {trips.length > 0 && (
        <div className="card mt2">
          <div className="section-title">My Recent Submissions</div>
          {trips.map(t => {
            const d = t.trip_date ? new Date(t.trip_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
            return (
              <div key={t.id} className="flex items-center justify-between" style={{ padding: "0.55rem 0", borderBottom: "1px solid rgba(200,200,200,0.2)" }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{t.destination}</span>
                  <div className="text-muted mt1">
                    {d}{t.grade ? ` · ${t.grade}` : ""}{t.student_count ? ` · ${t.student_count} students` : ""}
                    {t.buses ? " · 🚌 Buses" : ""}{t.needs_sub ? " · Sub needed" : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
