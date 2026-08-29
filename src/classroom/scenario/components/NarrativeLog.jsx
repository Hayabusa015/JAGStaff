import { useEffect, useRef } from 'react';
import { Sparkles, ScrollText, Gavel, Radio, FlagTriangleRight, Landmark } from 'lucide-react';

const KIND_META = {
  coldopen: { icon: ScrollText, label: 'Scene', style: 'italic' },
  gate: { icon: Sparkles, label: 'Evidence', style: '' },
  beat: { icon: Radio, label: '', style: '' },
  decision: { icon: Gavel, label: 'Decision', style: '' },
  closing: { icon: FlagTriangleRight, label: 'Meanwhile', style: 'italic' },
  reveal: { icon: Landmark, label: 'The Reveal', style: '' },
};

export default function NarrativeLog({ entries, showTeachNotes = false, autoScroll = true }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries.length, autoScroll]);

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const meta = KIND_META[entry.kind] || KIND_META.beat;
        const Icon = meta.icon;
        const lines = Array.isArray(entry.text) ? entry.text.filter(Boolean) : [entry.text].filter(Boolean);
        return (
          <div key={entry.id} className="rounded-xl border border-white/10 bg-ink-850/50 px-4 py-3">
            <div className="mb-1.5 flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 shrink-0 text-gold-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-500/90">
                {meta.label || entry.title}
              </span>
              {meta.label && entry.title && (
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">· {entry.title}</span>
              )}
              {entry.correct === false && (
                <span className="ml-auto rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-red-300 ring-1 ring-red-500/40">Miss</span>
              )}
              {entry.correct === true && (
                <span className="ml-auto rounded-full bg-gold-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-gold-300 ring-1 ring-gold-500/40">Correct</span>
              )}
            </div>
            <div className={`space-y-2 text-sm leading-relaxed text-zinc-300 ${meta.style}`}>
              {lines.map((line, i) => <p key={i}>{line}</p>)}
            </div>
            {showTeachNotes && entry.teachNote && (
              <p className="mt-2 rounded-lg bg-gold-500/10 px-3 py-2 text-xs text-gold-200 ring-1 ring-gold-500/20">
                <span className="font-bold uppercase tracking-wide">Teach this: </span>{entry.teachNote}
              </p>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
