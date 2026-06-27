import { useState, useEffect, useRef } from "react";
import { GOLD } from "../constants.js";

// ── Tour step data ────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "welcome",
    icon: "🏫",
    title: "Welcome to the G-Men Portal",
    subtitle: "Your all-in-one school management hub",
    body: "Everything you need to run your school day lives right here — from live bell schedules and digital hall passes to gradebooks and parent communication. This 2-minute tour shows you around.",
    features: ["One login — your school Google account", "Works on any device, any browser", "Live data shared across all staff"],
    mockup: "welcome",
  },
  {
    id: "dashboard",
    icon: "📊",
    title: "Dashboard",
    subtitle: "Your daily command center",
    body: "The dashboard gives you an instant read on the school day. Current period, late arrivals, today's events, and behavior escalation flags — all before you finish your first cup of coffee.",
    features: ["Live bell schedule & countdown to next period", "Late arrival tracker updated in real time", "Scrolling events ticker for the week ahead", "Escalated behavior alerts across the building"],
    mockup: "Dashboard",
    tab: "dashboard",
  },
  {
    id: "hallpass",
    icon: "🪪",
    title: "Digital Hall Passes",
    subtitle: "No more paper slips",
    body: "Send a student anywhere in the building with one click. The receiving teacher confirms arrival and the pass closes automatically. Every movement is logged with exact timestamps.",
    features: ["One-click pass to office, restroom, or any classroom", "Cross-classroom pass sharing in real time", "Receiving teacher confirms arrival — logged automatically", "Full movement history for any student"],
    mockup: "Hallpass",
    tab: "hallpass",
  },
  {
    id: "gmen",
    icon: "🦅",
    title: "G-Men Period",
    subtitle: "Remediation & behavior management",
    body: "Submit a student for G-Men remediation directly from your desk — no phone call, no slip. Behavior entries accumulate and trigger escalation alerts automatically when thresholds are hit.",
    features: ["Remediation request queue visible to all staff", "Behavior entries with severity classification", "Auto-escalation alerts after repeated incidents", "Real-time notifications pushed to relevant teachers"],
    mockup: "gmen",
    tab: "gmen",
  },
  {
    id: "infractions",
    icon: "📋",
    title: "Infractions Log",
    subtitle: "Document incidents in seconds",
    body: "Fill out a structured form — student, type, severity, description — and it's timestamped and in the system. Every entry is searchable. Referrals and parent conversations get a lot faster.",
    features: ["Structured incident form with severity tiers", "Automatic timestamp and staff attribution", "Searchable history by student or infraction type", "One-click printable referral view"],
    mockup: "infractions",
    tab: "infractions",
  },
  {
    id: "events",
    icon: "📅",
    title: "Weekly Events",
    subtitle: "School-wide calendar, always in sync",
    body: "Post early releases, testing days, assemblies, and lockdowns. They appear instantly in the dashboard ticker for every teacher. No more all-staff emails that get buried.",
    features: ["Post any event — early release, testing, assembly", "Instantly visible in the dashboard ticker for all staff", "Color-coded by type for quick scanning", "Add or remove events in seconds"],
    mockup: "events",
    tab: "events",
  },
  {
    id: "trips",
    icon: "🚌",
    title: "Trip Rosters",
    subtitle: "Field trip management made simple",
    body: "Build a roster for any field trip or early departure. Every teacher can check their own students against the list so no one misses the bus — or stays behind when they shouldn't.",
    features: ["Roster builder with student search", "Per-teacher roster check view", "Multi-trip management on the same day", "Printable passenger list"],
    mockup: "trips",
    tab: "trips",
  },
  {
    id: "resources",
    icon: "🗂",
    title: "Teacher Resources",
    subtitle: "Forms, tracking, and logistics in one place",
    body: "CEU hour logs, requisition submissions, field trip request forms, and the school-wide student roster all live in this tab. Stop emailing attachments — submit and track everything digitally.",
    features: ["CEU hour tracker with verification log", "Requisition form submission and status", "Field trip request with auto-routing", "Full school student roster with search"],
    mockup: "resources",
    tab: "resources",
  },
  {
    id: "classroom",
    icon: "🎓",
    title: "Want your own classroom zone?",
    subtitle: "Personal tools for your students — completely optional",
    body: "Beyond the school-wide tools, the portal has a personal classroom side. Gradebook with Google Classroom sync, a student currency economy, help desk tickets, lesson plans, and more. Takes 5 minutes to set up.",
    features: ["Gradebook with direct GC grade push", "Student currency economy & Cash-In Shop", "Help desk ticket system & kanban board", "Lesson plans with student-facing view"],
    mockup: "classroom",
    isLast: true,
  },
];

// ── Animated step mockups ─────────────────────────────────────────────────────

function MockupBar({ w = "60%", color = "rgba(245,192,37,0.3)", h = 6, r = 3 }) {
  return <div style={{ width: w, height: h, background: color, borderRadius: r }} />;
}

function MockupCard({ children, accent = false, style = {} }) {
  return (
    <div style={{
      background: accent ? "rgba(245,192,37,0.07)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${accent ? "rgba(245,192,37,0.25)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 8, padding: "8px 10px", ...style,
    }}>
      {children}
    </div>
  );
}


const MOCKUPS = {
  welcome: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {["Dashboard", "Hall Pass", "G-Men", "Infractions", "Events"].map(t => (
          <div key={t} style={{ flex: 1, background: t === "Dashboard" ? "rgba(245,192,37,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${t === "Dashboard" ? "rgba(245,192,37,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 6, padding: "5px 3px", textAlign: "center", fontSize: "0.52rem", color: t === "Dashboard" ? GOLD : "rgba(255,255,255,0.4)", fontWeight: 700 }}>{t}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <MockupCard accent style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: GOLD }}>3</div>
          <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.4)" }}>Current Period</div>
        </MockupCard>
        <MockupCard style={{ flex: 2 }}>
          <MockupBar w="80%" color="rgba(245,192,37,0.2)" />
          <div style={{ height: 4 }} />
          <MockupBar w="55%" color="rgba(255,255,255,0.1)" />
          <div style={{ height: 4 }} />
          <MockupBar w="70%" color="rgba(255,255,255,0.08)" />
        </MockupCard>
      </div>
    </div>
  ),

  Dashboard: () => {
    const [tick, setTick] = useState(0);
    useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1200); return () => clearInterval(t); }, []);
    const events = ["Early Release — Friday 2:30pm", "AP Testing — Rm 214", "Faculty Meeting @ 3pm", "Spirit Week starts Monday"];
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <MockupCard accent style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Now</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: GOLD, lineHeight: 1.1 }}>P{3 + (tick % 3)}</div>
            <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.5)" }}>42 min left</div>
          </MockupCard>
          <MockupCard>
            <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Late Arrivals</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f87171" }}>2</div>
          </MockupCard>
        </div>
        <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 5 }}>
          <MockupCard>
            <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>Events ticker</div>
            <div style={{ overflow: "hidden", height: 16 }}>
              <div style={{ transform: `translateY(-${(tick % events.length) * 16}px)`, transition: "transform 0.5s ease" }}>
                {events.concat(events).map((e, i) => (
                  <div key={i} style={{ height: 16, fontSize: "0.58rem", color: GOLD, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>📌 {e}</div>
                ))}
              </div>
            </div>
          </MockupCard>
          {["Hall passes (1 active)", "Behavior flags (0)"].map(l => (
            <MockupCard key={l}><div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.5)" }}>{l}</div></MockupCard>
          ))}
        </div>
      </div>
    );
  },

  Hallpass: () => {
    const [step, setStep] = useState(0);
    useEffect(() => { const t = setInterval(() => setStep(x => (x + 1) % 3), 1400); return () => clearInterval(t); }, []);
    const steps = [
      { label: "Teacher A sends pass", color: GOLD },
      { label: "In transit…", color: "#60a5fa" },
      { label: "Arrival confirmed ✓", color: "#4ade80" },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, background: i === step ? `${s.color}15` : "rgba(255,255,255,0.03)", border: `1px solid ${i === step ? s.color + "40" : "rgba(255,255,255,0.07)"}`, borderRadius: 7, padding: 8, transition: "all 0.4s" }}>
              <div style={{ fontSize: "0.6rem", fontWeight: i === step ? 700 : 400, color: i === step ? s.color : "rgba(255,255,255,0.3)", lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <MockupCard>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(245,192,37,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>👤</div>
            <div>
              <MockupBar w={80} color="rgba(255,255,255,0.2)" h={6} />
              <div style={{ height: 3 }} />
              <MockupBar w={50} color="rgba(255,255,255,0.1)" h={5} />
            </div>
            <div style={{ marginLeft: "auto", background: step === 2 ? "rgba(74,222,128,0.2)" : "rgba(245,192,37,0.15)", border: `1px solid ${step === 2 ? "rgba(74,222,128,0.4)" : "rgba(245,192,37,0.3)"}`, borderRadius: 5, padding: "3px 8px", fontSize: "0.58rem", color: step === 2 ? "#4ade80" : GOLD, transition: "all 0.4s" }}>
              {step === 2 ? "returned" : "active"}
            </div>
          </div>
        </MockupCard>
      </div>
    );
  },

  gmen: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {[{ label: "Submitted", n: 4, c: "#fb923c" }, { label: "In G-Men", n: 2, c: GOLD }, { label: "Resolved", n: 7, c: "#4ade80" }].map(s => (
          <MockupCard key={s.label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: s.c }}>{s.n}</div>
            <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
          </MockupCard>
        ))}
      </div>
      <MockupCard>
        {["Johnson, Alex — Disruption", "Smith, Riley — Tardy ×3", "Park, Jordan — Missing work"].map((r, i) => (
          <div key={r} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: i === 0 ? "#ef4444" : i === 1 ? "#fb923c" : GOLD, flexShrink: 0 }} />
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.6)" }}>{r}</div>
          </div>
        ))}
      </MockupCard>
    </div>
  ),

  infractions: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <MockupCard>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {["Student", "Type", "Severity", "Date"].map(l => (
            <div key={l}>
              <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>{l}</div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4 }} />
            </div>
          ))}
        </div>
        <div style={{ height: 8 }} />
        <div style={{ height: 20, background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />
        <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ background: "rgba(245,192,37,0.2)", border: `1px solid rgba(245,192,37,0.3)`, borderRadius: 5, padding: "2px 10px", fontSize: "0.58rem", color: GOLD }}>Log Infraction</div>
        </div>
      </MockupCard>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {[["#f97316", "Disruption", "1:14pm"], ["#ef4444", "Vandalism", "Yesterday"], ["#fb923c", "Tardy", "Mon"]].map(([c, t, d]) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 5, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.6)", flex: 1 }}>{t}</div>
            <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.3)" }}>{d}</div>
          </div>
        ))}
      </div>
    </div>
  ),

  events: () => {
    const evs = [
      { type: "Early Release", title: "Faculty PD", date: "Friday", color: "#f97316" },
      { type: "Testing", title: "AP Chemistry", date: "Monday", color: "#60a5fa" },
      { type: "Assembly", title: "Pep Rally", date: "Fri May 9", color: GOLD },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <MockupCard style={{ padding: "6px 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <MockupBar w="30%" color="rgba(255,255,255,0.15)" h={7} />
            <div style={{ background: "rgba(245,192,37,0.2)", borderRadius: 5, padding: "2px 8px", fontSize: "0.55rem", color: GOLD }}>+ Add Event</div>
          </div>
          {evs.map((e) => (
            <div key={e.title} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ background: `${e.color}20`, border: `1px solid ${e.color}40`, borderRadius: 4, padding: "1px 5px", fontSize: "0.52rem", color: e.color, whiteSpace: "nowrap" }}>{e.type}</div>
              <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.7)", flex: 1 }}>{e.title}</div>
              <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.3)" }}>{e.date}</div>
            </div>
          ))}
        </MockupCard>
      </div>
    );
  },

  trips: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <MockupCard style={{ flex: 1 }}>
        <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Field Trip · 24 students</div>
        {[["Cooper, A", "✓"], ["Davis, M", "✓"], ["Evans, T", "—"], ["Hall, J", "✓"]].map(([name, status]) => (
          <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "0.6rem", color: status === "✓" ? "rgba(74,222,128,0.8)" : "rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span>{name}</span><span>{status}</span>
          </div>
        ))}
      </MockupCard>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        <MockupCard>
          <div style={{ fontSize: "0.6rem", color: GOLD, fontWeight: 700 }}>Zoo Trip</div>
          <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.4)" }}>May 14 · 24 riders</div>
        </MockupCard>
        <MockupCard>
          <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.6)" }}>Science Museum</div>
          <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.4)" }}>May 21 · 18 riders</div>
        </MockupCard>
        <div style={{ background: "rgba(245,192,37,0.1)", border: `1px solid rgba(245,192,37,0.2)`, borderRadius: 6, padding: "4px 8px", fontSize: "0.6rem", color: GOLD, textAlign: "center" }}>+ New Roster</div>
      </div>
    </div>
  ),

  resources: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        {[
          { icon: "📜", label: "CEU Tracker", desc: "12.5 hrs logged" },
          { icon: "🧾", label: "Requisitions", desc: "1 pending" },
          { icon: "🚌", label: "Field Trip Form", desc: "Draft saved" },
          { icon: "👤", label: "Student Roster", desc: "312 students" },
        ].map(r => (
          <MockupCard key={r.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.85rem" }}>{r.icon}</span>
            <div>
              <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{r.label}</div>
              <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.35)" }}>{r.desc}</div>
            </div>
          </MockupCard>
        ))}
      </div>
    </div>
  ),

  classroom: () => (
    <div style={{ display: "flex", gap: 8 }}>
      {[
        { icon: "📊", label: "Gradebook", sub: "GC sync" },
        { icon: "🪙", label: "Economy", sub: "Mole $$$" },
        { icon: "🎫", label: "Help Desk", sub: "Tickets" },
        { icon: "📖", label: "Lessons", sub: "Board view" },
      ].map((f, i) => (
        <div key={f.label} style={{
          flex: 1, background: i === 0 ? "rgba(245,192,37,0.1)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${i === 0 ? "rgba(245,192,37,0.3)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 8, padding: 8, textAlign: "center",
        }}>
          <div style={{ fontSize: "1.1rem", marginBottom: 3 }}>{f.icon}</div>
          <div style={{ fontSize: "0.6rem", fontWeight: 700, color: i === 0 ? GOLD : "rgba(255,255,255,0.6)" }}>{f.label}</div>
          <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.3)" }}>{f.sub}</div>
        </div>
      ))}
    </div>
  ),
};

// ── Tour storage key ──────────────────────────────────────────────────────────

export function tourDone(email) {
  try { return !!localStorage.getItem(`gmen-tour-${email}-v1`); } catch { return false; }
}
function markTourDone(email) {
  try { localStorage.setItem(`gmen-tour-${email}-v1`, "1"); } catch { /* ignore storage errors */ }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StaffWelcomeTour({ userEmail, onClose, onGoToClassroom }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1); // 1 = forward, -1 = back
  const [animating, setAnimating] = useState(false);
  const timeoutRef = useRef(null);
  const total = STEPS.length;
  const current = STEPS[step];

  function navigate(delta) {
    if (animating) return;
    setDir(delta);
    setAnimating(true);
    timeoutRef.current = setTimeout(() => {
      setStep(s => s + delta);
      setAnimating(false);
    }, 280);
  }

  function finish(goClassroom = false) {
    markTourDone(userEmail);
    if (goClassroom) { onGoToClassroom?.(); }
    onClose();
  }

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const MockupComp = MOCKUPS[current.mockup] || (() => null);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(5,4,3,0.85)",
      backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}>
      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 620,
        background: "linear-gradient(160deg, #111008 0%, #0a0a0a 100%)",
        border: `1px solid rgba(245,192,37,0.2)`,
        borderRadius: 20,
        boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,192,37,0.05) inset",
        overflow: "hidden",
        transform: animating ? `translateX(${dir * 24}px)` : "translateX(0)",
        opacity: animating ? 0 : 1,
        transition: "transform 0.28s ease, opacity 0.28s ease",
      }}>
        {/* Header bar */}
        <div style={{
          background: "linear-gradient(90deg, rgba(245,192,37,0.12) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(245,192,37,0.1)",
          padding: "14px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(245,192,37,0.15)", border: "1px solid rgba(245,192,37,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>
              {current.icon}
            </div>
            <div>
              <div style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.12em", color: "rgba(245,192,37,0.6)", textTransform: "uppercase" }}>
                G-Men Portal Tour
              </div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                Step {step + 1} of {total}
              </div>
            </div>
          </div>
          <button
            onClick={() => finish(false)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: "1rem", padding: "2px 6px", borderRadius: 4 }}
          >
            ✕ Skip
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 2, background: "rgba(255,255,255,0.06)" }}>
          <div style={{
            height: "100%",
            width: `${((step + 1) / total) * 100}%`,
            background: `linear-gradient(90deg, ${GOLD}, #e8b020)`,
            transition: "width 0.4s ease",
            boxShadow: `0 0 8px rgba(245,192,37,0.6)`,
          }} />
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px" }}>
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1.2 }}>
              {current.title}
            </h2>
            <p style={{ fontSize: "0.78rem", color: GOLD, margin: "4px 0 0", fontWeight: 600 }}>
              {current.subtitle}
            </p>
          </div>

          {/* Mockup window */}
          <div style={{
            background: "#050403",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            minHeight: 110,
          }}>
            {/* Fake browser/app chrome */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["#ef4444", "#f59e0b", "#22c55e"].map(c => (
                <div key={c} style={{ width: 7, height: 7, borderRadius: "50%", background: c, opacity: 0.7 }} />
              ))}
              <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.06)", borderRadius: 4, marginLeft: 6 }} />
            </div>
            <MockupComp />
          </div>

          {/* Body text */}
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.65, margin: "0 0 14px" }}>
            {current.body}
          </p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 20 }}>
            {current.features.map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(245,192,37,0.15)", border: "1px solid rgba(245,192,37,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.55rem", color: GOLD }}>✓</div>
                <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.65)" }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Navigation */}
          {current.isLast ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => navigate(-1)}
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 10, padding: "0.65rem 1rem", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}
              >
                ← Back
              </button>
              <button
                onClick={() => finish(false)}
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 10, padding: "0.65rem 1rem", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}
              >
                No thanks — done
              </button>
              <button
                onClick={() => finish(true)}
                style={{ flex: 2, background: `linear-gradient(135deg, ${GOLD}, #e8b020)`, border: "none", color: "#0a0700", fontWeight: 900, fontSize: "0.85rem", borderRadius: 10, padding: "0.65rem 1rem", cursor: "pointer", boxShadow: "0 4px 20px rgba(245,192,37,0.4)", letterSpacing: "0.04em" }}
              >
                🎓 Set Up My Classroom →
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              {step > 0 && (
                <button
                  onClick={() => navigate(-1)}
                  style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 10, padding: "0.65rem 1rem", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}
                >
                  ← Back
                </button>
              )}
              <button
                onClick={() => navigate(1)}
                style={{ flex: 3, background: `linear-gradient(135deg, ${GOLD}, #e8b020)`, border: "none", color: "#0a0700", fontWeight: 900, fontSize: "0.85rem", borderRadius: 10, padding: "0.65rem 1rem", cursor: "pointer", boxShadow: "0 4px 20px rgba(245,192,37,0.4)" }}
              >
                {step === 0 ? "Start Tour →" : "Next →"}
              </button>
            </div>
          )}
        </div>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 5, paddingBottom: 18 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 18 : 6, height: 6, borderRadius: 3,
                background: i === step ? GOLD : i < step ? "rgba(245,192,37,0.35)" : "rgba(255,255,255,0.12)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
