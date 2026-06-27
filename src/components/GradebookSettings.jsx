import { useState } from "react";
import { GOLD } from "../constants.js";
import { PRESET_PROFILES, DEFAULT_SCALE, DEFAULT_PERIOD_WEIGHTS } from "../gradebook.js";

const CAT_COLORS = ["#ef4444","#f59e0b","#60a5fa","#8b5cf6","#22c55e","#f97316","#ec4899","#14b8a6"];

export default function GradebookSettings({ profiles, settings, saveProfile, setActiveProfile, deleteProfile, saveSettings }) {
  const [editingProfile, setEditingProfile] = useState(null);
  const [scaleEdit, setScaleEdit] = useState(false);
  const [scaleDraft, setScaleDraft] = useState(null);
  const [weightsDraft, setWeightsDraft] = useState(null);

  const scale = settings?.grading_scale || DEFAULT_SCALE;
  const periodWeights = settings?.period_weights || DEFAULT_PERIOD_WEIGHTS;

  // ── Profile editor ───────────────────────────────────────────────────────
  function openNewProfile(preset) {
    setEditingProfile({
      id: null,
      name: preset?.name || "Custom",
      categories: preset?.categories.map((c, i) => ({ ...c, _key: i })) || [
        { name: "Tests", weight: 70, color: "#ef4444", drop_lowest: 0, _key: 0 }
      ],
    });
  }

  function catSum(cats) { return cats.reduce((s, c) => s + (Number(c.weight) || 0), 0); }

  function updateCat(idx, key, val) {
    setEditingProfile(ep => ({
      ...ep,
      categories: ep.categories.map((c, i) => i === idx ? { ...c, [key]: val } : c),
    }));
  }

  async function saveProfileEdit() {
    const clean = {
      ...(editingProfile.id ? { id: editingProfile.id } : {}),
      name: editingProfile.name,
      categories: editingProfile.categories.map(({ _key, ...rest }) => ({ ...rest, weight: Number(rest.weight) })),
      // First profile a teacher creates becomes active automatically so the
      // gradebook is usable immediately.
      is_active: editingProfile.id ? (profiles.find(p => p.id === editingProfile.id)?.is_active || false) : profiles.length === 0,
    };
    await saveProfile(clean);
    setEditingProfile(null);
  }

  const sum = editingProfile ? catSum(editingProfile.categories) : 0;

  // ── Grading Scale editor ─────────────────────────────────────────────────
  function startScaleEdit() { setScaleDraft(scale.map(s => ({ ...s }))); setScaleEdit(true); }
  async function saveScale() {
    await saveSettings({ grading_scale: scaleDraft.map(s => ({ letter: s.letter, min: Number(s.min) })) });
    setScaleEdit(false); setScaleDraft(null);
  }

  // ── Period weights editor ────────────────────────────────────────────────
  const wKeys = [1, 2, 3, 4, "midterm", "final"];
  const wLabels = { 1: "Period 1", 2: "Period 2", 3: "Period 3", 4: "Period 4", midterm: "Midterm", final: "Final" };
  const wDraft = weightsDraft || periodWeights;
  const wSum = wKeys.reduce((s, k) => s + (Number(wDraft[k]) || 0), 0);

  async function saveWeights() {
    await saveSettings({ period_weights: Object.fromEntries(wKeys.map(k => [k, Number(wDraft[k]) || 0])) });
    setWeightsDraft(null);
  }

  const inp = {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6, padding: "0.35rem 0.6rem", color: "#fff", fontSize: "0.82rem", outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── Weight Profiles ──────────────────────────────────────────────── */}
      <div className="card">
        <div className="section-title">Grade Weight Profiles</div>
        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "1rem" }}>
          Choose a preset or create a custom profile. The active profile determines how category scores are weighted.
        </div>

        {/* Preset quick-start cards */}
        {profiles.length === 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>Start with a preset</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.6rem" }}>
              {PRESET_PROFILES.map(p => (
                <button key={p.name} onClick={() => { openNewProfile(p); }} style={{
                  background: "rgba(245,192,37,0.06)", border: `1px solid rgba(245,192,37,0.25)`,
                  borderRadius: 8, padding: "0.7rem 0.9rem", cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{ fontWeight: 700, color: GOLD, fontSize: "0.85rem", marginBottom: "0.35rem" }}>{p.name}</div>
                  {p.categories.map(c => (
                    <div key={c.name} style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
                      <span style={{ color: c.color }}>■</span> {c.name} {c.weight}%
                    </div>
                  ))}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saved profiles */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {profiles.map(p => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem",
              background: p.is_active ? "rgba(245,192,37,0.07)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${p.is_active ? "rgba(245,192,37,0.35)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 8,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{p.name}</span>
                  {p.is_active && <span style={{ background: GOLD, color: "#000", borderRadius: 4, padding: "0.05rem 0.4rem", fontSize: "0.65rem", fontWeight: 800 }}>ACTIVE</span>}
                </div>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  {p.categories.map(c => (
                    <span key={c.name} style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
                      <span style={{ color: c.color }}>■</span> {c.name} {c.weight}%
                      {c.drop_lowest > 0 && <span style={{ color: "#60a5fa" }}> (drop {c.drop_lowest})</span>}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {!p.is_active && <button onClick={() => setActiveProfile(p.id)} style={{ ...inp, cursor: "pointer", background: "rgba(245,192,37,0.1)", color: GOLD, border: `1px solid rgba(245,192,37,0.3)` }}>Set Active</button>}
                <button onClick={() => setEditingProfile({ ...p, categories: p.categories.map((c, i) => ({ ...c, _key: i })) })} style={{ ...inp, cursor: "pointer" }}>Edit</button>
                {profiles.length > 1 && !p.is_active && <button onClick={() => deleteProfile(p.id)} style={{ ...inp, cursor: "pointer", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>✕</button>}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => openNewProfile(null)} style={{ marginTop: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.82rem" }}>
          + Create Custom Profile
        </button>
      </div>

      {/* ── Profile editor modal-in-card ─────────────────────────────────── */}
      {editingProfile && (
        <div className="card" style={{ border: `1px solid ${GOLD}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div className="section-title" style={{ marginBottom: 0 }}>{editingProfile.id ? "Edit Profile" : "New Profile"}</div>
            <button onClick={() => setEditingProfile(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1rem" }}>✕</button>
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3 }}>Profile Name</label>
            <input value={editingProfile.name} onChange={e => setEditingProfile(ep => ({ ...ep, name: e.target.value }))} style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {editingProfile.categories.map((cat, idx) => (
              <div key={cat._key} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <input value={cat.name} onChange={e => updateCat(idx, "name", e.target.value)} placeholder="Category" style={{ ...inp, flex: "1 1 120px" }} />
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <input type="number" min={0} max={100} value={cat.weight} onChange={e => updateCat(idx, "weight", e.target.value)} style={{ ...inp, width: 64 }} />
                  <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>%</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Drop lowest</span>
                  <input type="number" min={0} max={5} value={cat.drop_lowest || 0} onChange={e => updateCat(idx, "drop_lowest", Number(e.target.value))} style={{ ...inp, width: 48 }} />
                </div>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  {CAT_COLORS.map(c => (
                    <button key={c} onClick={() => updateCat(idx, "color", c)} style={{ width: 16, height: 16, borderRadius: "50%", background: c, border: cat.color === c ? "2px solid #fff" : "2px solid transparent", cursor: "pointer", padding: 0 }} />
                  ))}
                </div>
                <button onClick={() => setEditingProfile(ep => ({ ...ep, categories: ep.categories.filter((_, i) => i !== idx) }))} style={{ ...inp, color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", padding: "0.25rem 0.5rem" }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <button onClick={() => setEditingProfile(ep => ({ ...ep, categories: [...ep.categories, { name: "", weight: 0, color: CAT_COLORS[ep.categories.length % CAT_COLORS.length], drop_lowest: 0, _key: Date.now() }] }))} style={{ ...inp, cursor: "pointer" }}>+ Add Category</button>
            <span style={{ fontSize: "0.82rem", color: sum === 100 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
              Total: {sum}% {sum !== 100 && "(must equal 100%)"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
            <button onClick={() => setEditingProfile(null)} style={{ ...inp, cursor: "pointer" }}>Cancel</button>
            <button onClick={saveProfileEdit} disabled={sum !== 100 || !editingProfile.name} style={{ background: sum === 100 ? GOLD : "rgba(255,255,255,0.1)", border: "none", color: sum === 100 ? "#000" : "rgba(255,255,255,0.3)", borderRadius: 6, padding: "0.4rem 1.25rem", cursor: sum === 100 ? "pointer" : "not-allowed", fontWeight: 700 }}>Save Profile</button>
          </div>
        </div>
      )}

      {/* ── Grading Scale ────────────────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Grading Scale</div>
          {!scaleEdit && <button onClick={startScaleEdit} style={{ ...inp, cursor: "pointer", color: GOLD, border: `1px solid rgba(245,192,37,0.3)` }}>Edit</button>}
        </div>
        {!scaleEdit ? (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {scale.map(s => (
              <div key={s.letter} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "0.4rem 0.75rem", textAlign: "center", minWidth: 56 }}>
                <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{s.letter}</div>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)" }}>≥ {s.min}%</div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {scaleDraft.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <input value={s.letter} onChange={e => setScaleDraft(d => d.map((x, j) => j === i ? { ...x, letter: e.target.value } : x))} style={{ ...inp, width: 44 }} />
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>≥</span>
                  <input type="number" min={0} max={100} value={s.min} onChange={e => setScaleDraft(d => d.map((x, j) => j === i ? { ...x, min: e.target.value } : x))} style={{ ...inp, width: 52 }} />
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>%</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button onClick={() => { setScaleEdit(false); setScaleDraft(null); }} style={{ ...inp, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveScale} style={{ background: GOLD, border: "none", color: "#000", fontWeight: 700, borderRadius: 6, padding: "0.4rem 1.25rem", cursor: "pointer" }}>Save Scale</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Semester / Period Weights ─────────────────────────────────────── */}
      <div className="card">
        <div className="section-title">Semester Grade Weights</div>
        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "1rem" }}>
          How each grading period, midterm, and final count toward the semester grade. Must total 100%.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.6rem", marginBottom: "0.75rem" }}>
          {wKeys.map(k => (
            <div key={k}>
              <label style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.07em" }}>{wLabels[k]}</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <input type="number" min={0} max={100} value={wDraft[k] || 0}
                  onChange={e => setWeightsDraft(d => ({ ...(d || periodWeights), [k]: e.target.value }))}
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>%</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.82rem", color: wSum === 100 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>Total: {wSum}%</span>
          {weightsDraft && (
            <>
              <button onClick={() => setWeightsDraft(null)} style={{ ...inp, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveWeights} disabled={wSum !== 100} style={{ background: wSum === 100 ? GOLD : "rgba(255,255,255,0.1)", border: "none", color: wSum === 100 ? "#000" : "rgba(255,255,255,0.3)", fontWeight: 700, borderRadius: 6, padding: "0.4rem 1.25rem", cursor: wSum === 100 ? "pointer" : "not-allowed" }}>Save Weights</button>
            </>
          )}
        </div>
      </div>

      {/* ── Missing Work Policy ──────────────────────────────────────────── */}
      <div className="card">
        <div className="section-title">Missing Work Policy</div>
        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "1rem" }}>
          When enabled, any blank assignment past its due date counts as a zero in averages —
          so students and parents are never surprised. This is calculated automatically and
          changes nothing in your saved grades; turn it off to revert.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
          <button onClick={() => saveSettings({ auto_zero_missing: !(settings?.auto_zero_missing ?? false) })} style={{
            width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", position: "relative",
            background: (settings?.auto_zero_missing ?? false) ? GOLD : "rgba(255,255,255,0.15)", flexShrink: 0,
          }}>
            <span style={{ position: "absolute", top: 2, left: (settings?.auto_zero_missing ?? false) ? "calc(100% - 20px)" : 2, width: 18, height: 18, borderRadius: "50%", background: (settings?.auto_zero_missing ?? false) ? "#000" : "rgba(255,255,255,0.6)", transition: "left 0.2s" }} />
          </button>
          <span style={{ fontSize: "0.85rem" }}>Auto-zero past-due missing work</span>
        </div>
        {(settings?.auto_zero_missing ?? false) && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)" }}>Grace period</span>
            <input type="number" min={0} max={30} value={settings?.auto_zero_grace_days ?? 0}
              onChange={e => saveSettings({ auto_zero_grace_days: Math.max(0, Number(e.target.value) || 0) })}
              style={{ ...inp, width: 64 }} />
            <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>days after the due date</span>
          </div>
        )}

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "0.85rem", paddingTop: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem" }}>Late-work penalty</span>
          <input type="number" min={0} max={100} value={settings?.late_penalty_pct ?? 0}
            onChange={e => saveSettings({ late_penalty_pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
            style={{ ...inp, width: 64 }} />
          <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>% deducted when a grade is marked “Late”</span>
        </div>
      </div>

      {/* ── Auto-email toggles ───────────────────────────────────────────── */}
      <div className="card">
        <div className="section-title">Auto Parent Notifications</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[
            { key: "auto_email_fail", label: "Auto-email parent when student fails a test (below 60%)" },
            { key: "auto_email_drop", label: "Auto-email parent when grade drops a letter grade between grading periods" },
          ].map(({ key, label }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button onClick={() => saveSettings({ [key]: !(settings?.[key] ?? true) })} style={{
                width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", position: "relative",
                background: (settings?.[key] ?? true) ? GOLD : "rgba(255,255,255,0.15)", flexShrink: 0,
              }}>
                <span style={{ position: "absolute", top: 2, left: (settings?.[key] ?? true) ? "calc(100% - 20px)" : 2, width: 18, height: 18, borderRadius: "50%", background: (settings?.[key] ?? true) ? "#000" : "rgba(255,255,255,0.6)", transition: "left 0.2s" }} />
              </button>
              <span style={{ fontSize: "0.85rem" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
