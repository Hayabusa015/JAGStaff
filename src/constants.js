export const GOLD = "#F5C025";
export const GOLDBORDER = "rgba(245,192,37,0.35)";
export const GOLDDIM = "rgba(245,192,37,0.08)";
export const GOLDGLOW = "rgba(245,192,37,0.35)";
export const BG = "rgba(250,248,243,1)";
export const BORDER = "rgba(200,200,200,0.3)";
export const TEXTPRIMARY = "#1a1200";
export const TEXTSECONDARY = "rgba(0,0,0,0.55)";
export const TEXTMUTED = "rgba(0,0,0,0.35)";

export const ALLOWED_DOMAIN = "jagschools.org";
export const SESSION_TIMEOUT_MS = 7 * 60 * 60 * 1000;
export const KIOSK_PIN = "1234";

export const EVENT_TYPES = [
  "Fire Drill","Field Trip","State Test","ACT","Assembly",
  "Early Release","Late Start","PD Day","Holiday","Other"
];

export const DESTINATIONS = [
  { key: "Bathroom", icon: "🚻" },
  { key: "Water",    icon: "💧" },
  { key: "Office",   icon: "🏢" },
  { key: "Nurse",    icon: "🏥" },
  { key: "Counselor",icon: "💬" },
  { key: "Library",  icon: "📚" },
  { key: "Locker",   icon: "🔐" },
];

export const SEED_STUDENTS = [
  { id: "s1", firstName: "Marcus",  lastName: "Thompson", grade: "10" },
  { id: "s2", firstName: "Aaliyah", lastName: "Johnson",  grade: "11" },
  { id: "s3", firstName: "Devon",   lastName: "Williams", grade: "9"  },
  { id: "s4", firstName: "Priya",   lastName: "Patel",    grade: "12" },
  { id: "s5", firstName: "Jordan",  lastName: "Garcia",   grade: "10" },
  { id: "s6", firstName: "Taylor",  lastName: "Brown",    grade: "11" },
];

export const SEED_CEU = [
  { id: "c1", name: "ODE Reading Strategies Module",       hours: 15, date: "2025-09" },
  { id: "c2", name: "Classroom Management Seminar",        hours: 8,  date: "2025-10" },
  { id: "c3", name: "Differentiated Instruction Workshop", hours: 20, date: "2025-11" },
  { id: "c4", name: "ed2go: Excel for Educators",         hours: 24, date: "2026-01" },
  { id: "c5", name: "ODE Science Standards Update",        hours: 12, date: "2026-03" },
];

export const SEED_ELECTIVES = [
  { id: "e1", title: "Kickball",      teacher: "Mr. Benson",   day: "Tuesday",   count: 18, max: 20 },
  { id: "e2", title: "Chess Club",    teacher: "Ms. Rivera",   day: "Tuesday",   count: 12, max: 15 },
  { id: "e3", title: "Art Studio",    teacher: "Mrs. Kim",     day: "Wednesday", count: 10, max: 18 },
  { id: "e4", title: "Coding Lab",    teacher: "Mr. Shull",    day: "Wednesday", count: 15, max: 15 },
  { id: "e5", title: "Study Hall",    teacher: "Mr. Davis",    day: "Thursday",  count: 9,  max: 25 },
  { id: "e6", title: "Drama",         teacher: "Ms. Powell",   day: "Thursday",  count: 14, max: 20 },
];
