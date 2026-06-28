import { useApp } from '../../ClassroomContext.jsx';
import LessonBoard from '../../components/LessonBoard.jsx';

// Students see only their own class's planbook.
export default function StudentLessonPlans() {
  const { activeStudent, getClass } = useApp();
  const cls = getClass(activeStudent.classId);
  return <LessonBoard subjects={[cls.subject]} />;
}
