import Emblem3D from "./Emblem3D.jsx";
import { ALLOWED_DOMAIN } from "../constants.js";
import "./login-screen.css";

/** The production login retains the existing OAuth callback and readiness gate. */
export default function LoginScreen({ signInWithGoogle, loading, error, configured }) {
  return (
    <div className="portal-entry">
      <header className="entry-header">
        <div className="entry-brand"><img src="/gg-emblem.svg" alt="Garfield GG" /><span>JAG Portal</span></div>
        <span className="entry-school">James A. Garfield</span>
      </header>
      <main className="entry-main">
        <section className="entry-copy" aria-labelledby="entry-title">
          <h1 id="entry-title">Your school day.<br />Connected.</h1>
          <p className="entry-description">One place for Garfield students and staff.</p>
          {error && <div className="entry-error" role="alert">{error}</div>}
          {configured ? (
            <button className="entry-signin" onClick={signInWithGoogle} disabled={loading}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.4 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.9 6.1C12.6 13 17.9 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.8-2.1 5.1-4.4 6.7l6.9 5.4c4-3.7 6.2-9.2 6.2-16.1z"/>
                <path fill="#FBBC05" d="M10.7 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.4 13.3A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.2-6z"/>
                <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-6.9-5.4c-2.1 1.4-4.8 2.3-8.3 2.3-6.1 0-11.4-4-13.3-9.4l-8.2 6.1C6.6 42.5 14.7 48 24 48z"/>
              </svg>
              <span>{loading ? "Signing in…" : "Sign in with School Google Account"}</span>
            </button>
          ) : (
            <div className="entry-error" role="status">
              <strong>Supabase not configured.</strong><br />
              Copy <code>.env.example</code> to <code>.env.local</code>, add your
              project URL + anon key, then restart the dev server.
            </div>
          )}
          <p className="entry-help">Use your <strong>@{ALLOWED_DOMAIN}</strong> school Google account.<br />Sessions expire after 7 hours of inactivity.</p>
        </section>
        <Emblem3D />
      </main>
      <footer className="entry-footer"><span>Powered by <strong>G-Men Command</strong></span><span>Garfield. Connected.</span></footer>
    </div>
  );
}
