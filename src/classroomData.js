// Supabase hooks for the "My Classroom" zone.
// Pattern mirrors useGradebook in supabase.js.
// When SUPABASE_READY is false every hook returns empty defaults so the
// ClassroomContext falls through to its existing mock-data behaviour.

import { useState, useEffect, useCallback } from 'react';
import { supabase, SUPABASE_READY } from './supabase.js';

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapClass(r) {
  return {
    id: r.id,
    teacherEmail: r.teacher_email,
    name: r.name,
    subject: r.subject || 'chemistry',
    period: r.period,
    room: r.room || '',
  };
}

// cls: the mapped classroom_classes row for this student (needed for section/period).
function mapStudent(r, cls = null, notifications = []) {
  const parts = (r.student_name || '').trim().split(/\s+/);
  return {
    id: r.id,
    classId: r.class_id,
    teacherEmail: r.teacher_email,
    studentEmail: r.student_email,
    name: r.student_name,
    // Gradebook-compatible name fields
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
    // Section = "Period N" — lets the gradebook filter by class/period
    section: cls ? `Period ${cls.period}` : '',
    grade: '',
    // Parent email lives inside guardian JSON; gradebook reads parentEmail directly
    parentEmail: r.guardian?.email || '',
    avatar: r.avatar || '😊',
    balance: r.balance ?? 0,
    lockedBalance: r.locked_balance ?? 0,
    wizardComplete: r.wizard_complete ?? false,
    gizmo: r.gizmo || { username: '', password: '' },
    safety: r.safety || { signedName: null, signedAt: null },
    guardian: r.guardian || { name: '', phone: '', email: '' },
    notifications,
  };
}

function mapTicket(r) {
  return {
    id: r.id,
    studentId: r.student_id,
    studentEmail: r.student_email,
    studentName: r.student_name,
    category: r.category,
    details: r.details,
    status: r.status,
    archived: r.archived ?? false,
    createdAt: r.created_at,
  };
}

function mapRequest(r) {
  return {
    id: r.id,
    studentId: r.student_id,
    studentEmail: r.student_email,
    studentName: r.student_name,
    item: r.item,
    cost: r.cost,
    status: r.status,
    note: r.note || '',
    createdAt: r.created_at,
  };
}

function mapNotification(r) {
  return {
    id: r.id,
    kind: r.kind,
    tone: r.tone || 'info',
    text: r.text,
    read: r.read ?? false,
    createdAt: r.created_at,
  };
}

// ─── Teacher composite hook ───────────────────────────────────────────────────
// Loads all classroom data scoped by teacher_email.
// Returns mock-safe empty defaults when teacherEmail is null.

export function useTeacherClassroom(teacherEmail) {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !teacherEmail) return;
    let active = true;
    setLoading(true);

    async function load() {
      const [{ data: cls }, { data: stu }, { data: tkt }, { data: req }] =
        await Promise.all([
          supabase
            .from('classroom_classes')
            .select('*')
            .eq('teacher_email', teacherEmail)
            .order('period'),
          supabase
            .from('classroom_students')
            .select('*')
            .eq('teacher_email', teacherEmail),
          supabase
            .from('help_tickets')
            .select('*')
            .eq('teacher_email', teacherEmail)
            .order('created_at', { ascending: false }),
          supabase
            .from('mole_requests')
            .select('*')
            .eq('teacher_email', teacherEmail)
            .order('created_at', { ascending: false }),
        ]);
      if (!active) return;
      const mappedClasses = (cls || []).map(mapClass);
      const classById = Object.fromEntries(mappedClasses.map(c => [c.id, c]));
      setClasses(mappedClasses);
      setStudents((stu || []).map((s) => mapStudent(s, classById[s.class_id])));
      setTickets((tkt || []).map(mapTicket));
      setRequests((req || []).map(mapRequest));
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`teacher-classroom-${teacherEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_students',
          filter: `teacher_email=eq.${teacherEmail}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_tickets',
          filter: `teacher_email=eq.${teacherEmail}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mole_requests',
          filter: `teacher_email=eq.${teacherEmail}` }, load)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [teacherEmail]);

  // ── Teacher write actions (wrapped RPCs / direct updates) ──────────────────

  const approveRequest = useCallback(async (requestId) => {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.rpc('approve_mole_request', { p_request_id: requestId });
  }, []);

  const denyRequest = useCallback(async (requestId, note) => {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.rpc('deny_mole_request', { p_request_id: requestId, p_note: note || null });
  }, []);

  const grantMoleDollars = useCallback(async (studentId, amount) => {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.rpc('grant_mole_dollars', { p_student_id: studentId, p_amount: amount });
  }, []);

  const advanceTicket = useCallback(async (ticketId) => {
    if (!SUPABASE_READY || !supabase) return;
    await supabase
      .from('help_tickets')
      .update({ status: 'in_progress' })
      .eq('id', ticketId);
  }, []);

  const completeTicket = useCallback(async (ticketId) => {
    if (!SUPABASE_READY || !supabase) return;
    await supabase
      .from('help_tickets')
      .update({ status: 'completed', archived: true, completed_at: new Date().toISOString() })
      .eq('id', ticketId);
  }, []);

  const pushNotification = useCallback(async (studentEmail, teacherEm, kind, tone, text) => {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from('classroom_notifications').insert({
      teacher_email: teacherEm,
      student_email: studentEmail,
      kind, tone, text, read: false,
    });
  }, []);

  const addClass = useCallback(async ({ name, subject, period, room }) => {
    if (!SUPABASE_READY || !supabase || !teacherEmail) return null;
    const { data } = await supabase
      .from('classroom_classes')
      .insert({ teacher_email: teacherEmail, name, subject, period, room })
      .select()
      .single();
    return data ? mapClass(data) : null;
  }, [teacherEmail]);

  const addStudentToClass = useCallback(async ({ classId, studentEmail, studentName, avatar }) => {
    if (!SUPABASE_READY || !supabase || !teacherEmail) return null;
    const { data } = await supabase
      .from('classroom_students')
      .insert({
        teacher_email: teacherEmail,
        class_id: classId,
        student_email: studentEmail,
        student_name: studentName,
        avatar: avatar || '😊',
      })
      .select()
      .single();
    const cls = classes.find(c => c.id === classId);
    return data ? mapStudent(data, cls) : null;
  }, [teacherEmail, classes]);

  // Bulk-provision students from an external source (e.g. Google Classroom sync).
  // Writes to classroom_students AND the school-wide students table in one pass
  // so teachers only need to sync once for both sides of the app.
  // rows: [{ classId, studentEmail, studentName }]
  const bulkProvisionStudents = useCallback(async (rows) => {
    if (!SUPABASE_READY || !supabase || !teacherEmail) return { added: 0, skipped: rows.length };

    // ── 1. classroom_students (teacher-scoped, email-deduped) ──────────────────
    const { data: existing } = await supabase
      .from('classroom_students')
      .select('student_email')
      .eq('teacher_email', teacherEmail);
    const existingEmails = new Set((existing || []).map(s => s.student_email));
    const toInsert = rows.filter(r => r.studentEmail && !existingEmails.has(r.studentEmail));

    if (toInsert.length > 0) {
      const { error } = await supabase.from('classroom_students').insert(
        toInsert.map(r => ({
          teacher_email: teacherEmail,
          class_id: r.classId,
          student_email: r.studentEmail,
          student_name: r.studentName,
          avatar: '😊',
        }))
      );
      if (error) throw new Error(error.message);
    }

    // ── 2. school-wide students table (shared roster, email-deduped) ───────────
    // Only inserts emails not already present — safe to re-run across multiple teachers.
    const validRows = rows.filter(r => r.studentEmail);
    if (validRows.length > 0) {
      const { data: schoolExisting } = await supabase
        .from('students')
        .select('student_email')
        .in('student_email', validRows.map(r => r.studentEmail));
      const schoolEmails = new Set((schoolExisting || []).map(s => s.student_email));
      const schoolToInsert = validRows.filter(r => !schoolEmails.has(r.studentEmail));
      if (schoolToInsert.length > 0) {
        await supabase.from('students').insert(
          schoolToInsert.map(r => {
            const parts = r.studentName.trim().split(/\s+/);
            const cls = classes.find(c => c.id === r.classId);
            return {
              first_name: parts[0] || '',
              last_name: parts.slice(1).join(' ') || '',
              student_email: r.studentEmail,
              // section = "Period N" so the school-wide gradebook can filter by class
              section: cls ? String(cls.period) : null,
            };
          })
        );
      }
    }

    return { added: toInsert.length, skipped: rows.length - toInsert.length };
  }, [teacherEmail, classes]);

  return {
    classes,
    students,
    tickets,
    requests,
    loading,
    actions: {
      approveRequest,
      denyRequest,
      grantMoleDollars,
      advanceTicket,
      completeTicket,
      pushNotification,
      addClass,
      addStudentToClass,
      bulkProvisionStudents,
    },
  };
}

// ─── Student composite hook ───────────────────────────────────────────────────
// Loads only this student's own data (RLS enforces student_email = auth user).
// Returns mock-safe empty defaults when studentEmail is null.

export function useStudentClassroom(studentEmail) {
  const [profile, setProfile] = useState(null);
  const [myClass, setMyClass] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [myAssignments, setMyAssignments] = useState([]);
  const [myGrades, setMyGrades] = useState([]);
  const [myGradeProfile, setMyGradeProfile] = useState(null);

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !studentEmail) return;
    let active = true;
    setLoading(true);
    setNotFound(false);

    async function load() {
      try {
        const { data: stu } = await supabase
          .from('classroom_students')
          .select('*')
          .eq('student_email', studentEmail)
          .maybeSingle();

        if (!active) return;

        if (!stu) {
          setProfile(null);
          setNotFound(true);
          return;
        }

        const [{ data: cls }, { data: tkt }, { data: req }, { data: notif }] =
          await Promise.all([
            supabase
              .from('classroom_classes')
              .select('*')
              .eq('id', stu.class_id)
              .single(),
            supabase
              .from('help_tickets')
              .select('*')
              .eq('student_email', studentEmail)
              .order('created_at', { ascending: false }),
            supabase
              .from('mole_requests')
              .select('*')
              .eq('student_email', studentEmail)
              .order('created_at', { ascending: false }),
            supabase
              .from('classroom_notifications')
              .select('*')
              .eq('student_email', studentEmail)
              .order('created_at', { ascending: false })
              .limit(20),
          ]);

        if (!active) return;

        const notifMapped = (notif || []).map(mapNotification);
        setProfile(mapStudent(stu, cls, notifMapped));
        setMyClass(cls ? mapClass(cls) : null);
        setTickets((tkt || []).map(mapTicket));
        setRequests((req || []).map(mapRequest));
        setNotifications(notifMapped);

        const [{ data: gAssignments }, { data: gGrades }, { data: gProfile }] =
          await Promise.all([
            supabase.from('gradebook_assignments').select('*').eq('teacher_email', stu.teacher_email),
            supabase.from('gradebook_grades').select('*').eq('student_id', stu.id),
            supabase.from('gradebook_profiles').select('*').eq('teacher_email', stu.teacher_email).eq('is_active', true).maybeSingle(),
          ]);
        if (!active) return;
        setMyAssignments(gAssignments || []);
        setMyGrades(gGrades || []);
        setMyGradeProfile(gProfile || null);
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`student-classroom-${studentEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_students',
          filter: `student_email=eq.${studentEmail}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_tickets',
          filter: `student_email=eq.${studentEmail}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mole_requests',
          filter: `student_email=eq.${studentEmail}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_notifications',
          filter: `student_email=eq.${studentEmail}` }, load)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [studentEmail]);

  // ── Student write actions ──────────────────────────────────────────────────

  const submitTicket = useCallback(async ({ studentId, teacherEmail, classId, studentEm, studentName, category, details }) => {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.from('help_tickets').insert({
      teacher_email: teacherEmail,
      class_id: classId,
      student_id: studentId,
      student_email: studentEm,
      student_name: studentName,
      category,
      details,
      status: 'submitted',
    });
  }, []);

  const submitMoleRequest = useCallback(async (studentId, item, cost) => {
    if (!SUPABASE_READY || !supabase) return false;
    const { error } = await supabase.rpc('submit_mole_request', {
      p_student_id: studentId,
      p_item: item,
      p_cost: cost,
    });
    return !error;
  }, []);

  const completeWizard = useCallback(async (studentId, payload) => {
    if (!SUPABASE_READY || !supabase) return;
    await supabase.rpc('complete_wizard', {
      p_student_id: studentId,
      p_gizmo: payload.gizmo,
      p_guardian: payload.guardian,
      p_signed_name: payload.safety.signedName,
    });
  }, []);

  const markNotificationsRead = useCallback(async (studentEm) => {
    if (!SUPABASE_READY || !supabase) return;
    await supabase
      .from('classroom_notifications')
      .update({ read: true })
      .eq('student_email', studentEm)
      .eq('read', false);
  }, []);

  return {
    profile,
    myClass,
    tickets,
    requests,
    notifications,
    myAssignments,
    myGrades,
    myGradeProfile,
    loading,
    notFound,
    actions: { submitTicket, submitMoleRequest, completeWizard, markNotificationsRead },
  };
}
