import { useState } from "react";
import AnthropicGatekeeper from "./AnthropicGatekeeper.jsx";
import GradingWorkspace from "./GradingWorkspace.jsx";
import { getApiKey, clearApiKey } from "../apiKey.js";

export default function AIGrader({ user }) {
  const [apiKey, setApiKey] = useState(getApiKey);

  function handleKeyValid(key) {
    setApiKey(key);
  }

  function handleClearKey() {
    clearApiKey();
    setApiKey(null);
  }

  if (!apiKey) {
    return <AnthropicGatekeeper onKeyValid={handleKeyValid} existingKey={null} />;
  }

  return <GradingWorkspace apiKey={apiKey} user={user} onClearKey={handleClearKey} />;
}
