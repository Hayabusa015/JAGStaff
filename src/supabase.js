import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { SEED_EVENTS, SEED_TRIPS, SEED_CEU, SEED_STUDENTS } from "./constants.js";

// Supabase project URL + anon key. The anon key is safe to ship in the
// client — row-level security (RLS) is what actually protects the data.
// Set these in a .env.local file (see SUPABASE_SETUP.md / .env.example).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const SUPABASE_READY = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

export const supabase = SUPABASE_READY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Map a snake_case DB row to the camelCase shape the UI expects.
function rowToPass(r) {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    destination: r.destination,
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

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    let active = true;

    async function load() {
      const [{ data: p }, { data: l }] = await Promise.all([
        supabase.from("hall_passes").select("*").order("out_time", { ascending: true }),
        supabase.from("hall_pass_log").select("*").order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      setPasses((p || []).map(rowToPass));
      setLog((l || []).map(rowToPass));
      setReady(true);
    }
    load();

    // Realtime: any insert/update/delete on either table triggers a reload.
    // At this app's scale a full reload is simpler and cheaper than diffing.
    const channel = supabase
      .channel("hallpass-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "hall_passes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "hall_pass_log" }, load)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

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
  }

  return { passes, log, ready, addPass, returnPass };
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
    return () => { active = false; };
  }, []);

  const rowToStudent = r => ({
    id: r.id, firstName: r.first_name, lastName: r.last_name,
    grade: r.grade || "", section: r.section || "",
    parentEmail: r.parent_email || "", studentEmail: r.student_email || "",
  });

  // Replace the entire roster (used on CSV import).
  async function importStudents(rows) {
    if (!SUPABASE_READY || !supabase) { setStudents(rows); return; }
    await supabase.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (rows.length === 0) { setStudents([]); return; }
    const { data } = await supabase.from("students").insert(
      rows.map(r => ({ first_name: r.firstName, last_name: r.lastName, grade: r.grade || null, section: r.section || null, parent_email: r.parentEmail || null, student_email: r.studentEmail || null }))
    ).select("*");
    setStudents((data || []).map(rowToStudent));
  }

  async function addStudent(s) {
    if (!SUPABASE_READY || !supabase) {
      setStudents(prev => [...prev, { id: Date.now().toString(), ...s }]);
      return;
    }
    const { data } = await supabase.from("students")
      .insert({ first_name: s.firstName, last_name: s.lastName, grade: s.grade || null, section: s.section || null, parent_email: s.parentEmail || null, student_email: s.studentEmail || null })
      .select("*").single();
    if (data) setStudents(prev => [...prev, rowToStudent(data)]);
  }

  async function updateStudent(id, s) {
    if (!SUPABASE_READY || !supabase) {
      setStudents(prev => prev.map(x => x.id === id ? { ...x, ...s } : x));
      return;
    }
    await supabase.from("students").update({ first_name: s.firstName, last_name: s.lastName, grade: s.grade || null, section: s.section || null, parent_email: s.parentEmail || null, student_email: s.studentEmail || null }).eq("id", id);
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
// Auto-registers each teacher when they open Hall Pass.
// Powers the "Send to Teacher" dropdown for room passes.
export function useStaffDirectory(user, room) {
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !user?.email) return;

    // Upsert this teacher so others can see them in the dropdown.
    supabase.from("staff_directory").upsert({
      email: user.email,
      name: user.name,
      room: room || null,
      last_seen: new Date().toISOString(),
    }, { onConflict: "email" });

    // Load all staff.
    supabase.from("staff_directory")
      .select("*")
      .order("name")
      .then(({ data }) => setStaff(data || []));
  }, [user?.email, room]);

  return staff;
}

// ─── Room Passes ──────────────────────────────────────────────────
// Separate from hall passes — sending a student to a teacher's room.
// Does not count toward the hall pass limit.
const ROOM_PASS_REASONS = ["Extra Help", "Makeup Test", "Finish Lab", "Late Pass", "Other"];
export { ROOM_PASS_REASONS };

export function useRoomPasses(userEmail) {
  const [passes, setPasses] = useState([]);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    let active = true;

    async function load() {
      const today = new Date(); today.setHours(0,0,0,0);
      const { data } = await supabase
        .from("room_passes")
        .select("*")
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });
      if (!active) return;
      setPasses(data || []);
    }
    load();

    const channel = supabase
      .channel("room-passes-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "room_passes" }, load)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

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
  }

  async function markArrived(id) {
    if (!SUPABASE_READY || !supabase) {
      setPasses(p => p.map(x => x.id === id ? { ...x, status: "arrived" } : x));
      return;
    }
    await supabase.from("room_passes").update({ status: "arrived" }).eq("id", id);
  }

  async function dismiss(id) {
    if (!SUPABASE_READY || !supabase) {
      setPasses(p => p.map(x => x.id === id ? { ...x, status: "dismissed" } : x));
      return;
    }
    await supabase.from("room_passes").update({ status: "dismissed" }).eq("id", id);
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

  useEffect(() => {
    if (!SUPABASE_READY || !supabase) return;
    supabase.from("staff_directory").select("*").order("name").then(({ data }) => {
      if (data) setStaffList(data);
    });
  }, []);

  async function toggleAdmin(email, value) {
    setStaffList(prev => prev.map(s => s.email === email ? { ...s, is_admin: value } : s));
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("staff_directory").update({ is_admin: value }).eq("email", email);
  }

  return { staffList, toggleAdmin };
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
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_settings").update({
      enrollment_open: open, updated_at: new Date().toISOString(), updated_by: userEmail,
    }).eq("id", 1);
  }

  async function setActivePeriod(period, userEmail) {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from("gmen_settings").update({
      active_period: period, updated_at: new Date().toISOString(), updated_by: userEmail,
    }).eq("id", 1);
  }

  async function setPeriodEndDate(period, date, userEmail) {
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
  const dow = new Date().getDay(); // 0=Sun,1=Mon,...,5=Fri,6=Sat
  return (dow === 2 || dow === 3 || dow === 4)
    ? (schedules?.twt || [])
    : (schedules?.mf || []);
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
  { name: "G-Men Time",       start: "10:15", end: "10:47" },
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

  // The schedule for today based on day of week
  const periodsToday = daySchedule(schedules);

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

  async function enroll(studentEmail, studentName, classId, gradingPeriod) {
    if (!SUPABASE_READY || !supabase) return { error: "Supabase not ready" };
    const { data, error } = await supabase.from("gmen_enrollments").insert([{
      student_email: studentEmail, student_name: studentName,
      class_id: classId, grading_period: gradingPeriod,
    }]).select().single();
    return { data, error };
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

  return { enrollments, enroll, unenroll, seatCount };
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

// ─── Gradebook ───────────────────────────────────────────────────────────────
export function useGradebook(teacherEmail) {
  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);        // flat array of all grade rows
  const [profiles, setProfiles] = useState([]);
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

export async function applyMoleDropLowest(teacherEmail, studentEmail, gradeCategory, gradingPeriod) {
  if (!SUPABASE_READY || !supabase) return { ok: false, reason: 'no_supabase' };
  const { data: profile } = await supabase
    .from('gradebook_profiles')
    .select('id, student_name')
    .eq('teacher_email', teacherEmail)
    .ilike('student_email', studentEmail)
    .maybeSingle();
  if (!profile) return { ok: false, reason: 'no_profile' };
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
    .select('id, assignment_id, points_earned, excused, missing')
    .eq('teacher_email', teacherEmail)
    .eq('student_id', profile.id)
    .in('assignment_id', assignments.map(a => a.id));
  const gradeByAsgn = {};
  (grades || []).forEach(g => { gradeByAsgn[g.assignment_id] = g; });
  let lowestAsgn = null;
  let lowestPct = Infinity;
  for (const asgn of assignments) {
    const g = gradeByAsgn[asgn.id];
    if (g?.excused) continue;
    const pct = (!g || g.missing || g.points_earned == null)
      ? 0 : g.points_earned / (asgn.max_points || 100);
    if (pct < lowestPct) { lowestPct = pct; lowestAsgn = { asgn, grade: g }; }
  }
  if (!lowestAsgn) return { ok: false, reason: 'nothing_to_drop' };
  const { asgn, grade } = lowestAsgn;
  const row = {
    teacher_email: teacherEmail, assignment_id: asgn.id,
    student_id: profile.id, student_name: profile.student_name,
    excused: true, missing: false, points_earned: null,
    graded_at: new Date().toISOString(),
  };
  if (grade) { await supabase.from('gradebook_grades').update(row).eq('id', grade.id); }
  else { await supabase.from('gradebook_grades').insert(row); }
  return { ok: true, assignmentName: asgn.name };
}

export async function applyMoleBonus(teacherEmail, studentEmail, bonusPoints) {
  if (!SUPABASE_READY || !supabase) return { ok: false, reason: 'no_supabase' };
  const { data: profile } = await supabase
    .from('gradebook_profiles')
    .select('id, student_name')
    .eq('teacher_email', teacherEmail)
    .ilike('student_email', studentEmail)
    .maybeSingle();
  if (!profile) return { ok: false, reason: 'no_profile' };
  let { data: asgn } = await supabase
    .from('gradebook_assignments').select('id, max_points')
    .eq('teacher_email', teacherEmail).eq('name', 'Mole Dollar Bonus').maybeSingle();
  if (!asgn) {
    const { data: created } = await supabase.from('gradebook_assignments').insert({
      teacher_email: teacherEmail, name: 'Mole Dollar Bonus', category: 'Tests',
      grading_period: 1, max_points: 100, extra_credit: true,
      description: 'Bonus points earned via Mole Dollar redemptions.',
      created_at: new Date().toISOString(),
    }).select('id, max_points').single();
    asgn = created;
  }
  if (!asgn) return { ok: false, reason: 'could_not_create_assignment' };
  const { data: existing } = await supabase.from('gradebook_grades').select('id, points_earned')
    .eq('teacher_email', teacherEmail).eq('assignment_id', asgn.id)
    .eq('student_id', profile.id).maybeSingle();
  const newPts = Math.min(asgn.max_points || 100, (existing?.points_earned ?? 0) + bonusPoints);
  const row = {
    teacher_email: teacherEmail, assignment_id: asgn.id,
    student_id: profile.id, student_name: profile.student_name,
    points_earned: newPts, missing: false, excused: false,
    graded_at: new Date().toISOString(),
  };
  if (existing) { await supabase.from('gradebook_grades').update(row).eq('id', existing.id); }
  else { await supabase.from('gradebook_grades').insert(row); }
  return { ok: true, totalPoints: newPts };
}
