import { useState } from "react";
import AnthropicGatekeeper from "./AnthropicGatekeeper.jsx";
import GradingWorkspace from "./GradingWorkspace.jsx";

export default function AIGrader({ user }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("anthropic_api_key"));

  function handleKeyValid(key) {
    setApiKey(key);
  }

  function handleClearKey() {
    localStorage.removeItem("anthropic_api_key");
    setApiKey(null);
  }

  if (!apiKey) {
    return <AnthropicGatekeeper onKeyValid={handleKeyValid} existingKey={null} />;
  }

  return <GradingWorkspace apiKey={apiKey} user={user} onClearKey={handleClearKey} />;
}
