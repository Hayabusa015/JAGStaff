import React, { useState } from 'react';
import {
  Settings2,
  RotateCcw,
  Plus,
  Trash2,
  Target,
  ShoppingBag,
  Check,
} from 'lucide-react';
import { useApp } from '../../ClassroomContext.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';

function ItemRow({ item, onUpdate, onRemove }) {
  const [label, setLabel] = useState(item.label);
  const [cost, setCost] = useState(String(item.cost));

  const flush = () => {
    const trimmed = label.trim();
    const parsed = Math.max(1, parseInt(cost, 10) || 1);
    if (trimmed !== item.label || parsed !== item.cost) {
      onUpdate(item.id, { label: trimmed || item.label, cost: parsed });
    }
    setCost(String(parsed));
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-ink-950/50 px-3 py-2">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={flush}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-zinc-50 placeholder:text-zinc-600 focus:outline-none"
        placeholder="Item label…"
      />
      <div className="flex shrink-0 items-center gap-1">
        <input
          type="number"
          min="1"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          onBlur={flush}
          className="w-16 rounded-lg border border-white/10 bg-ink-900 px-2 py-1 text-center text-xs font-bold text-gold-300 focus:border-gold-500/50 focus:outline-none"
        />
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">MD</span>
        <button
          onClick={() => onRemove(item.id)}
          className="ml-1 rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/15 hover:text-red-400"
          title="Remove item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AddItemForm({ onAdd, onCancel }) {
  const [label, setLabel] = useState('');
  const [cost, setCost] = useState('');

  const submit = () => {
    const trimmed = label.trim();
    const parsed = Math.max(1, parseInt(cost, 10) || 1);
    if (!trimmed) return;
    onAdd({ label: trimmed, cost: parsed });
    setLabel('');
    setCost('');
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-gold-500/25 bg-gold-500/5 px-3 py-2">
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
        placeholder="New item label…"
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-zinc-50 placeholder:text-zinc-600 focus:outline-none"
      />
      <input
        type="number"
        min="1"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
        placeholder="MD"
        className="w-16 rounded-lg border border-gold-500/30 bg-ink-900 px-2 py-1 text-center text-xs font-bold text-gold-300 placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
      />
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">MD</span>
      <button
        onClick={submit}
        disabled={!label.trim()}
        className="rounded-lg bg-gold-500 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onCancel}
        className="rounded-lg bg-ink-750 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400 hover:bg-ink-700"
      >
        ✕
      </button>
    </div>
  );
}

export default function MoleEconSettings() {
  const {
    moleMilestone,
    shopItems,
    updateMoleMilestone,
    addShopItem,
    updateShopItem,
    removeShopItem,
    resetMoleEconomy,
    currencyName,
  } = useApp();

  const [milestoneInput, setMilestoneInput] = useState(String(moleMilestone));
  const [showAdd, setShowAdd] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const flushMilestone = () => {
    const n = Math.max(1, parseInt(milestoneInput, 10) || moleMilestone);
    updateMoleMilestone(n);
    setMilestoneInput(String(n));
  };

  const handleReset = () => {
    if (confirmReset) {
      resetMoleEconomy();
      setMilestoneInput(String(moleMilestone));
      setConfirmReset(false);
      setShowAdd(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader
        title="Economy Settings"
        subtitle="Milestone target and shop item catalog"
        icon={Settings2}
        action={
          <button
            onClick={handleReset}
            className={`font-display flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all ${
              confirmReset
                ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40'
                : 'bg-ink-750 text-zinc-300 hover:bg-ink-700'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {confirmReset ? 'Confirm Reset' : 'Defaults'}
          </button>
        }
      />

      <div className="space-y-6 p-5">
        {/* ── Milestone target ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-gold-400" />
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Milestone Target
            </p>
          </div>
          <p className="text-[11px] text-zinc-500">
            Students see a progress bar toward this amount — reaching it triggers the test-bonus milestone.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              value={milestoneInput}
              onChange={(e) => setMilestoneInput(e.target.value)}
              onBlur={flushMilestone}
              onKeyDown={(e) => { if (e.key === 'Enter') flushMilestone(); }}
              className="w-24 rounded-xl border border-gold-500/30 bg-ink-900 px-3 py-2 text-center font-display text-xl font-bold text-gold-300 focus:border-gold-500 focus:outline-none"
            />
            <span className="text-sm font-semibold text-zinc-400">{currencyName}s</span>
          </div>
        </div>

        <hr className="border-white/8" />

        {/* ── Shop items ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-gold-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Shop Items
              </p>
              <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                {shopItems.length}
              </span>
            </div>
            {!showAdd && (
              <button
                onClick={() => setShowAdd(true)}
                className="font-display flex items-center gap-1 rounded-lg bg-gold-500/10 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gold-300 ring-1 ring-gold-500/30 transition-all hover:bg-gold-500/20"
              >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </button>
            )}
          </div>

          <p className="text-[11px] text-zinc-500">
            Edit labels and costs inline — changes save on blur. Students see these in the Cash-In Shop.
          </p>

          <div className="space-y-2">
            {shopItems.length === 0 && (
              <p className="rounded-xl border border-white/8 px-4 py-6 text-center text-sm text-zinc-600">
                No items — add one below or reset to defaults.
              </p>
            )}
            {shopItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onUpdate={updateShopItem}
                onRemove={removeShopItem}
              />
            ))}
            {showAdd && (
              <AddItemForm
                onAdd={(item) => { addShopItem(item); setShowAdd(false); }}
                onCancel={() => setShowAdd(false)}
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
