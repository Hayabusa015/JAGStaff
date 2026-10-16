import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { ALLOWED_DOMAIN } from "../constants.js";
import "./login-screen.css";

// Sign-in is school Google accounts only (no passwords to store or protect).
// The card has two faces: "Welcome Back" (sign in) and "First Time Here"
// (what students / new staff / parents should do). Switching dissolves the
// content, shows the empty glass with the emblem, then builds the other face.

const SWAP_OUT_MS = 220;   // content fades out
const SWAP_HOLD_MS = 380;  // empty glass + emblem

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.4 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.9 6.1C12.6 13 17.9 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.8-2.1 5.1-4.4 6.7l6.9 5.4c4-3.7 6.2-9.2 6.2-16.1z"/>
      <path fill="#FBBC05" d="M10.7 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.4 13.3A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.2-6z"/>
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-6.9-5.4c-2.1 1.4-4.8 2.3-8.3 2.3-6.1 0-11.4-4-13.3-9.4l-8.2 6.1C6.6 42.5 14.7 48 24 48z"/>
    </svg>
  );
}

const Icon = {
  mail: <path d="M4 6h16v12H4z M4 7l8 6 8-6" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3" /></>,
  cal: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
};
function Glyph({ name }) {
  return (
    <svg className="lg-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {Icon[name]}
    </svg>
  );
}

// Decorative gold-and-black ribbons, drawn rather than photographed so they
// stay crisp at any size and can drift slowly.
function Ribbons() {
  return (
    <svg className="lg-ribbons" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="lgBand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#050506" />
          <stop offset=".42" stopColor="#1d1813" />
          <stop offset=".56" stopColor="#6b4a10" />
          <stop offset=".6" stopColor="#c8901c" />
          <stop offset=".64" stopColor="#4a3410" />
          <stop offset=".78" stopColor="#0d0c0b" />
          <stop offset="1" stopColor="#050506" />
        </linearGradient>
        <linearGradient id="lgBand2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060607" />
          <stop offset=".5" stopColor="#2a2a2e" />
          <stop offset=".58" stopColor="#5a5a60" />
          <stop offset=".66" stopColor="#141416" />
          <stop offset="1" stopColor="#060607" />
        </linearGradient>
        <linearGradient id="lgGold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f5c025" stopOpacity="0" />
          <stop offset=".35" stopColor="#ffd25a" />
          <stop offset=".7" stopColor="#c8860a" />
          <stop offset="1" stopColor="#f5c025" stopOpacity="0" />
        </linearGradient>
        <filter id="lgGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="lgSoft"><feGaussianBlur stdDeviation="2" /></filter>
      </defs>
      <rect width="1600" height="1000" fill="#050506" />
      <g className="lg-drift-a">
        <path d="M-200 180 C 300 40, 700 520, 1800 260" stroke="url(#lgBand)" strokeWidth="260" fill="none" />
        <path d="M-200 820 C 400 980, 900 380, 1800 640" stroke="url(#lgBand2)" strokeWidth="300" fill="none" />
        <path d="M-100 1080 C 300 700, 600 760, 900 1100" stroke="url(#lgBand2)" strokeWidth="200" fill="none" opacity=".8" />
        <path d="M-200 470 C 400 330, 900 760, 1800 470" stroke="url(#lgBand)" strokeWidth="140" fill="none" opacity=".7" />
      </g>
      <g className="lg-drift-b">
        <path d="M-150 120 C 350 -20, 760 470, 1750 200" stroke="url(#lgGold)" strokeWidth="10" fill="none" filter="url(#lgGlow)" opacity=".75" />
        <path d="M-150 120 C 350 -20, 760 470, 1750 200" stroke="url(#lgGold)" strokeWidth="2.2" fill="none" />
        <path d="M-150 300 C 420 150, 820 640, 1750 380" stroke="url(#lgGold)" strokeWidth="1.4" fill="none" opacity=".55" filter="url(#lgSoft)" />
        <path d="M200 1050 C 700 640, 1100 760, 1750 520" stroke="url(#lgGold)" strokeWidth="8" fill="none" filter="url(#lgGlow)" opacity=".55" />
        <path d="M200 1050 C 700 640, 1100 760, 1750 520" stroke="url(#lgGold)" strokeWidth="1.8" fill="none" />
        <path d="M-100 700 C 300 620, 500 900, 820 1080" stroke="#f5c025" strokeWidth="1" fill="none" opacity=".3" />
      </g>
    </svg>
  );
}

export default function LoginScreen({ signInWithGoogle, loading, error, configured }) {
  const [mode, setMode] = useState("signin");   // "signin" | "start"
  const [phase, setPhase] = useState("in");     // "in" | "out" | "empty"
  const contentRef = useRef(null);
  const [height, setHeight] = useState(null);
  const timers = useRef([]);
  const cardRef = useRef(null);

  // The card's height follows its content, so the swap animates smoothly.
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    setHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function swap(next) {
    if (next === mode || phase !== "in") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setMode(next); return; }
    setPhase("out");
    timers.current.push(setTimeout(() => { setPhase("empty"); setMode(next); }, SWAP_OUT_MS));
    timers.current.push(setTimeout(() => setPhase("in"), SWAP_OUT_MS + SWAP_HOLD_MS));
  }

  // Soft highlight that follows the pointer across the glass.
  function onPointerMove(e) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  const signInButton = (label) => configured ? (
    <button className="lg-primary" onClick={signInWithGoogle} disabled={loading}>
      <span className="lg-g"><GoogleMark /></span>
      <span>{loading ? "Signing in…" : label}</span>
      <span aria-hidden="true">→</span>
    </button>
  ) : (
    <div className="lg-error" role="status">
      <strong>Supabase not configured.</strong> Copy <code>.env.example</code> to <code>.env.local</code>,
      add your project URL + anon key, then restart the dev server.
    </div>
  );

  return (
    <div className="lg-screen">
      <Ribbons />
      <div className="lg-vignette" aria-hidden="true" />

      <header className="lg-header">
        <div className="lg-brand"><img src="/gg-emblem.svg" alt="" /><span>JAG Portal</span></div>
        <span className="lg-school">James A. Garfield</span>
      </header>

      <main className="lg-main">
        <div className="lg-card-wrap">
          <span className="lg-tab lg-tab-tl" aria-hidden="true" />
          <span className="lg-tab lg-tab-br" aria-hidden="true" />
          <section
            ref={cardRef}
            className={`lg-card lg-phase-${phase}`}
            onPointerMove={onPointerMove}
            aria-live="polite"
          >
            <div className="lg-card-inner" style={height ? { height } : undefined}>
              <div className="lg-emblem" aria-hidden="true"><img src="/gg-emblem.svg" alt="" /></div>

              <div ref={contentRef} className="lg-content">
                {mode === "signin" ? (
                  <>
                    <h1 className="lg-title">Welcome <span>Back</span></h1>
                    <p className="lg-sub">Sign in with your school account to open your portal.</p>
                    {error && <div className="lg-error" role="alert">{error}</div>}

                    <div className="lg-label">School account</div>
                    <div className="lg-field"><Glyph name="mail" /><span>you@{ALLOWED_DOMAIN}</span></div>
                    <div className="lg-label">Security</div>
                    <div className="lg-field"><Glyph name="lock" /><span>Google checks your password. JAG Portal never sees it.</span></div>

                    {signInButton("Sign in with Google")}

                    <p className="lg-fine">Sessions sign out after 7 hours of inactivity.</p>
                    <p className="lg-switch">First time here? <button type="button" onClick={() => swap("start")}>Get started</button></p>
                  </>
                ) : (
                  <>
                    <h1 className="lg-title">First Time <span>Here</span></h1>
                    <p className="lg-sub">Everyone signs in the same way, with their @{ALLOWED_DOMAIN} Google account.</p>
                    {error && <div className="lg-error" role="alert">{error}</div>}

                    <div className="lg-steps">
                      <div className="lg-field lg-step"><Glyph name="user" />
                        <span><strong>Students</strong> sign in and go straight to their classes.</span></div>
                      <div className="lg-field lg-step"><Glyph name="key" />
                        <span><strong>New staff</strong> sign in, choose “I'm Staff”, and enter the passcode from the office.</span></div>
                      <a className="lg-field lg-step lg-link" href="/conferences"><Glyph name="cal" />
                        <span><strong>Parents</strong> don't need an account. Book a conference here →</span></a>
                    </div>

                    {signInButton("Continue with Google")}

                    <p className="lg-switch">Already set up? <button type="button" onClick={() => swap("signin")}>Sign in</button></p>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="lg-footer"><span>Powered by <strong>G-Men Command</strong></span><span>Garfield. Connected.</span></footer>
    </div>
  );
}
