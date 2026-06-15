import { useState, useMemo } from 'react';
import Badge from '../components/Badge';
import CodeBlock from '../components/CodeBlock';

interface Endpoint {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  desc: string;
  pathParams: ParamDef[];
  queryParams: ParamDef[];
  bodyParams: ParamDef[];
  mockResponse: (vals: Record<string, string>) => object;
  breakdown: string[];
}

interface ParamDef {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  desc: string;
  constraint?: string;
}

const endpoints: Endpoint[] = [
  {
    id: 'bonus-shifts',
    method: 'GET',
    path: '/workers/:id/bonus-shifts',
    desc: 'Returns next-week shifts with streak bonus for a worker who has built a qualifying streak this week.',
    pathParams: [{ name: 'id', type: 'number', required: true, desc: 'Worker ID (ParseIntPipe validated)' }],
    queryParams: [
      { name: 'limit', type: 'number', default: '10', desc: 'Items per page', constraint: '1–50' },
      { name: 'order', type: 'string', default: 'asc', desc: 'Sort direction for startAt', constraint: "'asc' | 'desc'" },
      { name: 'cursor', type: 'number', desc: 'Shift ID cursor for pagination' },
      { name: 'shard', type: 'number', default: '0', desc: 'Shard number (0–10)', constraint: '0–10' },
      { name: 'jobType', type: 'string', desc: 'Optional job type filter' },
      { name: 'location', type: 'string', desc: 'Optional location filter' },
    ],
    bodyParams: [],
    breakdown: [
      'ParseIntPipe validates :id — throws 400 BadRequest if not a number',
      'ZodValidationPipe validates query params against bonusShiftsQuerySchema',
      'Q1: prisma.shift.findMany — current-week shifts for this worker (non-cancelled)',
      'Q2: Group by workplaceId → filter count >= 2 → short-circuit if empty map',
      'Q3: prisma.workplace.findMany — fetch streakBonusPercent for qualifying workplaces',
      'Q4: prisma.shift.findMany — next-week shifts, take: limit+1, cursor-paginated',
      'Build BonusShiftDTO[] merging shift + bonus percent from Map',
      'Return { data: BonusShiftDTO[], nextCursor: Cursor | undefined }',
    ],
    mockResponse: (vals) => ({
      data: [
        {
          id: 1001,
          workplaceId: 42,
          startAt: '2025-02-10T08:00:00.000Z',
          endAt: '2025-02-10T16:00:00.000Z',
          jobType: 'WAREHOUSE',
          location: 'Zone A',
          workerId: null,
          streakBonusPercent: 15,
        },
        {
          id: 1002,
          workplaceId: 42,
          startAt: '2025-02-11T08:00:00.000Z',
          endAt: '2025-02-11T16:00:00.000Z',
          jobType: 'WAREHOUSE',
          location: 'Zone A',
          workerId: Number(vals.id) || 7,
          streakBonusPercent: 15,
        },
      ].slice(0, parseInt(vals.limit || '10')),
      nextCursor: vals.limit && parseInt(vals.limit) < 2 ? { id: 1001, shard: Number(vals.shard || 0), startAt: '2025-02-10T08:00:00.000Z' } : undefined,
    }),
  },
  {
    id: 'claim',
    method: 'POST',
    path: '/shifts/:id/claim',
    desc: 'Claims an available (unclaimed, non-cancelled) shift for the requesting worker. Race condition exists between findUnique and update.',
    pathParams: [{ name: 'id', type: 'number', required: true, desc: 'Shift ID' }],
    queryParams: [],
    bodyParams: [{ name: 'workerId', type: 'number', required: true, desc: 'Worker ID claiming the shift' }],
    breakdown: [
      'POST /shifts/:id/claim with body { workerId: number }',
      'ParseIntPipe validates :id path param',
      'prisma.shift.findUnique({ where: { id, workerId: null, cancelledAt: null } })',
      'If null → throw NotFoundException (but currently throws 500, not 404)',
      'prisma.shift.update({ where: { id }, data: { workerId } })',
      'Race condition: another worker can claim between findUnique and update',
      'Returns updated ShiftDTO',
    ],
    mockResponse: (vals) => ({
      id: parseInt(vals.id || '1') || 1,
      workplaceId: 42,
      startAt: '2025-02-10T08:00:00.000Z',
      endAt: '2025-02-10T16:00:00.000Z',
      jobType: 'WAREHOUSE',
      location: 'Zone A',
      workerId: parseInt(vals.workerId || '7'),
      cancelledAt: null,
    }),
  },
  {
    id: 'cancel',
    method: 'POST',
    path: '/shifts/:id/cancel',
    desc: 'Soft-deletes a shift by setting cancelledAt and workerId = null. The shift record remains in the database.',
    pathParams: [{ name: 'id', type: 'number', required: true, desc: 'Shift ID to cancel' }],
    queryParams: [],
    bodyParams: [],
    breakdown: [
      'POST /shifts/:id/cancel (no body required)',
      'prisma.shift.update({ where: { id }, data: { cancelledAt: new Date(), workerId: null } })',
      'NOT prisma.shift.delete() — record stays in DB',
      'cancelledAt: null = active shift',
      'cancelledAt: Date = cancelled, effectively hidden from all queries',
      'workerId: null = unclaimed (important for future claim eligibility)',
      'Returns updated ShiftDTO with cancelledAt set',
    ],
    mockResponse: (vals) => ({
      id: parseInt(vals.id || '1') || 1,
      workplaceId: 42,
      startAt: '2025-02-10T08:00:00.000Z',
      endAt: '2025-02-10T16:00:00.000Z',
      jobType: 'WAREHOUSE',
      location: 'Zone A',
      workerId: null,
      cancelledAt: new Date().toISOString(),
    }),
  },
  {
    id: 'workers-list',
    method: 'GET',
    path: '/workers',
    desc: 'Lists all workers. Shard-paginated using nextLink pattern.',
    pathParams: [],
    queryParams: [
      { name: 'shard', type: 'number', default: '0', desc: 'Current shard (0–10)', constraint: '0–10' },
      { name: 'limit', type: 'number', default: '10', desc: 'Items per page', constraint: '1–50' },
    ],
    bodyParams: [],
    breakdown: [
      'GET /workers?shard=0&limit=10',
      'prisma.worker.findMany({ where: { shard }, take: limit + 1 })',
      'getNextPage() computes next shard: increment shard when current exhausted',
      'Returns { data: WorkerDTO[], links: { next: string | null } }',
      'Note: this endpoint uses the older nextLink pattern, not cursor pagination',
    ],
    mockResponse: (vals) => ({
      data: [
        { id: 1, name: 'Alice Mars', shard: Number(vals.shard || 0) },
        { id: 2, name: 'Bob Jupiter', shard: Number(vals.shard || 0) },
        { id: 3, name: 'Carol Venus', shard: Number(vals.shard || 0) },
      ].slice(0, parseInt(vals.limit || '10')),
      links: { next: Number(vals.shard || 0) < 10 ? `/workers?shard=${Number(vals.shard || 0) + 1}&limit=${vals.limit || 10}` : null },
    }),
  },
];

const methodColor: Record<string, string> = {
  GET: 'text-accent-400 bg-accent-500/10 border-accent-500/30',
  POST: 'text-brand-400 bg-brand-500/10 border-brand-500/30',
};

export default function RequestLab() {
  const [selected, setSelected] = useState<Endpoint>(endpoints[0]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [ran, setRan] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const allParams = useMemo(() => {
    const map: Record<string, string> = {};
    [...selected.pathParams, ...selected.queryParams, ...selected.bodyParams].forEach(p => {
      map[p.name] = values[p.name] ?? p.default ?? '';
    });
    return map;
  }, [selected, values]);

  const response = useMemo(() => selected.mockResponse(allParams), [selected, allParams]);

  const buildUrl = () => {
    let url = selected.path;
    selected.pathParams.forEach(p => {
      url = url.replace(`:${p.name}`, allParams[p.name] || `:${p.name}`);
    });
    const qps = selected.queryParams
      .filter(p => allParams[p.name])
      .map(p => `${p.name}=${encodeURIComponent(allParams[p.name])}`)
      .join('&');
    return qps ? `${url}?${qps}` : url;
  };

  const select = (ep: Endpoint) => {
    setSelected(ep);
    setValues({});
    setRan(false);
    setValidationError(null);
  };

  const setValue = (name: string, val: string) => {
    setValues(prev => ({ ...prev, [name]: val }));
    setRan(false);
    setValidationError(null);
  };

  const run = () => {
    const allRequired = [...selected.pathParams, ...selected.queryParams, ...selected.bodyParams]
      .filter(p => p.required);
    const missing = allRequired.filter(p => !allParams[p.name]?.trim());
    if (missing.length > 0) {
      setValidationError(`Required field${missing.length > 1 ? 's' : ''} missing: ${missing.map(p => p.name).join(', ')}`);
      return;
    }
    setValidationError(null);
    setRan(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      <div className="space-y-3">
        <Badge color="warn">Request Lab</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">Interactive API Explorer</h1>
        <p className="text-gray-400">Build requests, inspect responses, understand the internals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Endpoint list */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-3">Endpoints</p>
          {endpoints.map(ep => (
            <button
              key={ep.id}
              onClick={() => select(ep)}
              className={`w-full text-left rounded-xl border p-3 transition-all duration-200 ${
                selected.id === ep.id
                  ? 'border-brand-500/40 bg-brand-500/5'
                  : 'border-gray-800 bg-surface-900 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${methodColor[ep.method]}`}>
                  {ep.method}
                </span>
                <span className="text-xs font-mono text-gray-400">{ep.path}</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{ep.desc}</p>
            </button>
          ))}
        </div>

        {/* Param builder + response */}
        <div className="lg:col-span-2 space-y-5">

          {/* Request builder */}
          <div className="rounded-2xl border border-gray-800 bg-surface-900 overflow-hidden">
            <div className="border-b border-gray-800 px-5 py-3 flex items-center gap-3">
              <span className={`text-xs font-mono font-bold px-2 py-1 rounded border ${methodColor[selected.method]}`}>
                {selected.method}
              </span>
              <code className="text-sm text-gray-200 font-mono flex-1">{buildUrl()}</code>
              <button
                onClick={run}
                className="shrink-0 px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors"
              >
                Run →
              </button>
            </div>

            <div className="p-5 space-y-5">
              {selected.pathParams.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-mono text-gray-600 uppercase tracking-wider">Path Parameters</p>
                  {selected.pathParams.map(p => (
                    <ParamInput key={p.name} param={p} value={allParams[p.name]} onChange={v => setValue(p.name, v)} />
                  ))}
                </div>
              )}

              {selected.queryParams.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-mono text-gray-600 uppercase tracking-wider">Query Parameters</p>
                  {selected.queryParams.map(p => (
                    <ParamInput key={p.name} param={p} value={allParams[p.name]} onChange={v => setValue(p.name, v)} />
                  ))}
                </div>
              )}

              {selected.bodyParams.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-mono text-gray-600 uppercase tracking-wider">Request Body</p>
                  {selected.bodyParams.map(p => (
                    <ParamInput key={p.name} param={p} value={allParams[p.name]} onChange={v => setValue(p.name, v)} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="flex items-center gap-2 rounded-xl border border-danger-400/30 bg-danger-400/5 px-4 py-3 text-xs text-danger-400">
              <span>⚠</span>
              <span>{validationError}</span>
            </div>
          )}

          {/* Response */}
          {ran && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-accent-400 border border-accent-500/30 bg-accent-500/5 px-2 py-0.5 rounded">200 OK</span>
                <span className="text-xs text-gray-600">application/json · simulated</span>
              </div>
              <CodeBlock
                code={JSON.stringify(response, null, 2)}
                filename="response.json"
              />
            </div>
          )}

          {/* Breakdown — only shown after running */}
          {ran && (
            <div className="space-y-3">
              <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">What happens inside</p>
              <div className="space-y-1.5">
                {selected.breakdown.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-800 bg-surface-900 px-4 py-3">
                    <span className="text-xs font-mono text-gray-700 w-4 shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-xs text-gray-300 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function ParamInput({
  param,
  value,
  onChange,
}: {
  param: ParamDef;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-28 shrink-0 pt-2">
        <span className="text-xs font-mono text-gray-300">{param.name}</span>
        {param.required && <span className="text-danger-400 ml-0.5 text-xs">*</span>}
      </div>
      <div className="flex-1 space-y-1">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={param.default ?? `${param.type}${param.constraint ? ` (${param.constraint})` : ''}`}
          className="w-full rounded-lg border border-gray-800 bg-surface-950 px-3 py-2 text-sm text-gray-200 placeholder-gray-700 font-mono focus:outline-none focus:border-brand-500/50 transition-colors"
        />
        <p className="text-xs text-gray-600">{param.desc}</p>
      </div>
    </div>
  );
}
