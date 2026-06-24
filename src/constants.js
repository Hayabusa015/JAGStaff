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

// Demo roster — 6 class sections (8 students each, 48 total).
// Used as the in-memory fallback when Supabase is not configured.
export const SEED_STUDENTS = [
  // ── Period 1 · Honors Chemistry ──
  { id:"s-c01", firstName:"Brianna",  lastName:"Adams",    grade:"11", section:"P1 · Honors Chemistry",       parentEmail:"b.adams.parent@demo.com",    studentEmail:"brianna.adams@jagschools.org"   },
  { id:"s-c02", firstName:"James",    lastName:"Carter",   grade:"10", section:"P1 · Honors Chemistry",       parentEmail:"j.carter.parent@demo.com",   studentEmail:"james.carter@jagschools.org"    },
  { id:"s-c03", firstName:"Emily",    lastName:"Chen",     grade:"11", section:"P1 · Honors Chemistry",       parentEmail:"e.chen.parent@demo.com",     studentEmail:"emily.chen@jagschools.org"      },
  { id:"s-c04", firstName:"Marcus",   lastName:"Davis",    grade:"10", section:"P1 · Honors Chemistry",       parentEmail:"m.davis.parent@demo.com",    studentEmail:"marcus.davis@jagschools.org"    },
  { id:"s-c05", firstName:"Sophia",   lastName:"Foster",   grade:"11", section:"P1 · Honors Chemistry",       parentEmail:"s.foster.parent@demo.com",   studentEmail:"sophia.foster@jagschools.org"   },
  { id:"s-c06", firstName:"Luis",     lastName:"Garcia",   grade:"10", section:"P1 · Honors Chemistry",       parentEmail:"l.garcia.parent@demo.com",   studentEmail:"luis.garcia@jagschools.org"     },
  { id:"s-c07", firstName:"Rachel",   lastName:"Kim",      grade:"11", section:"P1 · Honors Chemistry",       parentEmail:"r.kim.parent@demo.com",      studentEmail:"rachel.kim@jagschools.org"      },
  { id:"s-c08", firstName:"Tyler",    lastName:"Morgan",   grade:"10", section:"P1 · Honors Chemistry",       parentEmail:"t.morgan.parent@demo.com",   studentEmail:"tyler.morgan@jagschools.org"    },
  // ── Period 2 · Conceptual Physics ──
  { id:"s-p01", firstName:"Destiny",  lastName:"Barnes",   grade:"9",  section:"P2 · Conceptual Physics",    parentEmail:"d.barnes.parent@demo.com",   studentEmail:"destiny.barnes@jagschools.org"  },
  { id:"s-p02", firstName:"Nathan",   lastName:"Cooper",   grade:"9",  section:"P2 · Conceptual Physics",    parentEmail:"n.cooper.parent@demo.com",   studentEmail:"nathan.cooper@jagschools.org"   },
  { id:"s-p03", firstName:"Sofia",    lastName:"Diaz",     grade:"10", section:"P2 · Conceptual Physics",    parentEmail:"s.diaz.parent@demo.com",     studentEmail:"sofia.diaz@jagschools.org"      },
  { id:"s-p04", firstName:"Marcus",   lastName:"Evans",    grade:"9",  section:"P2 · Conceptual Physics",    parentEmail:"m.evans.parent@demo.com",    studentEmail:"marcus.evans@jagschools.org"    },
  { id:"s-p05", firstName:"Emma",     lastName:"Flynn",    grade:"10", section:"P2 · Conceptual Physics",    parentEmail:"e.flynn.parent@demo.com",    studentEmail:"emma.flynn@jagschools.org"      },
  { id:"s-p06", firstName:"Jordan",   lastName:"Hayes",    grade:"9",  section:"P2 · Conceptual Physics",    parentEmail:"j.hayes.parent@demo.com",    studentEmail:"jordan.hayes@jagschools.org"    },
  { id:"s-p07", firstName:"Amara",    lastName:"Jackson",  grade:"10", section:"P2 · Conceptual Physics",    parentEmail:"a.jackson.parent@demo.com",  studentEmail:"amara.jackson@jagschools.org"   },
  { id:"s-p08", firstName:"Ethan",    lastName:"Lewis",    grade:"9",  section:"P2 · Conceptual Physics",    parentEmail:"e.lewis.parent@demo.com",    studentEmail:"ethan.lewis@jagschools.org"     },
  // ── Period 3 · AP Biology ──
  { id:"s-b01", firstName:"Chloe",    lastName:"Anderson", grade:"11", section:"P3 · AP Biology",            parentEmail:"c.anderson.parent@demo.com", studentEmail:"chloe.anderson@jagschools.org"  },
  { id:"s-b02", firstName:"Devon",    lastName:"Bell",     grade:"11", section:"P3 · AP Biology",            parentEmail:"d.bell.parent@demo.com",     studentEmail:"devon.bell@jagschools.org"      },
  { id:"s-b03", firstName:"Fatima",   lastName:"Cruz",     grade:"12", section:"P3 · AP Biology",            parentEmail:"f.cruz.parent@demo.com",     studentEmail:"fatima.cruz@jagschools.org"     },
  { id:"s-b04", firstName:"George",   lastName:"Dixon",    grade:"11", section:"P3 · AP Biology",            parentEmail:"g.dixon.parent@demo.com",    studentEmail:"george.dixon@jagschools.org"    },
  { id:"s-b05", firstName:"Hannah",   lastName:"Ellis",    grade:"12", section:"P3 · AP Biology",            parentEmail:"h.ellis.parent@demo.com",    studentEmail:"hannah.ellis@jagschools.org"    },
  { id:"s-b06", firstName:"Ivan",     lastName:"Ford",     grade:"11", section:"P3 · AP Biology",            parentEmail:"i.ford.parent@demo.com",     studentEmail:"ivan.ford@jagschools.org"       },
  { id:"s-b07", firstName:"Julia",    lastName:"Gray",     grade:"12", section:"P3 · AP Biology",            parentEmail:"j.gray.parent@demo.com",     studentEmail:"julia.gray@jagschools.org"      },
  { id:"s-b08", firstName:"Kevin",    lastName:"Hunt",     grade:"11", section:"P3 · AP Biology",            parentEmail:"k.hunt.parent@demo.com",     studentEmail:"kevin.hunt@jagschools.org"      },
  // ── Period 4 · Environmental Science ──
  { id:"s-e01", firstName:"Laura",    lastName:"Irwin",    grade:"10", section:"P4 · Environmental Science", parentEmail:"l.irwin.parent@demo.com",    studentEmail:"laura.irwin@jagschools.org"     },
  { id:"s-e02", firstName:"Miles",    lastName:"James",    grade:"9",  section:"P4 · Environmental Science", parentEmail:"m.james.parent@demo.com",    studentEmail:"miles.james@jagschools.org"     },
  { id:"s-e03", firstName:"Nina",     lastName:"Knox",     grade:"10", section:"P4 · Environmental Science", parentEmail:"n.knox.parent@demo.com",     studentEmail:"nina.knox@jagschools.org"       },
  { id:"s-e04", firstName:"Oscar",    lastName:"Lane",     grade:"9",  section:"P4 · Environmental Science", parentEmail:"o.lane.parent@demo.com",     studentEmail:"oscar.lane@jagschools.org"      },
  { id:"s-e05", firstName:"Penny",    lastName:"Moore",    grade:"10", section:"P4 · Environmental Science", parentEmail:"p.moore.parent@demo.com",    studentEmail:"penny.moore@jagschools.org"     },
  { id:"s-e06", firstName:"Quinn",    lastName:"Nash",     grade:"9",  section:"P4 · Environmental Science", parentEmail:"q.nash.parent@demo.com",     studentEmail:"quinn.nash@jagschools.org"      },
  { id:"s-e07", firstName:"Rosa",     lastName:"Owens",    grade:"10", section:"P4 · Environmental Science", parentEmail:"r.owens.parent@demo.com",    studentEmail:"rosa.owens@jagschools.org"      },
  { id:"s-e08", firstName:"Sam",      lastName:"Page",     grade:"9",  section:"P4 · Environmental Science", parentEmail:"s.page.parent@demo.com",     studentEmail:"sam.page@jagschools.org"        },
  // ── Period 5 · Anatomy & Physiology ──
  { id:"s-a01", firstName:"Tara",     lastName:"Quinn",    grade:"11", section:"P5 · Anatomy & Physiology",  parentEmail:"t.quinn.parent@demo.com",    studentEmail:"tara.quinn@jagschools.org"      },
  { id:"s-a02", firstName:"Ulrich",   lastName:"Reed",     grade:"12", section:"P5 · Anatomy & Physiology",  parentEmail:"u.reed.parent@demo.com",     studentEmail:"ulrich.reed@jagschools.org"     },
  { id:"s-a03", firstName:"Vivian",   lastName:"Scott",    grade:"11", section:"P5 · Anatomy & Physiology",  parentEmail:"v.scott.parent@demo.com",    studentEmail:"vivian.scott@jagschools.org"    },
  { id:"s-a04", firstName:"Wesley",   lastName:"Turner",   grade:"12", section:"P5 · Anatomy & Physiology",  parentEmail:"w.turner.parent@demo.com",   studentEmail:"wesley.turner@jagschools.org"   },
  { id:"s-a05", firstName:"Xena",     lastName:"Upton",    grade:"11", section:"P5 · Anatomy & Physiology",  parentEmail:"x.upton.parent@demo.com",    studentEmail:"xena.upton@jagschools.org"      },
  { id:"s-a06", firstName:"Yusuf",    lastName:"Vance",    grade:"12", section:"P5 · Anatomy & Physiology",  parentEmail:"y.vance.parent@demo.com",    studentEmail:"yusuf.vance@jagschools.org"     },
  { id:"s-a07", firstName:"Zara",     lastName:"Walsh",    grade:"11", section:"P5 · Anatomy & Physiology",  parentEmail:"z.walsh.parent@demo.com",    studentEmail:"zara.walsh@jagschools.org"      },
  { id:"s-a08", firstName:"Aaron",    lastName:"Xu",       grade:"12", section:"P5 · Anatomy & Physiology",  parentEmail:"a.xu.parent@demo.com",       studentEmail:"aaron.xu@jagschools.org"        },
  // ── Period 6 · Geology ──
  { id:"s-g01", firstName:"Derek",    lastName:"Allen",    grade:"11", section:"P6 · Geology",              parentEmail:"d.allen.parent@demo.com",    studentEmail:"derek.allen@jagschools.org"     },
  { id:"s-g02", firstName:"Maya",     lastName:"Brooks",   grade:"12", section:"P6 · Geology",              parentEmail:"m.brooks.parent@demo.com",   studentEmail:"maya.brooks@jagschools.org"     },
  { id:"s-g03", firstName:"Ryan",     lastName:"Coleman",  grade:"11", section:"P6 · Geology",              parentEmail:"r.coleman.parent@demo.com",  studentEmail:"ryan.coleman@jagschools.org"    },
  { id:"s-g04", firstName:"Zoe",      lastName:"Edwards",  grade:"12", section:"P6 · Geology",              parentEmail:"z.edwards.parent@demo.com",  studentEmail:"zoe.edwards@jagschools.org"     },
  { id:"s-g05", firstName:"Isaiah",   lastName:"Freeman",  grade:"11", section:"P6 · Geology",              parentEmail:"i.freeman.parent@demo.com",  studentEmail:"isaiah.freeman@jagschools.org"  },
  { id:"s-g06", firstName:"Jasmine",  lastName:"Grant",    grade:"12", section:"P6 · Geology",              parentEmail:"j.grant.parent@demo.com",    studentEmail:"jasmine.grant@jagschools.org"   },
  { id:"s-g07", firstName:"Owen",     lastName:"Harris",   grade:"11", section:"P6 · Geology",              parentEmail:"o.harris.parent@demo.com",   studentEmail:"owen.harris@jagschools.org"     },
  { id:"s-g08", firstName:"Layla",    lastName:"Ingram",   grade:"12", section:"P6 · Geology",              parentEmail:"l.ingram.parent@demo.com",   studentEmail:"layla.ingram@jagschools.org"    },
];

// ── Gradebook seed (mock mode only) ──────────────────────────────────────────
export const SEED_GRADEBOOK_PROFILE = {
  id: 'profile-seed',
  name: 'Science Standard',
  is_active: true,
  categories: [
    { name: 'Tests',    weight: 70, color: '#ef4444', drop_lowest: 0 },
    { name: 'Quizzes',  weight: 20, color: '#f59e0b', drop_lowest: 0 },
    { name: 'Homework', weight: 10, color: '#60a5fa', drop_lowest: 0 },
    { name: 'Labs',     weight: 0,  color: '#22c55e', drop_lowest: 0 },
  ],
};

// [id, name, category, grading_period, max_points, section]
const _ASGN_SPEC = [
  // P1 · Honors Chemistry
  ['asgn-c1-1-t1','Unit 5 Test',                    'Tests',    1,100,'P1 · Honors Chemistry'],
  ['asgn-c1-1-q1','Unit 5 Quiz 1',                  'Quizzes',  1, 50,'P1 · Honors Chemistry'],
  ['asgn-c1-1-q2','Unit 5 Quiz 2',                  'Quizzes',  1, 50,'P1 · Honors Chemistry'],
  ['asgn-c1-1-q3','Unit 5 Quiz 3',                  'Quizzes',  1, 50,'P1 · Honors Chemistry'],
  ['asgn-c1-1-h1','HW 5.1 - Reaction Types',        'Homework', 1, 20,'P1 · Honors Chemistry'],
  ['asgn-c1-1-h2','HW 5.2 - Balancing Equations',   'Homework', 1, 20,'P1 · Honors Chemistry'],
  ['asgn-c1-1-h3','HW 5.3 - Conservation of Mass',  'Homework', 1, 20,'P1 · Honors Chemistry'],
  ['asgn-c1-1-l1','Unit 5 Lab - Reaction Types',    'Labs',     1, 50,'P1 · Honors Chemistry'],
  ['asgn-c1-2-t1','Unit 6 Test',                    'Tests',    2,100,'P1 · Honors Chemistry'],
  ['asgn-c1-2-q1','Unit 6 Quiz 1 - Mole Conversions','Quizzes', 2, 50,'P1 · Honors Chemistry'],
  ['asgn-c1-2-q2','Unit 6 Quiz 2 - Mole Ratios',    'Quizzes',  2, 50,'P1 · Honors Chemistry'],
  ['asgn-c1-2-q3','Unit 6 Quiz 3 - Limiting Reactants','Quizzes',2,50,'P1 · Honors Chemistry'],
  ['asgn-c1-2-h1','HW 6.1 - Mole Conversions',      'Homework', 2, 20,'P1 · Honors Chemistry'],
  ['asgn-c1-2-h2','HW 6.2 - Mole Ratios',           'Homework', 2, 20,'P1 · Honors Chemistry'],
  ['asgn-c1-2-h3','HW 6.3 - Percent Yield',         'Homework', 2, 20,'P1 · Honors Chemistry'],
  ['asgn-c1-2-l1','Unit 6 Lab - Limiting Reactant', 'Labs',     2, 50,'P1 · Honors Chemistry'],
  // P2 · Conceptual Physics
  ['asgn-p2-1-t1','Unit 3 Test',                    'Tests',    1,100,'P2 · Conceptual Physics'],
  ['asgn-p2-1-q1','Unit 3 Quiz 1',                  'Quizzes',  1, 50,'P2 · Conceptual Physics'],
  ['asgn-p2-1-q2','Unit 3 Quiz 2',                  'Quizzes',  1, 50,'P2 · Conceptual Physics'],
  ['asgn-p2-1-q3','Unit 3 Quiz 3',                  'Quizzes',  1, 50,'P2 · Conceptual Physics'],
  ['asgn-p2-1-h1','HW 3.1 - Displacement',          'Homework', 1, 20,'P2 · Conceptual Physics'],
  ['asgn-p2-1-h2','HW 3.2 - Velocity',              'Homework', 1, 20,'P2 · Conceptual Physics'],
  ['asgn-p2-1-h3','HW 3.3 - Acceleration',          'Homework', 1, 20,'P2 · Conceptual Physics'],
  ['asgn-p2-1-l1','Kinematics Lab - Friction',      'Labs',     1, 50,'P2 · Conceptual Physics'],
  ['asgn-p2-2-t1','Unit 4 Test',                    'Tests',    2,100,'P2 · Conceptual Physics'],
  ['asgn-p2-2-q1','Unit 4 Quiz 1 - Newton\'s Laws', 'Quizzes',  2, 50,'P2 · Conceptual Physics'],
  ['asgn-p2-2-q2','Unit 4 Quiz 2 - Friction',       'Quizzes',  2, 50,'P2 · Conceptual Physics'],
  ['asgn-p2-2-q3','Unit 4 Quiz 3 - Inclined Planes','Quizzes',  2, 50,'P2 · Conceptual Physics'],
  ['asgn-p2-2-h1','HW 4.1 - Free-Body Diagrams',    'Homework', 2, 20,'P2 · Conceptual Physics'],
  ['asgn-p2-2-h2','HW 4.2 - F=ma Problems',         'Homework', 2, 20,'P2 · Conceptual Physics'],
  ['asgn-p2-2-h3','HW 4.3 - Incline Problems',      'Homework', 2, 20,'P2 · Conceptual Physics'],
  ['asgn-p2-2-l1','Unit 4 Lab - FBD Analysis',      'Labs',     2, 50,'P2 · Conceptual Physics'],
  // P3 · AP Biology
  ['asgn-b3-1-t1','Unit 6 Test',                    'Tests',    1,100,'P3 · AP Biology'],
  ['asgn-b3-1-q1','Unit 6 Quiz 1',                  'Quizzes',  1, 50,'P3 · AP Biology'],
  ['asgn-b3-1-q2','Unit 6 Quiz 2',                  'Quizzes',  1, 50,'P3 · AP Biology'],
  ['asgn-b3-1-q3','Unit 6 Quiz 3',                  'Quizzes',  1, 50,'P3 · AP Biology'],
  ['asgn-b3-1-h1','HW 6.1 - Mendelian Genetics',    'Homework', 1, 20,'P3 · AP Biology'],
  ['asgn-b3-1-h2','HW 6.2 - Punnett Squares',       'Homework', 1, 20,'P3 · AP Biology'],
  ['asgn-b3-1-h3','HW 6.3 - Non-Mendelian',         'Homework', 1, 20,'P3 · AP Biology'],
  ['asgn-b3-1-l1','Genetics Lab',                   'Labs',     1, 50,'P3 · AP Biology'],
  ['asgn-b3-2-t1','Unit 7 Test',                    'Tests',    2,100,'P3 · AP Biology'],
  ['asgn-b3-2-q1','Unit 7 Quiz 1 - Mitosis',        'Quizzes',  2, 50,'P3 · AP Biology'],
  ['asgn-b3-2-q2','Unit 7 Quiz 2 - Meiosis',        'Quizzes',  2, 50,'P3 · AP Biology'],
  ['asgn-b3-2-q3','Unit 7 Quiz 3 - Cell Cycle',     'Quizzes',  2, 50,'P3 · AP Biology'],
  ['asgn-b3-2-h1','HW 7.1 - PMAT Phases',           'Homework', 2, 20,'P3 · AP Biology'],
  ['asgn-b3-2-h2','HW 7.2 - Mitosis vs Meiosis',    'Homework', 2, 20,'P3 · AP Biology'],
  ['asgn-b3-2-h3','HW 7.3 - Crossing Over',         'Homework', 2, 20,'P3 · AP Biology'],
  ['asgn-b3-2-l1','Onion Root Tip Lab',             'Labs',     2, 50,'P3 · AP Biology'],
  // P4 · Environmental Science
  ['asgn-e4-1-t1','Unit 4 Test',                    'Tests',    1,100,'P4 · Environmental Science'],
  ['asgn-e4-1-q1','Unit 4 Quiz 1',                  'Quizzes',  1, 50,'P4 · Environmental Science'],
  ['asgn-e4-1-q2','Unit 4 Quiz 2',                  'Quizzes',  1, 50,'P4 · Environmental Science'],
  ['asgn-e4-1-q3','Unit 4 Quiz 3',                  'Quizzes',  1, 50,'P4 · Environmental Science'],
  ['asgn-e4-1-h1','HW 4.1 - Biome Characteristics', 'Homework', 1, 20,'P4 · Environmental Science'],
  ['asgn-e4-1-h2','HW 4.2 - Biodiversity Index',    'Homework', 1, 20,'P4 · Environmental Science'],
  ['asgn-e4-1-h3','HW 4.3 - Climate Zones',         'Homework', 1, 20,'P4 · Environmental Science'],
  ['asgn-e4-1-l1','Biome Card Sort Lab',            'Labs',     1, 50,'P4 · Environmental Science'],
  ['asgn-e4-2-t1','Unit 5 Test',                    'Tests',    2,100,'P4 · Environmental Science'],
  ['asgn-e4-2-q1','Unit 5 Quiz 1 - Food Webs',      'Quizzes',  2, 50,'P4 · Environmental Science'],
  ['asgn-e4-2-q2','Unit 5 Quiz 2 - Energy Flow',    'Quizzes',  2, 50,'P4 · Environmental Science'],
  ['asgn-e4-2-q3','Unit 5 Quiz 3 - Nutrient Cycles','Quizzes',  2, 50,'P4 · Environmental Science'],
  ['asgn-e4-2-h1','HW 5.1 - Food Chain Analysis',   'Homework', 2, 20,'P4 · Environmental Science'],
  ['asgn-e4-2-h2','HW 5.2 - 10% Energy Rule',       'Homework', 2, 20,'P4 · Environmental Science'],
  ['asgn-e4-2-h3','HW 5.3 - Carbon Cycle',          'Homework', 2, 20,'P4 · Environmental Science'],
  ['asgn-e4-2-l1','Food Web Construction Lab',      'Labs',     2, 50,'P4 · Environmental Science'],
  // P5 · Anatomy & Physiology
  ['asgn-a5-1-t1','Unit 5 Test',                    'Tests',    1,100,'P5 · Anatomy & Physiology'],
  ['asgn-a5-1-q1','Unit 5 Quiz 1',                  'Quizzes',  1, 50,'P5 · Anatomy & Physiology'],
  ['asgn-a5-1-q2','Unit 5 Quiz 2',                  'Quizzes',  1, 50,'P5 · Anatomy & Physiology'],
  ['asgn-a5-1-q3','Unit 5 Quiz 3',                  'Quizzes',  1, 50,'P5 · Anatomy & Physiology'],
  ['asgn-a5-1-h1','HW 5.1 - Neuron Anatomy',        'Homework', 1, 20,'P5 · Anatomy & Physiology'],
  ['asgn-a5-1-h2','HW 5.2 - Action Potentials',     'Homework', 1, 20,'P5 · Anatomy & Physiology'],
  ['asgn-a5-1-h3','HW 5.3 - Skin Layers',           'Homework', 1, 20,'P5 · Anatomy & Physiology'],
  ['asgn-a5-1-l1','Neuron Model Lab',               'Labs',     1, 50,'P5 · Anatomy & Physiology'],
  ['asgn-a5-2-t1','Unit 6 Test',                    'Tests',    2,100,'P5 · Anatomy & Physiology'],
  ['asgn-a5-2-q1','Unit 6 Quiz 1 - Bone Types',     'Quizzes',  2, 50,'P5 · Anatomy & Physiology'],
  ['asgn-a5-2-q2','Unit 6 Quiz 2 - Joint Types',    'Quizzes',  2, 50,'P5 · Anatomy & Physiology'],
  ['asgn-a5-2-q3','Unit 6 Quiz 3 - Muscle Contraction','Quizzes',2,50,'P5 · Anatomy & Physiology'],
  ['asgn-a5-2-h1','HW 6.1 - Axial Skeleton',        'Homework', 2, 20,'P5 · Anatomy & Physiology'],
  ['asgn-a5-2-h2','HW 6.2 - Appendicular Skeleton', 'Homework', 2, 20,'P5 · Anatomy & Physiology'],
  ['asgn-a5-2-h3','HW 6.3 - Sliding Filament Theory','Homework',2, 20,'P5 · Anatomy & Physiology'],
  ['asgn-a5-2-l1','Joint Mobility Lab',             'Labs',     2, 50,'P5 · Anatomy & Physiology'],
  // P6 · Geology
  ['asgn-g6-1-t1','Unit 4 Test',                    'Tests',    1,100,'P6 · Geology'],
  ['asgn-g6-1-q1','Unit 4 Quiz 1',                  'Quizzes',  1, 50,'P6 · Geology'],
  ['asgn-g6-1-q2','Unit 4 Quiz 2',                  'Quizzes',  1, 50,'P6 · Geology'],
  ['asgn-g6-1-q3','Unit 4 Quiz 3',                  'Quizzes',  1, 50,'P6 · Geology'],
  ['asgn-g6-1-h1','HW 4.1 - Mineral Properties',    'Homework', 1, 20,'P6 · Geology'],
  ['asgn-g6-1-h2','HW 4.2 - Rock Cycle',            'Homework', 1, 20,'P6 · Geology'],
  ['asgn-g6-1-h3','HW 4.3 - Rock Types',            'Homework', 1, 20,'P6 · Geology'],
  ['asgn-g6-1-l1','Rock Identification Lab',        'Labs',     1, 50,'P6 · Geology'],
  ['asgn-g6-2-t1','Unit 5 Test',                    'Tests',    2,100,'P6 · Geology'],
  ['asgn-g6-2-q1','Unit 5 Quiz 1 - Boundaries',     'Quizzes',  2, 50,'P6 · Geology'],
  ['asgn-g6-2-q2','Unit 5 Quiz 2 - Seafloor',       'Quizzes',  2, 50,'P6 · Geology'],
  ['asgn-g6-2-q3','Unit 5 Quiz 3 - Evidence',       'Quizzes',  2, 50,'P6 · Geology'],
  ['asgn-g6-2-h1','HW 5.1 - Plate Boundaries',      'Homework', 2, 20,'P6 · Geology'],
  ['asgn-g6-2-h2','HW 5.2 - Seafloor Spreading',    'Homework', 2, 20,'P6 · Geology'],
  ['asgn-g6-2-h3','HW 5.3 - Earthquake Patterns',   'Homework', 2, 20,'P6 · Geology'],
  ['asgn-g6-2-l1','Paleomagnetism Lab',             'Labs',     2, 50,'P6 · Geology'],
];

export const SEED_GRADEBOOK_ASSIGNMENTS = _ASGN_SPEC.map(
  ([id, name, category, grading_period, max_points, section]) => ({
    id, name, category, grading_period, max_points, section,
    created_at: '2026-01-15T00:00:00.000Z',
  })
);

// Student IDs in section order (matches SEED_STUDENTS above)
const _SECTION_SIDS = {
  'P1 · Honors Chemistry':       ['s-c01','s-c02','s-c03','s-c04','s-c05','s-c06','s-c07','s-c08'],
  'P2 · Conceptual Physics':     ['s-p01','s-p02','s-p03','s-p04','s-p05','s-p06','s-p07','s-p08'],
  'P3 · AP Biology':             ['s-b01','s-b02','s-b03','s-b04','s-b05','s-b06','s-b07','s-b08'],
  'P4 · Environmental Science':  ['s-e01','s-e02','s-e03','s-e04','s-e05','s-e06','s-e07','s-e08'],
  'P5 · Anatomy & Physiology':   ['s-a01','s-a02','s-a03','s-a04','s-a05','s-a06','s-a07','s-a08'],
  'P6 · Geology':                ['s-g01','s-g02','s-g03','s-g04','s-g05','s-g06','s-g07','s-g08'],
};

const _STUDENT_NAMES = {
  's-c01':'Brianna Adams','s-c02':'James Carter','s-c03':'Emily Chen','s-c04':'Marcus Davis',
  's-c05':'Sophia Foster','s-c06':'Luis Garcia','s-c07':'Rachel Kim','s-c08':'Tyler Morgan',
  's-p01':'Destiny Barnes','s-p02':'Nathan Cooper','s-p03':'Sofia Diaz','s-p04':'Marcus Evans',
  's-p05':'Emma Flynn','s-p06':'Jordan Hayes','s-p07':'Amara Jackson','s-p08':'Ethan Lewis',
  's-b01':'Chloe Anderson','s-b02':'Devon Bell','s-b03':'Fatima Cruz','s-b04':'George Dixon',
  's-b05':'Hannah Ellis','s-b06':'Ivan Ford','s-b07':'Julia Gray','s-b08':'Kevin Hunt',
  's-e01':'Laura Irwin','s-e02':'Miles James','s-e03':'Nina Knox','s-e04':'Oscar Lane',
  's-e05':'Penny Moore','s-e06':'Quinn Nash','s-e07':'Rosa Owens','s-e08':'Sam Page',
  's-a01':'Tara Quinn','s-a02':'Ulrich Reed','s-a03':'Vivian Scott','s-a04':'Wesley Turner',
  's-a05':'Xena Upton','s-a06':'Yusuf Vance','s-a07':'Zara Walsh','s-a08':'Aaron Xu',
  's-g01':'Derek Allen','s-g02':'Maya Brooks','s-g03':'Ryan Coleman','s-g04':'Zoe Edwards',
  's-g05':'Isaiah Freeman','s-g06':'Jasmine Grant','s-g07':'Owen Harris','s-g08':'Layla Ingram',
};

// [assignment_id, [s1_pts, s2_pts, ..., s8_pts]]  null=missing
const _GRADES_SPEC = [
  // P1 · Honors Chemistry — P1
  ['asgn-c1-1-t1',[92,85,97,83,94,74,96,88]],
  ['asgn-c1-1-q1',[46,43,49,42,47,37,48,44]],
  ['asgn-c1-1-q2',[45,42,48,41,46,36,47,43]],
  ['asgn-c1-1-q3',[44,43,49,42,47,38,48,44]],
  ['asgn-c1-1-h1',[19,17,20,18,19,15,20,18]],
  ['asgn-c1-1-h2',[18,16,20,17,19,14,19,17]],
  ['asgn-c1-1-h3',[19,17,20,18,19,15,20,18]],
  ['asgn-c1-1-l1',[46,43,48,42,47,38,48,44]],
  // P1 · Honors Chemistry — P2
  ['asgn-c1-2-t1',[94,87,98,85,95,76,97,90]],
  ['asgn-c1-2-q1',[47,44,49,43,47,38,49,44]],
  ['asgn-c1-2-q2',[45,42,48,41,46,37,47,43]],
  ['asgn-c1-2-q3',[46,43,49,42,47,37,48,44]],
  ['asgn-c1-2-h1',[19,17,20,18,19,16,20,18]],
  ['asgn-c1-2-h2',[18,17,20,17,19,14,20,17]],
  ['asgn-c1-2-h3',[19,16,20,18,19,15,19,17]],
  ['asgn-c1-2-l1',[47,43,49,42,47,38,48,45]],
  // P2 · Conceptual Physics — P1  (Evans=s-p04 struggles, some missing)
  ['asgn-p2-1-t1',[86,74,92,64,84,76,88,94]],
  ['asgn-p2-1-q1',[43,37,46,32,42,38,44,47]],
  ['asgn-p2-1-q2',[42,36,45,31,41,37,43,46]],
  ['asgn-p2-1-q3',[43,38,46,null,42,38,44,47]],
  ['asgn-p2-1-h1',[17,15,19,13,17,15,18,19]],
  ['asgn-p2-1-h2',[17,14,19,null,16,15,17,19]],
  ['asgn-p2-1-h3',[17,15,18,13,17,14,18,19]],
  ['asgn-p2-1-l1',[43,38,46,33,42,38,44,47]],
  // P2 · Conceptual Physics — P2
  ['asgn-p2-2-t1',[88,76,94,67,86,78,90,96]],
  ['asgn-p2-2-q1',[44,38,47,34,43,39,45,48]],
  ['asgn-p2-2-q2',[43,37,46,33,42,38,44,47]],
  ['asgn-p2-2-q3',[44,38,47,null,43,39,45,48]],
  ['asgn-p2-2-h1',[17,15,19,12,17,16,18,19]],
  ['asgn-p2-2-h2',[17,14,19,null,16,15,17,19]],
  ['asgn-p2-2-h3',[17,15,18,13,17,15,18,19]],
  ['asgn-p2-2-l1',[43,38,47,34,42,38,45,47]],
  // P3 · AP Biology — P1
  ['asgn-b3-1-t1',[91,83,96,77,94,84,93,72]],
  ['asgn-b3-1-q1',[46,41,48,38,47,42,46,36]],
  ['asgn-b3-1-q2',[45,41,48,38,46,42,46,35]],
  ['asgn-b3-1-q3',[46,40,49,37,47,42,46,36]],
  ['asgn-b3-1-h1',[18,16,20,15,19,17,19,15]],
  ['asgn-b3-1-h2',[18,16,20,14,18,17,18,14]],
  ['asgn-b3-1-h3',[18,16,20,15,19,17,19,15]],
  ['asgn-b3-1-l1',[46,42,49,38,47,42,47,37]],
  // P3 · AP Biology — P2
  ['asgn-b3-2-t1',[93,85,97,79,95,86,94,74]],
  ['asgn-b3-2-q1',[47,42,49,39,48,43,47,37]],
  ['asgn-b3-2-q2',[46,41,48,38,47,42,46,36]],
  ['asgn-b3-2-q3',[46,42,49,38,47,42,47,36]],
  ['asgn-b3-2-h1',[18,16,20,15,19,17,18,15]],
  ['asgn-b3-2-h2',[18,16,20,14,19,17,19,14]],
  ['asgn-b3-2-h3',[19,16,20,15,18,17,19,15]],
  ['asgn-b3-2-l1',[46,42,49,38,47,42,47,37]],
  // P4 · Environmental Science — P1  (Lane=s-e04 missing work)
  ['asgn-e4-1-t1',[85,81,92,61,74,83,94,72]],
  ['asgn-e4-1-q1',[43,40,46,30,37,41,47,36]],
  ['asgn-e4-1-q2',[42,40,45,null,36,41,47,35]],
  ['asgn-e4-1-q3',[43,40,46,29,37,42,47,36]],
  ['asgn-e4-1-h1',[17,16,19,null,15,17,20,14]],
  ['asgn-e4-1-h2',[16,16,19,12,14,17,19,14]],
  ['asgn-e4-1-h3',[17,15,18,null,15,16,19,14]],
  ['asgn-e4-1-l1',[43,40,46,null,37,41,47,36]],
  // P4 · Environmental Science — P2
  ['asgn-e4-2-t1',[87,83,93,63,76,85,96,74]],
  ['asgn-e4-2-q1',[44,41,47,31,38,42,48,37]],
  ['asgn-e4-2-q2',[43,40,46,null,37,41,47,36]],
  ['asgn-e4-2-q3',[44,41,47,30,38,42,48,37]],
  ['asgn-e4-2-h1',[17,16,19,null,15,17,20,14]],
  ['asgn-e4-2-h2',[17,16,19,12,15,17,19,14]],
  ['asgn-e4-2-h3',[17,15,18,null,15,16,19,14]],
  ['asgn-e4-2-l1',[43,40,46,null,37,41,47,36]],
  // P5 · Anatomy & Physiology — P1
  ['asgn-a5-1-t1',[86,93,82,74,84,91,72,97]],
  ['asgn-a5-1-q1',[43,47,41,37,42,46,36,49]],
  ['asgn-a5-1-q2',[42,46,40,36,42,45,36,48]],
  ['asgn-a5-1-q3',[43,47,41,37,42,46,35,48]],
  ['asgn-a5-1-h1',[17,19,17,15,17,18,14,20]],
  ['asgn-a5-1-h2',[16,19,16,15,17,18,14,20]],
  ['asgn-a5-1-h3',[17,19,17,14,17,18,14,19]],
  ['asgn-a5-1-l1',[43,46,41,37,42,46,36,48]],
  // P5 · Anatomy & Physiology — P2
  ['asgn-a5-2-t1',[88,95,84,76,86,93,74,98]],
  ['asgn-a5-2-q1',[44,47,42,38,43,47,37,49]],
  ['asgn-a5-2-q2',[43,47,41,37,42,46,36,48]],
  ['asgn-a5-2-q3',[44,48,42,38,43,46,37,49]],
  ['asgn-a5-2-h1',[17,19,17,15,17,18,14,20]],
  ['asgn-a5-2-h2',[17,19,16,14,17,18,14,20]],
  ['asgn-a5-2-h3',[17,19,17,15,16,18,14,19]],
  ['asgn-a5-2-l1',[43,46,41,37,42,46,36,48]],
  // P6 · Geology — P1  (Harris=s-g07 missing some work)
  ['asgn-g6-1-t1',[84,91,74,94,82,86,64,76]],
  ['asgn-g6-1-q1',[42,46,37,47,41,43,null,38]],
  ['asgn-g6-1-q2',[41,45,36,46,40,42,32,37]],
  ['asgn-g6-1-q3',[42,46,37,47,41,43,null,38]],
  ['asgn-g6-1-h1',[17,19,15,19,16,17,null,15]],
  ['asgn-g6-1-h2',[16,18,14,18,16,17,13,15]],
  ['asgn-g6-1-h3',[17,19,15,19,16,17,null,15]],
  ['asgn-g6-1-l1',[42,46,37,47,41,43,33,38]],
  // P6 · Geology — P2
  ['asgn-g6-2-t1',[86,93,76,96,84,88,67,78]],
  ['asgn-g6-2-q1',[43,47,38,48,42,44,34,39]],
  ['asgn-g6-2-q2',[42,46,37,47,41,43,null,38]],
  ['asgn-g6-2-q3',[43,47,38,48,42,44,33,39]],
  ['asgn-g6-2-h1',[17,19,15,19,16,17,null,15]],
  ['asgn-g6-2-h2',[17,18,15,19,16,17,13,15]],
  ['asgn-g6-2-h3',[16,19,15,18,16,17,null,14]],
  ['asgn-g6-2-l1',[42,46,37,47,41,43,34,38]],
];

let _gid = 0;
export const SEED_GRADEBOOK_GRADES = _GRADES_SPEC.flatMap(([aid, scores]) => {
  const asgn = SEED_GRADEBOOK_ASSIGNMENTS.find(a => a.id === aid);
  const sids = _SECTION_SIDS[asgn?.section] || [];
  return sids.map((sid, i) => {
    const pts = scores[i];
    return {
      id: `gr-${String(++_gid).padStart(4, '0')}`,
      assignment_id: aid,
      student_id: sid,
      student_name: _STUDENT_NAMES[sid] || sid,
      points_earned: (pts === null) ? null : pts,
      missing: pts === null,
      excused: false,
      graded_at: '2026-06-01T12:00:00.000Z',
    };
  });
});

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

