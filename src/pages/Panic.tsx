import { useState, useEffect, useRef } from 'react';
import { goldenBullets } from '../data/goldenBullets';
import { loadState, saveState } from '../data/sm2';
import CodeBlock from '../components/CodeBlock';

const TOTAL_SECONDS = 5 * 60;

type Phase = 'intro' | 'running' | 'done';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${pad(m)}:${pad(s)}`;
}

export default function Panic() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [bulletIdx, setBulletIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [checkedBullets, setCheckedBullets] = useState<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setBulletIdx(0);
    setSecondsLeft(TOTAL_SECONDS);
    setCheckedBullets(new Set());
    setPhase('running');
  };

  useEffect(() => {
    if (phase !== 'running') return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          const state = loadState();
          state.panicSessions += 1;
          saveState(state);
          setPhase('done');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [phase]);

  const gotIt = () => {
    setCheckedBullets(prev => new Set([...prev, bulletIdx]));
    if (bulletIdx + 1 >= goldenBullets.length) {
      clearInterval(intervalRef.current!);
      const state = loadState();
      state.panicSessions += 1;
      saveState(state);
      setPhase('done');
    } else {
      setBulletIdx(i => i + 1);
    }
  };

  const pct = (secondsLeft / TOTAL_SECONDS) * 100;
  const urgent = secondsLeft <= 60;
  const timerColor = urgent ? 'text-danger-400' : secondsLeft <= 120 ? 'text-warn-400' : 'text-white';
  const bullet = goldenBullets[bulletIdx];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

      {phase === 'intro' && (
        <div className="space-y-8">
          <div className="space-y-3">
            <span className="text-xs font-mono text-danger-400 uppercase tracking-widest border border-danger-400/30 bg-danger-400/5 px-2 py-1 rounded">
              🚨 PANIC MODE
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Emergency Review</h1>
            <p className="text-gray-400">
              5 minutes. 5 golden bullets. Everything Stefan will ask, distilled to the essentials.
              Start when you're ready.
            </p>
          </div>

          {/* Preview bullets */}
          <div className="space-y-2">
            {goldenBullets.map((b, i) => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-surface-900 px-4 py-3">
                <span className="w-6 h-6 rounded-full border border-gray-700 flex items-center justify-center text-xs font-mono text-gray-600 shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-200">{b.title}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {b.tags.map(tag => (
                      <span key={tag} className="text-xs font-mono text-gray-600">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-300 space-y-1">
            <p className="font-semibold">Before you start</p>
            <p className="text-xs text-yellow-400/70">
              Read each bullet carefully. Say it aloud if possible. Tap "Got it" when confident.
              The timer counts down as a pressure signal — don't rush the reading.
            </p>
          </div>

          <button
            onClick={start}
            className="w-full py-4 rounded-xl bg-danger-400 hover:bg-red-500 text-white font-bold text-base transition-colors"
          >
            🚨 Start 5-Minute Panic Mode
          </button>
        </div>
      )}

      {phase === 'running' && bullet && (
        <div className="space-y-6">
          {/* Timer bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-600">
                Bullet {bulletIdx + 1} / {goldenBullets.length}
              </span>
              <span className={`text-xl font-mono font-bold tabular-nums ${timerColor} transition-colors`}>
                {formatTime(secondsLeft)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${urgent ? 'bg-danger-400' : 'bg-brand-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Bullet content */}
          <div className="rounded-2xl border border-gray-800 bg-surface-900 overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-4 border-b border-gray-800 flex items-center gap-3 ${
              urgent ? 'bg-danger-400/5' : 'bg-surface-900'
            }`}>
              <span className="w-8 h-8 rounded-full border border-gray-700 bg-gray-800 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {bulletIdx + 1}
              </span>
              <h2 className="text-lg font-bold text-white">{bullet.title}</h2>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-200 leading-relaxed">{bullet.body}</p>

              {bullet.code && (
                <CodeBlock code={bullet.code} filename="reference" />
              )}

              <div className="flex gap-2 flex-wrap">
                {bullet.tags.map(tag => (
                  <span key={tag} className="text-xs font-mono text-gray-600 bg-gray-800/60 px-2 py-0.5 rounded border border-gray-800">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Action */}
            <div className="px-6 pb-6">
              <button
                onClick={gotIt}
                className="w-full py-4 rounded-xl bg-accent-500 hover:bg-emerald-500 text-white font-bold text-sm transition-colors"
              >
                Got it — next bullet →
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2">
            {goldenBullets.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  checkedBullets.has(i)
                    ? 'bg-accent-400'
                    : i === bulletIdx
                    ? 'bg-brand-400 scale-125'
                    : 'bg-gray-800'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-8">
          <div className="space-y-3">
            <span className="text-xs font-mono text-accent-400 uppercase tracking-widest border border-accent-500/30 bg-accent-500/5 px-2 py-1 rounded">
              Session Complete
            </span>
            <h1 className="text-3xl font-bold text-white">
              {checkedBullets.size === goldenBullets.length ? 'All 5 bullets locked in.' : 'Time\'s up.'}
            </h1>
            <p className="text-gray-400">
              {checkedBullets.size} / {goldenBullets.length} bullets confirmed.
            </p>
          </div>

          {/* Final checklist */}
          <div className="space-y-2">
            {goldenBullets.map((b, i) => {
              const checked = checkedBullets.has(i);
              return (
                <div
                  key={b.id}
                  className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                    checked
                      ? 'border-accent-500/30 bg-accent-500/5'
                      : 'border-gray-800 bg-surface-900 opacity-60'
                  }`}
                >
                  <span className={`w-5 h-5 rounded border flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                    checked ? 'bg-accent-500 border-accent-500 text-white' : 'border-gray-700'
                  }`}>
                    {checked ? '✓' : ''}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{b.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{b.body.slice(0, 120)}…</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3 text-sm text-gray-300">
            <p className="font-semibold text-white mb-1">You're ready if you can say:</p>
            <ul className="space-y-1 text-xs text-gray-400 list-disc list-inside">
              <li>"Three Prisma queries — count, fetch bonus, paginate shifts."</li>
              <li>"streakBonusPercent is on the Workplace model, not hardcoded."</li>
              <li>"take+1 trick. @CursorValidate doesn't parse startAt."</li>
              <li>"Soft delete: cancelledAt + workerId = null."</li>
              <li>"(dayOfWeek + 6) % 7 = ISO Monday. +604,800,000ms = next week."</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={start}
              className="flex-1 py-3 rounded-xl bg-danger-400 hover:bg-red-500 text-white text-sm font-bold transition-colors"
            >
              Run Again
            </button>
            <button
              onClick={() => setPhase('intro')}
              className="flex-1 py-3 rounded-xl border border-gray-800 bg-surface-900 text-sm font-medium text-gray-400 hover:border-gray-700 transition-colors"
            >
              Back to Intro
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
