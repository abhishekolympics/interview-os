import { useState, useCallback, useEffect } from 'react';
import { flashcards, decks, type Flashcard } from '../data/flashcards';
import Badge from '../components/Badge';

const deckColorClass: Record<string, string> = {
  brand:  'border-brand-500/30 bg-brand-500/10 text-brand-400',
  accent: 'border-accent-500/30 bg-accent-500/10 text-accent-400',
  warn:   'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  danger: 'border-danger-400/30 bg-danger-400/10 text-danger-400',
};

function FlashCard({ card }: { card: Flashcard }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative h-72 cursor-pointer select-none"
      style={{ perspective: '1200px' }}
      onClick={() => setFlipped(f => !f)}
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
          className="absolute inset-0 rounded-2xl border border-gray-800 bg-surface-900 p-6 flex flex-col justify-between"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-600">
              {card.id}
            </span>
            <div className="flex items-center gap-2">
              {card.type === 'cloze' && <Badge color="brand">CLOZE</Badge>}
              <span className="text-xs text-gray-600">Tap to flip</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center px-2 py-6">
            <p className="text-center text-lg font-medium text-white leading-relaxed whitespace-pre-line">
              {card.front}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 font-mono">{card.source}</span>
            <div className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => (
                <span
                  key={i}
                  className={`w-1 h-1 rounded-full ${i < card.relevance ? 'bg-brand-400' : 'bg-gray-800'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl border border-brand-500/20 bg-surface-900 p-6 flex flex-col justify-between"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-600">Answer</span>
            <span className="text-xs text-gray-600">Tap to flip back</span>
          </div>
          <div className="flex-1 flex items-center justify-center px-2 py-4 overflow-auto">
            <pre className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap font-mono text-center w-full">
              {card.back}
            </pre>
          </div>
          <div className="text-xs text-gray-600 font-mono text-right">{card.source}</div>
        </div>
      </div>
    </div>
  );
}

export default function Flashcards() {
  const [activeDeck, setActiveDeck] = useState<number | null>(null);
  const [cardIdx, setCardIdx] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');

  const deckCards = activeDeck !== null
    ? flashcards.filter(c => c.deck === activeDeck)
    : flashcards;

  const current = deckCards[cardIdx] ?? null;

  const prev = useCallback(() => {
    setSlideDir('left');
    setCardIdx(i => Math.max(0, i - 1));
  }, []);
  const next = useCallback(() => {
    setSlideDir('right');
    setCardIdx(i => Math.min(deckCards.length - 1, i + 1));
  }, [deckCards.length]);

  const selectDeck = (id: number | null) => {
    setActiveDeck(id);
    setCardIdx(0);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">

      <div className="space-y-3">
        <Badge color="gray">Flashcards</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">Study Mode</h1>
        <p className="text-gray-400">
          {flashcards.length} cards across {decks.length} decks. Tap a card to reveal the answer.
        </p>
      </div>

      {/* Deck selector */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => selectDeck(null)}
          className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
            activeDeck === null
              ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
              : 'border-gray-800 bg-surface-900 text-gray-400 hover:border-gray-700'
          }`}
        >
          All Decks
          <span className="ml-2 text-xs text-gray-600">{flashcards.length}</span>
        </button>
        {decks.map(deck => {
          const count = flashcards.filter(c => c.deck === deck.id).length;
          return (
            <button
              key={deck.id}
              onClick={() => selectDeck(deck.id)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                activeDeck === deck.id
                  ? `${deckColorClass[deck.color]} border-opacity-50`
                  : 'border-gray-800 bg-surface-900 text-gray-400 hover:border-gray-700'
              }`}
            >
              {deck.name}
              <span className="ml-2 text-xs opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Card */}
      {current && (
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Progress */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {cardIdx + 1} / {deckCards.length}
            </span>
            <span className="font-mono text-xs text-gray-600">
              Deck {current.deck} — {current.deckName}
            </span>
          </div>
          <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${((cardIdx + 1) / deckCards.length) * 100}%` }}
            />
          </div>

          <div
            key={`${current.id}-${cardIdx}`}
            className={slideDir === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}
          >
            <FlashCard card={current} />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={prev}
              disabled={cardIdx === 0}
              className="flex-1 py-3 rounded-xl border border-gray-800 bg-surface-900 text-sm font-medium text-gray-400 disabled:opacity-30 hover:border-gray-700 hover:text-gray-200 transition-colors disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={next}
              disabled={cardIdx === deckCards.length - 1}
              className="flex-1 py-3 rounded-xl border border-gray-800 bg-surface-900 text-sm font-medium text-gray-400 disabled:opacity-30 hover:border-gray-700 hover:text-gray-200 transition-colors disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>

          {/* Quick facts about this card */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-800 bg-surface-900 p-3 text-center">
              <p className="text-xs text-gray-600">Topic</p>
              <p className="text-xs font-mono text-gray-300 mt-0.5 truncate">{current.topic}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-surface-900 p-3 text-center">
              <p className="text-xs text-gray-600">Type</p>
              <p className="text-xs font-mono text-gray-300 mt-0.5 uppercase">{current.type}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-surface-900 p-3 text-center">
              <p className="text-xs text-gray-600">Relevance</p>
              <p className="text-xs font-mono text-gray-300 mt-0.5">{current.relevance}/10</p>
            </div>
          </div>

        </div>
      )}

      {/* Card list overview */}
      <section className="space-y-3 pt-4 border-t border-gray-800">
        <h2 className="text-base font-semibold text-white">All Cards in Session</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {deckCards.map((card, i) => (
            <button
              key={card.id}
              onClick={() => setCardIdx(i)}
              className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                i === cardIdx
                  ? 'border-brand-500/40 bg-brand-500/10'
                  : 'border-gray-800 bg-surface-900 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-gray-600">{card.id}</span>
                <span className={`text-xs font-mono ${i === cardIdx ? 'text-brand-400' : 'text-gray-600'}`}>
                  {i + 1}
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1 line-clamp-2 leading-relaxed">{card.front}</p>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}
