import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useRepo } from '../contexts/RepoContext'
import type { CodeWalkStop } from '../types/repo'

// ── Syntax-ish highlighting ──────────────────────────────────────────────────
// Tokenise a single line into spans with colour classes.
// Keywords → brand, strings → amber, comments → muted gray
function HighlightedLine({ line }: { line: string }) {
  // Matches (in order): line comments, block strings, keywords, and plain text
  const tokens: { text: string; cls: string }[] = []
  let rest = line

  while (rest.length > 0) {
    // Line comment: // ...
    const commentMatch = rest.match(/^(\/\/.*)/)
    if (commentMatch) {
      tokens.push({ text: commentMatch[1], cls: 'text-gray-600 italic' })
      rest = rest.slice(commentMatch[1].length)
      continue
    }

    // String / template literal (single-line)
    const strMatch = rest.match(/^(["'`][^"'`\n]*["'`])/)
    if (strMatch) {
      tokens.push({ text: strMatch[1], cls: 'text-amber-400' })
      rest = rest.slice(strMatch[1].length)
      continue
    }

    // Keywords
    const kwMatch = rest.match(
      /^(async|await|const|let|var|function|return|if|else|for|of|in|import|export|from|type|interface|class|new|true|false|null|undefined|this|extends|implements|throw|try|catch|default|break|continue|typeof|instanceof|void)\b/,
    )
    if (kwMatch) {
      tokens.push({ text: kwMatch[1], cls: 'text-brand-400 font-semibold' })
      rest = rest.slice(kwMatch[1].length)
      continue
    }

    // Everything else — consume one char to avoid infinite loop
    tokens.push({ text: rest[0], cls: 'text-gray-300' })
    rest = rest.slice(1)
  }

  return (
    <span>
      {tokens.map((t, i) => (
        <span key={i} className={t.cls}>
          {t.text}
        </span>
      ))}
    </span>
  )
}

// ── Code block with line numbers ─────────────────────────────────────────────
function WalkCodeBlock({ code, file, lines }: { code: string; file: string; lines?: string }) {
  const [copied, setCopied] = useState(false)
  const codeLines = code.split('\n')

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-800 bg-surface-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-surface-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-accent-400/60" />
          </div>
          <span className="text-xs font-mono text-gray-400">{file}</span>
          {lines && <span className="text-xs font-mono text-gray-600">L{lines}</span>}
        </div>
        <button
          onClick={copy}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-0.5 rounded hover:bg-white/5 font-mono"
        >
          {copied ? 'copied!' : 'copy'}
        </button>
      </div>

      {/* Lines */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-6">
          {codeLines.map((line, i) => (
            <div key={i} className="flex group hover:bg-white/[0.02] rounded transition-colors">
              <span className="select-none w-10 shrink-0 text-right text-gray-700 mr-4 text-xs leading-6 tabular-nums group-hover:text-gray-600 transition-colors">
                {i + 1}
              </span>
              <span className="font-mono">
                <HighlightedLine line={line || ' '} />
              </span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  )
}

// ── Ambient animated orbs ────────────────────────────────────────────────────
function AmbientOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-500/6 blur-3xl"
        animate={{ x: [0, 24, 0], y: [0, -16, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-accent-400/5 blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
    </div>
  )
}

// ── Slide direction variants ─────────────────────────────────────────────────
function slideVariants(direction: 'forward' | 'backward') {
  const xOut = direction === 'forward' ? -80 : 80
  const xIn = direction === 'forward' ? 80 : -80
  return {
    enter: { x: xIn, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: xOut, opacity: 0 },
  }
}

// ── Sidebar stop item ────────────────────────────────────────────────────────
function SidebarStop({
  stop,
  isCurrent,
  isCompleted,
  onClick,
}: {
  stop: CodeWalkStop
  isCurrent: boolean
  isCompleted: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      layout
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        isCurrent
          ? 'bg-brand-500/15 border border-brand-500/30 text-brand-300'
          : isCompleted
          ? 'bg-surface-800/60 border border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
          : 'border border-transparent text-gray-600 hover:text-gray-400'
      }`}
    >
      {/* Step number bubble */}
      <span
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-colors ${
          isCurrent
            ? 'bg-brand-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]'
            : isCompleted
            ? 'bg-surface-700 text-gray-400'
            : 'bg-surface-900 border border-gray-800 text-gray-700'
        }`}
      >
        {isCompleted && !isCurrent ? '✓' : stop.step}
      </span>

      {/* Label */}
      <span className="text-xs leading-snug line-clamp-2 flex-1">{stop.title}</span>
    </motion.button>
  )
}

// ── Main content for one stop ────────────────────────────────────────────────
function StopContent({
  stop,
  direction,
}: {
  stop: CodeWalkStop
  direction: 'forward' | 'backward'
  total: number
}) {
  const variants = slideVariants(direction)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stop.id}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="space-y-8"
      >
        {/* File badge */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-brand-500/30 bg-brand-500/8 font-mono text-xs text-brand-300">
            <span className="opacity-60">~/</span>
            {stop.file}
            {stop.lines && (
              <span className="text-brand-500/60 ml-0.5">:{stop.lines}</span>
            )}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
          {stop.title}
        </h2>

        {/* EXPLANATION */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            Explanation
          </p>
          <div className="rounded-xl border border-gray-800 bg-surface-900/60 backdrop-blur-sm p-5">
            <p className="text-sm text-gray-300 leading-relaxed">{stop.explanation}</p>
          </div>
        </div>

        {/* WHY */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-accent-400/80 uppercase tracking-widest">
            Why it matters
          </p>
          <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-5">
            <p className="text-sm text-gray-200 leading-relaxed">{stop.why}</p>
          </div>
        </div>

        {/* Code snippet */}
        {stop.codeSnippet && (
          <WalkCodeBlock code={stop.codeSnippet} file={stop.file} lines={stop.lines} />
        )}

        {/* Connects to hint */}
        {stop.connectsTo && (
          <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
            <span className="opacity-50">Next stop</span>
            <span className="text-brand-500/60">→</span>
            <span className="text-brand-400/70">{stop.connectsTo}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// ── Completion screen ────────────────────────────────────────────────────────
function CompletionScreen({
  total,
  onRestart,
  onMemoryPalace,
}: {
  total: number
  onRestart: () => void
  onMemoryPalace: () => void
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 px-4"
      >
        {/* Celebration glow */}
        <motion.div
          className="relative"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-28 h-28 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.3)]">
            <span className="text-5xl font-bold text-brand-400 font-mono">✓</span>
          </div>
          <div className="absolute inset-0 rounded-full bg-brand-500/10 blur-xl" />
        </motion.div>

        <div className="space-y-3 max-w-lg">
          <p className="text-xs font-mono text-brand-400/80 uppercase tracking-widest">
            Walk complete — {total} stops
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            You've walked the repo.
          </h2>
          <p className="text-lg text-gray-400">
            Can you narrate it from memory?
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Close your eyes and trace the request: controller pipes → service entry → Q1 → threshold check → short-circuit → Q2 → Q3 cursor → mapper → response.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRestart}
            className="px-6 py-3 rounded-xl border border-gray-700 bg-surface-900 hover:bg-surface-800 hover:border-gray-600 text-gray-200 text-sm font-semibold transition-colors"
          >
            Start Over
          </button>
          <button
            onClick={onMemoryPalace}
            className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          >
            Go to Memory Palace →
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ repoLabel }: { repoLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 px-4">
      <div className="w-16 h-16 rounded-2xl border border-gray-800 bg-surface-900 flex items-center justify-center">
        <span className="text-2xl font-mono text-gray-600">?</span>
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-lg font-semibold text-gray-300">No code walk defined</h3>
        <p className="text-sm text-gray-600">
          The repository <span className="font-mono text-gray-400">{repoLabel}</span> doesn't have a guided walk yet.
        </p>
      </div>
    </div>
  )
}

// ── Root component ───────────────────────────────────────────────────────────
export default function CodeWalk() {
  const { activeRepo, repos, setActiveRepo } = useRepo()
  const { repoId } = useParams<{ repoId?: string }>()
  const navigate = useNavigate()

  // If route provides a repoId, switch to that repo
  const repo = repoId ? repos.find(r => r.id === repoId) ?? activeRepo : activeRepo
  if (repoId && repo.id !== activeRepo.id) {
    setActiveRepo(repo.id)
  }

  const stops: CodeWalkStop[] = repo.codeWalk ?? []

  const [currentIdx, setCurrentIdx] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [completed, setCompleted] = useState(false)
  const [flashStepId, setFlashStepId] = useState<string | null>(null)

  const total = stops.length

  const goTo = useCallback(
    (idx: number) => {
      if (idx === currentIdx) return
      const dir: 'forward' | 'backward' = idx > currentIdx ? 'forward' : 'backward'
      setDirection(dir)
      setCurrentIdx(idx)
      setCompleted(false)
      setFlashStepId(stops[idx]?.id ?? null)
      setTimeout(() => setFlashStepId(null), 600)
    },
    [currentIdx, stops],
  )

  const goNext = useCallback(() => {
    if (currentIdx < total - 1) {
      goTo(currentIdx + 1)
    } else {
      setCompleted(true)
    }
  }, [currentIdx, total, goTo])

  const goPrev = useCallback(() => {
    if (currentIdx > 0) goTo(currentIdx - 1)
  }, [currentIdx, goTo])

  const restart = useCallback(() => {
    setDirection('backward')
    setCurrentIdx(0)
    setCompleted(false)
  }, [])

  const toMemoryPalace = useCallback(() => {
    navigate('/memory-palace')
  }, [navigate])

  const currentStop = stops[currentIdx]
  const progress = total > 0 ? ((currentIdx + (completed ? 1 : 0)) / total) * 100 : 0

  return (
    <div className="relative min-h-screen">
      <AmbientOrbs />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* ── Page header ── */}
        <div className="mb-8 space-y-1">
          <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">
            {repo.shortLabel}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Code Walk
          </h1>
          <p className="text-sm text-gray-500">
            A museum audio guide for the codebase. Move through each stop to understand the request lifecycle.
          </p>
        </div>

        {/* ── Empty state ── */}
        {stops.length === 0 ? (
          <EmptyState repoLabel={repo.label} />
        ) : (
          <div className="flex gap-6 items-start">

            {/* ── Left sidebar ── */}
            <aside className="hidden lg:flex flex-col w-56 xl:w-64 shrink-0 sticky top-24 space-y-1">
              <p className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-3 px-1">
                Stops
              </p>
              {stops.map((stop, idx) => (
                <motion.div
                  key={stop.id}
                  animate={
                    flashStepId === stop.id
                      ? { scale: [1, 1.04, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.35 }}
                >
                  <SidebarStop
                    stop={stop}
                    isCurrent={!completed && idx === currentIdx}
                    isCompleted={completed ? true : idx < currentIdx}
                    onClick={() => goTo(idx)}
                  />
                </motion.div>
              ))}

              {/* Completion marker */}
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                  completed
                    ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
                    : 'border-transparent text-gray-700'
                }`}
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-colors ${
                    completed
                      ? 'bg-brand-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.45)]'
                      : 'bg-surface-900 border border-gray-800 text-gray-700'
                  }`}
                >
                  {completed ? '✓' : ''}
                </span>
                <span className="text-xs">Done</span>
              </div>
            </aside>

            {/* ── Main area ── */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* Stop indicator */}
              {!completed && currentStop && (
                <div className="flex items-center justify-between">
                  <motion.p
                    key={`step-${currentIdx}`}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-xs font-mono text-gray-500 tabular-nums"
                  >
                    Stop{' '}
                    <span className="text-brand-400 font-bold">{currentIdx + 1}</span>
                    {' '}of{' '}
                    <span className="text-gray-400">{total}</span>
                  </motion.p>

                  {/* Mobile stop list dropdown hint */}
                  <p className="lg:hidden text-xs text-gray-700 font-mono">
                    {currentStop.file}
                  </p>
                </div>
              )}

              {/* Progress bar */}
              <div className="h-0.5 rounded-full bg-gray-800/80 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-500 to-accent-400 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'spring', stiffness: 180, damping: 28 }}
                />
              </div>

              {/* Content — stop or completion */}
              {completed ? (
                <CompletionScreen
                  total={total}
                  onRestart={restart}
                  onMemoryPalace={toMemoryPalace}
                />
              ) : currentStop ? (
                <StopContent
                  stop={currentStop}
                  direction={direction}
                  total={total}
                />
              ) : null}

              {/* ── Navigation ── */}
              {!completed && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-800/60">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={goPrev}
                    disabled={currentIdx === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-800 bg-surface-900 hover:bg-surface-800 hover:border-gray-700 text-sm font-medium text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="text-gray-500">←</span>
                    Prev
                  </motion.button>

                  {/* Mobile stop indicator */}
                  <div className="lg:hidden flex gap-1.5">
                    {stops.slice(0, 10).map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => goTo(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === currentIdx
                            ? 'bg-brand-400'
                            : i < currentIdx
                            ? 'bg-gray-600'
                            : 'bg-gray-800'
                        }`}
                        aria-label={`Go to stop ${i + 1}`}
                      />
                    ))}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={goNext}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-[0_0_16px_rgba(99,102,241,0.25)] hover:shadow-[0_0_24px_rgba(99,102,241,0.4)]"
                  >
                    {currentIdx === total - 1 ? 'Finish' : 'Next'}
                    <span className="opacity-80">→</span>
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
