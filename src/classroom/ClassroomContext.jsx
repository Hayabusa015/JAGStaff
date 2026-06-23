import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import {
  MOCK_MODE,
  CLASSES,
  STUDENTS,
  MOLE_REQUESTS,
  HELP_TICKETS,
  MOLE_MILESTONE,
  CASH_IN_SHOP,
  DEFAULT_DASHBOARD_LAYOUT,
  BEHAVIOR_SCENARIOS,
  SUBJECT_THEME,
  SEED_UNITS,
} from './data/mockData.js';
import { putBlob, getBlob, deleteBlob } from './utils/idb.js';
import { extractText } from './utils/fileText.js';
import { SUPABASE_READY } from '../supabase.js';
import { useTeacherClassroom, useStudentClassroom } from '../classroomData.js';

const AppContext = createContext(null);

let idCounter = 1000;
const nextId = (prefix) => `${prefix}-${++idCounter}`;

// Deep-clone seed data so mutations never leak back into the module-level mock.
const clone = (data) => JSON.parse(JSON.stringify(data));

const UNITS_STORAGE_KEY = 'gmen-units-v1';
const MOLE_EC_KEY = 'gmen-mole-ec-v1';
const TEACHER_PROFILE_KEY = 'gmen-teacher-profile-v1';
const CLASSROOM_DESIGN_KEY = 'gmen-classroom-design-v1';
const QUICK_LINKS_KEY = 'gmen-quick-links-v1';

const DEFAULT_QUICK_LINKS = [
  { id: 'dl', label: 'Delta Math',     url: 'https://deltamath.com',  icon: '📐' },
  { id: 'qz', label: 'Quizizz',        url: 'https://quizizz.com',    icon: '🧠' },
  { id: 'vc', label: 'Vocabulary.com', url: 'https://vocabulary.com', icon: '📚' },
];

function loadQuickLinks() {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(QUICK_LINKS_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
  }
  return [...DEFAULT_QUICK_LINKS];
}

export const DEFAULT_CLASSROOM_DESIGN = {
  preset: 'gold',
  accentColor: '#F5C025',
  accentAlt: '#c98f00',
  heroText: '#0a0700',
  bgColor: '#08080A',
  bgType: 'solid',
  bgGradientFrom: '#080600',
  bgGradientTo: '#150f00',
  bgImageUrl: '',
  bgImageOpacity: 0.15,
  pattern: 'none',
  patternOpacity: 0.04,
};

function loadClassroomDesign() {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(CLASSROOM_DESIGN_KEY);
      if (saved) return { ...DEFAULT_CLASSROOM_DESIGN, ...JSON.parse(saved) };
    } catch { /* ignore */ }
  }
  return { ...DEFAULT_CLASSROOM_DESIGN };
}

const DEFAULT_TEACHER_PROFILE = {
  name: 'Mr. Shull',
  classroom: 'Shull Science',
  tagline: 'G-MEN Command',
  currencyName: 'Mole Dollar',
  currencySymbol: 'MD',
  commonCurriculumApiKey: '',
};

function loadTeacherProfile() {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(TEACHER_PROFILE_KEY);
      if (saved) return { ...DEFAULT_TEACHER_PROFILE, ...JSON.parse(saved) };
    } catch { /* ignore */ }
  }
  return { ...DEFAULT_TEACHER_PROFILE };
}

function loadMoleEconomy() {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(MOLE_EC_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
  }
  return { milestone: MOLE_MILESTONE, shopItems: clone(CASH_IN_SHOP) };
}

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

// user: the logged-in Supabase user object (or null in mock/dev mode)
// isStaff: true for teachers, false for real student logins
export function AppProvider({ children, user = null, isStaff = true }) {
  const liveMode = SUPABASE_READY && !!user;
  const teacherEmail = (liveMode && isStaff) ? user.email : null;
  const studentEmail = (liveMode && !isStaff) ? user.email : null;

  // ---- Supabase hooks (no-op when email is null) ---------------------------
  const {
    classes: liveClasses, students: liveStudents,
    tickets: liveTeacherTickets, requests: liveTeacherRequests,
    loading: teacherLoading, actions: teacherActions,
  } = useTeacherClassroom(teacherEmail);

  const {
    profile: liveProfile, myClass: liveMyClass,
    tickets: liveStudentTickets, requests: liveStudentRequests,
    notifications: liveNotifications,
    loading: studentLoading, notFound: studentNotFound,
    actions: studentActions,
  } = useStudentClassroom(studentEmail);

  // ---- Global UI state ------------------------------------------------------
  const [role, setRole] = useState(() => isStaff ? 'teacher' : 'student');
  const [activeStudentId, setActiveStudentId] = useState('stu-chem-demo');
  const [activeView, setActiveView] = useState('dashboard');
  const [activeClassId, setActiveClassId] = useState('cls-chem');

  // ---- Mock "database" (used when liveMode = false) -------------------------
  const [students, setStudents] = useState(() => clone(STUDENTS));
  const [moleRequests, setMoleRequests] = useState(() => clone(MOLE_REQUESTS));
  const [tickets, setTickets] = useState(() => clone(HELP_TICKETS));
  const [emailLog, setEmailLog] = useState([]);
  const [metrics, setMetrics] = useState({ approvedMoleDollars: 30, completedTasks: 1 });
  const [dashboardLayout, setDashboardLayout] = useState(() => clone(DEFAULT_DASHBOARD_LAYOUT));
  const [units, setUnits] = useState(loadUnits);
  const [moleEconomy, setMoleEconomy] = useState(loadMoleEconomy);
  const [teacherProfile, setTeacherProfile] = useState(loadTeacherProfile);
  const [classroomDesign, setClassroomDesign] = useState(loadClassroomDesign);
  const [quickLinks, setQuickLinks] = useState(loadQuickLinks);

  // Persist units + material metadata locally (file blobs are stored in IndexedDB).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units));
    } catch { /* storage full / unavailable — non-fatal */ }
  }, [units]);

  // Persist mole economy config.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(MOLE_EC_KEY, JSON.stringify(moleEconomy));
    } catch { /* ignore */ }
  }, [moleEconomy]);

  // Persist teacher profile.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(TEACHER_PROFILE_KEY, JSON.stringify(teacherProfile));
    } catch { /* ignore */ }
  }, [teacherProfile]);

  // Persist classroom visual design.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(CLASSROOM_DESIGN_KEY, JSON.stringify(classroomDesign));
    } catch { /* ignore */ }
  }, [classroomDesign]);

  // Persist quick links.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(QUICK_LINKS_KEY, JSON.stringify(quickLinks));
    } catch { /* ignore */ }
  }, [quickLinks]);

  // ---- Supabase → local state sync -----------------------------------------
  // Teacher side: sync live data into local state once it arrives.
  useEffect(() => {
    if (!liveMode || !isStaff || liveStudents.length === 0) return;
    setStudents(liveStudents);
  }, [liveStudents, liveMode, isStaff]);

  useEffect(() => {
    if (!liveMode || !isStaff || liveTeacherTickets.length === 0) return;
    setTickets(liveTeacherTickets);
  }, [liveTeacherTickets, liveMode, isStaff]);

  useEffect(() => {
    if (!liveMode || !isStaff || liveTeacherRequests.length === 0) return;
    setMoleRequests(liveTeacherRequests);
  }, [liveTeacherRequests, liveMode, isStaff]);

  // Student side: load the real student's profile into local state.
  useEffect(() => {
    if (!liveMode || isStaff || !liveProfile) return;
    setStudents([liveProfile]);
    setActiveStudentId(liveProfile.id);
    setActiveClassId(liveProfile.classId);
  }, [liveProfile, liveMode, isStaff]);

  useEffect(() => {
    if (!liveMode || isStaff) return;
    setTickets(liveStudentTickets);
  }, [liveStudentTickets, liveMode, isStaff]);

  useEffect(() => {
    if (!liveMode || isStaff) return;
    setMoleRequests(liveStudentRequests);
  }, [liveStudentRequests, liveMode, isStaff]);

  // ---- Derived helpers ------------------------------------------------------
  // Merge live classes (Supabase) with the mock CLASSES constant.
  // In live teacher mode, prefer liveClasses; in live student mode, prefer liveMyClass.
  const allClasses = useMemo(() => {
    if (liveMode && isStaff && liveClasses.length > 0) return liveClasses;
    if (liveMode && !isStaff && liveMyClass) return [liveMyClass];
    return CLASSES;
  }, [liveMode, isStaff, liveClasses, liveMyClass]);

  const activeStudent = useMemo(() => {
    const base = students.find((s) => s.id === activeStudentId) || students[0];
    // Merge live notifications into the active student in student mode.
    if (liveMode && !isStaff && base && liveNotifications.length > 0) {
      return { ...base, notifications: liveNotifications };
    }
    return base;
  }, [students, activeStudentId, liveMode, isStaff, liveNotifications]);

  const getClass = useCallback(
    (classId) =>
      allClasses.find((c) => c.id === classId) || CLASSES.find((c) => c.id === classId),
    [allClasses]
  );
  const getStudent = useCallback((id) => students.find((s) => s.id === id), [students]);
  const getTheme = useCallback(
    (classId) => {
      const cls =
        allClasses.find((c) => c.id === classId) || CLASSES.find((c) => c.id === classId);
      return SUBJECT_THEME[cls?.subject] || SUBJECT_THEME.chemistry;
    },
    [allClasses]
  );

  // ===========================================================================
  //  WIZARD
  // ===========================================================================
  const completeWizard = useCallback(
    (studentId, payload) => {
      // Live student mode → persist via RPC (balance mutations are server-side).
      if (liveMode && !isStaff && studentActions) {
        studentActions.completeWizard(studentId, payload);
        // Optimistic UI update (realtime will confirm).
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  wizardComplete: true,
                  gizmo: { ...payload.gizmo },
                  guardian: { ...payload.guardian },
                  safety: { signedName: payload.safety.signedName, signedAt: payload.safety.signedAt },
                }
              : s
          )
        );
        return;
      }
      // Mock fallback.
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
                  signedAt: payload.safety.signedAt,
                },
              }
            : s
        )
      );
    },
    [liveMode, isStaff, studentActions]
  );

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
    async (studentId, item) => {
      // Live student mode → anti-cheat RPC; balance update comes back via realtime.
      if (liveMode && !isStaff && studentActions) {
        const ok = await studentActions.submitMoleRequest(studentId, item.label, item.cost);
        return ok;
      }
      // Mock fallback.
      const student = students.find((s) => s.id === studentId);
      if (!student || student.balance < item.cost) return false;
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
    [liveMode, isStaff, studentActions, students]
  );

  const approveMoleRequest = useCallback(
    (requestId) => {
      const req = moleRequests.find((r) => r.id === requestId);
      if (!req || req.status !== 'pending') return;
      // Live teacher mode → RPC (server moves tokens + sends notification).
      // Also do optimistic local update so UI responds immediately.
      if (liveMode && isStaff && teacherActions) {
        teacherActions.approveRequest(requestId);
      }
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
    [moleRequests, liveMode, isStaff, teacherActions]
  );

  const denyMoleRequest = useCallback(
    (requestId, note) => {
      const req = moleRequests.find((r) => r.id === requestId);
      if (!req || req.status !== 'pending') return;
      // Live teacher mode → RPC. Also optimistic local update.
      if (liveMode && isStaff && teacherActions) {
        teacherActions.denyRequest(requestId, note);
      }
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
    [moleRequests, liveMode, isStaff, teacherActions]
  );

  // ===========================================================================
  //  HELP DESK
  // ===========================================================================
  const submitTicket = useCallback(
    (studentId, category, details) => {
      // Live student mode → direct INSERT (allowed by student RLS policy).
      if (liveMode && !isStaff && studentActions && activeStudent) {
        studentActions.submitTicket({
          studentId,
          teacherEmail: activeStudent.teacherEmail,
          classId: activeStudent.classId,
          studentEm: activeStudent.studentEmail,
          studentName: activeStudent.name,
          category,
          details,
        });
        return;
      }
      // Mock fallback.
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
    },
    [liveMode, isStaff, studentActions, activeStudent]
  );

  const advanceTicket = useCallback(
    (ticketId) => {
      // Live mode → RPC. Also optimistic local update.
      if (liveMode && isStaff && teacherActions) {
        teacherActions.advanceTicket(ticketId);
      }
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId && t.status === 'submitted' ? { ...t, status: 'in_progress' } : t
        )
      );
    },
    [liveMode, isStaff, teacherActions]
  );

  const completeTicket = useCallback(
    (ticketId) => {
      const t = tickets.find((x) => x.id === ticketId);
      if (!t || t.status === 'completed') return;
      // Live teacher mode → Supabase update. Also optimistic local update.
      if (liveMode && isStaff && teacherActions) {
        teacherActions.completeTicket(ticketId);
      }
      setTickets((prev) =>
        prev.map((x) => (x.id === ticketId ? { ...x, status: 'completed', archived: true } : x))
      );
      setMetrics((m) => ({ ...m, completedTasks: m.completedTasks + 1 }));
      pushNotification(t.studentId, {
        kind: 'ticket',
        tone: 'success',
        text: `Your "${t.category}" request was marked complete by ${teacherProfile.name}. ✅`,
      });
    },
    [tickets, liveMode, isStaff, teacherActions, teacherProfile]
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

  const markNotificationsRead = useCallback(
    (studentId) => {
      // Live student mode → mark in Supabase (by email, since that's the RLS column).
      if (liveMode && !isStaff && studentActions && activeStudent) {
        studentActions.markNotificationsRead(activeStudent.studentEmail);
        return;
      }
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? { ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }
            : s
        )
      );
    },
    [liveMode, isStaff, studentActions, activeStudent]
  );

  // ===========================================================================
  //  PARENT COMMUNICATION ENGINE
  // ===========================================================================
  const generateEmailDraft = useCallback(
    (studentId, tone, scenario, notes) => {
      const student = students.find((s) => s.id === studentId);
      if (!student) return null;
      const cls = allClasses.find((c) => c.id === student.classId) || CLASSES.find((c) => c.id === student.classId);
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
        body: `Dear ${guardianName},\n\n${opener}\n\n${body}${notesBlock}\n\n${closing}\n\nWarm regards,\n${teacherProfile.name}\n${teacherProfile.classroom} · Jag Schools`,
      };
    },
    [students, teacherProfile]
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
      units.filter((u) => u.classId === classId).sort((a, b) => a.order - b.order),
    [units]
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
  //  TEACHER PROFILE  (teacher-configurable, localStorage-persisted)
  // ===========================================================================
  const updateTeacherProfile = useCallback((patch) => {
    setTeacherProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateClassroomDesign = useCallback((patch) => {
    setClassroomDesign((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateQuickLinks = useCallback((links) => setQuickLinks(links), []);

  // ===========================================================================
  //  MOLE ECONOMY SETTINGS  (teacher-configurable, localStorage-persisted)
  // ===========================================================================
  const updateMoleMilestone = useCallback((val) => {
    const n = Math.max(1, Math.round(Number(val) || 1));
    setMoleEconomy((prev) => ({ ...prev, milestone: n }));
  }, []);

  const addShopItem = useCallback((item) => {
    setMoleEconomy((prev) => ({
      ...prev,
      shopItems: [...prev.shopItems, { id: nextId('shop'), icon: 'sparkles', ...item }],
    }));
  }, []);

  const updateShopItem = useCallback((id, patch) => {
    setMoleEconomy((prev) => ({
      ...prev,
      shopItems: prev.shopItems.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }, []);

  const removeShopItem = useCallback((id) => {
    setMoleEconomy((prev) => ({
      ...prev,
      shopItems: prev.shopItems.filter((i) => i.id !== id),
    }));
  }, []);

  const resetMoleEconomy = useCallback(() => {
    setMoleEconomy({ milestone: MOLE_MILESTONE, shopItems: clone(CASH_IN_SHOP) });
  }, []);

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
    MOCK_MODE: !liveMode,
    liveMode,
    studentNotFound,    // true if student logged in but has no classroom profile yet
    teacherLoading,
    studentLoading,
    classes: allClasses,
    behaviorScenarios: BEHAVIOR_SCENARIOS,
    moleMilestone: moleEconomy.milestone,
    shopItems: moleEconomy.shopItems,

    teacherProfile,
    updateTeacherProfile,
    classroomDesign,
    updateClassroomDesign,
    currencyName: teacherProfile.currencyName || 'Mole Dollar',
    currencySymbol: teacherProfile.currencySymbol || 'MD',

    role,
    setRole,
    activeStudentId,
    setActiveStudentId,
    activeStudent,
    activeView,
    setActiveView,
    activeClassId,
    setActiveClassId,

    students,
    moleRequests,
    tickets,
    emailLog,
    metrics,
    dashboardLayout,
    units,

    getClass,
    getStudent,
    getTheme,
    getUnitsForClass,
    addUnit,
    updateUnit,
    deleteUnit,
    addMaterial,
    deleteMaterial,
    openMaterialFile,
    resetMaterials,

    completeWizard,
    submitMoleRequest,
    approveMoleRequest,
    denyMoleRequest,
    submitTicket,
    advanceTicket,
    completeTicket,
    markNotificationsRead,
    generateEmailDraft,
    sendParentEmail,

    updateMoleMilestone,
    addShopItem,
    updateShopItem,
    removeShopItem,
    resetMoleEconomy,

    toggleWidget,
    moveWidget,
    cycleWidgetSpan,
    resetLayout,

    bulkProvisionStudents: teacherActions?.bulkProvisionStudents || (() => Promise.resolve({ added: 0, skipped: 0 })),

    quickLinks,
    updateQuickLinks,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
