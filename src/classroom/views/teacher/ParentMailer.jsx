import React, { useMemo, useState } from 'react';
import {
  Mail,
  Sparkles,
  ThumbsUp,
  AlertTriangle,
  Send,
  CheckCircle2,
  Wand2,
  History,
} from 'lucide-react';
import { useApp } from '../../ClassroomContext.jsx';
import Card, { CardHeader } from '../../components/Card.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { timeAgo } from '../../utils/format.js';

export default function ParentMailer({ embedded = false }) {
  const {
    classes,
    students,
    behaviorScenarios,
    generateEmailDraft,
    sendParentEmail,
    emailLog,
  } = useApp();

  const [classId, setClassId] = useState(classes[0].id);
  const [studentId, setStudentId] = useState(
    students.find((s) => s.classId === classes[0].id)?.id
  );
  const [tone, setTone] = useState('positive');
  const [scenario, setScenario] = useState(behaviorScenarios.positive[0]);
  const [notes, setNotes] = useState('');
  const [draft, setDraft] = useState(null);
  const [sentFlash, setSentFlash] = useState(null);

  const roster = useMemo(
    () => students.filter((s) => s.classId === classId),
    [students, classId]
  );

  const onClassChange = (id) => {
    setClassId(id);
    const first = students.find((s) => s.classId === id);
    setStudentId(first?.id);
    setDraft(null);
  };

  const onToneChange = (t) => {
    setTone(t);
    setScenario(behaviorScenarios[t][0]);
    setDraft(null);
  };

  const generate = () => {
    const d = generateEmailDraft(studentId, tone, scenario, notes);
    setDraft(d);
    setSentFlash(null);
  };

  const send = () => {
    const student = students.find((s) => s.id === studentId);
    const entry = sendParentEmail(draft, {
      studentName: student?.name,
      tone,
      scenario,
    });
    setSentFlash(entry);
  };

  const scenarioList = behaviorScenarios[tone];

  return (
    <div className={embedded ? '' : 'grid gap-5 lg:grid-cols-5'}>
      <div className={embedded ? '' : 'lg:col-span-2'}>
        <Card>
          <CardHeader title="Compose" subtitle="Auto-draft a parent note" icon={Wand2} />
          <div className="space-y-4 p-5">
            {/* Class filter */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">Class Period</label>
              <select
                value={classId}
                onChange={(e) => onClassChange(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Period {c.period} · {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Student */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">Student</label>
              <select
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value);
                  setDraft(null);
                }}
                className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
              >
                {roster.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tone toggle */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">Behavior Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onToneChange('positive')}
                  className={[
                    'font-display flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold uppercase tracking-wide transition-all',
                    tone === 'positive'
                      ? 'border-gold-500/40 bg-gold-500/15 text-gold-300'
                      : 'border-white/10 text-zinc-400 hover:border-white/20',
                  ].join(' ')}
                >
                  <ThumbsUp className="h-4 w-4" /> Positive Praise
                </button>
                <button
                  onClick={() => onToneChange('constructive')}
                  className={[
                    'font-display flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold uppercase tracking-wide transition-all',
                    tone === 'constructive'
                      ? 'border-red-500/40 bg-red-500/10 text-red-300'
                      : 'border-white/10 text-zinc-400 hover:border-white/20',
                  ].join(' ')}
                >
                  <AlertTriangle className="h-4 w-4" /> Constructive
                </button>
              </div>
            </div>

            {/* Scenario */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">Scenario</label>
              <select
                value={scenario}
                onChange={(e) => {
                  setScenario(e.target.value);
                  setDraft(null);
                }}
                className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
              >
                {scenarioList.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                Quick Notes <span className="text-zinc-500">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything to personalize the message…"
                className="w-full resize-none rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-gold-500 focus:outline-none"
              />
            </div>

            <button
              onClick={generate}
              className="font-display flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-sm font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400"
            >
              <Sparkles className="h-4 w-4" /> Generate Email Draft
            </button>
          </div>
        </Card>
      </div>

      {/* Draft preview */}
      <div className={embedded ? 'mt-5' : 'lg:col-span-3 space-y-5'}>
        <Card hairline>
          <CardHeader title="Email Draft" subtitle="Addressed to saved guardian" icon={Mail} />
          <div className="p-5">
            {!draft ? (
              <EmptyState
                icon={Wand2}
                title="No draft yet"
                subtitle="Pick a student and scenario, then generate a polished, ready-to-send message."
              />
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge tone="neutral">To: {draft.to}</Badge>
                  <Badge tone={tone === 'positive' ? 'gold' : 'red'}>
                    {tone === 'positive' ? 'Positive Praise' : 'Constructive'}
                  </Badge>
                </div>
                <div className="rounded-xl border border-white/10 bg-ink-950/60 p-4">
                  <p className="mb-2 border-b border-white/10 pb-2 text-sm font-bold text-zinc-50">
                    Subject: {draft.subject}
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-300">
                    {draft.body}
                  </pre>
                </div>

                {sentFlash ? (
                  <div className="flex items-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-sm text-gold-300 animate-pop-in">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                      <p className="font-bold">Sent via Gmail API ✓</p>
                      <p className="text-[11px] text-gold-300/70">
                        Delivered to {sentFlash.to} · {timeAgo(sentFlash.sentAt)} ·{' '}
                        <span className="font-mono">200 OK (simulated)</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={send}
                    className="font-display flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-sm font-bold uppercase tracking-wide text-ink-950 shadow-gold transition-all hover:bg-gold-400"
                  >
                    <Send className="h-4 w-4" /> Send via Gmail API
                  </button>
                )}
              </div>
            )}
          </div>
        </Card>

        {!embedded && (
          <Card>
            <CardHeader title="Sent Log" subtitle="Simulated delivery history" icon={History} />
            <div className="divide-y divide-white/5">
              {emailLog.length === 0 ? (
                <EmptyState icon={Mail} title="No emails sent yet" />
              ) : (
                emailLog.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-50">{m.subject}</p>
                      <p className="text-[11px] text-zinc-500">
                        {m.studentName} · {m.to} · {timeAgo(m.sentAt)}
                      </p>
                    </div>
                    <Badge tone="goldSolid" icon={CheckCircle2}>
                      Sent
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
