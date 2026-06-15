import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepo, ALL_REPOS } from '../contexts/RepoContext';
import { loadState, computeReadiness, getDueCards } from '../data/sm2';

// ── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    let start: DOMHighResTimeStamp | null = null;
    function step(ts: DOMHighResTimeStamp) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * ease));
      if (p < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

// ── Comprehension Gauge ───────────────────────────────────────────────────────
function ComprehensionGauge({ score }: { score: number }) {
  const displayed = useCountUp(score, 1600);
  const [ringProgress, setRingProgress] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      const start = performance.now();
      const dur = 1600;
      function tick(now: number) {
        const p = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setRingProgress(ease * score);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, 80);
    return () => clearTimeout(t);
  }, [score]);

  const color =
    score >= 80 ? '#10b981' :
    score >= 55 ? '#f59e0b' :
    score >= 30 ? '#6366f1' : '#ef4444';

  const glowColor =
    score >= 80 ? 'rgba(16,185,129,0.15)' :
    score >= 55 ? 'rgba(245,158,11,0.15)' :
    score >= 30 ? 'rgba(99,102,241,0.15)' : 'rgba(239,68,68,0.15)';

  const statusLabel =
    score >= 80 ? 'STRONG' :
    score >= 55 ? 'BUILDING' :
    score >= 30 ? 'EARLY' : 'START HERE';

  const r = 70;
  const circ = 2 * Math.PI * r;
  const offset = circ - (ringProgress / 100) * circ;

  return (
    <div className="flex flex-col items-center justify-center gap-5">
      {/* Outer ambient glow */}
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full blur-2xl pointer-events-none"
          style={{ background: glowColor, transform: 'scale(1.3)' }}
        />
        <svg className="w-52 h-52 -rotate-90 relative z-10" viewBox="0 0 160 160">
          {/* Track */}
          <circle cx="80" cy="80" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
          {/* Tick marks */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * 2 * Math.PI - Math.PI / 2;
            const inner = r - 6;
            const outer = r - 1;
            const x1 = 80 + inner * Math.cos(angle);
            const y1 = 80 + inner * Math.sin(angle);
            const x2 = 80 + outer * Math.cos(angle);
            const y2 = 80 + outer * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#374151"
                strokeWidth="1"
              />
            );
          })}
          {/* Main arc */}
          <circle
            cx="80" cy="80" r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
          {/* Glow arc */}
          <circle
            cx="80" cy="80" r={r}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            opacity="0.18"
            style={{ filter: 'blur(6px)' }}
          />
        </svg>

        {/* Center readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className="text-5xl font-bold text-white tabular-nums leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {displayed}
          </span>
          <span className="text-xs text-gray-500 mt-1">/ 100</span>
        </div>
      </div>

      {/* Label + status chip */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-mono font-bold tracking-[0.2em] text-gray-500 uppercase">
          COMPREHENSION
        </span>
        <span
          className="text-xs font-mono font-bold tracking-widest px-3 py-1 rounded-full border"
          style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

// ── Module card ───────────────────────────────────────────────────────────────
interface ModuleCardProps {
  label: string;
  description: string;
  meta: string;
  to: string;
  color: 'brand' | 'accent' | 'warn' | 'danger' | 'gray';
  index: number;
}

const colorStyles = {
  brand:  { border: 'border-brand-500/30',  bg: 'bg-brand-500/5',  hover: 'hover:bg-brand-500/10 hover:border-brand-500/50',  text: 'text-brand-400',   dot: '#6366f1' },
  accent: { border: 'border-accent-500/30', bg: 'bg-accent-500/5', hover: 'hover:bg-accent-500/10 hover:border-accent-500/50', text: 'text-accent-400',  dot: '#a78bfa' },
  warn:   { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', hover: 'hover:bg-yellow-500/10 hover:border-yellow-500/50', text: 'text-yellow-400',  dot: '#f59e0b' },
  danger: { border: 'border-danger-400/30', bg: 'bg-danger-400/5', hover: 'hover:bg-danger-400/10 hover:border-danger-400/50', text: 'text-danger-400',  dot: '#ef4444' },
  gray:   { border: 'border-gray-800',      bg: 'bg-surface-900',  hover: 'hover:bg-surface-800 hover:border-gray-700',         text: 'text-gray-300',   dot: '#6b7280' },
};

function ModuleCard({ label, description, meta, to, color, index }: ModuleCardProps) {
  const navigate = useNavigate();
  const s = colorStyles[color];

  return (
    <motion.button
      onClick={() => navigate(to)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4, ease: [0.25, 0, 0, 1] }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left rounded-xl border p-5 transition-colors duration-200 group cursor-pointer ${s.border} ${s.bg} ${s.hover}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0"
          style={{ backgroundColor: s.dot, boxShadow: `0 0 8px ${s.dot}80` }}
        />
        <motion.span
          className="text-gray-600 text-sm"
          initial={{ x: 0 }}
          whileHover={{ x: 3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          →
        </motion.span>
      </div>
      <p className={`text-sm font-semibold ${s.text}`}>{label}</p>
      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{description}</p>
      {meta && (
        <p className="text-xs text-gray-700 mt-2 font-mono">{meta}</p>
      )}
    </motion.button>
  );
}

// ── Topic Heat Map ────────────────────────────────────────────────────────────
interface TopicTile {
  key: string;
  label: string;
  pct: number;
}

function TopicHeatMap({ tiles }: { tiles: TopicTile[] }) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  function tileColor(pct: number): string {
    if (pct >= 85) return 'rgb(99,102,241)';   // full brand blue/purple
    if (pct >= 65) return 'rgb(79,70,229)';
    if (pct >= 45) return 'rgb(67,56,202)';
    if (pct >= 25) return 'rgb(55,48,163)';
    if (pct >= 10) return 'rgb(30,27,75)';
    return 'rgb(17,24,39)';                     // dark = untouched
  }

  function textColor(pct: number): string {
    return pct >= 25 ? 'text-white' : 'text-gray-600';
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {tiles.map((tile, i) => (
        <motion.div
          key={tile.key}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.04 * i, duration: 0.35, ease: [0.25, 0, 0, 1] }}
          onHoverStart={() => setHoveredKey(tile.key)}
          onHoverEnd={() => setHoveredKey(null)}
          className="relative rounded-xl p-4 cursor-default border border-white/5 overflow-hidden"
          style={{ background: tileColor(tile.pct) }}
          whileHover={{ scale: 1.03 }}
        >
          {/* Shimmer on high mastery */}
          {tile.pct >= 65 && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', delay: i * 0.3 }}
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
              }}
            />
          )}

          <div className="relative z-10">
            <p className={`text-xs font-medium leading-tight mb-2 ${textColor(tile.pct)}`}>
              {tile.label}
            </p>
            <AnimatePresence mode="wait">
              {hoveredKey === tile.key ? (
                <motion.p
                  key="pct"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="text-xl font-bold tabular-nums text-white font-mono"
                >
                  {tile.pct}%
                </motion.p>
              ) : (
                <motion.div
                  key="bar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-1 rounded-full bg-white/10 overflow-hidden"
                >
                  <motion.div
                    className="h-full rounded-full bg-white/40"
                    initial={{ width: 0 }}
                    animate={{ width: `${tile.pct}%` }}
                    transition={{ delay: 0.05 * i + 0.3, duration: 0.6, ease: [0.25, 0, 0, 1] }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Priority Recommendation ───────────────────────────────────────────────────
interface Recommendation {
  message: string;
  ctaLabel: string;
  to: string;
  urgency: 'red' | 'yellow' | 'green';
}

function getRecommendation(
  dueCount: number,
  comprehension: number,
  repoId: string
): Recommendation {
  if (dueCount > 0) {
    return {
      message: `You have ${dueCount} card${dueCount > 1 ? 's' : ''} due. Study them now.`,
      ctaLabel: 'Open Memory Palace',
      to: `/${repoId}/memory-palace`,
      urgency: 'red',
    };
  }
  if (comprehension < 40) {
    return {
      message: 'Start with the Code Walk — it builds the mental model first.',
      ctaLabel: 'Begin Code Walk',
      to: `/${repoId}/code-walk`,
      urgency: 'yellow',
    };
  }
  const lastArchVisit = localStorage.getItem(`last_visit_architecture_${repoId}`);
  const isArchStale = !lastArchVisit || (Date.now() - new Date(lastArchVisit).getTime()) > 3 * 24 * 60 * 60 * 1000;
  if (isArchStale) {
    return {
      message: "You haven't visited the Architecture Lab in a while.",
      ctaLabel: 'Open Architecture Lab',
      to: `/${repoId}/architecture`,
      urgency: 'yellow',
    };
  }
  return {
    message: 'Fire a request in the Request Lab and trace what happens.',
    ctaLabel: 'Open Request Lab',
    to: `/${repoId}/request-lab`,
    urgency: 'green',
  };
}

const urgencyStyles = {
  red:    { border: 'border-l-danger-400',  bg: 'bg-danger-400/5',  text: 'text-danger-400',  btn: 'bg-danger-400 hover:bg-danger-400/90', dot: 'bg-danger-400' },
  yellow: { border: 'border-l-yellow-400',  bg: 'bg-yellow-400/5',  text: 'text-yellow-400',  btn: 'bg-yellow-400 hover:bg-yellow-300',    dot: 'bg-yellow-400' },
  green:  { border: 'border-l-emerald-400', bg: 'bg-emerald-400/5', text: 'text-emerald-400', btn: 'bg-emerald-500 hover:bg-emerald-400',  dot: 'bg-emerald-400' },
};

// ── Ambient particles ─────────────────────────────────────────────────────────
function AmbientParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 8 + 6,
        delay: Math.random() * 4,
        opacity: Math.random() * 0.25 + 0.05,
      })),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-brand-400"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [p.opacity, p.opacity * 2.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// ── Main CommandCenter ────────────────────────────────────────────────────────
export default function CommandCenter() {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const { activeRepo, repos, setActiveRepo } = useRepo();
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync active repo if URL param differs
  useEffect(() => {
    if (repoId && repoId !== activeRepo.id) {
      const found = ALL_REPOS.find(r => r.id === repoId);
      if (found) setActiveRepo(repoId);
    }
  }, [repoId, activeRepo.id, setActiveRepo]);

  // Close menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setRepoMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const repo = ALL_REPOS.find(r => r.id === repoId) ?? activeRepo;
  const allIds = useMemo(() => repo.flashcards.map(c => c.id), [repo]);
  const state = useMemo(() => loadState(repo.id), [repo.id]);
  const comprehension = useMemo(() => computeReadiness(state, allIds), [state, allIds]);
  const dueCards = useMemo(() => getDueCards(state, allIds), [state, allIds]);
  const dueCount = dueCards.length;

  const recommendation = useMemo(
    () => getRecommendation(dueCount, comprehension, repo.id),
    [dueCount, comprehension, repo.id]
  );

  // ── Topic heat map data ──────────────────────────────────────────────────
  const topicTiles = useMemo<TopicTile[]>(() => {
    // Deck-based topics (guaranteed 5)
    const deckTopics: Array<{ key: string; label: string }> = [
      { key: 'vocabulary',         label: 'Vocabulary' },
      { key: 'algorithm',          label: 'Algorithm' },
      { key: 'layout',             label: 'Layout' },
      { key: 'schema',             label: 'Schema' },
      { key: 'api-endpoints',      label: 'API Endpoints' },
    ];

    // Derive 3 more from distinct flashcard topics in this repo
    const allTopics = Array.from(new Set(repo.flashcards.map(c => c.topic)));
    const extraTopics = allTopics
      .filter(t => !['cursor-pagination', 'iso-week', 'soft-delete', 'service-architecture', 'validation', 'anti-ai-trap'].includes(t))
      .slice(0, 3)
      .map(t => ({
        key: t,
        label: t.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      }));

    const combined = [...deckTopics, ...extraTopics];

    // Map each tile to a mastery %
    // For deck-based: use deck id to find cards, then compute mastery
    const deckIdMap: Record<string, number> = {
      vocabulary: 0, algorithm: 1, layout: 2, schema: 3, 'api-endpoints': 4,
    };

    return combined.map(({ key, label }) => {
      let cards;
      if (deckIdMap[key] !== undefined) {
        cards = repo.flashcards.filter(c => c.deck === deckIdMap[key]);
      } else {
        cards = repo.flashcards.filter(c => c.topic === key);
      }

      if (cards.length === 0) return { key, label, pct: 0 };

      const mastered = cards.filter(c => {
        const cs = state.cards[c.id];
        return cs && cs.repetitions >= 2;
      }).length;

      return { key, label, pct: Math.round((mastered / cards.length) * 100) };
    });
  }, [repo.flashcards, state]);

  // ── Module definitions ────────────────────────────────────────────────────
  const rid = repo.id;
  const masteredCount = Object.values(state.cards).filter(c => c.repetitions >= 3).length;

  const mainModules: ModuleCardProps[] = [
    {
      label: 'Memory Palace',
      description: 'SM-2 spaced repetition across all decks',
      meta: `${dueCount > 0 ? `${dueCount} due now` : 'All caught up'} · ${masteredCount}/${allIds.length} mastered`,
      to: `/${rid}/memory-palace`,
      color: 'brand',
      index: 0,
    },
    {
      label: 'Architecture Lab',
      description: 'Module dependency graph and DI chain',
      meta: `${repo.architectureGraph.nodes.length} nodes · ${repo.architectureGraph.edges.length} edges`,
      to: `/${rid}/architecture`,
      color: 'accent',
      index: 1,
    },
    {
      label: 'Request Lab',
      description: 'Interactive API explorer — fire real requests',
      meta: `${repo.endpoints.length} endpoints`,
      to: `/${rid}/request-lab`,
      color: 'warn',
      index: 2,
    },
    {
      label: 'Code Walk',
      description: 'Guided tour through the codebase, stop by stop',
      meta: `${repo.codeWalk.length} stops`,
      to: `/${rid}/code-walk`,
      color: 'accent',
      index: 3,
    },
    {
      label: 'Panic Mode',
      description: '5-minute golden bullet emergency review',
      meta: `${repo.goldenBullets.length} bullets · ${state.panicSessions} sessions done`,
      to: `/${rid}/panic`,
      color: 'danger',
      index: 4,
    },
  ];

  const stefanMeta = `${repo.stefanScripts.length} scripts · ${state.stefanSessions} sessions done`;

  const urgS = urgencyStyles[recommendation.urgency];

  const badgeColorMap: Record<string, string> = {
    blue:   'bg-brand-500/15 text-brand-400 border-brand-500/30',
    purple: 'bg-accent-500/15 text-accent-400 border-accent-500/30',
    amber:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  };

  return (
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-14 overflow-x-hidden">

      {/* Global ambient orb */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full bg-brand-500/3 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent-500/4 blur-[100px] pointer-events-none -z-10" />

      {/* ── 1. REPO HEADER ─────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0, 0, 1] }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold border tracking-wider ${badgeColorMap[repo.color] ?? badgeColorMap.blue}`}>
              {repo.badge}
            </span>
            <span className="text-xs font-mono text-gray-600 tracking-widest uppercase">Command Center</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{repo.label}</h1>
          <p className="text-gray-500 text-sm max-w-lg">{repo.character}</p>
        </div>

        {/* Repo switcher */}
        <div className="relative shrink-0" ref={menuRef}>
          <motion.button
            onClick={() => setRepoMenuOpen(o => !o)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-700 bg-surface-900 hover:bg-surface-800 text-sm text-gray-300 hover:text-white transition-colors font-medium"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            Switch Repo
            <span className="text-gray-600">{repoMenuOpen ? '▲' : '▼'}</span>
          </motion.button>

          <AnimatePresence>
            {repoMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.25, 0, 0, 1] }}
                className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-gray-700 bg-surface-900 shadow-2xl shadow-black/50 overflow-hidden z-50"
              >
                {/* Go to hub */}
                <button
                  onClick={() => { navigate('/'); setRepoMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-xs text-gray-500 hover:bg-surface-800 hover:text-gray-300 transition-colors border-b border-gray-800"
                >
                  <span>←</span> Back to Hub
                </button>
                {repos.map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setActiveRepo(r.id);
                      navigate(`/${r.id}/`);
                      setRepoMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm transition-colors ${
                      r.id === repo.id
                        ? 'bg-brand-500/10 text-brand-400'
                        : 'text-gray-400 hover:bg-surface-800 hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: r.id === repo.id ? '#6366f1' : '#4b5563' }} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.shortLabel}</p>
                      <p className="text-xs text-gray-600 truncate font-mono">{r.id}</p>
                    </div>
                    {r.id === repo.id && <span className="ml-auto text-xs text-brand-400">active</span>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* ── 2. COMPREHENSION SCORE (hero) ──────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.25, 0, 0, 1] }}
        className="relative rounded-2xl border border-gray-800 bg-surface-900/60 backdrop-blur-sm overflow-hidden"
      >
        <AmbientParticles />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 p-8 lg:p-12">
          {/* Gauge */}
          <ComprehensionGauge score={comprehension} />

          {/* Supporting stats */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 w-full lg:max-w-md">
            {[
              { label: 'Cards Due',       value: dueCount,               accent: dueCount > 0 ? 'text-danger-400' : 'text-emerald-400' },
              { label: 'Mastered',        value: masteredCount,          accent: 'text-accent-400' },
              { label: 'Total Cards',     value: allIds.length,          accent: 'text-gray-300' },
              { label: 'Panic Sessions',  value: state.panicSessions,    accent: 'text-danger-400' },
              { label: 'Stefan Sessions', value: state.stefanSessions,   accent: 'text-brand-400' },
              { label: 'Total Reviews',   value: Object.values(state.cards).reduce((s, c) => s + c.totalReviews, 0), accent: 'text-gray-400' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.18 + i * 0.06, duration: 0.35 }}
                className="rounded-xl border border-gray-800 bg-surface-950/60 px-4 py-3"
              >
                <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold tabular-nums ${stat.accent}`}>{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── 3. PRIORITY RECOMMENDATION ─────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.45, ease: [0.25, 0, 0, 1] }}
        className="space-y-3"
      >
        <p className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest">
          Recommended Next Action
        </p>

        <div className={`relative rounded-2xl border border-gray-800 ${urgS.bg} border-l-4 ${urgS.border} overflow-hidden`}>
          {/* Animated border pulse on red urgency */}
          {recommendation.urgency === 'red' && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{ opacity: [0, 0.15, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.1), transparent)' }}
            />
          )}

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-6 lg:p-8">
            <div className="flex items-start gap-4">
              <motion.div
                className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${urgS.dot}`}
                animate={{ scale: recommendation.urgency === 'red' ? [1, 1.5, 1] : 1, opacity: recommendation.urgency === 'red' ? [1, 0.5, 1] : 1 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div>
                <p className={`text-sm font-mono uppercase tracking-wider mb-1 ${urgS.text}`}>
                  {recommendation.urgency === 'red' ? 'Urgent' : recommendation.urgency === 'yellow' ? 'Suggested' : 'Ready'}
                </p>
                <p className="text-white text-lg font-semibold leading-snug max-w-xl">
                  {recommendation.message}
                </p>
              </div>
            </div>

            <motion.button
              onClick={() => navigate(recommendation.to)}
              whileHover={{ scale: 1.04, x: 2 }}
              whileTap={{ scale: 0.97 }}
              className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-colors ${urgS.btn}`}
            >
              {recommendation.ctaLabel}
              <span className="text-white/70">→</span>
            </motion.button>
          </div>
        </div>
      </motion.section>

      {/* ── 4. TOPIC HEAT MAP ──────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.45, ease: [0.25, 0, 0, 1] }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-widest">
            Topic Heat Map
          </h2>
          <span className="text-xs text-gray-700 font-mono">dark = low · bright = mastered</span>
        </div>

        <TopicHeatMap tiles={topicTiles} />
      </motion.section>

      {/* ── 5. MODULE NAVIGATION ───────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.45, ease: [0.25, 0, 0, 1] }}
        className="space-y-4"
      >
        <h2 className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-widest">
          Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {mainModules.map(mod => (
            <ModuleCard key={mod.to} {...mod} />
          ))}
        </div>
      </motion.section>

      {/* ── Stefan / When You're Ready ─────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.46, duration: 0.4, ease: [0.25, 0, 0, 1] }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest">
            When You're Ready
          </h2>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        <motion.button
          onClick={() => navigate(`/${rid}/stefan`)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="w-full sm:max-w-sm text-left rounded-xl border border-accent-500/20 bg-accent-500/5 hover:bg-accent-500/10 hover:border-accent-500/40 p-5 transition-colors group"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-400 mt-0.5" style={{ boxShadow: '0 0 8px rgba(167,139,250,0.5)' }} />
            <motion.span
              className="text-gray-600 text-sm"
              initial={{ x: 0 }}
              whileHover={{ x: 3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              →
            </motion.span>
          </div>
          <p className="text-sm font-semibold text-accent-400">Stefan Mode</p>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">Adversarial interview drill — face the hardest questions</p>
          <p className="text-xs text-gray-700 mt-2 font-mono">{stefanMeta}</p>
        </motion.button>
      </motion.section>

    </div>
  );
}
