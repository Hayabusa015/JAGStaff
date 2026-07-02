import { Component } from "react";
import { GOLD } from "../constants.js";

// Catches render errors in a tab so one broken view doesn't white-screen the
// whole portal. `resetKey` (e.g. the active tab) clears the error when the
// user navigates elsewhere.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: "0.9rem", padding: "4rem 2rem",
        textAlign: "center",
      }}>
        <div style={{
          fontSize: "0.85rem", fontWeight: 800, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#f87171",
        }}>
          Something went wrong
        </div>
        <p style={{ maxWidth: 420, fontSize: "0.82rem", lineHeight: 1.6, color: "rgba(255,255,255,0.45)" }}>
          {this.state.error?.message || "An unexpected error occurred."} Try
          reloading — if it keeps happening, switch tabs and come back.
        </p>
        <button
          className="btn btn-sm"
          style={{ background: GOLD, color: "#000", fontWeight: 700 }}
          onClick={() => window.location.reload()}
        >
          Reload Portal
        </button>
      </div>
    );
  }
}

// Suspense fallback shown while a lazy-loaded tab chunk downloads.
export function TabLoading() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: "0.75rem", padding: "4rem 2rem",
      color: GOLD, fontWeight: 800, letterSpacing: "0.15em", fontSize: "0.75rem",
    }}>
      <span className="tab-loading-spinner" aria-hidden="true" />
      LOADING…
    </div>
  );
}
