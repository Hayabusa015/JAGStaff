// =============================================================================
//  SCENARIO: THE WELLS UNDER MARLOW COUNTY
//  Geology · Unit 6 (Earthquakes) / Unit 10 (Earth's Resources)
//  A 3-round role-play investigation into induced seismicity, built on the
//  Scenario Engine schema (see ../engine.js). Trigger functions read the live
//  session state; effects are applied generically by the engine.
// =============================================================================

// ---- Evidence gate datasets (deterministic — not randomized at runtime) ----
// Gate 1: cross-section dot cloud. [xPercent(0-400), depthMeters]
const GATE1_DOTS = [
  [356,3082],[275,2745],[269,2830],[139,2757],[368,2776],[76,3018],[85,2970],
  [198,2876],[216,2827],[280,2735],[192,2983],[93,2978],[127,2957],[93,2996],
  [134,2990],[52,2833],[327,2961],[83,2908],[139,3061],[299,2921],[364,2957],
  [135,2933],[94,2923],[43,2823],[124,2888],[137,3006],[226,2910],[190,2838],
  [173,2723],[316,2903],[80,3006],[287,2907],[59,2848],[217,2739],
];

// Gate 2: 14 months of injection volume (blue) vs. felt earthquakes (red).
const GATE2_VOLUME = [80,84,88,92,97,101,106,110,115,119,124,128,133,137];
const GATE2_QUAKES = [0,0,0,0,0,0,0,0,1,2,3,5,8,15];

// Gate 3: epicenters in km, relative to the wellpad at (0,0). 31 inside 2 km,
// 3 older/smaller events ~40 km away.
const GATE3_NEAR = [
  [0.62,-1.61],[-0.82,-0.38],[0.48,-0.95],[0,1.24],[0.96,-0.42],[0.09,-0.2],
  [0.37,-1.32],[-0.75,-0.06],[0.3,-0.99],[0.12,-0.85],[-0.43,-0.49],[0.29,0.22],
  [-0.32,-0.04],[-0.88,-1.05],[0.67,0.29],[-0.27,0.29],[1.02,-1.31],[0.87,0.11],
  [-1,-1.41],[-0.17,-0.16],[-0.42,1.35],[-0.32,-1.09],[-0.09,1.54],[0.12,1.09],
  [0.74,-0.9],[0.38,0.33],[0.3,0.46],[-0.51,0.17],[-1.56,-0.16],[-0.34,0.22],[0.64,-1.68],
];
const GATE3_FAR = [[38.5,36.2],[41.0,39.8],[39.3,42.1]];

// Trust thresholds used by trigger/roll logic below.
const ALLY_TRUST = 8;   // Dolores counts as "an ally" at/above this
const RAY_TRUSTED = 8;  // Ray counts as "trusted" at/above this

export const marlowCounty = {
  id: 'marlow-county',
  subject: 'geology',
  unitLabel: "Unit 6: Earthquakes / Unit 10: Earth's Resources",
  title: 'The Wells Under Marlow County',
  tagline: 'An induced-seismicity investigation in five roles, three days, one county.',
  icon: 'Mountain',
  format: { days: 3, minutesPerDay: 50, rolesPerTeam: 5 },
  science: 'Induced seismicity, pore pressure, fault reactivation, depth & distance evidence, magnitude & felt intensity.',
  readingLevel: '~8th grade',

  setup: [
    'Marlow County is rural northeast Ohio. Population 14,000. Farms, a shuttered tool plant, one high school.',
    "Fourteen months ago, Tri-State Fluid Services opened the Keystone #4 disposal well outside the village of Marlow. It's a Class II injection well — wastewater from oil and gas drilling gets pumped down it, about 2,650 meters deep, into a layer of sandstone.",
    "The county gets $180,000 a year in fees. That money is currently paying for two sheriff's deputies and the school bus contract.",
    'Five months ago, people started feeling the ground shake.',
    'There is no historical record of earthquakes in Marlow County. Ever.',
  ],

  // ---------------------------------------------------------------------
  //  METERS — shared resources the whole team manages together.
  // ---------------------------------------------------------------------
  meters: [
    { id: 'seismicRisk', label: 'Seismic Risk', start: 22, min: 0, max: 100, failAt: 85, failDirection: 'high', format: 'number', description: 'How likely a damaging quake is.' },
    { id: 'publicTrust', label: 'Public Trust', start: 60, min: 0, max: 100, failAt: 15, failDirection: 'low', format: 'number', description: 'Whether Marlow believes anything the team says.' },
    { id: 'countyBudget', label: 'County Budget', start: 400000, min: 0, max: 800000, failAt: 0, failDirection: 'low', format: 'currency', description: 'What the county can actually pay for.' },
  ],

  // ---------------------------------------------------------------------
  //  CHARACTERS — recurring NPCs, not player roles. Each carries a 0-10
  //  trust value the team can move through how they're treated.
  // ---------------------------------------------------------------------
  characters: [
    {
      id: 'dolores', name: 'Dolores Alvarez', role: '62 · Retired school cafeteria manager', startingTrust: 5,
      bio: 'Lives 1.4 km from the wellpad. Cracks in her foundation, first noticed in March. She has photographed every one of them with a tape measure beside it, dated. She shows up to every meeting. She is not hostile — she is organized, and she has been polite for five months and is running out of polite.',
      voice: 'Plain, specific, tired. Talks in dates and measurements. Never raises her voice.',
      quote: '"March fourteenth. That one was three millimeters. I measured it again Tuesday. It\'s nine."',
    },
    {
      id: 'ray', name: 'Ray Pichler', role: '51 · Well site foreman, Tri-State', startingTrust: 6,
      bio: '24 years in the field. Not a villain. Ray has three kids and a mortgage and genuinely believes the well is safe, because for 24 years it always has been. In June, the injection pressure at Keystone #4 spiked and stayed high for eleven days. He reported it up the chain. Nobody came back to him about it. He has assumed that means it was fine.',
      voice: 'Careful, decent, a little defensive. Says "look" a lot.',
      quote: '"Look — I ran the numbers I was told to run and I sent them where I was told to send them. You\'re the first person to ask me what was in them."',
    },
    {
      id: 'kendra', name: 'Kendra Boyle', role: '27 · Reporter, Marlow County Register', startingTrust: 5,
      bio: 'The paper is two people now. Kendra covers the county fair and the school board and, lately, this. She is not out to destroy anyone. She wants two sources and she wants to be first.',
      voice: 'Fast, direct, always writing. Asks the follow-up question.',
      quote: '"I\'m running something Thursday either way. I\'d rather run yours."',
    },
    {
      id: 'arata', name: 'Tom Arata', role: '48 · Principal, Marlow Elementary', startingTrust: 7,
      bio: 'Building went up in 1961 — unreinforced masonry, brick walls with nothing tying them together. 310 kids inside it, 8:00 to 3:00, every weekday. Tom is not a geologist and does not know what "unreinforced masonry" means. Nobody has told him.',
      voice: 'Warm, distracted, always half-solving something else.',
      quote: '"Should I be doing something? Somebody would tell me if I should be doing something, right?"',
    },
    {
      id: 'voss', name: 'Sandra Voss', role: 'Deputy Director, Ohio DNR — Division of Oil & Gas', startingTrust: 4,
      bio: 'Exists mostly as a voice on speakerphone. Not an obstacle out of malice — she is one person with 200 wells, a legal standard that requires proof, and no authority to act on a hunch.',
      voice: 'Procedural, unhurried, faintly apologetic. Uses the word "threshold."',
      quote: '"I understand you\'re concerned. I need a documented correlation before I can suspend a permit. That\'s not me being difficult, that\'s the statute."',
    },
  ],

  // ---------------------------------------------------------------------
  //  ROLES — one card per student. designNote is teacher-facing.
  // ---------------------------------------------------------------------
  designNote: "Nobody can solve this alone. The Seismologist has the quakes but not the injection data. The Ops Director has the injection data but can't tell if it matters. The EMD knows about the school but has no authority. They have to talk to each other.",
  roles: [
    { id: 'seismologist', name: 'State Seismologist', publicGoal: 'Find out if the well is causing the quakes.', hiddenGoal: 'Your last public call was wrong and it cost you. You need to be sure this time.', holds: 'The earthquake catalog and the map.' },
    { id: 'commissioner', name: 'County Commissioner', publicGoal: 'Keep the county running and keep people safe.', hiddenGoal: "You're up for re-election in seven months. Losing the well money means cutting deputies.", holds: 'The budget and the polling.' },
    { id: 'opsDirector', name: 'Tri-State Operations Director', publicGoal: 'Keep the well running safely and legally.', hiddenGoal: 'Corporate has told you: no shutdown without proof. A shutdown costs $40,000 a day.', holds: 'The injection records — and Ray.' },
    { id: 'emd', name: 'Emergency Management Director', publicGoal: 'Protect people and buildings.', hiddenGoal: 'You have been asking for a building survey for two years and been told no.', holds: 'The building inventory, including the school.' },
    { id: 'coalition', name: "Residents' Coalition Chair", publicGoal: 'Get answers for your neighbors.', hiddenGoal: "Some of the damage reports you've collected are exaggerated. You know which ones. You haven't said.", holds: 'The damage reports — and Dolores.' },
  ],

  // ---------------------------------------------------------------------
  //  ROUNDS
  // ---------------------------------------------------------------------
  rounds: [
    // ============================================================= ROUND 1
    {
      id: 1, day: 1, key: 'shaking-starts', title: 'The Shaking Starts',
      subtitle: 'Day 1 — no irreversible decisions. This round is for gathering.',
      coldOpen: [
        '7:14 AM, Tuesday. The Marlow Diner.',
        'The coffee in the cup nearest the window moves first — a ring of ripples, out from the center, then gone.',
        'Nobody says anything. Bill Kessler looks at his cup, then at the ceiling, then back down at his eggs. The woman in the next booth has both hands flat on the table.',
        'Twelve seconds. Then the plates stop rattling.',
        'Somebody at the counter says, "That\'s the fourth one this month." Somebody else says, "Fifth."',
      ],
      gate: {
        id: 'gate1', visual: 'cross-section', title: 'Where Are the Quakes Happening?',
        prompt: 'Students see a cross-section from the surface down to 3,000+ m. The injection point is marked at 2,650 m, inside the Mt. Simon Sandstone. Precambrian basement rock begins at 2,780 m. Thirty-four earthquake dots are plotted.',
        question: 'Which rock layer are most of the earthquakes happening in?',
        reasoningPrompt: 'In 2–4 sentences: why does that matter?',
        choices: [
          { id: 'basement', label: 'The Precambrian basement rock, below the sandstone', correct: true },
          { id: 'sandstone', label: 'The Mt. Simon Sandstone, right at the injection point', correct: false },
          { id: 'surface', label: 'Shallow surface soil and glacial till', correct: false },
        ],
        data: { dots: GATE1_DOTS, sandstoneTop: 2100, sandstoneBottom: 2780, basementTop: 2780, chartBottom: 3200, injectionDepth: 2650 },
        science: "Sandstone is porous — it soaks up fluid. Basement rock is hard, ancient, and cracked by old faults. When wastewater is pumped in right on top of the basement, the pressure pushes down into those cracks. Water in a fault acts like grease. The fault slips. That's the earthquake.",
        effects: {
          correct: { meters: { publicTrust: 5 }, log: 'The team reads the cross-section correctly: the quakes cluster in the basement rock, below the injection point.' },
          incorrect: { meters: { publicTrust: -3 }, log: 'The team misreads the cross-section and spends the round arguing from a weaker position.' },
        },
      },
      actions: {
        prompt: 'Each role picks one action this round. Check every box your team actually does — you can do more than one if you have time.',
        options: [
          { id: 'interview_dolores', label: 'Interview Dolores Alvarez and listen to her photographs' },
          { id: 'ask_ray', label: "Ask Ray Pichler for the well's pressure records" },
          { id: 'call_odnr', label: 'Call ODNR — talk to Sandra Voss' },
          { id: 'public_meeting', label: 'Hold a public meeting (the press will be there)' },
          { id: 'order_assessment', label: "Order a structural assessment of the elementary school" },
        ],
      },
      beats: [
        {
          id: 'B1-A', when: (s) => s.actionsTaken.has('interview_dolores'),
          title: 'Dolores is heard', text: 'She spreads the photographs across the hood of her car in the parking lot, in order. Each one has a date and a tape measure in the frame. "I\'m not saying I know what\'s doing it. I\'m saying somebody should be writing it down. So I wrote it down." She looks up. "Nobody\'s asked to see these before."',
          effects: { charTrust: { dolores: 3 }, meters: { publicTrust: 6 } },
        },
        {
          id: 'B1-B', when: (s) => !s.actionsTaken.has('interview_dolores'),
          title: 'Dolores is not contacted', text: "She's waiting by the door when the meeting lets out. Nobody stops. In the parking lot, she puts the folder back in her car, on the passenger seat, where it's been riding for five months.",
          effects: { charTrust: { dolores: -2 }, flags: { alvarez_dismissed: true } },
        },
        {
          id: 'B1-C', when: (s) => s.actionsTaken.has('ask_ray'),
          title: 'Ray hands over the pressure log', text: 'Ray doesn\'t hesitate. He walks to the trailer and comes back with a printout. "June. Pressure came up and stayed up eleven days. I flagged it, sent it to Columbus. Never heard back." He shrugs. "Figured that meant it was fine." He hands it over. "You\'re the first one to ask."',
          effects: { charTrust: { ray: 3 }, flags: { pressure_log_known: true } },
        },
        {
          id: 'B1-D', when: (s) => !s.actionsTaken.has('ask_ray'),
          title: 'Nobody asks Ray anything', text: 'Ray eats lunch in his truck at the wellpad, same as every day. The pressure gauge reads the same as it read yesterday. Nobody comes out to the site.',
          effects: { flags: { pressure_log_hidden: true } },
        },
        {
          id: 'B1-E', when: (s) => s.actionsTaken.has('order_assessment'),
          title: 'The school gets assessed', text: 'The engineer is in and out in forty minutes. Her report is one page. "1961. Unreinforced masonry. No lateral bracing. In a moderate event, expect wall separation at the corners. Occupancy 310." Tom Arata reads it twice. "Nobody ever told me that."',
          effects: { flags: { school_known: true }, meters: { seismicRisk: -4 }, charTrust: { arata: 2 } },
        },
        {
          id: 'B1-F', when: (s) => !s.actionsTaken.has('order_assessment'),
          title: 'The school is never assessed', text: 'Tom Arata holds the door at 7:45 and says good morning to 310 kids as they come in past the 1961 brickwork.',
          effects: { flags: { school_unknown: true } },
        },
        {
          id: 'B1-G', when: (s) => s.actionsTaken.has('call_odnr'),
          title: 'Voss states the standard', text: 'Sandra Voss listens for four minutes without interrupting. "I understand you\'re concerned. Here\'s my problem. I need a documented correlation — depth, distance, and timing. Not one. All three. Then I can act." A pause. "Bring me that and I\'ll move fast. I promise you that."',
          effects: { flags: { odnr_standard_known: true } },
        },
        {
          id: 'B1-H-honest', when: (s) => s.actionsTaken.has('public_meeting') && s.pressAnswer === 'honest',
          title: 'Kendra gets a straight answer', text: '"Two questions. Do you think the well is causing this, and what are you doing about it?" She waits. She actually waits. The team answers honestly, uncertainty included.',
          effects: { charTrust: { kendra: 3 }, meters: { publicTrust: 4 }, flags: { kendra_treated_fairly: true } },
        },
        {
          id: 'B1-H-deflect', when: (s) => s.actionsTaken.has('public_meeting') && s.pressAnswer === 'deflect',
          title: 'Kendra gets a deflection', text: 'She waits for a real answer and doesn\'t get one. Thursday\'s headline is about what nobody would say.',
          effects: { charTrust: { kendra: -2 } },
        },
      ],
      closing: {
        text: ['That night there are two more. One at 9:40, one at 11:52. Nobody in Marlow is asleep for the second one.'],
        effects: { meters: { seismicRisk: 9 } },
      },
    },

    // ============================================================= ROUND 2
    {
      id: 2, day: 2, key: 'the-permit', title: 'The Permit',
      subtitle: "Day 2 — the first decision that can't be taken back.",
      coldOpen: [
        'Tri-State has applied to increase injection volume 20%.',
        "The application is four pages. Page three notes that the increase is within the existing permit's engineering limits, which is true.",
        "The county has 72 hours to comment. After that it's Columbus's call, and Columbus approves almost everything.",
        "The commissioner's phone rings. It's the county treasurer. If Tri-State expands, the fee goes to $216,000. That's the third deputy.",
      ],
      gate: {
        id: 'gate2', visual: 'timing-graph', title: 'Does the Timing Match?',
        prompt: 'One graph, two lines, 14 months. Blue: monthly injection volume. Red: number of felt earthquakes that month.',
        question: 'When did the earthquakes start compared to when injection started?',
        reasoningPrompt: "In 2–4 sentences: why doesn't the delay mean the well is innocent?",
        choices: [
          { id: 'month9', label: 'Injection started immediately; quakes didn\'t begin until month 9, then tracked volume with a lag', correct: true },
          { id: 'sametime', label: 'They started at exactly the same time, month 1', correct: false },
          { id: 'noconnection', label: 'The two lines don\'t relate to each other at all', correct: false },
        ],
        data: { volume: GATE2_VOLUME, quakes: GATE2_QUAKES },
        science: "Pressure doesn't move through rock instantly. It seeps outward over months until it reaches a fault that was already close to slipping. The delay isn't evidence against — it's exactly what pressure diffusion looks like.",
        effects: {
          correct: { log: 'The team correctly reads the lag: this is now the second of three pieces Voss demanded.' },
          incorrect: { meters: { publicTrust: -4 }, log: 'The team argues the wrong thing publicly.' },
        },
      },
      decision: {
        id: 'decision2', title: 'The 72-Hour Comment', requiresSignoff: 3,
        prompt: 'The county has 72 hours to file a comment on the permit increase. What does the team file?',
        // Note: `preview` is a rough at-a-glance estimate shown in the option
        // table — it is NOT auto-applied. The matching outcome beat below is
        // the sole source of truth for what actually happens to the meters.
        options: [
          { id: 'support', label: 'Support the increase', description: 'The county backs the expansion.', preview: 'Budget +$36K · Risk +14 · Trust −12' },
          { id: 'oppose', label: 'Oppose outright', description: 'The county formally objects, no conditions offered.', preview: 'Budget −$50K · outcome depends on your evidence' },
          { id: 'conditional', label: 'Support with conditions', description: 'Monitoring array + automatic pause at M3.0. Requires both evidence gates passed.', requires: (s) => s.gates.gate1?.passed && s.gates.gate2?.passed, rollGated: true, preview: 'Risk +4 · Budget −$20K · Trust +8 — if the state signs off' },
          { id: 'delay', label: 'Request a 30-day delay', description: 'Buys time to gather more evidence, at the cost of momentum.', preview: 'Risk +8 · Trust +2' },
        ],
        roll: {
          dice: '2d6', dc: 8,
          modifiers: (s) => {
            let mod = 0; const notes = [];
            if (s.gates.gate1?.passed) { mod += 3; notes.push('+3 Gate 1 passed'); }
            if (s.gates.gate2?.passed) { mod += 3; notes.push('+3 Gate 2 passed'); }
            if ((s.charTrust.dolores ?? 0) >= ALLY_TRUST) { mod += 2; notes.push('+2 Dolores is an ally'); }
            if (s.flags.kendra_treated_fairly) { mod += 2; notes.push('+2 Kendra reported fairly'); }
            if (s.flags.pressure_log_hidden) { mod -= 3; notes.push('−3 pressure log surfaced through the press'); }
            return { mod, notes };
          },
        },
      },
      beats: [
        {
          id: 'B2-A', when: (s) => s.decision?.optionId === 'conditional' && s.decision?.rollSuccess,
          title: 'Conditional approval holds', text: 'Voss reads the county\'s filing twice. "This is the first thing anyone\'s sent me I could actually act on." A pause. "The monitoring\'s a condition of the permit now. If you hit a three-oh, it pauses automatically. I don\'t have to be in the room." Ray gets the order at 4 PM and starts staking sensor locations before dark.',
          effects: { meters: { seismicRisk: 4, countyBudget: -20000, publicTrust: 8 }, charTrust: { voss: 4 } },
        },
        {
          id: 'B2-A-fail', when: (s) => s.decision?.optionId === 'conditional' && !s.decision?.rollSuccess,
          title: 'A good filing, no traction', text: "The filing is sound, but Columbus's review office sits on it past the 72-hour window. Procedurally, the county's silence reads as consent. The increase goes through on the default track anyway — the monitoring array still gets installed, but too late to have mattered this time.",
          effects: { meters: { seismicRisk: 14, countyBudget: -20000, publicTrust: -4 } },
        },
        {
          id: 'B2-B', when: (s) => s.decision?.optionId === 'support',
          title: 'The increase is supported', text: 'The approval comes through in eleven days. Dolores is at the meeting. She doesn\'t speak during public comment. She just sits in the second row with the folder in her lap and looks at each commissioner in turn. When it\'s over she says, on her way out, to nobody in particular: "Nine millimeters."',
          effects: { meters: { seismicRisk: 14, countyBudget: 36000, publicTrust: -12 }, charTrust: { dolores: -4 } },
        },
        {
          id: 'B2-C', when: (s) => s.decision?.optionId === 'oppose' && !(s.gates.gate1?.passed && s.gates.gate2?.passed),
          title: 'Opposed, without the evidence', text: '"You\'re telling me you think it\'s the well. I believe that you believe it. I can\'t suspend a permit on that. Bring me depth, distance, and timing." The increase is approved anyway. The county\'s objection is noted in paragraph nine.',
          effects: { meters: { seismicRisk: 14, publicTrust: 4, countyBudget: -50000 }, flags: { opposed_without_evidence: true } },
        },
        {
          id: 'B2-D', when: (s) => s.decision?.optionId === 'oppose' && s.gates.gate1?.passed && s.gates.gate2?.passed,
          title: 'Opposed, with the evidence', text: '"Okay," Voss says. "Okay. That\'s different." She doesn\'t suspend the permit — she can\'t, not yet. But she puts a hold on the expansion and schedules a review. "Thirty days. Keep sending me data."',
          effects: { meters: { seismicRisk: 6, publicTrust: 6, countyBudget: -50000 }, charTrust: { voss: 3 } },
        },
        {
          id: 'B2-DELAY', when: (s) => s.decision?.optionId === 'delay',
          title: 'A 30-day delay is granted', text: "Columbus grants the extension without much comment — it costs them nothing. The county spends the month gathering data instead of making a call. It buys time. It doesn't buy an outcome — Round 3 opens the moment that month runs out.",
          effects: { meters: { seismicRisk: 8, publicTrust: 2 } },
        },
        {
          id: 'B2-E', when: (s) => s.flags.pressure_log_hidden,
          title: 'LONG FUSE — the pressure log leaks', text: 'Thursday\'s Register, above the fold: "WELL OPERATOR LOGGED PRESSURE SPIKE IN JUNE. COUNTY SAYS IT DIDN\'T KNOW." Kendra got it from a Tri-State crew member who is not Ray and who did not check with Ray. The story is accurate. The framing is devastating. Ray reads it at the diner and puts the paper down: "I told them. I sent it in. Nobody asked me a single question."',
          effects: { meters: { publicTrust: -15 }, charTrust: { ray: -4 }, flags: { coverup_perception: true } },
          teachNote: "There was no cover-up. There was a system where the information existed and nobody's job was to go get it. That failure mode is more common than conspiracy, and it does the same damage.",
        },
        {
          id: 'B2-F', when: (s) => s.flags.alvarez_dismissed,
          title: 'LONG FUSE — Dolores goes to Cleveland', text: "Channel 5 runs ninety seconds at 6:00. Dolores on her front steps, the photographs fanned out on the porch rail, dated, in order, with the tape measure in every frame. The anchor says the county did not respond to requests for comment.",
          effects: { meters: { publicTrust: -10 } },
        },
      ],
      closing: {
        text: [
          'Saturday, 2:11 AM. Magnitude 3.4. This one wakes everybody. Not a rumble — a bang, like something hit the house.',
          'The sheriff\'s office logs 214 calls in forty minutes. A chimney comes down on Route 9. At the Alvarez place, the crack that was nine millimeters on Tuesday is now wide enough to see daylight through.',
          'By sunrise there are news trucks on the square.',
        ],
        effects: { meters: { seismicRisk: (v) => Math.max(v, 60) } },
      },
    },

    // ============================================================= ROUND 3
    {
      id: 3, day: 3, key: 'what-we-owe', title: 'What We Owe People',
      subtitle: 'Day 3 — final decision, then the reveal.',
      coldOpen: (s) => s.flags.school_known ? [
        'Tuesday, 10:42 AM.',
        'Same quake, same wall, same crack opening above the windows.',
        'But the braces went in three weeks ago and the drill was run twice. Mrs. Kepner\'s class is out the east door in ninety seconds. The whole building clears in three minutes.',
        'Tom Arata does a head count in the parking lot, gets 310, and has to stop for a second before he can speak. "We knew," he says finally. "Somebody checked."',
      ] : [
        'Tuesday, 10:42 AM.',
        'Mrs. Kepner\'s fourth grade is at the reading carpet when the room bangs.',
        'Above the windows on the east wall, the mortar joint at the corner opens — a dark line that runs a foot and a half toward the ceiling and stops. Dust comes down on the carpet squares. A kid screams. Then twenty do.',
        'They evacuate in four minutes. Nobody is hurt. Nobody is hurt this time.',
        'Tom Arata stands in the parking lot with 310 kids on the blacktop behind him in ragged lines and asks the only question there is: "Did anybody know this building was like this?"',
      ],
      coldOpenEffects: (s) => s.flags.school_known
        ? { effects: { meters: { publicTrust: 12 }, charTrust: { arata: 5 } } }
        : { effects: { meters: { publicTrust: -20 }, charTrust: { arata: -6 }, flags: { school_incident: true } } },
      gate: {
        id: 'gate3', visual: 'epicenter-map', title: 'How Close Is Close?',
        prompt: 'A map: the wellpad marked, thirty-four quake epicenters plotted, a 2 km scale bar.',
        question: 'How many epicenters fall within 2 km of the well?',
        reasoningPrompt: 'In 2–4 sentences: what does that pattern tell you?',
        choices: [
          { id: '31', label: '31 of 34 — tightly clustered around the well', correct: true },
          { id: '17', label: 'About half — scattered evenly across the county', correct: false },
          { id: '3', label: 'Only 3 of 34 — most are far from the well', correct: false },
        ],
        data: { near: GATE3_NEAR, far: GATE3_FAR, radiusKm: 2 },
        science: 'Natural earthquakes scatter along regional fault systems. These are clustered in a tight bullseye around one wellbore. The other three are older, smaller, and 40 km away. Depth + timing + distance together is the standard — and now the team has all three.',
        effects: {
          correct: { log: 'The team now holds a complete evidentiary case: depth, timing, and distance.' },
          incorrect: { log: 'The team miscounts the map and undersells its own case.' },
        },
      },
      decision: {
        id: 'decision3', title: 'The Public Meeting', requiresSignoff: 4,
        prompt: 'The gym. 400 people. Cameras from three markets. All five roles speak. What does the team decide?',
        // `preview` is a rough at-a-glance estimate for the option table — the
        // matching outcome beat below is the sole source of truth for effects.
        options: [
          { id: 'shutdown', label: 'Full shutdown, permanent', description: 'Stops the well outright.', preview: 'Risk −40 · Budget −$180K/yr · Tri-State sues' },
          { id: 'trafficlight', label: 'Traffic light protocol', description: 'Pause at M3.0, reduce volume, monitor. Requires all 3 evidence gates passed.', requires: (s) => s.gates.gate1?.passed && s.gates.gate2?.passed && s.gates.gate3?.passed, rollGated: true, preview: 'Risk −30 · Budget −$60K · sustainable — if the room believes you' },
          { id: 'reduce', label: 'Reduce volume, no shutdown', description: 'A partial, middle-ground cut.', preview: 'Risk −12 · Budget −$40K' },
          { id: 'stay', label: 'Stay the course, wait for the state', description: 'No local action; defers to Columbus.', preview: 'Risk +10 · Trust −25' },
        ],
        roll: {
          dice: '2d6', dc: 9,
          modifiers: (s) => {
            let mod = 0; const notes = [];
            if (s.gates.gate1?.passed && s.gates.gate2?.passed && s.gates.gate3?.passed) { mod += 4; notes.push('+4 all three gates passed'); }
            if ((s.charTrust.dolores ?? 0) >= ALLY_TRUST) { mod += 3; notes.push('+3 Dolores is an ally'); }
            if (s.flags.kendra_treated_fairly) { mod += 2; notes.push('+2 Kendra reported fairly'); }
            if ((s.charTrust.ray ?? 0) >= RAY_TRUSTED) { mod += 2; notes.push('+2 Ray is trusted'); }
            if (s.flags.school_known) { mod += 3; notes.push('+3 the school was assessed'); }
            if (s.flags.coverup_perception) { mod -= 4; notes.push('−4 cover-up perception'); }
            return { mod, notes };
          },
        },
      },
      beats: [
        {
          id: 'B3-A', when: (s) => s.decision?.optionId === 'trafficlight' && s.gates.gate1?.passed && s.gates.gate2?.passed && s.gates.gate3?.passed && s.decision?.rollSuccess,
          title: 'Traffic light protocol — the best outcome', text: 'The seismologist puts three figures on the projector: depth, timing, distance. It takes four minutes. When it\'s done, Dolores stands up in the second row, and 400 people go quiet, because everybody in that gym knows who she is by now. "I\'ve been coming to these for five months," she says. "This is the first one where somebody showed me something instead of telling me something." She sits down. Voss signs the order the next morning. Volume drops 40%. Six sensors go live. The automatic pause is written into the permit. The last felt earthquake in Marlow County is recorded eleven weeks later — magnitude 2.1. Almost nobody notices it.',
          effects: { meters: { seismicRisk: -30, countyBudget: -60000, publicTrust: 20 }, charTrust: { dolores: 1, voss: 1 } },
        },
        {
          id: 'B3-B', when: (s) => s.decision?.optionId === 'shutdown',
          title: 'Full shutdown', text: 'The pumps stop on a Friday. It works — the quakes taper over four months and stop. It also costs the county $180,000 a year and Ray Pichler his job, along with eleven other people\'s. He shakes hands with the commissioner on his way out of the gym. He\'s not angry. That\'s somehow worse. "You did what you had to do," he says. "I\'d have liked somebody to ask me first. That\'s all."',
          effects: { meters: { seismicRisk: -40, countyBudget: -180000, publicTrust: 10 }, charTrust: { ray: -3 } },
        },
        {
          id: 'B3-REDUCE', when: (s) => s.decision?.optionId === 'reduce',
          title: 'A half-measure', text: 'Volume drops, but nobody signed anything that makes it permanent, and there\'s no sensor network watching for the next spike. It buys quieter nights without buying certainty. Marlow settles into an uneasy, unmonitored calm.',
          effects: { meters: { seismicRisk: -12, countyBudget: -40000, publicTrust: -3 } },
        },
        {
          id: 'B3-C', when: (s) => s.decision?.optionId === 'stay',
          title: 'Stay the course', text: 'The commissioner says the words "pending further study" and the gym reacts before the sentence is finished. Kendra writes down the exact time the shouting starts. Six weeks later: magnitude 4.1. Nine chimneys, a collapsed barn, one broken arm at a house on Route 9. The state suspends the permit unilaterally and the county has no say in any of it, because the county gave up its say.',
          effects: { meters: { seismicRisk: 10, publicTrust: -25 }, flags: { local_control_lost: true } },
        },
        {
          id: 'B3-D', when: (s) => s.decision?.optionId === 'trafficlight' && s.gates.gate1?.passed && s.gates.gate2?.passed && s.gates.gate3?.passed && !s.decision?.rollSuccess,
          title: 'The right call, on a failed roll', text: 'The case is good. The evidence is complete. It doesn\'t land. Too many people in that gym have been told too many things for too long, and the county spent its credibility somewhere back in Round 2. Voss reviews it anyway and acts in three weeks. It works. But the room is lost, and the commissioner loses in November.',
          effects: { meters: { seismicRisk: -25, countyBudget: -60000, publicTrust: -5 } },
          teachNote: 'Say this plainly in the debrief: they were right and it still failed, and the reason traces to a specific earlier choice. That\'s not the dice being unfair. That\'s what trust is.',
        },
      ],
      closing: { text: [], effects: {} },
    },
  ],

  // ---------------------------------------------------------------------
  //  REVEAL — shown on the projector after Round 3 resolves, before debrief.
  // ---------------------------------------------------------------------
  reveal: {
    title: 'What Was Actually Happening Under Marlow County',
    text: [
      'The wastewater was pumped into sandstone at 2,650 meters. Sandstone is porous — it holds fluid the way a sponge does.',
      'But 130 meters below that is basement rock: ancient, hard, and cut by faults that have been sitting there, locked, for hundreds of millions of years. Those faults were already under stress. They were close to slipping. They had been close for a very long time.',
      'Pressure from the injection pushed down and outward into those faults. The water got into the cracks and did what water does — it reduced the friction holding the two sides together.',
      "The fault didn't need the well to give it energy. The energy was already there. The well just let go of it.",
      "That's why the quakes were deep — in the basement, below where the water went in. That's why they were close — 31 of 34 within 2 km of one wellbore. That's why they were late — pressure takes months to travel through rock.",
      'Depth. Distance. Timing. Every team that got all three had the whole answer by the end of Round 3.',
      'This is not a made-up scenario. In December 2011, a magnitude 4.0 earthquake hit Youngstown, Ohio — about forty minutes from here. Youngstown had no recorded earthquake history. A Class II injection well had opened nearby the previous year. The state shut it down. The shaking stopped.',
    ],
    counterfactuals: [
      { title: 'You approved the increase', text: "By March you're at magnitude 4.3 and the state pulls the permit anyway. You lose the money and the well and the argument." },
      { title: 'You shut it down cold in Round 2', text: 'It works. It also costs two deputies, and eleven people at the wellpad, on evidence you didn\'t have yet.' },
      { title: 'You never talked to Ray', text: 'The pressure log always comes out. Always. The only variable is whether it comes from you or from a headline.' },
      { title: 'You never assessed the school', text: 'The crack above the windows in Mrs. Kepner\'s room opens in every single version of this scenario. The only thing you controlled was whether anyone knew it was coming.' },
    ],
  },

  debrief: {
    minutes: 15,
    questions: [
      'What was the first moment you knew it was the well? What convinced you?',
      'Which piece of evidence did you have longest before you used it?',
      'Who in this town did you not talk to? What did they know?',
      "Somebody at your table wanted something you didn't know they wanted. What was it?",
      "If the county needs that $180,000 for deputies — who should decide what that money is worth against a cracked foundation? Is that a science question?",
    ],
    closingNote: "Question 5 is the one to end on. It's Unit 10's whole argument in a sentence.",
  },
};

export default marlowCounty;
