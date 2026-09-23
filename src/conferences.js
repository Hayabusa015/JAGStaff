// Shared parent-teacher conference helpers: slot generation for an
// office-set conference night, and the printable per-teacher schedules.
import { CONFERENCE_REASONS, CONFERENCE_TZ } from "./constants.js";

const REASON_LABEL = Object.fromEntries(CONFERENCE_REASONS.map(r => [r.key, r.label]));

export function fmtConfDay(iso, month = "long") {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: CONFERENCE_TZ, weekday: "long", month, day: "numeric" });
}
export function fmtConfTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: CONFERENCE_TZ, hour: "numeric", minute: "2-digit" });
}

// Every start time from `start` up to (not past) `end`, `len` minutes apart,
// skipping any slot that overlaps the optional [breakStart, breakEnd) window.
// Times are read in the browser's local zone — the office is in-building.
export function buildSlotTimes(date, start, end, len, breakStart, breakEnd) {
  if (!date || !start || !end || !(len > 0)) return [];
  const step = len * 60000;
  const endMs = new Date(`${date}T${end}`).getTime();
  const bs = breakStart && breakEnd ? new Date(`${date}T${breakStart}`).getTime() : null;
  const be = bs != null ? new Date(`${date}T${breakEnd}`).getTime() : null;
  const out = [];
  for (let t = new Date(`${date}T${start}`).getTime(); t + step <= endMs; t += step) {
    if (bs != null && t < be && t + step > bs) continue;
    out.push(new Date(t).toISOString());
    if (out.length > 200) break;
  }
  return out;
}

// Group slots into one printable page per teacher, days in order.
// `slots` rows: { teacher_email, teacher_name, starts_at, duration_min, location, booking }.
export function schedulePages(slots, staffList = []) {
  const staff = Object.fromEntries(staffList.map(s => [s.email, s]));
  const byTeacher = new Map();
  [...slots].sort((a, b) => a.starts_at.localeCompare(b.starts_at)).forEach(s => {
    if (!byTeacher.has(s.teacher_email)) byTeacher.set(s.teacher_email, []);
    byTeacher.get(s.teacher_email).push(s);
  });
  return [...byTeacher.entries()].map(([email, list]) => {
    const days = new Map();
    list.forEach(s => {
      const d = fmtConfDay(s.starts_at);
      if (!days.has(d)) days.set(d, []);
      days.get(d).push(s);
    });
    return {
      email,
      name: staff[email]?.name || list[0].teacher_name || email,
      room: staff[email]?.room || "",
      booked: list.filter(s => s.booking).length,
      total: list.length,
      days: [...days.entries()],
    };
  }).sort((a, b) => lastName(a.name).localeCompare(lastName(b.name)));
}

function lastName(n) {
  const parts = (n || "").trim().split(/\s+/);
  return (parts[parts.length - 1] || "").toLowerCase();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function scheduleHtml(pages, { title = "Parent-Teacher Conferences" } = {}) {
  const body = pages.map(p => `
    <section class="page">
      <header>
        <div class="school">James A. Garfield · ${esc(title)}</div>
        <h1>${esc(p.name)}</h1>
        <div class="meta">${p.room ? `Room ${esc(p.room)} · ` : ""}${p.booked} of ${p.total} times booked</div>
      </header>
      ${p.days.map(([day, list]) => `
        <h2>${esc(day)}</h2>
        <table>
          <thead><tr><th class="t">Time</th><th>Student</th><th>Parent / contact</th><th>Reason</th><th>Notes</th></tr></thead>
          <tbody>
            ${list.map(s => {
              const b = s.booking;
              if (!b) return `<tr class="open"><td class="t">${esc(fmtConfTime(s.starts_at))}</td><td colspan="4">Open</td></tr>`;
              const contact = [b.parent_email, b.parent_phone].filter(Boolean).map(esc).join("<br>");
              return `<tr><td class="t">${esc(fmtConfTime(s.starts_at))}</td>
                <td><strong>${esc(b.student_name)}</strong></td>
                <td>${esc(b.parent_name)}${contact ? `<div class="small">${contact}</div>` : ""}</td>
                <td>${esc(REASON_LABEL[b.reason] || b.reason)}</td>
                <td class="small">${esc(b.notes || "")}</td></tr>`;
            }).join("")}
          </tbody>
        </table>`).join("")}
      <footer>Printed ${esc(new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))} from JAG Portal. Bookings made after this time won't appear.</footer>
    </section>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page { size: letter portrait; margin: 0.5in; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; }
    .page { page-break-after: always; break-after: page; }
    .page:last-child { page-break-after: auto; break-after: auto; }
    .school { font-size: 10pt; letter-spacing: .08em; text-transform: uppercase; color: #555; }
    h1 { font-size: 22pt; margin: 2pt 0; }
    .meta { font-size: 11pt; color: #333; margin-bottom: 10pt; }
    h2 { font-size: 13pt; margin: 14pt 0 4pt; border-bottom: 2px solid #111; padding-bottom: 2pt; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
    th { text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: .05em; color: #555; border-bottom: 1px solid #999; padding: 4pt; }
    td { border-bottom: 1px solid #ddd; padding: 5pt 4pt; vertical-align: top; }
    tr { page-break-inside: avoid; }
    td.t, th.t { width: 64pt; white-space: nowrap; font-weight: bold; }
    tr.open td { color: #999; }
    .small { font-size: 9pt; color: #444; }
    footer { margin-top: 12pt; font-size: 8pt; color: #888; }
  </style></head><body>${body || "<p>No conference times to print.</p>"}</body></html>`;
}

// Opens the schedules in a new window and brings up the print dialog.
export function printSchedules(pages, opts) {
  const w = window.open("", "_blank");
  if (!w) { alert("Your browser blocked the print window. Allow pop-ups for this site and try again."); return; }
  w.document.open();
  w.document.write(scheduleHtml(pages, opts));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
