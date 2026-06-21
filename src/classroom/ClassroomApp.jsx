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
import ClassroomSettings from './views/teacher/ClassroomSettings.jsx';

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
  const { role, activeView, activeStudent } = useApp();
  const [navOpen, setNavOpen] = useState(false);

  // Day-1 onboarding intercept: block ALL student navigation until the
  // Welcome Wizard is complete.
  const wizardBlocking = role === 'student' && activeStudent && !activeStudent.wizardComplete;

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
                <ViewRouter
                  role={role}
                  view={activeView}
                  user={user}
                  students={students}
                  isAdmin={isAdmin}
                />
              </div>
            </main>
          </div>
        </div>
      )}
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
      case 'settings':
        return <ClassroomSettings />;
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
