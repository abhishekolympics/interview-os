export interface FlowStep {
  id: number;
  layer: 'http' | 'controller' | 'service' | 'db' | 'response';
  title: string;
  file: string;
  lines?: string;
  description: string;
  code?: string;
  note?: string;
  noteType?: 'warn' | 'info' | 'danger';
}

export const bonusShiftsFlow: FlowStep[] = [
  {
    id: 1,
    layer: 'http',
    title: 'HTTP Request arrives',
    file: 'main.ts',
    description: 'Client sends GET request. NestJS (Express) receives it.',
    code: 'GET /workers/1/bonus-shifts?limit=10&order=asc',
  },
  {
    id: 2,
    layer: 'controller',
    title: 'Route matched → Pipes run',
    file: 'workers.controller.ts',
    lines: '107–112',
    description: 'Three pipes execute before the controller method body.',
    code: `@Get("/:id/bonus-shifts")
async getBonusShifts(
  @Param("id", ParseIntPipe) id: number,      // ① validates :id is integer
  @CursorValidate() cursor: Cursor,            // ② parses cursor + shard
  @Query(new ZodValidationPipe(schema)) query, // ③ validates query params
)`,
    note: 'CursorValidate only parses cursor→id and shard. cursor.startAt is always undefined.',
    noteType: 'warn',
  },
  {
    id: 3,
    layer: 'service',
    title: 'Compute week boundaries',
    file: 'workers.service.ts',
    lines: '84–88',
    description: 'ISO week start calculated, then millisecond arithmetic for next week.',
    code: `const currentWeekStart = getISOWeekStart(new Date());
// (dayOfWeek + 6) % 7  →  Mon=0, Tue=1, ..., Sun=6
const nextWeekStart = new Date(
  currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000
);
const weekAfterNextStart = new Date(
  nextWeekStart.getTime()    + 7 * 24 * 60 * 60 * 1000
);`,
  },
  {
    id: 4,
    layer: 'db',
    title: 'Query 1 — Current-week bookings',
    file: 'workers.service.ts',
    lines: '90–113',
    description: 'Fetch all non-cancelled shifts for this worker this ISO week. Select workplaceId only.',
    code: `const currentWeekBookings = await this.prisma.shift.findMany({
  where: {
    workerId: id,
    cancelledAt: null,
    startAt: { gte: currentWeekStart, lt: nextWeekStart },
    shard: cursor.shard ?? 0,
  },
  select: { workplaceId: true },   // ← only what we need
});
// Count per workplace → filter count >= 2`,
  },
  {
    id: 5,
    layer: 'service',
    title: 'Qualification check',
    file: 'workers.service.ts',
    lines: '105–133',
    description: 'Count shifts per workplace. Single threshold: count >= 2 qualifies. Short-circuit if none qualify.',
    code: `const workplaceShiftCounts = new Map<number, number>();
for (const { workplaceId } of currentWeekBookings) {
  const count = workplaceShiftCounts.get(workplaceId) ?? 0;
  workplaceShiftCounts.set(workplaceId, count + 1);
}
const qualifyingIds = [...workplaceShiftCounts.entries()]
  .filter(([, count]) => count >= 2)   // ← THE threshold
  .map(([id]) => id);

if (bonusByWorkplace.size === 0) {
  return { data: [], nextCursor: undefined }; // ← short-circuit
}`,
    note: 'Interview version uses two thresholds: ≥3→0.03, ≥2→0.02 (hardcoded). fqai9cn3 fetches from DB.',
    noteType: 'info',
  },
  {
    id: 6,
    layer: 'db',
    title: 'Query 2 — Fetch bonus rates',
    file: 'workers.service.ts',
    lines: '115–129',
    description: 'Fetch streakBonusPercent from Workplace for each qualifying workplace.',
    code: `const workplaces = await this.prisma.workplace.findMany({
  where: { id: { in: qualifyingWorkplaceIds } },
  select: { id: true, streakBonusPercent: true },
});
const bonusByWorkplace = new Map(
  workplaces.map(({ id, streakBonusPercent }) => [id, streakBonusPercent])
);`,
    note: 'streakBonusPercent is ONLY in fqai9cn3 schema. Not in ncdz1yed or fqai9cn3_Interview.',
    noteType: 'info',
  },
  {
    id: 7,
    layer: 'db',
    title: 'Query 3 — Next-week shifts (cursor paginated)',
    file: 'workers.service.ts',
    lines: '144–176',
    description: 'Fetch next-week available shifts at qualifying workplaces. Take limit+1 to detect next page.',
    code: `const shifts = await this.prisma.shift.findMany({
  where: {
    workplaceId: { in: [...bonusByWorkplace.keys()] },
    cancelledAt: null,
    startAt: { gte: nextWeekStart, lt: weekAfterNextStart },
    OR: [
      { startAt: { gt: cursor.startAt } },          // after cursor
      { startAt: cursor.startAt, id: { gt: cursor.id } }, // tiebreaker
    ],
  },
  orderBy: [{ startAt: order }, { id: "asc" }],
  take: limit + 1,   // ← take+1 trick
  include: { workplace: { select: { streakBonusPercent: true } } },
});`,
    note: 'No workerId: null filter — returns claimed and unclaimed next-week shifts.',
    noteType: 'warn',
  },
  {
    id: 8,
    layer: 'service',
    title: 'Detect next page, build cursor',
    file: 'workers.service.ts',
    lines: '168–176',
    description: 'If results > limit, a next page exists. Pop the extra record and build cursor from last.',
    code: `const hasNextPage = shifts.length > limit;
if (hasNextPage) shifts.pop();   // discard the +1

const nextCursor = hasNextPage
  ? { id: last.id, shard: cursor.shard, startAt: last.startAt }
  : undefined;

return { data: shifts, nextCursor };`,
  },
  {
    id: 9,
    layer: 'controller',
    title: 'Map to DTOs',
    file: 'workers.controller.ts',
    lines: '117–120',
    description: 'Controller calls toBonusShiftDTO for each shift: converts Dates to ISO strings, adds streakBonusPercent.',
    code: `return {
  data: data.map(({ shift, streakBonusPercent }) =>
    toBonusShiftDTO(shift, streakBonusPercent)
  ),
  nextCursor,
};
// BonusShiftDTO = ShiftDTO & { streakBonusPercent: number }`,
  },
  {
    id: 10,
    layer: 'response',
    title: 'HTTP Response — JSON',
    file: 'workers.controller.ts',
    lines: '116',
    description: 'NestJS serialises the return value to JSON. Dates are ISO 8601 strings.',
    code: `{
  "data": [
    {
      "id": 42,
      "startAt": "2025-01-20T09:00:00.000Z",
      "endAt":   "2025-01-20T17:00:00.000Z",
      "jobType": "DELIVERY",
      "workplaceId": 7,
      "workerId": null,
      "createdAt": "2025-01-01T10:00:00.000Z",
      "cancelledAt": null,
      "streakBonusPercent": 15
    }
  ],
  "nextCursor": { "id": 42, "shard": 0, "startAt": "2025-01-20T09:00:00.000Z" }
}`,
  },
];

export const claimFlow: FlowStep[] = [
  {
    id: 1,
    layer: 'http',
    title: 'POST /shifts/:id/claim',
    file: 'shifts.controller.ts',
    description: 'Worker claims a shift.',
    code: 'POST /shifts/42/claim\nBody: { "workerId": 1 }',
  },
  {
    id: 2,
    layer: 'db',
    title: 'Find unclaimed shift',
    file: 'shifts.service.ts',
    lines: '40–46',
    description: 'Query with workerId: null ensures only unclaimed shifts match.',
    code: `const shift = await this.prisma.shift.findUnique({
  where: { id, workerId: null },   // workerId: null = unclaimed
});
if (!shift) return null;  // already claimed OR not found`,
    note: 'Race condition: findUnique + update is not atomic. Two workers can both read workerId: null.',
    noteType: 'danger',
  },
  {
    id: 3,
    layer: 'db',
    title: 'Update workerId',
    file: 'shifts.service.ts',
    lines: '47–51',
    description: 'Set workerId to the claiming worker.',
    code: `await this.prisma.shift.update({
  where: { id },
  data: { workerId },
});`,
  },
];

export const cancelFlow: FlowStep[] = [
  {
    id: 1,
    layer: 'http',
    title: 'POST /shifts/:id/cancel',
    file: 'shifts.controller.ts',
    description: 'Cancel a shift (soft delete).',
    code: 'POST /shifts/42/cancel',
  },
  {
    id: 2,
    layer: 'db',
    title: 'Soft delete — two fields',
    file: 'shifts.service.ts',
    lines: '53–64',
    description: 'Record stays in DB. cancelledAt gets a timestamp, workerId becomes null.',
    code: `await this.prisma.shift.update({
  where: { id },
  data: {
    cancelledAt: new Date(),   // ← soft-delete timestamp
    workerId: null,            // ← release claim
  },
});
// Row NOT deleted. cancelledAt: null = active. cancelledAt != null = cancelled.`,
  },
];
