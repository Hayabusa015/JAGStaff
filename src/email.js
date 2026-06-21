// ─── Gmail compose helper ────────────────────────────────────────
// Opens Gmail's *web* compose window (mail.google.com) in a new tab with the
// subject + body pre-filled. We deliberately use the Gmail compose URL instead
// of a `mailto:` link so it never hands off to Outlook or whatever the OS has
// set as the default mail client — staff are signed into their @jagschools.org
// Google account, so this drops them straight into Gmail.
//
// `to` is optional and left blank by default: the building is still settling on
// who these notices should go to, so the teacher fills in (or confirms) the
// recipient in Gmail before hitting send. Pass `to` when the recipient is known
// (e.g. a parent email pulled from the roster) — it's still editable in Gmail.
//
// encodeURIComponent (not URLSearchParams) is used so spaces become %20 rather
// than "+", which Gmail's compose box would otherwise render as literal pluses.
export function openGmailCompose({ to = "", cc = "", bcc = "", subject = "", body = "" } = {}) {
  const parts = ["view=cm", "fs=1", "tf=1"];
  if (to) parts.push("to=" + encodeURIComponent(to));
  if (cc) parts.push("cc=" + encodeURIComponent(cc));
  if (bcc) parts.push("bcc=" + encodeURIComponent(bcc));
  if (subject) parts.push("su=" + encodeURIComponent(subject));
  if (body) parts.push("body=" + encodeURIComponent(body));
  const url = "https://mail.google.com/mail/?" + parts.join("&");
  window.open(url, "_blank", "noopener,noreferrer");
}
