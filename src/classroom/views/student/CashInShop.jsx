import React, { useState } from 'react';
import { Coins, Lock, ShoppingCart, Send, AlertCircle, CheckCircle2, Hourglass } from 'lucide-react';
import { useApp } from '../../ClassroomContext.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';
import Badge, { StatusBadge as SB } from '../../components/Badge.jsx';
import { timeAgo } from '../../utils/format.js';

export default function CashInShop() {
  const { activeStudent, moleRequests, submitMoleRequest, moleMilestone, shopItems, getTheme, teacherProfile } = useApp();
  const theme = getTheme(activeStudent.classId);
  const [selected, setSelected] = useState(() => shopItems[0]?.id ?? null);
  const [flash, setFlash] = useState(null);

  const item = shopItems.find((i) => i.id === selected) ?? shopItems[0];
  const affordable = item ? activeStudent.balance >= item.cost : false;
  const myRequests = moleRequests
    .filter((r) => r.studentId === activeStudent.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const submit = () => {
    const ok = submitMoleRequest(activeStudent.id, item);
    if (ok) {
      setFlash({ tone: 'success', text: `Locked ${item.cost} MD for "${item.label}". Sent to ${teacherProfile.name} for approval!` });
    } else {
      setFlash({ tone: 'error', text: `Not enough Mole Dollars for "${item.label}".` });
    }
    setTimeout(() => setFlash(null), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Balance + milestone */}
      <Card className="overflow-hidden" hairline>
        <div className={`relative bg-gradient-to-r ${theme.gradient} px-5 py-4`}>
          <img src="/gmen-logo.png" alt="" className="mascot-watermark" />
          <div className="relative flex items-center justify-between text-ink-950">
            <div className="flex items-center gap-2">
              <Coins className="h-6 w-6" />
              <span className="font-display text-sm font-bold uppercase tracking-widest">
                Mole Dollar Balance
              </span>
            </div>
            <span className="font-display text-4xl font-bold">{activeStudent.balance}</span>
          </div>
        </div>
        <div className="space-y-2 px-5 py-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Progress to next milestone bonus</span>
            <span className="font-bold text-zinc-50">
              {activeStudent.balance} / {moleMilestone} MD
            </span>
          </div>
          <ProgressBar value={activeStudent.balance} max={moleMilestone} />
          {activeStudent.lockedBalance > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Lock className="h-3.5 w-3.5" />
              <strong className="text-zinc-200">{activeStudent.lockedBalance} MD</strong> locked in
              pending requests
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Shop */}
        <Card>
          <CardHeader title="Cash-In Shop" subtitle="Spend back to the Teacher Vault" icon={ShoppingCart} />
          <div className="space-y-4 p-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {shopItems.map((opt) => {
                const active = opt.id === selected;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelected(opt.id)}
                    className={[
                      'flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all',
                      active
                        ? 'border-gold-500/40 bg-gold-500/10 ring-1 ring-gold-500/40'
                        : 'border-white/10 bg-ink-950/40 hover:border-white/20',
                    ].join(' ')}
                  >
                    <span className="text-sm font-semibold text-zinc-50">{opt.label}</span>
                    <Badge tone="gold">{opt.cost} MD</Badge>
                  </button>
                );
              })}
            </div>

            {flash && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs animate-pop-in ${
                  flash.tone === 'success'
                    ? 'border-gold-500/40 bg-gold-500/10 text-gold-300'
                    : 'border-red-500/40 bg-red-500/10 text-red-300'
                }`}
              >
                {flash.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {flash.text}
              </div>
            )}

            <button
              onClick={submit}
              disabled={!affordable}
              className="font-display flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-sm font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              {affordable ? `Submit Request · ${item.cost} MD` : 'Insufficient Balance'}
            </button>
            <p className="text-center text-[11px] text-zinc-500">
              Submitting instantly locks the tokens out of your spendable balance until {teacherProfile.name}
              {' '}approves or denies.
            </p>
          </div>
        </Card>

        {/* My request history */}
        <Card>
          <CardHeader title="My Redemption Requests" subtitle="Track approvals & denials" icon={Hourglass} />
          <div className="divide-y divide-white/5">
            {myRequests.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">No requests yet.</p>
            ) : (
              myRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-50">{r.item}</p>
                    <p className="text-[11px] text-zinc-500">
                      {r.cost} MD · {timeAgo(r.createdAt)}
                    </p>
                    {r.status === 'denied' && r.note && (
                      <p className="mt-1 text-[11px] italic text-red-300/80">“{r.note}”</p>
                    )}
                  </div>
                  <SB status={r.status} />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
