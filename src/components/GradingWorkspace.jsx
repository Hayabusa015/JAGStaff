import { useState, useRef } from "react";
import { GOLD } from "../constants.js";

const BORDER = "rgba(245,192,37,0.2)";
const CARD_BG = "rgba(255,255,255,0.04)";

// Load PDF.js lazily to avoid blocking initial render
let pdfjsLib = null;
async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  return pdfjsLib;
}

async function fileToImages(file) {
  if (file.type === "application/pdf") {
    const lib = await getPdfjs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    const images = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      images.push(canvas.toDataURL("image/png").split(",")[1]);
    }
    return images;
  } else {
    // Image file
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve([e.target.result.split(",")[1]]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

async function gradeSubmission(apiKey, images, rubric, maxPoints, assignmentName) {
  const content = [
    ...images.map(b64 => ({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: b64 },
    })),
    {
      type: "text",
      text: `Grade this student submission for the assignment: "${assignmentName}".\n\nRubric:\n${rubric}\n\nMax points: ${maxPoints}\n\nRespond with ONLY a JSON object in this exact format (no markdown, no explanation):\n{"score": <number>, "feedback": "<one paragraph of constructive feedback>", "criteria_met": ["<criterion>", ...], "criteria_missed": ["<criterion>", ...]}`,
    },
  ];

  const res = await fetch("/api/anthropic/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content[0].text.trim();
  // Strip possible markdown code block
  const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(clean);
}

function saveToHistory(entry) {
  try {
    const raw = localStorage.getItem("ai_grader_history");
    const history = raw ? JSON.parse(raw) : [];
    history.unshift(entry);
    localStorage.setItem("ai_grader_history", JSON.stringify(history.slice(0, 10)));
  } catch {}
}

function loadHistory() {
  try {
    const raw = localStorage.getItem("ai_grader_history");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function exportCSV(assignmentName, results) {
  const rows = [["Filename", "Score", "Max", "Feedback", "Criteria Met", "Criteria Missed"]];
  for (const r of results) {
    if (r.status !== "done") continue;
    rows.push([
      r.file.name,
      r.result?.score ?? "",
      r.maxPoints,
      (r.result?.feedback || "").replace(/"/g, '""'),
      (r.result?.criteria_met || []).join("; "),
      (r.result?.criteria_missed || []).join("; "),
    ]);
  }
  const csv = rows.map(row => row.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${assignmentName || "grades"}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StatusChip({ status }) {
  const map = {
    queued:   { label: "Queued",   color: "rgba(240,234,216,0.3)" },
    grading:  { label: "Grading…", color: GOLD },
    done:     { label: "Done",     color: "#4caf50" },
    error:    { label: "Error",    color: "#ff6b6b" },
  };
  const s = map[status] || map.queued;
  return (
    <span style={{
      fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.5rem",
      borderRadius: 20, border: `1px solid ${s.color}`, color: s.color,
      letterSpacing: "0.05em", textTransform: "uppercase",
    }}>
      {s.label}
    </span>
  );
}

function GradeTab({ apiKey, onKeyInvalid }) {
  const [assignmentName, setAssignmentName] = useState("");
  const [rubric, setRubric] = useState("");
  const [maxPoints, setMaxPoints] = useState("100");
  const [items, setItems] = useState([]);
  const [grading, setGrading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const fileInputRef = useRef();

  function addFiles(files) {
    const newItems = Array.from(files)
      .filter(f => f.type === "application/pdf" || f.type.startsWith("image/"))
      .map(f => ({ id: Math.random().toString(36).slice(2), file: f, status: "queued", result: null, error: null, maxPoints: parseInt(maxPoints) || 100 }));
    setItems(prev => [...prev, ...newItems]);
  }

  function onDrop(e) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }

  async function gradeAll() {
    if (!assignmentName.trim() || !rubric.trim()) return;
    setGrading(true);
    const pts = parseInt(maxPoints) || 100;

    // Process sequentially
    const updatedItems = [...items];
    for (let i = 0; i < updatedItems.length; i++) {
      if (updatedItems[i].status === "done") continue;
      updatedItems[i] = { ...updatedItems[i], status: "grading", maxPoints: pts };
      setItems([...updatedItems]);

      try {
        const images = await fileToImages(updatedItems[i].file);
        const result = await gradeSubmission(apiKey, images, rubric, pts, assignmentName);
        updatedItems[i] = { ...updatedItems[i], status: "done", result };
      } catch (e) {
        if (e.message?.includes("401") || e.message?.includes("invalid_api_key")) {
          onKeyInvalid();
          setGrading(false);
          return;
        }
        updatedItems[i] = { ...updatedItems[i], status: "error", error: e.message };
      }
      setItems([...updatedItems]);
    }

    // Save to history
    const doneItems = updatedItems.filter(it => it.status === "done");
    if (doneItems.length > 0) {
      saveToHistory({
        date: new Date().toISOString(),
        assignmentName,
        rubric,
        maxPoints: pts,
        results: doneItems.map(it => ({
          filename: it.file.name,
          score: it.result?.score,
          feedback: it.result?.feedback,
        })),
      });
    }

    setGrading(false);
  }

  const doneCount = items.filter(it => it.status === "done").length;

  return (
    <div>
      {/* Config row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.75rem", marginBottom: "1rem", alignItems: "end" }}>
        <div>
          <label style={{ fontSize: "0.7rem", color: "rgba(240,234,216,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Assignment Name</label>
          <input
            value={assignmentName}
            onChange={e => setAssignmentName(e.target.value)}
            placeholder="Essay Draft 1"
            style={{ display: "block", width: "100%", marginTop: "0.3rem", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "0.5rem 0.7rem", color: "rgba(240,234,216,0.9)", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ fontSize: "0.7rem", color: "rgba(240,234,216,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Max Points</label>
          <input
            type="number" value={maxPoints} min="1"
            onChange={e => setMaxPoints(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: "0.3rem", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "0.5rem 0.7rem", color: "rgba(240,234,216,0.9)", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <button
          onClick={() => { setItems([]); setExpanded({}); }}
          style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "0.5rem 0.75rem", color: "rgba(240,234,216,0.4)", fontSize: "0.75rem", cursor: "pointer" }}
        >
          Clear
        </button>
      </div>

      {/* Rubric */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.7rem", color: "rgba(240,234,216,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Grading Rubric</label>
        <textarea
          value={rubric}
          onChange={e => setRubric(e.target.value)}
          placeholder={"1 pt — Thesis clearly stated\n2 pts — 3+ pieces of evidence\n2 pts — Analysis connects evidence to claim\n3 pts — Organization and transitions\n2 pts — Grammar and conventions"}
          rows={5}
          style={{ display: "block", width: "100%", marginTop: "0.3rem", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "0.6rem 0.8rem", color: "rgba(240,234,216,0.85)", fontSize: "0.82rem", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }}
        />
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop} onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${BORDER}`, borderRadius: 10,
          padding: "1.5rem", textAlign: "center", cursor: "pointer",
          color: "rgba(240,234,216,0.35)", fontSize: "0.82rem", marginBottom: "1rem",
          transition: "border-color 0.15s",
        }}
      >
        Drop PDFs or images here, or click to browse
        <input ref={fileInputRef} type="file" multiple accept=".pdf,image/*" style={{ display: "none" }} onChange={e => addFiles(e.target.files)} />
      </div>

      {/* File list */}
      {items.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          {items.map(item => (
            <div key={item.id} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: "0.5rem", overflow: "hidden" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.85rem", cursor: item.status === "done" ? "pointer" : "default" }}
                onClick={() => item.status === "done" && setExpanded(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
              >
                <span style={{ flex: 1, fontSize: "0.82rem", color: "rgba(240,234,216,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.file.name}</span>
                {item.status === "done" && (
                  <span style={{ fontWeight: 800, color: GOLD, fontSize: "0.9rem" }}>
                    {item.result?.score}/{item.maxPoints}
                  </span>
                )}
                <StatusChip status={item.status} />
                {item.status === "done" && (
                  <span style={{ color: "rgba(240,234,216,0.3)", fontSize: "0.75rem" }}>{expanded[item.id] ? "▲" : "▼"}</span>
                )}
              </div>

              {item.status === "error" && (
                <div style={{ padding: "0 0.85rem 0.65rem", fontSize: "0.75rem", color: "#ff6b6b" }}>{item.error}</div>
              )}

              {item.status === "done" && expanded[item.id] && (
                <div style={{ padding: "0 0.85rem 0.85rem", borderTop: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: "0.82rem", color: "rgba(240,234,216,0.8)", lineHeight: 1.6, marginTop: "0.6rem" }}>{item.result.feedback}</p>
                  {item.result.criteria_met?.length > 0 && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <span style={{ fontSize: "0.7rem", color: "#4caf50", fontWeight: 700 }}>MET: </span>
                      <span style={{ fontSize: "0.75rem", color: "rgba(240,234,216,0.55)" }}>{item.result.criteria_met.join(" · ")}</span>
                    </div>
                  )}
                  {item.result.criteria_missed?.length > 0 && (
                    <div style={{ marginTop: "0.25rem" }}>
                      <span style={{ fontSize: "0.7rem", color: "#ff6b6b", fontWeight: 700 }}>MISSED: </span>
                      <span style={{ fontSize: "0.75rem", color: "rgba(240,234,216,0.55)" }}>{item.result.criteria_missed.join(" · ")}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          onClick={gradeAll}
          disabled={grading || items.length === 0 || !assignmentName.trim() || !rubric.trim()}
          style={{
            background: GOLD, color: "#000", fontWeight: 700,
            border: "none", borderRadius: 8, padding: "0.6rem 1.25rem",
            fontSize: "0.85rem", cursor: "pointer",
            opacity: (grading || items.length === 0 || !assignmentName.trim() || !rubric.trim()) ? 0.5 : 1,
          }}
        >
          {grading ? "Grading…" : `Grade All (${items.length})`}
        </button>

        {doneCount > 0 && (
          <button
            onClick={() => exportCSV(assignmentName, items)}
            style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0.6rem 1.1rem", color: "rgba(240,234,216,0.7)", fontSize: "0.82rem", cursor: "pointer" }}
          >
            Export CSV ({doneCount})
          </button>
        )}
      </div>
    </div>
  );
}

function HistoryTab() {
  const [history, setHistory] = useState(() => loadHistory());
  const [expanded, setExpanded] = useState({});

  function clearHistory() {
    localStorage.removeItem("ai_grader_history");
    setHistory([]);
  }

  if (history.length === 0) {
    return <div style={{ color: "rgba(240,234,216,0.3)", fontSize: "0.85rem", padding: "2rem 0" }}>No grading history yet.</div>;
  }

  return (
    <div>
      {history.map((entry, i) => (
        <div key={i} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: "0.6rem", overflow: "hidden" }}>
          <div
            onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.85rem", cursor: "pointer" }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.85rem", color: "rgba(240,234,216,0.85)", fontWeight: 600 }}>{entry.assignmentName}</div>
              <div style={{ fontSize: "0.72rem", color: "rgba(240,234,216,0.35)" }}>{new Date(entry.date).toLocaleString()} · {entry.results.length} submissions · {entry.maxPoints} pts max</div>
            </div>
            <span style={{ color: "rgba(240,234,216,0.3)", fontSize: "0.75rem" }}>{expanded[i] ? "▲" : "▼"}</span>
          </div>
          {expanded[i] && (
            <div style={{ borderTop: `1px solid ${BORDER}`, padding: "0.5rem 0.85rem 0.85rem" }}>
              {entry.results.map((r, j) => (
                <div key={j} style={{ display: "flex", gap: "0.75rem", alignItems: "baseline", padding: "0.3rem 0", borderBottom: j < entry.results.length - 1 ? `1px solid rgba(245,192,37,0.08)` : "none" }}>
                  <span style={{ flex: 1, fontSize: "0.78rem", color: "rgba(240,234,216,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.filename}</span>
                  <span style={{ fontWeight: 700, color: GOLD, fontSize: "0.82rem", flexShrink: 0 }}>{r.score}/{entry.maxPoints}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <button
        onClick={clearHistory}
        style={{ marginTop: "0.5rem", background: "none", border: `1px solid rgba(255,100,100,0.25)`, borderRadius: 7, padding: "0.45rem 0.9rem", color: "rgba(255,100,100,0.6)", fontSize: "0.75rem", cursor: "pointer" }}
      >
        Clear History
      </button>
    </div>
  );
}

export default function GradingWorkspace({ apiKey, user, onClearKey }) {
  const [subTab, setSubTab] = useState("grade");

  const subTabs = [
    { key: "grade",   label: "Grade" },
    { key: "history", label: "History" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: GOLD }}>AI Grader</div>
          <div style={{ fontSize: "0.72rem", color: "rgba(240,234,216,0.35)" }}>Powered by claude-sonnet-4-6 · your key · charges to your Anthropic account</div>
        </div>
        <button
          onClick={onClearKey}
          style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "0.35rem 0.75rem", color: "rgba(240,234,216,0.4)", fontSize: "0.72rem", cursor: "pointer" }}
        >
          Change Key
        </button>
      </div>

      {/* Sub-tab bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: "1.25rem", borderBottom: "1px solid var(--gold-border)" }}>
        {subTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            style={{
              padding: "0.55rem 1.1rem", fontSize: "0.75rem", fontWeight: 600,
              background: "none", border: "none",
              borderBottom: subTab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
              color: subTab === t.key ? "var(--gold)" : "var(--text-muted)",
              cursor: "pointer", letterSpacing: "0.04em", textTransform: "uppercase", transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "grade"   && <GradeTab apiKey={apiKey} onKeyInvalid={onClearKey} />}
      {subTab === "history" && <HistoryTab />}
    </div>
  );
}
