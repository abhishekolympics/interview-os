import type { RepoConfig, GoldenBullet, StefanScript, Endpoint, GraphData, CodeWalkStop, DeckDefinition, Flashcard } from '../../../types/repo'
import { flashcards as allFlashcards, decks as rawDecks } from '../../flashcards'
import { stefanScripts as rawStefan } from '../../stefan'

// ── Flashcards — filter to relevant subset ───────────────────────────────────
// Include cards from deck 1 (Core Algorithm) that explain differences,
// and any card whose front or back mentions interview-relevant terms.
const interviewKeywords = [
  'fqai9cn3_Interview', 'offset', 'hardcoded', 'e2e', 'skip/take', 'skip',
  'COUNT', 'test', 'interview', 'Interview', 'OFFSET', 'offset pagination',
  'two thresholds', 'hardcode',
]

const interviewFlashcards: Flashcard[] = allFlashcards.filter(card => {
  const text = `${card.front} ${card.back}`.toLowerCase()
  // Always include deck 1 core algorithm cards
  if (card.deck === 1) return true
  // Include vocabulary cards about offset pagination
  if (card.topic === 'cursor-pagination' && card.deck === 0) return true
  // Include cards mentioning interview-specific terms
  return interviewKeywords.some(kw => text.includes(kw.toLowerCase()))
})

// ── Decks ─────────────────────────────────────────────────────────────────────
const decks: DeckDefinition[] = rawDecks
  .filter(d => d.id === 0 || d.id === 1)
  .map(d => ({ id: d.id, name: d.name, description: d.description }))

// ── Golden Bullets ────────────────────────────────────────────────────────────
const goldenBullets: GoldenBullet[] = [
  {
    id: 'iv-gb-1',
    title: 'Offset Pagination',
    category: 'core',
    summary: 'Uses skip=(page-1)*limit, take=limit — standard but O(N) at scale.',
    detail:
      'The Interview version paginates using Prisma\'s skip/take. Each page computes skip = (pageNum - 1) * pageSize, then fetches pageSize + 1 rows (the +1 trick to detect next page still exists). This is simpler to implement but has O(N) scan overhead and race conditions under concurrent inserts.',
    source: 'fqai9cn3_Interview/pagination.ts:51–65',
    info: [
      { label: 'Method', value: 'skip=(page-1)*limit, take=limit' },
      { label: 'Problem', value: 'O(N) scan — DB reads and discards N rows before returning results' },
      { label: 'Race condition', value: 'Inserts/deletes between pages can cause rows to appear twice or be skipped' },
      { label: 'Primary repo', value: 'Uses cursor-based (keyset) pagination — avoids both problems' },
    ],
  },
  {
    id: 'iv-gb-2',
    title: 'Hardcoded Rates',
    category: 'gotcha',
    summary: '≥3 shifts → 3%, ≥2 shifts → 2%. No DB field — rates are baked into code.',
    detail:
      'fqai9cn3_Interview computes bonus rates inline with hardcoded constants. Two thresholds: if (count >= 3) bonusByWorkplace.set(workplaceId, 0.03); else if (count >= 2) bonusByWorkplace.set(workplaceId, 0.02). These values cannot be changed without a code deploy. The primary repo (fqai9cn3) stores the rate per-workplace in Workplace.streakBonusPercent — a DB field, no hardcoding.',
    source: 'fqai9cn3_Interview/workers.service.ts:97–98',
    info: [
      { label: '≥3 shifts', value: '0.03 (3%)' },
      { label: '≥2 shifts', value: '0.02 (2%)' },
      { label: 'Primary repo', value: 'Workplace.streakBonusPercent from DB — per-workplace, configurable' },
      { label: 'Schema', value: 'No streakBonusPercent field in fqai9cn3_Interview schema' },
    ],
  },
  {
    id: 'iv-gb-3',
    title: 'E2E Test Suite — 320 Lines',
    category: 'core',
    summary: 'Jest + supertest, tests all pagination scenarios, edge cases, and error responses.',
    detail:
      'test/bonus-shifts.e2e-spec.ts is a 320-line end-to-end test suite. It boots the NestJS application via supertest, seeds the SQLite database before each test, and verifies every scenario: first page, subsequent pages, empty results, qualification threshold, filter params, limit validation, and cursor continuity.',
    source: 'fqai9cn3_Interview/test/bonus-shifts.e2e-spec.ts',
    info: [
      { label: 'Lines', value: '320' },
      { label: 'Libraries', value: 'Jest (runner), supertest (HTTP assertions)' },
      { label: 'Coverage', value: 'All pagination scenarios, edge cases, error responses' },
      { label: 'Note', value: 'Primary repo (fqai9cn3) test has a bug: expects "links" but controller returns "nextCursor"' },
    ],
  },
  {
    id: 'iv-gb-4',
    title: 'No streakBonusPercent',
    category: 'gotcha',
    summary: 'Bonus % computed inline — not from DB. Schema has no such field.',
    detail:
      'The Interview version has no streakBonusPercent field in schema.prisma. The Workplace model in this repo only has id, name, location, status, and shard. The bonus percentage is computed inline during qualification checking with hardcoded values. This means the schema is simpler but inflexible — changing bonus rates requires code changes.',
    source: 'fqai9cn3_Interview/server/prisma/schema.prisma',
    info: [
      { label: 'Field absent', value: 'streakBonusPercent NOT in Workplace model' },
      { label: 'Rate computation', value: 'Inline: count>=3 ? 0.03 : 0.02' },
      { label: 'Primary repo', value: 'streakBonusPercent Int on Workplace, fetched in Query 2' },
    ],
  },
  {
    id: 'iv-gb-5',
    title: 'ORDER BY + OFFSET Stability',
    category: 'gotcha',
    summary: 'Offset pagination is only deterministic if data does not change between pages.',
    detail:
      'With ORDER BY startAt OFFSET N LIMIT M: if a row is inserted between page 1 and page 2 requests, the offsets shift and you may see a row twice or skip one. This is the classic "pagination drift" problem. Cursor-based pagination (fqai9cn3 primary) anchors to the last seen record — inserts before or after the cursor do not affect subsequent pages.',
    source: 'fqai9cn3_Interview/pagination.ts:51–65',
    info: [
      { label: 'Drift scenario', value: 'Insert between pages → record appears on both page 1 and page 2' },
      { label: 'Skip scenario', value: 'Delete between pages → record appears on neither page' },
      { label: 'Fix', value: 'Use cursor/keyset pagination (what fqai9cn3 does)' },
    ],
  },
]

// ── Stefan Scripts — warmup only ──────────────────────────────────────────────
const stefanScripts: StefanScript[] = rawStefan
  .filter(s => s.preset === 'warm-up')
  .map(s => ({
    id: `iv-${s.id}`,
    difficulty: 'warmup' as const,
    topic: s.topicFilter[0] ?? 'general',
    setup: s.text,
    questions: [s.text],
    keyPoints: s.correctAnswer ? [s.correctAnswer] : [],
  }))

// ── Endpoints ─────────────────────────────────────────────────────────────────
const endpoints: Endpoint[] = [
  {
    id: 'iv-get-workers-bonus-shifts',
    method: 'GET',
    path: '/workers/:id/bonus-shifts',
    summary: 'Get bonus shifts — offset paginated (Interview version)',
    description:
      'Returns a page of next-week shifts using SKIP/TAKE offset pagination. Bonus rates are hardcoded: ≥3 shifts → 3%, ≥2 shifts → 2%. No streakBonusPercent field.',
    breakdown: [
      'ParseIntPipe validates :id',
      'Offset pagination: skip = (page - 1) * limit, take = limit',
      'Q1: count current-week non-cancelled shifts per workplace',
      'Qualification: ≥3 → 0.03, ≥2 → 0.02 (hardcoded)',
      'Q3: fetch next-week shifts at qualifying workplaces with SKIP/TAKE',
      'Response: { data: BonusShiftDTO[], links: { self, next? } }',
    ],
    steps: [
      { label: 'HTTP Request', detail: 'GET /workers/1/bonus-shifts?page=1&limit=10', file: 'workers.controller.ts' },
      { label: 'Offset computation', detail: 'skip = (page-1) * limit, take = limit + 1', file: 'workers.service.ts', lines: '~80' },
      { label: 'Q1: Count bookings', detail: 'findMany current-week non-cancelled shifts, select workplaceId', file: 'workers.service.ts', lines: '90–110' },
      { label: 'Hardcoded rates', detail: 'if (count >= 3) rate = 0.03; else if (count >= 2) rate = 0.02', file: 'workers.service.ts', lines: '97–98' },
      { label: 'Q3: Fetch next-week', detail: 'findMany with skip/take, orderBy startAt', file: 'workers.service.ts', lines: '120–160' },
      { label: 'Response', detail: '{ data: BonusShiftDTO[], links: { self, next? } }', file: 'workers.controller.ts' },
    ],
    mockRequest: { method: 'GET', path: '/workers/1/bonus-shifts', query: { page: 1, limit: 10 } },
    mockResponse: {
      data: [{ id: 42, startAt: '2025-01-20T09:00:00.000Z', streakBonusPercent: 0.02 }],
      links: { self: '/workers/1/bonus-shifts?page=1&limit=10', next: '/workers/1/bonus-shifts?page=2&limit=10' },
    },
  },
  {
    id: 'iv-post-shifts-claim',
    method: 'POST',
    path: '/shifts/:id/claim',
    summary: 'Claim a shift',
    description: 'Same claim logic as primary repo.',
    breakdown: ['findUnique with workerId: null', 'update({ data: { workerId } })'],
    steps: [
      { label: 'Find unclaimed', detail: 'findUnique({ where: { id, workerId: null } })', file: 'shifts.service.ts', lines: '40–46' },
      { label: 'Update', detail: 'update({ data: { workerId } })', file: 'shifts.service.ts', lines: '47–51' },
    ],
    mockRequest: { method: 'POST', path: '/shifts/42/claim', body: { workerId: 1 } },
    mockResponse: { id: 42, workerId: 1 },
  },
]

// ── Architecture Graph ────────────────────────────────────────────────────────
const architectureGraph: GraphData = {
  nodes: [
    {
      id: 'app',
      label: 'AppModule',
      type: 'module',
      description: 'Root NestJS module. Same structure as primary repo.',
      files: ['src/app.module.ts'],
      x: 400,
      y: 60,
    },
    {
      id: 'workers',
      label: 'WorkersModule',
      type: 'module',
      description: 'Feature module. No cursor pagination — uses offset/skip.',
      files: ['src/modules/workers/workers.module.ts'],
      x: 120,
      y: 180,
    },
    {
      id: 'shifts',
      label: 'ShiftsModule',
      type: 'module',
      description: 'Feature module for shifts.',
      files: ['src/modules/shifts/shifts.module.ts'],
      x: 400,
      y: 180,
    },
    {
      id: 'workplaces',
      label: 'WorkplacesModule',
      type: 'module',
      description: 'No streakBonusPercent reads — bonus rates are hardcoded.',
      files: ['src/modules/workplaces/workplaces.module.ts'],
      x: 680,
      y: 180,
    },
    {
      id: 'prisma',
      label: 'PrismaModule',
      type: 'module',
      description: 'Provides PrismaService. Schema has no streakBonusPercent field.',
      files: ['src/modules/prisma/prisma.module.ts'],
      x: 400,
      y: 320,
    },
    {
      id: 'wc',
      label: 'WorkersController',
      type: 'controller',
      description: 'Handles /workers routes with offset pagination.',
      files: ['src/modules/workers/workers.controller.ts'],
      x: 40,
      y: 320,
    },
    {
      id: 'ws',
      label: 'WorkersService',
      type: 'service',
      description: 'getBonusShifts with hardcoded rates. No DB lookup for bonus %.',
      files: ['src/modules/workers/workers.service.ts'],
      x: 200,
      y: 320,
    },
    {
      id: 'sc',
      label: 'ShiftsController',
      type: 'controller',
      description: 'Handles /shifts routes.',
      files: ['src/modules/shifts/shifts.controller.ts'],
      x: 310,
      y: 420,
    },
    {
      id: 'ss',
      label: 'ShiftsService',
      type: 'service',
      description: 'Shift CRUD.',
      files: ['src/modules/shifts/shifts.service.ts'],
      x: 460,
      y: 420,
    },
    {
      id: 'sm',
      label: 'ShiftsMapper',
      type: 'mapper',
      description: 'toBonusShiftDTO — same pattern, but streakBonusPercent comes from inline hardcoded value.',
      files: ['src/modules/shifts/shifts.mapper.ts'],
      x: 590,
      y: 420,
    },
    {
      id: 'wks',
      label: 'WorkplacesService',
      type: 'service',
      description: 'Does NOT read streakBonusPercent — field does not exist in this schema.',
      files: ['src/modules/workplaces/workplaces.service.ts'],
      x: 730,
      y: 320,
    },
    {
      id: 'ps',
      label: 'PrismaService',
      type: 'provider',
      description: 'PrismaClient singleton. Workplace model has no streakBonusPercent.',
      files: ['src/modules/prisma/prisma.service.ts'],
      x: 400,
      y: 480,
    },
    {
      id: 'e2eTests',
      label: 'E2E Test Suite',
      type: 'provider',
      description: '320-line Jest+supertest test suite. Tests all pagination scenarios and edge cases.',
      files: ['test/bonus-shifts.e2e-spec.ts'],
      x: 200,
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
    { id: 'ss-ps', from: 'ss', to: 'ps', label: 'DB queries', flowType: 'dataflow' },
    { id: 'ws-sm', from: 'ws', to: 'sm', label: 'maps to DTO', flowType: 'dataflow' },
    { id: 'prisma-ps', from: 'prisma', to: 'ps', label: 'provides', flowType: 'injection' },
    { id: 'shifts-e2e', from: 'shifts', to: 'e2eTests', label: 'tested by', flowType: 'dependency' },
  ],
}

// ── Code Walk ─────────────────────────────────────────────────────────────────
const codeWalk: CodeWalkStop[] = [
  {
    id: 'iv-cw-1',
    step: 1,
    title: 'Request arrives — same entry point',
    file: 'workers.controller.ts',
    explanation:
      'The route handler is identical: @Get("/:id/bonus-shifts") with ParseIntPipe and Zod validation. The difference starts inside the service method where pagination logic diverges.',
    why: 'The controller layer is the same NestJS pattern. The Interview version diverges in the service, not the controller.',
    codeSnippet: `@Get("/:id/bonus-shifts")
async getBonusShifts(
  @Param("id", ParseIntPipe) id: number,
  @Query(new ZodValidationPipe(schema)) query: BonusShiftsQuery,
)`,
    connectsTo: 'iv-cw-2',
  },
  {
    id: 'iv-cw-2',
    step: 2,
    title: 'Offset pagination — skip=(page-1)*limit',
    file: 'workers.service.ts',
    explanation:
      'Instead of a cursor, the Interview version computes skip = (pageNum - 1) * pageSize and passes it to Prisma. This is OFFSET pagination: the DB scans and discards the first N rows before returning M rows. O(N) cost grows with page number.',
    why: 'Simpler to implement — no cursor state to manage. But problematic under concurrent writes and slow on large offsets.',
    codeSnippet: `// fqai9cn3_Interview pagination
const skip = (page.num - 1) * page.size;
const shifts = await this.prisma.shift.findMany({
  skip,
  take: page.size + 1,  // +1 to detect next page
  where: { ... },
  orderBy: { startAt: 'asc' },
});`,
    connectsTo: 'iv-cw-3',
  },
  {
    id: 'iv-cw-3',
    step: 3,
    title: 'Hardcoded rates — ≥3 → 0.03, ≥2 → 0.02',
    file: 'workers.service.ts',
    lines: '97–98',
    explanation:
      'After counting shifts per workplace, the Interview version applies hardcoded bonus rates. Two thresholds: 3+ shifts this week qualifies for 3%, 2+ shifts qualifies for 2%. No DB lookup. The Map stores the rate directly.',
    why: 'Hardcoding is simpler and removes Query 2 entirely. But rates cannot be changed per-workplace and require a code deploy to update. The primary repo solves this with streakBonusPercent Int on the Workplace model.',
    codeSnippet: `// fqai9cn3_Interview workers.service.ts lines 97-98
for (const [workplaceId, count] of workplaceShiftCounts.entries()) {
  if (count >= 3) {
    bonusByWorkplace.set(workplaceId, 0.03);  // ← hardcoded 3%
  } else if (count >= 2) {
    bonusByWorkplace.set(workplaceId, 0.02);  // ← hardcoded 2%
  }
}`,
    connectsTo: 'iv-cw-4',
  },
  {
    id: 'iv-cw-4',
    step: 4,
    title: 'E2E test suite — 320 lines, full coverage',
    file: 'test/bonus-shifts.e2e-spec.ts',
    explanation:
      'The Interview repo has a comprehensive 320-line e2e test suite using Jest and supertest. It starts the full NestJS application, seeds the SQLite DB before each test, and verifies every scenario: empty results, single qualify, multi-workplace, pagination continuity, filter params, limit validation, and cursor edge cases.',
    why: 'E2E tests validate the actual HTTP behaviour, not just unit logic. They also serve as living documentation of expected API behaviour.',
    codeSnippet: `// test/bonus-shifts.e2e-spec.ts (abridged)
describe('GET /workers/:id/bonus-shifts', () => {
  it('returns empty when worker has < 2 shifts at any workplace', ...)
  it('returns bonus shifts when count >= 2', ...)
  it('applies hardcoded 3% rate when count >= 3', ...)
  it('paginates correctly across pages', ...)
  it('returns 400 for limit=0', ...)
  // ... 320 lines total
})`,
    connectsTo: 'iv-cw-5',
  },
  {
    id: 'iv-cw-5',
    step: 5,
    title: 'Schema — Workplace without streakBonusPercent',
    file: 'prisma/schema.prisma',
    explanation:
      'The Interview version\'s schema.prisma has a Workplace model without the streakBonusPercent field. All other fields (id, name, location, status, shard) are identical to the primary repo. The absence of this field is what forces the hardcoded rate approach.',
    why: 'The schema difference is the root cause of all other differences. Adding streakBonusPercent to the schema would enable the primary repo\'s approach: fetch per-workplace rates dynamically.',
    codeSnippet: `// fqai9cn3_Interview schema.prisma — Workplace model
model Workplace {
  id       Int     @id @default(autoincrement())
  name     String
  location String
  status   Int     @default(0)
  shard    Int     @default(0)
  Shift    Shift[]
  // streakBonusPercent Int  ← MISSING
}`,
  },
]

// ── Export ────────────────────────────────────────────────────────────────────
export const bonusShiftsInterviewRepo: RepoConfig = {
  id: 'fqai9cn3_interview',
  label: 'fqai9cn3_Interview — Comparison',
  shortLabel: 'Interview Compare',
  description:
    'Comparison version. Offset pagination, hardcoded bonus rates (3%/2%), and a comprehensive 320-line e2e test suite. Shows a less flexible but thoroughly tested implementation.',
  character: 'Comparison Repo',
  color: 'purple',
  badge: 'COMPARE',
  flashcards: interviewFlashcards,
  decks,
  endpoints,
  architectureGraph,
  codeWalk,
  goldenBullets,
  stefanScripts,
}
