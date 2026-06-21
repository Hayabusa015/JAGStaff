import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Layers,
  ListChecks,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Wand2,
  Trophy,
} from 'lucide-react';
import { generateStudyTool, hasStudyContent } from '../utils/studyGenerator.js';
import Badge from './Badge.jsx';
import EmptyState from './EmptyState.jsx';

export default function StudyToolGenerator({ materials }) {
  const eligible = useMemo(() => materials.filter(hasStudyContent), [materials]);
  const [selected, setSelected] = useState(() => new Set(eligible.map((m) => m.id)));
  const [formats, setFormats] = useState({ flashcards: true, mcq: true });
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState('flashcards');

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const chosen = materials.filter((m) => selected.has(m.id));
  const canGenerate =
    chosen.length > 0 && (formats.flashcards || formats.mcq) && eligible.length > 0;

  const generate = () => {
    const out = generateStudyTool(chosen, formats);
    setResult(out);
    setTab(formats.flashcards && out.flashcards.length ? 'flashcards' : 'quiz');
  };

  if (eligible.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-ink-950/40 p-2">
        <EmptyState
          icon={Wand2}
          title="No study content yet"
          subtitle="Upload a PDF or add key terms / study content to a material, then generate flashcards & quizzes here."
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gold-500/25 bg-gradient-to-b from-gold-500/[0.06] to-transparent p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gold-500/15 text-gold-400 ring-1 ring-gold-500/30">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h4 className="font-display text-sm font-bold uppercase tracking-wide text-zinc-50">
            Generate Study Tool
          </h4>
          <p className="text-[11px] text-zinc-500">
            Pick the content, choose formats, and build a study set.
          </p>
        </div>
      </div>

      {/* Material picker */}
      <div className="mb-3 grid gap-1.5 sm:grid-cols-2">
        {eligible.map((m) => {
          const on = selected.has(m.id);
          const termCount = (m.keyTerms?.length || 0);
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              className={[
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all',
                on
                  ? 'border-gold-500/40 bg-gold-500/10'
                  : 'border-white/10 bg-ink-950/40 hover:border-white/20',
              ].join(' ')}
            >
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                  on ? 'border-gold-400 bg-gold-500 text-ink-950' : 'border-white/25'
                }`}
              >
                {on && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-zinc-200">{m.title}</span>
              {termCount > 0 && <Badge tone="neutral">{termCount} terms</Badge>}
            </button>
          );
        })}
      </div>

      {/* Format toggles + generate */}
      <div className="flex flex-wrap items-center gap-2">
        <FormatToggle
          active={formats.flashcards}
          onClick={() => setFormats((f) => ({ ...f, flashcards: !f.flashcards }))}
          icon={Layers}
          label="Flashcards"
        />
        <FormatToggle
          active={formats.mcq}
          onClick={() => setFormats((f) => ({ ...f, mcq: !f.mcq }))}
          icon={ListChecks}
          label="Multiple Choice"
        />
        <button
          onClick={generate}
          disabled={!canGenerate}
          className="font-display ml-auto flex items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" /> {result ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-4 animate-fade-in">
          {result.termCount === 0 ? (
            <EmptyState
              icon={Wand2}
              title="Couldn't find study terms"
              subtitle="Add key terms or 'Term: definition' lines to the selected materials and try again."
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone="goldSolid">{result.termCount} terms</Badge>
                {result.flashcards.length > 0 && (
                  <Badge tone="gold">{result.flashcards.length} flashcards</Badge>
                )}
                {result.mcqs.length > 0 && <Badge tone="gold">{result.mcqs.length} questions</Badge>}
                <span className="text-[10px] text-zinc-600">from {result.sources.join(', ')}</span>
              </div>

              <div className="mb-3 flex gap-2">
                {result.flashcards.length > 0 && (
                  <TabBtn active={tab === 'flashcards'} onClick={() => setTab('flashcards')} icon={Layers}>
                    Flashcards
                  </TabBtn>
                )}
                {result.mcqs.length > 0 && (
                  <TabBtn active={tab === 'quiz'} onClick={() => setTab('quiz')} icon={ListChecks}>
                    Quiz
                  </TabBtn>
                )}
              </div>

              {tab === 'flashcards' && result.flashcards.length > 0 && (
                <Flashcards cards={result.flashcards} />
              )}
              {tab === 'quiz' && result.mcqs.length > 0 && <Quiz questions={result.mcqs} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FormatToggle({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all',
        active
          ? 'border-gold-500/40 bg-gold-500/15 text-gold-300'
          : 'border-white/10 text-zinc-400 hover:border-white/20',
      ].join(' ')}
    >
      <span
        className={`grid h-4 w-4 place-items-center rounded border ${
          active ? 'border-gold-400 bg-gold-500 text-ink-950' : 'border-white/25'
        }`}
      >
        {active && <Check className="h-3 w-3" />}
      </span>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        'font-display flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all',
        active ? 'bg-gold-500 text-ink-950' : 'bg-ink-750 text-zinc-300 hover:text-white',
      ].join(' ')}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

// ---- Flashcards (flip + navigate) -------------------------------------------
function Flashcards({ cards }) {
  const [order, setOrder] = useState(cards);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const go = (delta) => {
    setFlipped(false);
    setI((prev) => (prev + delta + order.length) % order.length);
  };
  const reshuffle = () => {
    const s = [...order].sort(() => Math.random() - 0.5);
    setOrder(s);
    setI(0);
    setFlipped(false);
  };

  const card = order[i];

  return (
    <div>
      <button
        onClick={() => setFlipped((f) => !f)}
        className="group relative flex min-h-[9rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-gold-500/30 bg-ink-900/70 px-6 py-6 text-center transition-all hover:border-gold-500/50"
      >
        <span className="absolute left-3 top-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          {flipped ? 'Definition' : 'Term'}
        </span>
        {!flipped ? (
          <span className="font-display text-xl font-bold text-zinc-50">{card.front}</span>
        ) : (
          <span className="text-sm leading-relaxed text-zinc-200">{card.back}</span>
        )}
        <span className="mt-1 text-[10px] uppercase tracking-wide text-gold-500/70">
          Tap to {flipped ? 'see term' : 'reveal'}
        </span>
      </button>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => go(-1)}
          className="grid h-9 w-9 place-items-center rounded-lg bg-ink-750 text-zinc-200 hover:bg-ink-700"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-bold text-zinc-300">
            {i + 1} / {order.length}
          </span>
          <button
            onClick={reshuffle}
            className="flex items-center gap-1 rounded-lg bg-ink-750 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-300 hover:text-gold-300"
          >
            <RotateCw className="h-3.5 w-3.5" /> Shuffle
          </button>
        </div>
        <button
          onClick={() => go(1)}
          className="grid h-9 w-9 place-items-center rounded-lg bg-ink-750 text-zinc-200 hover:bg-ink-700"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ---- Multiple-choice quiz (instant feedback + score) ------------------------
function Quiz({ questions }) {
  const [answers, setAnswers] = useState({}); // qId -> chosen option
  const answeredCount = Object.keys(answers).length;
  const score = questions.reduce(
    (n, q) => (answers[q.id] === q.answer ? n + 1 : n),
    0
  );
  const done = answeredCount === questions.length;

  const choose = (q, opt) => {
    if (answers[q.id]) return; // lock after first answer
    setAnswers((prev) => ({ ...prev, [q.id]: opt }));
  };
  const reset = () => setAnswers({});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-950/50 px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Trophy className={`h-4 w-4 ${done ? 'text-gold-400' : 'text-zinc-500'}`} />
          <span className="font-display font-bold text-zinc-100">
            Score: {score} / {questions.length}
          </span>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1 rounded-lg bg-ink-750 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-300 hover:text-gold-300"
        >
          <RotateCw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      {questions.map((q, qi) => {
        const chosen = answers[q.id];
        return (
          <div key={q.id} className="rounded-xl border border-white/10 bg-ink-950/40 p-3">
            <p className="mb-2 text-sm text-zinc-200">
              <span className="font-display font-bold text-gold-400">Q{qi + 1}.</span> {q.prompt}
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {q.options.map((opt) => {
                const isChosen = chosen === opt;
                const isCorrect = opt === q.answer;
                let cls = 'border-white/10 bg-ink-900/60 text-zinc-200 hover:border-white/25';
                if (chosen) {
                  if (isCorrect) cls = 'border-gold-500/50 bg-gold-500/15 text-gold-200';
                  else if (isChosen) cls = 'border-red-500/50 bg-red-500/15 text-red-200';
                  else cls = 'border-white/5 bg-ink-900/40 text-zinc-500';
                }
                return (
                  <button
                    key={opt}
                    onClick={() => choose(q, opt)}
                    disabled={!!chosen}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-all ${cls} ${
                      chosen ? 'cursor-default' : ''
                    }`}
                  >
                    <span>{opt}</span>
                    {chosen && isCorrect && <Check className="h-4 w-4 shrink-0 text-gold-400" />}
                    {chosen && isChosen && !isCorrect && <X className="h-4 w-4 shrink-0 text-red-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
