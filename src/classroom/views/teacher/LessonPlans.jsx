import LessonBoard from '../../components/LessonBoard.jsx';

// Teacher sees all three subject planbooks.
export default function LessonPlans() {
  return <LessonBoard subjects={['chemistry', 'physics', 'geology']} />;
}
