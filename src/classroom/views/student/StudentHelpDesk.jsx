import React, { useState } from 'react';
import { LifeBuoy, Send, Inbox, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../ClassroomContext.jsx';
import { TICKET_CATEGORIES } from '../../data/mockData.js';
import Card, { CardHeader } from '../../components/Card.jsx';
import Badge from '../../components/Badge.jsx';
import StatusTimeline from '../../components/StatusTimeline.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { timeAgo } from '../../utils/format.js';

export default function StudentHelpDesk() {
  const { activeStudent, tickets, submitTicket } = useApp();
  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [details, setDetails] = useState('');
  const [flash, setFlash] = useState(false);

  const myTickets = tickets
    .filter((t) => t.studentId === activeStudent.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const submit = (e) => {
    e.preventDefault();
    if (!details.trim()) return;
    submitTicket(activeStudent.id, category, details.trim());
    setDetails('');
    setFlash(true);
    setTimeout(() => setFlash(false), 3500);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {/* Submission form */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader title="New Request" subtitle="Replace missing-work sheets & emails" icon={Send} />
          <form onSubmit={submit} className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
              >
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                Details / Context <span className="text-red-400">*</span>
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                required
                rows={4}
                placeholder="Tell Mr. Shull what you need — e.g. which assignment, which test, when you completed it…"
                className="w-full resize-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
              />
            </div>
            {flash && (
              <div className="flex items-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-3 py-2.5 text-xs text-gold-300 animate-pop-in">
                <CheckCircle2 className="h-4 w-4" /> Ticket submitted! Track its status below.
              </div>
            )}
            <button
              type="submit"
              disabled={!details.trim()}
              className="font-display flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-sm font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" /> Submit Ticket
            </button>
          </form>
        </Card>
      </div>

      {/* My tickets w/ timeline */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader title="My Tickets" subtitle="Submitted ➔ In Progress ➔ Completed" icon={LifeBuoy} />
          <div className="space-y-3 p-5">
            {myTickets.length === 0 ? (
              <EmptyState icon={Inbox} title="No tickets yet" subtitle="Submit a request and follow its journey here." />
            ) : (
              myTickets.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-white/10 bg-ink-950/50 p-4 transition-all hover:border-white/20"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <Badge tone="gold">{t.category}</Badge>
                      <p className="mt-2 text-sm text-zinc-200">{t.details}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">Submitted {timeAgo(t.createdAt)}</p>
                    </div>
                  </div>
                  <StatusTimeline status={t.status} />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
