import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepo } from '../contexts/RepoContext';
import { loadState, saveState } from '../data/sm2';
import type { GoldenBullet } from '../types/repo';

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

const CATEGORY_META: Record<GoldenBullet['category'], { label: string; color: string; bg: string; border: string }> = {
  core:   { label: 'CORE',   color: 'text-brand-400',  bg: 'bg-brand-500/10',  border: 'border-brand-500/30' },
  gotcha: { label: 'GOTCHA', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  math:   { label: 'MATH',   color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  trap:   { label: 'TRAP',   color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
};

function CategoryBadge({ category }: { category: GoldenBullet['category'] }) {
  const m = CATEGORY_META[category];
  return (
    <span
      className={`text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded border ${m.color} ${m.bg} ${m.border}`}
    >
      {m.label}
    </span>
  );
}

export default function Panic() {
  const { repoId } = useParams<{ repoId: string }>();
  const { activeRepo } = useRepo();
  const goldenBullets: GoldenBullet[] = activeRepo.goldenBullets ?? [];

  const [phase, setPhase] = useState<Phase>('intro');
  const [bulletIdx, setBulletIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [checkedBullets, setCheckedBullets] = useState<Set<number>>(new Set());
  const [expandedDetail, setExpandedDetail] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setBulletIdx(0);
    setSecondsLeft(TOTAL_SECONDS);
    setCheckedBullets(new Set());
    setExpandedDetail(false);
    setPhase('running');
  };

  // Countdown timer
  useEffect(() => {
    if (phase !== 'running') return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          const state = loadState(repoId);
          state.panicSessions += 1;
          saveState(state, repoId);
          setPhase('done');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [phase, repoId]);

  // Keyboard navigation
  useEffect(() => {
    if (phase !== 'running') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        gotIt();
      }
      if (e.key === 'd' || e.key === 'D') {
        setExpandedDetail(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, bulletIdx]);

  const gotIt = () => {
    setCheckedBullets(prev => new Set([...prev, bulletIdx]));
    setExpandedDetail(false);
    if (bulletIdx + 1 >= goldenBullets.length) {
      clearInterval(intervalRef.current!);
      const state = loadState(repoId);
      state.panicSessions += 1;
      saveState(state, repoId);
      setPhase('done');
    } else {
      setBulletIdx(i => i + 1);
    }
  };

  const pct = (secondsLeft / TOTAL_SECONDS) * 100;
  const urgent = secondsLeft <= 60;
  const warningZone = secondsLeft <= 120;
  const timerColor = urgent
    ? 'text-red-400'
    : warningZone
    ? 'text-yellow-400'
    : 'text-white';
  const bullet = goldenBullets[bulletIdx];

  // Empty-state guard
  if (goldenBullets.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-4xl">!</p>
        <p className="text-white font-bold text-xl">No golden bullets configured</p>
        <p className="text-gray-500 text-sm">
          Add <code className="text-brand-400">goldenBullets</code> to this repo's config to use Panic Mode.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-2xl mx-auto px-4 sm:px-6 py-10 relative"
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 200 }}
    >
      {/* Ambient red glow — pulsing, intensifies when running */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-0"
        animate={{
          opacity: phase === 'running'
            ? urgent ? [0.7, 1, 0.7] : [0.3, 0.55, 0.3]
            : [0.1, 0.2, 0.1],
        }}
        transition={{ duration: urgent ? 1.1 : 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(ellipse 55% 35% at 50% 0%, rgba(239,68,68,0.14) 0%, transparent 70%)',
        }}
      />

      <AnimatePresence mode="wait">
        {/* ──────────────────────────── INTRO ─────────────────────────────── */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative z-10 space-y-8"
          >
            {/* Header */}
            <div className="space-y-3">
              <motion.div
                animate={{ opacity: [0.65, 1, 0.65] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-[0.2em]">
                  PANIC MODE — {activeRepo.shortLabel}
                </span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl font-black text-white leading-none tracking-tight">
                5 Minutes.
                <br />
                <span className="text-red-400">Know These Cold.</span>
              </h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                {goldenBullets.length} golden bullets. Everything they'll probe, distilled to
                what matters. Read each one. Say it aloud. Tap when confident.
              </p>
            </div>

            {/* Pre-flight checklist preview */}
            <div className="space-y-2">
              {goldenBullets.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.2, ease: 'easeOut' }}
                  className="flex items-center gap-3 rounded-lg border border-gray-800 bg-surface-900
                             px-4 py-3 hover:border-gray-700 transition-colors"
                >
                  <span
                    className="w-7 h-7 rounded-full border border-gray-700 bg-gray-800/60 flex items-center
                               justify-center text-xs font-mono font-bold text-gray-500 shrink-0 tabular-nums"
                  >
                    {i + 1}
                  </span>
                  <p className="flex-1 min-w-0 text-sm font-semibold text-gray-200 truncate">
                    {b.title}
                  </p>
                  <CategoryBadge category={b.category} />
                </motion.div>
              ))}
            </div>

            {/* Key hint */}
            <div
              className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm space-y-1"
              style={{ boxShadow: '0 0 30px rgba(239,68,68,0.07)' }}
            >
              <p className="font-semibold text-red-300">Pre-flight</p>
              <p className="text-xs text-red-400/60">
                Press{' '}
                <kbd className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-300 font-mono text-[10px]">
                  Space
                </kbd>{' '}
                or{' '}
                <kbd className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-300 font-mono text-[10px]">
                  Enter
                </kbd>{' '}
                to advance.{' '}
                <kbd className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-300 font-mono text-[10px]">
                  D
                </kbd>{' '}
                to toggle detail. The timer is pressure — don't rush reading.
              </p>
            </div>

            <motion.button
              onClick={start}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black
                         text-base transition-colors tracking-widest uppercase"
              style={{ boxShadow: '0 0 40px rgba(239,68,68,0.28)' }}
            >
              INITIATE PANIC MODE
            </motion.button>
          </motion.div>
        )}

        {/* ──────────────────────────── RUNNING ───────────────────────────── */}
        {phase === 'running' && bullet && (
          <motion.div
            key="running"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative z-10 space-y-5"
          >
            {/* Timer row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.span
                    animate={{ opacity: [1, 0.25, 1] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-1.5 h-1.5 rounded-full bg-red-500"
                  />
                  <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">
                    LIVE — {bulletIdx + 1} / {goldenBullets.length}
                  </span>
                </div>

                <motion.span
                  animate={urgent ? { scale: [1, 1.09, 1] } : {}}
                  transition={{ duration: 0.55, repeat: urgent ? Infinity : 0 }}
                  className={`text-2xl font-mono font-black tabular-nums transition-colors ${timerColor}`}
                >
                  {formatTime(secondsLeft)}
                </motion.span>
              </div>

              <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    urgent
                      ? 'bg-red-500'
                      : warningZone
                      ? 'bg-yellow-500'
                      : 'bg-brand-500'
                  }`}
                  style={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </div>
            </div>

            {/* Bullet card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={bulletIdx}
                initial={{ opacity: 0, x: 28, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -28, scale: 0.97 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className={`rounded-2xl border overflow-hidden ${
                  urgent ? 'border-red-500/40' : 'border-gray-800'
                }`}
                style={{
                  background: 'rgb(var(--surface-900, 15 15 20))',
                  boxShadow: urgent
                    ? '0 0 60px rgba(239,68,68,0.2), inset 0 0 0 1px rgba(239,68,68,0.08)'
                    : '0 0 50px rgba(239,68,68,0.07)',
                }}
              >
                {/* Card header */}
                <div
                  className={`px-6 py-4 border-b border-gray-800 flex items-start gap-4 ${
                    urgent ? 'bg-red-500/5' : 'bg-transparent'
                  }`}
                >
                  <span
                    className="w-11 h-11 rounded-xl border border-gray-700 bg-gray-800 flex items-center
                               justify-center text-xl font-black text-white shrink-0 tabular-nums"
                  >
                    {bulletIdx + 1}
                  </span>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <CategoryBadge category={bullet.category} />
                      {bullet.source && (
                        <span className="text-[10px] font-mono text-gray-600 truncate">
                          {bullet.source}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-black text-white leading-snug">{bullet.title}</h2>
                  </div>
                </div>

                {/* Card body */}
                <div className="px-6 py-5 space-y-4">
                  {/* Summary — always visible */}
                  <p className="text-sm text-gray-200 leading-relaxed font-medium">
                    {bullet.summary}
                  </p>

                  {/* Info chips grid */}
                  {bullet.info && bullet.info.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {bullet.info.map(({ label, value }) => (
                        <div
                          key={label}
                          className="rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2"
                        >
                          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-0.5">
                            {label}
                          </p>
                          <p className="text-xs font-semibold text-gray-200">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expandable detail */}
                  {bullet.detail && (
                    <div>
                      <button
                        onClick={() => setExpandedDetail(v => !v)}
                        className="text-xs font-mono text-gray-600 hover:text-gray-400 transition-colors
                                   flex items-center gap-1.5"
                      >
                        <motion.span
                          animate={{ rotate: expandedDetail ? 90 : 0 }}
                          transition={{ duration: 0.15 }}
                          className="inline-block text-[8px]"
                        >
                          ▶
                        </motion.span>
                        {expandedDetail ? 'Hide detail' : 'Show detail'}{' '}
                        <span className="text-gray-700">[D]</span>
                      </button>

                      <AnimatePresence>
                        {expandedDetail && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <p className="text-xs text-gray-400 leading-relaxed mt-2 pt-2 border-t border-gray-800">
                              {bullet.detail}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="px-6 pb-6">
                  <motion.button
                    onClick={gotIt}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white
                               font-bold text-sm transition-colors tracking-wide"
                  >
                    Got it — next{' '}
                    <span className="text-emerald-300/50 font-normal text-xs ml-1">
                      [Space / Enter]
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {goldenBullets.map((_, i) => (
                <motion.span
                  key={i}
                  animate={{
                    scale: i === bulletIdx ? 1.5 : 1,
                    opacity: checkedBullets.has(i) ? 1 : i === bulletIdx ? 1 : 0.3,
                  }}
                  transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                  className={`rounded-full ${
                    checkedBullets.has(i)
                      ? 'w-2 h-2 bg-emerald-400'
                      : i === bulletIdx
                      ? 'w-2 h-2 bg-red-400'
                      : 'w-1.5 h-1.5 bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ──────────────────────────── DONE ──────────────────────────────── */}
        {phase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 220 }}
            className="relative z-10 space-y-8"
          >
            <div className="space-y-3">
              <span
                className="text-xs font-mono text-emerald-400 uppercase tracking-widest border
                           border-emerald-500/30 bg-emerald-500/5 px-2 py-1 rounded"
              >
                Session Complete
              </span>
              <h1 className="text-3xl font-black text-white">
                {checkedBullets.size === goldenBullets.length
                  ? `All ${goldenBullets.length} bullets locked in.`
                  : "Time's up."}
              </h1>
              <p className="text-gray-400 text-sm">
                {checkedBullets.size} / {goldenBullets.length} bullets confirmed.
              </p>
            </div>

            {/* Result checklist */}
            <div className="space-y-2">
              {goldenBullets.map((b, i) => {
                const checked = checkedBullets.has(i);
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.2, ease: 'easeOut' }}
                    className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                      checked
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-gray-800 bg-surface-900 opacity-50'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded border flex items-center justify-center text-xs
                                  shrink-0 mt-0.5 font-bold transition-colors ${
                        checked
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-700 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-semibold text-white">{b.title}</p>
                        <CategoryBadge category={b.category} />
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{b.summary}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Readiness hint */}
            <div
              className="rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3 text-sm text-gray-300"
              style={{ boxShadow: '0 0 30px rgba(239,68,68,0.05)' }}
            >
              <p className="font-semibold text-white mb-1">You're ready when all {goldenBullets.length} light up green — cold.</p>
              <p className="text-xs text-gray-500">
                Run again until there's no hesitation on any bullet.
              </p>
            </div>

            <div className="flex gap-3">
              <motion.button
                onClick={start}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm
                           font-black transition-colors uppercase tracking-widest"
                style={{ boxShadow: '0 0 28px rgba(239,68,68,0.22)' }}
              >
                Run Again
              </motion.button>
              <motion.button
                onClick={() => setPhase('intro')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-xl border border-gray-800 bg-surface-900 text-sm
                           font-medium text-gray-400 hover:border-gray-700 transition-colors"
              >
                Back to Intro
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
