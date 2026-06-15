import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepo } from '../contexts/RepoContext';
import type { StefanScript } from '../types/repo';
import { getStefanKey } from '../data/sm2';
import Badge from '../components/Badge';

type Difficulty = 'warmup' | 'standard' | 'brutal';
type Phase = 'select' | 'interview' | 'done';

const difficultyMeta: Record<Difficulty, {
  label: string;
  desc: string;
  borderColor: string;
  bgColor: string;
  hoverBg: string;
  ringColor: string;
}> = {
  warmup: {
    label: 'Warm-Up',
    desc: 'Foundational questions with no tricks. Build confidence.',
    borderColor: 'border-accent-500/30',
    bgColor: 'bg-accent-500/10',
    hoverBg: 'hover:bg-accent-500/15',
    ringColor: 'ring-accent-500/40',
  },
  standard: {
    label: 'Standard',
    desc: 'The real interview. Probing follow-ups, exact-detail questions.',
    borderColor: 'border-brand-500/30',
    bgColor: 'bg-brand-500/10',
    hoverBg: 'hover:bg-brand-500/15',
    ringColor: 'ring-brand-500/40',
  },
  brutal: {
    label: 'Brutal',
    desc: 'Catch-the-mistake, edge cases, and gotcha questions. Full pressure.',
    borderColor: 'border-danger-400/30',
    bgColor: 'bg-danger-400/10',
    hoverBg: 'hover:bg-danger-400/15',
    ringColor: 'ring-danger-400/40',
  },
};

const stefanReactions: Record<Difficulty, string[]> = {
  warmup: [
    "Let's start simple. I want to understand what you built.",
    "Good. Keep going.",
    "Walk me through it.",
  ],
  standard: [
    "Interesting. But what about—",
    "Stop. That's not precise enough.",
    "Name them exactly.",
    "I'm going to need more detail.",
  ],
  brutal: [
    "Wrong. Try again.",
    "Are you sure about that?",
    "That's not what the code says.",
    "You just described the Interview version. Try again with yours.",
    "Stop. That's not what I asked.",
  ],
};

function getRandomReaction(difficulty: Difficulty): string {
  const lines = stefanReactions[difficulty];
  return lines[Math.floor(Math.random() * lines.length)];
}

function filterScripts(scripts: StefanScript[], difficulty: Difficulty): StefanScript[] {
  if (difficulty === 'warmup') return scripts.filter(s => s.difficulty === 'warmup');
  if (difficulty === 'standard') return scripts.filter(s => s.difficulty === 'warmup' || s.difficulty === 'standard');
  return scripts; // brutal includes everything including 'catch'
}

// ── QCard ─────────────────────────────────────────────────────────────────────

function QCard({
  script,
  onRate,
  idx,
  total,
  sessionDifficulty,
}: {
  script: StefanScript;
  onRate: (q: number) => void;
  idx: number;
  total: number;
  sessionDifficulty: Difficulty;
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

  const isCatch = script.difficulty === 'catch';
  const questionText = script.questions[0] ?? script.setup;
  const modelAnswer = script.keyPoints[0] ?? '';
  const hint = script.hints?.[0];

  return (
    <motion.div
      key={script.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="space-y-6"
    >
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-gray-600 font-mono">
        <span>Question {idx + 1} of {total}</span>
        <span className="capitalize">{difficultyMeta[sessionDifficulty].label} · {script.topic}</span>
      </div>
      <div className="h-0.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full bg-brand-500 transition-all duration-500"
          style={{ width: `${(idx / total) * 100}%` }}
        />
      </div>

      {/* Stefan's question bubble */}
      <div className="rounded-2xl border border-gray-800 bg-surface-900 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-lg font-bold text-white">
              S
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand-500 border-2 border-surface-950" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Stefan</p>
            <p className="text-xs text-gray-600 capitalize">{difficultyMeta[sessionDifficulty].label} mode</p>
          </div>
        </div>
        <blockquote className="text-base text-gray-100 leading-relaxed border-l-2 border-brand-500 pl-4">
          {questionText}
        </blockquote>

        {isCatch && (
          <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
            <span>⚠</span>
            <span>Catch-the-mistake: something in the description above is intentionally wrong. Find all errors.</span>
          </div>
        )}

        {hint && !revealed && (
          <details className="group">
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 transition-colors select-none list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">›</span>
              Show hint
            </summary>
            <p className="text-xs text-gray-500 mt-2 pl-3 border-l border-gray-800">{hint}</p>
          </details>
        )}
      </div>

      {/* Answer textarea */}
      {!revealed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
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
        </motion.div>
      )}

      {/* Revealed answer */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 26 }}
            className="space-y-4"
          >
            {modelAnswer && (
              <div className="rounded-2xl border border-accent-500/30 bg-accent-500/5 p-6 space-y-3">
                <p className="text-xs font-mono text-accent-400 uppercase tracking-wider">Model Answer</p>
                <p className="text-sm text-gray-200 leading-relaxed">{modelAnswer}</p>
              </div>
            )}

            {script.keyPoints.length > 1 && (
              <div className="rounded-xl border border-gray-800 bg-surface-900 p-4 space-y-2">
                <p className="text-xs font-mono text-gray-600 uppercase tracking-wider">Key Points</p>
                <ul className="space-y-1.5">
                  {script.keyPoints.slice(1).map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-brand-500 mt-0.5 shrink-0">·</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Stefan() {
  const { repoId } = useParams<{ repoId: string }>();
  const { activeRepo } = useRepo();

  const [phase, setPhase] = useState<Phase>('select');
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');
  const [queue, setQueue] = useState<StefanScript[]>([]);
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [stefanLine, setStefanLine] = useState('');
  const [sessionCount, setSessionCount] = useState<number>(() => {
    const key = getStefanKey(repoId);
    return parseInt(localStorage.getItem(key) ?? '0', 10);
  });

  const scripts = activeRepo.stefanScripts;

  const startSession = useCallback(() => {
    const pool = filterScripts(scripts, difficulty);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
    setQueue(shuffled);
    setIdx(0);
    setScores([]);
    setStefanLine('');
    setPhase('interview');
  }, [scripts, difficulty]);

  const handleRate = useCallback((q: number) => {
    setScores(prev => [...prev, q]);
    if (idx + 1 >= queue.length) {
      const key = getStefanKey(repoId);
      const next = sessionCount + 1;
      localStorage.setItem(key, String(next));
      setSessionCount(next);
      setPhase('done');
    } else {
      setIdx(i => i + 1);
      setStefanLine(getRandomReaction(difficulty));
    }
  }, [idx, queue.length, difficulty, repoId, sessionCount]);

  const avgScore = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : '—';

  const numAvg = parseFloat(avgScore);
  const verdict =
    numAvg >= 4.5 ? { label: 'Excellent', color: 'text-accent-400' } :
    numAvg >= 3.5 ? { label: 'Good', color: 'text-brand-400' } :
    numAvg >= 2.5 ? { label: 'Needs Work', color: 'text-yellow-400' } :
    { label: 'Study More', color: 'text-danger-400' };

  // Escape to exit interview
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'interview') setPhase('select');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 relative">

      {/* Ambient orb */}
      <div className="pointer-events-none fixed top-0 right-0 w-[480px] h-[480px] rounded-full bg-brand-500/5 blur-3xl -translate-y-1/3 translate-x-1/3" />

      {/* ── SELECT phase ──────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {phase === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge color="brand">Stefan Simulator</Badge>
                <Badge color="danger">Pressure Test</Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Adversarial Interview</h1>
              <p className="text-gray-400 max-w-lg">
                Stefan is a hostile senior engineer. He will interrupt, challenge, and catch your mistakes.
                Select your difficulty and face him.
              </p>
              <p className="text-sm text-gray-600 italic border-l-2 border-gray-800 pl-3">
                This is for when you've built real comprehension. Not before.
              </p>
            </div>

            {/* Session count */}
            {sessionCount > 0 && (
              <div className="flex items-center gap-2 text-xs font-mono text-gray-600">
                <span className="w-2 h-2 rounded-full bg-brand-500/60" />
                {sessionCount} session{sessionCount !== 1 ? 's' : ''} completed for this repo
              </div>
            )}

            {/* Difficulty selector */}
            <div className="space-y-3">
              <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">Difficulty</p>
              <div className="space-y-2">
                {(Object.keys(difficultyMeta) as Difficulty[]).map(d => {
                  const meta = difficultyMeta[d];
                  const count = filterScripts(scripts, d).length;
                  const selected = difficulty === d;
                  return (
                    <motion.button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      whileTap={{ scale: 0.985 }}
                      className={`w-full text-left rounded-xl border p-4 transition-all duration-200
                        ${meta.borderColor} ${meta.bgColor} ${meta.hoverBg}
                        ${selected ? `ring-1 ring-offset-1 ring-offset-surface-950 ${meta.ringColor}` : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full transition-colors ${selected ? 'bg-brand-400' : 'bg-gray-700'}`} />
                          <span className="text-sm font-semibold text-white">{meta.label}</span>
                        </div>
                        <span className="text-xs text-gray-600 font-mono">{Math.min(count, 10)} questions</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 ml-6">{meta.desc}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Stefan intro card */}
            <div className="rounded-2xl border border-gray-800 bg-surface-900 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xl font-bold text-white">
                    S
                  </div>
                  <motion.span
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-brand-500 border-2 border-surface-900"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Stefan</p>
                  <p className="text-xs text-gray-600">Senior Engineer · {activeRepo.label}</p>
                </div>
              </div>
              <blockquote className="text-sm text-gray-300 leading-relaxed border-l-2 border-gray-700 pl-4 italic">
                "Tell me about what you built. And I mean actually built — not what the spec said, not what you read.
                What did your hands write, and why."
              </blockquote>
            </div>

            <motion.button
              onClick={startSession}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors text-base"
            >
              Begin Session →
            </motion.button>
          </motion.div>
        )}

        {/* ── INTERVIEW phase ──────────────────────────────────────────────────── */}
        {phase === 'interview' && queue[idx] && (
          <motion.div
            key="interview"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* Stefan reaction line */}
            <AnimatePresence>
              {stefanLine && idx > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-gray-800 bg-surface-900 px-4 py-3 text-sm text-gray-400 italic"
                >
                  <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white shrink-0">S</span>
                  "{stefanLine}"
                </motion.div>
              )}
            </AnimatePresence>

            <QCard
              key={queue[idx].id}
              script={queue[idx]}
              onRate={handleRate}
              idx={idx}
              total={queue.length}
              sessionDifficulty={difficulty}
            />

            <button
              onClick={() => setPhase('select')}
              className="text-xs text-gray-700 hover:text-gray-500 transition-colors"
            >
              ← Exit session (Esc)
            </button>
          </motion.div>
        )}

        {/* ── DONE phase ───────────────────────────────────────────────────────── */}
        {phase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-8"
          >
            <div className="space-y-3">
              <Badge color="accent">Session Complete</Badge>
              <h1 className="text-3xl font-bold text-white">Stefan's Verdict</h1>
            </div>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.1 }}
              className="rounded-2xl border border-gray-800 bg-surface-900 p-8 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl font-bold text-white mx-auto">
                S
              </div>
              <div>
                <p className={`text-5xl font-bold tabular-nums ${verdict.color}`}>{avgScore}</p>
                <p className="text-sm text-gray-500 mt-1">Average quality score (0–5)</p>
              </div>
              <p className={`text-lg font-semibold ${verdict.color}`}>{verdict.label}</p>
              <p className="text-sm text-gray-500 italic">
                {numAvg >= 4
                  ? '"Not bad. Come back when you can do it under pressure."'
                  : numAvg >= 3
                  ? '"You\'re getting there. More precision on the details."'
                  : '"Study the source code. Come back tomorrow."'}
              </p>
            </motion.div>

            {/* Score breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">Question Breakdown</p>
              {scores.map((score, i) => {
                const q = queue[i];
                const labelMap = ['Blackout', 'Wrong', 'Wrong-Easy', 'Hard', 'Good', 'Easy'];
                const label = labelMap[score] ?? '—';
                const c = score >= 4 ? 'text-accent-400' : score >= 3 ? 'text-yellow-400' : 'text-danger-400';
                const questionText = q?.questions[0] ?? q?.setup ?? '';
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, ease: 'easeOut' }}
                    className="flex items-center gap-3 rounded-lg border border-gray-800 bg-surface-900 px-4 py-3"
                  >
                    <span className="text-xs font-mono text-gray-600 w-4 shrink-0">{i + 1}</span>
                    <p className="text-xs text-gray-300 flex-1 truncate">{questionText.slice(0, 60)}…</p>
                    <span className={`text-xs font-mono font-semibold shrink-0 ${c}`}>{label}</span>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <motion.button
                onClick={startSession}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
              >
                New Session
              </motion.button>
              <motion.button
                onClick={() => setPhase('select')}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-xl border border-gray-800 bg-surface-900 text-sm font-medium text-gray-400 hover:border-gray-700 transition-colors"
              >
                Change Difficulty
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
