import { useState, Component } from 'react';
import { useApp } from './ClassroomContext.jsx';
import ClassroomSetupWizard, { setupDone } from './views/ClassroomSetupWizard.jsx';
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
import ClassroomThemeLayer from './ClassroomThemeLayer.jsx';
import AIGrader from '../components/AIGrader.jsx';

class ClassroomErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
          <p className="text-lg font-semibold text-red-400">Something went wrong</p>
          <p className="max-w-sm text-sm text-zinc-400">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-xl bg-gold-500 px-6 py-2 text-sm font-bold text-ink-950 hover:bg-gold-400"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Embedded inside the JAGStaff shell (below the school top nav) — so this no
// longer owns the page backdrop; the school <div className="app-shell
// app-backdrop"> provides it. The classroom keeps its own SideNav +
// TopControlBar for in-zone navigation.
export default function ClassroomApp({ user, students = [], isAdmin = false }) {
  const { role, activeView, activeStudent } = useApp();
  const [navOpen, setNavOpen] = useState(false);
  const [showSetup, setShowSetup] = useState(
    () => role === 'teacher' && !!user?.email && !setupDone(user.email)
  );

  // Day-1 onboarding intercept: block ALL student navigation until the
  // Welcome Wizard is complete.
  const wizardBlocking = role === 'student' && activeStudent && !activeStudent.wizardComplete;

  return (
    <ClassroomErrorBoundary>
      <ClassroomThemeLayer>
        {showSetup && (
          <ClassroomSetupWizard
            userEmail={user?.email}
            onComplete={() => setShowSetup(false)}
          />
        )}

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
      </ClassroomThemeLayer>
    </ClassroomErrorBoundary>
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
