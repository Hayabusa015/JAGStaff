import React from 'react';
import { Check } from 'lucide-react';
import { TICKET_STATUS } from '../data/mockData.js';

// Horizontal Submitted ➔ In Progress ➔ Completed tracker (gold / neutral only).
export default function StatusTimeline({ status }) {
  const steps = Object.values(TICKET_STATUS).sort((a, b) => a.order - b.order);
  const currentOrder = TICKET_STATUS[status]?.order ?? 0;

  return (
    <div className="flex items-center">
      {steps.map((step, i) => {
        const done = step.order < currentOrder;
        const active = step.order === currentOrder;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'grid h-7 w-7 place-items-center rounded-full text-xs font-bold ring-2 transition-all',
                  done
                    ? 'bg-gold-500 text-ink-950 ring-gold-400'
                    : active
                    ? 'bg-gold-500/20 text-gold-300 ring-gold-400 animate-pulse-ring'
                    : 'bg-ink-750 text-zinc-500 ring-white/10',
                ].join(' ')}
              >
                {done ? <Check className="h-4 w-4" /> : step.order + 1}
              </div>
              <span
                className={`whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide ${
                  active ? 'text-gold-300' : done ? 'text-gold-400' : 'text-zinc-500'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 rounded-full transition-all ${
                  step.order < currentOrder ? 'bg-gold-500' : 'bg-white/10'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
