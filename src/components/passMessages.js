// Fun post-send messages for the student hall pass screen. Pure module —
// pickPassMessage takes the student's stats and a random source, so the
// selection rules (when frequency messages fire, no immediate repeats)
// are unit-testable.

export const MESSAGES = {
  destination: {
    Water: [
      "Save some for the fishes 🐟",
      "Hydration nation 💧",
      "Stay crispy out there 💦",
      "H₂-whoa — make it quick!",
    ],
    Bathroom: [
      "Godspeed. 🫡",
      "We'll hold down the fort.",
      "Wash those hands, legend 🧼",
      "In and out — 20 minute adventure. (Please not 20.)",
    ],
    Library: [
      "Bring back a fact 📚",
      "Say hi to the books for us.",
      "Shhh mode: activated.",
    ],
    Nurse: [
      "Feel better! 🩹",
      "Health first — we've got you covered here.",
    ],
    Office: [
      "Walk tall — official business 🏢",
      "Very important. Very official. Hurry back.",
    ],
    Counselor: [
      "Good call. 💬",
      "Taking care of yourself counts.",
    ],
    Locker: [
      "Grab it and go! 🔐",
      "Locker speed-run: GO.",
      "Don't blank on the combo now.",
    ],
  },
  frequentFlier: [
    "👀 You have the #RANK most passes in the school today.",
    "Frequent flier status unlocked… maybe cool it a little 😄",
    "The halls know your name at this point — #RANK most passes today.",
  ],
  homebody: [
    "First pass in a while — nice job being in class! 🏆",
    "Rare sighting in the halls. Enjoy the stroll!",
    "You barely leave class. Respect. 🫡",
  ],
  generic: [
    "Pass sent — your teacher's on it 📨",
    "Request is in. Sit tight!",
    "Beaming your request to the teacher desk… 📡",
    "Pass requested. Be swift, be legendary.",
  ],
};

// stats: { today, week, rankToday } | null. destination: string.
// random: () => [0,1). lastMessage: previously shown text, never repeated
// back-to-back when the chosen pool has an alternative.
export function pickPassMessage({ stats, destination, random = Math.random, lastMessage = null }) {
  const isFrequent = !!stats && stats.today >= 3 && stats.rankToday <= 3;
  const isHomebody = !!stats && stats.week <= 1 && !isFrequent;

  let pool;
  if (isFrequent && random() < 0.7) pool = MESSAGES.frequentFlier;
  else if (isHomebody && random() < 0.5) pool = MESSAGES.homebody;
  else if (MESSAGES.destination[destination] && random() < 0.65) pool = MESSAGES.destination[destination];
  else pool = MESSAGES.generic;

  let msg = pool[Math.floor(random() * pool.length) % pool.length];
  if (msg === lastMessage && pool.length > 1) {
    msg = pool[(pool.indexOf(msg) + 1) % pool.length];
  }
  return msg.replace("#RANK", `#${stats?.rankToday ?? "?"}`);
}
