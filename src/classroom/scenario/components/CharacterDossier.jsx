import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ALLY_THRESHOLD = 8;
const WARY_THRESHOLD = 3;

function trustColor(trust) {
  if (trust >= ALLY_THRESHOLD) return { bar: 'bg-gold-400', text: 'text-gold-300' };
  if (trust <= WARY_THRESHOLD) return { bar: 'bg-red-500', text: 'text-red-300' };
  return { bar: 'bg-zinc-400', text: 'text-zinc-300' };
}

export default function CharacterDossier({ characters, charTrust }) {
  const [openId, setOpenId] = useState(null);
  return (
    <div className="space-y-2">
      {characters.map((c) => {
        const trust = charTrust[c.id] ?? c.startingTrust;
        const colors = trustColor(trust);
        const open = openId === c.id;
        return (
          <div key={c.id} className="rounded-xl border border-white/10 bg-ink-850/60">
            <button
              onClick={() => setOpenId(open ? null : c.id)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-750 font-display text-xs font-bold text-zinc-200 ring-1 ring-white/10">
                {c.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-zinc-100">{c.name}</p>
                  <span className={`shrink-0 font-display text-sm font-bold ${colors.text}`}>{trust}/10</span>
                </div>
                <p className="truncate text-[11px] text-zinc-500">{c.role}</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
                  <div className={`h-full rounded-full ${colors.bar} transition-all duration-500`} style={{ width: `${trust * 10}%` }} />
                </div>
              </div>
              {open ? <ChevronUp className="h-4 w-4 shrink-0 text-zinc-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />}
            </button>
            {open && (
              <div className="space-y-2 border-t border-white/5 px-3 py-3 text-xs text-zinc-400">
                <p>{c.bio}</p>
                <p className="italic text-zinc-500">Voice: {c.voice}</p>
                <p className="rounded-lg bg-ink-950/60 px-3 py-2 text-zinc-300">{c.quote}</p>
                {trust >= ALLY_THRESHOLD && (
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gold-400">Ally — will back the team publicly</p>
                )}
                {trust <= WARY_THRESHOLD && (
                  <p className="text-[11px] font-bold uppercase tracking-wide text-red-400">Wary — trust has been damaged</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
