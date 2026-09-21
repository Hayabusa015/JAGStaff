import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { SEED_EVENTS, SEED_TRIPS, SEED_CEU, SEED_STUDENTS, SEED_GRADEBOOK_PROFILE, SEED_GRADEBOOK_ASSIGNMENTS, SEED_GRADEBOOK_GRADES } from "./constants.js";

// Supabase project URL + anon key. The anon key is safe to ship in the
// client — row-level security (RLS) is what actually protects the data.
// Set these in a .env.local file (see SUPABASE_SETUP.md / .env.example).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const SUPABASE_READY = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

// ─── Clock sync ──────────────────────────────────────────────────
// A kiosk device's own clock isn't guaranteed to be accurate (no NTP sync,
// a drifted RTC, etc.), but every "elapsed" timer in this app (hall pass,
// room pass, late arrival) is computed as `Date.now() - serverTimestamp`.
// If the kiosk's clock is off by even a few tens of seconds, a freshly
// signed-out student appears to already be N seconds into their pass the
// instant the card renders — which is exactly what was reported as
// students "starting" at 46 seconds instead of 0.
//
// Every Supabase response carries a standard HTTP `Date` header naming the
// server's clock at the moment it replied, with no extra request needed.
// We piggyback on that here to keep a running estimate of the offset
// between this device's clock and the server's, and expose `nowMs()` so
// elapsed-time math can use a corrected "now" instead of the raw device
// clock.
let clockOffsetMs = 0;
function trackClockOffset(response) {
  try {
    const serverDateHeader = response?.headers?.get?.("date");
    if (!serverDateHeader) return;
    const serverMs = new Date(serverDateHeader).getTime();
    if (Number.isNaN(serverMs)) return;
    clockOffsetMs = serverMs - Date.now();
  } catch {
    // Best-effort only — fall back to the device clock (offset 0) on any
    // parsing hiccup rather than let this ever throw into a real request.
  }
}
// Best-effort "now", corrected for this device's measured clock drift
// against the Supabase server. Falls back to the plain device clock until
// the first response comes back.
export function nowMs() {
  return Date.now() + clockOffsetMs;
}

export const supabase = SUPABASE_READY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        fetch: async (...args) => {
          const response = await fetch(...args);
          trackClockOffset(response);
          return response;
        },
      },
    })
  : null;

// Map a snake_case DB row to the camelCase shape the UI expects.
function rowToPass(r) {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    studentEmail: r.student_email,
    destination: r.destination,
    status: r.status, // 'pending' | 'active' — undefined on log rows and in mock mode
    outTime: r.out_time,
    returnTime: r.return_time,
    duration: r.duration,
    teacherName: r.teacher_name,
    teacherEmail: r.teacher_email,
    room: r.room,
  };
}

// ─── Shared Hall Pass State (Supabase-backed) ───────────────────
// Two tables:
//   hall_passes    — one row per active pass (student is OUT)
//   hall_pass_log  — historical record (return_time + duration set)
// When Supabase is not configured, falls back to in-memory state so the
// app still works in local dev.
export function useSharedHallPasses() {
  const [passes, setPasses] = useState([]);
  const [log, setLog] = useState([]);
  const [ready, setReady] = useState(!SUPABASE_READY);

  const load = useCallback(async () => {
    if (!SUPABASE_READY || !supabase) return;
    const [{ data: p }, { data: l }] = await Promise.all([
      supabase.from("hall_passes").select("*").order("out_time", { ascending: true }),
      supabase.from("hall_pass_log").select("*").order("created_at", { ascending: false }),
    ]);
    setPasses((p || []).map(rowToPass));
    setLog((l || []).map(rowToPass));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    load();

    // Realtime: any insert/update/delete on either table triggers a reload.
    // At this app's scale a full reload is simpler and cheaper than diffing.
    // This is a best-effort *supplementary* sync for other kiosks/tabs — the
    // client that actually performs a write reloads immediately itself (see
    // addPass/returnPass/approvePass/denyPass below) rather than waiting on
    // a round trip through this channel, since a kiosk's websocket can sit
    // idle for hours and occasionally miss or delay a postgres_changes event.
    const channel = supabase
      .channel("hallpass-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "hall_passes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "hall_pass_log" }, load)
      .subscribe();

    // Backstop poll: if the realtime channel ever silently drops (a kiosk
    // left open for a full school day is the common case), this keeps every
    // screen eventually consistent without needing a page refresh.
    const pollId = setInterval(load, 20000);

    return () => { clearInterval(pollId); supabase.removeChannel(channel); };
  }, [load]);

  async function addPass(passData) {
    if (!SUPABASE_READY || !supabase) {
      const id = Date.now().toString();
      setPasses(p => [...p, { id, ...passData, outTime: new Date().toISOString() }]);
      return id;
    }
    const { data } = await supabase.from("hall_passes").insert({
      student_id: passData.studentId,
      student_name: passData.studentName,
      destination: passData.destination,
      teacher_name: passData.teacherName,
      teacher_email: passData.teacherEmail ?? null,
      room: passData.room,
    }).select("id").single();
    // Don't wait on the realtime broadcast to see our own write — reload
    // now so the kiosk that just signed this student out shows them
    // immediately instead of only after some later event happens to
    // trigger a refresh (which is what made passes appear to "wait for
    // the next student" before this reflected the true, already-elapsed
    // out_time).
    await load();
    return data?.id;
  }

  async function returnPass(passId, passData) {
    const outTime = passData.outTime ? new Date(passData.outTime) : new Date();
    const returnTime = new Date();
    const duration = Math.round((returnTime - outTime) / 60000);

    if (!SUPABASE_READY || !supabase) {
      setPasses(p => p.filter(x => x.id !== passId));
      setLog(l => [{ id: Date.now().toString(), ...passData, returnTime: returnTime.toISOString(), duration }, ...l]);
      return;
    }
    // Two writes for clarity (log first so nothing is lost if the delete
    // somehow fails). Wrap in an RPC if you want strict atomicity.
    await supabase.from("hall_pass_log").insert({
      student_id: passData.studentId,
      student_name: passData.studentName,
      destination: passData.destination,
      out_time: outTime.toISOString(),
      return_time: returnTime.toISOString(),
      duration,
      teacher_name: passData.teacherName,
      room: passData.room,
    });
    await supabase.from("hall_passes").delete().eq("id", passId);
    await load();
  }

  // Silently close out a hall pass nobody manually returned — e.g. the
  // student's period ended and they never tapped back in at the kiosk. Looks
  // exactly like an ordinary return in the log (same fields, no "auto"
  // marker): the point is the count/timer don't stay stuck, not to call
  // attention to the miss.
  //
  // Every open kiosk/tab independently notices the same overdue pass, so
  // this deletes first and only logs if the delete actually removed a row —
  // whichever screen's delete wins the race is the only one that writes the
  // log entry, instead of two tabs both logging the same return.
  const autoReturnPass = useCallback(async (passId, returnTime) => {
    if (!SUPABASE_READY || !supabase) {
      setPasses(p => {
        const pass = p.find(x => x.id === passId);
        if (!pass) return p;
        const outTime = pass.outTime ? new Date(pass.outTime) : returnTime;
        const duration = Math.max(0, Math.round((returnTime - outTime) / 60000));
        setLog(l => [{ ...pass, returnTime: returnTime.toISOString(), duration }, ...l]);
        return p.filter(x => x.id !== passId);
      });
      return;
    }
    const { data: deleted } = await supabase.from("hall_passes").delete().eq("id", passId).select().single();
    if (!deleted) return; // another open screen already closed this one out
    const outTime = new Date(deleted.out_time);
    const duration = Math.max(0, Math.round((returnTime - outTime) / 60000));
    await supabase.from("hall_pass_log").insert({
      student_id: deleted.student_id,
      student_name: deleted.student_name,
      destination: deleted.destination,
      out_time: deleted.out_time,
      return_time: returnTime.toISOString(),
      duration,
      teacher_name: deleted.teacher_name,
      room: deleted.room,
    });
    await load();
  }, [load]);

  // Approve a student's pending request: flips it to an active pass and
  // stamps out_time now (the request's created_at is when they asked, not
  // when they were cleared to leave).
  async function approvePass(passId) {
    if (!SUPABASE_READY || !supabase) {
      setPasses(p => p.map(x => x.id === passId ? { ...x, status: "active", outTime: new Date().toISOString() } : x));
      return;
    }
    await supabase.from("hall_passes")
      .update({ status: "active", out_time: new Date().toISOString() })
      .eq("id", passId).eq("status", "pending");
    await load();
  }

  // Decline a pending request outright — it never happened, so it's removed
  // rather than logged (covered by the existing staff delete policy).
  async function denyPass(passId) {
    if (!SUPABASE_READY || !supabase) {
      setPasses(p => p.filter(x => x.id !== passId));
      return;
    }
    await supabase.from("hall_passes").delete().eq("id", passId).eq("status", "pending");
    await load();
  }

  return { passes, log, ready, addPass, returnPass, autoReturnPass, approvePass, denyPass };
}

// ─── Auth ────────────────────────────────────────────────────────
// useAuth() manages the full Google OAuth session lifecycle:
//   - Resumes an existing session on page load (handles the OAuth redirect)
//   - Exposes signInWithGoogle / signOut helpers
//   - Enforces @jagschools.org domain: non-school accounts are signed out
//     immediately with an explanatory error message
//   - Returns { user, loading, error, signInWithGoogle, signOut }
//     where user is null (unauthenticated) or { id, email, name, avatarUrl }
export function useAuth(allowedDomain) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking session
  const [error, setError] = useState(null);

  // Parse a Supabase User object into the shape the rest of the app expects.
  function parseUser(supabaseUser) {
    if (!supabaseUser) return null;
    const meta = supabaseUser.user_metadata || {};
    const email = supabaseUser.email || "";
    const name =
      meta.full_name ||
      meta.name ||
      email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return {
      id: supabaseUser.id,
      email,
      name,
      avatarUrl: meta.avatar_url || meta.picture || null,
    };
  }

  // Called whenever Supabase fires an auth event.
  const handleSession = useCallback(
    async session => {
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }
      const supabaseUser = session.user;
      const email = supabaseUser?.email || "";

      // Domain guard — belt-and-suspenders on top of the RLS policy.
      if (allowedDomain && !email.toLowerCase().endsWith("@" + allowedDomain)) {
        setError(`Only @${allowedDomain} accounts may sign in.`);
        setUser(null);
        // Sign the non-school account back out so the session doesn't linger.
        await supabase?.auth.signOut();
        setLoading(false);
        return;
      }

      setError(null);
      setUser(parseUser(supabaseUser));
      setLoading(false);
    },
    [allowedDomain]
  );

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) {
      // No Supabase config — stay in unauthenticated state but stop loading.
      setLoading(false);
      return;
    }

    // Check for an existing session on mount (also handles the OAuth redirect
    // coming back to the page — Supabase parses the URL hash automatically).
    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));

    // Keep auth state in sync for the lifetime of the component.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => handleSession(session)
    );
    return () => subscription.unsubscribe();
  }, [handleSession]);

  async function signInWithGoogle() {
    if (!SUPABASE_READY || !supabase) return;
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // After Google redirects back, Supabase will restore the session and
        // fire onAuthStateChange — no extra redirect handling needed.
        redirectTo: window.location.origin,
        // Ask for the scopes needed to read the user's name + avatar.
        scopes: "openid email profile",
        queryParams: {
          // Prompt the account chooser every time so staff can switch accounts.
          prompt: "select_account",
          // If your district uses Google Workspace, lock the picker to your domain.
          hd: allowedDomain || undefined,
        },
      },
    });
    if (oauthError) setError(oauthError.message);
  }

  async function signOut() {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }

  return { user, loading, error, signInWithGoogle, signOut };
}

// ─── Infraction Log (Supabase-backed) ────────────────────────────
// Table: infractions — immutable append-only log, no update/delete RLS.
// Falls back to local state when Supabase is not configured.
export function useInfractions() {
  const [infractions, setInfractions] = useState([]);
  const [loading, setLoading] = useState(!SUPABASE_READY);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("infractions")
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      setInfractions(data || []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("infractions-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "infractions" }, load)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  async function addInfraction(data) {
    const row = {
      id: Date.now().toString(),
      student_id: data.studentId,
      student_name: data.studentName,
      type: data.type,
      notes: data.notes || null,
      teacher_name: data.teacherName,
      room: data.room || null,
      parent_notified: data.parentNotified || false,
      created_at: new Date().toISOString(),
    };

    if (!SUPABASE_READY || !supabase) {
      setInfractions(prev => [row, ...prev]);
      return;
    }
    await supabase.from("infractions").insert({
      student_id: data.studentId,
      student_name: data.studentName,
      type: data.type,
      notes: data.notes || null,
      teacher_name: data.teacherName,
      room: data.room || null,
      parent_notified: data.parentNotified || false,
    });
    // Realtime INSERT event triggers load() above — no local setState needed.
  }

  return { infractions, loading, addInfraction };
}

// ─── Student Roster (Supabase-backed) ────────────────────────────
// Table: students — shared school roster (last_name, first_name, grade).
// Falls back to local state (empty) when Supabase is not configured.
export function useStudents() {
  const [students, setStudents] = useState(() => !SUPABASE_READY ? SEED_STUDENTS : []);
  const [loading, setLoading] = useState(SUPABASE_READY);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) { setLoading(false); return; }
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("students")
        .select("*")
        .order("last_name").order("first_name");
      if (!active) return;
      setStudents((data || []).map(r => ({
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name,
        grade: r.grade || "",
        section: r.section || "",
        parentEmail: r.parent_email || "",
        studentEmail: r.student_email || "",
      })));
      setLoading(false);
    }
    load();

    // Realtime: without this, a student inserted from another tab/hook
    // instance (e.g. a Classroom roster sync) never shows up here until a
    // full reload, since this hook only fetches once on mount. The channel
    // name must be unique per hook instance — useStudents() is called from
    // multiple components at once (App.jsx, Gradebook.jsx), and reusing one
    // hardcoded name across instances made a second `.on()` land on a
    // channel the first instance had already subscribed, which throws.
    const channel = supabase
      .channel(`students-shared-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, load)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  const rowToStudent = r => ({
    id: r.id, firstName: r.first_name, lastName: r.last_name,
    grade: r.grade || "", section: r.section || "",
    parentEmail: r.parent_email || "", studentEmail: r.student_email || "",
  });

  // Inverse of rowToStudent: camelCase UI shape → snake_case DB columns.
  const studentToRow = s => ({
    first_name: s.firstName, last_name: s.lastName,
    grade: s.grade || null, section: s.section || null,
    parent_email: s.parentEmail || null, student_email: s.studentEmail || null,
  });

  // Replace the entire roster (used on CSV import).
  //
  // Order matters: the old roster is only removed AFTER the new rows are
  // safely inserted. The previous version deleted first, so any failed or
  // empty import wiped the roster and left nothing behind.
  async function importStudents(rows) {
    if (!SUPABASE_READY || !supabase) { setStudents(rows); return { added: rows.length }; }

    // An empty import is always a mapping mistake, never an intent to clear
    // the roster. Removing students is what the per-row delete button is for.
    if (!rows.length) {
      throw new Error("Nothing to import — no rows had a first or last name. Check the column mapping.");
    }

    const { data: existing, error: readErr } = await supabase.from("students").select("id");
    if (readErr) throw new Error(`Could not read the current roster: ${readErr.message}`);
    const oldIds = (existing || []).map(r => r.id);

    // Insert in batches so a large roster doesn't blow the request size.
    const CHUNK = 500;
    const payload = rows.map(studentToRow);
    const inserted = [];
    for (let i = 0; i < payload.length; i += CHUNK) {
      const { data, error } = await supabase
        .from("students").insert(payload.slice(i, i + CHUNK)).select("*");
      if (error) {
        // Roll back this import's own rows; the old roster was never touched.
        const ids = inserted.map(r => r.id);
        for (let j = 0; j < ids.length; j += 200) {
          await supabase.from("students").delete().in("id", ids.slice(j, j + 200));
        }
        throw new Error(`Import failed — ${error.message}`);
      }
      inserted.push(...(data || []));
    }

    // New roster is in. Now retire the old one.
    for (let i = 0; i < oldIds.length; i += 200) {
      const { error } = await supabase.from("students").delete().in("id", oldIds.slice(i, i + 200));
      if (error) throw new Error(`Imported ${inserted.length} students, but clearing the old roster failed: ${error.message}`);
    }

    const mapped = inserted.map(rowToStudent);
    setStudents(mapped);
    return { added: mapped.length };
  }

  async function addStudent(s) {
    if (!SUPABASE_READY || !supabase) {
      const row = { id: Date.now().toString(), ...s };
      setStudents(prev => [...prev, row]);
      return row;
    }
    const { data } = await supabase.from("students")
      .insert(studentToRow(s)).select("*").single();
    if (!data) return null;
    const mapped = rowToStudent(data);
    setStudents(prev => [...prev, mapped]);
    return mapped;
  }

  async function updateStudent(id, s) {
    if (!SUPABASE_READY || !supabase) {
      setStudents(prev => prev.map(x => x.id === id ? { ...x, ...s } : x));
      return;
    }
    await supabase.from("students").update(studentToRow(s)).eq("id", id);
    setStudents(prev => prev.map(x => x.id === id ? { ...x, ...s } : x));
  }

  async function removeStudent(id) {
    if (!SUPABASE_READY || !supabase) {
      setStudents(prev => prev.filter(x => x.id !== id));
      return;
    }
    await supabase.from("students").delete().eq("id", id);
    setStudents(prev => prev.filter(x => x.id !== id));
  }

  async function syncClassroomStudents(incomingRows) {
    if (!SUPABASE_READY || !supabase) {
      setStudents(prev => {
        const existing = new Set(prev.map(s => s.studentEmail).filter(Boolean));
        const toAdd = incomingRows.filter(r => r.studentEmail && !existing.has(r.studentEmail));
        return [...prev, ...toAdd.map(r => ({ id: Date.now().toString() + Math.random(), ...r }))];
      });
      return { added: incomingRows.length, skipped: 0 };
    }
    // Deduplicate by email — more reliable than name matching across multiple teachers.
    const emailsToCheck = incomingRows.map(r => r.studentEmail).filter(Boolean);
    const { data: current } = await supabase
      .from("students")
      .select("student_email")
      .in("student_email", emailsToCheck);
    const existingEmails = new Set((current || []).map(r => r.student_email));
    const toInsert = incomingRows.filter(r => r.studentEmail && !existingEmails.has(r.studentEmail));
    if (toInsert.length > 0) {
      const { data } = await supabase.from("students").insert(
        toInsert.map(r => ({ first_name: r.firstName, last_name: r.lastName, grade: r.grade || null, parent_email: null, student_email: r.studentEmail || null }))
      ).select("*");
      setStudents(prev => [
        ...prev,
        ...(data || []).map(r => ({ id: r.id, firstName: r.first_name, lastName: r.last_name, grade: r.grade || "", parentEmail: "", studentEmail: r.student_email || "" })),
      ]);
    }
    return { added: toInsert.length, skipped: incomingRows.length - toInsert.length };
  }

  return { students, loading, importStudents, syncClassroomStudents, addStudent, updateStudent, removeStudent };
}

// ─── Google Classroom Sync ────────────────────────────────────────
function loadGIS() {
  return new Promise(resolve => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

const GC_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.students",
  // Without this, Students.list/courses.students omits profile.emailAddress
  // entirely (Google returns name/id only) — every roster sync then has no
  // way to match or create students, since matching is email-based.
  "https://www.googleapis.com/auth/classroom.profile.emails",
].join(" ");

export function useClassroomSync() {
  async function requestToken() {
    await loadGIS();
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error("VITE_GOOGLE_CLIENT_ID is not set in your .env.local file.");
    return new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GC_SCOPES,
        callback: response => {
          if (response.error) reject(new Error(response.error_description || response.error));
          else resolve(response.access_token);
        },
      });
      client.requestAccessToken({ prompt: "" });
    });
  }

  async function listCourses(token) {
    const url = "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&teacherId=me&pageSize=100";
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Classroom API error: ${res.status}`);
    const data = await res.json();
    return (data.courses || []).map(c => ({ id: c.id, name: c.name, section: c.section || "" }));
  }

  async function listStudents(token, courseId) {
    const url = `https://classroom.googleapis.com/v1/courses/${courseId}/students?pageSize=200`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Classroom API error: ${res.status}`);
    const data = await res.json();
    return (data.students || [])
      .map(s => ({
        firstName: s.profile?.name?.givenName || "",
        lastName: s.profile?.name?.familyName || "",
        studentEmail: s.profile?.emailAddress || "",
        gcUserId: s.userId || "",
      }))
      .filter(s => s.firstName || s.lastName);
  }

  // Push grades for a set of assignments to a Google Classroom course.
  // `assignments` — the local gradebook assignments for the current period
  // `grades`      — flat grade rows from useGradebook
  // `students`    — student roster (need studentEmail to match GC roster)
  // Returns { synced, skipped, errors[] }
  async function syncGradesToCourse(token, courseId, { assignments, grades, students, onProgress }) {
    // 1. Fetch GC roster → Map<gcUserId, email> and Map<email, gcUserId>
    const rosterRes = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/students?pageSize=200`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!rosterRes.ok) throw new Error(`Roster fetch failed: ${rosterRes.status}`);
    const rosterData = await rosterRes.json();
    const userIdToEmail = {};
    const emailToUserId = {};
    for (const s of rosterData.students || []) {
      const email = s.profile?.emailAddress?.toLowerCase();
      const uid = s.userId;
      if (email && uid) { userIdToEmail[uid] = email; emailToUserId[email] = uid; }
    }

    // 2. Fetch GC courseWork
    const cwRes = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?pageSize=200`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!cwRes.ok) throw new Error(`CourseWork fetch failed: ${cwRes.status}`);
    const cwData = await cwRes.json();
    const courseWork = cwData.courseWork || [];

    let synced = 0, skipped = 0;
    const errors = [];

    for (const assignment of assignments) {
      // Match local assignment to GC courseWork by title (case-insensitive)
      const cw = courseWork.find(
        c => c.title.trim().toLowerCase() === assignment.name.trim().toLowerCase()
      );
      if (!cw) { skipped++; continue; }

      // Fetch submissions for this courseWork
      const subRes = await fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${cw.id}/studentSubmissions?pageSize=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!subRes.ok) { errors.push(`Submissions for "${assignment.name}": ${subRes.status}`); continue; }
      const subData = await subRes.json();
      const submissions = subData.studentSubmissions || [];

      for (const sub of submissions) {
        const email = userIdToEmail[sub.userId];
        if (!email) continue;
        const student = students.find(s => s.studentEmail?.toLowerCase() === email);
        if (!student) continue;
        const grade = grades.find(g => g.assignment_id === assignment.id && g.student_id === student.id);
        if (!grade || grade.points_earned == null || grade.excused || grade.missing) continue;

        const patchRes = await fetch(
          `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${cw.id}/studentSubmissions/${sub.id}?updateMask=assignedGrade,draftGrade`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ assignedGrade: grade.points_earned, draftGrade: grade.points_earned }),
          }
        );
        if (patchRes.ok) { synced++; }
        else { errors.push(`${student.lastName}, ${student.firstName} / ${assignment.name}`); }
      }
      onProgress?.({ done: synced + skipped + errors.length, total: assignments.length });
    }

    return { synced, skipped, errors };
  }

  return { requestToken, listCourses, listStudents, syncGradesToCourse };
}

// ─── G-Men Requests (Supabase-backed) ────────────────────────────
// Table: gmen_requests — today's remediation pull list, shared school-wide.
// Falls back to local state when Supabase is not configured.
export function useGmenRequests() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    let active = true;

    async function load() {
      // Only load today's requests
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("gmen_requests")
        .select("*")
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: true });
      if (!active) return;
      setRequests((data || []).map(r => ({
        id: r.id,
        student: { id: r.student_id, firstName: r.student_first, lastName: r.student_last, name: r.student_name, grade: r.grade },
        arrived: r.arrived,
        requestedBy: r.requested_by,
        requestedAt: new Date(r.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      })));
    }
    load();

    const channel = supabase
      .channel("gmen-requests-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "gmen_requests" }, load)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  async function addRequest(student, requestedBy) {
    const localReq = {
      id: Date.now().toString(),
      student: { ...student, name: `${student.firstName} ${student.lastName}` },
      arrived: false,
      requestedBy,
      requestedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };

    if (!SUPABASE_READY || !supabase) {
      setRequests(r => [...r, localReq]);
      return localReq.id;
    }
    const { data } = await supabase.from("gmen_requests").insert({
      student_id: student.id,
      student_first: student.firstName,
      student_last: student.lastName,
      student_name: `${student.firstName} ${student.lastName}`,
      grade: student.grade || null,
      arrived: false,
      requested_by: requestedBy,
    }).select("id").single();
    return data?.id;
  }

  async function markArrived(id) {
    if (!SUPABASE_READY || !supabase) {
      setRequests(r => r.map(x => x.id === id ? { ...x, arrived: true } : x));
      return;
    }
    await supabase.from("gmen_requests").update({ arrived: true }).eq("id", id);
    // Realtime UPDATE triggers load() above
  }

  async function clearAll() {
    if (!SUPABASE_READY || !supabase) {
      setRequests([]);
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await supabase.from("gmen_requests").delete().gte("created_at", today.toISOString());
  }

  return { requests, addRequest, markArrived, clearAll };
}

// ─── Staff Directory ──────────────────────────────────────────────
// Powers the "Send to Teacher" dropdown for room passes.
//
// SECURITY: staff are NOT self-registered from the client. is_staff() requires
// staff_directory membership, so a client-side self-upsert would let any
// signed-in student promote themselves to staff. Staff are provisioned by an
// admin (see the 20260627 migration). This hook is read-only.
export function useStaffDirectory(user, room) {
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !user?.email) return;

    // Read-only: load the directory for the dropdown.
    supabase.from("staff_directory")
      .select("*")
      .order("name")
      .then(({ data }) => setStaff(data || []));
  }, [user?.email, room]);

  return staff;
}

// Persist a teacher's "max students out at once" to their staff_directory
// row so it has a real source of truth — it was pure client-side React
// state until now, invisible to anyone but that one open browser tab.
export async function saveMaxOut(email, maxOut) {
  if (!SUPABASE_READY || !supabase || !email) return;
  await supabase.from("staff_directory").update({ max_out: maxOut }).eq("email", email);
}

// A count only, never the underlying rows — lets a student's own request
// screen show "N already out" without granting read access to who those N
// students are (that boundary is what Phase 1 closed).
export async function getActivePassCount() {
  if (!SUPABASE_READY || !supabase) return 0;
  const { data } = await supabase.rpc("active_pass_count");
  return data ?? 0;
}

// ─── Staff self-service sign-up (passcode-gated) ────────────────────
// A brand-new account (not yet in staff_directory or the student roster)
// can self-declare as staff by entering a passcode the admin set. The
// passcode itself is never readable client-side — everything routes
// through claim_staff_role(), which checks it server-side against a
// bcrypt hash. Returns { ok, error } instead of throwing so the caller
// can render the message directly.
export async function claimStaffRole(code, name) {
  if (!SUPABASE_READY || !supabase) return { ok: false, error: "Not connected." };
  const { error } = await supabase.rpc("claim_staff_role", { p_code: code, p_name: name || null });
  if (error) return { ok: false, error: error.message.replace(/^.*?:\s*/, "") };
  return { ok: true };
}

// Admin-only: set or rotate the passcode staff use to self-claim access.
// The RPC re-checks is_admin() itself, so this is safe to expose to any
// signed-in caller — it will simply fail for a non-admin.
export async function setStaffSignupCode(code) {
  if (!SUPABASE_READY || !supabase) return { ok: false, error: "Not connected." };
  const { error } = await supabase.rpc("set_staff_signup_code", { p_code: code });
  if (error) return { ok: false, error: error.message.replace(/^.*?:\s*/, "") };
  return { ok: true };
}

// Admin-only: whether a passcode is currently set, and when/by whom it was
// last changed — never the code or its hash.
// code_plain exists so an admin can view the live passcode, not just rotate
// it blind. It's readable only under the same is_admin()-gated RLS as the
// rest of this row — see the staff_signup_code_recoverable migration for
// the trade-off that creates versus the original hash-only design.
export function useStaffSignupCodeStatus() {
  const [status, setStatus] = useState(null); // { set, code, updatedBy, updatedAt } | null while loading

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) { setStatus({ set: false }); return; }
    supabase.from("staff_signup_code").select("code_plain, updated_by, updated_at").eq("id", 1).maybeSingle()
      .then(({ data }) => setStatus({ set: !!data, code: data?.code_plain, updatedBy: data?.updated_by, updatedAt: data?.updated_at }));
  }, []);

  return status;
}

// ─── Hall pass stats & per-student limits ──────────────────────────
// my_pass_stats returns aggregate numbers about the CALLER only (today /
// week counts, rank, any limits) — it never exposes another student.
export async function getMyPassStats() {
  if (!SUPABASE_READY || !supabase) return null;
  const { data } = await supabase.rpc("my_pass_stats");
  return data?.found ? data : null;
}

// Staff-only (RLS): one student's full pass history, newest first.
export async function getStudentPassHistory(studentId, limit = 60) {
  if (!SUPABASE_READY || !supabase) return [];
  const { data } = await supabase.from("hall_pass_log")
    .select("*").eq("student_id", studentId)
    .order("out_time", { ascending: false }).limit(limit);
  return data || [];
}

// Staff-only (RLS): read/save a student's pass restrictions.
export async function getPassLimits(studentId) {
  if (!SUPABASE_READY || !supabase) return null;
  const { data } = await supabase.from("hall_pass_student_limits")
    .select("*").eq("student_id", studentId).maybeSingle();
  return data;
}

export async function savePassLimits(studentId, { dailyMax, allowedPeriods, note }, updatedBy) {
  if (!SUPABASE_READY || !supabase) return { ok: false, error: "Not connected." };
  const row = {
    student_id: studentId,
    daily_max: dailyMax ?? null,
    allowed_periods: allowedPeriods?.length ? allowedPeriods : null,
    note: note?.trim() || null,
    updated_by: updatedBy || null,
    updated_at: new Date().toISOString(),
  };
  // No restrictions at all -> remove the row entirely rather than keeping
  // an empty one around.
  if (row.daily_max == null && !row.allowed_periods && !row.note) {
    const { error } = await supabase.from("hall_pass_student_limits").delete().eq("student_id", studentId);
    return error ? { ok: false, error: error.message } : { ok: true, cleared: true };
  }
  const { error } = await supabase.from("hall_pass_student_limits")
    .upsert(row, { onConflict: "student_id" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ─── Student Hall Pass (self-service) ──────────────────────────────
// Powers the student-facing "Hall Pass" tab: request a pass, watch it go
// pending -> active as a teacher approves it, sign back in when done.
// All writes route through SECURITY DEFINER RPCs (see the
// student_hall_pass_self_service migration) — this hook never inserts or
// updates hall_passes directly, only reads the caller's own row and calls
// the RPC for every mutation, so the anti-cheat checks live in one place.
export function useStudentHallPass(user) {
  const [myStudentRow, setMyStudentRow] = useState(null); // school-wide roster row, or null
  const [myPass, setMyPass] = useState(null);              // own pending/active row, or null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !user?.email) { setLoading(false); return; }
    let active = true;

    async function load() {
      const [{ data: srow }, { data: prow }] = await Promise.all([
        supabase.from("students").select("*").eq("student_email", user.email).maybeSingle(),
        supabase.from("hall_passes").select("*").eq("student_email", user.email).maybeSingle(),
      ]);
      if (!active) return;
      setMyStudentRow(srow || null);
      setMyPass(prow ? rowToPass(prow) : null);
      setLoading(false);
    }
    load();

    // Realtime: a teacher approving/denying elsewhere should update this
    // student's screen without a refresh.
    const channel = supabase
      .channel(`student-hallpass-${user.email}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hall_passes", filter: `student_email=eq.${user.email}` }, load)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [user?.email]);

  async function requestPass(destination, teacherEmail) {
    setError("");
    if (!SUPABASE_READY || !supabase) return false;
    const { error: err } = await supabase.rpc("student_request_pass", {
      p_destination: destination,
      p_teacher_email: teacherEmail || null,
    });
    if (err) { setError(err.message.replace(/^.*?:\s*/, "")); return false; }
    return true;
  }

  async function returnFromPass() {
    setError("");
    if (!myPass || !SUPABASE_READY || !supabase) return false;
    const { error: err } = await supabase.rpc("student_return_pass", { p_pass_id: myPass.id });
    if (err) { setError(err.message.replace(/^.*?:\s*/, "")); return false; }
    return true;
  }

  async function cancelRequest() {
    setError("");
    if (!myPass || !SUPABASE_READY || !supabase) return false;
    const { error: err } = await supabase.rpc("student_cancel_pass_request", { p_pass_id: myPass.id });
    if (err) { setError(err.message.replace(/^.*?:\s*/, "")); return false; }
    return true;
  }

  return { myStudentRow, myPass, loading, error, requestPass, returnFromPass, cancelRequest };
}

// ─── Room Passes ──────────────────────────────────────────────────
// Separate from hall passes — sending a student to a teacher's room.
// Does not count toward the hall pass limit.
const ROOM_PASS_REASONS = ["Extra Help", "Makeup Test", "Finish Lab", "Late Pass", "Other"];
export { ROOM_PASS_REASONS };

export function useRoomPasses(userEmail) {
  const [passes, setPasses] = useState([]);

  const load = useCallback(async () => {
    if (!SUPABASE_READY || !supabase) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const { data } = await supabase
      .from("room_passes")
      .select("*")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });
    setPasses(data || []);
  }, []);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    load();

    // Realtime is a supplementary sync for other kiosks/tabs — see
    // useSharedHallPasses above for why a write also reloads immediately
    // rather than waiting on this channel to round-trip back.
    const channel = supabase
      .channel("room-passes-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "room_passes" }, load)
      .subscribe();

    const pollId = setInterval(load, 20000);

    return () => { clearInterval(pollId); supabase.removeChannel(channel); };
  }, [load]);

  const sentByMe   = passes.filter(p => p.from_email === userEmail);
  const sentToMe   = passes.filter(p => p.to_email   === userEmail);

  async function sendPass({ studentId, studentName, toTeacher, reason, fromTeacher, fromEmail, fromRoom }) {
    if (!SUPABASE_READY || !supabase) {
      setPasses(prev => [{
        id: Date.now().toString(), student_id: studentId, student_name: studentName,
        from_teacher: fromTeacher, from_email: fromEmail, from_room: fromRoom,
        to_teacher: toTeacher.name, to_email: toTeacher.email,
        reason, status: "pending", created_at: new Date().toISOString(),
      }, ...prev]);
      return;
    }
    await supabase.from("room_passes").insert({
      student_id: studentId, student_name: studentName,
      from_teacher: fromTeacher, from_email: fromEmail, from_room: fromRoom,
      to_teacher: toTeacher.name, to_email: toTeacher.email,
      reason, status: "pending",
    });
    await load();
  }

  async function markArrived(id) {
    if (!SUPABASE_READY || !supabase) {
      setPasses(p => p.map(x => x.id === id ? { ...x, status: "arrived" } : x));
      return;
    }
    await supabase.from("room_passes").update({ status: "arrived" }).eq("id", id);
    await load();
  }

  async function dismiss(id) {
    if (!SUPABASE_READY || !supabase) {
      setPasses(p => p.map(x => x.id === id ? { ...x, status: "dismissed" } : x));
      return;
    }
    await supabase.from("room_passes").update({ status: "dismissed" }).eq("id", id);
    await load();
  }

  const allActive = passes.filter(p => p.status === "pending" || p.status === "arrived");
  return { sentByMe, sentToMe, allActive, sendPass, markArrived, dismiss };
}

// ─── Late Arrivals ────────────────────────────────────────────────
// Students arriving after 7:45 AM sign in at the office.
// All teachers see the entry in real-time and can confirm the student entered.
//
// SQL to run in Supabase:
//   create table public.late_arrivals (
//     id           uuid primary key default gen_random_uuid(),
//     student_id   text not null,
//     student_name text not null,
//     arrived_at   timestamptz not null default now(),
//     confirmed_by text,
//     confirmed_at timestamptz,
//     notes        text
//   );
//   alter table public.late_arrivals enable row level security;
//   create policy "staff read"   on public.late_arrivals for select using (public.is_staff());
//   create policy "staff insert" on public.late_arrivals for insert with check (public.is_staff());
//   create policy "staff update" on public.late_arrivals for update using (public.is_staff());
export function useLateArrivals() {
  const [arrivals, setArrivals] = useState([]);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    let active = true;

    async function load() {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("late_arrivals")
        .select("*")
        .gte("arrived_at", today.toISOString())
        .order("arrived_at", { ascending: false });
      if (!active) return;
      setArrivals(data || []);
    }
    load();

    const channel = supabase
      .channel("late-arrivals-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "late_arrivals" }, load)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  async function logArrival({ studentId, studentName, notes }) {
    const optimistic = {
      id: `opt-${Date.now()}`, student_id: studentId, student_name: studentName,
      arrived_at: new Date().toISOString(), confirmed_by: null, confirmed_at: null, notes: notes || null,
    };
    setArrivals(prev => [optimistic, ...prev]);
    if (!SUPABASE_READY || !supabase) return;
    const { data } = await supabase.from("late_arrivals").insert({
      student_id: studentId, student_name: studentName, notes: notes || null,
    }).select("*").single();
    // Replace optimistic row with the real DB row (gets the real UUID)
    if (data) setArrivals(prev => prev.map(a => a.id === optimistic.id ? data : a));
  }

  async function confirmArrival(id, teacherName) {
    const now = new Date().toISOString();
    setArrivals(prev => prev.map(a => a.id === id ? { ...a, confirmed_by: teacherName, confirmed_at: now } : a));
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("late_arrivals").update({
      confirmed_by: teacherName, confirmed_at: new Date().toISOString(),
    }).eq("id", id);
  }

  return { arrivals, logArrival, confirmArrival };
}

// ─── G-Men Period ───────────────────────────────────────────────────────────

export async function isStaffEmail(email) {
  if (!SUPABASE_READY || !supabase) return { isStaff: false, isAdmin: false };
  // Try with is_admin first; fall back to email-only if column doesn't exist yet
  const { data, error } = await supabase
    .from("staff_directory")
    .select("email, is_admin")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    // is_admin column likely not added yet — fall back to existence check only
    const { data: d2 } = await supabase
      .from("staff_directory")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    return { isStaff: !!d2, isAdmin: false };
  }
  return { isStaff: !!data, isAdmin: !!data?.is_admin };
}

export function useAdminStaff() {
  const [staffList, setStaffList] = useState([]);

  function reload() {
    if (!SUPABASE_READY || !supabase) return;
    supabase.from("staff_directory").select("*").order("name").then(({ data }) => {
      if (data) setStaffList(data);
    });
  }

  useEffect(reload, []);

  async function toggleAdmin(email, value) {
    setStaffList(prev => prev.map(s => s.email === email ? { ...s, is_admin: value } : s));
    if (!SUPABASE_READY || !supabase) return;
    const { error } = await supabase.from("staff_directory").update({ is_admin: value }).eq("email", email);
    // The last-admin trigger can reject this — resync from the server so a
    // rejected demote doesn't leave the UI showing a state that didn't stick.
    if (error) { reload(); return { ok: false, error: error.message.replace(/^.*?:\s*/, "") }; }
    return { ok: true };
  }

  // Admin-only per RLS (see admin_only_staff_directory_management) — this
  // will fail server-side for anyone else even if somehow called.
  async function addStaffMember(email, name) {
    if (!SUPABASE_READY || !supabase) return { ok: false, error: "Not connected." };
    const clean = (email || "").trim().toLowerCase();
    if (!clean.endsWith("@jagschools.org")) return { ok: false, error: "Must be a @jagschools.org address." };
    const { data, error } = await supabase.from("staff_directory")
      .insert({ email: clean, name: (name || "").trim() || clean.split("@")[0] })
      .select("*").single();
    if (error) return { ok: false, error: error.message.replace(/^.*?:\s*/, "") };
    setStaffList(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { ok: true };
  }

  async function removeStaffMember(email) {
    if (!SUPABASE_READY || !supabase) return { ok: false, error: "Not connected." };
    const { error } = await supabase.from("staff_directory").delete().eq("email", email);
    // The last-admin trigger blocks removing the sole admin — surface that
    // instead of silently leaving a stale row in the UI.
    if (error) return { ok: false, error: error.message.replace(/^.*?:\s*/, "") };
    setStaffList(prev => prev.filter(s => s.email !== email));
    return { ok: true };
  }

  return { staffList, toggleAdmin, addStaffMember, removeStaffMember };
}

// Admin-only (RLS): who has tried to self-claim staff access via the
// passcode, and whether it succeeded — the audit trail for that flow.
export function useStaffSignupAttempts() {
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    supabase.from("staff_signup_attempts").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setAttempts(data || []));
  }, []);

  return attempts;
}

export function useGmenSettings() {
  const [settings, setSettings] = useState({
    enrollment_open: false, active_period: 1,
    period_1_end: null, period_2_end: null, period_3_end: null, period_4_end: null,
  });

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    supabase.from("gmen_settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) setSettings(data);
    });
    const ch = supabase.channel("gmen_settings_ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "gmen_settings" }, ({ new: row }) => {
        if (row) setSettings(row);
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function setEnrollmentOpen(open, userEmail) {
    setSettings(s => ({ ...s, enrollment_open: open }));
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_settings").update({
      enrollment_open: open, updated_at: new Date().toISOString(), updated_by: userEmail,
    }).eq("id", 1);
  }

  async function setActivePeriod(period, userEmail) {
    setSettings(s => ({ ...s, active_period: period }));
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_settings").update({
      active_period: period, updated_at: new Date().toISOString(), updated_by: userEmail,
    }).eq("id", 1);
  }

  async function setPeriodEndDate(period, date, userEmail) {
    setSettings(s => ({ ...s, [`period_${period}_end`]: date || null }));
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_settings").update({
      [`period_${period}_end`]: date || null,
      updated_at: new Date().toISOString(), updated_by: userEmail,
    }).eq("id", 1);
  }

  return { settings, setEnrollmentOpen, setActivePeriod, setPeriodEndDate };
}

// ─── Bell Schedule ───────────────────────────────────────────────────────────
// Single-row table (id=1) with a JSONB `schedules` object:
//   { twt: [...], mf: [...] }  each array: { name, start, end }  (24h HH:MM)
const toMin = (s) => {
  if (!s || !s.includes(":")) return null;
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

function daySchedule(schedules) {
  const key = todayScheduleKey();
  return key ? (schedules?.[key] || []) : [];
}

// Which schedule key is active today: "twt" (Tue/Wed/Thu), "mf" (Mon/Fri),
// or null on weekends — there is no bell schedule at all on Sat/Sun.
export function todayScheduleKey(at = new Date()) {
  const dow = at.getDay(); // 0=Sun,1=Mon,...,5=Fri,6=Sat
  if (dow === 0 || dow === 6) return null;
  return (dow === 2 || dow === 3 || dow === 4) ? "twt" : "mf";
}

// Local YYYY-MM-DD (not UTC — toISOString() would shift the date after 8pm ET).
export function localYMD(at = new Date()) {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
}

// Is the given day a no-school day per the posted school calendar? Returns the
// matching event, or null. Holidays and anything explicitly flagged "No School"
// (breaks, records days, conference credit days) count.
export function noSchoolDay(weeklyEvents, at = new Date()) {
  const ymd = localYMD(at);
  return (weeklyEvents || []).find(e =>
    e.date === ymd && (e.type === "Holiday" || /no school/i.test(e.title || ""))
  ) || null;
}

// Pure helper: which period (if any) contains the given time?
export function periodForTime(periods, at = new Date()) {
  if (!periods?.length) return null;
  const d = at instanceof Date ? at : new Date(at);
  const mins = d.getHours() * 60 + d.getMinutes();
  return periods.find(p => {
    const s = toMin(p.start), e = toMin(p.end);
    return s != null && e != null && mins >= s && mins < e;
  }) || null;
}

// Pure helper: the real Date/time a hall pass's period ends, given when the
// student signed out — i.e. `outTime`'s own calendar date at that period's
// end clock-time, not "today". Used to auto-return a forgotten hall pass
// once its period is over, even if the pass has been sitting open since a
// previous day. Returns null when outTime doesn't fall inside any period.
export function periodEndDateTime(outTimeRaw, periods) {
  const period = periodForTime(periods, outTimeRaw);
  if (!period) return null;
  const endMin = toMin(period.end);
  if (endMin == null) return null;
  const out = outTimeRaw?.toDate ? outTimeRaw.toDate() : new Date(outTimeRaw);
  const end = new Date(out);
  end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
  return end;
}

// Pure helper: current period status — in a period, before the next, or after the day.
export function currentPeriodInfo(periods, at = new Date()) {
  if (!periods?.length) return null;
  const d = at instanceof Date ? at : new Date(at);
  const mins = d.getHours() * 60 + d.getMinutes();
  const sorted = [...periods]
    .filter(p => toMin(p.start) != null && toMin(p.end) != null)
    .sort((a, b) => toMin(a.start) - toMin(b.start));
  if (!sorted.length) return null;
  for (const p of sorted) {
    const s = toMin(p.start), e = toMin(p.end);
    if (mins >= s && mins < e) return { status: "in", period: p, remaining: e - mins };
    if (mins < s) return { status: "before", next: p, until: s - mins };
  }
  return { status: "after" };
}

const DEFAULT_TWT = [
  { name: "1st Period",       start: "07:45", end: "08:33" },
  { name: "2nd Period",       start: "08:37", end: "09:22" },
  { name: "3rd Period",       start: "09:26", end: "10:11" },
  { name: "4th G-Men Time",   start: "10:15", end: "10:47" },
  { name: "5th Period",       start: "10:51", end: "11:21" },
  { name: "6th Period",       start: "11:25", end: "11:36" },
  { name: "7th Period-Lunch", start: "11:40", end: "12:10" },
  { name: "8th Period",       start: "12:14", end: "12:25" },
  { name: "9th Period-Lunch", start: "12:29", end: "12:59" },
  { name: "10th Period",      start: "13:03", end: "13:48" },
  { name: "11th Period",      start: "13:52", end: "14:37" },
];

const DEFAULT_MF = [
  { name: "1st Period",       start: "07:45", end: "08:38" },
  { name: "2nd Period",       start: "08:42", end: "09:32" },
  { name: "3rd Period",       start: "09:36", end: "10:26" },
  { name: "5th Period",       start: "10:30", end: "11:00" },
  { name: "6th Period",       start: "11:04", end: "11:20" },
  { name: "7th Period-Lunch", start: "11:24", end: "11:54" },
  { name: "8th Period",       start: "11:58", end: "12:14" },
  { name: "9th Period-Lunch", start: "12:18", end: "12:48" },
  { name: "10th Period",      start: "12:52", end: "13:42" },
  { name: "11th Period",      start: "13:46", end: "14:37" },
];

export function useBellSchedule() {
  const [schedules, setSchedules] = useState({ twt: DEFAULT_TWT, mf: DEFAULT_MF });

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    supabase.from("bell_schedule").select("schedules").eq("id", 1).single().then(({ data }) => {
      if (data?.schedules) setSchedules(data.schedules);
    });
    const ch = supabase.channel("bell_schedule_ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "bell_schedule" }, ({ new: row }) => {
        if (row?.schedules) setSchedules(row.schedules);
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // The schedule for today based on day of week — memoized so consumers
  // that use it as an effect dependency (e.g. the hall pass auto-return
  // check) don't re-run on every unrelated render.
  const periodsToday = useMemo(() => daySchedule(schedules), [schedules]);

  async function saveSchedule(key, periods, userEmail) {
    const next = { ...schedules, [key]: periods };
    setSchedules(next);
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("bell_schedule").update({
      schedules: next, updated_at: new Date().toISOString(), updated_by: userEmail,
    }).eq("id", 1);
  }

  return { schedules, periodsToday, saveSchedule };
}

// ─── Gmail Send (GIS incremental auth) ───────────────────────────────────────
export function useGmailSend() {
  async function requestGmailToken() {
    await loadGIS();
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error("VITE_GOOGLE_CLIENT_ID is not set.");
    return new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/gmail.send",
        callback: response => {
          if (response.error) reject(new Error(response.error_description || response.error));
          else resolve(response.access_token);
        },
      });
      client.requestAccessToken({ prompt: "" });
    });
  }

  // Encode a simple email as base64url RFC 2822 message
  function buildRawEmail({ to, from, subject, body }) {
    const msg = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      body,
    ].join("\r\n");
    return btoa(unescape(encodeURIComponent(msg)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async function sendEmail(token, { to, from, subject, body }) {
    const raw = buildRawEmail({ to, from, subject, body });
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gmail API error ${res.status}`);
    }
    return res.json();
  }

  return { requestGmailToken, sendEmail };
}

export function useGmenClasses() {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    supabase.from("gmen_classes").select("*").order("created_at").then(({ data }) => {
      if (data) setClasses(data);
    });
    const ch = supabase.channel("gmen_classes_ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "gmen_classes" }, () => {
        supabase.from("gmen_classes").select("*").order("created_at").then(({ data }) => {
          if (data) setClasses(data);
        });
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function addGmenClass(fields) {
    if (!SUPABASE_READY || !supabase) return;
    const { data, error } = await supabase.from("gmen_classes").insert([fields]).select().single();
    if (!error && data) setClasses(prev => [...prev, data]);
    return { data, error };
  }

  async function updateGmenClass(id, fields) {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_classes").update(fields).eq("id", id);
  }

  async function deleteGmenClass(id) {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_classes").delete().eq("id", id);
  }

  async function toggleOpen(id, isOpen) {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_classes").update({ is_open: isOpen }).eq("id", id);
  }

  return { classes, addGmenClass, updateGmenClass, deleteGmenClass, toggleOpen };
}

export function useGmenEnrollments(period) {
  const [enrollments, setEnrollments] = useState([]);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !period) return;
    supabase.from("gmen_enrollments").select("*").eq("grading_period", period).then(({ data }) => {
      if (data) setEnrollments(data);
    });
    const ch = supabase.channel(`gmen_enrollments_${period}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "gmen_enrollments",
        filter: `grading_period=eq.${period}` }, () => {
        supabase.from("gmen_enrollments").select("*").eq("grading_period", period).then(({ data }) => {
          if (data) setEnrollments(data);
        });
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [period]);

  // studentId is optional — pass it when the caller already has it (e.g. from
  // the shared students list) to skip the lookup; otherwise it's resolved by
  // email. gmen_enrollments.student_id is nullable, so a student not yet on
  // the roster (or an unresolved lookup) still enrolls rather than failing.
  // This is a direct, unchecked placement — a teacher or admin putting a
  // specific student in a specific class. A student choosing their own class
  // goes through enroll_gmen below instead, which is the one that enforces
  // seats atomically and hides the teacher until after assignment.
  async function enroll(studentEmail, studentName, classId, gradingPeriod, studentId = null) {
    if (!SUPABASE_READY || !supabase) return { error: "Supabase not ready" };
    let resolvedId = studentId;
    if (!resolvedId) {
      const { data: stu } = await supabase.from("students").select("id").eq("student_email", studentEmail).maybeSingle();
      resolvedId = stu?.id || null;
    }
    const { data, error } = await supabase.from("gmen_enrollments").insert([{
      student_id: resolvedId,
      student_email: studentEmail, student_name: studentName,
      class_id: classId, grading_period: gradingPeriod, choice_rank: "admin",
    }]).select().single();
    return { data, error };
  }

  // Self-service signup: first choice, then second, then the period's
  // Commons/overflow class — decided and written atomically inside the RPC,
  // never by reading enrollments client-side (see gmen_claim_seat). Also
  // backfills the student's email onto their roster row on a unique name
  // match when they aren't found by email yet, so the ~300 students whose
  // roster row predates emails don't need any separate fix-up step —
  // signing up is what resolves it, once, the first time they do.
  // profile: { givenName, familyName, fullName } — from user.user_metadata.
  async function enrollGmen(choiceAId, choiceBId, profile = {}) {
    if (!SUPABASE_READY || !supabase) return { data: null, error: { message: "Supabase not ready" } };
    const { data, error } = await supabase.rpc("enroll_gmen", {
      p_choice_a: choiceAId,
      p_choice_b: choiceBId || null,
      p_given_name: profile.givenName || null,
      p_family_name: profile.familyName || null,
      p_full_name: profile.fullName || null,
    });
    return { data: data?.[0] || null, error };
  }

  // Staff-only. Seeds every student with an email on file and no enrollment
  // yet this period into the period's Commons/default class. Safe to run
  // more than once — see gmen_seed_period's own comment.
  async function seedPeriod() {
    if (!SUPABASE_READY || !supabase) return { count: 0, error: { message: "Supabase not ready" } };
    const { data, error } = await supabase.rpc("gmen_seed_period", { p_period: period });
    return { count: data ?? 0, error };
  }

  async function unenroll(studentEmail, gradingPeriod) {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_enrollments")
      .delete()
      .eq("student_email", studentEmail)
      .eq("grading_period", gradingPeriod);
  }

  function seatCount(classId) {
    return enrollments.filter(e => e.class_id === classId).length;
  }

  async function adminMoveStudent(studentEmail, toClassId, gradingPeriod) {
    if (!SUPABASE_READY || !supabase) {
      setEnrollments(prev => prev.map(e =>
        e.student_email === studentEmail && e.grading_period === gradingPeriod
          ? { ...e, class_id: toClassId } : e
      ));
      return { error: null };
    }
    const { data, error } = await supabase
      .from("gmen_enrollments")
      .update({ class_id: toClassId })
      .eq("student_email", studentEmail)
      .eq("grading_period", gradingPeriod)
      .select().single();
    return { data, error };
  }

  return { enrollments, enroll, enrollGmen, seedPeriod, unenroll, seatCount, adminMoveStudent };
}

// Bulk-enroll for the class roster import. Upsert with ignoreDuplicates
// leans on the (student_email, grading_period) unique constraint: a student
// who already has an enrollment this period is left untouched rather than
// moved, so re-importing the same sheet is always safe.
export async function bulkEnrollGmen(rows) {
  if (!SUPABASE_READY || !supabase || !rows.length) return { added: 0, error: null };
  const { data, error } = await supabase.from("gmen_enrollments")
    .upsert(rows, { onConflict: "student_email,grading_period", ignoreDuplicates: true })
    .select("id");
  return { added: data?.length ?? 0, error };
}

export function useGmenChangeRequests() {
  const [changeRequests, setChangeRequests] = useState([]);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    supabase.from("gmen_change_requests").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setChangeRequests(data);
    });
    const ch = supabase.channel("gmen_change_requests_ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "gmen_change_requests" }, () => {
        supabase.from("gmen_change_requests").select("*").order("created_at", { ascending: false }).then(({ data }) => {
          if (data) setChangeRequests(data);
        });
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function requestChange(studentEmail, studentName, fromClassId, toClassId, gradingPeriod) {
    if (!SUPABASE_READY || !supabase) return { error: "Supabase not ready" };
    const { data, error } = await supabase.from("gmen_change_requests").insert([{
      student_email: studentEmail, student_name: studentName,
      from_class_id: fromClassId, to_class_id: toClassId,
      grading_period: gradingPeriod, status: "pending",
    }]).select().single();
    return { data, error };
  }

  async function approveChange(requestId, reviewerName) {
    if (!SUPABASE_READY || !supabase) return;
    const req = changeRequests.find(r => r.id === requestId);
    if (!req) return;
    // Swap enrollment
    await supabase.from("gmen_enrollments")
      .update({ class_id: req.to_class_id })
      .eq("student_email", req.student_email)
      .eq("grading_period", req.grading_period);
    await supabase.from("gmen_change_requests").update({
      status: "approved", reviewed_by: reviewerName,
    }).eq("id", requestId);
  }

  async function denyChange(requestId, reviewerName) {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_change_requests").update({
      status: "denied", reviewed_by: reviewerName,
    }).eq("id", requestId);
  }

  return { changeRequests, requestChange, approveChange, denyChange };
}

// ─── G-Men Attendance (Phase 2) ───────────────────────────────────────────
// Table: gmen_attendance — one row per student per day, whichever class
// actually marks them (see the migration's own comment for why). Scoped to
// "today" and the active grading period — the only window either a
// teacher's own roster or the admin compliance view ever needs. "Today" is
// computed from the browser's local calendar day (not UTC) and sent
// explicitly on every write, so what gets queried always matches what got
// stored regardless of the Postgres server's own timezone.
export function useGmenAttendance(period) {
  const [records, setRecords] = useState([]);
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !period) return;
    let active = true;
    function load() {
      supabase.from("gmen_attendance").select("*")
        .eq("grading_period", period).eq("date", today)
        .then(({ data }) => { if (active && data) setRecords(data); });
    }
    load();
    const ch = supabase.channel(`gmen_attendance_${period}_${today}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "gmen_attendance",
        filter: `grading_period=eq.${period}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [period, today]);

  function recordsForClass(classId) {
    return records.filter(r => r.class_id === classId);
  }

  // "Submitted" means at least one record exists for that class today —
  // the whole roster is written in one batch, so partial submission isn't
  // a state this needs to represent.
  function hasSubmitted(classId) {
    return records.some(r => r.class_id === classId);
  }

  // entries: [{ studentId, status }]. One upsert for the whole roster — the
  // point of "one Submit stamps the whole roster in a single batch write."
  // Re-submitting (a correction) overwrites in place via the (date,
  // student_id) unique constraint rather than creating duplicate rows.
  async function submitAttendance(classId, entries, markedByEmail) {
    if (!SUPABASE_READY || !supabase) return { error: { message: "Supabase not ready" } };
    if (!entries.length) return { error: null };
    const rows = entries.map(e => ({
      student_id: e.studentId, class_id: classId, grading_period: period,
      status: e.status, marked_by: markedByEmail, date: today,
    }));
    const { error } = await supabase.from("gmen_attendance")
      .upsert(rows, { onConflict: "date,student_id" });
    return { error };
  }

  return { records, recordsForClass, hasSubmitted, submitAttendance };
}

// ─── G-Men Enrichment Pulls (Phase 3) ─────────────────────────────────────
// Table: gmen_pull_requests — supersedes gmen_requests, which matched
// students by comparing name strings and had no lifecycle beyond a single
// "arrived" boolean. gmen_requests is left in place (table untouched,
// dropping it is a later follow-up); nothing in the app calls this table's
// old hook anymore after Phase 3.
//
// Scoped to today only, building-wide (not filtered by requester) — the
// kiosk and the Dashboard widget both need everyone's pulls; each surface
// that only wants its own filters requests itself (e.g. by
// requested_by_email for a teacher's own board).
export function useGmenPullRequests() {
  const [requests, setRequests] = useState([]);
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    let active = true;
    function load() {
      supabase.from("gmen_pull_requests").select("*")
        .eq("date", today).order("created_at", { ascending: true })
        .then(({ data }) => { if (active && data) setRequests(data); });
    }
    load();
    const ch = supabase.channel(`gmen_pull_requests_${today}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "gmen_pull_requests" }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [today]);

  function pullsForStudent(studentId) {
    return requests.filter(r => r.student_id === studentId);
  }

  async function requestPull({ studentId, studentName, requestedByEmail, requestedByName, toClassId, toRoom, reason }) {
    if (!SUPABASE_READY || !supabase) return { data: null, error: { message: "Supabase not ready" } };
    const { data, error } = await supabase.from("gmen_pull_requests").insert([{
      student_id: studentId, student_name: studentName,
      requested_by_email: requestedByEmail, requested_by_name: requestedByName,
      to_class_id: toClassId || null, to_room: toRoom || null, reason: reason || null,
    }]).select().single();
    return { data, error };
  }

  // Home teacher confirms: the student is actually being sent. Attendance
  // (status 'pulled') is written separately by the caller, since that needs
  // the home teacher's own class id, which this hook doesn't know.
  async function markSent(pullId, sentByEmail) {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_pull_requests").update({
      status: "sent", sent_by: sentByEmail, sent_at: new Date().toISOString(),
    }).eq("id", pullId);
  }

  async function markArrived(pullId) {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_pull_requests").update({
      status: "arrived", arrived_at: new Date().toISOString(),
    }).eq("id", pullId);
  }

  async function markNoShow(pullId) {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_pull_requests").update({ status: "no_show" }).eq("id", pullId);
  }

  async function declinePull(pullId) {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_pull_requests").update({ status: "declined" }).eq("id", pullId);
  }

  return { requests, pullsForStudent, requestPull, markSent, markArrived, markNoShow, declinePull };
}

// ─── Gradebook ───────────────────────────────────────────────────────────────
export function useGradebook(teacherEmail) {
  const [assignments, setAssignments] = useState(() => !SUPABASE_READY ? SEED_GRADEBOOK_ASSIGNMENTS : []);
  const [grades, setGrades] = useState(() => !SUPABASE_READY ? SEED_GRADEBOOK_GRADES : []);
  const [profiles, setProfiles] = useState(() => !SUPABASE_READY ? [SEED_GRADEBOOK_PROFILE] : []);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !teacherEmail) return;
    let active = true;

    async function load() {
      const [a, g, p, s] = await Promise.all([
        supabase.from("gradebook_assignments").select("*").eq("teacher_email", teacherEmail).order("created_at"),
        supabase.from("gradebook_grades").select("*").eq("teacher_email", teacherEmail),
        supabase.from("gradebook_profiles").select("*").eq("teacher_email", teacherEmail).order("created_at"),
        supabase.from("gradebook_settings").select("*").eq("teacher_email", teacherEmail).maybeSingle(),
      ]);
      if (!active) return;
      if (a.data) setAssignments(a.data);
      if (g.data) setGrades(g.data);
      if (p.data) setProfiles(p.data);
      setSettings(s.data || null);
    }

    load();
    const ch = supabase.channel("gradebook_" + teacherEmail)
      .on("postgres_changes", { event: "*", schema: "public", table: "gradebook_assignments", filter: `teacher_email=eq.${teacherEmail}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "gradebook_grades",      filter: `teacher_email=eq.${teacherEmail}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "gradebook_profiles",    filter: `teacher_email=eq.${teacherEmail}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "gradebook_settings",    filter: `teacher_email=eq.${teacherEmail}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [teacherEmail]);

  // ── Assignments ──────────────────────────────────────────────────────────
  async function addAssignment(data) {
    const row = { ...data, teacher_email: teacherEmail };
    if (!SUPABASE_READY || !supabase) {
      const opt = { id: `opt-${Date.now()}`, ...row, created_at: new Date().toISOString() };
      setAssignments(prev => [...prev, opt]);
      return opt;
    }
    const { data: d } = await supabase.from("gradebook_assignments").insert(row).select("*").single();
    if (d) setAssignments(prev => [...prev, d]);
    return d;
  }

  async function updateAssignment(id, data) {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gradebook_assignments").update(data).eq("id", id);
  }

  async function deleteAssignment(id) {
    setAssignments(prev => prev.filter(a => a.id !== id));
    setGrades(prev => prev.filter(g => g.assignment_id !== id));
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gradebook_assignments").delete().eq("id", id);
  }

  // ── Grades ────────────────────────────────────────────────────────────────
  async function saveGrade(assignmentId, studentId, studentName, data) {
    const existing = grades.find(g => g.assignment_id === assignmentId && g.student_id === studentId);
    const row = {
      assignment_id: assignmentId, teacher_email: teacherEmail,
      student_id: studentId, student_name: studentName,
      graded_at: new Date().toISOString(), ...data,
    };
    if (existing) {
      setGrades(prev => prev.map(g => (g.assignment_id === assignmentId && g.student_id === studentId) ? { ...g, ...row } : g));
      if (!SUPABASE_READY || !supabase) return;
      await supabase.from("gradebook_grades").update(row).eq("id", existing.id);
    } else {
      const opt = { id: `opt-${Date.now()}`, ...row, created_at: new Date().toISOString() };
      setGrades(prev => [...prev, opt]);
      if (!SUPABASE_READY || !supabase) return;
      const { data: d } = await supabase.from("gradebook_grades").insert(row).select("*").single();
      if (d) setGrades(prev => prev.map(g => g.id === opt.id ? d : g));
    }
  }

  // ── Profiles ─────────────────────────────────────────────────────────────
  async function saveProfile(profile) {
    if (profile.id) {
      setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, ...profile } : p));
      if (!SUPABASE_READY || !supabase) return;
      await supabase.from("gradebook_profiles").update(profile).eq("id", profile.id);
    } else {
      const row = { ...profile, teacher_email: teacherEmail };
      const opt = { id: `opt-${Date.now()}`, ...row, created_at: new Date().toISOString() };
      setProfiles(prev => [...prev, opt]);
      if (!SUPABASE_READY || !supabase) return;
      const { data: d } = await supabase.from("gradebook_profiles").insert(row).select("*").single();
      if (d) setProfiles(prev => prev.map(p => p.id === opt.id ? d : p));
    }
  }

  async function setActiveProfile(profileId) {
    setProfiles(prev => prev.map(p => ({ ...p, is_active: p.id === profileId })));
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gradebook_profiles").update({ is_active: false }).eq("teacher_email", teacherEmail);
    await supabase.from("gradebook_profiles").update({ is_active: true }).eq("id", profileId);
  }

  async function deleteProfile(profileId) {
    setProfiles(prev => prev.filter(p => p.id !== profileId));
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gradebook_profiles").delete().eq("id", profileId);
  }

  // ── Settings ──────────────────────────────────────────────────────────────
  async function saveSettings(data) {
    const next = { ...settings, ...data, teacher_email: teacherEmail, updated_at: new Date().toISOString() };
    setSettings(next);
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gradebook_settings").upsert(next, { onConflict: "teacher_email" });
  }

  return {
    assignments, grades, profiles, settings,
    addAssignment, updateAssignment, deleteAssignment,
    saveGrade, saveProfile, setActiveProfile, deleteProfile,
    saveSettings,
  };
}

// ─── Gradebook Roster (per-teacher, table: gradebook_roster) ────────────────
// The Gradebook used to receive the entire shared `students` table with no
// per-teacher ownership. gradebook_roster is the join that scopes it: "this
// student is on this teacher's gradebook", with an optional per-teacher
// `section` label. A student can be on many teachers' rosters at once (they
// take multiple classes), so this is a join table, not a column on `students`.
//
// Every write here is additive or scoped to exactly one row:
//   - removeFromRoster deletes ONLY the join row — the shared student record
//     and every gradebook_grades row are untouched, so re-adding the student
//     brings their full grade history right back.
//   - syncFromClassroom only ever INSERTs new (teacher, student) pairs. It
//     never deletes a roster row and never reads or writes gradebook_grades,
//     so an existing student's scores can't be touched by a resync.
export function useGradebookRoster(teacherEmail) {
  const [roster, setRoster] = useState([]); // [{ id, teacher_email, student_id, section, source, created_at }]
  const [loading, setLoading] = useState(SUPABASE_READY);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !teacherEmail) { setLoading(false); return; }
    let active = true;

    async function load() {
      const { data } = await supabase.from("gradebook_roster").select("*").eq("teacher_email", teacherEmail);
      if (!active) return;
      setRoster(data || []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("gradebook_roster_" + teacherEmail)
      .on("postgres_changes", { event: "*", schema: "public", table: "gradebook_roster", filter: `teacher_email=eq.${teacherEmail}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [teacherEmail]);

  // Add one existing (shared-roster) student to this teacher's gradebook.
  async function addToRoster(studentId, section = null) {
    if (!teacherEmail) return;
    if (!SUPABASE_READY || !supabase) {
      setRoster(prev => prev.some(r => r.student_id === studentId) ? prev
        : [...prev, { id: `opt-${Date.now()}`, teacher_email: teacherEmail, student_id: studentId, section, source: "manual" }]);
      return;
    }
    const { data, error } = await supabase.from("gradebook_roster")
      .insert({ teacher_email: teacherEmail, student_id: studentId, section, source: "manual" })
      .select("*").single();
    if (error) {
      if (error.code === "23505") return; // already on roster — fine, nothing to do
      throw new Error(error.message);
    }
    setRoster(prev => [...prev, data]);
  }

  // Removes the student from THIS teacher's gradebook only. Never touches the
  // shared students table or any gradebook_grades row.
  async function removeFromRoster(studentId) {
    setRoster(prev => prev.filter(r => r.student_id !== studentId));
    if (!SUPABASE_READY || !supabase || !teacherEmail) return;
    await supabase.from("gradebook_roster").delete().eq("teacher_email", teacherEmail).eq("student_id", studentId);
  }

  // Move a student to a different class/section label on this teacher's roster.
  async function moveToSection(studentId, section) {
    setRoster(prev => prev.map(r => r.student_id === studentId ? { ...r, section } : r));
    if (!SUPABASE_READY || !supabase || !teacherEmail) return;
    await supabase.from("gradebook_roster").update({ section }).eq("teacher_email", teacherEmail).eq("student_id", studentId);
  }

  // Google Classroom roster sync: additive only, matched by student email.
  //   1. Any incoming student not already in the shared `students` table is
  //      created — existing students are matched, never modified.
  //   2. Any matched/created student not already on THIS teacher's roster is
  //      added, with `section` set only for the new row.
  // Existing roster rows (and whatever section a teacher manually set) are
  // left exactly as they are, and gradebook_grades is never read or written.
  // entries: [{ firstName, lastName, studentEmail, section }]
  async function syncFromClassroom(entries) {
    const withEmail = entries.filter(e => e.studentEmail);
    if (!teacherEmail || !withEmail.length) return { studentsCreated: 0, rosterAdded: 0, alreadyOnRoster: 0 };

    if (!SUPABASE_READY || !supabase) {
      const existingIds = new Set(roster.map(r => r.student_id));
      let rosterAdded = 0;
      const additions = [];
      for (const e of withEmail) {
        const id = `mock-${e.studentEmail}`;
        if (!existingIds.has(id)) {
          additions.push({ id: `opt-${Date.now()}-${id}`, teacher_email: teacherEmail, student_id: id, section: e.section || null, source: "classroom_sync" });
          rosterAdded++;
        }
      }
      setRoster(prev => [...prev, ...additions]);
      return { studentsCreated: 0, rosterAdded, alreadyOnRoster: withEmail.length - rosterAdded };
    }

    // 1. Match/create shared student rows by email.
    const emails = withEmail.map(e => e.studentEmail);
    const { data: existingStudents } = await supabase.from("students").select("id, student_email").in("student_email", emails);
    const idByEmail = new Map((existingStudents || []).map(r => [r.student_email, r.id]));

    // Anyone not matched by email might still already exist — e.g. from the
    // original roster import, which has no email on file yet. Match those by
    // name and backfill the email onto the existing row instead of inserting
    // a second row for the same real student: that's what previously left
    // the school with duplicate entries for ~80 students (same name, one row
    // with a grade and no email, one with an email and no grade) showing up
    // twice in the hall pass kiosk and elsewhere.
    let unmatched = withEmail.filter(e => !idByEmail.has(e.studentEmail));
    if (unmatched.length) {
      const { data: noEmailStudents } = await supabase.from("students").select("id, first_name, last_name").is("student_email", null);
      const nameKey = (f, l) => `${(f || "").trim().toLowerCase()}|${(l || "").trim().toLowerCase()}`;
      const idByName = new Map((noEmailStudents || []).map(r => [nameKey(r.first_name, r.last_name), r.id]));
      const backfills = [];
      unmatched = unmatched.filter(e => {
        const matchId = idByName.get(nameKey(e.firstName, e.lastName));
        if (!matchId) return true;
        backfills.push({ id: matchId, email: e.studentEmail });
        idByEmail.set(e.studentEmail, matchId);
        return false;
      });
      for (const b of backfills) {
        await supabase.from("students").update({ student_email: b.email }).eq("id", b.id);
      }
    }

    if (unmatched.length) {
      const { data: created, error } = await supabase.from("students").insert(
        unmatched.map(e => ({ first_name: e.firstName, last_name: e.lastName, student_email: e.studentEmail }))
      ).select("id, student_email");
      if (error) throw new Error(`Couldn't add new students: ${error.message}`);
      for (const row of created || []) idByEmail.set(row.student_email, row.id);
    }

    // 2. Add to this teacher's roster — only pairs not already there.
    const existingRosterIds = new Set(roster.map(r => r.student_id));
    const toAdd = withEmail
      .map(e => ({ studentId: idByEmail.get(e.studentEmail), section: e.section || null }))
      .filter(r => r.studentId && !existingRosterIds.has(r.studentId));
    let inserted = [];
    if (toAdd.length) {
      const { data, error } = await supabase.from("gradebook_roster").insert(
        toAdd.map(r => ({ teacher_email: teacherEmail, student_id: r.studentId, section: r.section, source: "classroom_sync" }))
      ).select("*");
      if (error) throw new Error(`Couldn't update your roster: ${error.message}`);
      inserted = data || [];
      setRoster(prev => [...prev, ...inserted]);
    }

    return {
      studentsCreated: unmatched.length,
      rosterAdded: inserted.length,
      alreadyOnRoster: withEmail.length - toAdd.length,
    };
  }

  return { roster, loading, addToRoster, removeFromRoster, moveToSection, syncFromClassroom };
}

// ─── Weekly Events (shared, Supabase-backed) ─────────────────────
// Table: weekly_events — school-wide list of drills, tests, trips, etc.
// Shown on the Dashboard ticker and managed on the Weekly Events tab.
// Falls back to seeded in-memory state when Supabase is not configured.
export function useWeeklyEvents() {
  const [events, setEvents] = useState(SUPABASE_READY ? [] : SEED_EVENTS);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("weekly_events")
        .select("*")
        .order("date", { ascending: true });
      if (!active) return;
      setEvents((data || []).map(r => ({
        id: r.id, type: r.type, title: r.title,
        date: r.date || "", time: r.time || "", details: r.details || "",
      })));
    }
    load();

    const ch = supabase.channel("weekly_events_ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_events" }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, []);

  async function addEvent(ev) {
    if (!SUPABASE_READY || !supabase) {
      setEvents(prev => [...prev, { id: Date.now().toString(), ...ev }]);
      return;
    }
    await supabase.from("weekly_events").insert({
      type: ev.type, title: ev.title,
      date: ev.date || null, time: ev.time || null, details: ev.details || null,
    });
    // Realtime INSERT triggers load() above.
  }

  async function removeEvent(id) {
    if (!SUPABASE_READY || !supabase) {
      setEvents(prev => prev.filter(e => e.id !== id));
      return;
    }
    await supabase.from("weekly_events").delete().eq("id", id);
  }

  return { events, addEvent, removeEvent };
}

// ─── Trip Rosters (shared, Supabase-backed) ──────────────────────
// Table: trip_rosters — field trips / early releases / athletic events with
// their student lists (stored as JSONB). Shown on the Dashboard ticker.
// Falls back to seeded in-memory state when Supabase is not configured.
export function useTripRosters() {
  const [rosters, setRosters] = useState(SUPABASE_READY ? [] : SEED_TRIPS);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("trip_rosters")
        .select("*")
        .order("date", { ascending: true });
      if (!active) return;
      setRosters((data || []).map(r => ({
        id: r.id, type: r.type, title: r.title, teacher: r.teacher || "",
        date: r.date || "", depart: r.depart || "", returnTime: r.return_time || "",
        notes: r.notes || "", students: r.students || [],
      })));
    }
    load();

    const ch = supabase.channel("trip_rosters_ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_rosters" }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, []);

  async function addRoster(r) {
    if (!SUPABASE_READY || !supabase) {
      setRosters(prev => [...prev, { id: Date.now().toString(), ...r }]);
      return;
    }
    await supabase.from("trip_rosters").insert({
      type: r.type, title: r.title, teacher: r.teacher || null,
      date: r.date || null, depart: r.depart || null, return_time: r.returnTime || null,
      notes: r.notes || null, students: r.students || [],
    });
  }

  async function removeRoster(id) {
    if (!SUPABASE_READY || !supabase) {
      setRosters(prev => prev.filter(t => t.id !== id));
      return;
    }
    await supabase.from("trip_rosters").delete().eq("id", id);
  }

  return { rosters, addRoster, removeRoster };
}

// ─── CEU Tracker (per-teacher, Supabase-backed) ──────────────────
// Two tables, both scoped to the signed-in teacher's email:
//   ceu_entries        — logged CEU hours toward license renewal
//   ceu_reimbursements — tuition reimbursement expenses
// Falls back to seeded in-memory state when Supabase is not configured.
export function useCeu(teacherEmail) {
  const [entries, setEntries] = useState(SUPABASE_READY ? [] : SEED_CEU);
  const [reimb, setReimb] = useState([]);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !teacherEmail) return;
    let active = true;

    async function load() {
      const [e, r] = await Promise.all([
        supabase.from("ceu_entries").select("*").eq("teacher_email", teacherEmail).order("entry_date"),
        supabase.from("ceu_reimbursements").select("*").eq("teacher_email", teacherEmail).order("created_at"),
      ]);
      if (!active) return;
      setEntries((e.data || []).map(row => ({
        id: row.id, name: row.name, hours: Number(row.hours), date: row.entry_date || "",
      })));
      setReimb((r.data || []).map(row => ({
        id: row.id, name: row.name, cost: Number(row.cost),
      })));
    }
    load();
    return () => { active = false; };
  }, [teacherEmail]);

  async function addEntry({ name, hours }) {
    const entry_date = new Date().toISOString().slice(0, 7);
    if (!SUPABASE_READY || !supabase) {
      setEntries(prev => [...prev, { id: Date.now().toString(), name, hours: Number(hours), date: entry_date }]);
      return;
    }
    const { data } = await supabase.from("ceu_entries")
      .insert({ teacher_email: teacherEmail, name, hours: Number(hours), entry_date })
      .select("*").single();
    if (data) setEntries(prev => [...prev, { id: data.id, name: data.name, hours: Number(data.hours), date: data.entry_date || "" }]);
  }

  async function removeEntry(id) {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("ceu_entries").delete().eq("id", id);
  }

  async function addReimb({ name, cost }) {
    if (!SUPABASE_READY || !supabase) {
      setReimb(prev => [...prev, { id: Date.now().toString(), name, cost: Number(cost) }]);
      return;
    }
    const { data } = await supabase.from("ceu_reimbursements")
      .insert({ teacher_email: teacherEmail, name, cost: Number(cost) })
      .select("*").single();
    if (data) setReimb(prev => [...prev, { id: data.id, name: data.name, cost: Number(data.cost) }]);
  }

  async function removeReimb(id) {
    setReimb(prev => prev.filter(r => r.id !== id));
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("ceu_reimbursements").delete().eq("id", id);
  }

  return { entries, reimb, addEntry, removeEntry, addReimb, removeReimb };
}

// ─── Field Trip Requests (per-teacher archive, Supabase-backed) ──
// Table: field_trip_requests — keeps a record of every submitted request so
// it survives a refresh and the teacher can see what they've sent.
export function useFieldTrips(teacherEmail) {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !teacherEmail) return;
    let active = true;
    supabase.from("field_trip_requests")
      .select("*").eq("teacher_email", teacherEmail)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (active) setTrips(data || []); });
    return () => { active = false; };
  }, [teacherEmail]);

  async function addTrip(form) {
    const row = {
      teacher_email: teacherEmail,
      destination: form.destination, trip_date: form.date || null,
      depart: form.depart || null, return_time: form.returnTime || null,
      grade: form.grade || null, student_count: form.students ? Number(form.students) : null,
      buses: form.buses === "Yes", needs_sub: form.sub === "Yes",
      chaperones: form.chaperones || null,
    };
    if (!SUPABASE_READY || !supabase) {
      setTrips(prev => [{ id: Date.now().toString(), ...row, created_at: new Date().toISOString() }, ...prev]);
      return;
    }
    const { data } = await supabase.from("field_trip_requests").insert(row).select("*").single();
    if (data) setTrips(prev => [data, ...prev]);
  }

  return { trips, addTrip };
}

// ─── Requisitions (per-teacher archive, Supabase-backed) ─────────
// Table: requisitions — stores the submitted cart (vendors/items) as JSONB so
// the request survives a refresh. Quote files are recorded by name only;
// uploading the binaries would require Supabase Storage (see SUPABASE_SETUP.md).
export function useRequisitions(teacherEmail) {
  const [requisitions, setRequisitions] = useState([]);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !teacherEmail) return;
    let active = true;
    supabase.from("requisitions")
      .select("*").eq("teacher_email", teacherEmail)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (active) setRequisitions(data || []); });
    return () => { active = false; };
  }, [teacherEmail]);

  async function addRequisition({ cart, total }) {
    // Strip the non-serializable File objects — keep only the quote metadata.
    const safeCart = cart.map(v => ({
      ...v,
      quotes: (v.quotes || []).map(q => ({ id: q.id, name: q.name, size: q.size, type: q.type })),
    }));
    const row = { teacher_email: teacherEmail, cart: safeCart, total: Number(total) || 0 };
    if (!SUPABASE_READY || !supabase) {
      setRequisitions(prev => [{ id: Date.now().toString(), ...row, created_at: new Date().toISOString() }, ...prev]);
      return;
    }
    const { data } = await supabase.from("requisitions").insert(row).select("*").single();
    if (data) setRequisitions(prev => [data, ...prev]);
  }

  return { requisitions, addRequisition };
}

// ─── Mole Dollar Grade Actions ────────────────────────────────────────────────

// Resolve the gradebook student (the `students` roster row) by email. Email is
// the canonical key that bridges the classroom roster (stu-*) and the gradebook
// roster (students.id). Returns { id, name } or null. NOTE: the gradebook's
// notion of a "student" lives in public.students, NOT gradebook_profiles — that
// table holds category-weight profiles and has no student columns.
async function resolveGradebookStudent(studentEmail) {
  const { data } = await supabase
    .from('students')
    .select('id, first_name, last_name')
    .ilike('student_email', studentEmail)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, name: `${data.first_name} ${data.last_name}`.trim() };
}

export async function applyMoleDropLowest(teacherEmail, studentEmail, gradeCategory, gradingPeriod) {
  if (!SUPABASE_READY || !supabase) return { ok: false, reason: 'no_supabase' };
  const student = await resolveGradebookStudent(studentEmail);
  if (!student) return { ok: false, reason: 'no_student' };
  const { data: assignments } = await supabase
    .from('gradebook_assignments')
    .select('id, name, max_points')
    .eq('teacher_email', teacherEmail)
    .ilike('category', gradeCategory)
    .eq('grading_period', gradingPeriod)
    .eq('extra_credit', false);
  if (!assignments?.length) return { ok: false, reason: 'no_assignments' };
  const { data: grades } = await supabase
    .from('gradebook_grades')
    .select('id, assignment_id, points_earned, retake_score, excused, missing')
    .eq('teacher_email', teacherEmail)
    .eq('student_id', student.id)
    .in('assignment_id', assignments.map(a => a.id));
  const gradeByAsgn = {};
  (grades || []).forEach(g => { gradeByAsgn[g.assignment_id] = g; });

  // Server-side enforcement of one-drop-per-category-per-period: if any
  // assignment in this category/period is already excused, the student has
  // already used their drop. This is the authoritative check (the client guard
  // in CashInShop is only UX).
  if ((grades || []).some(g => g.excused)) {
    return { ok: false, reason: 'already_dropped' };
  }

  let lowestAsgn = null;
  let lowestPct = Infinity;
  for (const asgn of assignments) {
    const g = gradeByAsgn[asgn.id];
    // Use the effective (best) score — a passing retake means the raw low
    // score isn't actually the grade dragging the average down.
    const effective = g
      ? Math.max(g.points_earned ?? 0, g.retake_score ?? 0)
      : 0;
    const pct = (!g || g.missing || (g.points_earned == null && g.retake_score == null))
      ? 0 : effective / (asgn.max_points || 100);
    if (pct < lowestPct) { lowestPct = pct; lowestAsgn = { asgn, grade: g }; }
  }
  if (!lowestAsgn) return { ok: false, reason: 'nothing_to_drop' };
  const { asgn, grade } = lowestAsgn;
  const row = {
    teacher_email: teacherEmail, assignment_id: asgn.id,
    student_id: student.id, student_name: student.name,
    excused: true, missing: false, points_earned: null,
    graded_at: new Date().toISOString(),
  };
  if (grade) { await supabase.from('gradebook_grades').update(row).eq('id', grade.id); }
  else { await supabase.from('gradebook_grades').insert(row); }
  return { ok: true, assignmentName: asgn.name };
}

export async function applyMoleBonus(teacherEmail, studentEmail, bonusPoints, gradingPeriod = 1) {
  if (!SUPABASE_READY || !supabase) return { ok: false, reason: 'no_supabase' };
  const student = await resolveGradebookStudent(studentEmail);
  if (!student) return { ok: false, reason: 'no_student' };
  // The bonus assignment is per grading period so it affects the period the
  // student is actually in.
  let { data: asgn } = await supabase
    .from('gradebook_assignments').select('id, max_points')
    .eq('teacher_email', teacherEmail).eq('name', 'Mole Dollar Bonus')
    .eq('grading_period', gradingPeriod).maybeSingle();
  if (!asgn) {
    const { data: created } = await supabase.from('gradebook_assignments').insert({
      teacher_email: teacherEmail, name: 'Mole Dollar Bonus', category: 'Tests',
      grading_period: gradingPeriod, max_points: 100, extra_credit: true,
      description: 'Bonus points earned via Mole Dollar redemptions.',
      created_at: new Date().toISOString(),
    }).select('id, max_points').single();
    asgn = created;
  }
  if (!asgn) return { ok: false, reason: 'could_not_create_assignment' };
  const { data: existing } = await supabase.from('gradebook_grades').select('id, points_earned')
    .eq('teacher_email', teacherEmail).eq('assignment_id', asgn.id)
    .eq('student_id', student.id).maybeSingle();
  const newPts = Math.min(asgn.max_points || 100, (existing?.points_earned ?? 0) + bonusPoints);
  const row = {
    teacher_email: teacherEmail, assignment_id: asgn.id,
    student_id: student.id, student_name: student.name,
    points_earned: newPts, missing: false, excused: false,
    graded_at: new Date().toISOString(),
  };
  if (existing) { await supabase.from('gradebook_grades').update(row).eq('id', existing.id); }
  else { await supabase.from('gradebook_grades').insert(row); }
  return { ok: true, totalPoints: newPts };
}

// ─── Staff Messaging ──────────────────────────────────────────────────────────
export function useStaffMessaging(userEmail) {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});   // { convId: Message[] }
  const [members, setMembers]   = useState({});   // { convId: MemberRow[] }

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !userEmail) return;
    let active = true;

    async function load() {
      const { data: myMemberships } = await supabase
        .from("staff_conversation_members").select("conversation_id").eq("user_email", userEmail);
      if (!active) return;
      if (!myMemberships?.length) { setConversations([]); setMessages({}); setMembers({}); return; }
      const ids = myMemberships.map(r => r.conversation_id);

      const [{ data: convRows }, { data: memberRows }, { data: msgRows }] = await Promise.all([
        supabase.from("staff_conversations").select("*").in("id", ids),
        supabase.from("staff_conversation_members").select("*").in("conversation_id", ids),
        supabase.from("staff_messages")
          .select("*, staff_message_attachments(*)")
          .in("conversation_id", ids)
          .order("created_at", { ascending: true }),
      ]);

      if (!active) return;
      setConversations(convRows || []);

      const membMap = {};
      (memberRows || []).forEach(m => { (membMap[m.conversation_id] ||= []).push(m); });
      setMembers(membMap);

      const msgMap = {};
      (msgRows || []).forEach(m => { (msgMap[m.conversation_id] ||= []).push(m); });
      setMessages(msgMap);
    }

    load();
    const ch = supabase.channel("staff_messaging_ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_conversation_members" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_conversations" }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [userEmail]);

  function findDM(otherEmail) {
    for (const conv of conversations) {
      if (conv.type !== "dm") continue;
      const emails = (members[conv.id] || []).map(m => m.user_email);
      if (emails.includes(userEmail) && emails.includes(otherEmail)) return conv.id;
    }
    return null;
  }

  async function openOrCreateDM(otherEmail) {
    const existing = findDM(otherEmail);
    if (existing) return existing;
    if (!SUPABASE_READY || !supabase) return null;
    const { data: conv } = await supabase.from("staff_conversations")
      .insert({ type: "dm", created_by: userEmail }).select().single();
    if (!conv) return null;
    const now = new Date().toISOString();
    await supabase.from("staff_conversation_members").insert([
      { conversation_id: conv.id, user_email: userEmail },
      { conversation_id: conv.id, user_email: otherEmail },
    ]);
    // Optimistically update state so thread opens immediately without waiting for realtime
    setConversations(prev => [...prev, conv]);
    setMembers(prev => ({
      ...prev,
      [conv.id]: [
        { conversation_id: conv.id, user_email: userEmail, last_read_at: now },
        { conversation_id: conv.id, user_email: otherEmail, last_read_at: now },
      ],
    }));
    return conv.id;
  }

  async function createGroup(name, description, memberEmails) {
    if (!SUPABASE_READY || !supabase) return null;
    const { data: conv } = await supabase.from("staff_conversations")
      .insert({ type: "group", name, description, created_by: userEmail }).select().single();
    if (!conv) return null;
    const all = [...new Set([userEmail, ...memberEmails])];
    const now = new Date().toISOString();
    await supabase.from("staff_conversation_members").insert(
      all.map(email => ({ conversation_id: conv.id, user_email: email }))
    );
    // Optimistically update state
    setConversations(prev => [...prev, conv]);
    setMembers(prev => ({
      ...prev,
      [conv.id]: all.map(email => ({ conversation_id: conv.id, user_email: email, last_read_at: now })),
    }));
    return conv.id;
  }

  async function sendMessage(conversationId, body, isAlert = false) {
    if (!SUPABASE_READY || !supabase) return null;
    const { data } = await supabase.from("staff_messages")
      .insert({ conversation_id: conversationId, sender_email: userEmail, body, is_alert: isAlert })
      .select().single();
    return data;
  }

  async function uploadAttachment(messageId, file) {
    if (!SUPABASE_READY || !supabase) return null;
    const ext = file.name.split(".").pop();
    const path = `${messageId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("staff-attachments").upload(path, file);
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from("staff-attachments").getPublicUrl(path);
    await supabase.from("staff_message_attachments").insert({
      message_id: messageId, file_name: file.name, file_url: publicUrl,
      file_type: file.type, file_size: file.size,
    });
    return publicUrl;
  }

  async function markRead(conversationId) {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("staff_conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId).eq("user_email", userEmail);
  }

  function getUnread(conversationId) {
    const me = (members[conversationId] || []).find(m => m.user_email === userEmail);
    const since = me?.last_read_at;
    return (messages[conversationId] || []).filter(m =>
      m.sender_email !== userEmail && (!since || new Date(m.created_at) > new Date(since))
    ).length;
  }

  const totalUnread = conversations.reduce((n, c) => n + getUnread(c.id), 0);

  return { conversations, messages, members, openOrCreateDM, createGroup, sendMessage, uploadAttachment, markRead, getUnread, totalUnread };
}

// ─── CEU Opportunities ────────────────────────────────────────────────────────
// ceu_opportunities: shared board of external links and school-based PD entries
export function useCeuOpportunities(userEmail) {
  const [opportunities, setOpportunities] = useState([]);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    let active = true;
    async function load() {
      const { data } = await supabase
        .from("ceu_opportunities")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (active) setOpportunities(data || []);
    }
    load();
    const ch = supabase.channel("ceu_opps_ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "ceu_opportunities" }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, []);

  async function addOpportunity(fields) {
    if (!SUPABASE_READY || !supabase || !userEmail) return null;
    const { data, error } = await supabase
      .from("ceu_opportunities")
      .insert({ ...fields, created_by: userEmail })
      .select()
      .single();
    if (!error && data) setOpportunities(prev => [...prev, data]);
    return data;
  }

  async function removeOpportunity(id) {
    if (!SUPABASE_READY || !supabase) return;
    setOpportunities(prev => prev.filter(o => o.id !== id));
    await supabase.from("ceu_opportunities").delete().eq("id", id);
  }

  async function uploadFlyer(file) {
    if (!SUPABASE_READY || !supabase) return null;
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("ceu-flyers").upload(path, file);
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from("ceu-flyers").getPublicUrl(path);
    return { url: publicUrl, name: file.name };
  }

  return { opportunities, addOpportunity, removeOpportunity, uploadFlyer };
}
