import { useState, useRef } from "react";
import { GOLD } from "../constants.js";
import { useRequisitions } from "../supabase.js";

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function blankItem() { return { id: uid(), url: "", budget: "", description: "", qty: 1, unitPrice: "" }; }
function blankVendor() { return { id: uid(), vendor: "", shipping: "", items: [blankItem()], quotes: [] }; }

function lineTotal(item) { return (Number(item.qty) || 0) * (Number(item.unitPrice) || 0); }
function vendorSubtotal(v) { return v.items.reduce((s, i) => s + lineTotal(i), 0); }
function vendorTotal(v) { return vendorSubtotal(v) + (Number(v.shipping) || 0); }
function grandTotal(cart) { return cart.reduce((s, v) => s + vendorTotal(v), 0); }
function fmt$(n) { return n.toLocaleString("en-US", { style: "currency", currency: "USD" }); }

// ── PDF generation — opens a new print-ready window ─────────────────────────
function generateRequisitionPDF(cart, user) {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const baseUrl = window.location.origin;

  const vendorsHtml = cart.map((v, vi) => {
    const itemRows = v.items.map((item, ii) => `
      <tr>
        <td class="ctr">${ii + 1}</td>
        <td>
          <div class="desc">${item.description || "—"}</div>
          ${item.url ? `<div class="url">${item.url}</div>` : ""}
        </td>
        <td>${item.budget || "—"}</td>
        <td class="ctr">${item.qty}</td>
        <td class="r">${item.unitPrice ? fmt$(Number(item.unitPrice)) : "—"}</td>
        <td class="r b gold">${fmt$(lineTotal(item))}</td>
      </tr>`).join("");

    const shippingRow = Number(v.shipping) ? `
      <tr class="sub"><td colspan="5" class="r">Shipping</td><td class="r">${fmt$(Number(v.shipping))}</td></tr>` : "";

    const quotesNote = v.quotes?.length
      ? `<div class="quotes-note">📎 Quotes attached: ${v.quotes.map(q => q.name).join(", ")}</div>` : "";

    return `
      <div class="vblock">
        <div class="vhead"><span>Vendor ${vi + 1} — ${v.vendor || "(unnamed)"}</span><span>${fmt$(vendorTotal(v))}</span></div>
        <table>
          <thead><tr>
            <th class="ctr" style="width:28px">#</th>
            <th>Description / Item URL</th>
            <th style="width:130px">Budget Line</th>
            <th class="ctr" style="width:44px">Qty</th>
            <th class="r" style="width:88px">Unit Price</th>
            <th class="r" style="width:88px">Line Total</th>
          </tr></thead>
          <tbody>
            ${itemRows}
            <tr class="sub"><td colspan="5" class="r">Subtotal</td><td class="r b">${fmt$(vendorSubtotal(v))}</td></tr>
            ${shippingRow}
            <tr class="vtot"><td colspan="5" class="r b">Vendor Total</td><td class="r b gold">${fmt$(vendorTotal(v))}</td></tr>
          </tbody>
        </table>
        ${quotesNote}
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Requisition — ${user?.name || "Staff"} — ${date}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:#1a1a1a;background:#fff;font-size:10.5pt;line-height:1.45}

  /* ── Letterhead ── */
  .lh{background:#111;padding:18px 32px;display:flex;align-items:center;gap:18px}
  .lh-logo{width:54px;height:54px;border-radius:50%;border:2px solid #F5C025;overflow:hidden;flex-shrink:0}
  .lh-logo img{width:100%;height:100%;object-fit:cover}
  .lh h1{font-size:14.5pt;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:#F5C025}
  .lh p{font-size:8pt;color:rgba(255,255,255,.5);letter-spacing:.14em;text-transform:uppercase;margin-top:3px}
  .gold-rule{height:4px;background:linear-gradient(90deg,#F5C025,#d4970a)}

  /* ── Page ── */
  .page{padding:26px 32px}

  /* ── Meta row ── */
  .meta{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;padding-bottom:16px;border-bottom:1.5px solid #e8e8e8}
  .meta h2{font-size:14pt;font-weight:900;color:#111;margin-bottom:5px}
  .meta p{font-size:9.5pt;color:#444;margin-top:2px}
  .badge{background:#fffbea;border:1.5px solid #F5C025;color:#8a6000;font-size:7pt;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:5px 13px;border-radius:20px;white-space:nowrap}

  /* ── Vendor block ── */
  .vblock{margin-bottom:20px}
  .vhead{background:#111;color:#F5C025;font-weight:800;font-size:9.5pt;letter-spacing:.05em;text-transform:uppercase;padding:8px 14px;border-radius:6px 6px 0 0;display:flex;justify-content:space-between}

  /* ── Table ── */
  table{width:100%;border-collapse:collapse;font-size:9pt;border:1px solid #ddd;border-top:none}
  thead th{background:#f4f4f4;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:7px 10px;text-align:left;color:#555;border-bottom:1px solid #ddd}
  tbody td{padding:7px 10px;border-bottom:1px solid #f0f0f0;vertical-align:top}
  tbody tr:last-child td{border-bottom:none}
  .desc{font-weight:600}
  .url{font-size:7pt;color:#888;margin-top:2px;word-break:break-all}
  .sub td{background:#fafafa;font-size:9pt}
  .vtot td{background:#fffbea;border-top:1.5px solid #F5C025}
  .quotes-note{font-size:8pt;color:#666;padding:6px 14px;background:#fafafa;border:1px solid #ddd;border-top:none;border-radius:0 0 4px 4px}

  /* ── Helpers ── */
  .ctr{text-align:center}
  .r{text-align:right}
  .b{font-weight:700}
  .gold{color:#8a6000}

  /* ── Grand total ── */
  .grand{background:#fffbea;border:2px solid #F5C025;border-radius:10px;padding:16px 22px;display:flex;justify-content:space-between;align-items:center;margin:24px 0}
  .grand-label{font-size:8pt;font-weight:800;color:#777;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
  .grand-amt{font-size:24pt;font-weight:900;color:#8a6000}

  /* ── Signatures ── */
  .sigs{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:30px}
  .sig{border-top:1.5px solid #333;padding-top:8px}
  .sig-name{font-size:8.5pt;font-weight:700;color:#222}
  .sig-role{font-size:7.5pt;color:#777;margin-top:1px}
  .sig-line{margin-top:32px;border-top:1px solid #aaa;font-size:7.5pt;color:#777;padding-top:4px}

  /* ── Footer ── */
  .footer{margin-top:28px;padding-top:10px;border-top:1px solid #e8e8e8;font-size:7.5pt;color:#bbb;display:flex;justify-content:space-between}

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:letter;margin:.55in}
  }
</style>
</head>
<body>

<div class="lh">
  <div class="lh-logo"><img src="${baseUrl}/logo.png" alt="JAG" /></div>
  <div>
    <h1>James A. Garfield High School</h1>
    <p>Purchase Order Request &nbsp;·&nbsp; G-Men Staff Portal</p>
  </div>
</div>
<div class="gold-rule"></div>

<div class="page">
  <div class="meta">
    <div>
      <h2>Purchase Order Request</h2>
      <p>Requested by: <strong>${user?.name || "Staff"}</strong>${user?.email ? ` &lt;${user.email}&gt;` : ""}</p>
      <p>Date: <strong>${date}</strong></p>
      <p>Submitted to: <strong>Building Secretary</strong></p>
    </div>
    <span class="badge">Pending Approval</span>
  </div>

  ${vendorsHtml}

  <div class="grand">
    <div>
      <div class="grand-label">Grand Total — All Vendors</div>
    </div>
    <div class="grand-amt">${fmt$(grandTotal(cart))}</div>
  </div>

  <div class="sigs">
    <div class="sig">
      <div class="sig-name">${user?.name || "Requesting Teacher"}</div>
      <div class="sig-role">Requesting Teacher</div>
      <div class="sig-line">Signature &amp; Date</div>
    </div>
    <div class="sig">
      <div class="sig-name">Building Principal / Administrator</div>
      <div class="sig-role">Approval</div>
      <div class="sig-line">Signature &amp; Date</div>
    </div>
  </div>

  <div class="footer">
    <span>James A. Garfield High School — G-Men Staff Portal</span>
    <span>Generated ${date}</span>
  </div>
</div>

<script>window.onload=function(){window.print();}</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=860,height=1100");
  if (win) { win.document.write(html); win.document.close(); }
}

// ── Preview modal ─────────────────────────────────────────────────────────────
function ReqPreview({ cart, user, onClose, onDownload }) {
  const date = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem 1rem" }}>
      <div className="card card-raised" style={{ width: "100%", maxWidth: 760, position: "relative" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ background: "#000", borderRadius: "10px 10px 0 0", padding: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", margin: "-1.25rem -1.25rem 1.25rem" }}>
          <div className="flex items-center gap2">
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${GOLD}`, overflow: "hidden" }}>
              <img src="/logo.png" alt="JAG" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ color: "#fff" }}>
              <div style={{ fontWeight: 900, letterSpacing: "0.05em", color: GOLD }}>JAMES A. GARFIELD HIGH SCHOOL</div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Purchase Order Request</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
        </div>

        {/* Meta */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{user?.name}</div>
            <div className="text-muted">To: Building Secretary</div>
            <div className="text-muted">Date: {date}</div>
          </div>
          <span className="tag tag-amber">PENDING APPROVAL</span>
        </div>

        {/* Vendor tables */}
        {cart.map((v, vi) => (
          <div key={v.id} style={{ marginBottom: "1.5rem" }}>
            <div style={{ background: "#000", color: GOLD, fontWeight: 800, padding: "0.5rem 0.75rem", borderRadius: "6px 6px 0 0", display: "flex", justifyContent: "space-between", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span>Vendor {vi + 1} — {v.vendor || "(unnamed)"}</span>
              <span>{fmt$(vendorTotal(v))}</span>
            </div>
            <table className="stu-table" style={{ border: "1px solid rgba(200,200,200,0.15)", borderTop: "none" }}>
              <thead><tr><th>#</th><th>Description / URL</th><th>Budget Line</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
              <tbody>
                {v.items.map((item, ii) => (
                  <tr key={item.id}>
                    <td className="text-muted">{ii + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.description || "—"}</div>
                      {item.url && <div className="text-muted" style={{ fontSize: "0.72rem", wordBreak: "break-all" }}>{item.url}</div>}
                    </td>
                    <td>{item.budget || "—"}</td>
                    <td>{item.qty}</td>
                    <td>{item.unitPrice ? fmt$(Number(item.unitPrice)) : "—"}</td>
                    <td style={{ fontWeight: 700, color: GOLD }}>{fmt$(lineTotal(item))}</td>
                  </tr>
                ))}
                <tr style={{ background: "rgba(245,192,37,0.04)" }}>
                  <td colSpan={5} style={{ textAlign: "right", fontWeight: 600 }}>Subtotal / Shipping</td>
                  <td>{fmt$(vendorSubtotal(v))} {Number(v.shipping) ? `+ ${fmt$(Number(v.shipping))}` : ""}</td>
                </tr>
                <tr style={{ background: "rgba(245,192,37,0.07)" }}>
                  <td colSpan={5} style={{ textAlign: "right", fontWeight: 700 }}>Vendor Total</td>
                  <td style={{ fontWeight: 800, color: GOLD }}>{fmt$(vendorTotal(v))}</td>
                </tr>
              </tbody>
            </table>
            {v.quotes.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                <div className="section-title">📎 Quotes to attach ({v.quotes.length})</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {v.quotes.map(q => <span key={q.id} className="quote-chip">📎 {q.name} ({(q.size / 1024).toFixed(1)} KB)</span>)}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Grand total */}
        <div className="gold-glow-box" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div className="text-muted" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>GRAND TOTAL — ALL VENDORS</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: GOLD }}>{fmt$(grandTotal(cart))}</div>
        </div>

        {/* Actions */}
        <div className="flex justify-between" style={{ gap: "0.75rem" }}>
          <button className="btn btn-ghost" onClick={onClose}>← Edit Request</button>
          <button
            className="btn btn-primary"
            style={{ gap: "0.5rem" }}
            onClick={onDownload}
          >
            📄 Download PDF
          </button>
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

  function setVendorField(vid, field, val) { setCart(c => c.map(v => v.id === vid ? { ...v, [field]: val } : v)); }
  function setItemField(vid, iid, field, val) { setCart(c => c.map(v => v.id === vid ? { ...v, items: v.items.map(i => i.id === iid ? { ...i, [field]: val } : i) } : v)); }
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
      <div style={{ fontSize: "3rem" }}>📄</div>
      <h2 style={{ marginTop: "1rem", fontWeight: 800 }}>PDF Generated</h2>
      <p className="text-muted mt1">
        A print dialog opened — choose <strong>Save as PDF</strong> to download.<br />
        Hand the PDF to your building secretary.
      </p>
      <button className="btn btn-primary mt2" onClick={() => { setCart([blankVendor()]); setSubmitted(false); }}>New Request</button>
    </div>
  );

  return (
    <div>
      {showPreview && (
        <ReqPreview
          cart={cart}
          user={user}
          onClose={() => setShowPreview(false)}
          onDownload={() => {
            addRequisition({ cart, total });
            generateRequisitionPDF(cart, user);
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
          {/* Vendor header bar */}
          <div style={{ background: GOLD, borderRadius: "7px", padding: "0.6rem 0.85rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="flex items-center gap2">
              <span style={{ fontWeight: 800, color: "#000" }}>VENDOR {vi + 1}</span>
              <input
                value={v.vendor}
                onChange={e => setVendorField(v.id, "vendor", e.target.value)}
                placeholder="Vendor name"
                style={{ background: "rgba(0,0,0,0.12)", border: "none", borderRadius: 5, padding: "0.2rem 0.5rem", width: 200, fontWeight: 600, outline: "none" }}
              />
            </div>
            <div className="flex items-center gap1">
              <span style={{ fontWeight: 800, color: "#000" }}>{fmt$(vendorTotal(v))}</span>
              {cart.length > 1 && <button className="btn btn-sm" style={{ background: "rgba(220,38,38,0.2)", color: "#dc2626", border: "none" }} onClick={() => removeVendor(v.id)}>✕</button>}
            </div>
          </div>

          {/* Line items */}
          {v.items.map((item, ii) => (
            <div key={item.id} style={{ border: "1px solid rgba(200,200,200,0.15)", borderRadius: "8px", padding: "0.85rem", marginBottom: "0.75rem" }}>
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

          <button type="button" className="btn btn-ghost w-full mb2" style={{ justifyContent: "center", borderStyle: "dashed" }} onClick={() => addItem(v.id)}>
            + Add Line Item
          </button>

          {/* Quote attachments */}
          <div>
            <div className="section-title">📎 Quote Attachments ({v.quotes.length})</div>
            {v.quotes.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
                {v.quotes.map(q => (
                  <span key={q.id} className="quote-chip">
                    {q.type?.startsWith("image/") ? "🖼" : q.type === "application/pdf" ? "📄" : "📎"} {q.name} <span className="text-muted">({(q.size / 1024).toFixed(1)} KB)</span>
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

      <button type="button" className="btn btn-ghost w-full mb2" style={{ justifyContent: "center", borderStyle: "dashed" }} onClick={addVendor}>
        + Add Another Vendor
      </button>

      <div className="gold-glow-box flex items-center justify-between">
        <div>
          <div className="text-muted" style={{ fontSize: "0.75rem" }}>GRAND TOTAL — ALL VENDORS</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: GOLD }}>{fmt$(total)}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowPreview(true)}>Preview &amp; Download PDF →</button>
      </div>

      {requisitions.length > 0 && (
        <div className="card mt2">
          <div className="section-title">My Recent Requisitions</div>
          {requisitions.map(r => {
            const d = r.created_at ? new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
            const vendorCount = Array.isArray(r.cart) ? r.cart.length : 0;
            return (
              <div key={r.id} className="flex items-center justify-between" style={{ padding: "0.55rem 0", borderBottom: "1px solid rgba(200,200,200,0.1)" }}>
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
