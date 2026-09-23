// conference-email — sends the parent a confirmation (and the teacher a heads-up)
// right after a parent books a conference on the public /conferences page.
//
// Called by the browser with { token } — the booking's cancel token, which the
// parent just received from conference_book(). Holding the token is what proves
// the caller made the booking, so this can only ever email the address typed on
// that booking, and only once (confirmation_sent_at).
//
// Required secrets (Supabase dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY          API key from resend.com
//   CONFERENCE_FROM_EMAIL   e.g.  JAG Portal <conferences@jagportal.org>
// Optional:
//   SITE_URL                default https://jagportal.org
//   CONFERENCE_NOTIFY_TEACHERS  "false" to skip the teacher heads-up email
// Until RESEND_API_KEY is set this returns { sent: false, reason: "not_configured" }
// and booking works exactly as before.

import { createClient } from "npm:@supabase/supabase-js@2";

const TZ = "America/New_York";
const REASONS: Record<string, string> = {
  check_in: "Just a check-in",
  struggling: "Student is struggling",
  concerns: "Parent has concerns",
  other: "Other",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function esc(s: unknown) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function when(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
  return `${day} at ${time}`;
}

function shell(title: string, inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#1a1200">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a6d00;font-weight:bold">James A. Garfield</div>
    <h1 style="font-size:22px;margin:4px 0 18px">${esc(title)}</h1>
    <div style="background:#fff;border:1px solid #e3dccb;border-radius:10px;padding:20px;font-size:15px;line-height:1.55">${inner}</div>
    <p style="font-size:12px;color:#777;margin-top:16px">Sent by JAG Portal. Please don't reply to this automated message. Contact the teacher or the school office with questions.</p>
  </div></body></html>`;
}

async function sendEmail(key: string, from: string, to: string, subject: string, html: string, replyTo?: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("CONFERENCE_FROM_EMAIL");
  if (!key || !from) return json({ sent: false, reason: "not_configured" });

  let token = "";
  try { token = String((await req.json())?.token || ""); } catch { /* fall through */ }
  if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: "bad token" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Claim the send first so two quick calls can't double-email.
  const { data: claimed } = await db.from("conference_bookings")
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("cancel_token", token).is("confirmation_sent_at", null)
    .select("id, parent_name, parent_email, parent_phone, student_name, reason, notes, slot:conference_slots(starts_at, duration_min, location, teacher_email, teacher_name)")
    .maybeSingle();
  if (!claimed) return json({ sent: false, reason: "already_sent_or_missing" });

  const slot = Array.isArray(claimed.slot) ? claimed.slot[0] : claimed.slot;
  const { data: staff } = await db.from("staff_directory").select("name, room").eq("email", slot.teacher_email).maybeSingle();
  const teacherName = staff?.name || slot.teacher_name || slot.teacher_email;
  const site = Deno.env.get("SITE_URL") || "https://jagportal.org";
  const cancelUrl = `${site}/conferences?cancel=${token}`;
  const whenText = when(slot.starts_at);
  const where = slot.location || (staff?.room ? `Room ${staff.room}` : "");

  const sent: string[] = [];
  try {
    if (claimed.parent_email) {
      await sendEmail(key, from, claimed.parent_email, `Conference confirmed: ${teacherName}, ${whenText}`, shell("Your conference is booked", `
        <p>Hi ${esc(claimed.parent_name)},</p>
        <p>You're scheduled to meet with <strong>${esc(teacherName)}</strong> about <strong>${esc(claimed.student_name)}</strong>.</p>
        <p style="font-size:17px;margin:14px 0"><strong>${esc(whenText)}</strong> (${slot.duration_min} minutes)${where ? `<br>${esc(where)}` : ""}</p>
        <p>Can't make it? <a href="${esc(cancelUrl)}" style="color:#8a6d00">Cancel this conference</a> so another family can use the time.</p>`),
        slot.teacher_email);
      sent.push("parent");
    }
    if (Deno.env.get("CONFERENCE_NOTIFY_TEACHERS") !== "false") {
      await sendEmail(key, from, slot.teacher_email, `New conference: ${claimed.student_name}, ${whenText}`, shell("New conference booked", `
        <p><strong>${esc(whenText)}</strong>${where ? ` · ${esc(where)}` : ""}</p>
        <p>Student: <strong>${esc(claimed.student_name)}</strong><br>
        Parent: ${esc(claimed.parent_name)}${claimed.parent_email ? ` · ${esc(claimed.parent_email)}` : ""}${claimed.parent_phone ? ` · ${esc(claimed.parent_phone)}` : ""}<br>
        Reason: ${esc(REASONS[claimed.reason] || claimed.reason)}</p>
        ${claimed.notes ? `<p style="background:#f8f5ee;padding:10px;border-radius:6px">“${esc(claimed.notes)}”</p>` : ""}
        <p>See your full schedule in JAG Portal → Conferences.</p>`),
        claimed.parent_email || undefined);
      sent.push("teacher");
    }
  } catch (e) {
    // Release the claim so a retry can send.
    if (!sent.includes("parent")) {
      await db.from("conference_bookings").update({ confirmation_sent_at: null }).eq("id", claimed.id);
    }
    console.error(e);
    return json({ sent: false, reason: "send_failed", partial: sent }, 502);
  }
  return json({ sent: true, to: sent });
});
