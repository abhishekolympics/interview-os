import CodeBlock from '../components/CodeBlock';
import Badge from '../components/Badge';


const diChain = [
  { name: 'WorkersController', decorator: '@Controller("workers")', dep: null },
  { name: 'WorkersService', decorator: '@Injectable()', dep: 'WorkersController' },
  { name: 'PrismaService', decorator: '@Injectable() extends PrismaClient', dep: 'WorkersService' },
  { name: 'SQLite DB', decorator: 'file:./dev.db', dep: 'PrismaService' },
];

const principles = [
  { title: 'Thin Controllers', desc: 'No business logic — routing, param extraction, response shaping only.' },
  { title: 'Fat Services', desc: 'All business logic and DB queries live in services.' },
  { title: 'Mapper Separation', desc: 'Model → DTO conversion in dedicated *.mapper.ts files.' },
  { title: 'Schema Separation', desc: 'Zod schemas and TypeScript types in *.schemas.ts files.' },
  { title: 'Shared Utilities', desc: 'Pagination logic in shared/pagination.ts, types in shared/shared.types.ts.' },
];

const endpoints = [
  { method: 'GET', path: '/workers/:id/bonus-shifts', module: 'Workers', note: 'Cursor paginated' },
  { method: 'GET', path: '/workers/:id/claims', module: 'Workers', note: 'Shard paginated' },
  { method: 'GET', path: '/workers', module: 'Workers', note: '' },
  { method: 'POST', path: '/workers', module: 'Workers', note: '' },
  { method: 'POST', path: '/shifts/:id/claim', module: 'Shifts', note: 'Atomic concern' },
  { method: 'POST', path: '/shifts/:id/cancel', module: 'Shifts', note: 'Soft delete' },
  { method: 'GET', path: '/shifts', module: 'Shifts', note: '' },
  { method: 'GET', path: '/workplaces', module: 'Workplaces', note: '' },
];

const methodColor: Record<string, string> = {
  GET: 'text-accent-400 bg-accent-500/10',
  POST: 'text-brand-400 bg-brand-500/10',
  DELETE: 'text-danger-400 bg-danger-400/10',
};

export default function Architecture() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-14">

      <div className="space-y-3">
        <Badge color="gray">Architecture</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">Module Dependency Diagram</h1>
        <p className="text-gray-400 max-w-xl">
          NestJS module system with feature modules, shared providers, and dependency injection chain.
        </p>
      </div>

      {/* Module tree */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Module Hierarchy</h2>
        <div className="rounded-xl border border-gray-800 bg-surface-900 p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-brand-400 font-mono text-sm font-bold">AppModule</span>
              <span className="text-xs text-gray-600">— composition root</span>
            </div>
            <div className="ml-6 border-l-2 border-gray-800 pl-4 space-y-3">
              {['PrismaModule', 'WorkersModule', 'WorkplacesModule', 'ShiftsModule'].map((mod, i) => (
                <div key={mod}>
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-px bg-gray-700 -ml-4 mr-0 inline-block`} />
                    <span className={`font-mono text-sm ${i === 0 ? 'text-gray-400' : 'text-accent-400'}`}>{mod}</span>
                    {i === 0 && <span className="text-xs text-gray-600">— exports PrismaService</span>}
                  </div>
                  {i > 0 && i < 4 && (
                    <div className="ml-6 mt-1.5 flex flex-wrap gap-2">
                      {['Controller', 'Service', 'Schemas', 'Mapper'].map(role => (
                        <span key={role} className="font-mono text-xs text-gray-600 bg-gray-800/50 px-2 py-0.5 rounded">
                          {mod.replace('Module', '').toLowerCase()}.{role.toLowerCase()}.ts
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DI Chain */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Dependency Injection Chain</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-0">
          {diChain.map((node, i) => (
            <div key={node.name} className="flex sm:flex-col items-center">
              <div className={`rounded-xl border p-4 w-full text-center space-y-1 ${
                i === 0 ? 'border-brand-500/30 bg-brand-500/5' :
                i === 1 ? 'border-accent-500/30 bg-accent-500/5' :
                i === 2 ? 'border-yellow-500/30 bg-yellow-500/5' :
                'border-gray-700 bg-surface-900'
              }`}>
                <p className={`font-mono text-sm font-semibold ${
                  i === 0 ? 'text-brand-400' :
                  i === 1 ? 'text-accent-400' :
                  i === 2 ? 'text-warn-400' :
                  'text-gray-400'
                }`}>{node.name}</p>
                <p className="text-xs text-gray-600">{node.decorator}</p>
              </div>
              {i < diChain.length - 1 && (
                <div className="flex items-center justify-center sm:py-2 px-2 sm:px-0">
                  <span className="text-gray-600 text-lg sm:rotate-90">→</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600">
          Each arrow = "injects via constructor parameter." NestJS IoC container resolves the full chain from AppModule.
        </p>
      </section>

      {/* Endpoints */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">All Endpoints</h2>
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-surface-950/50">
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Method</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Path</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium hidden sm:table-cell">Module</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium hidden md:table-cell">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {endpoints.map((ep, i) => (
                <tr key={i} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs font-semibold px-1.5 py-0.5 rounded ${methodColor[ep.method]}`}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{ep.path}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{ep.module}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{ep.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Design principles */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Design Principles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {principles.map(p => (
            <div key={p.title} className="rounded-lg border border-gray-800 bg-surface-900 p-4 space-y-1.5">
              <p className="text-sm font-semibold text-white">{p.title}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* File dependency */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">File Imports (workers.controller.ts)</h2>
        <CodeBlock
          filename="workers.controller.ts"
          code={`import { @nestjs/common }           // decorators: @Controller, @Get, @Param, @Query, @Body
import { express }                   // Request type
import { ../../pipes/zod-validation-pipe }
import { ../shared/pagination }      // nextLink, PaginationPage, CursorValidate
import { ../shared/shared.types }    // Page, PaginatedResponse, Response, Cursor
import { ../shifts/shifts.mapper }   // toBonusShiftDTO, toShiftDTO
import { ../shifts/shifts.schemas }  // BonusShiftDTO, ShiftDTO
import { ./workers.mapper }          // toWorkerDTO
import { ./workers.schemas }         // BonusShiftsQuery, bonusShiftsQuerySchema, WorkerDTO
import { ./workers.service }         // WorkersService`}
        />
      </section>

    </div>
  );
}
