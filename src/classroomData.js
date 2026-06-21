// ─────────────────────────────────────────────────────────────────────────────
//  Classroom ("My Classroom" zone) Supabase data layer.
//  Mirrors the gradebook pattern in src/supabase.js: a single hook that loads
//  the teacher's rows, subscribes to realtime, exposes camelCase data + actions,
//  and is a no-op (ready:false) when Supabase isn't configured — in which case
//  ClassroomContext falls back to its in-memory mock state.
//
//  Mole Dollar balances move ONLY through the SECURITY DEFINER RPCs
//  (submit/approve/deny/grant) so a student can never write their own balance.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, SUPABASE_READY } from "./supabase.js";
import { extractText } from "./classroom/utils/fileText.js";
import { CLASSES, STUDENTS, SEED_UNITS } from "./classroom/data/mockData.js";

const BUCKET = "classroom-materials";

// ── row → UI shape mappers (match the mock context's shapes) ────────────────
const rowToClass = (r) => ({ id: r.id, name: r.name, subject: r.subject, period: r.period, room: r.room });
const rowToNotif = (n) => ({ id: n.id, kind: n.kind, tone: n.tone, text: n.text, read: n.read, createdAt: n.created_at });
const rowToMole = (r) => ({ id: r.id, studentId: r.student_id, item: r.item, cost: r.cost, status: r.status, note: r.note || "", createdAt: r.created_at });
const rowToTicket = (r) => ({ id: r.id, studentId: r.student_id, category: r.category, details: r.details, status: r.status, createdAt: r.created_at, archived: r.archived });
const rowToMaterial = (m) => ({
  id: m.id, type: m.type, title: m.title, description: m.description || "",
  studyContent: m.study_content || "", keyTerms: m.key_terms || [], extractedText: m.extracted_text || "",
  hasFile: m.has_file, fileName: m.file_name, fileType: m.file_type, fileSize: m.file_size,
  storagePath: m.storage_path,
});
const rowToStudent = (r, notifs) => ({
  id: r.id, classId: r.class_id, name: r.student_name, email: r.student_email,
  avatar: r.avatar, isDemo: r.is_demo, balance: r.balance, lockedBalance: r.locked_balance,
  wizardComplete: r.wizard_complete, gizmo: r.gizmo || {}, safety: r.safety || {}, guardian: r.guardian || {},
  notifications: (notifs || []).filter((n) => n.student_email === r.student_email).map(rowToNotif),
});

export function useSupabaseClassroom(teacherEmail) {
  const active = SUPABASE_READY && !!supabase && !!teacherEmail;

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [moleRequests, setMoleRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [units, setUnits] = useState([]);
  const [emailLog, setEmailLog] = useState([]);
  const [loading, setLoading] = useState(active);

  // Keep a live ref to students so actions can resolve email/class without re-binding.
  const studentsRef = useRef(students);
  studentsRef.current = students;
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;

  const load = useCallback(async () => {
    if (!active) return;
    const t = teacherEmail;
    const [c, s, m, h, u, mat, n] = await Promise.all([
      supabase.from("classroom_classes").select("*").eq("teacher_email", t).order("period"),
      supabase.from("classroom_students").select("*").eq("teacher_email", t).order("student_name"),
      supabase.from("mole_requests").select("*").eq("teacher_email", t).order("created_at", { ascending: false }),
      supabase.from("help_tickets").select("*").eq("teacher_email", t).order("created_at", { ascending: false }),
      supabase.from("classroom_units").select("*").eq("teacher_email", t).order("sort_order"),
      supabase.from("classroom_materials").select("*").eq("teacher_email", t).order("sort_order"),
      supabase.from("classroom_notifications").select("*").eq("teacher_email", t).order("created_at", { ascending: false }),
    ]);
    const notifs = n.data || [];
    const materialsByUnit = {};
    (mat.data || []).forEach((row) => { (materialsByUnit[row.unit_id] ||= []).push(rowToMaterial(row)); });
    setClasses((c.data || []).map(rowToClass));
    setStudents((s.data || []).map((r) => rowToStudent(r, notifs)));
    setMoleRequests((m.data || []).map(rowToMole));
    setTickets((h.data || []).map(rowToTicket));
    setUnits((u.data || []).map((r) => ({
      id: r.id, classId: r.class_id, title: r.title, description: r.description || "",
      order: r.sort_order, materials: materialsByUnit[r.id] || [],
    })));
    setEmailLog([]); // log is write-mostly; not surfaced as a list yet
    setLoading(false);
  }, [active, teacherEmail]);

  useEffect(() => {
    if (!active) { setLoading(false); return; }
    let alive = true;
    load();
    const filter = `teacher_email=eq.${teacherEmail}`;
    const ch = supabase.channel(`classroom_${teacherEmail}`);
    ["classroom_classes", "classroom_students", "classroom_units", "classroom_materials",
      "mole_requests", "help_tickets", "classroom_notifications"].forEach((table) => {
      ch.on("postgres_changes", { event: "*", schema: "public", table, filter }, () => { if (alive) load(); });
    });
    ch.subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [active, teacherEmail, load]);

  // ── Mole Dollars (RPCs only) ──────────────────────────────────────────────
  const submitMoleRequest = useCallback(async (studentId, item) => {
    const { error } = await supabase.rpc("submit_mole_request", { p_student_id: studentId, p_item: item.label, p_cost: item.cost });
    if (error) return false;
    await load();
    return true;
  }, [load]);

  const approveMoleRequest = useCallback(async (requestId) => {
    await supabase.rpc("approve_mole_request", { p_request_id: requestId });
    await load();
  }, [load]);

  const denyMoleRequest = useCallback(async (requestId, note) => {
    await supabase.rpc("deny_mole_request", { p_request_id: requestId, p_note: note || null });
    await load();
  }, [load]);

  // ── Help Desk ─────────────────────────────────────────────────────────────
  const submitTicket = useCallback(async (studentId, category, details) => {
    const stu = studentsRef.current.find((s) => s.id === studentId);
    if (!stu) return;
    await supabase.from("help_tickets").insert({
      teacher_email: teacherEmail, class_id: stu.classId, student_id: stu.id,
      student_email: stu.email, student_name: stu.name, category, details, status: "submitted",
    });
    await load();
  }, [teacherEmail, load]);

  const advanceTicket = useCallback(async (ticketId) => {
    await supabase.from("help_tickets").update({ status: "in_progress" }).eq("id", ticketId).eq("status", "submitted");
    await load();
  }, [load]);

  const completeTicket = useCallback(async (ticketId) => {
    const tk = ticketsRef.current.find((t) => t.id === ticketId);
    await supabase.from("help_tickets").update({ status: "completed", archived: true, completed_at: new Date().toISOString() }).eq("id", ticketId);
    const stu = tk && studentsRef.current.find((s) => s.id === tk.studentId);
    if (stu) {
      await supabase.from("classroom_notifications").insert({
        teacher_email: teacherEmail, student_email: stu.email, kind: "ticket", tone: "success",
        text: `Your "${tk.category}" request was marked complete. ✅`,
      });
    }
    await load();
  }, [teacherEmail, load]);

  // ── Notifications & Wizard ────────────────────────────────────────────────
  const markNotificationsRead = useCallback(async (studentId) => {
    const stu = studentsRef.current.find((s) => s.id === studentId);
    if (!stu) return;
    await supabase.from("classroom_notifications").update({ read: true })
      .eq("teacher_email", teacherEmail).eq("student_email", stu.email).eq("read", false);
    await load();
  }, [teacherEmail, load]);

  const completeWizard = useCallback(async (studentId, payload) => {
    await supabase.rpc("complete_wizard", {
      p_student_id: studentId, p_gizmo: payload.gizmo, p_guardian: payload.guardian,
      p_signed_name: payload.safety?.signedName || "",
    });
    await load();
  }, [load]);

  // ── Units & Materials ─────────────────────────────────────────────────────
  const addUnit = useCallback(async (classId, { title, description }) => {
    const maxOrder = units.filter((u) => u.classId === classId).reduce((m, u) => Math.max(m, u.order), -1);
    await supabase.from("classroom_units").insert({
      teacher_email: teacherEmail, class_id: classId, title: title.trim(),
      description: (description || "").trim(), sort_order: maxOrder + 1,
    });
    await load();
  }, [teacherEmail, units, load]);

  const updateUnit = useCallback(async (unitId, patch) => {
    const row = {};
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.order !== undefined) row.sort_order = patch.order;
    await supabase.from("classroom_units").update(row).eq("id", unitId);
    await load();
  }, [load]);

  const deleteUnit = useCallback(async (unitId) => {
    const unit = units.find((u) => u.id === unitId);
    const paths = (unit?.materials || []).filter((m) => m.storagePath).map((m) => m.storagePath);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    await supabase.from("classroom_units").delete().eq("id", unitId); // materials cascade
    await load();
  }, [units, load]);

  const addMaterial = useCallback(async (unitId, meta, file) => {
    let storagePath = null, hasFile = false, fileName, fileType, fileSize, extractedText = "";
    if (file) {
      const path = `${teacherEmail}/${unitId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (!error) {
        storagePath = path; hasFile = true; fileName = file.name; fileType = file.type || ""; fileSize = file.size;
        try { extractedText = (await extractText(file)).slice(0, 20000); } catch { /* bonus only */ }
      }
    }
    await supabase.from("classroom_materials").insert({
      unit_id: unitId, teacher_email: teacherEmail, type: meta.type || "other", title: meta.title.trim(),
      description: (meta.description || "").trim(), study_content: (meta.studyContent || "").trim(),
      key_terms: meta.keyTerms || [], extracted_text: extractedText, has_file: hasFile,
      file_name: fileName, file_type: fileType, file_size: fileSize, storage_path: storagePath,
    });
    await load();
  }, [teacherEmail, load]);

  const deleteMaterial = useCallback(async (unitId, materialId) => {
    const unit = units.find((u) => u.id === unitId);
    const mat = unit?.materials.find((m) => m.id === materialId);
    if (mat?.storagePath) await supabase.storage.from(BUCKET).remove([mat.storagePath]);
    await supabase.from("classroom_materials").delete().eq("id", materialId);
    await load();
  }, [units, load]);

  const openMaterialFile = useCallback(async (materialId) => {
    let path = null;
    for (const u of units) { const m = u.materials.find((x) => x.id === materialId); if (m) { path = m.storagePath; break; } }
    if (!path) return false;
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120);
    if (!data?.signedUrl) return false;
    window.open(data.signedUrl, "_blank", "noopener");
    return true;
  }, [units]);

  // ── Parent email log ──────────────────────────────────────────────────────
  const sendParentEmail = useCallback(async (draft, meta) => {
    await supabase.from("classroom_emails").insert({
      teacher_email: teacherEmail, class_id: meta?.classId || null, student_email: meta?.studentEmail || null,
      to_email: draft.to, subject: draft.subject, status: "sent",
    });
    return { to: draft.to, subject: draft.subject, sentAt: new Date().toISOString(), status: "sent", ...meta };
  }, [teacherEmail]);

  // ── One-time demo seed (the three science classes + rosters + units) ───────
  const seedDemo = useCallback(async () => {
    if (!active) return;
    const { data: existing } = await supabase.from("classroom_classes").select("id").eq("teacher_email", teacherEmail).limit(1);
    if (existing && existing.length) return; // never double-seed
    const classIdMap = {};
    for (const c of CLASSES) {
      const { data } = await supabase.from("classroom_classes")
        .insert({ teacher_email: teacherEmail, name: c.name, subject: c.subject, period: c.period, room: c.room })
        .select("id").single();
      if (data) classIdMap[c.id] = data.id;
    }
    for (const s of STUDENTS) {
      const classId = classIdMap[s.classId];
      if (!classId) continue;
      await supabase.from("classroom_students").insert({
        teacher_email: teacherEmail, class_id: classId, student_email: s.email, student_name: s.name,
        avatar: s.avatar, is_demo: s.isDemo, balance: s.balance, locked_balance: s.lockedBalance,
        wizard_complete: s.wizardComplete, gizmo: s.gizmo, safety: s.safety, guardian: s.guardian,
      });
    }
    for (const u of SEED_UNITS) {
      const classId = classIdMap[u.classId];
      if (!classId) continue;
      const { data: ud } = await supabase.from("classroom_units")
        .insert({ teacher_email: teacherEmail, class_id: classId, title: u.title, description: u.description, sort_order: u.order })
        .select("id").single();
      if (ud?.id && u.materials?.length) {
        await supabase.from("classroom_materials").insert(u.materials.map((m) => ({
          unit_id: ud.id, teacher_email: teacherEmail, type: m.type, title: m.title,
          description: m.description || "", study_content: m.studyContent || "",
          key_terms: m.keyTerms || [], extracted_text: m.extractedText || "", has_file: false,
        })));
      }
    }
    await load();
  }, [active, teacherEmail, load]);

  const metrics = {
    approvedMoleDollars: moleRequests.filter((r) => r.status === "approved").reduce((s, r) => s + r.cost, 0),
    completedTasks: tickets.filter((t) => t.status === "completed").length,
  };

  return {
    ready: active, loading,
    classes, students, moleRequests, tickets, units, emailLog, metrics,
    submitMoleRequest, approveMoleRequest, denyMoleRequest,
    submitTicket, advanceTicket, completeTicket,
    markNotificationsRead, completeWizard,
    addUnit, updateUnit, deleteUnit, addMaterial, deleteMaterial, openMaterialFile,
    sendParentEmail, seedDemo,
  };
}
