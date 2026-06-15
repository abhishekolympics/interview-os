export interface CardState {
  interval: number;      // days until next review
  repetitions: number;   // consecutive successful reviews
  easeFactor: number;    // starts at 2.5, min 1.3
  nextReview: string;    // ISO date string (YYYY-MM-DD)
  lastQuality: number;   // 0–5 last rating
  totalReviews: number;
}

export interface StudySession {
  date: string;         // YYYY-MM-DD
  cardId: string;
  quality: number;
}

export interface OSState {
  cards: Record<string, CardState>;
  sessions: StudySession[];
  stefanSessions: number;
  panicSessions: number;
  lastVisit: string;
}

const STORAGE_KEY = 'interview_os_state';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadState(): OSState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OSState;
  } catch {}
  return { cards: {}, sessions: [], stefanSessions: 0, panicSessions: 0, lastVisit: todayStr() };
}

export function saveState(s: OSState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function getCardState(state: OSState, cardId: string): CardState {
  return state.cards[cardId] ?? {
    interval: 1,
    repetitions: 0,
    easeFactor: 2.5,
    nextReview: todayStr(),
    lastQuality: -1,
    totalReviews: 0,
  };
}

// SM-2 algorithm. quality: 0=blackout, 1=wrong, 2=wrong-easy, 3=correct-hard, 4=correct, 5=perfect
export function sm2Update(card: CardState, quality: number): CardState {
  const q = Math.max(0, Math.min(5, quality));
  let { interval, repetitions, easeFactor } = card;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  const next = new Date();
  next.setDate(next.getDate() + interval);

  return {
    interval,
    repetitions,
    easeFactor,
    nextReview: next.toISOString().slice(0, 10),
    lastQuality: q,
    totalReviews: card.totalReviews + 1,
  };
}

export function getDueCards(state: OSState, cardIds: string[]): string[] {
  const today = todayStr();
  return cardIds.filter(id => {
    const cs = state.cards[id];
    return !cs || cs.nextReview <= today;
  });
}

// Readiness 0–100 based on mastery distribution
export function computeReadiness(state: OSState, allCardIds: string[]): number {
  if (allCardIds.length === 0) return 0;
  let score = 0;
  for (const id of allCardIds) {
    const cs = state.cards[id];
    if (!cs) { score += 0; continue; }
    if (cs.repetitions >= 3 && cs.easeFactor >= 2.3) score += 100;
    else if (cs.repetitions >= 2) score += 65;
    else if (cs.repetitions >= 1) score += 35;
    else score += 10;
  }
  // Bonus for Stefan and Panic sessions
  const bonus = Math.min(10, state.stefanSessions * 2 + state.panicSessions);
  return Math.min(100, Math.round(score / allCardIds.length + bonus));
}
