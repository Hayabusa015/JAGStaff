import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

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
    });
    // Realtime INSERT event triggers load() above — no local setState needed.
  }

  return { infractions, loading, addInfraction };
}

// ─── Student Roster (Supabase-backed) ────────────────────────────
// Table: students — shared school roster (last_name, first_name, grade).
// Falls back to local state (empty) when Supabase is not configured.
export function useStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

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
      })));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  // Replace the entire roster (used on CSV import).
  async function importStudents(rows) {
    if (!SUPABASE_READY || !supabase) {
      setStudents(rows);
      return;
    }
    // Delete all existing rows then insert fresh batch.
    await supabase.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (rows.length === 0) { setStudents([]); return; }
    const { data } = await supabase.from("students").insert(
      rows.map(r => ({ first_name: r.firstName, last_name: r.lastName, grade: r.grade || null }))
    ).select("*");
    setStudents((data || []).map(r => ({ id: r.id, firstName: r.first_name, lastName: r.last_name, grade: r.grade || "" })));
  }

  async function addStudent(s) {
    if (!SUPABASE_READY || !supabase) {
      setStudents(prev => [...prev, { id: Date.now().toString(), ...s }]);
      return;
    }
    const { data } = await supabase.from("students")
      .insert({ first_name: s.firstName, last_name: s.lastName, grade: s.grade || null })
      .select("*").single();
    if (data) setStudents(prev => [...prev, { id: data.id, firstName: data.first_name, lastName: data.last_name, grade: data.grade || "" }]);
  }

  async function updateStudent(id, s) {
    if (!SUPABASE_READY || !supabase) {
      setStudents(prev => prev.map(x => x.id === id ? { ...x, ...s } : x));
      return;
    }
    await supabase.from("students").update({ first_name: s.firstName, last_name: s.lastName, grade: s.grade || null }).eq("id", id);
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

  return { students, loading, importStudents, addStudent, updateStudent, removeStudent };
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

  return { sentByMe, sentToMe, sendPass, markArrived, dismiss };
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
    if (!SUPABASE_READY || !supabase) {
      setArrivals(prev => [{
        id: Date.now().toString(), student_id: studentId, student_name: studentName,
        arrived_at: new Date().toISOString(), confirmed_by: null, confirmed_at: null, notes: notes || null,
      }, ...prev]);
      return;
    }
    await supabase.from("late_arrivals").insert({
      student_id: studentId, student_name: studentName, notes: notes || null,
    });
  }

  async function confirmArrival(id, teacherName) {
    if (!SUPABASE_READY || !supabase) {
      setArrivals(prev => prev.map(a => a.id === id ? { ...a, confirmed_by: teacherName, confirmed_at: new Date().toISOString() } : a));
      return;
    }
    await supabase.from("late_arrivals").update({
      confirmed_by: teacherName, confirmed_at: new Date().toISOString(),
    }).eq("id", id);
  }

  return { arrivals, logArrival, confirmArrival };
}
