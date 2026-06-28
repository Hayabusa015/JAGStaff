import { useState } from 'react';
import { Coins, Lock, ShoppingCart, Send, AlertCircle, CheckCircle2, Hourglass, BookOpen, Zap } from 'lucide-react';
import { useApp } from '../../ClassroomContext.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';
import Badge, { StatusBadge as SB } from '../../components/Badge.jsx';
import { timeAgo } from '../../utils/format.js';

const REWARD_LABELS = {
  dropLowest: (cat) => `Drops your lowest ${cat} grade this grading period`,
  moleDollarBonus: () => 'Adds bonus points to your Mole Dollar Bonus grade (Tests category)',
};

export default function CashInShop() {
  const {
    activeStudent, moleRequests, submitMoleRequest,
    moleMilestone, shopItems, getTheme, teacherProfile,
    currencyName, currencySymbol, classroomDesign,
    currentGradingPeriod,
  } = useApp();
  const theme = getTheme(activeStudent.classId);
  const [selected, setSelected] = useState(() => shopItems[0]?.id ?? null);
  const [flash, setFlash] = useState(null);

  const item = shopItems.find((i) => i.id === selected) ?? shopItems[0];
  const affordable = item ? activeStudent.balance >= item.cost : false;
  const myRequests = moleRequests
    .filter((r) => r.studentId === activeStudent.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Per-period drop limit check.
  function checkDropLimit(shopItem) {
    if (!shopItem?.limitPerPeriod || shopItem?.rewardType !== 'dropLowest') return null;
    const alreadyUsed = moleRequests.some(r =>
      r.studentId === activeStudent.id &&
      (r.status === 'pending' || r.status === 'approved') &&
      r.rewardType === 'dropLowest' &&
      r.gradeCategory === shopItem.gradeCategory &&
      r.gradingPeriod === currentGradingPeriod
    );
    if (alreadyUsed) {
      return `You already dropped a ${shopItem.gradeCategory} grade in Grading Period ${currentGradingPeriod}. Only one drop per grading period.`;
    }
    return null;
  }

  const dropLimitError = item ? checkDropLimit(item) : null;
  const canSubmit = affordable && !dropLimitError;

  const submit = async () => {
    if (dropLimitError) return;
    const ok = await submitMoleRequest(activeStudent.id, item);
    if (ok) {
      setFlash({ tone: 'success', text: `Locked ${item.cost} ${currencySymbol} for "${item.label}". Sent to ${teacherProfile.name} for approval!` });
    } else {
      setFlash({ tone: 'error', text: `Not enough ${currencyName}s for "${item.label}".` });
    }
    setTimeout(() => setFlash(null), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Balance + milestone */}
      <Card className="overflow-hidden" hairline>
        <div className={`relative bg-gradient-to-r ${theme.gradient} px-5 py-4`}>
          <img src="/gmen-logo.png" alt="" className="mascot-watermark" />
          <div className="relative flex items-center justify-between" style={{ color: classroomDesign.heroText }}>
            <div className="flex items-center gap-2">
              <Coins className="h-6 w-6" />
              <span className="font-display text-sm font-bold uppercase tracking-widest">
                {currencyName} Balance
              </span>
            </div>
            <span className="font-display text-4xl font-bold">{activeStudent.balance}</span>
          </div>
        </div>
        <div className="space-y-2 px-5 py-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Progress to next milestone bonus</span>
            <span className="font-bold text-zinc-50">
              {activeStudent.balance} / {moleMilestone} {currencySymbol}
            </span>
          </div>
          <ProgressBar value={activeStudent.balance} max={moleMilestone} />
          {activeStudent.lockedBalance > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Lock className="h-3.5 w-3.5" />
              <strong className="text-zinc-200">{activeStudent.lockedBalance} {currencySymbol}</strong> locked in
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
                const limitErr = checkDropLimit(opt);
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelected(opt.id)}
                    className={[
                      'flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all',
                      active
                        ? 'border-gold-500/40 bg-gold-500/10 ring-1 ring-gold-500/40'
                        : 'border-white/10 bg-ink-950/40 hover:border-white/20',
                      limitErr ? 'opacity-50' : '',
                    ].join(' ')}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-zinc-50">{opt.label}</span>
                      {opt.rewardType && (
                        <span className="flex items-center gap-1 text-[10px] text-gold-400">
                          {opt.rewardType === 'moleDollarBonus'
                            ? <Zap className="h-2.5 w-2.5" />
                            : <BookOpen className="h-2.5 w-2.5" />}
                          Grade Impact
                        </span>
                      )}
                    </div>
                    <Badge tone="gold">{opt.cost} {currencySymbol}</Badge>
                  </button>
                );
              })}
            </div>

            {/* Grade impact callout */}
            {item?.rewardType && (
              <div className="flex items-start gap-2 rounded-xl border border-blue-500/30 bg-blue-500/8 px-3 py-2.5 text-xs text-blue-300">
                {item.rewardType === 'moleDollarBonus'
                  ? <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                  : <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />}
                <span>
                  <strong className="text-blue-200">Grade effect: </strong>
                  {REWARD_LABELS[item.rewardType]?.(item.gradeCategory) ?? ''}
                  {item.limitPerPeriod && (
                    <span className="ml-1 text-zinc-400">
                      · Period {currentGradingPeriod} · One use per grading period
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Per-period drop limit error */}
            {dropLimitError && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300 animate-pop-in">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{dropLimitError}</span>
              </div>
            )}

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
              disabled={!canSubmit}
              className="font-display flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-sm font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              {dropLimitError
                ? 'Already Used This Period'
                : affordable
                  ? `Submit Request · ${item.cost} ${currencySymbol}`
                  : 'Insufficient Balance'}
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
                      {r.cost} {currencySymbol} · {timeAgo(r.createdAt)}
                    </p>
                    {r.rewardType && (
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-gold-400/80">
                        {r.rewardType === 'moleDollarBonus' ? <Zap className="h-2.5 w-2.5" /> : <BookOpen className="h-2.5 w-2.5" />}
                        {r.rewardType === 'dropLowest' ? `Drop ${r.gradeCategory} · P${r.gradingPeriod}` : 'Grade Bonus'}
                      </p>
                    )}
                    {r.status === 'denied' && r.note && (
                      <p className="mt-1 text-[11px] italic text-red-300/80">"{r.note}"</p>
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
