// Cmd/Ctrl+K command palette — jump to any tab or sub-tab without a mouse.
// New, self-contained component: it only reads a `commands` list handed to
// it and calls each command's own `run()`, so it carries zero risk to any
// existing screen — nothing here reaches into another component's state.
import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";

export default function CommandPalette({ open, onClose, commands }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.keywords?.some(k => k.toLowerCase().includes(q))
    );
  }, [query, commands]);

  // Grouped for display; flatIndex still walks the whole filtered list in
  // order, so arrow-key navigation moves naturally across group boundaries.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const c of filtered) {
      const key = c.section || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    return [...map.entries()];
  }, [filtered]);

  useEffect(() => {
    if (open) { setQuery(""); setActiveIndex(0); }
  }, [open]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[activeIndex];
        if (cmd) { onClose(); cmd.run(); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIndex, onClose]);

  // Keep the highlighted row in view once the list scrolls past the fold.
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  let i = -1;
  return createPortal(
    <div className="cmdk-overlay" onMouseDown={onClose}>
      <div className="cmdk-panel" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cmdk-input-row">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="cmdk-input"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search commands"
          />
          <kbd className="kbd">Esc</kbd>
        </div>

        <div className="cmdk-list" ref={listRef}>
          {filtered.length === 0 && <div className="cmdk-empty">No matches</div>}
          {grouped.map(([section, items]) => (
            <div key={section || "_"} className="cmdk-group">
              {section && <div className="cmdk-group-label">{section}</div>}
              {items.map(cmd => {
                i++;
                const idx = i;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    data-idx={idx}
                    className={`cmdk-item${idx === activeIndex ? " is-active" : ""}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => { onClose(); cmd.run(); }}
                  >
                    {cmd.icon && <span className="cmdk-item-icon">{cmd.icon}</span>}
                    <span className="cmdk-item-label">{cmd.label}</span>
                    {cmd.hint && <span className="cmdk-item-hint">{cmd.hint}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="cmdk-footer">
          <span><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> Navigate</span>
          <span><kbd className="kbd">Enter</kbd> Select</span>
          <span><kbd className="kbd">Esc</kbd> Close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
