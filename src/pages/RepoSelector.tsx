import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ALL_REPOS } from '../contexts/RepoContext'
import type { RepoConfig } from '../types/repo'
import { loadState } from '../data/sm2'

// ── Color palette per repo ────────────────────────────────────────────────────
const REPO_COLORS: Record<string, {
  orb: string
  border: string
  borderHover: string
  glow: string
  badge: string
  badgeText: string
  accent: string
  mastery: string
}> = {
  blue: {
    orb: 'radial-gradient(ellipse at center, rgba(99,102,241,0.35) 0%, transparent 70%)',
    border: 'rgba(99,102,241,0.2)',
    borderHover: 'rgba(99,102,241,0.6)',
    glow: '0 0 32px 8px rgba(99,102,241,0.18), 0 0 0 1px rgba(99,102,241,0.5)',
    badge: 'rgba(99,102,241,0.15)',
    badgeText: '#818cf8',
    accent: '#6366f1',
    mastery: '#818cf8',
  },
  purple: {
    orb: 'radial-gradient(ellipse at center, rgba(168,85,247,0.32) 0%, transparent 70%)',
    border: 'rgba(168,85,247,0.2)',
    borderHover: 'rgba(168,85,247,0.6)',
    glow: '0 0 32px 8px rgba(168,85,247,0.18), 0 0 0 1px rgba(168,85,247,0.5)',
    badge: 'rgba(168,85,247,0.15)',
    badgeText: '#c084fc',
    accent: '#a855f7',
    mastery: '#c084fc',
  },
  amber: {
    orb: 'radial-gradient(ellipse at center, rgba(245,158,11,0.28) 0%, transparent 70%)',
    border: 'rgba(245,158,11,0.2)',
    borderHover: 'rgba(245,158,11,0.6)',
    glow: '0 0 32px 8px rgba(245,158,11,0.15), 0 0 0 1px rgba(245,158,11,0.5)',
    badge: 'rgba(245,158,11,0.12)',
    badgeText: '#fbbf24',
    accent: '#f59e0b',
    mastery: '#fbbf24',
  },
}

// ── Mastery calculation ───────────────────────────────────────────────────────
function computeMastery(repo: RepoConfig): number {
  const total = repo.flashcards.length
  if (total === 0) return 0
  const state = loadState(repo.id)
  const learned = repo.flashcards.filter(card => {
    const cs = state.cards[card.id]
    return cs && cs.repetitions >= 1
  }).length
  return Math.round((learned / total) * 100)
}

// ── Ambient orb component ─────────────────────────────────────────────────────
function AmbientOrb({
  color,
  x,
  y,
  size,
  delay,
}: {
  color: string
  x: string
  y: string
  size: number
  delay: number
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: color,
        filter: 'blur(60px)',
        transform: 'translate(-50%, -50%)',
      }}
      animate={{
        opacity: [0.4, 0.7, 0.4],
        scale: [1, 1.15, 1],
      }}
      transition={{
        duration: 6 + delay,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  )
}

// ── Repo card component ───────────────────────────────────────────────────────
interface RepoCardProps {
  repo: RepoConfig
  index: number
  isLastRepo: boolean
  onClick: (repo: RepoConfig) => void
}

function RepoCard({ repo, index, isLastRepo, onClick }: RepoCardProps) {
  const palette = REPO_COLORS[repo.color]
  const mastery = computeMastery(repo)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)

  const handleClick = () => {
    setClicked(true)
    setTimeout(() => onClick(repo), 350)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay: 0.3 + index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative flex-1 min-w-[260px] max-w-[360px] cursor-pointer select-none"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={handleClick}
    >
      <motion.div
        className="relative h-full min-h-[220px] rounded-2xl p-6 flex flex-col gap-4 overflow-hidden"
        style={{
          background: 'rgba(26, 29, 39, 0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${hovered ? palette.borderHover : palette.border}`,
          boxShadow: hovered ? palette.glow : '0 2px 24px rgba(0,0,0,0.4)',
        }}
        animate={{
          scale: clicked ? 1.06 : hovered ? 1.02 : 1,
          y: hovered && !clicked ? -4 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 340,
          damping: 28,
        }}
      >
        {/* Card inner glow on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                background: `radial-gradient(ellipse at 30% 0%, ${palette.accent}18 0%, transparent 60%)`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Top row: badge chip + "continue" tag */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-mono text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-widest"
            style={{
              background: palette.badge,
              color: palette.badgeText,
              border: `1px solid ${palette.accent}40`,
            }}
          >
            {repo.badge}
          </span>

          {isLastRepo && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1, duration: 0.35 }}
              className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{
                background: 'rgba(52, 211, 153, 0.1)',
                color: '#34d399',
                border: '1px solid rgba(52,211,153,0.25)',
              }}
            >
              Continue
            </motion.span>
          )}
        </div>

        {/* Repo label */}
        <div>
          <h3 className="font-mono text-lg font-bold text-white leading-tight">
            {repo.shortLabel}
          </h3>
          <p
            className="font-mono text-xs mt-0.5 tracking-wide opacity-60"
            style={{ color: palette.badgeText }}
          >
            {repo.id}
          </p>
        </div>

        {/* Character line */}
        <p className="text-sm italic text-gray-400 leading-relaxed">
          "{repo.character}"
        </p>

        {/* Description */}
        <p className="text-xs text-gray-500 leading-relaxed flex-1">
          {repo.description}
        </p>

        {/* Mastery bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-gray-500 uppercase tracking-wider">
              Mastery
            </span>
            <span
              className="font-mono text-sm font-bold"
              style={{ color: palette.mastery }}
            >
              {mastery}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: palette.accent }}
              initial={{ width: 0 }}
              animate={{ width: `${mastery}%` }}
              transition={{ duration: 0.9, delay: 0.5 + index * 0.1, ease: 'easeOut' }}
            />
          </div>
          <p className="font-mono text-xs text-gray-600">
            {repo.flashcards.length} flashcards
          </p>
        </div>

        {/* Arrow hint */}
        <motion.div
          className="flex items-center gap-1.5 mt-1"
          animate={{ x: hovered ? 4 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <span className="text-xs font-mono" style={{ color: palette.badgeText }}>
            Enter codebase
          </span>
          <span style={{ color: palette.badgeText }} className="text-sm">→</span>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RepoSelector() {
  const navigate = useNavigate()
  const [lastRepo, setLastRepo] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('last_repo')
    if (stored) setLastRepo(stored)
  }, [])

  const handleSelect = (repo: RepoConfig) => {
    localStorage.setItem('last_repo', repo.id)
    navigate(`/${repo.id}/`)
  }

  return (
    <div className="relative min-h-screen bg-surface-950 flex flex-col items-center justify-center overflow-hidden px-6 py-16">

      {/* ── Ambient orbs ─────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AmbientOrb
          color="radial-gradient(ellipse, rgba(99,102,241,0.5) 0%, transparent 70%)"
          x="15%"
          y="25%"
          size={520}
          delay={0}
        />
        <AmbientOrb
          color="radial-gradient(ellipse, rgba(168,85,247,0.4) 0%, transparent 70%)"
          x="82%"
          y="60%"
          size={440}
          delay={2}
        />
        <AmbientOrb
          color="radial-gradient(ellipse, rgba(245,158,11,0.3) 0%, transparent 70%)"
          x="50%"
          y="85%"
          size={380}
          delay={4}
        />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 text-center mb-14 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <span className="font-mono text-xs tracking-[0.35em] text-gray-500 uppercase block mb-3">
            Mission Selection
          </span>
          <h1
            className="font-mono font-black text-5xl sm:text-7xl tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #818cf8 50%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            REPO OS
          </h1>
        </motion.div>

        <motion.p
          className="text-gray-400 text-base sm:text-lg max-w-md mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        >
          Choose your codebase. Build real understanding.
        </motion.p>

        {/* Divider line */}
        <motion.div
          className="flex items-center gap-3 justify-center pt-2"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
        >
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-brand-500/50" />
          <div className="h-1 w-1 rounded-full bg-brand-400/50" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-brand-500/50" />
        </motion.div>
      </div>

      {/* ── Repo cards ───────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-5 w-full max-w-4xl justify-center items-stretch">
        {ALL_REPOS.map((repo, i) => (
          <RepoCard
            key={repo.id}
            repo={repo}
            index={i}
            isLastRepo={lastRepo === repo.id}
            onClick={handleSelect}
          />
        ))}
      </div>

      {/* ── Footer hint ──────────────────────────────────────────────────── */}
      <motion.p
        className="relative z-10 mt-12 font-mono text-xs text-gray-700 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        Click any card to enter — progress is saved locally
      </motion.p>
    </div>
  )
}
