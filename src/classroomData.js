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

function mapStudent(r, notifications = []) {
  return {
    id: r.id,
    classId: r.class_id,
    teacherEmail: r.teacher_email,
    studentEmail: r.student_email,
    name: r.student_name,
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
      setClasses((cls || []).map(mapClass));
      setStudents((stu || []).map((s) => mapStudent(s)));
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
    return data ? mapStudent(data) : null;
  }, [teacherEmail]);

  // Bulk-provision students from an external source (e.g. Google Classroom sync).
  // Skips any student_email that already exists for this teacher.
  // rows: [{ classId, studentEmail, studentName }]
  const bulkProvisionStudents = useCallback(async (rows) => {
    if (!SUPABASE_READY || !supabase || !teacherEmail) return { added: 0, skipped: rows.length };
    const { data: existing } = await supabase
      .from('classroom_students')
      .select('student_email')
      .eq('teacher_email', teacherEmail);
    const existingEmails = new Set((existing || []).map(s => s.student_email));
    const toInsert = rows.filter(r => r.studentEmail && !existingEmails.has(r.studentEmail));
    if (toInsert.length === 0) return { added: 0, skipped: rows.length };
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
    return { added: toInsert.length, skipped: rows.length - toInsert.length };
  }, [teacherEmail]);

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

  useEffect(() => {
    if (!SUPABASE_READY || !supabase || !studentEmail) return;
    let active = true;
    setLoading(true);
    setNotFound(false);

    async function load() {
      const { data: stu } = await supabase
        .from('classroom_students')
        .select('*')
        .eq('student_email', studentEmail)
        .maybeSingle();

      if (!active) return;

      if (!stu) {
        setProfile(null);
        setNotFound(true);
        setLoading(false);
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
      setProfile(mapStudent(stu, notifMapped));
      setMyClass(cls ? mapClass(cls) : null);
      setTickets((tkt || []).map(mapTicket));
      setRequests((req || []).map(mapRequest));
      setNotifications(notifMapped);
      setLoading(false);
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
    loading,
    notFound,
    actions: { submitTicket, submitMoleRequest, completeWizard, markNotificationsRead },
  };
}
