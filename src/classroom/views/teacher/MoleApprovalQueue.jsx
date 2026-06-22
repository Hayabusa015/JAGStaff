import React, { useState } from 'react';
import { Coins, Check, X, Bell, Trophy, History, Settings2 } from 'lucide-react';
import { useApp } from '../../ClassroomContext.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';
import Badge, { StatusBadge } from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { timeAgo } from '../../utils/format.js';
import MoleEconSettings from './MoleEconSettings.jsx';

export default function MoleApprovalQueue({ embedded = false }) {
  const { moleRequests, approveMoleRequest, denyMoleRequest, getStudent, getClass, getTheme, metrics, currencyName, currencySymbol } =
    useApp();
  const [denyingId, setDenyingId] = useState(null);
  const [denyNote, setDenyNote] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const pending = moleRequests
    .filter((r) => r.status === 'pending')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const resolved = moleRequests
    .filter((r) => r.status !== 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const startDeny = (id) => {
    setDenyingId(id);
    setDenyNote('');
  };
  const confirmDeny = (id) => {
    denyMoleRequest(id, denyNote.trim());
    setDenyingId(null);
    setDenyNote('');
  };

  const RequestCard = ({ r }) => {
    const student = getStudent(r.studentId);
    const cls = getClass(student?.classId);
    const theme = getTheme(student?.classId);
    const isDenying = denyingId === r.id;
    return (
      <div className={`rounded-xl border bg-ink-950/50 p-4 ${theme.border} animate-fade-in`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-full font-display text-sm font-bold ${theme.bgSoft} ${theme.text} ring-1 ${theme.ring}`}>
              {student?.avatar}
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-50">{student?.name}</p>
              <p className="text-[11px] text-zinc-500">
                Period {cls?.period} · {cls?.name}
              </p>
            </div>
          </div>
          <Badge tone="gold" icon={Coins}>
            {r.cost} {currencySymbol}
          </Badge>
        </div>
        <p className="mt-3 text-sm text-zinc-200">
          Requesting: <strong className="text-zinc-50">{r.item}</strong>
        </p>
        <p className="text-[11px] text-zinc-500">{timeAgo(r.createdAt)}</p>

        {isDenying ? (
          <div className="mt-3 space-y-2">
            <input
              value={denyNote}
              onChange={(e) => setDenyNote(e.target.value)}
              placeholder="Reason for denial (returned to student)…"
              autoFocus
              className="w-full rounded-lg border border-red-500/40 bg-ink-900 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => confirmDeny(r.id)}
                className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-red-400"
              >
                Confirm Deny & Refund
              </button>
              <button
                onClick={() => setDenyingId(null)}
                className="rounded-lg bg-ink-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200 hover:bg-ink-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => approveMoleRequest(r.id)}
              className="font-display flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold-500 py-2 text-xs font-bold uppercase tracking-wide text-ink-950 transition-colors hover:bg-gold-400"
            >
              <Check className="h-4 w-4" /> Approve
            </button>
            <button
              onClick={() => startDeny(r.id)}
              className="font-display flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink-700 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200 transition-colors hover:bg-red-500/80 hover:text-white"
            >
              <X className="h-4 w-4" /> Deny
            </button>
          </div>
        )}
      </div>
    );
  };

  const queue = (
    <Card>
      <CardHeader
        title="Redemption Requests"
        subtitle={`Approve or deny incoming ${currencyName} spends`}
        icon={Bell}
        action={
          pending.length > 0 ? (
            <span className="grid h-7 min-w-7 place-items-center rounded-full bg-gold-500 px-2 font-display text-xs font-bold text-ink-950 animate-pulse-ring">
              {pending.length}
            </span>
          ) : null
        }
      />
      <div className="space-y-3 p-5">
        {pending.length === 0 ? (
          <EmptyState icon={Bell} title="No pending requests" subtitle={`New ${currencyName} redemptions appear here in real time.`} />
        ) : (
          pending.map((r) => <RequestCard key={r.id} r={r} />)
        )}
      </div>
    </Card>
  );

  if (embedded) return queue;

  return (
    <div className="space-y-5">
      {/* Running tally */}
      <Card hairline>
        <div className="flex flex-wrap items-center gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold-500/15 ring-1 ring-gold-500/40">
              <Trophy className="h-6 w-6 text-gold-400" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-zinc-50">{metrics.approvedMoleDollars} {currencySymbol}</p>
              <p className="text-xs text-zinc-500">total approved & cashed into the Vault</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="rounded-xl bg-ink-950/60 px-4 py-2 text-center ring-1 ring-white/10">
              <p className="font-display text-xl font-bold text-gold-300">{pending.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Pending</p>
            </div>
            <button
              onClick={() => setShowSettings((s) => !s)}
              className={`font-display flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                showSettings
                  ? 'border-gold-500/40 bg-gold-500/15 text-gold-300'
                  : 'border-white/10 text-zinc-300 hover:border-white/20'
              }`}
            >
              <Settings2 className="h-4 w-4" /> Economy Settings
            </button>
          </div>
        </div>
      </Card>

      {showSettings && <MoleEconSettings />}

      <div className="grid gap-5 lg:grid-cols-2">
        {queue}

        {/* Resolved log */}
        <Card>
          <CardHeader title="Transaction Log" subtitle="Approved & denied history" icon={History} />
          <div className="divide-y divide-white/5">
            {resolved.length === 0 ? (
              <EmptyState icon={History} title="No transactions yet" />
            ) : (
              resolved.map((r) => {
                const student = getStudent(r.studentId);
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-50">
                        {student?.name} · {r.item}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {r.cost} {currencySymbol} · {timeAgo(r.createdAt)}
                      </p>
                      {r.status === 'denied' && r.note && (
                        <p className="text-[11px] italic text-red-300/80">“{r.note}”</p>
                      )}
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
