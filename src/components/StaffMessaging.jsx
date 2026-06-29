import { useState, useEffect, useRef, useMemo, useCallback } from "react";

const GOLD = "#F5C025";

// ── Emoji palette ──────────────────────────────────────────────────────────────
const EMOJI_LIST = [
  "😊","😂","😍","🙌","👍","👎","❤️","🔥","💯","🎉",
  "🤔","😅","😭","😤","🙏","💪","✅","❌","⚠️","📌",
  "📎","🔗","💬","📧","🏫","📚","✏️","📝","🗓️","⏰",
  "👀","🤝","🎯","💡","🚀","⭐","🏆","👋","🤗","😎",
  "😬","🥳","😴","🤦","🙄","💼","📋","🖊️","📁","📂",
  "🔔","🔕","📢","📣","💥","✨","🌟","👏","🫶","🫡",
];

// ── Markdown renderer ──────────────────────────────────────────────────────────
function renderBody(text) {
  if (!text) return null;
  const safe = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = safe
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#F5C025;text-decoration:underline;">$1</a>')
    .replace(/\n/g, "<br>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Avatar / initials ──────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, size = 32 }) {
  const initials = name
    ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return avatarUrl ? (
    <img src={avatarUrl} alt={name} style={{
      width: size, height: size, borderRadius: "50%",
      objectFit: "cover", flexShrink: 0,
      border: "1px solid rgba(245,192,37,0.25)",
    }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `rgba(245,192,37,0.15)`, border: `1px solid rgba(245,192,37,0.3)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size * 0.38, color: GOLD,
    }}>{initials}</div>
  );
}

// ── Format timestamp ───────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDay(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

function fmtFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Toolbar button ─────────────────────────────────────────────────────────────
function ToolBtn({ title, active, danger, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        background: active
          ? (danger ? "rgba(239,68,68,0.15)" : "rgba(245,192,37,0.12)")
          : "transparent",
        border: active
          ? (danger ? "1px solid rgba(239,68,68,0.4)" : `1px solid rgba(245,192,37,0.3)`)
          : "1px solid transparent",
        borderRadius: 6, padding: "0.3rem 0.5rem",
        color: active ? (danger ? "#ef4444" : GOLD) : "rgba(255,255,255,0.45)",
        cursor: "pointer", fontSize: "0.82rem", lineHeight: 1,
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = GOLD; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
    >{children}</button>
  );
}

// ── Create Group Modal ─────────────────────────────────────────────────────────
function CreateGroupModal({ staffList, userEmail, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [working, setWorking] = useState(false);

  const filtered = staffList.filter(s =>
    s.email !== userEmail &&
    (s.name || s.email).toLowerCase().includes(search.toLowerCase())
  );

  function toggle(email) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  }

  async function submit() {
    if (!name.trim() || selected.size < 1) return;
    setWorking(true);
    const id = await onCreate(name.trim(), desc.trim(), [...selected]);
    setWorking(false);
    onClose(id);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
    }}>
      <div style={{
        background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16, padding: "1.75rem", width: "min(480px, 95vw)",
        maxHeight: "85vh", display: "flex", flexDirection: "column", gap: "1rem",
      }}>
        <div style={{ fontWeight: 700, fontSize: "1.05rem", color: GOLD }}>Create Group Chat</div>

        <div>
          <label style={labelStyle}>Group Name</label>
          <input
            autoFocus value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. 10th Grade Team, Sub Coverage…"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Description (optional)</label>
          <input value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="What is this group for?"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Add Members</label>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search staff…"
            style={{ ...inputStyle, marginBottom: "0.5rem" }}
          />
          <div style={{
            overflowY: "auto", maxHeight: 220, display: "flex", flexDirection: "column", gap: "0.3rem",
          }}>
            {filtered.map(s => (
              <label key={s.email} style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.45rem 0.65rem", borderRadius: 8, cursor: "pointer",
                background: selected.has(s.email) ? "rgba(245,192,37,0.07)" : "rgba(255,255,255,0.03)",
                border: selected.has(s.email) ? `1px solid rgba(245,192,37,0.25)` : "1px solid rgba(255,255,255,0.06)",
              }}>
                <input type="checkbox" checked={selected.has(s.email)} onChange={() => toggle(s.email)}
                  style={{ accentColor: GOLD }} />
                <Avatar name={s.name || s.email} size={28} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{s.name || s.email}</div>
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>{s.email}</div>
                </div>
              </label>
            ))}
            {filtered.length === 0 && (
              <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.3)", padding: "0.5rem" }}>No staff found.</div>
            )}
          </div>
          {selected.size > 0 && (
            <div style={{ fontSize: "0.75rem", color: GOLD, marginTop: "0.4rem" }}>
              {selected.size} member{selected.size !== 1 ? "s" : ""} selected
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.65rem", marginTop: "0.25rem" }}>
          <button onClick={submit} disabled={!name.trim() || selected.size < 1 || working} style={{
            flex: 1, background: GOLD, border: "none", color: "#000", fontWeight: 700,
            borderRadius: 9, padding: "0.6rem", cursor: "pointer", fontSize: "0.9rem",
            opacity: (!name.trim() || selected.size < 1 || working) ? 0.5 : 1,
          }}>{working ? "Creating…" : "Create Group"}</button>
          <button onClick={() => onClose(null)} style={{
            flex: 0, background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.5)", borderRadius: 9, padding: "0.6rem 1rem",
            cursor: "pointer",
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Lightbox ───────────────────────────────────────────────────────────────────
function Lightbox({ url, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300,
        cursor: "zoom-out",
      }}
    >
      <img src={url} alt="" style={{
        maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12,
        boxShadow: "0 0 80px rgba(0,0,0,0.8)",
      }} />
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, padding: "0.5rem 0.75rem", color: "#fff", fontSize: "0.88rem",
  outline: "none",
};

const labelStyle = {
  display: "block", fontSize: "0.7rem", textTransform: "uppercase",
  letterSpacing: "0.07em", color: "rgba(255,255,255,0.35)", marginBottom: 4,
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function StaffMessaging({
  user, staffList = [],
  conversations = [], messages = {}, members = {},
  openOrCreateDM, createGroup, sendMessage, uploadAttachment, markRead,
  getUnread, totalUnread,
}) {
  const [activeConvId, setActiveConvId] = useState(null);
  const [draft, setDraft] = useState("");
  const [isAlert, setIsAlert] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // { file, preview? }
  const [dragOver, setDragOver] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Build a lookup: email → staff member
  const staffByEmail = useMemo(() => {
    const map = {};
    staffList.forEach(s => { map[s.email] = s; });
    return map;
  }, [staffList]);

  // Get display name for a conversation
  function convName(conv) {
    if (!conv) return "";
    if (conv.type === "group") return conv.name || "Group";
    const convMembers = members[conv.id] || [];
    const other = convMembers.find(m => m.user_email !== user.email);
    if (!other) return "Unknown";
    const s = staffByEmail[other.user_email];
    return s?.name || other.user_email;
  }

  function convAvatar(conv) {
    if (!conv || conv.type === "group") return null;
    const convMembers = members[conv.id] || [];
    const other = convMembers.find(m => m.user_email !== user.email);
    if (!other) return null;
    return staffByEmail[other.user_email]?.avatarUrl || null;
  }

  // Last message for a conversation
  function lastMsg(convId) {
    const msgs = messages[convId] || [];
    return msgs[msgs.length - 1] || null;
  }

  // Sorted conversations: by last message time (most recent first)
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aLast = lastMsg(a.id)?.created_at || a.created_at;
      const bLast = lastMsg(b.id)?.created_at || b.created_at;
      return bLast.localeCompare(aLast);
    });
  }, [conversations, messages]);

  const groups = sortedConversations.filter(c => c.type === "group");
  const dms = sortedConversations.filter(c => c.type === "dm");

  // Staff not yet in any DM
  const messagedEmails = new Set(
    dms.flatMap(c => (members[c.id] || []).map(m => m.user_email))
  );
  const unmessagedStaff = staffList.filter(
    s => s.email !== user.email &&
      !messagedEmails.has(s.email) &&
      (s.name || s.email).toLowerCase().includes(search.toLowerCase())
  );

  const activeConv = conversations.find(c => c.id === activeConvId) || null;
  const thread = messages[activeConvId] || [];

  // Auto-scroll to bottom when thread changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  // Mark read when opening a conversation
  useEffect(() => {
    if (activeConvId) {
      markRead(activeConvId);
      setShowMobileSidebar(false);
    }
  }, [activeConvId]);

  async function handleOpenConv(convId) {
    setActiveConvId(convId);
    setDraft("");
    setIsAlert(false);
    setPendingFiles([]);
    setShowEmoji(false);
  }

  async function handleStartDM(email) {
    const id = await openOrCreateDM(email);
    if (id) handleOpenConv(id);
  }

  async function handleSend() {
    if ((!draft.trim() && pendingFiles.length === 0) || !activeConvId || sending) return;
    setSending(true);
    const msgData = await sendMessage(activeConvId, draft.trim(), isAlert);
    if (msgData && uploadAttachment && pendingFiles.length > 0) {
      await Promise.all(pendingFiles.map(({ file }) => uploadAttachment(msgData.id, file)));
    }
    setSending(false);
    setDraft("");
    setIsAlert(false);
    setPendingFiles([]);
    setShowEmoji(false);
    textareaRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function insertAtCursor(text) {
    const el = textareaRef.current;
    if (!el) { setDraft(d => d + text); return; }
    const start = el.selectionStart, end = el.selectionEnd;
    const next = draft.slice(0, start) + text + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    });
  }

  function wrapSelection(before, after = before) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const sel = draft.slice(start, end) || "text";
    const next = draft.slice(0, start) + before + sel + after + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el.selectionStart = start + before.length;
      el.selectionEnd = start + before.length + sel.length;
      el.focus();
    });
  }

  function handleInsertLink() {
    const url = window.prompt("Enter URL:");
    if (!url) return;
    const el = textareaRef.current;
    const sel = el ? draft.slice(el.selectionStart, el.selectionEnd) : "";
    insertAtCursor(`[${sel || "link text"}](${url})`);
  }

  function handleFilePick(e) {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    e.target.value = "";
  }

  function addFiles(files) {
    const newFiles = files.map(file => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setPendingFiles(prev => [...prev, ...newFiles]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) addFiles(files);
  }

  async function handleCreateGroup(name, desc, emails) {
    return await createGroup(name, desc, emails);
  }

  // ── Sidebar conversation row ─────────────────────────────────────────────────
  const ConvRow = useCallback(({ conv }) => {
    const unread = getUnread(conv.id);
    const last = lastMsg(conv.id);
    const name = convName(conv);
    const avatarUrl = convAvatar(conv);
    const isActive = conv.id === activeConvId;

    return (
      <button
        onClick={() => handleOpenConv(conv.id)}
        className={`msg-row${isActive ? " msg-row-active" : ""}`}
        style={{
          width: "100%", background: isActive ? "rgba(245,192,37,0.07)" : "transparent",
          border: "none", borderLeft: isActive ? `3px solid ${GOLD}` : "3px solid transparent",
          borderRadius: "0 8px 8px 0", padding: "0.65rem 0.85rem",
          cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "0.65rem",
        }}
      >
        {conv.type === "group" ? (
          <div className="msg-avatar" style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: "rgba(245,192,37,0.1)", border: "1px solid rgba(245,192,37,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem",
          }}>👥</div>
        ) : (
          <div className="msg-avatar" style={{ borderRadius: "50%", flexShrink: 0 }}>
            <Avatar name={name} avatarUrl={avatarUrl} size={36} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem" }}>
            <span style={{
              fontWeight: unread > 0 ? 700 : 500, fontSize: "0.88rem",
              color: isActive ? GOLD : "#fff", truncate: "ellipsis",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
              {last && <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)" }}>{fmtTime(last.created_at)}</span>}
              {unread > 0 && (
                <span style={{
                  background: GOLD, color: "#000", borderRadius: "50%",
                  minWidth: 18, height: 18, fontSize: "0.65rem", fontWeight: 800,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  padding: "0 3px",
                }}>{unread}</span>
              )}
            </div>
          </div>
          {last && (
            <div style={{
              fontSize: "0.75rem", color: "rgba(255,255,255,0.35)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              marginTop: 1,
            }}>
              {last.sender_email === user.email ? "You: " : ""}
              {last.body || (last.staff_message_attachments?.length ? "📎 Attachment" : "")}
            </div>
          )}
        </div>
      </button>
    );
  }, [activeConvId, messages, members, getUnread]);

  // ── Message bubble ─────────────────────────────────────────────────────────
  function MessageBubble({ msg, showAvatar }) {
    const isMine = msg.sender_email === user.email;
    const sender = staffByEmail[msg.sender_email];
    const attachments = msg.staff_message_attachments || [];

    return (
      <div style={{
        display: "flex", flexDirection: isMine ? "row-reverse" : "row",
        alignItems: "flex-end", gap: "0.5rem", marginBottom: "0.2rem",
      }}>
        {!isMine && (
          <div style={{ width: 32, flexShrink: 0 }}>
            {showAvatar && <Avatar name={sender?.name || msg.sender_email} avatarUrl={sender?.avatarUrl} size={32} />}
          </div>
        )}
        <div style={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
          {!isMine && showAvatar && (
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginBottom: 3, marginLeft: 4 }}>
              {sender?.name || msg.sender_email}
            </div>
          )}
          <div style={{
            background: msg.is_alert
              ? (isMine ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)")
              : (isMine ? "rgba(245,192,37,0.12)" : "rgba(255,255,255,0.05)"),
            border: isMine ? "1px solid rgba(245,192,37,0.25)" : "1px solid rgba(255,255,255,0.09)",
            borderRadius: isMine ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
            padding: msg.is_alert ? "0.6rem 0.85rem 0.6rem 0.75rem" : "0.55rem 0.85rem",
            fontSize: "0.88rem", lineHeight: 1.5, color: "#fff",
            borderLeft: msg.is_alert ? "3px solid #ef4444" : undefined,
          }}>
            {msg.is_alert && (
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#ef4444", marginBottom: 4, letterSpacing: "0.06em" }}>
                ⚠️ ALERT
              </div>
            )}
            {msg.body && renderBody(msg.body)}
            {/* Attachments */}
            {attachments.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: msg.body ? "0.5rem" : 0 }}>
                {attachments.map(att => {
                  const isImg = att.file_type?.startsWith("image/");
                  return isImg ? (
                    <img
                      key={att.id} src={att.file_url} alt={att.file_name}
                      onClick={() => setLightboxUrl(att.file_url)}
                      style={{
                        maxWidth: 280, maxHeight: 200, borderRadius: 8,
                        objectFit: "cover", cursor: "zoom-in", display: "block",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    />
                  ) : (
                    <a key={att.id} href={att.file_url} download={att.file_name} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.5rem",
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8, padding: "0.4rem 0.65rem", textDecoration: "none",
                        color: "rgba(255,255,255,0.75)", fontSize: "0.8rem",
                      }}
                    >
                      <span>📎</span>
                      <span>{att.file_name}</span>
                      {att.file_size && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem" }}>{fmtFileSize(att.file_size)}</span>}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", marginTop: 3, marginLeft: 4, marginRight: 4 }}>
            {fmtTime(msg.created_at)}
          </div>
        </div>
      </div>
    );
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{
      width: "100%", flexShrink: 0, display: "flex", flexDirection: "column",
      borderRight: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(255,255,255,0.015)",
      height: "100%", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem 1rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "0.02em" }}>Staff Messages</div>
        <button
          onClick={() => setShowCreateGroup(true)}
          title="Create group chat"
          style={{
            background: "rgba(245,192,37,0.1)", border: `1px solid rgba(245,192,37,0.3)`,
            color: GOLD, borderRadius: 7, padding: "0.3rem 0.65rem",
            cursor: "pointer", fontSize: "0.78rem", fontWeight: 700,
          }}>+ Group</button>
      </div>

      {/* Search */}
      <div style={{ padding: "0.65rem 0.85rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search staff…"
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "0.4rem 0.65rem", color: "#fff", fontSize: "0.82rem",
            outline: "none",
          }}
        />
      </div>

      {/* Conversation list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.4rem 0" }}>
        {/* Groups */}
        {groups.length > 0 && (
          <>
            <div style={{ padding: "0.35rem 1rem 0.2rem", fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Groups</div>
            {groups.map(c => <ConvRow key={c.id} conv={c} />)}
          </>
        )}

        {/* Direct messages */}
        {dms.filter(c => {
          const name = convName(c);
          return name.toLowerCase().includes(search.toLowerCase());
        }).length > 0 && (
          <>
            <div style={{ padding: "0.5rem 1rem 0.2rem", fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Direct Messages</div>
            {dms.filter(c => convName(c).toLowerCase().includes(search.toLowerCase())).map(c => (
              <ConvRow key={c.id} conv={c} />
            ))}
          </>
        )}

        {/* All staff — not yet messaged */}
        {unmessagedStaff.length > 0 && (
          <>
            <div style={{ padding: "0.5rem 1rem 0.2rem", fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>All Staff</div>
            {unmessagedStaff.map(s => (
              <button
                key={s.email}
                onClick={() => handleStartDM(s.email)}
                className="msg-row"
                style={{
                  width: "100%", background: "transparent", border: "none",
                  borderLeft: "3px solid transparent", borderRadius: "0 8px 8px 0",
                  padding: "0.55rem 0.85rem", cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "0.65rem",
                }}
              >
                <div className="msg-avatar" style={{ borderRadius: "50%", flexShrink: 0 }}>
                  <Avatar name={s.name || s.email} avatarUrl={s.avatarUrl} size={34} />
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.86rem", color: "rgba(255,255,255,0.75)" }}>{s.name || s.email}</div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>{s.email}</div>
                </div>
              </button>
            ))}
          </>
        )}

        {groups.length === 0 && dms.length === 0 && unmessagedStaff.length === 0 && (
          <div style={{ padding: "2rem 1rem", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.82rem" }}>
            No staff found.
          </div>
        )}
      </div>
    </div>
  );

  // ── Thread panel ───────────────────────────────────────────────────────────
  const threadPanel = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
      {!activeConv ? (
        /* Empty state */
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "0.75rem",
          color: "rgba(255,255,255,0.2)",
        }}>
          <div style={{ fontSize: "3rem" }}>💬</div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "rgba(255,255,255,0.35)" }}>Staff Messages</div>
          <div style={{ fontSize: "0.85rem", textAlign: "center", maxWidth: 280, lineHeight: 1.55 }}>
            Select a colleague from the sidebar to start a conversation, or create a group chat.
          </div>
        </div>
      ) : (
        <>
          {/* Thread header */}
          <div style={{
            padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0,
          }}>
            <button
              onClick={() => { setActiveConvId(null); setShowMobileSidebar(true); }}
              className="hide-desktop"
              style={{
                background: "transparent", border: "none", color: "rgba(255,255,255,0.5)",
                cursor: "pointer", fontSize: "1.1rem", padding: "0 0.25rem",
              }}
            >←</button>
            {activeConv.type === "group"
              ? <div style={{ fontSize: "1.4rem" }}>👥</div>
              : <Avatar name={convName(activeConv)} avatarUrl={convAvatar(activeConv)} size={36} />
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "0.96rem" }}>{convName(activeConv)}</div>
              {activeConv.type === "group" && (
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                  {(members[activeConv.id] || []).length} members
                  {activeConv.description ? ` · ${activeConv.description}` : ""}
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: 0 }}>
            {thread.length === 0 && (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: "0.85rem", marginTop: "3rem" }}>
                No messages yet — say hello! 👋
              </div>
            )}
            {thread.map((msg, i) => {
              const prev = thread[i - 1];
              const showDivider = !prev || !isSameDay(prev.created_at, msg.created_at);
              const showAvatar = !prev || prev.sender_email !== msg.sender_email || showDivider;
              return (
                <div key={msg.id}>
                  {showDivider && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      margin: "1rem 0 0.75rem", color: "rgba(255,255,255,0.2)", fontSize: "0.72rem",
                    }}>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                      <span>{fmtDay(msg.created_at)}</span>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                    </div>
                  )}
                  {showAvatar && i > 0 && !showDivider && <div style={{ height: "0.6rem" }} />}
                  <MessageBubble msg={msg} showAvatar={showAvatar} />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Compose area */}
          <div
            style={{
              borderTop: dragOver ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.07)",
              padding: "0.75rem 1.25rem 1rem",
              background: dragOver ? "rgba(245,192,37,0.04)" : "rgba(255,255,255,0.02)",
              flexShrink: 0, transition: "all 0.15s",
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {dragOver && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                color: GOLD, fontWeight: 700, fontSize: "1.05rem", pointerEvents: "none",
                background: "rgba(0,0,0,0.3)", zIndex: 10, borderRadius: 8,
              }}>Drop files to attach</div>
            )}

            {/* Pending file previews */}
            {pendingFiles.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.6rem" }}>
                {pendingFiles.map(({ file, preview }, idx) => (
                  <div key={idx} style={{
                    position: "relative", display: "inline-flex", alignItems: "center",
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8, overflow: "hidden",
                  }}>
                    {preview
                      ? <img src={preview} alt="" style={{ width: 60, height: 60, objectFit: "cover" }} />
                      : <div style={{ padding: "0.35rem 0.65rem", fontSize: "0.78rem", color: "rgba(255,255,255,0.6)" }}>📎 {file.name}</div>
                    }
                    <button onClick={() => setPendingFiles(p => p.filter((_, i) => i !== idx))}
                      style={{
                        position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.7)",
                        border: "none", color: "#fff", borderRadius: "50%",
                        width: 18, height: 18, cursor: "pointer", fontSize: "0.65rem",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", marginBottom: "0.45rem", flexWrap: "wrap" }}>
              <ToolBtn title="Bold" onClick={() => wrapSelection("**")}><strong>B</strong></ToolBtn>
              <ToolBtn title="Italic" onClick={() => wrapSelection("*")}><em>I</em></ToolBtn>
              <ToolBtn title="Insert link" onClick={handleInsertLink}>🔗</ToolBtn>
              <ToolBtn title="Attach file" onClick={() => fileInputRef.current?.click()}>📎</ToolBtn>
              <ToolBtn title="Emoji" active={showEmoji} onClick={() => setShowEmoji(s => !s)}>😊</ToolBtn>
              <ToolBtn title="Mark as alert" active={isAlert} danger onClick={() => setIsAlert(s => !s)}>⚠️</ToolBtn>
              {isAlert && (
                <span style={{ fontSize: "0.72rem", color: "#ef4444", marginLeft: 4 }}>Alert message</span>
              )}
              <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={handleFilePick} />
            </div>

            {/* Emoji picker */}
            {showEmoji && (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: "0.2rem",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "0.6rem", marginBottom: "0.5rem",
                maxWidth: 320,
              }}>
                {EMOJI_LIST.map(e => (
                  <button key={e} onClick={() => { insertAtCursor(e); setShowEmoji(false); }}
                    style={{
                      background: "transparent", border: "none", cursor: "pointer",
                      fontSize: "1.15rem", padding: "0.2rem", borderRadius: 5, lineHeight: 1,
                    }}
                    onMouseEnter={e2 => e2.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                    onMouseLeave={e2 => e2.currentTarget.style.background = "transparent"}
                  >{e}</button>
                ))}
              </div>
            )}

            {/* Text input + send */}
            <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-end" }}>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                rows={1}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10, padding: "0.6rem 0.85rem",
                  color: "#fff", fontSize: "0.9rem", outline: "none",
                  resize: "none", lineHeight: 1.5, minHeight: 42, maxHeight: 140,
                  overflowY: "auto", fontFamily: "inherit",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(245,192,37,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                onInput={e => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || (!draft.trim() && pendingFiles.length === 0)}
                style={{
                  background: GOLD, border: "none", color: "#000", fontWeight: 800,
                  borderRadius: 10, padding: "0.55rem 1.1rem", cursor: "pointer",
                  fontSize: "0.95rem", flexShrink: 0, opacity: (sending || (!draft.trim() && pendingFiles.length === 0)) ? 0.4 : 1,
                  transition: "opacity 0.15s",
                }}
              >{sending ? "…" : "Send"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  // Mobile (≤640px): sidebar OR thread — never both. CSS hides the inactive panel.
  // Desktop: both panels always visible side-by-side. CSS classes are no-ops there.
  const sidebarHidden = !showMobileSidebar;   // mobile: hide sidebar when thread showing
  const threadHidden  =  showMobileSidebar;   // mobile: hide thread when sidebar showing

  return (
    <div className="msg-panel-root" style={{
      display: "flex", height: "calc(100vh - 110px)", minHeight: 500,
      background: "rgba(255,255,255,0.01)", borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden",
      position: "relative",
    }}>
      {/* Sidebar — 282px on desktop, full-width on mobile (CSS overrides width) */}
      <div className={`msg-sidebar${sidebarHidden ? " msg-sidebar-hidden" : ""}`}
        style={{ width: 282, display: "flex", flexDirection: "column", height: "100%", flexShrink: 0 }}>
        {sidebar}
      </div>

      {/* Thread panel */}
      <div className={`msg-thread${threadHidden ? " msg-thread-hidden" : ""}`}
        style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%", overflow: "hidden" }}>
        {threadPanel}
      </div>

      {/* Modals */}
      {showCreateGroup && (
        <CreateGroupModal
          staffList={staffList}
          userEmail={user.email}
          onClose={(newConvId) => {
            setShowCreateGroup(false);
            if (newConvId) handleOpenConv(newConvId);
          }}
          onCreate={handleCreateGroup}
        />
      )}
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}
