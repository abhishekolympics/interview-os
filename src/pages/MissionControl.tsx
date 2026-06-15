import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { flashcards } from '../data/flashcards';
import { loadState, computeReadiness, getDueCards } from '../data/sm2';

const modules = [
  {
    to: '/memory-palace',
    label: 'Memory Palace',
    sub: 'SM-2 spaced repetition',
    icon: '🧠',
    color: 'brand',
  },
  {
    to: '/stefan',
    label: 'Stefan Simulator',
    sub: 'Adversarial interview drill',
    icon: '🎯',
    color: 'accent',
  },
  {
    to: '/request-lab',
    label: 'Request Lab',
    sub: 'Interactive API explorer',
    icon: '⚡',
    color: 'warn',
  },
  {
    to: '/panic',
    label: 'Panic Mode',
    sub: '5-min golden bullets',
    icon: '🚨',
    color: 'danger',
  },
  {
    to: '/request-flow',
    label: 'Request Flow',
    sub: 'Trace HTTP to DB',
    icon: '→',
    color: 'gray',
  },
  {
    to: '/architecture',
    label: 'Architecture Lab',
    sub: 'Modules & DI chain',
    icon: '⬡',
    color: 'gray',
  },
  {
    to: '/overview',
    label: 'Repo Overview',
    sub: '3 repos compared',
    icon: '≡',
    color: 'gray',
  },
];

const colorMap: Record<string, { card: string; icon: string; label: string }> = {
  brand:  { card: 'border-brand-500/30 bg-brand-500/5 hover:bg-brand-500/10',   icon: 'text-brand-400',  label: 'text-brand-400' },
  accent: { card: 'border-accent-500/30 bg-accent-500/5 hover:bg-accent-500/10', icon: 'text-accent-400', label: 'text-accent-400' },
  warn:   { card: 'border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10', icon: 'text-warn-400',   label: 'text-warn-400' },
  danger: { card: 'border-danger-400/30 bg-danger-400/5 hover:bg-danger-400/10', icon: 'text-danger-400', label: 'text-danger-400' },
  gray:   { card: 'border-gray-800 bg-surface-900 hover:bg-surface-800',          icon: 'text-gray-400',   label: 'text-gray-300' },
};

function ReadinessMeter({ score }: { score: number }) {
  const color =
    score >= 80 ? '#10b981' :
    score >= 55 ? '#f59e0b' :
    score >= 30 ? '#6366f1' : '#ef4444';

  const label =
    score >= 80 ? 'READY' :
    score >= 55 ? 'APPROACHING' :
    score >= 30 ? 'IN PROGRESS' : 'NOT READY';

  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative w-40 h-40">
        <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white tabular-nums">{score}</span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      <span
        className="text-xs font-mono font-bold tracking-widest px-3 py-1 rounded-full border"
        style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
      >
        {label}
      </span>
    </div>
  );
}

export default function MissionControl() {
  const state = useMemo(() => loadState(), []);
  const allIds = flashcards.map(c => c.id);
  const readiness = useMemo(() => computeReadiness(state, allIds), [state, allIds]);
  const dueCount = useMemo(() => getDueCards(state, allIds).length, [state, allIds]);
  const masteredCount = useMemo(
    () => Object.values(state.cards).filter(c => c.repetitions >= 3).length,
    [state],
  );

  const totalReviews = useMemo(
    () => Object.values(state.cards).reduce((s, c) => s + c.totalReviews, 0),
    [state],
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-12">

      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-mono text-gray-600 tracking-widest uppercase">Mission Control</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">Interview OS</h1>
        <p className="text-gray-500 text-sm">Red Planet Staffing — CodeScreen Interview Prep</p>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Readiness dial */}
        <div className="lg:col-span-1 rounded-2xl border border-gray-800 bg-surface-900 p-6 flex flex-col items-center justify-center gap-4">
          <ReadinessMeter score={readiness} />
          <div className="text-center">
            <p className="text-xs text-gray-600">Readiness Score</p>
            <p className="text-xs text-gray-600 mt-0.5">Based on SM-2 mastery + session history</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Cards Due', value: dueCount, note: 'today', accent: dueCount > 0 ? 'text-warn-400' : 'text-accent-400' },
            { label: 'Mastered', value: masteredCount, note: `/ ${allIds.length} total`, accent: 'text-accent-400' },
            { label: 'Stefan Sessions', value: state.stefanSessions, note: 'completed', accent: 'text-brand-400' },
            { label: 'Total Reviews', value: totalReviews, note: 'all time', accent: 'text-gray-300' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-gray-800 bg-surface-900 p-4 space-y-1">
              <p className="text-xs text-gray-600">{stat.label}</p>
              <p className={`text-3xl font-bold tabular-nums ${stat.accent}`}>{stat.value}</p>
              <p className="text-xs text-gray-700">{stat.note}</p>
            </div>
          ))}

          {/* Quick action — due cards */}
          <div className="col-span-2 rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs text-gray-500">
                {dueCount > 0
                  ? `${dueCount} card${dueCount > 1 ? 's' : ''} waiting for review`
                  : 'All cards reviewed — nothing due today'}
              </p>
              <p className="text-sm font-semibold text-white">
                {dueCount > 0 ? 'Start your daily review →' : 'Take on more in Memory Palace'}
              </p>
            </div>
            <Link
              to="/memory-palace"
              className="shrink-0 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
            >
              Study
            </Link>
          </div>

          {/* Quick action — panic */}
          <div className="col-span-2 rounded-xl border border-danger-400/20 bg-danger-400/5 p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs text-gray-500">Interview in minutes? Run the golden bullets.</p>
              <p className="text-sm font-semibold text-white">5-Minute Emergency Review</p>
            </div>
            <Link
              to="/panic"
              className="shrink-0 px-4 py-2 rounded-xl border border-danger-400/30 text-danger-400 hover:bg-danger-400/10 text-sm font-semibold transition-colors"
            >
              Panic Mode
            </Link>
          </div>
        </div>
      </div>

      {/* Module grid */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-400 uppercase tracking-widest text-xs font-mono">All Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {modules.map(mod => {
            const c = colorMap[mod.color];
            return (
              <Link
                key={mod.to}
                to={mod.to}
                className={`group rounded-xl border p-5 transition-all duration-200 ${c.card}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-2xl ${c.icon}`}>{mod.icon}</span>
                  <span className="text-gray-700 text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
                <p className={`text-sm font-semibold ${c.label}`}>{mod.label}</p>
                <p className="text-xs text-gray-600 mt-0.5">{mod.sub}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Topic coverage */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-widest">Topic Mastery</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { topic: 'streak-bonus-algorithm', label: 'Streak Bonus Algorithm', weight: 30 },
            { topic: 'cursor-pagination', label: 'Cursor Pagination', weight: 20 },
            { topic: 'database-design', label: 'Database / Schema', weight: 15 },
            { topic: 'iso-week', label: 'ISO Week Calculation', weight: 10 },
            { topic: 'soft-delete', label: 'Soft Delete Pattern', weight: 10 },
            { topic: 'service-architecture', label: 'NestJS Architecture', weight: 8 },
            { topic: 'validation', label: 'Validation / Pipes', weight: 4 },
            { topic: 'anti-ai-trap', label: 'Anti-AI Trap', weight: 3 },
          ].map(({ topic, label, weight }) => {
            const topicCards = flashcards.filter(c => c.topic === topic);
            const masteredInTopic = topicCards.filter(c => {
              const cs = state.cards[c.id];
              return cs && cs.repetitions >= 2;
            }).length;
            const pct = topicCards.length > 0 ? Math.round((masteredInTopic / topicCards.length) * 100) : 0;
            return (
              <div key={topic} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-surface-900 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-300 truncate">{label}</span>
                    <span className="text-xs font-mono text-gray-600 ml-2 shrink-0">{pct}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-brand-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-700 shrink-0 w-8 text-right">{weight}%</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-700">Weight = approximate % of interview questions on this topic.</p>
      </section>

    </div>
  );
}
