import type { RepoConfig, GoldenBullet, StefanScript, Endpoint, GraphData, CodeWalkStop, DeckDefinition } from '../../../types/repo'
import { flashcards, decks as rawDecks } from '../../flashcards'
import { goldenBullets as rawGoldenBullets } from '../../goldenBullets'
import { stefanScripts as rawStefan } from '../../stefan'
import { bonusShiftsFlow } from '../../requestFlow'

// ── Decks ────────────────────────────────────────────────────────────────────
const decks: DeckDefinition[] = rawDecks.map(d => ({
  id: d.id,
  name: d.name,
  description: d.description,
}))

// ── Golden Bullets ───────────────────────────────────────────────────────────
const categoryMap: Record<string, 'core' | 'gotcha' | 'math' | 'trap'> = {
  'core': 'core',
  'gotcha': 'gotcha',
  'math': 'math',
  'anti-ai-trap': 'trap',
}

function resolveCategory(tags: string[]): 'core' | 'gotcha' | 'math' | 'trap' {
  for (const tag of tags) {
    if (categoryMap[tag]) return categoryMap[tag]
  }
  return 'core'
}

const goldenBullets: GoldenBullet[] = rawGoldenBullets.map(b => ({
  id: String(b.id),
  title: b.title,
  category: resolveCategory(b.tags),
  summary: b.body.split('\n')[0],
  detail: b.body,
  source: b.code,
}))

// ── Stefan Scripts ───────────────────────────────────────────────────────────
function mapDifficulty(preset: string, type: string): 'warmup' | 'standard' | 'brutal' | 'catch' {
  if (type === 'catch-the-mistake') return 'catch'
  if (preset === 'warm-up') return 'warmup'
  if (preset === 'standard') return 'standard'
  if (preset === 'brutal') return 'brutal'
  return 'standard'
}

const stefanScripts: StefanScript[] = rawStefan.map(s => ({
  id: s.id,
  difficulty: mapDifficulty(s.preset, s.type),
  topic: s.topicFilter[0] ?? 'general',
  setup: s.text,
  questions: [s.text],
  hints: s.hint ? [s.hint] : undefined,
  keyPoints: s.correctAnswer ? [s.correctAnswer] : [],
}))

// ── Endpoints ────────────────────────────────────────────────────────────────
const endpoints: Endpoint[] = [
  {
    id: 'get-workers-bonus-shifts',
    method: 'GET',
    path: '/workers/:id/bonus-shifts',
    summary: 'Get next-week bonus shifts for a qualifying worker',
    description:
      'Returns cursor-paginated next-week shifts at workplaces where the worker has ≥2 non-cancelled shifts this ISO week. Each shift includes streakBonusPercent from the Workplace record.',
    breakdown: [
      'ParseIntPipe validates :id is an integer',
      '@CursorValidate() parses cursor (→id) and shard from query string',
      'ZodValidationPipe validates limit (1–50), order, jobType, location',
      'Q1: count current-week non-cancelled shifts per workplace',
      'Q2: fetch streakBonusPercent for qualifying workplaces (count ≥ 2)',
      'Short-circuit if no workplace qualifies → { data: [], nextCursor: undefined }',
      'Q3: fetch next-week shifts cursor-paginated with take:limit+1',
      'Detect hasNextPage via length > limit, build nextCursor from last item',
      'Map shifts to BonusShiftDTO via toBonusShiftDTO()',
    ],
    steps: bonusShiftsFlow.map(step => ({
      label: step.title,
      detail: step.description,
      code: step.code,
      file: step.file,
      lines: step.lines,
    })),
    mockRequest: {
      method: 'GET',
      path: '/workers/1/bonus-shifts',
      query: { limit: 10, order: 'asc', cursor: undefined, shard: 0 },
    },
    mockResponse: {
      data: [
        {
          id: 42,
          startAt: '2025-01-20T09:00:00.000Z',
          endAt: '2025-01-20T17:00:00.000Z',
          jobType: 'DELIVERY',
          workplaceId: 7,
          workerId: null,
          createdAt: '2025-01-01T10:00:00.000Z',
          cancelledAt: null,
          streakBonusPercent: 15,
        },
      ],
      nextCursor: { id: 42, shard: 0, startAt: '2025-01-20T09:00:00.000Z' },
    },
  },
  {
    id: 'get-workers',
    method: 'GET',
    path: '/workers',
    summary: 'List all workers (shard paginated)',
    description: 'Returns a page of workers using offset + shard pagination. Response includes links.next for the next page.',
    breakdown: [
      '@PaginationPage() reads page and shard query params',
      'prisma.worker.findMany with shard filter and offset',
      'Response: { data: WorkerDTO[], links: { self, next? } }',
    ],
    steps: [
      { label: 'HTTP Request', detail: 'GET /workers?page=1&shard=0', file: 'workers.controller.ts' },
      { label: 'Pagination decorator', detail: '@PaginationPage() builds Page { num, size:10, shard }', file: 'shared/pagination.ts', lines: '60–74' },
      { label: 'DB query', detail: 'prisma.worker.findMany({ skip, take:11, where:{ shard } })', file: 'workers.service.ts' },
      { label: 'Response', detail: '{ data: WorkerDTO[], links: { self, next? } }', file: 'workers.controller.ts' },
    ],
    mockRequest: { method: 'GET', path: '/workers', query: { page: 1, shard: 0 } },
    mockResponse: { data: [{ id: 1, name: 'Alice', status: 0 }], links: { self: '/workers?page=1&shard=0', next: '/workers?page=2&shard=0' } },
  },
  {
    id: 'post-workers',
    method: 'POST',
    path: '/workers',
    summary: 'Create a new worker',
    description: 'Creates a worker record. Body validated via Zod schema (name required as string).',
    breakdown: [
      'ZodValidationPipe validates body: { name: string }',
      'prisma.worker.create with shard=0 default',
      'Returns WorkerDTO',
    ],
    steps: [
      { label: 'HTTP Request', detail: 'POST /workers body: { name }', file: 'workers.controller.ts' },
      { label: 'Validation', detail: 'createWorkerSchema: { name: z.string() }', file: 'workers.schemas.ts' },
      { label: 'DB create', detail: 'prisma.worker.create({ data: { name, shard:0, status:0 } })', file: 'workers.service.ts' },
    ],
    mockRequest: { method: 'POST', path: '/workers', body: { name: 'Alice' } },
    mockResponse: { id: 1, name: 'Alice', status: 0 },
  },
  {
    id: 'get-worker-by-id',
    method: 'GET',
    path: '/workers/:id',
    summary: 'Get one worker by ID',
    description: 'Returns a single WorkerDTO. Throws 500 (should be 404) if not found.',
    breakdown: [
      'ParseIntPipe validates :id',
      'prisma.worker.findUnique({ where: { id } })',
      'if (!worker) throw new Error("Worker not found") → 500',
    ],
    steps: [
      { label: 'HTTP Request', detail: 'GET /workers/1', file: 'workers.controller.ts' },
      { label: 'DB query', detail: 'prisma.worker.findUnique({ where: { id } })', file: 'workers.service.ts' },
      { label: 'Not found check', detail: 'if (!worker) throw new Error → 500 (bug: should be 404)', file: 'workers.controller.ts' },
    ],
    mockRequest: { method: 'GET', path: '/workers/1' },
    mockResponse: { id: 1, name: 'Alice', status: 0 },
  },
  {
    id: 'delete-worker',
    method: 'DELETE',
    path: '/workers/:id',
    summary: 'Delete a worker',
    description: 'Hard deletes a worker record by ID.',
    breakdown: [
      'ParseIntPipe validates :id',
      'prisma.worker.delete({ where: { id } })',
    ],
    steps: [
      { label: 'HTTP Request', detail: 'DELETE /workers/1', file: 'workers.controller.ts' },
      { label: 'DB delete', detail: 'prisma.worker.delete({ where: { id } })', file: 'workers.service.ts' },
    ],
    mockRequest: { method: 'DELETE', path: '/workers/1' },
    mockResponse: { id: 1, name: 'Alice', status: 0 },
  },
  {
    id: 'get-worker-claims',
    method: 'GET',
    path: '/workers/:id/claims',
    summary: 'Get active shifts claimed by a worker',
    description: 'Returns all non-cancelled shifts where workerId matches. Uses offset+shard pagination.',
    breakdown: [
      'ParseIntPipe validates :id',
      'prisma.shift.findMany({ where: { workerId: id, cancelledAt: null } })',
      'Response: { data: ShiftDTO[], links: { self, next? } }',
    ],
    steps: [
      { label: 'HTTP Request', detail: 'GET /workers/1/claims?page=1&shard=0', file: 'workers.controller.ts' },
      { label: 'DB query', detail: 'prisma.shift.findMany({ where: { workerId, cancelledAt: null } })', file: 'workers.service.ts' },
    ],
    mockRequest: { method: 'GET', path: '/workers/1/claims' },
    mockResponse: { data: [], links: { self: '/workers/1/claims?page=1&shard=0' } },
  },
  {
    id: 'post-shifts-claim',
    method: 'POST',
    path: '/shifts/:id/claim',
    summary: 'Claim an unclaimed shift',
    description: 'Assigns workerId to a shift. findUnique with workerId:null ensures only unclaimed shifts match. Race condition: not atomic.',
    breakdown: [
      'ParseIntPipe validates :id',
      'ZodValidationPipe validates body: { workerId: number }',
      'findUnique({ where: { id, workerId: null } }) — null filter means unclaimed only',
      'if (!shift) return null → controller throws (500, not 404)',
      'update({ data: { workerId } })',
    ],
    steps: [
      { label: 'HTTP Request', detail: 'POST /shifts/42/claim body: { workerId: 1 }', file: 'shifts.controller.ts' },
      { label: 'Find unclaimed', detail: 'findUnique({ where: { id, workerId: null } })', file: 'shifts.service.ts', lines: '40–46' },
      { label: 'Update', detail: 'update({ where: { id }, data: { workerId } })', file: 'shifts.service.ts', lines: '47–51' },
    ],
    mockRequest: { method: 'POST', path: '/shifts/42/claim', body: { workerId: 1 } },
    mockResponse: { id: 42, workerId: 1, cancelledAt: null },
  },
  {
    id: 'post-shifts-cancel',
    method: 'POST',
    path: '/shifts/:id/cancel',
    summary: 'Cancel (soft-delete) a shift',
    description: 'Sets cancelledAt = new Date() and workerId = null. Record stays in DB. Two fields updated atomically.',
    breakdown: [
      'ParseIntPipe validates :id',
      'No body required',
      'update({ data: { cancelledAt: new Date(), workerId: null } })',
      'Record NOT deleted — soft delete pattern',
      'Future queries filter cancelledAt: null to exclude',
    ],
    steps: [
      { label: 'HTTP Request', detail: 'POST /shifts/42/cancel', file: 'shifts.controller.ts' },
      { label: 'Soft delete', detail: 'update({ data: { cancelledAt: new Date(), workerId: null } })', file: 'shifts.service.ts', lines: '53–64' },
    ],
    mockRequest: { method: 'POST', path: '/shifts/42/cancel' },
    mockResponse: { id: 42, cancelledAt: '2025-01-15T10:00:00.000Z', workerId: null },
  },
]

// ── Architecture Graph ────────────────────────────────────────────────────────
const architectureGraph: GraphData = {
  nodes: [
    {
      id: 'app',
      label: 'AppModule',
      type: 'module',
      description: 'Root NestJS module. Imports all feature modules. Entry point for DI container.',
      files: ['src/app.module.ts'],
      x: 400,
      y: 60,
    },
    {
      id: 'workers',
      label: 'WorkersModule',
      type: 'module',
      description: 'Feature module for workers. Declares WorkersController and provides WorkersService.',
      files: ['src/modules/workers/workers.module.ts'],
      x: 120,
      y: 180,
    },
    {
      id: 'shifts',
      label: 'ShiftsModule',
      type: 'module',
      description: 'Feature module for shifts. Provides ShiftsController, ShiftsService, and ShiftsMapper.',
      files: ['src/modules/shifts/shifts.module.ts'],
      x: 400,
      y: 180,
    },
    {
      id: 'workplaces',
      label: 'WorkplacesModule',
      type: 'module',
      description: 'Feature module for workplaces. Provides WorkplacesService with streakBonusPercent reads.',
      files: ['src/modules/workplaces/workplaces.module.ts'],
      x: 680,
      y: 180,
    },
    {
      id: 'prisma',
      label: 'PrismaModule',
      type: 'module',
      description: 'Provides and exports PrismaService. Imported by every feature module that needs DB access.',
      files: ['src/modules/prisma/prisma.module.ts'],
      x: 400,
      y: 320,
    },
    {
      id: 'wc',
      label: 'WorkersController',
      type: 'controller',
      description: 'Handles /workers routes. Extracts params, calls service, shapes response.',
      files: ['src/modules/workers/workers.controller.ts'],
      x: 40,
      y: 320,
    },
    {
      id: 'ws',
      label: 'WorkersService',
      type: 'service',
      description: 'Business logic. Contains getBonusShifts 3-query algorithm. Injected with PrismaService.',
      files: ['src/modules/workers/workers.service.ts'],
      x: 200,
      y: 320,
    },
    {
      id: 'sc',
      label: 'ShiftsController',
      type: 'controller',
      description: 'Handles /shifts routes: GET, POST, claim, cancel.',
      files: ['src/modules/shifts/shifts.controller.ts'],
      x: 310,
      y: 420,
    },
    {
      id: 'ss',
      label: 'ShiftsService',
      type: 'service',
      description: 'Shift CRUD: create, getById, get, claim (with workerId:null guard), cancel (soft delete).',
      files: ['src/modules/shifts/shifts.service.ts'],
      x: 460,
      y: 420,
    },
    {
      id: 'sm',
      label: 'ShiftsMapper',
      type: 'mapper',
      description: 'toShiftDTO() and toBonusShiftDTO(shift, streakBonusPercent). Converts Dates to ISO strings.',
      files: ['src/modules/shifts/shifts.mapper.ts'],
      x: 590,
      y: 420,
    },
    {
      id: 'wks',
      label: 'WorkplacesService',
      type: 'service',
      description: 'Reads Workplace records. Used by WorkersService to fetch streakBonusPercent for qualifying workplaces.',
      files: ['src/modules/workplaces/workplaces.service.ts'],
      x: 730,
      y: 320,
    },
    {
      id: 'ps',
      label: 'PrismaService',
      type: 'provider',
      description: 'Wraps PrismaClient. Singleton injected into all services. Provides this.prisma.worker/shift/workplace.',
      files: ['src/modules/prisma/prisma.service.ts'],
      x: 400,
      y: 480,
    },
  ],
  edges: [
    { id: 'app-workers', from: 'app', to: 'workers', label: 'imports', flowType: 'dependency' },
    { id: 'app-shifts', from: 'app', to: 'shifts', label: 'imports', flowType: 'dependency' },
    { id: 'app-workplaces', from: 'app', to: 'workplaces', label: 'imports', flowType: 'dependency' },
    { id: 'app-prisma', from: 'app', to: 'prisma', label: 'imports', flowType: 'dependency' },
    { id: 'workers-wc', from: 'workers', to: 'wc', label: 'provides', flowType: 'injection' },
    { id: 'workers-ws', from: 'workers', to: 'ws', label: 'provides', flowType: 'injection' },
    { id: 'shifts-sc', from: 'shifts', to: 'sc', label: 'provides', flowType: 'injection' },
    { id: 'shifts-ss', from: 'shifts', to: 'ss', label: 'provides', flowType: 'injection' },
    { id: 'shifts-sm', from: 'shifts', to: 'sm', label: 'provides', flowType: 'injection' },
    { id: 'workplaces-wks', from: 'workplaces', to: 'wks', label: 'provides', flowType: 'injection' },
    { id: 'ws-ss', from: 'ws', to: 'ss', label: 'shift queries', flowType: 'dataflow' },
    { id: 'ws-wks', from: 'ws', to: 'wks', label: 'bonus rates', flowType: 'dataflow' },
    { id: 'ss-ps', from: 'ss', to: 'ps', label: 'DB queries', flowType: 'dataflow' },
    { id: 'wks-ps', from: 'wks', to: 'ps', label: 'DB queries', flowType: 'dataflow' },
    { id: 'ws-sm', from: 'ws', to: 'sm', label: 'maps to DTO', flowType: 'dataflow' },
    { id: 'prisma-ps', from: 'prisma', to: 'ps', label: 'provides', flowType: 'injection' },
  ],
}

// ── Code Walk ─────────────────────────────────────────────────────────────────
const codeWalk: CodeWalkStop[] = [
  {
    id: 'cw-1',
    step: 1,
    title: 'Request arrives — 3 pipes run',
    file: 'workers.controller.ts',
    lines: '107–112',
    explanation:
      'The route handler @Get("/:id/bonus-shifts") fires three pipes before the method body executes: ParseIntPipe validates :id is an integer, @CursorValidate() parses cursor→id and shard from the query string, and ZodValidationPipe validates limit/order/filters against bonusShiftsQuerySchema.',
    why: 'NestJS pipes run declaratively — all validation is done before any service code runs. If any pipe throws, the request fails fast with a 400.',
    codeSnippet: `@Get("/:id/bonus-shifts")
async getBonusShifts(
  @Param("id", ParseIntPipe) id: number,        // ① 400 if not integer
  @CursorValidate() cursor: Cursor,             // ② parses cursor + shard
  @Query(new ZodValidationPipe(schema)) query,  // ③ validates query params
)`,
    connectsTo: 'cw-2',
  },
  {
    id: 'cw-2',
    step: 2,
    title: 'ZodValidationPipe — limit 1–50',
    file: 'shared/pipes/zod-validation.pipe.ts',
    explanation:
      'ZodValidationPipe.transform() calls schema.safeParse(value). On failure it throws BadRequestException with Zod\'s error message. bonusShiftsQuerySchema constrains limit: z.coerce.number().int().min(1).max(50).default(10).',
    why: 'Coercion is needed because query params arrive as strings. Zod\'s .coerce.number() converts "10" to 10. Explicit min/max prevents unbounded queries.',
    codeSnippet: `// workers.schemas.ts
export const bonusShiftsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  order: z.enum(['asc', 'desc']).default('asc'),
  jobType: z.string().optional(),
  location: z.string().optional(),
})`,
    connectsTo: 'cw-3',
  },
  {
    id: 'cw-3',
    step: 3,
    title: 'getBonusShifts — the 3-query algorithm',
    file: 'workers.service.ts',
    lines: '75–186',
    explanation:
      'The core method. Computes ISO week boundaries, runs Q1 (current-week bookings), qualifies workplaces (count ≥ 2), short-circuits if empty, runs Q2 (bonus rates), runs Q3 (next-week shifts cursor-paginated), builds response.',
    why: 'Three separate queries are necessary: Q1 groups by workplace, Q2 reads a different table (Workplace), Q3 applies the cursor. Combining them into one query would require complex SQL that Prisma can\'t express cleanly.',
    codeSnippet: `async getBonusShifts(
  id: number,
  cursor: Cursor,
  limit: number,
  filters: Filters,
): Promise<{ data: { shift: Shift; streakBonusPercent: number }[]; nextCursor: Cursor | undefined }> {
  // Step 1: ISO week boundaries
  // Step 2: Q1 — count current-week bookings
  // Step 3: qualify workplaces (count >= 2)
  // Step 4: short-circuit if empty
  // Step 5: Q2 — fetch bonus rates
  // Step 6: Q3 — cursor-paginated next-week shifts
}`,
    connectsTo: 'cw-4',
  },
  {
    id: 'cw-4',
    step: 4,
    title: 'Query 1 — count per workplace, threshold ≥ 2',
    file: 'workers.service.ts',
    lines: '90–119',
    explanation:
      'Q1 fetches all non-cancelled shifts for this worker this ISO week, selecting only workplaceId. A Map<workplaceId, count> is built from the results. Only workplaces with count >= 2 qualify. This is THE threshold — not 3, not 1, not variable.',
    why: 'select: { workplaceId: true } is an optimization — fetching only the field we need to count. Prisma narrows the return type automatically. The Map provides O(1) counting without a GROUP BY in SQL.',
    codeSnippet: `const currentWeekBookings = await this.prisma.shift.findMany({
  where: {
    workerId: id,
    cancelledAt: null,
    startAt: { gte: currentWeekStart, lt: nextWeekStart },
    shard: cursor.shard ?? 0,
  },
  select: { workplaceId: true },
});
const workplaceShiftCounts = new Map<number, number>();
for (const { workplaceId } of currentWeekBookings) {
  workplaceShiftCounts.set(workplaceId, (workplaceShiftCounts.get(workplaceId) ?? 0) + 1);
}
const qualifyingIds = [...workplaceShiftCounts.entries()]
  .filter(([, count]) => count >= 2)  // THE threshold
  .map(([id]) => id);`,
    connectsTo: 'cw-5',
  },
  {
    id: 'cw-5',
    step: 5,
    title: 'Short-circuit — bonusByWorkplace.size === 0',
    file: 'workers.service.ts',
    lines: '131–133',
    explanation:
      'If no workplace qualifies after Q1, the method returns immediately with an empty result. Q2 and Q3 never run. This is the most common path for new or inactive workers.',
    why: 'Early return avoids unnecessary DB queries. This pattern (check before executing) is idiomatic in service-layer code where downstream queries are expensive or conditional.',
    codeSnippet: `if (bonusByWorkplace.size === 0) {
  return { data: [], nextCursor: undefined };
}
// Only reaches Q3 if at least one workplace qualifies`,
    connectsTo: 'cw-6',
  },
  {
    id: 'cw-6',
    step: 6,
    title: 'Query 3 — take:limit+1, composite cursor OR',
    file: 'workers.service.ts',
    lines: '144–176',
    explanation:
      'Q3 fetches next-week shifts at qualifying workplaces. take: limit+1 detects pagination state without COUNT(*). The OR condition handles composite cursors: either startAt is strictly greater, OR startAt equals the cursor and id is strictly greater (tiebreaker).',
    why: 'The OR condition is necessary because multiple shifts can share the same startAt. Without the tiebreaker, ties would be skipped or repeated across pages. cursor.startAt is always undefined from real clients (@CursorValidate does not parse it).',
    codeSnippet: `const shifts = await this.prisma.shift.findMany({
  where: {
    workplaceId: { in: [...bonusByWorkplace.keys()] },
    cancelledAt: null,
    startAt: { gte: nextWeekStart, lt: weekAfterNextStart },
    OR: [
      { startAt: { gt: cursor.startAt } },
      { startAt: cursor.startAt, id: { gt: cursor.id } },
    ],
  },
  orderBy: [{ startAt: order }, { id: 'asc' }],
  take: limit + 1,
});
const hasNextPage = shifts.length > limit;
if (hasNextPage) shifts.pop();`,
    connectsTo: 'cw-7',
  },
  {
    id: 'cw-7',
    step: 7,
    title: 'shifts.mapper.ts — toBonusShiftDTO',
    file: 'shifts/shifts.mapper.ts',
    lines: '9–19',
    explanation:
      'toShiftDTO(shift) converts a Prisma Shift model to a ShiftDTO: Date fields become ISO 8601 strings via .toISOString(), and the internal shard field is omitted. toBonusShiftDTO spreads toShiftDTO and adds streakBonusPercent.',
    why: 'DTOs decouple the DB model from the API contract. Dates must be serialized because JSON.stringify on a Date produces a string but not necessarily the ISO format. Explicit .toISOString() is deterministic.',
    codeSnippet: `export function toShiftDTO(shift: Shift): ShiftDTO {
  return {
    id: shift.id,
    createdAt: shift.createdAt.toISOString(),
    startAt: shift.startAt.toISOString(),
    endAt: shift.endAt.toISOString(),
    jobType: shift.jobType,
    workplaceId: shift.workplaceId,
    workerId: shift.workerId,
    cancelledAt: shift.cancelledAt?.toISOString() ?? null,
    // shard intentionally omitted
  };
}
export function toBonusShiftDTO(shift: Shift, streakBonusPercent: number): BonusShiftDTO {
  return { ...toShiftDTO(shift), streakBonusPercent };
}`,
    connectsTo: 'cw-8',
  },
  {
    id: 'cw-8',
    step: 8,
    title: 'Response shape — { data, nextCursor }',
    file: 'workers/workers.schemas.ts',
    explanation:
      'The final response is { data: BonusShiftDTO[], nextCursor: Cursor | undefined }. When nextCursor is undefined, the JSON key is omitted entirely. This differs from other list endpoints that use { data, links: { self, next? } }.',
    why: 'Cursor pagination requires a different response shape than offset pagination. The nextCursor carries id + shard + startAt so the client can pass cursor=id&shard=N on the next request.',
    codeSnippet: `// Response
{
  "data": [
    {
      "id": 42,
      "startAt": "2025-01-20T09:00:00.000Z",
      "endAt": "2025-01-20T17:00:00.000Z",
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
]

// ── Export ────────────────────────────────────────────────────────────────────
export const bonusShiftsRepo: RepoConfig = {
  id: 'fqai9cn3',
  label: 'fqai9cn3 — Bonus Shifts',
  shortLabel: 'Bonus Shifts',
  description:
    'The primary CodeScreen submission. Cursor-based pagination, DB-driven bonus rates via streakBonusPercent, and the 3-query getBonusShifts algorithm.',
  character: 'Primary Submission',
  color: 'blue',
  badge: 'MINE',
  flashcards,
  decks,
  endpoints,
  architectureGraph,
  codeWalk,
  goldenBullets,
  stefanScripts,
}
