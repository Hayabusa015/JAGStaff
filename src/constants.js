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

// Used only as the in-memory fallback when Supabase is not configured, so the
// local-dev demo still looks populated. With Supabase wired up these come from
// the weekly_events / trip_rosters tables instead.
export const SEED_EVENTS = [
  { id: "ev1", type: "Fire Drill", title: "Scheduled Fire Drill", date: "2026-06-03", time: "10:15", details: "All teachers escort students to designated areas." },
  { id: "ev2", type: "State Test", title: "ELA State Assessment", date: "2026-06-04", time: "08:00", details: "Grades 10 & 11 — quiet corridors after 7:55 AM." },
  { id: "ev3", type: "Field Trip", title: "Varsity Golf @ Pine Hills", date: "2026-06-05", time: "13:30", details: "Coach Davis. Students leave 1:30 PM." },
];

export const SEED_TRIPS = [
  {
    id: "tr1", type: "Athletic Event", title: "Varsity Golf @ Pine Hills",
    teacher: "Coach Davis", date: "2026-06-05", depart: "13:30", returnTime: "17:30",
    notes: "Transportation provided.",
    students: [{ name: "Marcus Thompson", grade: "10" }, { name: "Jordan Garcia", grade: "10" }],
  },
];

export const SEED_CEU = [
  { id: "c1", name: "ODE Reading Strategies Module",       hours: 15, date: "2025-09" },
  { id: "c2", name: "Classroom Management Seminar",        hours: 8,  date: "2025-10" },
  { id: "c3", name: "Differentiated Instruction Workshop", hours: 20, date: "2025-11" },
  { id: "c4", name: "ed2go: Excel for Educators",         hours: 24, date: "2026-01" },
  { id: "c5", name: "ODE Science Standards Update",        hours: 12, date: "2026-03" },
];

