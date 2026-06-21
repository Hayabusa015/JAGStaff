import React, { useState } from 'react';
import { useApp } from './ClassroomContext.jsx';
import RoleSwitcherBanner from './components/RoleSwitcherBanner.jsx';
import SideNav from './components/SideNav.jsx';
import TopControlBar from './components/TopControlBar.jsx';
import WelcomeWizard from './views/WelcomeWizard.jsx';
import MaterialsView from './views/MaterialsView.jsx';

// Teacher views
import TeacherDashboard from './views/teacher/TeacherDashboard.jsx';
import MoleApprovalQueue from './views/teacher/MoleApprovalQueue.jsx';
import HelpDeskKanban from './views/teacher/HelpDeskKanban.jsx';
import ParentMailer from './views/teacher/ParentMailer.jsx';
import LessonPlans from './views/teacher/LessonPlans.jsx';

// Student views
import StudentDashboard from './views/student/StudentDashboard.jsx';
import CashInShop from './views/student/CashInShop.jsx';
import StudentHelpDesk from './views/student/StudentHelpDesk.jsx';
import StudentLessonPlans from './views/student/StudentLessonPlans.jsx';

// Per-teacher tools relocated from the School zone into "My Classroom".
import Gradebook from '../components/Gradebook.jsx';
import AIGrader from '../components/AIGrader.jsx';

// Embedded inside the JAGStaff shell (below the school top nav) — so this no
// longer owns the page backdrop; the school <div className="app-shell
// app-backdrop"> provides it. The classroom keeps its own SideNav +
// TopControlBar for in-zone navigation.
export default function ClassroomApp({ user, students = [], isAdmin = false }) {
  const { role, activeView, activeStudent, isSupabase, loading, classes, seedDemo } = useApp();
  const [navOpen, setNavOpen] = useState(false);

  // Day-1 onboarding intercept: block ALL student navigation until the
  // Welcome Wizard is complete.
  const wizardBlocking = role === 'student' && activeStudent && !activeStudent.wizardComplete;

  // Fresh Supabase teacher with no classes yet → offer a one-time demo seed.
  const needsSeed = isSupabase && role === 'teacher' && !loading && classes.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RoleSwitcherBanner />

      {wizardBlocking ? (
        <WelcomeWizard key={activeStudent.id} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopControlBar onMenu={() => setNavOpen(true)} />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto max-w-7xl animate-fade-in">
                {needsSeed ? (
                  <SeedPrompt onSeed={seedDemo} />
                ) : (
                  <ViewRouter
                    role={role}
                    view={activeView}
                    user={user}
                    students={students}
                    isAdmin={isAdmin}
                  />
                )}
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
}

function SeedPrompt({ onSeed }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="brand-hairline mx-auto mt-10 max-w-lg rounded-2xl bg-ink-850/80 p-8 text-center ring-1 ring-gold-500/30">
      <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-zinc-50">
        Welcome to My Classroom
      </h2>
      <p className="mt-3 text-sm text-zinc-400">
        Your classroom is empty. Load the demo science classes (Chemistry, Physics,
        Geology) with sample rosters, units, and materials so you can explore — you can
        edit or replace them anytime.
      </p>
      <button
        onClick={async () => { setBusy(true); try { await onSeed?.(); } finally { setBusy(false); } }}
        disabled={busy}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 font-semibold text-ink-950 shadow-gold-sm transition hover:bg-gold-400 disabled:opacity-60"
      >
        {busy ? 'Loading…' : 'Load demo classes'}
      </button>
    </div>
  );
}

function ViewRouter({ role, view, user, students }) {
  if (role === 'teacher') {
    switch (view) {
      case 'dashboard':
        return <TeacherDashboard />;
      case 'materials':
        return <MaterialsView />;
      case 'mole':
        return <MoleApprovalQueue />;
      case 'helpdesk':
        return <HelpDeskKanban />;
      case 'mailer':
        return <ParentMailer />;
      case 'lessons':
        return <LessonPlans />;
      case 'gradebook':
        return <Gradebook students={students} user={user} />;
      case 'aigrader':
        return <AIGrader user={user} />;
      default:
        return <TeacherDashboard />;
    }
  }
  // student
  switch (view) {
    case 'dashboard':
      return <StudentDashboard />;
    case 'materials':
      return <MaterialsView />;
    case 'mole':
      return <CashInShop />;
    case 'helpdesk':
      return <StudentHelpDesk />;
    case 'lessons':
      return <StudentLessonPlans />;
    default:
      return <StudentDashboard />;
  }
}
