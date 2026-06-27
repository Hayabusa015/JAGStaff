import { LifeBuoy, CheckCircle2, PlayCircle, Clock, Inbox } from 'lucide-react';
import { useApp } from '../../ClassroomContext.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { timeAgo, ageBucket, formatDateTime } from '../../utils/format.js';

const AGE_GROUPS = ['Today', 'This Week', 'Older'];

export default function HelpDeskKanban({ embedded = false }) {
  const { tickets, advanceTicket, completeTicket, getStudent, getClass, getTheme } = useApp();

  const active = tickets.filter((t) => t.status !== 'completed');

  // Group active tickets by submission age.
  const grouped = AGE_GROUPS.map((bucket) => ({
    bucket,
    items: active
      .filter((t) => ageBucket(t.createdAt) === bucket)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
  })).filter((g) => g.items.length > 0);

  const TicketCard = ({ t }) => {
    const student = getStudent(t.studentId);
    const cls = getClass(student?.classId);
    const theme = getTheme(student?.classId);
    return (
      <div className={`rounded-xl border bg-ink-950/50 p-4 ${theme.border} transition-all hover:-translate-y-0.5 animate-fade-in`}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`grid h-9 w-9 place-items-center rounded-full font-display text-xs font-bold ${theme.bgSoft} ${theme.text} ring-1 ${theme.ring}`}>
              {student?.avatar}
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-50">{student?.name}</p>
              <p className="text-[11px] text-zinc-500">Period {cls?.period}</p>
            </div>
          </div>
          <Badge tone={t.status === 'in_progress' ? 'gold' : 'neutral'}>
            {t.status === 'in_progress' ? 'In Progress' : 'Submitted'}
          </Badge>
        </div>
        <Badge tone="gold">{t.category}</Badge>
        <p className="mt-2 text-sm text-zinc-200">{t.details}</p>
        <p className="mt-1 text-[11px] text-zinc-500" title={formatDateTime(t.createdAt)}>
          {timeAgo(t.createdAt)}
        </p>
        <div className="mt-3 flex gap-2">
          {t.status === 'submitted' && (
            <button
              onClick={() => advanceTicket(t.id)}
              className="font-display flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink-700 py-2 text-xs font-bold uppercase tracking-wide text-zinc-100 transition-colors hover:bg-gold-500 hover:text-ink-950"
            >
              <PlayCircle className="h-4 w-4" /> Start
            </button>
          )}
          <button
            onClick={() => completeTicket(t.id)}
            className="font-display flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold-500 py-2 text-xs font-bold uppercase tracking-wide text-ink-950 transition-colors hover:bg-gold-400"
          >
            <CheckCircle2 className="h-4 w-4" /> Mark Complete
          </button>
        </div>
      </div>
    );
  };

  const board = (
    <div className="space-y-5">
      {grouped.length === 0 ? (
        <Card>
          <EmptyState icon={Inbox} title="Queue is clear!" subtitle="No open help-desk tickets right now." />
        </Card>
      ) : (
        grouped.map((g) => (
          <div key={g.bucket}>
            <div className="mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-500" />
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-zinc-400">{g.bucket}</h3>
              <span className="rounded-full bg-white/5 px-2 text-[11px] font-bold text-zinc-300">
                {g.items.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((t) => (
                <TicketCard key={t.id} t={t} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (embedded) {
    return (
      <Card>
        <CardHeader title="Help Desk Queue" subtitle="Open tickets by age" icon={LifeBuoy} />
        <div className="space-y-3 p-4">
          {active.length === 0 ? (
            <EmptyState icon={Inbox} title="All clear" />
          ) : (
            active
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
              .slice(0, 4)
              .map((t) => <TicketCard key={t.id} t={t} />)
          )}
        </div>
      </Card>
    );
  }

  return board;
}
