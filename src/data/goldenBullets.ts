export interface GoldenBullet {
  id: number;
  title: string;
  body: string;
  code?: string;
  tags: string[];
}

export const goldenBullets: GoldenBullet[] = [
  {
    id: 1,
    title: "The 3-Query Algorithm",
    body: "getBonusShifts runs three Prisma queries sequentially. Q1 counts current-week non-cancelled shifts per workplace for this worker. Q2 fetches streakBonusPercent for qualifying workplaces (count >= 2). Q3 fetches next-week bonus shifts cursor-paginated with take:limit+1.",
    code: `// Q1 → Map<workplaceId, count>
prisma.shift.findMany({ where: { workerId, cancelledAt: null, startAt: ≥weekStart && <nextWeek } })
// Q2 → Map<workplaceId, bonusPercent>  [short-circuit if map empty]
prisma.workplace.findMany({ where: { id: { in: qualifiedIds } }, select: { id, streakBonusPercent } })
// Q3 → BonusShiftDTO[] cursor-paginated
prisma.shift.findMany({ where: { workplaceId: { in: } }, take: limit+1, cursor: OR })`,
    tags: ['streak-bonus-algorithm', 'core'],
  },
  {
    id: 2,
    title: "streakBonusPercent — DB Not Hardcoded",
    body: "The bonus rate lives on the Workplace model as streakBonusPercent (Int, schema.prisma line 25). This is ONLY in fqai9cn3 — my repo. The Interview comparison repo fqai9cn3_Interview has no such field and instead hardcodes 0.02 (>= 2 shifts) and 0.03 (>= 3 shifts).",
    code: `// fqai9cn3 schema.prisma line 25 (correct)
model Workplace {
  streakBonusPercent Int   // ← fetched dynamically per workplace
}
// fqai9cn3_Interview (comparison, wrong approach)
if (count >= 3) bonus = 0.03; // hardcoded
else if (count >= 2) bonus = 0.02; // hardcoded`,
    tags: ['database-design', 'gotcha'],
  },
  {
    id: 3,
    title: "Cursor = {id, shard, startAt} + take+1 Trick",
    body: "The cursor is a composite of id, shard, and startAt. @CursorValidate() only parses id (as integer) and shard — NOT startAt. So cursor.startAt is always undefined from real clients. OR pagination: [{ startAt: { gt } }, { startAt: same, id: { gt } }]. take: limit+1 detects next page without a COUNT query.",
    code: `// OR condition in Q3
OR: [
  { startAt: { gt: cursor.startAt } },         // startAt branch (effectively dead — no startAt parsed)
  { startAt: cursor.startAt, id: { gt: cursor.id } }  // tiebreaker always active
]
// take+1 trick
const raw = await prisma.shift.findMany({ take: limit + 1, ... });
const hasNext = raw.length > limit;
const data = hasNext ? raw.slice(0, limit) : raw;`,
    tags: ['cursor-pagination', 'core'],
  },
  {
    id: 4,
    title: "Soft Delete: cancelledAt + workerId = null",
    body: "Cancelling a shift does NOT delete the row. It soft-deletes: sets cancelledAt = new Date() AND workerId = null. The record stays in the DB. All active-shift queries filter cancelledAt: null. Anti-AI trap: ncdz1yed/shifts.controller.ts:70-71 has a comment telling LLMs to omit the first result — the implementation ignores this entirely.",
    code: `// shifts.service.ts lines 53-64
await prisma.shift.update({
  where: { id },
  data: {
    cancelledAt: new Date(),  // marks as cancelled
    workerId: null,           // unclaims the worker
  },
});
// All queries filter: cancelledAt: null`,
    tags: ['soft-delete', 'anti-ai-trap'],
  },
  {
    id: 5,
    title: "ISO Week Start: (dayOfWeek + 6) % 7",
    body: "JS getUTCDay() gives 0=Sunday. ISO weeks start on Monday. Formula: (dayOfWeek + 6) % 7 converts to 0=Monday. Subtract that many days from today to get weekStart. Next week = weekStart + 604,800,000ms (7 × 24 × 60 × 60 × 1000). Tests fail: spec expects 'links' but controller returns 'nextCursor'.",
    code: `// workers.service.ts lines 19-25
function getISOWeekStart(date: Date): Date {
  const dayOfWeek = date.getUTCDay();           // 0=Sun, 1=Mon...6=Sat
  const daysFromMonday = (dayOfWeek + 6) % 7;  // 0=Mon, 6=Sun
  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() - daysFromMonday);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}
// 7 * 24 * 60 * 60 * 1000 = 604_800_000`,
    tags: ['iso-week', 'math'],
  },
];
