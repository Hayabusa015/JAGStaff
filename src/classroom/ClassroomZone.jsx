// Lazy-loaded entry for the whole "My Classroom" zone. App.jsx imports this
// via React.lazy so the classroom code (context, views, mock data) stays out
// of the initial school-portal bundle.
import { AppProvider } from './ClassroomContext.jsx';
import ClassroomApp from './ClassroomApp.jsx';

export default function ClassroomZone({ user, students = [], isAdmin = false }) {
  return (
    <AppProvider user={user} isStaff={true}>
      <ClassroomApp user={user} students={students} isAdmin={isAdmin} />
    </AppProvider>
  );
}
