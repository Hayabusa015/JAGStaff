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
  { id: 'cls-chem', name: 'Honors Chemistry',       subject: 'chemistry',            period: 1, room: 'Lab 214' },
  { id: 'cls-phys', name: 'Conceptual Physics',      subject: 'physics',              period: 2, room: 'Lab 207' },
  { id: 'cls-bio',  name: 'AP Biology',              subject: 'biology',              period: 3, room: 'Lab 219' },
  { id: 'cls-env',  name: 'Environmental Science',   subject: 'environmental_science', period: 4, room: 'Lab 211' },
  { id: 'cls-anat', name: 'Anatomy & Physiology',    subject: 'anatomy',              period: 5, room: 'Lab 216' },
  { id: 'cls-geo',  name: 'Geology',                 subject: 'geology',              period: 6, room: 'Lab 203' },
];

// -----------------------------------------------------------------------------
//  Students — 5 real + 1 demo per class (36 total). Demo students start with
//  wizardComplete=false so the Welcome Wizard can be tested end-to-end.
// -----------------------------------------------------------------------------
const completedGuardian = (name, phone, email) => ({ name, phone, email });
const demoStudent = (id, classId, email) => ({
  id, classId, name: 'Demo Student', email, studentEmail: email, avatar: 'DS',
  isDemo: true, balance: 55, lockedBalance: 0, wizardComplete: true,
  gizmo: { username: '', password: '' },
  safety: { signedName: '', signedAt: null },
  guardian: { name: '', phone: '', email: '' },
  notifications: [],
});

export const STUDENTS = [
  // ── Honors Chemistry · Period 1 (cls-chem) ─────────────────────────────────
  demoStudent('stu-chem-demo', 'cls-chem', 'demo.chem@jagschools.org'),
  { id:'stu-chem-1', classId:'cls-chem', name:'Maya Rodriguez',   email:'maya.rodriguez@jagschools.org',   studentEmail:'maya.rodriguez@jagschools.org',   avatar:'MR', isDemo:false, balance:88,  lockedBalance:25, wizardComplete:true, gizmo:{username:'maya.r.chem',   password:'Avogadro602!'}, safety:{signedName:'Maya Rodriguez',   signedAt:'2026-01-12T15:21:00.000Z'}, guardian:completedGuardian('Elena Rodriguez','(555) 240-1198','elena.rodriguez@gmail.com'),   notifications:[] },
  { id:'stu-chem-2', classId:'cls-chem', name:'Jordan Park',      email:'jordan.park@jagschools.org',      studentEmail:'jordan.park@jagschools.org',      avatar:'JP', isDemo:false, balance:41,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'jordan.p.chem',  password:'Moles4Life'},   safety:{signedName:'Jordan Park',      signedAt:'2026-01-12T15:24:00.000Z'}, guardian:completedGuardian('David Park',     '(555) 882-3310','david.park@outlook.com'),       notifications:[] },
  { id:'stu-chem-3', classId:'cls-chem', name:'Brianna Adams',    email:'brianna.adams@jagschools.org',    studentEmail:'brianna.adams@jagschools.org',    avatar:'BA', isDemo:false, balance:62,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'brianna.a.chem', password:'Electron8e!'},   safety:{signedName:'Brianna Adams',    signedAt:'2026-01-12T15:30:00.000Z'}, guardian:completedGuardian('Karen Adams',    '(555) 112-4430','kadams@gmail.com'),             notifications:[] },
  { id:'stu-chem-4', classId:'cls-chem', name:'James Carter',     email:'james.carter@jagschools.org',     studentEmail:'james.carter@jagschools.org',     avatar:'JC', isDemo:false, balance:33,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'james.c.chem',   password:'Proton11!'},     safety:{signedName:'James Carter',     signedAt:'2026-01-12T15:35:00.000Z'}, guardian:completedGuardian('Robert Carter',  '(555) 334-8821','r.carter@outlook.com'),         notifications:[] },
  { id:'stu-chem-5', classId:'cls-chem', name:'Emily Chen',       email:'emily.chen@jagschools.org',       studentEmail:'emily.chen@jagschools.org',       avatar:'EC', isDemo:false, balance:115, lockedBalance:0,  wizardComplete:true, gizmo:{username:'emily.c.chem',   password:'Neutron0!'},     safety:{signedName:'Emily Chen',       signedAt:'2026-01-12T15:40:00.000Z'}, guardian:completedGuardian('Wei Chen',       '(555) 667-2290','wei.chen@gmail.com'),           notifications:[] },

  // ── Conceptual Physics · Period 2 (cls-phys) ───────────────────────────────
  demoStudent('stu-phys-demo', 'cls-phys', 'demo.phys@jagschools.org'),
  { id:'stu-phys-1', classId:'cls-phys', name:'Aisha Bello',      email:'aisha.bello@jagschools.org',      studentEmail:'aisha.bello@jagschools.org',      avatar:'AB', isDemo:false, balance:73,  lockedBalance:50, wizardComplete:true, gizmo:{username:'aisha.b.phys',   password:'Newton9p8'},     safety:{signedName:'Aisha Bello',      signedAt:'2026-01-13T19:02:00.000Z'}, guardian:completedGuardian('Ngozi Bello',    '(555) 461-7720','ngozi.bello@gmail.com'),         notifications:[] },
  { id:'stu-phys-2', classId:'cls-phys', name:'Tyler Nguyen',     email:'tyler.nguyen@jagschools.org',     studentEmail:'tyler.nguyen@jagschools.org',     avatar:'TN', isDemo:false, balance:19,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'tyler.n.phys',   password:'Vector42x'},     safety:{signedName:'Tyler Nguyen',     signedAt:'2026-01-13T19:09:00.000Z'}, guardian:completedGuardian('Linh Nguyen',    '(555) 303-4471','linh.nguyen@yahoo.com'),         notifications:[] },
  { id:'stu-phys-3', classId:'cls-phys', name:'Destiny Barnes',   email:'destiny.barnes@jagschools.org',   studentEmail:'destiny.barnes@jagschools.org',   avatar:'DB', isDemo:false, balance:58,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'destiny.b.phys', password:'Force55N!'},     safety:{signedName:'Destiny Barnes',   signedAt:'2026-01-13T19:15:00.000Z'}, guardian:completedGuardian('Sharon Barnes',  '(555) 720-1133','sbarnes@gmail.com'),             notifications:[] },
  { id:'stu-phys-4', classId:'cls-phys', name:'Nathan Cooper',    email:'nathan.cooper@jagschools.org',    studentEmail:'nathan.cooper@jagschools.org',    avatar:'NC', isDemo:false, balance:44,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'nathan.c.phys',  password:'Velocity3!'},    safety:{signedName:'Nathan Cooper',    signedAt:'2026-01-13T19:20:00.000Z'}, guardian:completedGuardian('Greg Cooper',    '(555) 445-8890','gcooper@outlook.com'),           notifications:[] },
  { id:'stu-phys-5', classId:'cls-phys', name:'Sofia Diaz',       email:'sofia.diaz@jagschools.org',       studentEmail:'sofia.diaz@jagschools.org',       avatar:'SD', isDemo:false, balance:81,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'sofia.d.phys',   password:'Gravity9m!'},    safety:{signedName:'Sofia Diaz',       signedAt:'2026-01-13T19:25:00.000Z'}, guardian:completedGuardian('Ana Diaz',       '(555) 231-6670','anadiaz@gmail.com'),             notifications:[] },

  // ── AP Biology · Period 3 (cls-bio) ────────────────────────────────────────
  demoStudent('stu-bio-demo', 'cls-bio', 'demo.bio@jagschools.org'),
  { id:'stu-bio-1',  classId:'cls-bio',  name:'Marcus Evans',     email:'marcus.evans@jagschools.org',     studentEmail:'marcus.evans@jagschools.org',     avatar:'ME', isDemo:false, balance:92,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'marcus.e.bio',   password:'Mitosis7!'},     safety:{signedName:'Marcus Evans',     signedAt:'2026-01-14T08:10:00.000Z'}, guardian:completedGuardian('Tanya Evans',    '(555) 880-2245','tevans@gmail.com'),              notifications:[] },
  { id:'stu-bio-2',  classId:'cls-bio',  name:'Emma Flynn',       email:'emma.flynn@jagschools.org',       studentEmail:'emma.flynn@jagschools.org',       avatar:'EF', isDemo:false, balance:67,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'emma.f.bio',     password:'Meiosis2!'},     safety:{signedName:'Emma Flynn',       signedAt:'2026-01-14T08:15:00.000Z'}, guardian:completedGuardian('Patrick Flynn',  '(555) 553-6640','pflynn@outlook.com'),            notifications:[] },
  { id:'stu-bio-3',  classId:'cls-bio',  name:'Jordan Hayes',     email:'jordan.hayes@jagschools.org',     studentEmail:'jordan.hayes@jagschools.org',     avatar:'JH', isDemo:false, balance:50,  lockedBalance:25, wizardComplete:true, gizmo:{username:'jordan.h.bio',   password:'DNA2026!'},      safety:{signedName:'Jordan Hayes',     signedAt:'2026-01-14T08:20:00.000Z'}, guardian:completedGuardian('Lisa Hayes',     '(555) 117-3395','lhayes@gmail.com'),              notifications:[] },
  { id:'stu-bio-4',  classId:'cls-bio',  name:'Amara Jackson',    email:'amara.jackson@jagschools.org',    studentEmail:'amara.jackson@jagschools.org',    avatar:'AJ', isDemo:false, balance:105, lockedBalance:0,  wizardComplete:true, gizmo:{username:'amara.j.bio',    password:'Enzyme44!'},     safety:{signedName:'Amara Jackson',    signedAt:'2026-01-14T08:25:00.000Z'}, guardian:completedGuardian('Darius Jackson', '(555) 664-9012','djackson@gmail.com'),            notifications:[] },
  { id:'stu-bio-5',  classId:'cls-bio',  name:'Ethan Lewis',      email:'ethan.lewis@jagschools.org',      studentEmail:'ethan.lewis@jagschools.org',      avatar:'EL', isDemo:false, balance:38,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'ethan.l.bio',    password:'Protein3D!'},    safety:{signedName:'Ethan Lewis',      signedAt:'2026-01-14T08:30:00.000Z'}, guardian:completedGuardian('Carol Lewis',    '(555) 228-7780','clewis@yahoo.com'),              notifications:[] },

  // ── Environmental Science · Period 4 (cls-env) ─────────────────────────────
  demoStudent('stu-env-demo', 'cls-env', 'demo.env@jagschools.org'),
  { id:'stu-env-1',  classId:'cls-env',  name:'Chloe Mitchell',   email:'chloe.mitchell@jagschools.org',   studentEmail:'chloe.mitchell@jagschools.org',   avatar:'CM', isDemo:false, balance:77,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'chloe.m.env',    password:'Carbon6!'},      safety:{signedName:'Chloe Mitchell',   signedAt:'2026-01-15T10:05:00.000Z'}, guardian:completedGuardian('Diane Mitchell', '(555) 440-5521','dmitchell@gmail.com'),           notifications:[] },
  { id:'stu-env-2',  classId:'cls-env',  name:'Carlos Rivera',    email:'carlos.rivera@jagschools.org',    studentEmail:'carlos.rivera@jagschools.org',    avatar:'CR', isDemo:false, balance:29,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'carlos.r.env',   password:'Biome55!'},      safety:{signedName:'Carlos Rivera',    signedAt:'2026-01-15T10:10:00.000Z'}, guardian:completedGuardian('Maria Rivera',   '(555) 774-8830','mrivera@yahoo.com'),             notifications:[] },
  { id:'stu-env-3',  classId:'cls-env',  name:'Zoe Edwards',      email:'zoe.edwards@jagschools.org',      studentEmail:'zoe.edwards@jagschools.org',      avatar:'ZE', isDemo:false, balance:61,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'zoe.e.env',      password:'Ecology2!'},     safety:{signedName:'Zoe Edwards',      signedAt:'2026-01-15T10:15:00.000Z'}, guardian:completedGuardian('Tom Edwards',    '(555) 335-2290','tedwards@outlook.com'),          notifications:[] },
  { id:'stu-env-4',  classId:'cls-env',  name:'Isaiah Freeman',   email:'isaiah.freeman@jagschools.org',   studentEmail:'isaiah.freeman@jagschools.org',   avatar:'IF', isDemo:false, balance:84,  lockedBalance:50, wizardComplete:true, gizmo:{username:'isaiah.f.env',   password:'Climate8!'},     safety:{signedName:'Isaiah Freeman',   signedAt:'2026-01-15T10:20:00.000Z'}, guardian:completedGuardian('Janet Freeman',  '(555) 661-4401','jfreeman@gmail.com'),            notifications:[] },
  { id:'stu-env-5',  classId:'cls-env',  name:'Jasmine Grant',    email:'jasmine.grant@jagschools.org',    studentEmail:'jasmine.grant@jagschools.org',    avatar:'JG', isDemo:false, balance:43,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'jasmine.g.env',  password:'Ozone3!'},       safety:{signedName:'Jasmine Grant',    signedAt:'2026-01-15T10:25:00.000Z'}, guardian:completedGuardian('Monica Grant',   '(555) 882-1102','mgrant@gmail.com'),              notifications:[] },

  // ── Anatomy & Physiology · Period 5 (cls-anat) ─────────────────────────────
  demoStudent('stu-anat-demo', 'cls-anat', 'demo.anat@jagschools.org'),
  { id:'stu-anat-1', classId:'cls-anat', name:'Owen Harris',      email:'owen.harris@jagschools.org',      studentEmail:'owen.harris@jagschools.org',      avatar:'OH', isDemo:false, balance:70,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'owen.h.anat',    password:'Cardiac4!'},     safety:{signedName:'Owen Harris',      signedAt:'2026-01-16T11:00:00.000Z'}, guardian:completedGuardian('Brenda Harris',  '(555) 229-6610','bharris@gmail.com'),             notifications:[] },
  { id:'stu-anat-2', classId:'cls-anat', name:'Layla Ingram',     email:'layla.ingram@jagschools.org',     studentEmail:'layla.ingram@jagschools.org',     avatar:'LI', isDemo:false, balance:55,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'layla.i.anat',   password:'Neuron8!'},      safety:{signedName:'Layla Ingram',     signedAt:'2026-01-16T11:05:00.000Z'}, guardian:completedGuardian('Patricia Ingram','(555) 443-7720','pingram@outlook.com'),            notifications:[] },
  { id:'stu-anat-3', classId:'cls-anat', name:'Noah Jenkins',     email:'noah.jenkins@jagschools.org',     studentEmail:'noah.jenkins@jagschools.org',     avatar:'NJ', isDemo:false, balance:99,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'noah.j.anat',    password:'Synapse5!'},     safety:{signedName:'Noah Jenkins',     signedAt:'2026-01-16T11:10:00.000Z'}, guardian:completedGuardian('Derek Jenkins',  '(555) 776-3340','djenkins@gmail.com'),            notifications:[] },
  { id:'stu-anat-4', classId:'cls-anat', name:'Aaliyah Nelson',   email:'aaliyah.nelson@jagschools.org',   studentEmail:'aaliyah.nelson@jagschools.org',   avatar:'AN', isDemo:false, balance:47,  lockedBalance:25, wizardComplete:true, gizmo:{username:'aaliyah.n.anat', password:'Muscle6!'},      safety:{signedName:'Aaliyah Nelson',   signedAt:'2026-01-16T11:15:00.000Z'}, guardian:completedGuardian('Sandra Nelson',  '(555) 559-8810','snelson@yahoo.com'),             notifications:[] },
  { id:'stu-anat-5', classId:'cls-anat', name:'Nikhil Patel',     email:'nikhil.patel@jagschools.org',     studentEmail:'nikhil.patel@jagschools.org',     avatar:'NP', isDemo:false, balance:126, lockedBalance:0,  wizardComplete:true, gizmo:{username:'nikhil.p.anat',  password:'Organ12!'},      safety:{signedName:'Nikhil Patel',     signedAt:'2026-01-16T11:20:00.000Z'}, guardian:completedGuardian('Ravi Patel',     '(555) 332-9980','rpatel@gmail.com'),              notifications:[] },

  // ── Geology · Period 6 (cls-geo) ────────────────────────────────────────────
  demoStudent('stu-geo-demo', 'cls-geo', 'demo.geology@jagschools.org'),
  { id:'stu-geo-1',  classId:'cls-geo',  name:'Priya Sharma',     email:'priya.sharma@jagschools.org',     studentEmail:'priya.sharma@jagschools.org',     avatar:'PS', isDemo:false, balance:96,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'priya.s.geo',    password:'Granite101'},    safety:{signedName:'Priya Sharma',     signedAt:'2026-01-14T16:40:00.000Z'}, guardian:completedGuardian('Anil Sharma',    '(555) 719-2245','anil.sharma@gmail.com'),         notifications:[] },
  { id:'stu-geo-2',  classId:'cls-geo',  name:'Marcus Webb',      email:'marcus.webb@jagschools.org',      studentEmail:'marcus.webb@jagschools.org',      avatar:'MW', isDemo:false, balance:33,  lockedBalance:25, wizardComplete:true, gizmo:{username:'marcus.w.geo',   password:'Tectonic7'},     safety:{signedName:'Marcus Webb',      signedAt:'2026-01-14T16:47:00.000Z'}, guardian:completedGuardian('Tanya Webb',     '(555) 558-9032','tanya.webb@hotmail.com'),        notifications:[] },
  { id:'stu-geo-3',  classId:'cls-geo',  name:'Derek Allen',      email:'derek.allen@jagschools.org',      studentEmail:'derek.allen@jagschools.org',      avatar:'DA', isDemo:false, balance:58,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'derek.a.geo',    password:'Basalt77!'},     safety:{signedName:'Derek Allen',      signedAt:'2026-01-14T16:55:00.000Z'}, guardian:completedGuardian('Kevin Allen',    '(555) 221-4480','kallen@gmail.com'),              notifications:[] },
  { id:'stu-geo-4',  classId:'cls-geo',  name:'Maya Brooks',      email:'maya.brooks@jagschools.org',      studentEmail:'maya.brooks@jagschools.org',      avatar:'MB', isDemo:false, balance:74,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'maya.b.geo',     password:'Sediment2!'},    safety:{signedName:'Maya Brooks',      signedAt:'2026-01-14T17:00:00.000Z'}, guardian:completedGuardian('Valerie Brooks', '(555) 667-5510','vbrooks@outlook.com'),           notifications:[] },
  { id:'stu-geo-5',  classId:'cls-geo',  name:'Ryan Coleman',     email:'ryan.coleman@jagschools.org',     studentEmail:'ryan.coleman@jagschools.org',     avatar:'RC', isDemo:false, balance:45,  lockedBalance:0,  wizardComplete:true, gizmo:{username:'ryan.c.geo',     password:'Igneous5!'},     safety:{signedName:'Ryan Coleman',     signedAt:'2026-01-14T17:05:00.000Z'}, guardian:completedGuardian('Beth Coleman',   '(555) 440-2233','bcoleman@yahoo.com'),            notifications:[] },
];

// -----------------------------------------------------------------------------
//  Mole Dollar economy config
// -----------------------------------------------------------------------------
export const MOLE_MILESTONE = 100; // tokens toward a test-bonus milestone

export const CASH_IN_SHOP = [
  { id: 'shop-quiz2',     label: '+2 Quiz Bonus',        cost: 25, icon: 'sparkles' },
  { id: 'shop-test5',     label: '+5 Test Bonus',         cost: 50, icon: 'rocket' },
  { id: 'shop-homework',  label: 'Homework Pass',         cost: 30, icon: 'ticket' },
  { id: 'shop-music',     label: 'Lab Playlist Pick',     cost: 15, icon: 'music' },
  { id: 'shop-retest',    label: 'Retest Token',          cost: 75, icon: 'repeat' },
  { id: 'shop-drop-hw',   label: 'Drop Lowest Homework',  cost: 3,  icon: 'eraser', rewardType: 'dropLowest', gradeCategory: 'Homework', limitPerPeriod: true },
  { id: 'shop-drop-quiz', label: 'Drop Lowest Quiz',      cost: 5,  icon: 'eraser', rewardType: 'dropLowest', gradeCategory: 'Quizzes',  limitPerPeriod: true },
  { id: 'shop-drop-lab',  label: 'Drop Lowest Lab',       cost: 5,  icon: 'eraser', rewardType: 'dropLowest', gradeCategory: 'Labs',     limitPerPeriod: true },
  { id: 'shop-md-bonus',  label: 'Mole Dollar Bonus',     cost: 10, icon: 'zap',    rewardType: 'moleDollarBonus' },
];

// -----------------------------------------------------------------------------
//  Seed: pending + historical Mole Dollar redemption requests
// -----------------------------------------------------------------------------
export const MOLE_REQUESTS = [
  { id:'req-1',  studentId:'stu-chem-1',  item:'+2 Quiz Bonus',       cost:25, status:'pending',  note:'', createdAt:'2026-06-20T14:30:00.000Z' },
  { id:'req-2',  studentId:'stu-phys-1',  item:'+5 Test Bonus',        cost:50, status:'pending',  note:'', createdAt:'2026-06-21T13:05:00.000Z' },
  { id:'req-3',  studentId:'stu-geo-2',   item:'+2 Quiz Bonus',        cost:25, status:'pending',  note:'', createdAt:'2026-06-21T13:48:00.000Z' },
  { id:'req-4',  studentId:'stu-bio-1',   item:'Drop Lowest Homework', cost:3,  status:'pending',  note:'', createdAt:'2026-06-22T09:10:00.000Z', rewardType:'dropLowest', gradeCategory:'Homework', gradingPeriod:1 },
  { id:'req-5',  studentId:'stu-env-4',   item:'Drop Lowest Quiz',     cost:5,  status:'pending',  note:'', createdAt:'2026-06-22T10:30:00.000Z', rewardType:'dropLowest', gradeCategory:'Quizzes',  gradingPeriod:1 },
  { id:'req-6',  studentId:'stu-anat-3',  item:'Mole Dollar Bonus',    cost:10, status:'pending',  note:'', createdAt:'2026-06-23T08:55:00.000Z', rewardType:'moleDollarBonus' },
  { id:'req-0',  studentId:'stu-chem-2',  item:'Homework Pass',        cost:30, status:'approved', note:'', createdAt:'2026-06-18T15:10:00.000Z' },
  { id:'req-7',  studentId:'stu-bio-3',   item:'Lab Playlist Pick',    cost:15, status:'approved', note:'', createdAt:'2026-06-17T11:20:00.000Z' },
  { id:'req-8',  studentId:'stu-geo-1',   item:'+5 Test Bonus',        cost:50, status:'denied',   note:'Balance was insufficient at time of processing.', createdAt:'2026-06-16T14:00:00.000Z' },
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
  { id:'tkt-1',  studentId:'stu-chem-1',  category:'Graded Late Work',       details:'Turned in the stoichiometry lab two days late — left it in the tray by the goggles.', status:'submitted',   createdAt:'2026-06-21T12:15:00.000Z', archived:false },
  { id:'tkt-2',  studentId:'stu-phys-2',  category:'Completed Makeup Quiz',  details:'Finished the kinematics makeup quiz during 2nd period study hall.',                    status:'in_progress', createdAt:'2026-06-20T17:42:00.000Z', archived:false },
  { id:'tkt-3',  studentId:'stu-geo-1',   category:'Recommendation Letter',  details:'Requesting a rec letter for the summer geology field program at State.',               status:'submitted',   createdAt:'2026-06-19T20:30:00.000Z', archived:false },
  { id:'tkt-4',  studentId:'stu-chem-2',  category:'Completed Retest',       details:'Retook the periodic trends test — was out sick for the original.',                     status:'completed',   createdAt:'2026-06-17T14:00:00.000Z', archived:true  },
  { id:'tkt-5',  studentId:'stu-bio-2',   category:'Graded Late Work',       details:'Late cell division worksheet — was absent for two days and submitted digitally.',      status:'submitted',   createdAt:'2026-06-22T09:00:00.000Z', archived:false },
  { id:'tkt-6',  studentId:'stu-env-3',   category:'Completed Original Test', details:'Finished the ecosystems test I missed during the field trip last week.',              status:'in_progress', createdAt:'2026-06-21T14:10:00.000Z', archived:false },
  { id:'tkt-7',  studentId:'stu-anat-1',  category:'Completed Makeup Quiz',  details:'Took the skeletal system quiz in the library during free period today.',               status:'submitted',   createdAt:'2026-06-23T08:45:00.000Z', archived:false },
  { id:'tkt-8',  studentId:'stu-bio-4',   category:'Other',                  details:'Asking about extra credit opportunities for the AP exam prep section.',                status:'submitted',   createdAt:'2026-06-23T11:30:00.000Z', archived:false },
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
  biology: {
    unit: 'Unit 7 · Cell Division',
    week: 'Week of June 22–26, 2026',
    days: [
      { day: 'Monday', objective: 'Distinguish mitosis phases (PMAT)', activity: 'Microscope slides lab — onion root tips', standard: 'HS-LS1-4', homework: 'Diagram phases' },
      { day: 'Tuesday', objective: 'Compare mitosis & meiosis', activity: 'Venn diagram + whiteboard gallery', standard: 'HS-LS3-2', homework: 'Reading 7.3' },
      { day: 'Wednesday', objective: 'Meiosis & genetic variation', activity: 'Pipe-cleaner crossing-over simulation', standard: 'HS-LS3-2', homework: 'Crossing-over ws' },
      { day: 'Thursday', objective: 'Cell cycle regulation & cancer', activity: 'Case-study analysis in groups', standard: 'HS-LS1-4', homework: 'Practice 7.5' },
      { day: 'Friday', objective: 'Unit 7 checkpoint quiz', activity: 'Quiz + reflection journal', standard: 'HS-LS1-4', homework: 'None' },
    ],
  },
  environmental_science: {
    unit: 'Unit 5 · Ecosystems & Energy Flow',
    week: 'Week of June 22–26, 2026',
    days: [
      { day: 'Monday', objective: 'Trace energy through food chains & webs', activity: 'Food web card sort', standard: 'HS-LS2-4', homework: 'Food web diagram' },
      { day: 'Tuesday', objective: 'Explain the 10% energy transfer rule', activity: 'Energy pyramid calculation stations', standard: 'HS-LS2-4', homework: 'Problems 5.2' },
      { day: 'Wednesday', objective: 'Nutrient cycling — carbon & nitrogen', activity: 'Cycle modeling with sticky notes', standard: 'HS-LS2-7', homework: 'Cycle comparison' },
      { day: 'Thursday', objective: 'Human impacts on ecosystems', activity: 'Documentary clip + argument writing', standard: 'HS-LS2-7', homework: 'Response paragraph' },
      { day: 'Friday', objective: 'Ecosystems checkpoint quiz', activity: 'Quiz + exit ticket', standard: 'HS-LS2-4', homework: 'None' },
    ],
  },
  anatomy: {
    unit: 'Unit 6 · Skeletal & Muscular Systems',
    week: 'Week of June 22–26, 2026',
    days: [
      { day: 'Monday', objective: 'Identify major bones of the axial skeleton', activity: 'Bone ID stations with models', standard: 'HS-LS1-2', homework: 'Bone labeling diagram' },
      { day: 'Tuesday', objective: 'Compare types of joints & range of motion', activity: 'Joint mobility lab with protractors', standard: 'HS-LS1-2', homework: 'Joint classification ws' },
      { day: 'Wednesday', objective: 'Describe sliding filament theory of contraction', activity: 'Animation + guided notes', standard: 'HS-LS1-2', homework: 'Reading 6.4' },
      { day: 'Thursday', objective: 'Map major skeletal muscles', activity: 'Muscle mapping on body outline', standard: 'HS-LS1-2', homework: 'Muscle origin/insertion chart' },
      { day: 'Friday', objective: 'Skeletal & muscular checkpoint quiz', activity: 'Quiz + self-assessment', standard: 'HS-LS1-2', homework: 'None' },
    ],
  },
};

// -----------------------------------------------------------------------------
//  Lab & Safety contract text (Welcome Wizard step 2)
// -----------------------------------------------------------------------------
export const SAFETY_RULES = [
  'I will wear approved splash goggles whenever any chemical, flame, or glassware is in use.',
  'I will never taste, touch, or smell chemicals unless explicitly directed by my teacher.',
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
  // ===== AP Biology ===========================================================
  {
    id: 'unit-bio-7',
    classId: 'cls-bio',
    title: 'Unit 7 · Cell Division',
    description: 'Mitosis, meiosis, the cell cycle, and genetic variation.',
    order: 0,
    materials: [
      {
        id: 'mat-bio-7-gn',
        type: 'guided_notes',
        title: 'Cell Division — Guided Notes',
        description: 'PMAT phases, comparing mitosis & meiosis.',
        sample: true,
        keyTerms: [
          kt('Mitosis', 'Cell division producing two genetically identical daughter cells.'),
          kt('Meiosis', 'Cell division producing four genetically unique haploid cells.'),
          kt('Prophase', 'First phase: chromosomes condense, spindle begins to form.'),
          kt('Metaphase', "Chromosomes align at the cell's metaphase plate."),
          kt('Anaphase', 'Sister chromatids are pulled to opposite poles.'),
          kt('Telophase', 'Nuclear envelopes re-form around the separated chromosomes.'),
          kt('Cytokinesis', 'Division of the cytoplasm to complete cell separation.'),
          kt('Crossing Over', 'Exchange of genetic material between homologous chromosomes.'),
        ],
      },
      {
        id: 'mat-bio-7-lab',
        type: 'lab',
        title: 'Onion Root Tip Lab',
        description: 'Observe mitosis phases under a microscope.',
        sample: true,
      },
    ],
  },
  {
    id: 'unit-bio-6',
    classId: 'cls-bio',
    title: 'Unit 6 · Genetics & Heredity',
    description: 'Mendelian genetics, Punnett squares, and non-Mendelian patterns.',
    order: 1,
    materials: [
      {
        id: 'mat-bio-6-gn',
        type: 'guided_notes',
        title: 'Mendelian Genetics — Guided Notes',
        description: 'Dominant, recessive, and complex inheritance.',
        sample: true,
        keyTerms: [
          kt('Allele', 'A variant form of a gene.'),
          kt('Dominant', 'An allele that masks the expression of the recessive allele.'),
          kt('Recessive', 'An allele expressed only when two copies are present.'),
          kt('Genotype', 'The genetic makeup of an organism (e.g., Bb).'),
          kt('Phenotype', 'The observable traits expressed by the genotype.'),
          kt('Codominance', 'Both alleles are fully expressed in the heterozygote.'),
          kt('Incomplete Dominance', 'Blended phenotype in the heterozygote.'),
        ],
      },
    ],
  },
  // ===== Environmental Science ================================================
  {
    id: 'unit-env-5',
    classId: 'cls-env',
    title: 'Unit 5 · Ecosystems & Energy Flow',
    description: 'Food webs, energy pyramids, and nutrient cycling.',
    order: 0,
    materials: [
      {
        id: 'mat-env-5-gn',
        type: 'guided_notes',
        title: 'Energy Flow — Guided Notes',
        description: 'Food chains, food webs, and the 10% rule.',
        sample: true,
        keyTerms: [
          kt('Producer', 'An organism that makes its own food via photosynthesis.'),
          kt('Consumer', 'An organism that obtains energy by eating other organisms.'),
          kt('Food Chain', 'A linear sequence of energy transfer between organisms.'),
          kt('Food Web', 'A complex network of overlapping food chains.'),
          kt('10% Rule', 'Only 10% of energy is transferred from one trophic level to the next.'),
          kt('Trophic Level', 'Position an organism occupies in a food chain.'),
          kt('Carbon Cycle', 'The movement of carbon through the atmosphere, biosphere, and lithosphere.'),
          kt('Nitrogen Cycle', 'The process by which nitrogen is converted into usable forms by organisms.'),
        ],
      },
      {
        id: 'mat-env-5-lab',
        type: 'lab',
        title: 'Food Web Card Sort',
        description: 'Construct and analyze an ecosystem food web.',
        sample: true,
      },
    ],
  },
  {
    id: 'unit-env-4',
    classId: 'cls-env',
    title: 'Unit 4 · Biomes & Biodiversity',
    description: 'Major terrestrial and aquatic biomes, biodiversity indices.',
    order: 1,
    materials: [
      {
        id: 'mat-env-4-gn',
        type: 'guided_notes',
        title: 'Biomes — Guided Notes',
        description: 'Climate, flora, and fauna of major biomes.',
        sample: true,
        keyTerms: [
          kt('Biome', 'A large community of plants and animals occupying a major habitat.'),
          kt('Tundra', 'Cold, treeless biome with permafrost.'),
          kt('Taiga', 'Boreal forest biome with coniferous trees.'),
          kt('Tropical Rainforest', 'Hot, wet biome with the highest biodiversity.'),
          kt('Biodiversity', 'The variety of life in an area — species, genetic, and ecosystem.'),
        ],
      },
    ],
  },
  // ===== Anatomy & Physiology =================================================
  {
    id: 'unit-anat-6',
    classId: 'cls-anat',
    title: 'Unit 6 · Skeletal & Muscular Systems',
    description: 'Bone structure, joint types, and muscle contraction.',
    order: 0,
    materials: [
      {
        id: 'mat-anat-6-gn',
        type: 'guided_notes',
        title: 'Skeletal System — Guided Notes',
        description: 'Axial vs appendicular skeleton, bone histology.',
        sample: true,
        keyTerms: [
          kt('Axial Skeleton', 'The skull, vertebral column, and rib cage.'),
          kt('Appendicular Skeleton', 'The limbs and girdles attached to the axial skeleton.'),
          kt('Osteoblast', 'A cell that builds new bone tissue.'),
          kt('Osteoclast', 'A cell that breaks down bone tissue.'),
          kt('Synapse', 'The junction between a motor neuron and a muscle fiber.'),
          kt('Sarcomere', 'The basic contractile unit of a muscle fiber.'),
          kt('Sliding Filament Theory', 'Actin and myosin filaments slide past each other to produce contraction.'),
          kt('Origin', 'The attachment point of a muscle on the stationary bone.'),
          kt('Insertion', 'The attachment point of a muscle on the moving bone.'),
        ],
      },
      {
        id: 'mat-anat-6-lab',
        type: 'lab',
        title: 'Joint Mobility Lab',
        description: 'Measure range of motion at major joints.',
        sample: true,
      },
    ],
  },
  {
    id: 'unit-anat-5',
    classId: 'cls-anat',
    title: 'Unit 5 · Integumentary & Nervous Systems',
    description: 'Skin layers, sensory receptors, and the neuron.',
    order: 1,
    materials: [
      {
        id: 'mat-anat-5-gn',
        type: 'guided_notes',
        title: 'Nervous System — Guided Notes',
        description: 'Neuron anatomy and nerve impulse transmission.',
        sample: true,
        keyTerms: [
          kt('Neuron', 'The basic functional unit of the nervous system.'),
          kt('Dendrite', 'Branch-like extensions of a neuron that receive signals.'),
          kt('Axon', 'The long fiber that carries impulses away from the cell body.'),
          kt('Myelin Sheath', 'Insulating layer around an axon that speeds transmission.'),
          kt('Action Potential', 'An electrical signal that travels along a neuron.'),
          kt('Epidermis', 'The outermost layer of skin.'),
          kt('Dermis', 'The layer beneath the epidermis containing glands and follicles.'),
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
