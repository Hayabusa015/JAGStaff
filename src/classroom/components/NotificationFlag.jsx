import React, { useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '../ClassroomContext.jsx';
import { timeAgo } from '../utils/format.js';

// Student-facing notification bell with a dropdown of flags pushed by the
// teacher (ticket completions, mole approvals/denials).
export default function NotificationFlag() {
  const { activeStudent, markNotificationsRead } = useApp();
  const [open, setOpen] = useState(false);
  const notifications = activeStudent?.notifications || [];
  const unread = notifications.filter((n) => !n.read).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) markNotificationsRead(activeStudent.id);
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative grid h-10 w-10 place-items-center rounded-xl bg-ink-850/80 text-zinc-300 ring-1 ring-white/10 transition-colors hover:text-gold-300"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gold-500 text-[10px] font-bold text-ink-950 ring-2 ring-ink-950 animate-pop-in">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right animate-pop-in overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-2xl">
          <div className="font-display border-b border-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-50">
            Notifications
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-zinc-500">You're all caught up! 🎉</p>
            ) : (
              notifications.map((n) => {
                const Icon = n.tone === 'success' ? CheckCircle2 : AlertTriangle;
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 border-b border-white/5 px-4 py-3 last:border-0"
                  >
                    <Icon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        n.tone === 'success' ? 'text-gold-400' : 'text-red-400'
                      }`}
                    />
                    <div>
                      <p className="text-xs text-zinc-200">{n.text}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
