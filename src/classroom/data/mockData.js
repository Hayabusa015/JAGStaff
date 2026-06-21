// =============================================================================
//  MOCK DATA LAYER
//  High-fidelity dummy data so the entire Command Center can be demoed before
//  any real Supabase / Google Classroom / Gmail / Common Curriculum keys are
//  wired up. Flip MOCK_MODE to false once production adapters exist.
// =============================================================================

export const MOCK_MODE = true;

// -----------------------------------------------------------------------------
//  Subject theming — single G-MEN gold identity (gold / black / white).
//  Subjects are no longer separated by hue; they share the gold palette and are
//  distinguished by ICON + a subtle gold "tier" (bright / champagne / deep).
// -----------------------------------------------------------------------------
export const SUBJECT_THEME = {
  chemistry: {
    key: 'chemistry',
    label: 'Chemistry',
    icon: 'flask', // bright gold tier
    accent: 'gold',
    text: 'text-gold-300',
    glow: 'text-glow-gold',
    bg: 'bg-gold-400',
    bgSoft: 'bg-gold-400/10',
    border: 'border-gold-400/40',
    ring: 'ring-gold-400/40',
    gradient: 'from-gold-400 to-gold-300',
    hex: '#F8C01F',
  },
  physics: {
    key: 'physics',
    label: 'Physics',
    icon: 'atom', // pale champagne-gold tier
    accent: 'gold',
    text: 'text-gold-200',
    glow: 'text-glow-gold',
    bg: 'bg-gold-300',
    bgSoft: 'bg-gold-300/10',
    border: 'border-gold-300/40',
    ring: 'ring-gold-300/40',
    gradient: 'from-gold-300 to-gold-200',
    hex: '#FFD24A',
  },
  geology: {
    key: 'geology',
    label: 'Geology',
    icon: 'mountain', // deep gold tier
    accent: 'gold',
    text: 'text-gold-400',
    glow: 'text-glow-gold',
    bg: 'bg-gold-600',
    bgSoft: 'bg-gold-600/10',
    border: 'border-gold-600/40',
    ring: 'ring-gold-600/40',
    gradient: 'from-gold-600 to-gold-500',
    hex: '#E0A400',
  },
  calculus: {
    key: 'calculus',
    label: 'Calculus',
    icon: 'sigma', // warm gold tier
    accent: 'gold',
    text: 'text-gold-300',
    glow: 'text-glow-gold',
    bg: 'bg-gold-500',
    bgSoft: 'bg-gold-500/10',
    border: 'border-gold-500/40',
    ring: 'ring-gold-500/40',
    gradient: 'from-gold-500 to-gold-400',
    hex: '#F0B400',
  },
  biology: {
    key: 'biology',
    label: 'Biology',
    icon: 'dna',
    accent: 'gold',
    text: 'text-gold-200',
    glow: 'text-glow-gold',
    bg: 'bg-gold-400',
    bgSoft: 'bg-gold-400/10',
    border: 'border-gold-400/40',
    ring: 'ring-gold-400/40',
    gradient: 'from-gold-400 to-gold-300',
    hex: '#F5C832',
  },
  astronomy: {
    key: 'astronomy',
    label: 'Astronomy',
    icon: 'telescope',
    accent: 'gold',
    text: 'text-gold-200',
    glow: 'text-glow-gold',
    bg: 'bg-gold-300',
    bgSoft: 'bg-gold-300/10',
    border: 'border-gold-300/40',
    ring: 'ring-gold-300/40',
    gradient: 'from-gold-300 to-gold-200',
    hex: '#FFD24A',
  },
  environmental_science: {
    key: 'environmental_science',
    label: 'Environmental Science',
    icon: 'leaf',
    accent: 'gold',
    text: 'text-gold-300',
    glow: 'text-glow-gold',
    bg: 'bg-gold-500',
    bgSoft: 'bg-gold-500/10',
    border: 'border-gold-500/40',
    ring: 'ring-gold-500/40',
    gradient: 'from-gold-500 to-gold-400',
    hex: '#F0B400',
  },
  earth_science: {
    key: 'earth_science',
    label: 'Earth Science',
    icon: 'globe',
    accent: 'gold',
    text: 'text-gold-400',
    glow: 'text-glow-gold',
    bg: 'bg-gold-600',
    bgSoft: 'bg-gold-600/10',
    border: 'border-gold-600/40',
    ring: 'ring-gold-600/40',
    gradient: 'from-gold-600 to-gold-500',
    hex: '#E0A400',
  },
  anatomy: {
    key: 'anatomy',
    label: 'Anatomy & Physiology',
    icon: 'heart',
    accent: 'gold',
    text: 'text-gold-300',
    glow: 'text-glow-gold',
    bg: 'bg-gold-400',
    bgSoft: 'bg-gold-400/10',
    border: 'border-gold-400/40',
    ring: 'ring-gold-400/40',
    gradient: 'from-gold-400 to-gold-300',
    hex: '#F8C01F',
  },
  forensics: {
    key: 'forensics',
    label: 'Forensics',
    icon: 'fingerprint',
    accent: 'gold',
    text: 'text-gold-200',
    glow: 'text-glow-gold',
    bg: 'bg-gold-300',
    bgSoft: 'bg-gold-300/10',
    border: 'border-gold-300/40',
    ring: 'ring-gold-300/40',
    gradient: 'from-gold-300 to-gold-200',
    hex: '#FFD24A',
  },
  algebra: {
    key: 'algebra',
    label: 'Algebra',
    icon: 'function',
    accent: 'gold',
    text: 'text-gold-300',
    glow: 'text-glow-gold',
    bg: 'bg-gold-500',
    bgSoft: 'bg-gold-500/10',
    border: 'border-gold-500/40',
    ring: 'ring-gold-500/40',
    gradient: 'from-gold-500 to-gold-400',
    hex: '#F0B400',
  },
  geometry: {
    key: 'geometry',
    label: 'Geometry',
    icon: 'triangle',
    accent: 'gold',
    text: 'text-gold-300',
    glow: 'text-glow-gold',
    bg: 'bg-gold-400',
    bgSoft: 'bg-gold-400/10',
    border: 'border-gold-400/40',
    ring: 'ring-gold-400/40',
    gradient: 'from-gold-400 to-gold-300',
    hex: '#F8C01F',
  },
  precalculus: {
    key: 'precalculus',
    label: 'Pre-Calculus',
    icon: 'infinity',
    accent: 'gold',
    text: 'text-gold-200',
    glow: 'text-glow-gold',
    bg: 'bg-gold-300',
    bgSoft: 'bg-gold-300/10',
    border: 'border-gold-300/40',
    ring: 'ring-gold-300/40',
    gradient: 'from-gold-300 to-gold-200',
    hex: '#FFD24A',
  },
  statistics: {
    key: 'statistics',
    label: 'Statistics',
    icon: 'bar-chart',
    accent: 'gold',
    text: 'text-gold-400',
    glow: 'text-glow-gold',
    bg: 'bg-gold-600',
    bgSoft: 'bg-gold-600/10',
    border: 'border-gold-600/40',
    ring: 'ring-gold-600/40',
    gradient: 'from-gold-600 to-gold-500',
    hex: '#E0A400',
  },
  computer_science: {
    key: 'computer_science',
    label: 'Computer Science',
    icon: 'code',
    accent: 'gold',
    text: 'text-gold-200',
    glow: 'text-glow-gold',
    bg: 'bg-gold-200',
    bgSoft: 'bg-gold-200/10',
    border: 'border-gold-200/40',
    ring: 'ring-gold-200/40',
    gradient: 'from-gold-200 to-gold-100',
    hex: '#FFE47A',
  },
  history: {
    key: 'history',
    label: 'History',
    icon: 'landmark',
    accent: 'gold',
    text: 'text-gold-300',
    glow: 'text-glow-gold',
    bg: 'bg-gold-500',
    bgSoft: 'bg-gold-500/10',
    border: 'border-gold-500/40',
    ring: 'ring-gold-500/40',
    gradient: 'from-gold-500 to-gold-400',
    hex: '#F0B400',
  },
  english: {
    key: 'english',
    label: 'English',
    icon: 'book-open',
    accent: 'gold',
    text: 'text-gold-200',
    glow: 'text-glow-gold',
    bg: 'bg-gold-300',
    bgSoft: 'bg-gold-300/10',
    border: 'border-gold-300/40',
    ring: 'ring-gold-300/40',
    gradient: 'from-gold-300 to-gold-200',
    hex: '#FFD24A',
  },
  psychology: {
    key: 'psychology',
    label: 'Psychology',
    icon: 'brain',
    accent: 'gold',
    text: 'text-gold-300',
    glow: 'text-glow-gold',
    bg: 'bg-gold-400',
    bgSoft: 'bg-gold-400/10',
    border: 'border-gold-400/40',
    ring: 'ring-gold-400/40',
    gradient: 'from-gold-400 to-gold-300',
    hex: '#F8C01F',
  },
  economics: {
    key: 'economics',
    label: 'Economics',
    icon: 'trending-up',
    accent: 'gold',
    text: 'text-gold-300',
    glow: 'text-glow-gold',
    bg: 'bg-gold-500',
    bgSoft: 'bg-gold-500/10',
    border: 'border-gold-500/40',
    ring: 'ring-gold-500/40',
    gradient: 'from-gold-500 to-gold-400',
    hex: '#F0B400',
  },
  government: {
    key: 'government',
    label: 'Government / Civics',
    icon: 'building',
    accent: 'gold',
    text: 'text-gold-400',
    glow: 'text-glow-gold',
    bg: 'bg-gold-600',
    bgSoft: 'bg-gold-600/10',
    border: 'border-gold-600/40',
    ring: 'ring-gold-600/40',
    gradient: 'from-gold-600 to-gold-500',
    hex: '#E0A400',
  },
  art: {
    key: 'art',
    label: 'Art',
    icon: 'palette',
    accent: 'gold',
    text: 'text-gold-200',
    glow: 'text-glow-gold',
    bg: 'bg-gold-300',
    bgSoft: 'bg-gold-300/10',
    border: 'border-gold-300/40',
    ring: 'ring-gold-300/40',
    gradient: 'from-gold-300 to-gold-200',
    hex: '#FFD24A',
  },
  music: {
    key: 'music',
    label: 'Music',
    icon: 'music',
    accent: 'gold',
    text: 'text-gold-300',
    glow: 'text-glow-gold',
    bg: 'bg-gold-400',
    bgSoft: 'bg-gold-400/10',
    border: 'border-gold-400/40',
    ring: 'ring-gold-400/40',
    gradient: 'from-gold-400 to-gold-300',
    hex: '#F8C01F',
  },
  pe: {
    key: 'pe',
    label: 'Physical Education',
    icon: 'dumbbell',
    accent: 'gold',
    text: 'text-gold-300',
    glow: 'text-glow-gold',
    bg: 'bg-gold-500',
    bgSoft: 'bg-gold-500/10',
    border: 'border-gold-500/40',
    ring: 'ring-gold-500/40',
    gradient: 'from-gold-500 to-gold-400',
    hex: '#F0B400',
  },
  language: {
    key: 'language',
    label: 'World Language',
    icon: 'languages',
    accent: 'gold',
    text: 'text-gold-200',
    glow: 'text-glow-gold',
    bg: 'bg-gold-300',
    bgSoft: 'bg-gold-300/10',
    border: 'border-gold-300/40',
    ring: 'ring-gold-300/40',
    gradient: 'from-gold-300 to-gold-200',
    hex: '#FFD24A',
  },
  health: {
    key: 'health',
    label: 'Health',
    icon: 'stethoscope',
    accent: 'gold',
    text: 'text-gold-300',
    glow: 'text-glow-gold',
    bg: 'bg-gold-400',
    bgSoft: 'bg-gold-400/10',
    border: 'border-gold-400/40',
    ring: 'ring-gold-400/40',
    gradient: 'from-gold-400 to-gold-300',
    hex: '#F8C01F',
  },
};

// Map a SUBJECT_THEME.icon key to a Lucide icon component name.
export const SUBJECT_ICONS = {
  flask:        'FlaskConical',
  atom:         'Atom',
  mountain:     'Mountain',
  sigma:        'Sigma',
  dna:          'Dna',
  telescope:    'Telescope',
  leaf:         'Leaf',
  globe:        'Globe',
  heart:        'Heart',
  fingerprint:  'Fingerprint',
  function:     'FunctionSquare',
  triangle:     'Triangle',
  infinity:     'Infinity',
  'bar-chart':  'BarChart3',
  code:         'Code2',
  landmark:     'Landmark',
  'book-open':  'BookOpen',
  brain:        'Brain',
  'trending-up':'TrendingUp',
  building:     'Building2',
  palette:      'Palette',
  music:        'Music',
  dumbbell:     'Dumbbell',
  languages:    'Languages',
  stethoscope:  'Stethoscope',
};

// -----------------------------------------------------------------------------
//  Classes
// -----------------------------------------------------------------------------
export const CLASSES = [
  {
    id: 'cls-chem',
    name: 'Honors Chemistry',
    subject: 'chemistry',
    period: 2,
    room: 'Lab 214',
  },
  {
    id: 'cls-phys',
    name: 'Conceptual Physics',
    subject: 'physics',
    period: 4,
    room: 'Lab 207',
  },
  {
    id: 'cls-geo',
    name: 'Geology',
    subject: 'geology',
    period: 6,
    room: 'Lab 211',
  },
];

// -----------------------------------------------------------------------------
//  Students — at least 3 per class, including one switchable "Demo Student"
//  per class (isDemo). Demo students start with wizardComplete=false so the
//  Welcome Wizard can be tested end-to-end.
// -----------------------------------------------------------------------------
const completedGuardian = (name, phone, email) => ({ name, phone, email });

export const STUDENTS = [
  // --- Honors Chemistry (period 2) --------------------------------------------
  {
    id: 'stu-chem-demo',
    classId: 'cls-chem',
    name: 'Demo Student',
    email: 'demo.student@jagschools.org',
    avatar: 'DS',
    isDemo: true,
    balance: 64,
    lockedBalance: 0,
    wizardComplete: false,
    gizmo: { username: '', password: '' },
    safety: { signedName: '', signedAt: null },
    guardian: { name: '', phone: '', email: '' },
    notifications: [],
  },
  {
    id: 'stu-chem-1',
    classId: 'cls-chem',
    name: 'Maya Rodriguez',
    email: 'maya.rodriguez@jagschools.org',
    avatar: 'MR',
    isDemo: false,
    balance: 88,
    lockedBalance: 25,
    wizardComplete: true,
    gizmo: { username: 'maya.r.chem', password: 'Avogadro602!' },
    safety: { signedName: 'Maya Rodriguez', signedAt: '2026-01-12T15:21:00.000Z' },
    guardian: completedGuardian('Elena Rodriguez', '(555) 240-1198', 'elena.rodriguez@gmail.com'),
    notifications: [],
  },
  {
    id: 'stu-chem-2',
    classId: 'cls-chem',
    name: 'Jordan Park',
    email: 'jordan.park@jagschools.org',
    avatar: 'JP',
    isDemo: false,
    balance: 41,
    lockedBalance: 0,
    wizardComplete: true,
    gizmo: { username: 'jordan.p.chem', password: 'Moles4Life' },
    safety: { signedName: 'Jordan Park', signedAt: '2026-01-12T15:24:00.000Z' },
    guardian: completedGuardian('David Park', '(555) 882-3310', 'david.park@outlook.com'),
    notifications: [],
  },
  // --- Conceptual Physics (period 4) ------------------------------------------
  {
    id: 'stu-phys-demo',
    classId: 'cls-phys',
    name: 'Demo Student',
    email: 'demo.physics@jagschools.org',
    avatar: 'DS',
    isDemo: true,
    balance: 52,
    lockedBalance: 0,
    wizardComplete: false,
    gizmo: { username: '', password: '' },
    safety: { signedName: '', signedAt: null },
    guardian: { name: '', phone: '', email: '' },
    notifications: [],
  },
  {
    id: 'stu-phys-1',
    classId: 'cls-phys',
    name: 'Aisha Bello',
    email: 'aisha.bello@jagschools.org',
    avatar: 'AB',
    isDemo: false,
    balance: 73,
    lockedBalance: 50,
    wizardComplete: true,
    gizmo: { username: 'aisha.b.phys', password: 'Newton9p8' },
    safety: { signedName: 'Aisha Bello', signedAt: '2026-01-13T19:02:00.000Z' },
    guardian: completedGuardian('Ngozi Bello', '(555) 461-7720', 'ngozi.bello@gmail.com'),
    notifications: [],
  },
  {
    id: 'stu-phys-2',
    classId: 'cls-phys',
    name: 'Tyler Nguyen',
    email: 'tyler.nguyen@jagschools.org',
    avatar: 'TN',
    isDemo: false,
    balance: 19,
    lockedBalance: 0,
    wizardComplete: true,
    gizmo: { username: 'tyler.n.phys', password: 'Vector42x' },
    safety: { signedName: 'Tyler Nguyen', signedAt: '2026-01-13T19:09:00.000Z' },
    guardian: completedGuardian('Linh Nguyen', '(555) 303-4471', 'linh.nguyen@yahoo.com'),
    notifications: [],
  },
  // --- Geology (period 6) -----------------------------------------------------
  {
    id: 'stu-geo-demo',
    classId: 'cls-geo',
    name: 'Demo Student',
    email: 'demo.geology@jagschools.org',
    avatar: 'DS',
    isDemo: true,
    balance: 47,
    lockedBalance: 0,
    wizardComplete: false,
    gizmo: { username: '', password: '' },
    safety: { signedName: '', signedAt: null },
    guardian: { name: '', phone: '', email: '' },
    notifications: [],
  },
  {
    id: 'stu-geo-1',
    classId: 'cls-geo',
    name: 'Priya Sharma',
    email: 'priya.sharma@jagschools.org',
    avatar: 'PS',
    isDemo: false,
    balance: 96,
    lockedBalance: 0,
    wizardComplete: true,
    gizmo: { username: 'priya.s.geo', password: 'Granite101' },
    safety: { signedName: 'Priya Sharma', signedAt: '2026-01-14T16:40:00.000Z' },
    guardian: completedGuardian('Anil Sharma', '(555) 719-2245', 'anil.sharma@gmail.com'),
    notifications: [],
  },
  {
    id: 'stu-geo-2',
    classId: 'cls-geo',
    name: 'Marcus Webb',
    email: 'marcus.webb@jagschools.org',
    avatar: 'MW',
    isDemo: false,
    balance: 33,
    lockedBalance: 25,
    wizardComplete: true,
    gizmo: { username: 'marcus.w.geo', password: 'Tectonic7' },
    safety: { signedName: 'Marcus Webb', signedAt: '2026-01-14T16:47:00.000Z' },
    guardian: completedGuardian('Tanya Webb', '(555) 558-9032', 'tanya.webb@hotmail.com'),
    notifications: [],
  },
];

// -----------------------------------------------------------------------------
//  Mole Dollar economy config
// -----------------------------------------------------------------------------
export const MOLE_MILESTONE = 100; // tokens toward a test-bonus milestone

export const CASH_IN_SHOP = [
  { id: 'shop-quiz2', label: '+2 Quiz Bonus', cost: 25, icon: 'sparkles' },
  { id: 'shop-test5', label: '+5 Test Bonus', cost: 50, icon: 'rocket' },
  { id: 'shop-homework', label: 'Homework Pass', cost: 30, icon: 'ticket' },
  { id: 'shop-music', label: 'Lab Playlist Pick', cost: 15, icon: 'music' },
  { id: 'shop-retest', label: 'Retest Token', cost: 75, icon: 'repeat' },
];

// -----------------------------------------------------------------------------
//  Seed: pending + historical Mole Dollar redemption requests
// -----------------------------------------------------------------------------
export const MOLE_REQUESTS = [
  {
    id: 'req-1',
    studentId: 'stu-chem-1',
    item: '+2 Quiz Bonus',
    cost: 25,
    status: 'pending',
    note: '',
    createdAt: '2026-06-20T14:30:00.000Z',
  },
  {
    id: 'req-2',
    studentId: 'stu-phys-1',
    item: '+5 Test Bonus',
    cost: 50,
    status: 'pending',
    note: '',
    createdAt: '2026-06-21T13:05:00.000Z',
  },
  {
    id: 'req-3',
    studentId: 'stu-geo-2',
    item: '+2 Quiz Bonus',
    cost: 25,
    status: 'pending',
    note: '',
    createdAt: '2026-06-21T13:48:00.000Z',
  },
  {
    id: 'req-0',
    studentId: 'stu-chem-2',
    item: 'Homework Pass',
    cost: 30,
    status: 'approved',
    note: '',
    createdAt: '2026-06-18T15:10:00.000Z',
  },
];

// -----------------------------------------------------------------------------
//  Help Desk ticket categories + seed tickets across statuses
// -----------------------------------------------------------------------------
export const TICKET_CATEGORIES = [
  'Graded Late Work',
  'Completed Retest',
  'Completed Original Test',
  'Completed Makeup Quiz',
  'Recommendation Letter',
  'Other',
];

export const TICKET_STATUS = {
  submitted: { key: 'submitted', label: 'Submitted', order: 0 },
  in_progress: { key: 'in_progress', label: 'In Progress', order: 1 },
  completed: { key: 'completed', label: 'Completed', order: 2 },
};

export const HELP_TICKETS = [
  {
    id: 'tkt-1',
    studentId: 'stu-chem-1',
    category: 'Graded Late Work',
    details: 'Turned in the stoichiometry lab two days late — left it in the tray by the goggles.',
    status: 'submitted',
    createdAt: '2026-06-21T12:15:00.000Z',
    archived: false,
  },
  {
    id: 'tkt-2',
    studentId: 'stu-phys-2',
    category: 'Completed Makeup Quiz',
    details: 'Finished the kinematics makeup quiz during 4th period study hall.',
    status: 'in_progress',
    createdAt: '2026-06-20T17:42:00.000Z',
    archived: false,
  },
  {
    id: 'tkt-3',
    studentId: 'stu-geo-1',
    category: 'Recommendation Letter',
    details: 'Requesting a rec letter for the summer geology field program at State.',
    status: 'submitted',
    createdAt: '2026-06-19T20:30:00.000Z',
    archived: false,
  },
  {
    id: 'tkt-4',
    studentId: 'stu-chem-2',
    category: 'Completed Retest',
    details: 'Retook the periodic trends test — was out sick for the original.',
    status: 'completed',
    createdAt: '2026-06-17T14:00:00.000Z',
    archived: true,
  },
];

// -----------------------------------------------------------------------------
//  Parent Communication scenario catalog (science-specific)
// -----------------------------------------------------------------------------
export const BEHAVIOR_SCENARIOS = {
  positive: [
    'Exceptional leadership during vector analysis group work',
    'Helped a lab partner safely handle a hot crucible',
    'Asked an insightful question about reaction rates',
    'Showed outstanding focus during the rock identification practical',
    'Volunteered to clean and reset the lab station for the next class',
    'Made a strong recovery on the retest after extra practice',
  ],
  constructive: [
    'Failed to wear splash goggles during a wet lab',
    'Was off-task during the density measurement lab',
    'Missing several homework assignments this unit',
    'Handled glassware carelessly near the balance station',
    'Needs to review lab safety procedures before the next experiment',
    'Used a phone during a graded practical assessment',
  ],
};

// -----------------------------------------------------------------------------
//  Common Curriculum — mock weekly planbook content per subject
// -----------------------------------------------------------------------------
export const LESSON_PLANS = {
  chemistry: {
    unit: 'Unit 6 · Stoichiometry & the Mole',
    week: 'Week of June 22–26, 2026',
    days: [
      { day: 'Monday', objective: 'Convert between moles, mass, and particles', activity: 'Mole conversion stations + warm-up', standard: 'HS-PS1-7', homework: 'Worksheet 6.2 (odds)' },
      { day: 'Tuesday', objective: 'Balance equations for mole ratios', activity: 'Guided practice + whiteboards', standard: 'HS-PS1-7', homework: 'Read 6.3' },
      { day: 'Wednesday', objective: 'Limiting reactant lab', activity: 'Wet lab: precipitate yield', standard: 'HS-PS1-2', homework: 'Lab write-up' },
      { day: 'Thursday', objective: 'Percent yield calculations', activity: 'Problem set carousel', standard: 'HS-PS1-7', homework: 'Practice 6.4' },
      { day: 'Friday', objective: 'Unit 6 checkpoint quiz', activity: 'Quiz + reflection', standard: 'HS-PS1-7', homework: 'None' },
    ],
  },
  physics: {
    unit: 'Unit 4 · Forces & Newton’s Laws',
    week: 'Week of June 22–26, 2026',
    days: [
      { day: 'Monday', objective: 'Identify forces with free-body diagrams', activity: 'FBD gallery walk', standard: 'HS-PS2-1', homework: 'FBD set A' },
      { day: 'Tuesday', objective: 'Apply Newton’s 2nd law (F=ma)', activity: 'Cart & track demo', standard: 'HS-PS2-1', homework: 'Problems 4.2' },
      { day: 'Wednesday', objective: 'Friction lab', activity: 'Measure coefficients of friction', standard: 'HS-PS2-1', homework: 'Lab data table' },
      { day: 'Thursday', objective: 'Vector analysis of inclined planes', activity: 'Group problem solving', standard: 'HS-PS2-1', homework: 'Incline set' },
      { day: 'Friday', objective: 'Forces checkpoint quiz', activity: 'Quiz + concept map', standard: 'HS-PS2-1', homework: 'None' },
    ],
  },
  geology: {
    unit: 'Unit 5 · Plate Tectonics',
    week: 'Week of June 22–26, 2026',
    days: [
      { day: 'Monday', objective: 'Describe plate boundary types', activity: 'Boundary modeling with foam plates', standard: 'HS-ESS2-1', homework: 'Boundary diagram' },
      { day: 'Tuesday', objective: 'Map earthquake & volcano patterns', activity: 'Data mapping with USGS feed', standard: 'HS-ESS2-1', homework: 'Map analysis' },
      { day: 'Wednesday', objective: 'Seafloor spreading evidence', activity: 'Paleomagnetism station lab', standard: 'HS-ESS1-5', homework: 'Reading 5.3' },
      { day: 'Thursday', objective: 'Mineral & rock identification practical', activity: 'Hands-on hardness & streak tests', standard: 'HS-ESS2-1', homework: 'ID chart' },
      { day: 'Friday', objective: 'Plate tectonics checkpoint quiz', activity: 'Quiz + exit ticket', standard: 'HS-ESS2-1', homework: 'None' },
    ],
  },
};

// -----------------------------------------------------------------------------
//  Lab & Safety contract text (Welcome Wizard step 2)
// -----------------------------------------------------------------------------
export const SAFETY_RULES = [
  'I will wear approved splash goggles whenever any chemical, flame, or glassware is in use.',
  'I will never taste, touch, or smell chemicals unless explicitly directed by Mr. Shull.',
  'I will tie back long hair and avoid loose clothing during all lab activities.',
  'I will report every spill, broken glass, or injury immediately — no matter how small.',
  'I know the location of the eyewash station, fire extinguisher, and safety shower.',
  'I will never run, eat, or drink in the lab, and I will keep my workspace clean.',
  'I will follow all disposal instructions and never pour chemicals down the drain without permission.',
  'I understand that horseplay in the lab will result in immediate removal and loss of lab privileges.',
];

// -----------------------------------------------------------------------------
//  Class Materials — material types (icon = Lucide name, mapped in components)
// -----------------------------------------------------------------------------
export const MATERIAL_TYPES = {
  guided_notes: { key: 'guided_notes', label: 'Guided Notes', icon: 'NotebookPen' },
  notes: { key: 'notes', label: 'Notes', icon: 'FileText' },
  presentation: { key: 'presentation', label: 'Presentation', icon: 'Presentation' },
  worksheet: { key: 'worksheet', label: 'Worksheet', icon: 'ClipboardList' },
  lab: { key: 'lab', label: 'Lab', icon: 'FlaskConical' },
  other: { key: 'other', label: 'Resource', icon: 'Paperclip' },
};

export const MATERIAL_TYPE_ORDER = [
  'guided_notes',
  'notes',
  'presentation',
  'worksheet',
  'lab',
  'other',
];

// -----------------------------------------------------------------------------
//  Seed units + sample materials. Sample materials carry keyTerms / extractedText
//  (and sample:true, no uploaded blob) so the study-tool generator works out of
//  the box. Teacher-uploaded materials add a real file (blob in IndexedDB).
// -----------------------------------------------------------------------------
const kt = (term, definition) => ({ term, definition });

export const SEED_UNITS = [
  // ===== Honors Chemistry =====================================================
  {
    id: 'unit-chem-6',
    classId: 'cls-chem',
    title: 'Unit 6 · Stoichiometry & the Mole',
    description: 'Mole conversions, mole ratios, limiting reactants, and percent yield.',
    order: 0,
    materials: [
      {
        id: 'mat-chem-6-gn',
        type: 'guided_notes',
        title: 'Mole Conversions — Guided Notes',
        description: 'Fill-in notes covering the mole road map.',
        sample: true,
        keyTerms: [
          kt('Mole', 'A unit representing 6.022 × 10²³ particles of a substance.'),
          kt('Avogadro’s Number', 'The number of particles in one mole, 6.022 × 10²³.'),
          kt('Molar Mass', 'The mass in grams of one mole of a substance (g/mol).'),
          kt('Mole Ratio', 'The ratio of moles of two substances from a balanced equation.'),
          kt('Stoichiometry', 'The calculation of reactants and products in chemical reactions.'),
          kt('Limiting Reactant', 'The reactant that runs out first and limits product formed.'),
          kt('Percent Yield', 'Actual yield divided by theoretical yield, times 100%.'),
        ],
      },
      {
        id: 'mat-chem-6-ppt',
        type: 'presentation',
        title: 'Stoichiometry Slides',
        description: 'Lecture deck for the unit.',
        sample: true,
        keyTerms: [
          kt('Theoretical Yield', 'The maximum product calculated from the limiting reactant.'),
          kt('Actual Yield', 'The measured amount of product obtained in an experiment.'),
        ],
      },
      {
        id: 'mat-chem-6-ws',
        type: 'worksheet',
        title: 'Mole Conversion Practice',
        description: '20 mixed mole↔mass↔particle problems.',
        sample: true,
      },
      {
        id: 'mat-chem-6-lab',
        type: 'lab',
        title: 'Limiting Reactant Lab',
        description: 'Precipitate yield wet lab + write-up.',
        sample: true,
      },
    ],
  },
  {
    id: 'unit-chem-5',
    classId: 'cls-chem',
    title: 'Unit 5 · Chemical Reactions',
    description: 'Reaction types, balancing equations, and conservation of mass.',
    order: 1,
    materials: [
      {
        id: 'mat-chem-5-gn',
        type: 'guided_notes',
        title: 'Reaction Types — Guided Notes',
        description: 'The five reaction categories.',
        sample: true,
        keyTerms: [
          kt('Synthesis', 'Two or more substances combine to form one product (A + B → AB).'),
          kt('Decomposition', 'A single compound breaks into two or more products (AB → A + B).'),
          kt('Combustion', 'A hydrocarbon reacts with oxygen to produce CO₂ and H₂O.'),
          kt('Single Replacement', 'One element replaces another in a compound.'),
          kt('Double Replacement', 'Ions of two compounds exchange to form two new compounds.'),
          kt('Catalyst', 'A substance that speeds a reaction without being consumed.'),
        ],
      },
    ],
  },
  // ===== Conceptual Physics ===================================================
  {
    id: 'unit-phys-4',
    classId: 'cls-phys',
    title: 'Unit 4 · Forces & Newton’s Laws',
    description: 'Free-body diagrams, the three laws, friction, and net force.',
    order: 0,
    materials: [
      {
        id: 'mat-phys-4-gn',
        type: 'guided_notes',
        title: 'Newton’s Laws — Guided Notes',
        description: 'Core force vocabulary and the three laws.',
        sample: true,
        keyTerms: [
          kt('Force', 'A push or pull on an object, measured in newtons (N).'),
          kt('Net Force', 'The vector sum of all forces acting on an object.'),
          kt('Inertia', 'The tendency of an object to resist changes in motion.'),
          kt('Newton’s First Law', 'An object in motion stays in motion unless acted on by a net force.'),
          kt('Newton’s Second Law', 'Acceleration equals net force divided by mass (a = F/m).'),
          kt('Newton’s Third Law', 'For every action there is an equal and opposite reaction.'),
          kt('Friction', 'A force opposing motion between two surfaces in contact.'),
          kt('Free-Body Diagram', 'A diagram showing all forces acting on a single object.'),
          kt('Normal Force', 'The support force exerted perpendicular to a surface.'),
        ],
      },
      {
        id: 'mat-phys-4-ws',
        type: 'worksheet',
        title: 'Free-Body Diagram Set A',
        description: 'Draw and label FBDs for 10 scenarios.',
        sample: true,
      },
      {
        id: 'mat-phys-4-lab',
        type: 'lab',
        title: 'Coefficient of Friction Lab',
        description: 'Measure static & kinetic friction on a ramp.',
        sample: true,
      },
    ],
  },
  {
    id: 'unit-phys-3',
    classId: 'cls-phys',
    title: 'Unit 3 · Kinematics',
    description: 'Describing motion: displacement, velocity, and acceleration.',
    order: 1,
    materials: [
      {
        id: 'mat-phys-3-gn',
        type: 'guided_notes',
        title: 'Motion Vocabulary — Guided Notes',
        description: 'The building blocks of 1-D motion.',
        sample: true,
        keyTerms: [
          kt('Displacement', 'The straight-line change in position with direction.'),
          kt('Velocity', 'The rate of change of displacement (speed with direction).'),
          kt('Acceleration', 'The rate of change of velocity over time.'),
          kt('Speed', 'How fast an object moves, without direction.'),
          kt('Free Fall', 'Motion under gravity alone, accelerating at 9.8 m/s².'),
        ],
      },
    ],
  },
  // ===== Geology ==============================================================
  {
    id: 'unit-geo-5',
    classId: 'cls-geo',
    title: 'Unit 5 · Plate Tectonics',
    description: 'Plate boundaries, seafloor spreading, and the theory’s evidence.',
    order: 0,
    materials: [
      {
        id: 'mat-geo-5-gn',
        type: 'guided_notes',
        title: 'Plate Tectonics — Guided Notes',
        description: 'Boundary types and driving forces.',
        sample: true,
        keyTerms: [
          kt('Lithosphere', 'The rigid outer layer of Earth: crust + upper mantle.'),
          kt('Asthenosphere', 'The soft, flowing mantle layer beneath the lithosphere.'),
          kt('Convergent Boundary', 'Where two plates move toward each other and collide.'),
          kt('Divergent Boundary', 'Where two plates move apart and new crust forms.'),
          kt('Transform Boundary', 'Where two plates slide past each other horizontally.'),
          kt('Subduction', 'The process where one plate sinks beneath another.'),
          kt('Seafloor Spreading', 'New oceanic crust forms at mid-ocean ridges and spreads.'),
          kt('Convection Current', 'Circulating mantle flow that drives plate motion.'),
        ],
      },
      {
        id: 'mat-geo-5-ppt',
        type: 'presentation',
        title: 'Boundary Types Slides',
        description: 'Visuals of convergent, divergent, transform.',
        sample: true,
        keyTerms: [
          kt('Pangaea', 'The single supercontinent that existed about 300 million years ago.'),
          kt('Continental Drift', 'Wegener’s idea that continents slowly move over time.'),
        ],
      },
      {
        id: 'mat-geo-5-lab',
        type: 'lab',
        title: 'Paleomagnetism Station Lab',
        description: 'Evidence for seafloor spreading.',
        sample: true,
      },
    ],
  },
  {
    id: 'unit-geo-4',
    classId: 'cls-geo',
    title: 'Unit 4 · Minerals & Rocks',
    description: 'Identifying minerals and the three rock families.',
    order: 1,
    materials: [
      {
        id: 'mat-geo-4-gn',
        type: 'guided_notes',
        title: 'Rock Cycle — Guided Notes',
        description: 'Mineral properties and rock types.',
        sample: true,
        keyTerms: [
          kt('Mineral', 'A naturally occurring, inorganic solid with a definite structure.'),
          kt('Igneous Rock', 'Rock formed from cooled and solidified magma or lava.'),
          kt('Sedimentary Rock', 'Rock formed from compacted and cemented sediments.'),
          kt('Metamorphic Rock', 'Rock changed by heat and pressure without melting.'),
          kt('Hardness', 'A mineral’s resistance to scratching (Mohs scale).'),
          kt('Streak', 'The color of a mineral’s powder when scraped on a plate.'),
          kt('Rock Cycle', 'The continuous process that changes rocks among the three types.'),
        ],
      },
    ],
  },
];

// -----------------------------------------------------------------------------
//  Default teacher dashboard layout schema (req #6: dynamic widget config)
// -----------------------------------------------------------------------------
export const DEFAULT_DASHBOARD_LAYOUT = [
  { id: 'w-metrics', type: 'metrics', title: 'Command Metrics', span: 3, visible: true, order: 0 },
  { id: 'w-mole', type: 'moleQueue', title: 'Mole Dollar Redemptions', span: 2, visible: true, order: 1 },
  { id: 'w-tickets', type: 'helpDesk', title: 'Help Desk Queue', span: 1, visible: true, order: 2 },
  { id: 'w-roster', type: 'roster', title: 'Class Roster Snapshot', span: 2, visible: true, order: 3 },
  { id: 'w-mailer', type: 'parentMailerMini', title: 'Quick Parent Note', span: 1, visible: true, order: 4 },
];
