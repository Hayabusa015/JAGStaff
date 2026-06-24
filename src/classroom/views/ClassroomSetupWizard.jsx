import { useState, useEffect } from "react";
import { useApp } from "../ClassroomContext.jsx";

const FEATURES = [
  { id: "economy",   icon: "🪙", title: "Classroom Economy",  desc: "Reward students with Mole Dollars. They earn, spend in your Cash-In Shop, and learn real financial concepts along the way." },
  { id: "helpdesk",  icon: "🎫", title: "Help Desk",           desc: "Students submit digital tickets when they need help. You manage them on a Kanban board — no more interruptions mid-lesson." },
  { id: "mailer",    icon: "📧", title: "Parent Mailer",       desc: "AI drafts polished parent emails — positive praise or behavior check-ins — in any tone you choose. Send in under 30 seconds." },
  { id: "lessons",   icon: "📖", title: "Lesson Plans",        desc: "Build lessons your students can preview from their dashboard. Link materials, set objectives, and stay organized." },
  { id: "materials", icon: "🗂", title: "Materials Library",   desc: "Upload PDFs, study guides, and resources. Students find everything in one place — no more Google Drive hunting." },
  { id: "aigrader",  icon: "🤖", title: "AI Grader",           desc: "Let AI assist with rubric-based feedback, grade analysis, and formative assessment. Saves hours every week." },
];

const DEFAULT_QUICK_LINKS = [
  { id: "dl", label: "Delta Math",     url: "https://deltamath.com",    icon: "📐" },
  { id: "qz", label: "Quizizz",        url: "https://quizizz.com",      icon: "🧠" },
  { id: "vc", label: "Vocabulary.com", url: "https://vocabulary.com",   icon: "📚" },
];

export function setupDone(email) {
  try { return !!localStorage.getItem(`gmen-classroom-setup-done-${email}-v1`); } catch { return false; }
}
export function markSetupDone(email) {
  try { localStorage.setItem(`gmen-classroom-setup-done-${email}-v1`, "1"); } catch {}
}

// ── Sub-step components ───────────────────────────────────────────────────────

function WelcomeStep({ teacherName, onNext }) {
  return (
    <div style={{ padding: "2.5rem 2.5rem 1.5rem", textAlign: "center" }}>
      <div style={{ fontSize: "3.5rem", marginBottom: "1rem", filter: "drop-shadow(0 0 20px rgba(245,192,37,0.5))" }}>🎓</div>
      <h2 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1.2 }}>
        Welcome{teacherName ? `, ${teacherName}` : ""}
      </h2>
      <p style={{ color: "#F5C025", fontWeight: 700, fontSize: "0.82rem", margin: "6px 0 14px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Let's set up your personal classroom zone
      </p>
      <p style={{ color: "rgba(255,255,255,0.58)", fontSize: "0.83rem", lineHeight: 1.7, maxWidth: 400, margin: "0 auto 1.75rem" }}>
        In the next few minutes you'll choose your features, learn how to sync your Google Classroom roster, set up your quick links, and optionally connect Common Curriculum. Everything you need for day one.
      </p>
      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "2rem" }}>
        {["⏱ About 5 minutes", "✅ Completely optional", "⚙️ Change anytime in Settings"].map(t => (
          <div key={t} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "0.3rem 0.85rem", fontSize: "0.7rem", color: "rgba(255,255,255,0.45)" }}>{t}</div>
        ))}
      </div>
      <button
        onClick={onNext}
        style={{ background: "linear-gradient(135deg, #F5C025, #e8b020)", color: "#0a0700", fontWeight: 900, fontSize: "0.92rem", border: "none", borderRadius: 12, padding: "0.8rem 2.75rem", cursor: "pointer", boxShadow: "0 4px 24px rgba(245,192,37,0.4)", letterSpacing: "0.04em" }}
      >
        Let's Go →
      </button>
    </div>
  );
}

function FeaturesStep({ enabled, onToggle, onNext, onBack }) {
  const count = FEATURES.filter(f => enabled[f.id]).length;
  return (
    <div style={{ padding: "1.5rem 2rem 1rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", margin: 0 }}>Choose your features</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", marginTop: 4, lineHeight: 1.4 }}>Toggle on what you want. You can change these any time in Settings.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {FEATURES.map(f => {
          const on = !!enabled[f.id];
          return (
            <button
              key={f.id}
              onClick={() => onToggle(f.id)}
              style={{
                display: "flex", alignItems: "flex-start", gap: "0.6rem",
                padding: "0.7rem 0.75rem",
                background: on ? "rgba(245,192,37,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${on ? "rgba(245,192,37,0.35)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "1.15rem", flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginBottom: 2 }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: on ? "#F5C025" : "rgba(255,255,255,0.75)" }}>{f.title}</span>
                  {/* Toggle pill */}
                  <div style={{ width: 28, height: 15, borderRadius: 8, background: on ? "#F5C025" : "rgba(255,255,255,0.12)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", top: 1.5, left: on ? 14 : 1.5, width: 12, height: 12, borderRadius: "50%", background: on ? "#0a0700" : "rgba(255,255,255,0.4)", transition: "left 0.2s" }} />
                  </div>
                </div>
                <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.32)", lineHeight: 1.45 }}>{f.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button onClick={onBack} style={BACK_BTN}>← Back</button>
        <button onClick={onNext} style={NEXT_BTN}>
          Continue with {count} feature{count !== 1 ? "s" : ""} →
        </button>
      </div>
    </div>
  );
}

function GCSyncStep({ onNext, onBack }) {
  return (
    <div style={{ padding: "1.5rem 2rem 1rem" }}>
      <div style={{ marginBottom: "1.1rem" }}>
        <div style={{ fontSize: "1.8rem", marginBottom: "0.4rem" }}>🎓</div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", margin: 0 }}>Sync from Google Classroom</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", marginTop: 4, lineHeight: 1.4 }}>This is how your students get into the app on day one.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginBottom: "1.1rem" }}>
        {[
          { n: "1", title: "Students join your Google Classroom", body: "On day one, ask students to join your Google Classroom course using your join code. This takes about 2 minutes and they only do it once." },
          { n: "2", title: "You click Sync here in the portal", body: "Go to Settings → Classroom Roster and click the sync button below. The portal fetches your full roster automatically — no manual entry." },
          { n: "3", title: "Students log in with their school account", body: "Students sign in with their @jagschools.org Google account. The portal recognizes them from your roster and drops them right into your class." },
        ].map(item => (
          <div key={item.n} style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", padding: "0.65rem 0.75rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(245,192,37,0.15)", border: "1px solid rgba(245,192,37,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", fontWeight: 800, color: "#F5C025", flexShrink: 0 }}>{item.n}</div>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.82)", marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{item.body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mockup of the sync button */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "0.65rem 0.9rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>This button lives in Settings → Classroom Roster after setup</div>
          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>You don't need to sync right now — come back on day one</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(245,192,37,0.12)", border: "1px solid rgba(245,192,37,0.25)", borderRadius: 7, padding: "0.38rem 0.7rem", fontSize: "0.7rem", fontWeight: 700, color: "#F5C025", whiteSpace: "nowrap", flexShrink: 0 }}>
          🎓 Sync from Google Classroom
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button onClick={onBack} style={BACK_BTN}>← Back</button>
        <button onClick={onNext} style={NEXT_BTN}>Got it →</button>
      </div>
    </div>
  );
}

function QuickLinksStep({ links, newLabel, newUrl, setNewLabel, setNewUrl, onAdd, onRemove, onNext, onBack }) {
  return (
    <div style={{ padding: "1.5rem 2rem 1rem" }}>
      <div style={{ marginBottom: "1.1rem" }}>
        <div style={{ fontSize: "1.8rem", marginBottom: "0.4rem" }}>🔗</div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", margin: 0 }}>Quick Links</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", marginTop: 4, lineHeight: 1.4 }}>Your students see these on their dashboard. We've pre-loaded the most common tools — add or remove as needed.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.85rem", maxHeight: 175, overflowY: "auto" }}>
        {links.map(link => (
          <div key={link.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.7rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8 }}>
            <span style={{ fontSize: "0.95rem" }}>{link.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "rgba(255,255,255,0.78)" }}>{link.label}</div>
              <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{link.url}</div>
            </div>
            <button onClick={() => onRemove(link.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.22)", cursor: "pointer", fontSize: "0.85rem", padding: "2px 6px", borderRadius: 4, lineHeight: 1 }}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem" }}>
        <input
          type="text" placeholder="Label (e.g. Khan Academy)" value={newLabel} onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onAdd()}
          style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "0.5rem 0.7rem", color: "#fff", fontSize: "0.76rem", outline: "none" }}
        />
        <input
          type="text" placeholder="https://…" value={newUrl} onChange={e => setNewUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onAdd()}
          style={{ flex: 1.5, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "0.5rem 0.7rem", color: "#fff", fontSize: "0.76rem", outline: "none" }}
        />
        <button onClick={onAdd} style={{ background: "rgba(245,192,37,0.15)", border: "1px solid rgba(245,192,37,0.28)", color: "#F5C025", borderRadius: 7, padding: "0.5rem 0.8rem", cursor: "pointer", fontSize: "0.76rem", fontWeight: 700, whiteSpace: "nowrap" }}>+ Add</button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button onClick={onBack} style={BACK_BTN}>← Back</button>
        <button onClick={onNext} style={NEXT_BTN}>Continue →</button>
      </div>
    </div>
  );
}

function CurriculumStep({ apiKey, setApiKey, onNext, onBack }) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div style={{ padding: "1.5rem 2rem 1rem" }}>
      <div style={{ marginBottom: "1.1rem" }}>
        <div style={{ fontSize: "1.8rem", marginBottom: "0.4rem" }}>📋</div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", margin: 0 }}>Common Curriculum API Key</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", marginTop: 4 }}>Optional — connects your pacing guides automatically. Skip if you're not sure.</p>
      </div>

      <div style={{ background: "rgba(245,192,37,0.06)", border: "1px solid rgba(245,192,37,0.15)", borderRadius: 9, padding: "0.8rem 1rem", marginBottom: "1rem", fontSize: "0.77rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.65 }}>
        <strong style={{ color: "#F5C025" }}>What is this?</strong> Common Curriculum is the pacing guide and lesson planning tool used by JAG teachers. Your API key lets the G-Men Portal pull your unit plans in automatically — so your lesson plans are always in sync without copying anything over.
      </div>

      <input
        type="password" autoComplete="off" spellCheck="false"
        placeholder="Paste your API key here…"
        value={apiKey} onChange={e => setApiKey(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "0.68rem 0.9rem", color: "#fff", fontSize: "0.82rem", outline: "none", fontFamily: "monospace", marginBottom: "0.7rem" }}
      />

      <button onClick={() => setShowHelp(h => !h)} style={{ background: "none", border: "none", color: "rgba(245,192,37,0.55)", cursor: "pointer", fontSize: "0.74rem", padding: 0, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
        {showHelp ? "▾" : "▸"} Where do I find my API key?
      </button>

      {showHelp && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "0.9rem", fontSize: "0.73rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}>
          <ol style={{ paddingLeft: "1.25rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <li>Go to <strong style={{ color: "rgba(255,255,255,0.72)" }}>commoncurriculum.com</strong> and sign in with your school account</li>
            <li>Click your name / profile photo in the top-right corner</li>
            <li>Select <strong style={{ color: "rgba(255,255,255,0.72)" }}>Account Settings</strong>, then scroll to <strong style={{ color: "rgba(255,255,255,0.72)" }}>API &amp; Integrations</strong></li>
            <li>Copy your key and paste it above</li>
            <li>Don't have one? Contact your department head — they can generate a key for your account.</li>
          </ol>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button onClick={onBack} style={BACK_BTN}>← Back</button>
        <button onClick={onNext} style={NEXT_BTN}>
          {apiKey.trim() ? "Connect & Finish →" : "Skip for Now →"}
        </button>
      </div>
    </div>
  );
}

function BuildingStep({ progress, items }) {
  return (
    <div style={{ padding: "2.5rem 2.5rem 3rem", minHeight: 320 }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", filter: "drop-shadow(0 0 16px rgba(245,192,37,0.4))" }}>🏗️</div>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#fff", margin: 0 }}>Building your classroom…</h2>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem", marginTop: 4 }}>This takes just a moment.</p>
      </div>

      <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, marginBottom: "1.75rem", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #F5C025, #ffd14a)", borderRadius: 3, transition: "width 0.35s ease", boxShadow: "0 0 10px rgba(245,192,37,0.55)" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.45rem 0.75rem", background: "rgba(245,192,37,0.06)", border: "1px solid rgba(245,192,37,0.14)", borderRadius: 8, animation: "slide-up 0.3s ease-out" }}>
            <span style={{ fontSize: "0.95rem" }}>{item.icon}</span>
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", flex: 1 }}>{item.label}</span>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.58rem", color: "#4ade80", fontWeight: 700, flexShrink: 0 }}>✓</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LaunchStep({ teacherName, onDone }) {
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "gmen-launch-anim";
    style.textContent = `
      @keyframes gmen-sparkle-float { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-50px) scale(0.1);opacity:0} }
      @keyframes gmen-hero-pop { 0%{transform:scale(0.4) rotate(-15deg);opacity:0} 65%{transform:scale(1.15) rotate(3deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
      @keyframes gmen-glow-ring { 0%{transform:scale(0.5);opacity:0.8} 100%{transform:scale(2.2);opacity:0} }
      @keyframes gmen-text-rise { 0%{transform:translateY(12px);opacity:0} 100%{transform:translateY(0);opacity:1} }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("gmen-launch-anim")?.remove();
  }, []);

  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: 15 + Math.random() * 70,
    y: 15 + Math.random() * 70,
    size: 5 + Math.random() * 8,
    delay: i * 90,
    dur: 1400 + Math.random() * 1000,
    color: i % 4 === 0 ? "#F5C025" : i % 4 === 1 ? "#fff" : i % 4 === 2 ? "#ffd14a" : "#60a5fa",
  }));

  return (
    <div style={{ padding: "3rem 2.5rem 2.5rem", textAlign: "center", position: "relative", overflow: "hidden", minHeight: 340 }}>
      {particles.map(p => (
        <div key={p.id} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: "50%", background: p.color, animation: `gmen-sparkle-float ${p.dur}ms ${p.delay}ms ease-out infinite`, opacity: 0, pointerEvents: "none" }} />
      ))}

      {/* Glow ring */}
      <div style={{ position: "absolute", left: "50%", top: "35%", width: 80, height: 80, transform: "translate(-50%, -50%)", borderRadius: "50%", border: "2px solid rgba(245,192,37,0.5)", animation: "gmen-glow-ring 2s ease-out infinite", pointerEvents: "none" }} />

      <div style={{ fontSize: "4rem", marginBottom: "1.25rem", display: "inline-block", animation: "gmen-hero-pop 0.7s cubic-bezier(.34,1.56,.64,1) forwards", filter: "drop-shadow(0 0 24px rgba(245,192,37,0.7))" }}>
        🚀
      </div>

      <h2 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#F5C025", margin: 0, animation: "gmen-text-rise 0.5s 0.3s ease-out both", textShadow: "0 0 30px rgba(245,192,37,0.4)" }}>
        Your Classroom is Ready!
      </h2>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem", lineHeight: 1.65, maxWidth: 380, margin: "0.75rem auto 2rem", animation: "gmen-text-rise 0.5s 0.55s ease-out both" }}>
        Everything is set up and waiting for your students.{teacherName ? ` Welcome to the G-Men Portal, ${teacherName}.` : ""} Head to your dashboard — you can adjust any of this from Settings whenever you want.
      </p>

      <button
        onClick={onDone}
        style={{ background: "linear-gradient(135deg, #F5C025, #e8b020)", color: "#0a0700", fontWeight: 900, fontSize: "0.95rem", border: "none", borderRadius: 12, padding: "0.85rem 2.5rem", cursor: "pointer", boxShadow: "0 4px 28px rgba(245,192,37,0.5)", letterSpacing: "0.04em", animation: "gmen-text-rise 0.5s 0.8s ease-out both" }}
      >
        Enter My Classroom →
      </button>
    </div>
  );
}

// ── Shared button styles ──────────────────────────────────────────────────────

const BACK_BTN = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 10, padding: "0.62rem 1.15rem", cursor: "pointer", fontSize: "0.81rem", fontWeight: 600 };
const NEXT_BTN = { background: "linear-gradient(135deg, #F5C025, #e8b020)", color: "#0a0700", fontWeight: 900, fontSize: "0.84rem", border: "none", borderRadius: 10, padding: "0.62rem 1.4rem", cursor: "pointer", boxShadow: "0 4px 16px rgba(245,192,37,0.3)" };

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function ClassroomSetupWizard({ userEmail, onComplete }) {
  const { updateTeacherProfile, teacherProfile } = useApp();

  const [step, setStep] = useState("welcome");
  const [enabled, setEnabled] = useState({ economy: true, helpdesk: true, mailer: true, lessons: true, materials: true, aigrader: false });
  const [links, setLinks] = useState(DEFAULT_QUICK_LINKS);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildItems, setBuildItems] = useState([]);

  const FLOW = ["welcome", "features", "gcsync", "quicklinks", "curriculum"];
  const stepIdx = FLOW.indexOf(step);

  function skip() {
    markSetupDone(userEmail);
    onComplete();
  }

  function addLink() {
    if (!newLabel.trim() || !newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    setLinks(prev => [...prev, { id: Date.now().toString(), label: newLabel.trim(), url, icon: "🔗" }]);
    setNewLabel("");
    setNewUrl("");
  }

  // Building animation — runs once when step === "building"
  useEffect(() => {
    if (step !== "building") return;
    const featureItems = FEATURES.filter(f => enabled[f.id]);
    const buildSteps = [
      { label: "Laying the foundation",         icon: "🏗️" },
      { label: "Setting up your classroom",     icon: "🏫" },
      { label: "Loading the gradebook",         icon: "📊" },
      ...featureItems.map(f => ({ label: `Enabling ${f.title}`, icon: f.icon })),
      { label: "Saving your quick links",       icon: "🔗" },
      { label: "Connecting to Google Classroom", icon: "🎓" },
      { label: "Everything's ready",            icon: "✅" },
    ];
    let idx = 0;
    const id = setInterval(() => {
      // Capture item value immediately — don't let the updater close over `idx`
      // because React may run the updater after `idx` has already incremented.
      const item = buildSteps[idx];
      if (!item) return;
      setBuildItems(prev => [...prev, item]);
      setBuildProgress(Math.round(((idx + 1) / buildSteps.length) * 100));
      idx++;
      if (idx >= buildSteps.length) {
        clearInterval(id);
        // Persist all settings
        if (apiKey.trim()) updateTeacherProfile({ commonCurriculumApiKey: apiKey.trim() });
        try { localStorage.setItem("gmen-quick-links-v1", JSON.stringify(links)); } catch {}
        try { localStorage.setItem(`gmen-features-${userEmail}-v1`, JSON.stringify(enabled)); } catch {}
        markSetupDone(userEmail);
        setTimeout(() => setStep("launch"), 700);
      }
    }, 360);
    return () => clearInterval(id);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "rgba(3,2,1,0.88)", backdropFilter: "blur(8px)" }}>
      <div style={{ width: "100%", maxWidth: 640, background: "linear-gradient(160deg, #111008 0%, #080808 100%)", border: "1px solid rgba(245,192,37,0.2)", borderRadius: 20, boxShadow: "0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(245,192,37,0.05) inset", overflow: "hidden", position: "relative" }}>

        {/* Header bar */}
        <div style={{ background: "linear-gradient(90deg, rgba(245,192,37,0.1) 0%, transparent 100%)", borderBottom: "1px solid rgba(245,192,37,0.1)", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(245,192,37,0.14)", border: "1px solid rgba(245,192,37,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>🎓</div>
            <div>
              <div style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.12em", color: "rgba(245,192,37,0.6)", textTransform: "uppercase" }}>Classroom Setup</div>
              <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                {step === "building" ? "Building…" : step === "launch" ? "Complete!" : `Step ${stepIdx + 1} of ${FLOW.length}`}
              </div>
            </div>
          </div>
          {!["building", "launch"].includes(step) && (
            <button onClick={skip} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.22)", cursor: "pointer", fontSize: "0.72rem", padding: "2px 8px", borderRadius: 4 }}>
              Skip Setup →
            </button>
          )}
        </div>

        {/* Progress bar */}
        {FLOW.includes(step) && (
          <div style={{ height: 2, background: "rgba(255,255,255,0.05)" }}>
            <div style={{ height: "100%", width: `${((stepIdx + 1) / FLOW.length) * 100}%`, background: "linear-gradient(90deg, #F5C025, #e8b020)", transition: "width 0.4s ease", boxShadow: "0 0 8px rgba(245,192,37,0.5)" }} />
          </div>
        )}

        {/* Step content */}
        {step === "welcome"    && <WelcomeStep teacherName={teacherProfile?.name} onNext={() => setStep("features")} />}
        {step === "features"   && <FeaturesStep enabled={enabled} onToggle={id => setEnabled(p => ({ ...p, [id]: !p[id] }))} onNext={() => setStep("gcsync")} onBack={() => setStep("welcome")} />}
        {step === "gcsync"     && <GCSyncStep onNext={() => setStep("quicklinks")} onBack={() => setStep("features")} />}
        {step === "quicklinks" && <QuickLinksStep links={links} newLabel={newLabel} newUrl={newUrl} setNewLabel={setNewLabel} setNewUrl={setNewUrl} onAdd={addLink} onRemove={id => setLinks(p => p.filter(l => l.id !== id))} onNext={() => setStep("curriculum")} onBack={() => setStep("gcsync")} />}
        {step === "curriculum" && <CurriculumStep apiKey={apiKey} setApiKey={setApiKey} onNext={() => setStep("building")} onBack={() => setStep("quicklinks")} />}
        {step === "building"   && <BuildingStep progress={buildProgress} items={buildItems} />}
        {step === "launch"     && <LaunchStep teacherName={teacherProfile?.name} onDone={onComplete} />}

        {/* Step dots */}
        {FLOW.includes(step) && (
          <div style={{ display: "flex", justifyContent: "center", gap: 5, paddingBottom: 16 }}>
            {FLOW.map((s, i) => (
              <div key={s} style={{ width: s === step ? 20 : 6, height: 6, borderRadius: 3, background: s === step ? "#F5C025" : i < stepIdx ? "rgba(245,192,37,0.35)" : "rgba(255,255,255,0.1)", transition: "all 0.3s" }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
