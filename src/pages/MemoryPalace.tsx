import { useState, useMemo, useCallback } from 'react';
import { flashcards, decks } from '../data/flashcards';
import { loadState, saveState, getCardState, sm2Update, getDueCards, type CardState } from '../data/sm2';
import Badge from '../components/Badge';

type Mode = 'overview' | 'study' | 'done';

const ratings = [
  { q: 0, label: 'Blackout', short: '0', color: 'border-red-500/30 hover:bg-red-500/10 text-red-400', key: '0' },
  { q: 2, label: 'Wrong', short: '2', color: 'border-orange-500/30 hover:bg-orange-500/10 text-orange-400', key: '2' },
  { q: 3, label: 'Hard', short: '3', color: 'border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-400', key: '3' },
  { q: 4, label: 'Good', short: '4', color: 'border-accent-500/30 hover:bg-accent-500/10 text-accent-400', key: '4' },
  { q: 5, label: 'Easy', short: '5', color: 'border-brand-500/30 hover:bg-brand-500/10 text-brand-400', key: '5' },
];

function sm2Badge(cs: CardState | null): { label: string; cls: string } {
  if (!cs || cs.totalReviews === 0) return { label: 'New', cls: 'text-gray-500 bg-gray-800/60 border-gray-700' };
  if (cs.repetitions >= 3 && cs.easeFactor >= 2.3)
    return { label: 'Mastered', cls: 'text-accent-400 bg-accent-500/10 border-accent-500/30' };
  if (cs.repetitions >= 2)
    return { label: 'Learning', cls: 'text-brand-400 bg-brand-500/10 border-brand-500/30' };
  if (cs.repetitions >= 1)
    return { label: 'Seen', cls: 'text-gray-400 bg-gray-700/30 border-gray-700' };
  return { label: 'Struggling', cls: 'text-danger-400 bg-danger-400/10 border-danger-400/30' };
}

function CardFace({ text, side }: { text: string; side: 'front' | 'back' }) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-6">
      <p className={`text-center leading-relaxed whitespace-pre-line ${
        side === 'front' ? 'text-lg font-medium text-white' : 'text-sm text-gray-200 font-mono'
      }`}>{text}</p>
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
  card: typeof flashcards[0];
  cardState: CardState;
  onRate: (q: number) => void;
  idx: number;
  total: number;
}) {
  const [flipped, setFlip] = useState(false);

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-gray-600 font-mono">
        <span>{idx + 1} / {total} due today</span>
        <span className="capitalize">{card.deckName}</span>
      </div>
      <div className="h-0.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full bg-brand-500 transition-all"
          style={{ width: `${(idx / total) * 100}%` }}
        />
      </div>

      {/* 3D Card */}
      <div
        className="relative cursor-pointer select-none"
        style={{ perspective: '1200px', height: 280 }}
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
              <span className="text-xs text-gray-600 italic">tap to flip</span>
            </div>
            <CardFace text={card.front} side="front" />
            <div className="flex items-center justify-between px-6 pb-4">
              <span className="text-xs text-gray-600 font-mono">{card.source}</span>
              {(() => { const b = sm2Badge(cardState); return (
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${b.cls}`}>{b.label}</span>
              ); })()}
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl border border-brand-500/25 bg-surface-900 flex flex-col"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="flex items-center justify-between px-6 pt-4">
              <span className="text-xs font-mono text-gray-600">Answer</span>
              <span className="text-xs text-gray-600 italic">tap to flip back</span>
            </div>
            <CardFace text={card.back} side="back" />
          </div>
        </div>
      </div>

      {/* Rating — only show after flip */}
      <div className={`space-y-2 transition-opacity duration-300 ${flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <p className="text-xs text-gray-600 text-center">How well did you know this?</p>
        <div className="grid grid-cols-5 gap-2">
          {ratings.map(r => (
            <button
              key={r.q}
              onClick={() => onRate(r.q)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs transition-colors ${r.color}`}
            >
              <span className="text-base font-bold">{r.short}</span>
              <span className="opacity-70 text-center leading-tight hidden sm:block">{r.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-700 text-center">Keyboard: 0, 2, 3, 4, 5</p>
      </div>
    </div>
  );
}

export default function MemoryPalace() {
  const [mode, setMode] = useState<Mode>('overview');
  const [deckFilter, setDeckFilter] = useState<number | null>(null);
  const [state, setState] = useState(() => loadState());
  const [studyIdx, setStudyIdx] = useState(0);
  const [sessionDone, setSessionDone] = useState<string[]>([]);

  const allIds = useMemo(() => flashcards.map(c => c.id), []);
  const filteredCards = useMemo(() => {
    const base = deckFilter !== null ? flashcards.filter(c => c.deck === deckFilter) : flashcards;
    const ids = base.map(c => c.id);
    const dueIds = new Set(getDueCards(state, ids));
    return base.filter(c => dueIds.has(c.id));
  }, [state, deckFilter]);

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
    saveState(newState);
    setSessionDone(prev => [...prev, card.id]);

    if (studyIdx + 1 >= filteredCards.length) {
      setMode('done');
    } else {
      setStudyIdx(i => i + 1);
    }
  }, [filteredCards, studyIdx, state]);

  // Keyboard shortcut for ratings
  const currentCard = filteredCards[studyIdx];
  const masteredCount = Object.values(state.cards).filter(c => c.repetitions >= 3).length;

  const deckColorMap: Record<string, string> = {
    brand: 'border-brand-500/30 bg-brand-500/10 text-brand-400',
    accent: 'border-accent-500/30 bg-accent-500/10 text-accent-400',
    warn: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
    danger: 'border-danger-400/30 bg-danger-400/10 text-danger-400',
    gray: 'border-gray-700 bg-gray-800/30 text-gray-400',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

      {mode === 'overview' && (
        <div className="space-y-10">
          <div className="space-y-3">
            <Badge color="brand">Memory Palace</Badge>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Spaced Repetition</h1>
            <p className="text-gray-400">
              SM-2 algorithm. Cards resurface when you're about to forget them.
              Rate each card 0–5 after flipping.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Due Today', value: getDueCards(state, allIds).length, color: 'text-warn-400' },
              { label: 'Mastered', value: masteredCount, color: 'text-accent-400' },
              { label: 'Total Cards', value: allIds.length, color: 'text-gray-300' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-gray-800 bg-surface-900 p-4 text-center space-y-1">
                <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-600">{s.label}</p>
              </div>
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
                return (
                  <button
                    key={deck.id}
                    onClick={() => setDeckFilter(deck.id)}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      deckFilter === deck.id
                        ? deckColorMap[deck.color] || deckColorMap.gray
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
              Higher scores = longer interval before next review. EaseFactor starts at 2.5.
            </p>
          </div>

          <button
            onClick={startStudy}
            disabled={filteredCards.length === 0}
            className="w-full py-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base transition-colors"
          >
            {filteredCards.length > 0
              ? `Study ${filteredCards.length} Due Card${filteredCards.length > 1 ? 's' : ''} →`
              : 'Nothing due — come back tomorrow'}
          </button>

          {/* All cards overview */}
          <section className="space-y-3 pt-4 border-t border-gray-800">
            <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">All Cards</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {flashcards.map(card => {
                const cs = state.cards[card.id] ?? null;
                const b = sm2Badge(cs);
                const isDue = getDueCards(state, [card.id]).length > 0;
                return (
                  <div
                    key={card.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                      isDue ? 'border-brand-500/20 bg-brand-500/5' : 'border-gray-800 bg-surface-900'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">{card.front.slice(0, 55)}{card.front.length > 55 ? '…' : ''}</p>
                      <p className="text-xs text-gray-700 font-mono">{card.id}</p>
                    </div>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded border shrink-0 ${b.cls}`}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {mode === 'study' && currentCard && (
        <div className="space-y-6">
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
        </div>
      )}

      {mode === 'done' && (
        <div className="space-y-8">
          <div className="space-y-3">
            <Badge color="accent">Session Complete</Badge>
            <h1 className="text-3xl font-bold text-white">All done for now.</h1>
            <p className="text-gray-400">
              Reviewed {sessionDone.length} card{sessionDone.length > 1 ? 's' : ''}. SM-2 has scheduled your next reviews.
            </p>
          </div>

          {/* Results */}
          <div className="space-y-2">
            {sessionDone.map(cardId => {
              const card = flashcards.find(c => c.id === cardId);
              const cs = state.cards[cardId];
              const b = sm2Badge(cs);
              return card ? (
                <div key={cardId} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-surface-900 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{card.front.slice(0, 60)}…</p>
                    <p className="text-xs text-gray-700 font-mono">
                      Next review: {cs?.nextReview ?? 'tomorrow'} · interval: {cs?.interval ?? 1}d
                    </p>
                  </div>
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded border shrink-0 ${b.cls}`}>{b.label}</span>
                </div>
              ) : null;
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setMode('overview')}
              className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
            >
              Back to Overview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
