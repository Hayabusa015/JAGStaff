import { useState, useRef } from "react";
import { GOLD } from "../constants.js";
import { useCeu, useCeuOpportunities } from "../supabase.js";

const TOTAL_HOURS = 180;
const TOTAL_CREDITS = 6;
const REIMB_MAX = 1500;

const PRICE_COLORS = {
  "FREE": { bg: "rgba(74,222,128,0.12)", color: "#4ade80", border: "rgba(74,222,128,0.3)" },
  "default": { bg: "rgba(245,192,37,0.12)", color: GOLD, border: "rgba(245,192,37,0.3)" },
};

function PriceBadge({ text }) {
  const isFree = text?.toUpperCase().startsWith("FREE");
  const c = isFree ? PRICE_COLORS.FREE : PRICE_COLORS.default;
  return (
    <span style={{
      fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.05em",
      padding: "0.2rem 0.6rem", borderRadius: 999,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>{text || "Varies"}</span>
  );
}

function OpportunityCard({ opp, onRemove, isOwner }) {
  const isLink = opp.type === "link";
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: "1rem 1.1rem",
      display: "flex", flexDirection: "column", gap: "0.45rem",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, fontWeight: 700, fontSize: "0.92rem", color: "#fff" }}>{opp.title}</div>
        {opp.price_text && <PriceBadge text={opp.price_text} />}
        {opp.hours && (
          <span style={{
            fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 999,
            background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)",
            whiteSpace: "nowrap",
          }}>{opp.hours} hrs</span>
        )}
      </div>
      {opp.description && (
        <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>
          {opp.description}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.1rem", flexWrap: "wrap" }}>
        {isLink && opp.url && (
          <a
            href={opp.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.35rem",
              background: GOLD, color: "#000", fontWeight: 700,
              fontSize: "0.8rem", borderRadius: 8, padding: "0.35rem 0.85rem",
              textDecoration: "none", transition: "opacity 0.15s",
            }}
            onMouseOver={e => e.currentTarget.style.opacity = "0.85"}
            onMouseOut={e => e.currentTarget.style.opacity = "1"}
          >
            Visit Site →
          </a>
        )}
        {!isLink && opp.file_url && (
          <a
            href={opp.file_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.35rem",
              background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)",
              fontWeight: 600, fontSize: "0.8rem", borderRadius: 8, padding: "0.35rem 0.85rem",
              textDecoration: "none", border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            📄 {opp.file_name || "View Flyer"}
          </a>
        )}
        {isOwner && opp.created_by !== "system" && (
          <button
            onClick={() => onRemove(opp.id)}
            style={{
              marginLeft: "auto", background: "transparent", border: "none",
              color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: "0.85rem",
              padding: "0.2rem 0.4rem", borderRadius: 6,
              transition: "color 0.15s",
            }}
            onMouseOver={e => e.currentTarget.style.color = "#ef4444"}
            onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}
            title="Remove"
          >✕</button>
        )}
      </div>
    </div>
  );
}

function AddOpportunityForm({ onAdd, uploadFlyer }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("link");
  const [form, setForm] = useState({ title: "", description: "", price_text: "", url: "", hours: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef();

  function reset() {
    setForm({ title: "", description: "", price_text: "", url: "", hours: "" });
    setFile(null); setErr(""); setType("link");
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setErr("Title is required."); return; }
    if (type === "link" && !form.url.trim()) { setErr("URL is required for external links."); return; }
    setSaving(true); setErr("");
    let fileUrl = null, fileName = null;
    if (type === "local" && file) {
      const result = await uploadFlyer(file);
      if (result) { fileUrl = result.url; fileName = result.name; }
    }
    await onAdd({
      type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      price_text: form.price_text.trim() || null,
      url: type === "link" ? form.url.trim() : null,
      hours: form.hours ? Number(form.hours) : null,
      file_url: fileUrl,
      file_name: fileName,
      sort_order: 100,
    });
    reset(); setOpen(false); setSaving(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(245,192,37,0.08)", border: `1px dashed rgba(245,192,37,0.35)`,
          color: GOLD, fontWeight: 700, fontSize: "0.82rem",
          borderRadius: 10, padding: "0.6rem 1rem",
          cursor: "pointer", width: "100%", justifyContent: "center",
          transition: "background 0.15s",
        }}
        onMouseOver={e => e.currentTarget.style.background = "rgba(245,192,37,0.13)"}
        onMouseOut={e => e.currentTarget.style.background = "rgba(245,192,37,0.08)"}
      >
        + Add Opportunity
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,192,37,0.2)",
        borderRadius: 12, padding: "1.1rem",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "0.88rem", color: GOLD, marginBottom: "0.85rem" }}>
        Add New Opportunity
      </div>

      {/* Type toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: "0.85rem" }}>
        {[["link", "External Link"], ["local", "School / Local"]].map(([v, label]) => (
          <button
            key={v} type="button" onClick={() => setType(v)}
            style={{
              flex: 1, padding: "0.4rem", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem",
              border: type === v ? `1.5px solid ${GOLD}` : "1px solid rgba(255,255,255,0.12)",
              background: type === v ? "rgba(245,192,37,0.12)" : "transparent",
              color: type === v ? GOLD : "rgba(255,255,255,0.5)", cursor: "pointer",
            }}
          >{label}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div>
          <label style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>
            Title *
          </label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder={type === "link" ? "e.g. Happy Teacher PD" : "e.g. Book Study: The Power of Protocols"}
            required
          />
        </div>
        <div>
          <label style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>
            Description
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Brief description of the opportunity..."
            rows={2}
            style={{ resize: "vertical" }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>
              Price / Cost
            </label>
            <input
              value={form.price_text}
              onChange={e => setForm(f => ({ ...f, price_text: e.target.value }))}
              placeholder={type === "local" ? "FREE" : "$90 / credit"}
            />
          </div>
          <div style={{ width: 110 }}>
            <label style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>
              Hours (optional)
            </label>
            <input
              type="number" min="0.5" step="0.5"
              value={form.hours}
              onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
              placeholder="e.g. 15"
            />
          </div>
        </div>
        {type === "link" ? (
          <div>
            <label style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>
              URL *
            </label>
            <input
              type="url"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://..."
              required
            />
          </div>
        ) : (
          <div>
            <label style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>
              Flyer / Attachment (PDF, image)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "0.4rem 0.85rem",
                  cursor: "pointer", fontSize: "0.82rem", fontWeight: 600,
                }}
              >📎 Choose File</button>
              <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
                {file ? file.name : "No file chosen"}
              </span>
              <input
                ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                style={{ display: "none" }}
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
        )}
      </div>

      {err && <p style={{ color: "#f87171", fontSize: "0.8rem", marginTop: "0.6rem" }}>{err}</p>}

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem" }}>
        <button
          type="submit" disabled={saving}
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: "center", opacity: saving ? 0.6 : 1 }}
        >{saving ? "Saving…" : "Add Opportunity"}</button>
        <button
          type="button"
          onClick={() => { reset(); setOpen(false); }}
          className="btn"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
        >Cancel</button>
      </div>
    </form>
  );
}

export default function CeuTracker({ user }) {
  const { entries: history, reimb, addEntry, removeEntry, addReimb: addReimbEntry, removeReimb } = useCeu(user?.email);
  const { opportunities, addOpportunity, removeOpportunity, uploadFlyer } = useCeuOpportunities(user?.email);
  const [newCeu, setNewCeu] = useState({ name: "", hours: "" });
  const [expiry] = useState("2026-06-30");
  const [reimbForm, setReimbForm] = useState({ name: "", cost: "" });
  const [reimbErr, setReimbErr] = useState("");
  const [oppSearch, setOppSearch] = useState("");
  const [oppTab, setOppTab] = useState("all"); // all | link | local

  const totalHours = history.reduce((s, c) => s + Number(c.hours), 0);
  const pct = Math.min(100, Math.round((totalHours / TOTAL_HOURS) * 100));
  const credits = (totalHours / 30).toFixed(1);
  const totalReimb = reimb.reduce((s, r) => s + Number(r.cost), 0);
  const daysLeft = Math.max(0, Math.round((new Date(expiry) - new Date()) / 86400000));

  function addHours(e) {
    e.preventDefault();
    if (!newCeu.name.trim() || !newCeu.hours || Number(newCeu.hours) <= 0) return;
    addEntry({ name: newCeu.name.trim(), hours: Number(newCeu.hours) });
    setNewCeu({ name: "", hours: "" });
  }

  function addReimb(e) {
    e.preventDefault();
    const cost = Number(reimbForm.cost);
    if (!reimbForm.name.trim() || cost <= 0) { setReimbErr("Course name and valid cost required."); return; }
    if (totalReimb + cost > REIMB_MAX) { setReimbErr(`Exceeds $${REIMB_MAX} limit.`); return; }
    addReimbEntry({ name: reimbForm.name.trim(), cost });
    setReimbForm({ name: "", cost: "" });
    setReimbErr("");
  }

  const reimbPct = Math.min(100, Math.round((totalReimb / REIMB_MAX) * 100));

  const filteredOpps = opportunities.filter(o => {
    const matchesTab = oppTab === "all" || o.type === oppTab;
    const q = oppSearch.toLowerCase();
    const matchesSearch = !q || o.title.toLowerCase().includes(q) || (o.description || "").toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const linkCount = opportunities.filter(o => o.type === "link").length;
  const localCount = opportunities.filter(o => o.type === "local").length;

  return (
    <div>
      <div className="flex items-center justify-between mb2">
        <h2 style={{ fontWeight: 800, fontSize: "1.1rem" }}>CEU Tracker &amp; License Renewal</h2>
      </div>

      {/* Progress */}
      <div className="card mb2">
        <div className="section-title">License Renewal Progress</div>
        <div className="flex items-center justify-between mb1">
          <span style={{ fontWeight: 700, fontSize: "1.5rem", color: GOLD }}>{totalHours} <span style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)" }}>/ {TOTAL_HOURS} hours</span></span>
          <span style={{ fontWeight: 700 }}>{pct}% complete</span>
        </div>
        <div className="progress-track mb1">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-muted">{credits} / {TOTAL_CREDITS} credits earned</div>
      </div>

      {/* Stats */}
      <div className="grid3 mb2">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="stat-num" style={{ color: daysLeft < 30 ? "#dc2626" : GOLD }}>{daysLeft}</div>
          <div className="stat-label">Days Until Expiry</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="stat-num">{Math.max(0, TOTAL_HOURS - totalHours)}</div>
          <div className="stat-label">Hours Remaining</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="stat-num" style={{ color: GOLD }}>${(REIMB_MAX - totalReimb).toFixed(0)}</div>
          <div className="stat-label">Tuition Reimb. Left</div>
        </div>
      </div>

      <div className="grid2 mb2">
        {/* Log Hours */}
        <div className="card">
          <div className="section-title">Log CEU Hours</div>
          <form onSubmit={addHours}>
            <div className="mb1">
              <label>Course / Activity Name</label>
              <input value={newCeu.name} onChange={e => setNewCeu(f => ({ ...f, name: e.target.value }))} placeholder="e.g. ODE Reading Module" />
            </div>
            <div className="mb1">
              <label>Hours Earned</label>
              <input type="number" min="0.5" step="0.5" value={newCeu.hours} onChange={e => setNewCeu(f => ({ ...f, hours: e.target.value }))} placeholder="e.g. 15" />
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: "center" }}>Log CEU Hours</button>
          </form>
        </div>

        {/* Tuition Reimbursement */}
        <div className="card">
          <div className="section-title">Tuition Reimbursement</div>
          <div className="flex items-center justify-between mb1">
            <span className="text-muted">${totalReimb.toFixed(2)} of ${REIMB_MAX}</span>
            <span style={{ fontWeight: 700 }}>{reimbPct}%</span>
          </div>
          <div className="progress-track mb2">
            <div className="progress-fill" style={{ width: `${reimbPct}%`, background: totalReimb >= REIMB_MAX ? "#dc2626" : GOLD }} />
          </div>
          <form onSubmit={addReimb}>
            <div className="mb1">
              <label>Course Name</label>
              <input value={reimbForm.name} onChange={e => setReimbForm(f => ({ ...f, name: e.target.value }))} placeholder="Course name" />
            </div>
            <div className="mb1">
              <label>Cost ($)</label>
              <input type="number" min="1" step="0.01" value={reimbForm.cost} onChange={e => setReimbForm(f => ({ ...f, cost: e.target.value }))} placeholder="0.00" />
            </div>
            {reimbErr && <p className="text-red mb1" style={{ fontSize: "0.8rem" }}>{reimbErr}</p>}
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: "center" }}>Add Expense</button>
          </form>
        </div>
      </div>

      {/* CEU History */}
      <div className="card mb2">
        <div className="section-title">CEU History</div>
        {history.length === 0 && <p className="text-muted">No entries yet.</p>}
        <table className="stu-table">
          <thead>
            <tr><th>Course / Activity</th><th>Hours</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {history.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td><span className="tag tag-gold">{c.hours} hrs</span></td>
                <td className="text-muted">{c.date}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-danger btn-sm" onClick={() => removeEntry(c.id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reimbursement expenses */}
      {reimb.length > 0 && (
        <div className="card mb2">
          <div className="section-title">Reimbursement Expenses</div>
          <table className="stu-table">
            <thead>
              <tr><th>Course</th><th>Cost</th><th></th></tr>
            </thead>
            <tbody>
              {reimb.map(r => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td><span className="tag tag-green">${Number(r.cost).toFixed(2)}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-danger btn-sm" onClick={() => removeReimb(r.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CEU Opportunities Board ─────────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div className="section-title" style={{ marginBottom: 0 }}>CEU Opportunities</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
              Ohio-approved courses, free resources &amp; school-based PD · always confirm LPDC approval before enrolling
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
          <input
            value={oppSearch}
            onChange={e => setOppSearch(e.target.value)}
            placeholder="Search opportunities…"
            style={{ flex: 1, minWidth: 160 }}
          />
          {[["all", `All (${opportunities.length})`], ["link", `Online (${linkCount})`], ["local", `School (${localCount})`]].map(([v, label]) => (
            <button
              key={v} onClick={() => setOppTab(v)}
              style={{
                padding: "0.35rem 0.85rem", borderRadius: 999, fontWeight: 700, fontSize: "0.75rem",
                border: oppTab === v ? `1.5px solid ${GOLD}` : "1px solid rgba(255,255,255,0.12)",
                background: oppTab === v ? "rgba(245,192,37,0.12)" : "transparent",
                color: oppTab === v ? GOLD : "rgba(255,255,255,0.5)", cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >{label}</button>
          ))}
        </div>

        {/* Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "0.85rem" }}>
          {filteredOpps.length === 0 && (
            <div style={{ textAlign: "center", padding: "1.5rem", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
              {oppSearch ? "No matches found." : "No opportunities yet — add one below."}
            </div>
          )}
          {filteredOpps.map(opp => (
            <OpportunityCard
              key={opp.id}
              opp={opp}
              onRemove={removeOpportunity}
              isOwner={true}
            />
          ))}
        </div>

        {/* Add form */}
        <AddOpportunityForm onAdd={addOpportunity} uploadFlyer={uploadFlyer} />
      </div>
    </div>
  );
}
