import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import {
  MOCK_MODE,
  CLASSES,
  STUDENTS,
  MOLE_REQUESTS,
  HELP_TICKETS,
  MOLE_MILESTONE,
  DEFAULT_DASHBOARD_LAYOUT,
  BEHAVIOR_SCENARIOS,
  SUBJECT_THEME,
  SEED_UNITS,
} from './data/mockData.js';
import { putBlob, getBlob, deleteBlob } from './utils/idb.js';
import { extractText } from './utils/fileText.js';
import { useSupabaseClassroom } from '../classroomData.js';

const AppContext = createContext(null);

let idCounter = 1000;
const nextId = (prefix) => `${prefix}-${++idCounter}`;

// Deep-clone seed data so mutations never leak back into the module-level mock.
const clone = (data) => JSON.parse(JSON.stringify(data));

const UNITS_STORAGE_KEY = 'gmen-units-v1';

// Units + materials persist locally (file blobs live in IndexedDB). Browser-only;
// falls back to the seed during SSR / first run.
function loadUnits() {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(UNITS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore corrupt storage */
    }
  }
  return clone(SEED_UNITS);
}

export function AppProvider({ children, user }) {
  // Supabase-backed classroom data — active when configured AND a teacher email
  // is known; otherwise everything falls back to the in-memory mock below.
  const supa = useSupabaseClassroom(user?.email);
  const useSupa = supa.ready;

  // ---- Global UI state ------------------------------------------------------
  const [role, setRole] = useState('teacher'); // 'teacher' | 'student'
  const [activeStudentId, setActiveStudentId] = useState('stu-chem-demo');
  const [activeView, setActiveView] = useState('dashboard');
  const [activeClassId, setActiveClassId] = useState('cls-chem');

  // ---- Mock "database" ------------------------------------------------------
  const [students, setStudents] = useState(() => clone(STUDENTS));
  const [moleRequests, setMoleRequests] = useState(() => clone(MOLE_REQUESTS));
  const [tickets, setTickets] = useState(() => clone(HELP_TICKETS));
  const [emailLog, setEmailLog] = useState([]);
  const [metrics, setMetrics] = useState({ approvedMoleDollars: 30, completedTasks: 1 });
  const [dashboardLayout, setDashboardLayout] = useState(() => clone(DEFAULT_DASHBOARD_LAYOUT));
  const [units, setUnits] = useState(loadUnits);

  // Persist units + material metadata locally (file blobs are stored in IndexedDB).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [units]);

  // ---- Resolved data source (Supabase when ready, else mock) ----------------
  const classesR = useSupa ? supa.classes : CLASSES;
  const studentsR = useSupa ? supa.students : students;
  const moleRequestsR = useSupa ? supa.moleRequests : moleRequests;
  const ticketsR = useSupa ? supa.tickets : tickets;
  const unitsR = useSupa ? supa.units : units;
  const emailLogR = useSupa ? supa.emailLog : emailLog;
  const metricsR = useSupa ? supa.metrics : metrics;

  // When backed by Supabase, point the active class/student at real rows.
  useEffect(() => {
    if (!useSupa) return;
    if (classesR.length && !classesR.some((c) => c.id === activeClassId)) setActiveClassId(classesR[0].id);
    if (studentsR.length && !studentsR.some((s) => s.id === activeStudentId)) setActiveStudentId(studentsR[0].id);
  }, [useSupa, classesR, studentsR, activeClassId, activeStudentId]);

  // ---- Derived helpers ------------------------------------------------------
  const activeStudent = useMemo(
    () => studentsR.find((s) => s.id === activeStudentId) || studentsR[0],
    [studentsR, activeStudentId]
  );

  const getClass = useCallback((classId) => classesR.find((c) => c.id === classId), [classesR]);
  const getStudent = useCallback((id) => studentsR.find((s) => s.id === id), [studentsR]);
  const getTheme = useCallback((classId) => {
    const cls = classesR.find((c) => c.id === classId);
    return SUBJECT_THEME[cls?.subject] || SUBJECT_THEME.physics;
  }, [classesR]);

  // ===========================================================================
  //  WIZARD
  // ===========================================================================
  const completeWizard = useCallback((studentId, payload) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              wizardComplete: true,
              gizmo: { ...payload.gizmo },
              guardian: { ...payload.guardian },
              safety: {
                signedName: payload.safety.signedName,
                signedAt: payload.safety.signedAt, // exact timestamp logged
              },
            }
          : s
      )
    );
  }, []);

  // ===========================================================================
  //  MOLE DOLLAR ECONOMY
  //  Rule: students may only spend back to the Teacher Vault — never transfer
  //  to another student. Submitting a request instantly locks the tokens out
  //  of the spendable balance.
  // ===========================================================================
  // NOTE: actions read from current state and call each setter at the top level
  // (never nested inside another setter's updater) so they stay correct under
  // React StrictMode's double-invocation of updater functions.
  const submitMoleRequest = useCallback(
    (studentId, item) => {
      const student = students.find((s) => s.id === studentId);
      if (!student || student.balance < item.cost) return false; // insufficient funds — no-op
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? { ...s, balance: s.balance - item.cost, lockedBalance: s.lockedBalance + item.cost }
            : s
        )
      );
      setMoleRequests((prev) => [
        {
          id: nextId('req'),
          studentId,
          item: item.label,
          cost: item.cost,
          status: 'pending',
          note: '',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      return true;
    },
    [students]
  );

  const approveMoleRequest = useCallback(
    (requestId) => {
      const req = moleRequests.find((r) => r.id === requestId);
      if (!req || req.status !== 'pending') return;
      // Permanently deduct locked tokens (they were already removed from balance).
      setStudents((prev) =>
        prev.map((s) =>
          s.id === req.studentId
            ? { ...s, lockedBalance: Math.max(0, s.lockedBalance - req.cost) }
            : s
        )
      );
      setMoleRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r))
      );
      setMetrics((m) => ({ ...m, approvedMoleDollars: m.approvedMoleDollars + req.cost }));
      pushNotification(req.studentId, {
        kind: 'mole',
        tone: 'success',
        text: `Your "${req.item}" redemption was approved! 🎉`,
      });
    },
    [moleRequests]
  );

  const denyMoleRequest = useCallback(
    (requestId, note) => {
      const req = moleRequests.find((r) => r.id === requestId);
      if (!req || req.status !== 'pending') return;
      // Return the locked funds to the student's spendable balance.
      setStudents((prev) =>
        prev.map((s) =>
          s.id === req.studentId
            ? {
                ...s,
                balance: s.balance + req.cost,
                lockedBalance: Math.max(0, s.lockedBalance - req.cost),
              }
            : s
        )
      );
      setMoleRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'denied', note: note || '' } : r))
      );
      pushNotification(req.studentId, {
        kind: 'mole',
        tone: 'warning',
        text: `Your "${req.item}" redemption was denied. ${note ? `Note: ${note}` : ''}`.trim(),
      });
    },
    [moleRequests]
  );

  // ===========================================================================
  //  HELP DESK
  // ===========================================================================
  const submitTicket = useCallback((studentId, category, details) => {
    setTickets((prev) => [
      {
        id: nextId('tkt'),
        studentId,
        category,
        details,
        status: 'submitted',
        createdAt: new Date().toISOString(),
        archived: false,
      },
      ...prev,
    ]);
  }, []);

  const advanceTicket = useCallback((ticketId) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId && t.status === 'submitted' ? { ...t, status: 'in_progress' } : t
      )
    );
  }, []);

  const completeTicket = useCallback(
    (ticketId) => {
      const t = tickets.find((x) => x.id === ticketId);
      if (!t || t.status === 'completed') return;
      setTickets((prev) =>
        prev.map((x) => (x.id === ticketId ? { ...x, status: 'completed', archived: true } : x))
      );
      setMetrics((m) => ({ ...m, completedTasks: m.completedTasks + 1 }));
      pushNotification(t.studentId, {
        kind: 'ticket',
        tone: 'success',
        text: `Your "${t.category}" request was marked complete by Mr. Shull. ✅`,
      });
    },
    [tickets]
  );

  // ===========================================================================
  //  NOTIFICATIONS (student-facing flags)
  // ===========================================================================
  function pushNotification(studentId, note) {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              notifications: [
                { id: nextId('ntf'), read: false, createdAt: new Date().toISOString(), ...note },
                ...s.notifications,
              ],
            }
          : s
      )
    );
  }

  const markNotificationsRead = useCallback((studentId) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }
          : s
      )
    );
  }, []);

  // ===========================================================================
  //  PARENT COMMUNICATION ENGINE
  // ===========================================================================
  const generateEmailDraft = useCallback(
    (studentId, tone, scenario, notes) => {
      const student = students.find((s) => s.id === studentId);
      if (!student) return null;
      const cls = CLASSES.find((c) => c.id === student.classId);
      const guardianName = student.guardian.name || 'Parent/Guardian';
      const firstName = student.name.split(' ')[0];
      const positive = tone === 'positive';
      const subject = positive
        ? `Great news about ${firstName} in ${cls.name}`
        : `A quick check-in about ${firstName} in ${cls.name}`;
      const opener = positive
        ? `I wanted to take a moment to share some positive news with you.`
        : `I'm reaching out to keep you in the loop on something I noticed in class.`;
      const body = positive
        ? `Today in our Period ${cls.period} ${cls.name} class, ${firstName} stood out: ${scenario.toLowerCase()}. It's a pleasure to have ${firstName} in the lab, and I wanted you to hear about the great work happening.`
        : `During our Period ${cls.period} ${cls.name} class, I observed that ${firstName} ${scenario.toLowerCase()}. I'm confident this is an easy course-correct, and I wanted to partner with you so we're on the same page.`;
      const closing = positive
        ? `Thank you for your continued support — please celebrate this with ${firstName} tonight!`
        : `Please reach out with any questions. Working together, I know ${firstName} will be back on track quickly.`;
      const notesBlock = notes?.trim() ? `\n\nAdditional notes: ${notes.trim()}` : '';
      return {
        to: student.guardian.email || '(no guardian email on file)',
        guardianName,
        subject,
        body: `Dear ${guardianName},\n\n${opener}\n\n${body}${notesBlock}\n\n${closing}\n\nWarm regards,\nMr. Shull\nScience Department · Jag Schools`,
      };
    },
    [students]
  );

  const sendParentEmail = useCallback((draft, meta) => {
    const entry = {
      id: nextId('mail'),
      ...meta,
      to: draft.to,
      subject: draft.subject,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };
    setEmailLog((prev) => [entry, ...prev]);
    return entry;
  }, []);

  // ===========================================================================
  //  CLASS MATERIALS  (units + materials; teacher-managed, student-readable)
  // ===========================================================================
  const getUnitsForClass = useCallback(
    (classId) =>
      unitsR.filter((u) => u.classId === classId).sort((a, b) => a.order - b.order),
    [unitsR]
  );

  const addUnit = useCallback((classId, { title, description }) => {
    setUnits((prev) => {
      const maxOrder = prev
        .filter((u) => u.classId === classId)
        .reduce((m, u) => Math.max(m, u.order), -1);
      return [
        ...prev,
        {
          id: nextId('unit'),
          classId,
          title: title.trim(),
          description: (description || '').trim(),
          order: maxOrder + 1,
          materials: [],
        },
      ];
    });
  }, []);

  const updateUnit = useCallback((unitId, patch) => {
    setUnits((prev) => prev.map((u) => (u.id === unitId ? { ...u, ...patch } : u)));
  }, []);

  const deleteUnit = useCallback(
    (unitId) => {
      const unit = units.find((u) => u.id === unitId);
      unit?.materials?.forEach((m) => {
        if (m.hasFile) deleteBlob(m.id);
      });
      setUnits((prev) => prev.filter((u) => u.id !== unitId));
    },
    [units]
  );

  // meta: { type, title, description, studyContent }. file is optional (real upload).
  const addMaterial = useCallback(async (unitId, meta, file) => {
    const id = nextId('mat');
    const material = {
      id,
      type: meta.type || 'other',
      title: meta.title.trim(),
      description: (meta.description || '').trim(),
      studyContent: (meta.studyContent || '').trim(),
      keyTerms: [],
      createdAt: new Date().toISOString(),
      hasFile: false,
    };
    if (file) {
      try {
        await putBlob(id, file);
        material.hasFile = true;
        material.fileName = file.name;
        material.fileType = file.type || '';
        material.fileSize = file.size;
        material.extractedText = (await extractText(file)).slice(0, 20000);
      } catch {
        /* keep the metadata even if blob/extraction fails */
      }
    }
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unitId ? { ...u, materials: [...u.materials, material] } : u
      )
    );
    return material;
  }, []);

  const deleteMaterial = useCallback((unitId, materialId) => {
    deleteBlob(materialId);
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unitId
          ? { ...u, materials: u.materials.filter((m) => m.id !== materialId) }
          : u
      )
    );
  }, []);

  // Open an uploaded file in a new tab from its IndexedDB blob.
  const openMaterialFile = useCallback(async (materialId) => {
    const blob = await getBlob(materialId);
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  }, []);

  const resetMaterials = useCallback(() => setUnits(clone(SEED_UNITS)), []);

  // ===========================================================================
  //  DASHBOARD LAYOUT SCHEMA (req #6 — dynamic widget configuration)
  // ===========================================================================
  const toggleWidget = useCallback((widgetId) => {
    setDashboardLayout((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, visible: !w.visible } : w))
    );
  }, []);

  const moveWidget = useCallback((widgetId, direction) => {
    setDashboardLayout((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((w) => w.id === widgetId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const a = sorted[idx];
      const b = sorted[swapIdx];
      return prev.map((w) => {
        if (w.id === a.id) return { ...w, order: b.order };
        if (w.id === b.id) return { ...w, order: a.order };
        return w;
      });
    });
  }, []);

  const cycleWidgetSpan = useCallback((widgetId) => {
    setDashboardLayout((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, span: (w.span % 3) + 1 } : w))
    );
  }, []);

  const resetLayout = useCallback(() => setDashboardLayout(clone(DEFAULT_DASHBOARD_LAYOUT)), []);

  // ---- Context value --------------------------------------------------------
  const value = {
    MOCK_MODE: !useSupa,
    isSupabase: useSupa,
    loading: useSupa ? supa.loading : false,
    seedDemo: useSupa ? supa.seedDemo : null,
    classes: classesR,
    behaviorScenarios: BEHAVIOR_SCENARIOS,
    moleMilestone: MOLE_MILESTONE,

    role,
    setRole,
    activeStudentId,
    setActiveStudentId,
    activeStudent,
    activeView,
    setActiveView,
    activeClassId,
    setActiveClassId,

    students: studentsR,
    moleRequests: moleRequestsR,
    tickets: ticketsR,
    emailLog: emailLogR,
    metrics: metricsR,
    dashboardLayout,
    units: unitsR,

    getClass,
    getStudent,
    getTheme,
    getUnitsForClass,
    addUnit: useSupa ? supa.addUnit : addUnit,
    updateUnit: useSupa ? supa.updateUnit : updateUnit,
    deleteUnit: useSupa ? supa.deleteUnit : deleteUnit,
    addMaterial: useSupa ? supa.addMaterial : addMaterial,
    deleteMaterial: useSupa ? supa.deleteMaterial : deleteMaterial,
    openMaterialFile: useSupa ? supa.openMaterialFile : openMaterialFile,
    resetMaterials,

    completeWizard: useSupa ? supa.completeWizard : completeWizard,
    submitMoleRequest: useSupa ? supa.submitMoleRequest : submitMoleRequest,
    approveMoleRequest: useSupa ? supa.approveMoleRequest : approveMoleRequest,
    denyMoleRequest: useSupa ? supa.denyMoleRequest : denyMoleRequest,
    submitTicket: useSupa ? supa.submitTicket : submitTicket,
    advanceTicket: useSupa ? supa.advanceTicket : advanceTicket,
    completeTicket: useSupa ? supa.completeTicket : completeTicket,
    markNotificationsRead: useSupa ? supa.markNotificationsRead : markNotificationsRead,
    generateEmailDraft,
    sendParentEmail: useSupa ? supa.sendParentEmail : sendParentEmail,

    toggleWidget,
    moveWidget,
    cycleWidgetSpan,
    resetLayout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
