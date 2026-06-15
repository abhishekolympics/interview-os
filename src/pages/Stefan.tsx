import { useState, useCallback, useEffect } from 'react';
import { stefanScripts, type StefanPreset, type StefanScript } from '../data/stefan';
import { loadState, saveState } from '../data/sm2';
import Badge from '../components/Badge';

type Phase = 'select' | 'interview' | 'done';

const presetMeta: Record<StefanPreset, { label: string; desc: string; color: string; badge: string }> = {
  'warm-up': {
    label: 'Warm-Up',
    desc: 'Foundational questions with no tricks. Build confidence.',
    color: 'border-accent-500/30 bg-accent-500/10 hover:bg-accent-500/15',
    badge: 'accent',
  },
  'standard': {
    label: 'Standard',
    desc: 'The real interview. Probing follow-ups, exact-detail questions.',
    color: 'border-brand-500/30 bg-brand-500/10 hover:bg-brand-500/15',
    badge: 'brand',
  },
  'brutal': {
    label: 'Brutal',
    desc: 'Catch-the-mistake, edge cases, and gotcha questions. Full pressure.',
    color: 'border-danger-400/30 bg-danger-400/10 hover:bg-danger-400/15',
    badge: 'danger',
  },
};

const stefanAvatarText: Record<StefanPreset, string[]> = {
  'warm-up': [
    "Let's start simple. I want to understand what you built.",
    "Good. Keep going.",
    "Walk me through it.",
  ],
  'standard': [
    "Interesting. But what about—",
    "Stop. That's not precise enough.",
    "Name them exactly.",
    "I'm going to need more detail.",
  ],
  'brutal': [
    "Wrong. Try again.",
    "Are you sure about that?",
    "That's not what the code says.",
    "You just described the Interview version. Try again with yours.",
    "Stop. That's not what I asked.",
  ],
};

function getRandomStefanLine(preset: StefanPreset): string {
  const lines = stefanAvatarText[preset];
  return lines[Math.floor(Math.random() * lines.length)];
}

function QCard({
  script,
  onRate,
  idx,
  total,
  sessionPreset,
}: {
  script: StefanScript;
  onRate: (q: number) => void;
  idx: number;
  total: number;
  sessionPreset: StefanPreset;
}) {
  const [revealed, setReveal] = useState(false);
  const [answer, setAnswer] = useState('');

  const ratings = [
    { q: 0, label: 'Blackout', desc: 'No idea', color: 'text-red-400 border-red-500/30 hover:bg-red-500/10' },
    { q: 2, label: 'Wrong', desc: 'Got it wrong', color: 'text-orange-400 border-orange-500/30 hover:bg-orange-500/10' },
    { q: 3, label: 'Hard', desc: 'Correct with effort', color: 'text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10' },
    { q: 4, label: 'Good', desc: 'Correct', color: 'text-accent-400 border-accent-500/30 hover:bg-accent-500/10' },
    { q: 5, label: 'Easy', desc: 'Perfect', color: 'text-brand-400 border-brand-500/30 hover:bg-brand-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-gray-600 font-mono">
        <span>Question {idx + 1} of {total}</span>
        <span className="capitalize">{script.preset} · {script.type}</span>
      </div>
      <div className="h-0.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full bg-brand-500 transition-all duration-300"
          style={{ width: `${((idx) / total) * 100}%` }}
        />
      </div>

      {/* Stefan's question */}
      <div className="rounded-2xl border border-gray-800 bg-surface-900 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-lg font-bold text-white">
            S
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Stefan</p>
            <p className="text-xs text-gray-600 capitalize">{presetMeta[sessionPreset].label} mode</p>
          </div>
        </div>
        <blockquote className="text-base text-gray-100 leading-relaxed border-l-2 border-brand-500 pl-4">
          {script.text}
        </blockquote>
        {script.type === 'catch-the-mistake' && (
          <div className="flex items-center gap-2 text-xs text-warn-400 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
            <span>⚠</span>
            <span>Catch-the-mistake: something in the description above is intentionally wrong. Find all errors.</span>
          </div>
        )}
      </div>

      {/* Answer textarea */}
      {!revealed && (
        <div className="space-y-3">
          <label className="text-xs text-gray-600">Your answer (optional — helps with recall)</label>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Type your answer here before revealing..."
            className="w-full h-28 rounded-xl border border-gray-800 bg-surface-900 px-4 py-3 text-sm text-gray-200 placeholder-gray-700 resize-none focus:outline-none focus:border-brand-500/50 transition-colors"
          />
          <button
            onClick={() => setReveal(true)}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
          >
            Reveal Stefan's Answer
          </button>
        </div>
      )}

      {/* Revealed answer */}
      {revealed && script.correctAnswer && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-accent-500/30 bg-accent-500/5 p-6 space-y-3">
            <p className="text-xs font-mono text-accent-400 uppercase tracking-wider">Model Answer</p>
            <p className="text-sm text-gray-200 leading-relaxed">{script.correctAnswer}</p>
          </div>

          {answer.trim() && (
            <div className="rounded-xl border border-gray-800 bg-surface-900 p-4 space-y-1">
              <p className="text-xs text-gray-600">Your answer</p>
              <p className="text-sm text-gray-400 leading-relaxed">{answer}</p>
            </div>
          )}

          {/* Rating */}
          <div className="space-y-2">
            <p className="text-xs text-gray-600">How well did you know this?</p>
            <div className="grid grid-cols-5 gap-2">
              {ratings.map(r => (
                <button
                  key={r.q}
                  onClick={() => onRate(r.q)}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-3 px-2 text-xs transition-colors ${r.color}`}
                >
                  <span className="font-semibold">{r.label}</span>
                  <span className="opacity-60 hidden sm:inline text-center">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Stefan() {
  const [phase, setPhase] = useState<Phase>('select');
  const [preset, setPreset] = useState<StefanPreset>('standard');
  const [queue, setQueue] = useState<StefanScript[]>([]);
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [stefanLine, setStefanLine] = useState('');

  const startSession = useCallback(() => {
    const filtered = stefanScripts.filter(s => {
      if (preset === 'warm-up') return s.preset === 'warm-up';
      if (preset === 'standard') return s.preset === 'warm-up' || s.preset === 'standard';
      return true;
    });
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, 10);
    setQueue(shuffled);
    setIdx(0);
    setScores([]);
    setStefanLine(getRandomStefanLine(preset));
    setPhase('interview');
  }, [preset]);

  const handleRate = useCallback((q: number) => {
    setScores(prev => [...prev, q]);
    if (idx + 1 >= queue.length) {
      // Save to state
      const state = loadState();
      state.stefanSessions += 1;
      saveState(state);
      setPhase('done');
    } else {
      setIdx(i => i + 1);
      setStefanLine(getRandomStefanLine(preset));
    }
  }, [idx, queue.length, preset]);

  const avgScore = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : '—';

  const rating =
    parseFloat(avgScore) >= 4.5 ? { label: 'Excellent', color: 'text-accent-400' } :
    parseFloat(avgScore) >= 3.5 ? { label: 'Good', color: 'text-brand-400' } :
    parseFloat(avgScore) >= 2.5 ? { label: 'Needs Work', color: 'text-warn-400' } :
    { label: 'Study More', color: 'text-danger-400' };

  // Escape key to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'interview') setPhase('select');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

      {phase === 'select' && (
        <div className="space-y-8">
          <div className="space-y-3">
            <Badge color="brand">Stefan Simulator</Badge>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Adversarial Interview</h1>
            <p className="text-gray-400 max-w-lg">
              Stefan is a hostile senior engineer. He will interrupt, challenge, and catch your mistakes.
              Select your difficulty and face him.
            </p>
          </div>

          {/* Preset selector */}
          <div className="space-y-3">
            <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">Difficulty</p>
            <div className="space-y-2">
              {(Object.keys(presetMeta) as StefanPreset[]).map(p => {
                const meta = presetMeta[p];
                const count = stefanScripts.filter(s => {
                  if (p === 'warm-up') return s.preset === 'warm-up';
                  if (p === 'standard') return s.preset === 'warm-up' || s.preset === 'standard';
                  return true;
                }).length;
                return (
                  <button
                    key={p}
                    onClick={() => setPreset(p)}
                    className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${meta.color} ${
                      preset === p ? 'ring-1 ring-offset-1 ring-offset-surface-950 ring-brand-500/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${
                          preset === p ? 'bg-brand-400' : 'bg-gray-700'
                        }`} />
                        <span className="text-sm font-semibold text-white">{meta.label}</span>
                      </div>
                      <span className="text-xs text-gray-600 font-mono">{Math.min(count, 10)} questions</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 ml-6">{meta.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stefan intro card */}
          <div className="rounded-2xl border border-gray-800 bg-surface-900 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xl font-bold text-white">
                S
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Stefan</p>
                <p className="text-xs text-gray-600">Senior Engineer, Red Planet Platform</p>
              </div>
            </div>
            <blockquote className="text-sm text-gray-300 leading-relaxed border-l-2 border-gray-700 pl-4 italic">
              "Tell me about what you built. And I mean actually built — not what the spec said, not what you read.
              What did your hands write, and why."
            </blockquote>
          </div>

          <button
            onClick={startSession}
            className="w-full py-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors text-base"
          >
            Begin Session →
          </button>
        </div>
      )}

      {phase === 'interview' && queue[idx] && (
        <div className="space-y-6">
          {/* Stefan reaction line */}
          {stefanLine && idx > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-surface-900 px-4 py-3 text-sm text-gray-400 italic">
              <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white shrink-0">S</span>
              "{stefanLine}"
            </div>
          )}

          <QCard
            key={queue[idx].id}
            script={queue[idx]}
            onRate={handleRate}
            idx={idx}
            total={queue.length}
            sessionPreset={preset}
          />

          <button
            onClick={() => setPhase('select')}
            className="text-xs text-gray-700 hover:text-gray-500 transition-colors"
          >
            ← Exit session (Esc)
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-8">
          <div className="space-y-3">
            <Badge color="accent">Session Complete</Badge>
            <h1 className="text-3xl font-bold text-white">Stefan's Verdict</h1>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-surface-900 p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl font-bold text-white mx-auto">
              S
            </div>
            <div>
              <p className={`text-5xl font-bold tabular-nums ${rating.color}`}>{avgScore}</p>
              <p className="text-sm text-gray-500 mt-1">Average quality score (0–5)</p>
            </div>
            <p className={`text-lg font-semibold ${rating.color}`}>{rating.label}</p>
            <p className="text-sm text-gray-500 italic">
              {parseFloat(avgScore) >= 4
                ? '"Not bad. Come back when you can do it under pressure."'
                : parseFloat(avgScore) >= 3
                ? '"You\'re getting there. More precision on the details."'
                : '"Study the source code. Come back tomorrow."'}
            </p>
          </div>

          {/* Score breakdown */}
          <div className="space-y-2">
            <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">Question Breakdown</p>
            {scores.map((score, i) => {
              const q = queue[i];
              const label = ['Blackout', 'Wrong', 'Wrong-Easy', 'Hard', 'Good', 'Easy'][score];
              const c = score >= 4 ? 'text-accent-400' : score >= 3 ? 'text-warn-400' : 'text-danger-400';
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-surface-900 px-4 py-3">
                  <span className="text-xs font-mono text-gray-600 w-4">{i + 1}</span>
                  <p className="text-xs text-gray-300 flex-1 truncate">{q?.text.slice(0, 60)}…</p>
                  <span className={`text-xs font-mono font-semibold ${c}`}>{label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={startSession}
              className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
            >
              New Session
            </button>
            <button
              onClick={() => setPhase('select')}
              className="flex-1 py-3 rounded-xl border border-gray-800 bg-surface-900 text-sm font-medium text-gray-400 hover:border-gray-700 transition-colors"
            >
              Change Preset
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
