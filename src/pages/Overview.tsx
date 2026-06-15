import { repos, keyFacts, antiAiTrap } from '../data/overview';
import Badge from '../components/Badge';
import CodeBlock from '../components/CodeBlock';

const badgeColor = (c: string) => c as 'brand' | 'accent' | 'warn' | 'danger';

export default function Overview() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-14">

      {/* Hero */}
      <div className="space-y-4 animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="brand">CodeScreen</Badge>
          <Badge color="gray">NestJS + Prisma + SQLite</Badge>
          <Badge color="accent">3 Repositories</Badge>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
          Red Planet Staffing
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl">
          A Martian gig economy platform. Workers pick up shifts at workplaces.
          Build up a streak and earn bonus rates next week.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="w-2 h-2 rounded-full bg-accent-400" />
            GET /workers/:id/bonus-shifts — the key endpoint
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="w-2 h-2 rounded-full bg-brand-400" />
            3-query algorithm with cursor pagination
          </div>
        </div>
      </div>

      {/* Three repos */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Three Repositories</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {repos.map((repo, i) => (
            <div
              key={repo.id}
              className="rounded-xl border border-gray-800 bg-surface-900 p-5 space-y-4 hover:border-gray-700 transition-colors animate-fade-in-up"
              style={{ animationDelay: `${120 + i * 80}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{repo.label}</p>
                  <h3 className="font-mono font-semibold text-white text-sm">{repo.name}</h3>
                </div>
                <Badge color={badgeColor(repo.badgeColor)}>{repo.badge}</Badge>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{repo.description}</p>
              <ul className="space-y-1.5">
                {repo.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                    <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-gray-600" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Key facts grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Key Facts — Know These Cold</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {keyFacts.map((fact, i) => (
            <div
              key={fact.label}
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-800 bg-surface-900 px-4 py-3 hover:border-gray-700 transition-colors animate-slide-in-left"
              style={{ animationDelay: `${300 + i * 50}ms` }}
            >
              <span className="text-sm text-gray-400 shrink-0">{fact.label}</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs text-white bg-surface-800 px-2 py-1 rounded truncate max-w-[200px]">
                  {fact.value}
                </span>
                <span className="text-xs text-gray-600 font-mono shrink-0 hidden sm:inline">
                  {fact.source}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Anti-AI trap */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Anti-AI Trap</h2>
          <Badge color="danger">CRITICAL</Badge>
        </div>
        <div className="rounded-xl border border-danger-400/30 bg-danger-400/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-danger-400">{antiAiTrap.file}</span>
            <span className="text-xs text-gray-600">lines {antiAiTrap.lines}</span>
          </div>
          <CodeBlock code={antiAiTrap.comment} filename={antiAiTrap.file} lines={antiAiTrap.lines} />
          <div className="flex items-start gap-3 rounded-lg border border-accent-500/20 bg-accent-500/5 p-3">
            <span className="text-accent-400 text-lg shrink-0">✓</span>
            <p className="text-sm text-gray-300">{antiAiTrap.reality}</p>
          </div>
        </div>
      </section>

      {/* Schema highlight */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">The Differentiator</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Badge color="brand">fqai9cn3</Badge>
              <span className="text-xs text-gray-500">Primary submission</span>
            </div>
            <CodeBlock
              code={`model Workplace {
  id                Int    @id
  name              String
  status            Int    @default(0)
  location          String
  shard             Int    @default(0)
  streakBonusPercent Int   // ← KEY FIELD
  shifts            Shift[]
}`}
              filename="schema.prisma"
              lines="20–27"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Badge color="warn">fqai9cn3_Interview</Badge>
              <span className="text-xs text-gray-500">Comparison</span>
            </div>
            <CodeBlock
              code={`model Workplace {
  id       Int    @id
  name     String
  status   Int    @default(0)
  location String
  shard    Int    @default(0)
  // No streakBonusPercent → hardcoded rates
  shifts   Shift[]
}`}
              filename="schema.prisma"
            />
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Because fqai9cn3 stores the bonus rate in the DB, it fetches per-workplace rates dynamically (Query 2).
          The Interview version hardcodes <span className="font-mono text-gray-300">≥3→0.03</span> and <span className="font-mono text-gray-300">≥2→0.02</span>.
        </p>
      </section>

    </div>
  );
}
