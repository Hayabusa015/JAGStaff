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

// Demo roster — 3 class sections matching the ClassOS classroom periods.
// Used as the in-memory fallback when Supabase is not configured.
export const SEED_STUDENTS = [
  // ── Period 2 · Honors Chemistry ──
  { id: "s-c01", firstName: "Brianna",  lastName: "Adams",    grade: "11", section: "P2 · Honors Chemistry",    parentEmail: "b.adams.parent@demo.com",    studentEmail: "badams@demo.com" },
  { id: "s-c02", firstName: "James",    lastName: "Carter",   grade: "10", section: "P2 · Honors Chemistry",    parentEmail: "j.carter.parent@demo.com",   studentEmail: "jcarter@demo.com" },
  { id: "s-c03", firstName: "Emily",    lastName: "Chen",     grade: "11", section: "P2 · Honors Chemistry",    parentEmail: "e.chen.parent@demo.com",     studentEmail: "echen@demo.com" },
  { id: "s-c04", firstName: "Marcus",   lastName: "Davis",    grade: "10", section: "P2 · Honors Chemistry",    parentEmail: "m.davis.parent@demo.com",    studentEmail: "mdavis@demo.com" },
  { id: "s-c05", firstName: "Sophia",   lastName: "Foster",   grade: "11", section: "P2 · Honors Chemistry",    parentEmail: "s.foster.parent@demo.com",   studentEmail: "sfoster@demo.com" },
  { id: "s-c06", firstName: "Luis",     lastName: "Garcia",   grade: "10", section: "P2 · Honors Chemistry",    parentEmail: "l.garcia.parent@demo.com",   studentEmail: "lgarcia@demo.com" },
  { id: "s-c07", firstName: "Rachel",   lastName: "Kim",      grade: "11", section: "P2 · Honors Chemistry",    parentEmail: "r.kim.parent@demo.com",      studentEmail: "rkim@demo.com" },
  { id: "s-c08", firstName: "Tyler",    lastName: "Morgan",   grade: "10", section: "P2 · Honors Chemistry",    parentEmail: "t.morgan.parent@demo.com",   studentEmail: "tmorgan@demo.com" },
  { id: "s-c09", firstName: "Aaliyah",  lastName: "Nelson",   grade: "11", section: "P2 · Honors Chemistry",    parentEmail: "a.nelson.parent@demo.com",   studentEmail: "anelson@demo.com" },
  { id: "s-c10", firstName: "Nikhil",   lastName: "Patel",    grade: "10", section: "P2 · Honors Chemistry",    parentEmail: "n.patel.parent@demo.com",    studentEmail: "npatel@demo.com" },
  // ── Period 4 · Conceptual Physics ──
  { id: "s-p01", firstName: "Destiny",  lastName: "Barnes",   grade: "9",  section: "P4 · Conceptual Physics",  parentEmail: "d.barnes.parent@demo.com",   studentEmail: "dbarnes@demo.com" },
  { id: "s-p02", firstName: "Nathan",   lastName: "Cooper",   grade: "9",  section: "P4 · Conceptual Physics",  parentEmail: "n.cooper.parent@demo.com",   studentEmail: "ncooper@demo.com" },
  { id: "s-p03", firstName: "Sofia",    lastName: "Diaz",     grade: "10", section: "P4 · Conceptual Physics",  parentEmail: "s.diaz.parent@demo.com",     studentEmail: "sdiaz@demo.com" },
  { id: "s-p04", firstName: "Marcus",   lastName: "Evans",    grade: "9",  section: "P4 · Conceptual Physics",  parentEmail: "m.evans.parent@demo.com",    studentEmail: "mevans@demo.com" },
  { id: "s-p05", firstName: "Emma",     lastName: "Flynn",    grade: "10", section: "P4 · Conceptual Physics",  parentEmail: "e.flynn.parent@demo.com",    studentEmail: "eflynn@demo.com" },
  { id: "s-p06", firstName: "Jordan",   lastName: "Hayes",    grade: "9",  section: "P4 · Conceptual Physics",  parentEmail: "j.hayes.parent@demo.com",    studentEmail: "jhayes@demo.com" },
  { id: "s-p07", firstName: "Amara",    lastName: "Jackson",  grade: "10", section: "P4 · Conceptual Physics",  parentEmail: "a.jackson.parent@demo.com",  studentEmail: "ajackson@demo.com" },
  { id: "s-p08", firstName: "Ethan",    lastName: "Lewis",    grade: "9",  section: "P4 · Conceptual Physics",  parentEmail: "e.lewis.parent@demo.com",    studentEmail: "elewis@demo.com" },
  { id: "s-p09", firstName: "Chloe",    lastName: "Mitchell", grade: "10", section: "P4 · Conceptual Physics",  parentEmail: "c.mitchell.parent@demo.com", studentEmail: "cmitchell@demo.com" },
  { id: "s-p10", firstName: "Carlos",   lastName: "Rivera",   grade: "9",  section: "P4 · Conceptual Physics",  parentEmail: "c.rivera.parent@demo.com",   studentEmail: "crivera@demo.com" },
  // ── Period 6 · Geology ──
  { id: "s-g01", firstName: "Derek",    lastName: "Allen",    grade: "11", section: "P6 · Geology",             parentEmail: "d.allen.parent@demo.com",    studentEmail: "dallen@demo.com" },
  { id: "s-g02", firstName: "Maya",     lastName: "Brooks",   grade: "12", section: "P6 · Geology",             parentEmail: "m.brooks.parent@demo.com",   studentEmail: "mbrooks@demo.com" },
  { id: "s-g03", firstName: "Ryan",     lastName: "Coleman",  grade: "11", section: "P6 · Geology",             parentEmail: "r.coleman.parent@demo.com",  studentEmail: "rcoleman@demo.com" },
  { id: "s-g04", firstName: "Zoe",      lastName: "Edwards",  grade: "12", section: "P6 · Geology",             parentEmail: "z.edwards.parent@demo.com",  studentEmail: "zedwards@demo.com" },
  { id: "s-g05", firstName: "Isaiah",   lastName: "Freeman",  grade: "11", section: "P6 · Geology",             parentEmail: "i.freeman.parent@demo.com",  studentEmail: "ifreeman@demo.com" },
  { id: "s-g06", firstName: "Jasmine",  lastName: "Grant",    grade: "12", section: "P6 · Geology",             parentEmail: "j.grant.parent@demo.com",    studentEmail: "jgrant@demo.com" },
  { id: "s-g07", firstName: "Owen",     lastName: "Harris",   grade: "11", section: "P6 · Geology",             parentEmail: "o.harris.parent@demo.com",   studentEmail: "oharris@demo.com" },
  { id: "s-g08", firstName: "Layla",    lastName: "Ingram",   grade: "12", section: "P6 · Geology",             parentEmail: "l.ingram.parent@demo.com",   studentEmail: "lingram@demo.com" },
  { id: "s-g09", firstName: "Noah",     lastName: "Jenkins",  grade: "11", section: "P6 · Geology",             parentEmail: "n.jenkins.parent@demo.com",  studentEmail: "njenkins@demo.com" },
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

