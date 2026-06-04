import { useState, useEffect } from "react";
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
