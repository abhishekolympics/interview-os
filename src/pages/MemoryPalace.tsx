import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepo } from '../contexts/RepoContext';
import type { Flashcard, DeckDefinition } from '../types/repo';
import { loadState, saveState, getCardState, sm2Update, getDueCards, getSM2Key, type CardState } from '../data/sm2';
import Badge from '../components/Badge';

type Mode = 'overview' | 'study' | 'done';

const ratings = [
  { q: 0, label: 'Blackout', short: '0', color: 'border-red-500/30 hover:bg-red-500/10 text-red-400', key: '0' },
  { q: 2, label: 'Wrong',    short: '2', color: 'border-orange-500/30 hover:bg-orange-500/10 text-orange-400', key: '2' },
  { q: 3, label: 'Hard',     short: '3', color: 'border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-400', key: '3' },
  { q: 4, label: 'Good',     short: '4', color: 'border-accent-500/30 hover:bg-accent-500/10 text-accent-400', key: '4' },
  { q: 5, label: 'Easy',     short: '5', color: 'border-brand-500/30 hover:bg-brand-500/10 text-brand-400', key: '5' },
];

function sm2Badge(cs: CardState | null): { label: string; cls: string } {
  if (!cs || cs.totalReviews === 0) return { label: 'New', cls: 'text-gray-500 bg-gray-800/60 border-gray-700' };
  if (cs.repetitions >= 3 && cs.easeFactor >= 2.3)
    return { label: 'Mastered', cls: 'text-accent-400 bg-accent-500/10 border-accent-500/30' };
  if (cs.repetitions >= 2)
    return { label: 'Learning', cls: 'text-brand-400 bg-brand-500/10 border-brand-500/30' };
  if (cs.repetitions >= 1)
    return { label: 'Seen', cls: 'text-gray-400 bg-gray-700/30 border-gray-700' };
  return { label: 'Struggling', cls: 'text-red-400 bg-red-400/10 border-red-400/30' };
}

// Source chip — prominent, monospace, always visible on the answer side
function SourceChip({ source }: { source: string }) {
  if (!source) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-800 border border-surface-700 text-xs font-mono text-gray-400 select-all">
      <svg className="w-3 h-3 text-brand-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 4h12M2 8h8M2 12h5" strokeLinecap="round"/>
      </svg>
      {source}
    </span>
  );
}

function CardFace({ text, side, source }: { text: string; side: 'front' | 'back'; source?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 gap-4">
      <p className={`text-center leading-relaxed whitespace-pre-line ${
        side === 'front' ? 'text-lg font-medium text-white' : 'text-sm text-gray-200 font-mono'
      }`}>{text}</p>
      {side === 'back' && source && (
        <div className="flex justify-center w-full">
          <SourceChip source={source} />
        </div>
      )}
    </div>
  );
}

function StudyCard({
  card,
  cardState,
  onRate,
  idx,
  total,
}: {
  card: Flashcard;
  cardState: CardState;
  onRate: (q: number) => void;
  idx: number;
  total: number;
}) {
  const [flipped, setFlip] = useState(false);

  // Keyboard shortcuts — Space/Enter to flip, 0/2/3/4/5 to rate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!flipped) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlip(true); }
        return;
      }
      const r = ratings.find(r => r.key === e.key);
      if (r) { e.preventDefault(); onRate(r.q); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, onRate]);

  // Reset flip when card changes
  useEffect(() => { setFlip(false); }, [card.id]);

  const b = sm2Badge(cardState);

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-gray-600 font-mono">
        <span>{idx + 1} / {total} due today</span>
        <span className="capitalize">{card.deckName}</span>
      </div>
      <div className="h-0.5 rounded-full bg-gray-800 overflow-hidden">
        <motion.div
          className="h-full bg-brand-500"
          initial={{ width: 0 }}
          animate={{ width: `${(idx / total) * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      {/* 3D Card */}
      <div
        className="relative cursor-pointer select-none"
        style={{ perspective: '1200px', height: 300 }}
        onClick={() => setFlip(f => !f)}
      >
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl border border-gray-800 bg-surface-900 flex flex-col"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex items-center justify-between px-6 pt-4">
              <span className="text-xs font-mono text-gray-600">{card.id}</span>
              <span className="text-xs text-gray-600 italic">tap to reveal</span>
            </div>
            <CardFace text={card.front} side="front" />
            <div className="flex items-center justify-between px-6 pb-4">
              <span className="text-xs text-gray-600 font-mono">{card.topic}</span>
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${b.cls}`}>{b.label}</span>
            </div>
          </div>

          {/* Back — source chip always rendered here */}
          <div
            className="absolute inset-0 rounded-2xl border border-brand-500/25 bg-surface-900 flex flex-col"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="flex items-center justify-between px-6 pt-4">
              <span className="text-xs font-mono text-gray-600">Answer</span>
              <span className="text-xs text-gray-600 italic">tap to flip back</span>
            </div>
            <CardFace text={card.back} side="back" source={card.source} />
          </div>
        </div>
      </div>

      {/* Rating — visible only after flip */}
      <motion.div
        animate={{ opacity: flipped ? 1 : 0, y: flipped ? 0 : 8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`space-y-2 ${!flipped ? 'pointer-events-none' : ''}`}
      >
        <p className="text-xs text-gray-600 text-center">How well did you know this?</p>
        <div className="grid grid-cols-5 gap-2">
          {ratings.map(r => (
            <button
              key={r.q}
              onClick={e => { e.stopPropagation(); onRate(r.q); }}
              className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs transition-colors ${r.color}`}
            >
              <span className="text-base font-bold">{r.short}</span>
              <span className="opacity-70 text-center leading-tight hidden sm:block">{r.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-700 text-center">Keyboard: 0 2 3 4 5 · Space / Enter to flip</p>
      </motion.div>
    </div>
  );
}

export default function MemoryPalace() {
  const { repoId } = useParams<{ repoId: string }>();
  const { activeRepo } = useRepo();

  const flashcards: Flashcard[] = activeRepo.flashcards;
  const decks: DeckDefinition[] = activeRepo.decks;

  const sm2Key = getSM2Key(repoId ?? activeRepo.id);

  const [mode, setMode] = useState<Mode>('overview');
  const [deckFilter, setDeckFilter] = useState<number | null>(null);
  const [state, setState] = useState(() => loadState(repoId ?? activeRepo.id));
  const [studyIdx, setStudyIdx] = useState(0);
  const [sessionDone, setSessionDone] = useState<string[]>([]);

  // Re-load SM-2 state when repo changes
  useEffect(() => {
    setState(loadState(repoId ?? activeRepo.id));
    setMode('overview');
    setDeckFilter(null);
  }, [repoId, activeRepo.id]);

  const allIds = useMemo(() => flashcards.map(c => c.id), [flashcards]);

  const filteredCards = useMemo(() => {
    const base = deckFilter !== null ? flashcards.filter(c => c.deck === deckFilter) : flashcards;
    const ids = base.map(c => c.id);
    const dueIds = new Set(getDueCards(state, ids));
    return base.filter(c => dueIds.has(c.id));
  }, [state, deckFilter, flashcards]);

  const startStudy = useCallback(() => {
    setStudyIdx(0);
    setSessionDone([]);
    setMode('study');
  }, []);

  const handleRate = useCallback((q: number) => {
    const card = filteredCards[studyIdx];
    if (!card) return;
    const cs = getCardState(state, card.id);
    const updated = sm2Update(cs, q);
    const newState = { ...state, cards: { ...state.cards, [card.id]: updated } };
    setState(newState);
    saveState(newState, repoId ?? activeRepo.id);
    setSessionDone(prev => [...prev, card.id]);

    if (studyIdx + 1 >= filteredCards.length) {
      setMode('done');
    } else {
      setStudyIdx(i => i + 1);
    }
  }, [filteredCards, studyIdx, state, repoId, activeRepo.id]);

  const currentCard = filteredCards[studyIdx];
  const masteredCount = Object.values(state.cards).filter(c => c.repetitions >= 3).length;

  const deckColorMap: Record<string, string> = {
    brand:  'border-brand-500/40 bg-brand-500/10 text-brand-400',
    accent: 'border-accent-500/40 bg-accent-500/10 text-accent-400',
    warn:   'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
    danger: 'border-red-400/40 bg-red-400/10 text-red-400',
    gray:   'border-gray-700 bg-gray-800/30 text-gray-400',
  };

  function deckColor(deck: DeckDefinition): string {
    const name = deck.name.toLowerCase();
    if (name.includes('core') || name.includes('fund')) return 'brand';
    if (name.includes('arch') || name.includes('system')) return 'accent';
    if (name.includes('perf') || name.includes('optim')) return 'warn';
    if (name.includes('edge') || name.includes('error') || name.includes('gotcha')) return 'danger';
    return 'gray';
  }

  return (
    <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Ambient orb */}
      <div className="pointer-events-none fixed top-0 right-1/4 w-96 h-96 bg-brand-500/4 rounded-full blur-3xl" />

      <AnimatePresence mode="wait">

        {/* OVERVIEW */}
        {mode === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-10"
          >
            <div className="space-y-3">
              <Badge color="brand">Memory Palace</Badge>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Spaced Repetition</h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                SM-2 algorithm · cards resurface when you're about to forget them.
                Flip each card, then rate 0–5.
                <span className="ml-2 font-mono text-xs text-gray-700">{sm2Key}</span>
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Due Today',   value: getDueCards(state, allIds).length, color: 'text-yellow-400' },
                { label: 'Mastered',    value: masteredCount,                      color: 'text-accent-400' },
                { label: 'Total Cards', value: allIds.length,                      color: 'text-gray-300' },
              ].map(s => (
                <motion.div
                  key={s.label}
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="rounded-xl border border-gray-800 bg-surface-900 p-4 text-center space-y-1"
                >
                  <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-600">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Deck filter */}
            <div className="space-y-3">
              <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">Select Deck</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDeckFilter(null)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    deckFilter === null
                      ? 'border-brand-500/40 bg-brand-500/10 text-brand-400'
                      : 'border-gray-800 bg-surface-900 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  All Decks
                  <span className="ml-2 text-xs text-gray-600">{getDueCards(state, allIds).length} due</span>
                </button>
                {decks.map(deck => {
                  const ids = flashcards.filter(c => c.deck === deck.id).map(c => c.id);
                  const due = getDueCards(state, ids).length;
                  const colorKey = deckColor(deck);
                  return (
                    <button
                      key={deck.id}
                      onClick={() => setDeckFilter(deck.id)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        deckFilter === deck.id
                          ? deckColorMap[colorKey]
                          : 'border-gray-800 bg-surface-900 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      {deck.name}
                      <span className="ml-2 text-xs opacity-50">{due} due</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SM-2 guide */}
            <div className="rounded-xl border border-gray-800 bg-surface-900 p-5 space-y-3">
              <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Rating Guide</p>
              <div className="grid grid-cols-5 gap-2">
                {ratings.map(r => (
                  <div key={r.q} className={`text-center rounded-lg border p-2 ${r.color}`}>
                    <p className="text-lg font-bold">{r.short}</p>
                    <p className="text-xs mt-0.5 opacity-80">{r.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-700">
                SM-2: scores 0–2 reset the card. 3 = minimum to advance.
                Higher scores = longer interval. EaseFactor starts at 2.5.
              </p>
            </div>

            <motion.button
              onClick={startStudy}
              disabled={filteredCards.length === 0}
              whileHover={filteredCards.length > 0 ? { scale: 1.01 } : {}}
              whileTap={filteredCards.length > 0 ? { scale: 0.98 } : {}}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="w-full py-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base transition-colors"
            >
              {filteredCards.length > 0
                ? `Study ${filteredCards.length} Due Card${filteredCards.length !== 1 ? 's' : ''} →`
                : 'Nothing due — come back tomorrow'}
            </motion.button>

            {/* All cards overview */}
            <section className="space-y-3 pt-4 border-t border-gray-800">
              <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">All Cards</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {flashcards.map(card => {
                  const cs = state.cards[card.id] ?? null;
                  const b = sm2Badge(cs);
                  const isDue = getDueCards(state, [card.id]).length > 0;
                  return (
                    <motion.div
                      key={card.id}
                      whileHover={{ x: 2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                        isDue ? 'border-brand-500/20 bg-brand-500/5' : 'border-gray-800 bg-surface-900'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 truncate">
                          {card.front.slice(0, 55)}{card.front.length > 55 ? '…' : ''}
                        </p>
                        <p className="text-xs text-gray-700 font-mono">{card.id}</p>
                      </div>
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded border shrink-0 ${b.cls}`}>{b.label}</span>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          </motion.div>
        )}

        {/* STUDY */}
        {mode === 'study' && currentCard && (
          <motion.div
            key="study"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative space-y-6"
          >
            <StudyCard
              key={currentCard.id}
              card={currentCard}
              cardState={getCardState(state, currentCard.id)}
              onRate={handleRate}
              idx={studyIdx}
              total={filteredCards.length}
            />
            <button
              onClick={() => setMode('overview')}
              className="text-xs text-gray-700 hover:text-gray-500 transition-colors"
            >
              ← Exit session
            </button>
          </motion.div>
        )}

        {/* DONE */}
        {mode === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-8"
          >
            {/* Celebration ambient */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-accent-500/6 blur-3xl rounded-full" />

            <div className="space-y-3">
              <Badge color="accent">Session Complete</Badge>
              <h1 className="text-3xl font-bold text-white">All done for now.</h1>
              <p className="text-gray-400">
                Reviewed {sessionDone.length} card{sessionDone.length !== 1 ? 's' : ''}.
                SM-2 has scheduled your next reviews.
              </p>
            </div>

            {/* Results with source chips */}
            <div className="space-y-2">
              {sessionDone.map((cardId, i) => {
                const card = flashcards.find(c => c.id === cardId);
                const cs = state.cards[cardId];
                const b = sm2Badge(cs);
                return card ? (
                  <motion.div
                    key={cardId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut', delay: i * 0.03 }}
                    className="flex items-start gap-3 rounded-lg border border-gray-800 bg-surface-900 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-xs text-gray-300 truncate">
                        {card.front.slice(0, 60)}{card.front.length > 60 ? '…' : ''}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-gray-700 font-mono">
                          Next: {cs?.nextReview ?? 'tomorrow'} · interval: {cs?.interval ?? 1}d
                        </p>
                        {card.source && <SourceChip source={card.source} />}
                      </div>
                    </div>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${b.cls}`}>{b.label}</span>
                  </motion.div>
                ) : null;
              })}
            </div>

            <div className="flex gap-3">
              <motion.button
                onClick={() => setMode('overview')}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
              >
                Back to Overview
              </motion.button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
