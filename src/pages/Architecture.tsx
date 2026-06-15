import CodeBlock from '../components/CodeBlock';
import Badge from '../components/Badge';

const diChain = [
  { name: 'WorkersController', decorator: '@Controller("workers")',      color: 'border-brand-500/40 bg-brand-500/8',   text: 'text-brand-400' },
  { name: 'WorkersService',    decorator: '@Injectable()',               color: 'border-accent-500/40 bg-accent-500/8', text: 'text-accent-400' },
  { name: 'PrismaService',     decorator: '@Injectable()\nextends PrismaClient', color: 'border-yellow-500/40 bg-yellow-500/8', text: 'text-warn-400' },
  { name: 'SQLite DB',         decorator: 'file:./dev.db',              color: 'border-gray-700 bg-surface-900',       text: 'text-gray-400' },
];

const modules = [
  {
    name: 'AppModule',
    label: 'composition root',
    color: 'text-brand-400',
    children: [
      { name: 'PrismaModule',     note: 'exports PrismaService', color: 'text-gray-400',   files: null },
      { name: 'WorkersModule',    note: '',                       color: 'text-accent-400', files: ['controller', 'service', 'schemas', 'mapper'] },
      { name: 'WorkplacesModule', note: '',                       color: 'text-accent-400', files: ['controller', 'service', 'schemas', 'mapper'] },
      { name: 'ShiftsModule',     note: '',                       color: 'text-accent-400', files: ['controller', 'service', 'schemas', 'mapper'] },
    ],
  },
];

const principles = [
  { title: 'Thin Controllers', desc: 'No business logic — routing, param extraction, response shaping only.' },
  { title: 'Fat Services',     desc: 'All business logic and DB queries live in services.' },
  { title: 'Mapper Separation',desc: 'Model → DTO conversion in dedicated *.mapper.ts files.' },
  { title: 'Schema Separation',desc: 'Zod schemas and TypeScript types in *.schemas.ts files.' },
  { title: 'Shared Utilities', desc: 'Pagination logic in shared/pagination.ts, types in shared/shared.types.ts.' },
];

const endpoints = [
  { method: 'GET',  path: '/workers/:id/bonus-shifts', module: 'Workers',    note: 'Cursor paginated' },
  { method: 'GET',  path: '/workers/:id/claims',       module: 'Workers',    note: 'Shard paginated' },
  { method: 'GET',  path: '/workers',                  module: 'Workers',    note: '' },
  { method: 'POST', path: '/workers',                  module: 'Workers',    note: '' },
  { method: 'POST', path: '/shifts/:id/claim',         module: 'Shifts',     note: 'Atomic concern' },
  { method: 'POST', path: '/shifts/:id/cancel',        module: 'Shifts',     note: 'Soft delete' },
  { method: 'GET',  path: '/shifts',                   module: 'Shifts',     note: '' },
  { method: 'GET',  path: '/workplaces',               module: 'Workplaces', note: '' },
];

const methodColor: Record<string, string> = {
  GET:  'text-accent-400 bg-accent-500/10',
  POST: 'text-brand-400 bg-brand-500/10',
};

export default function Architecture() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-14">

      <div className="space-y-3 animate-fade-in-up">
        <Badge color="gray">Architecture</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">Module Dependency Diagram</h1>
        <p className="text-gray-400 max-w-xl">
          NestJS module system with feature modules, shared providers, and dependency injection chain.
        </p>
      </div>

      {/* DI Chain — animated flow diagram */}
      <section className="space-y-5 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Dependency Injection Chain</h2>
          <span className="text-xs font-mono text-brand-400/60 border border-brand-500/20 bg-brand-500/5 px-2 py-0.5 rounded">
            data flows →
          </span>
        </div>

        {/* Horizontal scrollable flow */}
        <div className="overflow-x-auto pb-3 -mx-1 px-1">
          <div className="flex items-center min-w-max gap-0">
            {diChain.map((node, i) => (
              <div key={node.name} className="flex items-center">
                {/* Node box */}
                <div
                  className={`rounded-xl border p-5 w-52 text-center space-y-2 animate-fade-in-up ${node.color}`}
                  style={{ animationDelay: `${200 + i * 120}ms` }}
                >
                  <div className={`w-3 h-3 rounded-full mx-auto animate-data-pulse ${
                    i === 0 ? 'bg-brand-400' : i === 1 ? 'bg-accent-400' : i === 2 ? 'bg-warn-400' : 'bg-gray-500'
                  }`} style={{ animationDelay: `${i * 400}ms` }} />
                  <p className={`font-mono text-sm font-semibold leading-snug ${node.text}`}>{node.name}</p>
                  <p className="text-xs text-gray-600 leading-snug whitespace-pre-line">{node.decorator}</p>
                </div>

                {/* Animated connector */}
                {i < diChain.length - 1 && (
                  <div className="relative flex items-center justify-center w-14 shrink-0 animate-fade-in" style={{ animationDelay: `${320 + i * 120}ms` }}>
                    {/* Track line */}
                    <div className="relative w-full h-px bg-gray-700 overflow-hidden rounded-full">
                      {/* Sweeping packet */}
                      <div
                        className="absolute top-0 left-0 h-full w-10 bg-gradient-to-r from-transparent via-brand-400/90 to-transparent animate-sweep-lr"
                        style={{ animationDelay: `${i * 600}ms` }}
                      />
                    </div>
                    {/* Arrowhead */}
                    <span className="absolute right-0 text-brand-400/70 text-base leading-none select-none" style={{ transform: 'translateX(3px)' }}>▸</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-600">
          Each arrow = "injects via constructor parameter." NestJS IoC container resolves the full chain from AppModule.
        </p>
      </section>

      {/* Module tree */}
      <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
        <h2 className="text-lg font-semibold text-white">Module Hierarchy</h2>
        <div className="rounded-xl border border-gray-800 bg-surface-900 p-6">
          {modules.map(root => (
            <div key={root.name} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-brand-400 animate-data-pulse" />
                <span className="text-brand-400 font-mono text-sm font-bold">{root.name}</span>
                <span className="text-xs text-gray-600">— {root.label}</span>
              </div>
              <div className="ml-5 border-l-2 border-gray-800 pl-4 space-y-3">
                {root.children.map((child, ci) => (
                  <div
                    key={child.name}
                    className="animate-slide-in-left"
                    style={{ animationDelay: `${400 + ci * 80}ms` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-sm font-medium ${child.color}`}>{child.name}</span>
                      {child.note && <span className="text-xs text-gray-600">— {child.note}</span>}
                    </div>
                    {child.files && (
                      <div className="ml-4 mt-1.5 flex flex-wrap gap-1.5">
                        {child.files.map(role => (
                          <span key={role} className="font-mono text-xs text-gray-600 bg-gray-800/50 px-2 py-0.5 rounded">
                            {child.name.replace('Module', '').toLowerCase()}.{role}.ts
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Endpoints */}
      <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '360ms' }}>
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
                <tr
                  key={i}
                  className="hover:bg-white/2 transition-colors animate-slide-in-left"
                  style={{ animationDelay: `${480 + i * 50}ms` }}
                >
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
      <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
        <h2 className="text-lg font-semibold text-white">Design Principles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {principles.map((p, i) => (
            <div
              key={p.title}
              className="rounded-lg border border-gray-800 bg-surface-900 p-4 space-y-1.5 animate-fade-in-up hover:border-gray-700 transition-colors"
              style={{ animationDelay: `${580 + i * 70}ms` }}
            >
              <p className="text-sm font-semibold text-white">{p.title}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* File dependency */}
      <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '640ms' }}>
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
