import { useState } from "react";
import { GOLD } from "../constants.js";

const BG = "#0d0d0d";
const BORDER = "rgba(245,192,37,0.25)";

export default function AnthropicGatekeeper({ onKeyValid, existingKey }) {
  const [key, setKey] = useState(existingKey || "");
  const [status, setStatus] = useState("idle"); // idle | validating | error
  const [errorMsg, setErrorMsg] = useState("");

  async function validate() {
    const trimmed = key.trim();
    if (!trimmed) return;
    setStatus("validating");
    setErrorMsg("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": trimmed,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-allow-browser": "true",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });
      if (res.ok || res.status === 400) {
        // 400 means the request was understood (key valid), just malformed prompt
        localStorage.setItem("anthropic_api_key", trimmed);
        onKeyValid(trimmed);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.error?.message || `Invalid key (status ${res.status})`);
        setStatus("error");
      }
    } catch (e) {
      setErrorMsg("Network error — check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <div style={{
      minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: BG, border: `1px solid ${BORDER}`,
        borderRadius: 14, padding: "2rem 2.25rem", width: "min(480px, 94vw)",
        boxShadow: "0 4px 40px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: GOLD, marginBottom: "0.4rem" }}>
          AI Grader
        </div>
        <div style={{ fontSize: "0.8rem", color: "rgba(240,234,216,0.55)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
          Enter your Anthropic API key to use AI grading. Your key is stored only in this browser —
          it is <strong style={{ color: "rgba(240,234,216,0.8)" }}>never</strong> sent to JAGStaff servers.
        </div>

        <label style={{ fontSize: "0.72rem", color: "rgba(240,234,216,0.5)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Anthropic API Key
        </label>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === "Enter" && validate()}
          placeholder="sk-ant-…"
          style={{
            display: "block", width: "100%", marginTop: "0.4rem", marginBottom: "0.85rem",
            background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: "0.6rem 0.8rem",
            color: "rgba(240,234,216,0.9)", fontSize: "0.85rem",
            fontFamily: "monospace", outline: "none", boxSizing: "border-box",
          }}
        />

        {errorMsg && (
          <div style={{ color: "#ff6b6b", fontSize: "0.78rem", marginBottom: "0.85rem", lineHeight: 1.4 }}>
            {errorMsg}
          </div>
        )}

        <button
          onClick={validate}
          disabled={!key.trim() || status === "validating"}
          style={{
            width: "100%", padding: "0.65rem",
            background: status === "validating" ? "rgba(245,192,37,0.4)" : GOLD,
            color: "#000", fontWeight: 700, fontSize: "0.85rem",
            border: "none", borderRadius: 8, cursor: "pointer",
            opacity: !key.trim() ? 0.5 : 1,
          }}
        >
          {status === "validating" ? "Validating…" : "Validate & Save"}
        </button>

        <div style={{ marginTop: "1.25rem", fontSize: "0.72rem", color: "rgba(240,234,216,0.35)", lineHeight: 1.5 }}>
          Get a key at <span style={{ color: GOLD }}>console.anthropic.com</span>. Usage is billed to your account at Anthropic rates.
        </div>

        {existingKey && (
          <button
            onClick={() => { localStorage.removeItem("anthropic_api_key"); onKeyValid(null); }}
            style={{
              marginTop: "1rem", background: "none", border: "none",
              color: "rgba(240,234,216,0.35)", fontSize: "0.72rem",
              cursor: "pointer", textDecoration: "underline", padding: 0,
            }}
          >
            Remove saved key
          </button>
        )}
      </div>
    </div>
  );
}
