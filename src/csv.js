// Lightweight CSV helpers — no dependencies.

// Serialize a 2D array of rows into a CSV string (RFC-4180 quoting).
export function toCSV(rows) {
  const esc = v => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map(r => r.map(esc).join(",")).join("\r\n");
}

// Parse CSV/TSV text → { headers, rows } with auto delimiter detection.
// (Same approach as the StudentRoster importer.)
export function parseCSV(text) {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (!clean) return { headers: [], rows: [] };
  const firstLine = clean.split("\n")[0];
  const delim = [",", "\t", "|", ";"].sort((a, b) =>
    (firstLine.split(b).length) - (firstLine.split(a).length))[0];

  const parseLine = line => {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === delim) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };

  const lines = clean.split("\n").filter(l => l.length);
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

// Trigger a browser download of `text` as `filename`.
export function downloadCSV(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
