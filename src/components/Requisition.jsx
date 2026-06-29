import { useState, useRef } from "react";
import { GOLD } from "../constants.js";
import { useRequisitions } from "../supabase.js";
import { openGmailCompose } from "../email.js";

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function blankItem() { return { id: uid(), url: "", budget: "", description: "", qty: 1, unitPrice: "" }; }
function blankVendor() { return { id: uid(), vendor: "", shipping: "", items: [blankItem()], quotes: [] }; }

function lineTotal(item) { return (Number(item.qty) || 0) * (Number(item.unitPrice) || 0); }
function vendorSubtotal(v) { return v.items.reduce((s, i) => s + lineTotal(i), 0); }
function vendorTotal(v) { return vendorSubtotal(v) + (Number(v.shipping) || 0); }
function grandTotal(cart) { return cart.reduce((s, v) => s + vendorTotal(v), 0); }
function fmt$(n) { return n.toLocaleString("en-US", { style: "currency", currency: "USD" }); }

function buildReqEmail(cart, user) {
  const date = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  const subject = `[REQUISITION REQUEST] ${user?.name || "Staff"} · ${date}`;
  const lines = [
    `REQUISITION REQUEST — James A. Garfield High School`,
    ``,
    `Requested by: ${user?.name || "Staff"}${user?.email ? ` (${user.email})` : ""}`,
    `Date: ${date}`,
    ``,
  ];
  cart.forEach((v, vi) => {
    lines.push(`VENDOR ${vi + 1}: ${v.vendor || "(unnamed)"} — ${fmt$(vendorTotal(v))}`);
    v.items.forEach((item, ii) => {
      lines.push(`  ${ii + 1}. ${item.description || "(no description)"}${item.url ? ` [${item.url}]` : ""}`);
      lines.push(`     Qty ${item.qty} × ${item.unitPrice ? fmt$(Number(item.unitPrice)) : "$0.00"} = ${fmt$(lineTotal(item))}${item.budget ? ` · Budget ${item.budget}` : ""}`);
    });
    if (Number(v.shipping)) lines.push(`  Shipping: ${fmt$(Number(v.shipping))}`);
    if (v.quotes?.length) lines.push(`  Quotes to attach: ${v.quotes.map(q => q.name).join(", ")}`);
    lines.push(``);
  });
  lines.push(`GRAND TOTAL — ALL VENDORS: ${fmt$(grandTotal(cart))}`);
  lines.push(``);
  lines.push(`Note: if there are quote files, please attach them to this email before sending.`);
  lines.push(``);
  lines.push(`— Sent from the JAG Staff Portal`);
  return { subject, body: lines.join("\n") };
}

function ReqPreview({ cart, user, onClose, onSubmit }) {
  const date = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem 1rem" }}>
      <div className="card card-raised" style={{ width: "100%", maxWidth: 760, position: "relative" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: "#000", borderRadius: "10px 10px 0 0", padding: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", margin: "-1.25rem -1.25rem 1.25rem" }}>
          <div className="flex items-center gap2">
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#000" }}>G</div>
            <div style={{ color: "#fff" }}>
              <div style={{ fontWeight: 900, letterSpacing: "0.05em" }}>JAMES A. GARFIELD / HIGH SCHOOL</div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)" }}>REQUISITION REQUEST</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{user?.name} — Science Department</div>
            <div className="text-muted">To: Building Secretary</div>
            <div className="text-muted">Date: {date}</div>
          </div>
          <span className="tag tag-amber">PENDING APPROVAL</span>
        </div>

        {cart.map((v, vi) => (
          <div key={v.id} style={{ marginBottom: "1.5rem" }}>
            <div style={{ background: "#000", color: GOLD, fontWeight: 800, padding: "0.5rem 0.75rem", borderRadius: "6px 6px 0 0", display: "flex", justifyContent: "space-between" }}>
              <span>VENDOR {vi + 1} — {v.vendor || "(unnamed)"}</span>
              <span>{fmt$(vendorTotal(v))}</span>
            </div>
            <table className="stu-table" style={{ border: "1px solid rgba(200,200,200,0.3)", borderTop: "none" }}>
              <thead><tr><th>#</th><th>Description / URL</th><th>Budget</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
              <tbody>
                {v.items.map((item, ii) => (
                  <tr key={item.id}>
                    <td className="text-muted">{ii + 1}</td>
                    <td><div style={{ fontWeight: 600 }}>{item.description || "—"}</div>{item.url && <div className="text-muted" style={{ fontSize: "0.72rem", wordBreak: "break-all" }}>{item.url}</div>}</td>
                    <td>{item.budget || "—"}</td>
                    <td>{item.qty}</td>
                    <td>{item.unitPrice ? fmt$(Number(item.unitPrice)) : "—"}</td>
                    <td style={{ fontWeight: 700, color: GOLD }}>{fmt$(lineTotal(item))}</td>
                  </tr>
                ))}
                <tr style={{ background: "rgba(245,192,37,0.05)" }}>
                  <td colSpan={5} style={{ textAlign: "right", fontWeight: 600 }}>Subtotal / Shipping</td>
                  <td>{fmt$(vendorSubtotal(v))} + {fmt$(Number(v.shipping) || 0)}</td>
                </tr>
              </tbody>
            </table>
            {v.quotes.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                <div className="section-title">📎 Attached Quotes ({v.quotes.length})</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {v.quotes.map(q => <span key={q.id} className="quote-chip">📎 {q.name} ({(q.size/1024).toFixed(1)} KB)</span>)}
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="gold-glow-box" style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div className="text-muted" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>GRAND TOTAL — ALL VENDORS</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: GOLD }}>{fmt$(grandTotal(cart))}</div>
        </div>

        <div style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: "7px", padding: "0.6rem 0.9rem", marginBottom: "1.25rem", fontSize: "0.8rem", color: "#2563eb" }}>
          <strong>Email subject:</strong> [REQUISITION REQUEST] {user?.name} — Science Department · {date}
        </div>

        <div className="flex justify-between">
          <button className="btn btn-ghost" onClick={onClose}>← Edit Request</button>
          <button className="btn btn-primary" onClick={onSubmit}>Send to Secretary →</button>
        </div>
      </div>
    </div>
  );
}

export default function Requisition({ user }) {
  const { requisitions, addRequisition } = useRequisitions(user?.email);
  const [cart, setCart] = useState([blankVendor()]);
  const [showPreview, setShowPreview] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRefs = useRef({});

  function setVendorField(vid, field, val) {
    setCart(c => c.map(v => v.id === vid ? { ...v, [field]: val } : v));
  }
  function setItemField(vid, iid, field, val) {
    setCart(c => c.map(v => v.id === vid ? { ...v, items: v.items.map(i => i.id === iid ? { ...i, [field]: val } : i) } : v));
  }
  function addVendor() { setCart(c => [...c, blankVendor()]); }
  function removeVendor(vid) { setCart(c => c.filter(v => v.id !== vid)); }
  function addItem(vid) { setCart(c => c.map(v => v.id === vid ? { ...v, items: [...v.items, blankItem()] } : v)); }
  function removeItem(vid, iid) { setCart(c => c.map(v => v.id === vid ? { ...v, items: v.items.filter(i => i.id !== iid) } : v)); }

  function addQuotes(vid, files) {
    const newQ = Array.from(files).map(f => ({ id: uid(), name: f.name, size: f.size, type: f.type, file: f }));
    setCart(c => c.map(v => v.id === vid ? { ...v, quotes: [...v.quotes, ...newQ] } : v));
  }
  function removeQuote(vid, qid) { setCart(c => c.map(v => v.id === vid ? { ...v, quotes: v.quotes.filter(q => q.id !== qid) } : v)); }

  const total = grandTotal(cart);
  const itemCount = cart.reduce((s, v) => s + v.items.length, 0);

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <div style={{ fontSize: "3rem" }}>✅</div>
      <h2 style={{ marginTop: "1rem", fontWeight: 800 }}>REQUISITION SAVED</h2>
      <p className="text-muted mt1">
        A Gmail compose window opened with the request pre-filled.<br />
        Add the recipient, attach any quote files, and hit send.
      </p>
      <button className="btn btn-primary mt2" onClick={() => { setCart([blankVendor()]); setSubmitted(false); }}>New Request</button>
    </div>
  );

  return (
    <div>
      {showPreview && (
        <ReqPreview
          cart={cart} user={user}
          onClose={() => setShowPreview(false)}
          onSubmit={() => {
            addRequisition({ cart, total });
            // Recipient left blank — the teacher adds who it goes to in Gmail.
            openGmailCompose(buildReqEmail(cart, user));
            setShowPreview(false);
            setSubmitted(true);
          }}
        />
      )}

      <div className="flex items-center justify-between mb2">
        <h2 style={{ fontWeight: 800, fontSize: "1.1rem" }}>Purchase Order Request</h2>
        <div className="flex items-center gap2">
          <span className="tag tag-gold">{cart.length} vendor{cart.length !== 1 ? "s" : ""}</span>
          <span className="tag tag-gold">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
          <span style={{ fontWeight: 800, color: GOLD, fontSize: "1.1rem" }}>{fmt$(total)}</span>
        </div>
      </div>

      {cart.map((v, vi) => (
        <div key={v.id} className="card mb2">
          <div style={{ background: GOLD, borderRadius: "7px", padding: "0.6rem 0.85rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="flex items-center gap2">
              <span style={{ fontWeight: 800, color: "#000" }}>VENDOR {vi + 1}</span>
              <input value={v.vendor} onChange={e => setVendorField(v.id, "vendor", e.target.value)} placeholder="Vendor name" style={{ background: "rgba(0,0,0,0.1)", border: "none", width: 200, fontWeight: 600 }} />
            </div>
            <div className="flex items-center gap1">
              <span style={{ fontWeight: 800, color: "#000" }}>{fmt$(vendorTotal(v))}</span>
              {cart.length > 1 && <button className="btn btn-sm" style={{ background: "rgba(220,38,38,0.2)", color: "#dc2626", border: "none" }} onClick={() => removeVendor(v.id)}>✕</button>}
            </div>
          </div>

          {v.items.map((item, ii) => (
            <div key={item.id} style={{ border: "1px solid rgba(200,200,200,0.3)", borderRadius: "8px", padding: "0.85rem", marginBottom: "0.75rem" }}>
              <div className="flex items-center justify-between mb1">
                <span style={{ fontWeight: 700, fontSize: "0.8rem" }}>Line Item {ii + 1}</span>
                <div className="flex items-center gap1">
                  <span className="tag tag-gold">{fmt$(lineTotal(item))}</span>
                  {v.items.length > 1 && <button className="btn btn-danger btn-sm" onClick={() => removeItem(v.id, item.id)}>✕</button>}
                </div>
              </div>
              <div className="grid2 mb1">
                <div><label>Item URL / Catalog #</label><input value={item.url} onChange={e => setItemField(v.id, item.id, "url", e.target.value)} placeholder="https://…" /></div>
                <div><label>Budget Account Line</label><input value={item.budget} onChange={e => setItemField(v.id, item.id, "budget", e.target.value)} placeholder="e.g. 001-2240 Lab Supplies" /></div>
              </div>
              <div className="mb1"><label>Description</label><textarea rows={2} value={item.description} onChange={e => setItemField(v.id, item.id, "description", e.target.value)} placeholder="Item description…" /></div>
              <div className="grid2">
                <div><label>Quantity</label><input type="number" min={1} value={item.qty} onChange={e => setItemField(v.id, item.id, "qty", e.target.value)} /></div>
                <div><label>Unit Price ($)</label><input type="number" min={0} step="0.01" value={item.unitPrice} onChange={e => setItemField(v.id, item.id, "unitPrice", e.target.value)} /></div>
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-ghost w-full mb2" style={{ justifyContent: "center", borderStyle: "dashed" }} onClick={() => addItem(v.id)}>+ Add Line Item</button>

          {/* Quote attachments */}
          <div>
            <div className="section-title">📎 Quote Attachments ({v.quotes.length})</div>
            {v.quotes.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
                {v.quotes.map(q => (
                  <span key={q.id} className="quote-chip">
                    {q.type?.startsWith("image/") ? "🖼" : q.type === "application/pdf" ? "📄" : "📎"} {q.name} <span className="text-muted">({(q.size/1024).toFixed(1)}KB)</span>
                    <button onClick={() => removeQuote(v.id, q.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", marginLeft: "0.2rem" }}>✕</button>
                  </span>
                ))}
              </div>
            )}
            <div
              className="drop-zone"
              style={{ padding: "1rem" }}
              onClick={() => fileRefs.current[v.id]?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); addQuotes(v.id, e.dataTransfer.files); }}
            >
              Drop quotes here or click to attach <span className="text-muted">(PDF, images, Office docs)</span>
            </div>
            <input
              type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx"
              style={{ display: "none" }}
              ref={el => fileRefs.current[v.id] = el}
              onChange={e => addQuotes(v.id, e.target.files)}
            />
          </div>
        </div>
      ))}

      <button type="button" className="btn btn-ghost w-full mb2" style={{ justifyContent: "center", borderStyle: "dashed" }} onClick={addVendor}>+ Add Another Vendor</button>

      <div className="gold-glow-box flex items-center justify-between">
        <div>
          <div className="text-muted" style={{ fontSize: "0.75rem" }}>GRAND TOTAL — ALL VENDORS</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: GOLD }}>{fmt$(total)}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowPreview(true)}>Preview &amp; Review →</button>
      </div>

      {requisitions.length > 0 && (
        <div className="card mt2">
          <div className="section-title">My Recent Requisitions</div>
          {requisitions.map(r => {
            const d = r.created_at ? new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
            const vendorCount = Array.isArray(r.cart) ? r.cart.length : 0;
            return (
              <div key={r.id} className="flex items-center justify-between" style={{ padding: "0.55rem 0", borderBottom: "1px solid rgba(200,200,200,0.2)" }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{fmt$(Number(r.total) || 0)}</span>
                  <span className="text-muted" style={{ marginLeft: "0.5rem" }}>{vendorCount} vendor{vendorCount !== 1 ? "s" : ""}</span>
                </div>
                <span className="text-muted">{d}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
