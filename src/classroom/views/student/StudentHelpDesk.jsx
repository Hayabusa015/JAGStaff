import { useState } from 'react';
import { LifeBuoy, Send, Inbox, CheckCircle2, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useApp } from '../../ClassroomContext.jsx';
import { TICKET_CATEGORIES } from '../../data/mockData.js';
import Card, { CardHeader } from '../../components/Card.jsx';
import Badge from '../../components/Badge.jsx';
import StatusTimeline from '../../components/StatusTimeline.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { timeAgo } from '../../utils/format.js';

export default function StudentHelpDesk() {
  const { activeStudent, tickets, submitTicket, teacherProfile, setActiveView } = useApp();
  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const myTickets = tickets
    .filter((t) => t.studentId === activeStudent.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const submit = async (e) => {
    e.preventDefault();
    if (!details.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitTicket(activeStudent.id, category, details.trim());
    } catch {
      // non-fatal — ticket may still persist
    }
    setDetails('');
    setCategory(TICKET_CATEGORIES[0]);
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold-500/15 ring-2 ring-gold-500/30">
          <CheckCircle2 className="h-10 w-10 text-gold-400" />
        </div>
        <h2 className="font-display mb-2 text-2xl font-bold text-white">Ticket Submitted!</h2>
        <p className="mb-1 text-sm text-zinc-400">
          Your request has been sent to {teacherProfile.name}.
        </p>
        <p className="mb-8 text-xs text-zinc-600">You can track its progress in My Tickets.</p>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={() => setActiveView('dashboard')}
            className="font-display flex items-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400"
          >
            <LayoutDashboard className="h-4 w-4" /> Back to Dashboard
          </button>
          <button
            onClick={() => setSubmitted(false)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-zinc-300 transition-all hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> View My Tickets
          </button>
        </div>
      </div>
    );
  }

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
                placeholder={`Tell ${teacherProfile.name} what you need — e.g. which assignment, which test, when you completed it…`}
                className="w-full resize-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!details.trim() || submitting}
              className="font-display flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-sm font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" /> {submitting ? 'Submitting…' : 'Submit Ticket'}
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
