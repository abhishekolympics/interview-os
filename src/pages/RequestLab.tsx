import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepo } from '../contexts/RepoContext';
import type { Endpoint, RequestStep } from '../types/repo';
import Badge from '../components/Badge';
import CodeBlock from '../components/CodeBlock';

// ── Constants ─────────────────────────────────────────────────────────────────

const STEP_DELAY_MS = 600;

const METHOD_COLOR: Record<string, string> = {
  GET:    'text-accent-400 bg-accent-500/10 border-accent-500/30',
  POST:   'text-brand-400 bg-brand-500/10 border-brand-500/30',
  DELETE: 'text-danger-400 bg-danger-400/10 border-danger-400/30',
  PUT:    'text-warn-400 bg-warn-400/10 border-warn-400/30',
  PATCH:  'text-warn-400 bg-warn-400/10 border-warn-400/30',
};

const STATUS_SHADOW: Record<'idle' | 'running' | 'paused' | 'done', string> = {
  idle:    '',
  running: 'shadow-[0_0_32px_6px_rgba(99,102,241,0.13)]',
  paused:  'shadow-[0_0_24px_4px_rgba(251,191,36,0.10)]',
  done:    'shadow-[0_0_24px_4px_rgba(52,211,153,0.10)]',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type TraceStatus = 'idle' | 'running' | 'paused' | 'done';

// ── Sub-components ────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const cls = METHOD_COLOR[method] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  return (
    <span className={`shrink-0 text-xs font-mono font-bold px-2 py-0.5 rounded border ${cls}`}>
      {method}
    </span>
  );
}

// Ambient gradient orb — floats behind the trace panel when running
function TraceOrb({ active }: { active: boolean }) {
  return (
    <div
      className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full transition-opacity duration-700"
      style={{
        opacity: active ? 0.07 : 0,
        background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
        filter: 'blur(40px)',
      }}
    />
  );
}

// Single animated node in the vertical request trace
function TraceNode({
  step,
  index,
  state,
  isLast,
}: {
  step: RequestStep;
  index: number;
  state: 'pending' | 'active' | 'done';
  isLast: boolean;
}) {
  const dotColors = {
    pending: { bg: '#1a1d27', border: '#374151' },
    active:  { bg: '#6366f1', border: '#818cf8' },
    done:    { bg: '#10b981', border: '#34d399' },
  };

  const { bg, border } = dotColors[state];

  const lineColor =
    state === 'done'   ? '#10b981' :
    state === 'active' ? '#6366f1' : '#1f2937';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.28, ease: 'easeOut' }}
      className="relative flex gap-4"
    >
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0">
        {/* Dot */}
        <motion.div
          animate={{ backgroundColor: bg, borderColor: border, scale: state === 'active' ? 1.25 : 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-5 h-5 rounded-full border-2 flex items-center justify-center z-10"
          style={{ backgroundColor: bg, borderColor: border }}
        >
          <AnimatePresence mode="wait">
            {state === 'done' && (
              <motion.span
                key="check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="text-[9px] font-bold leading-none"
                style={{ color: '#34d399' }}
              >
                ✓
              </motion.span>
            )}
            {state === 'active' && (
              <motion.span
                key="pulse"
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: '#6366f1', opacity: 0.4 }}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Connector line to next step */}
        {!isLast && (
          <motion.div
            animate={{ backgroundColor: lineColor }}
            transition={{ duration: 0.4 }}
            className="w-px flex-1 mt-1"
            style={{ minHeight: 20 }}
          />
        )}
      </div>

      {/* Step card */}
      <motion.div
        animate={{
          opacity: state === 'pending' ? 0.35 : 1,
        }}
        transition={{ duration: 0.3 }}
        className={`flex-1 mb-3 rounded-xl border overflow-hidden transition-colors duration-300 ${
          state === 'active'
            ? 'border-brand-500/40 bg-brand-500/5'
            : state === 'done'
            ? 'border-accent-500/20 bg-accent-500/5'
            : 'border-gray-800 bg-surface-900'
        }`}
      >
        <div className="px-4 py-3">
          {/* Step header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-600 w-5 shrink-0 tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p
              className={`text-sm font-semibold transition-colors duration-300 ${
                state === 'active' ? 'text-brand-400' :
                state === 'done'  ? 'text-accent-400' : 'text-gray-500'
              }`}
            >
              {step.label}
            </p>
          </div>

          {/* Detail */}
          <p
            className={`text-xs leading-relaxed ml-7 transition-colors duration-300 ${
              state === 'pending' ? 'text-gray-700' : 'text-gray-400'
            }`}
          >
            {step.detail}
          </p>

          {/* Code block — reveals when active or done */}
          <AnimatePresence>
            {(state === 'active' || state === 'done') && (step.file || step.code) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="ml-7 mt-2 overflow-hidden"
              >
                {step.file && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-gray-600">{step.file}</span>
                    {step.lines && (
                      <span className="text-xs font-mono text-gray-700">L{step.lines}</span>
                    )}
                  </div>
                )}
                {step.code && (
                  <CodeBlock code={step.code} filename={step.file} lines={step.lines} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active shimmer line at bottom */}
        {state === 'active' && (
          <motion.div
            className="h-px w-full"
            style={{ background: 'linear-gradient(to right, transparent, #6366f1, transparent)' }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

// The full trace panel with header, progress bar, and step list
function TracePanel({
  steps,
  status,
  activeIndex,
  onPause,
  onResume,
  onReset,
}: {
  steps: RequestStep[];
  status: TraceStatus;
  activeIndex: number;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRunning = status === 'running';
  const isPaused  = status === 'paused';
  const isDone    = status === 'done';

  // Auto-scroll active step into view
  useEffect(() => {
    if (!scrollRef.current || !isRunning) return;
    const nodes = scrollRef.current.querySelectorAll('[data-trace-node]');
    const node = nodes[activeIndex] as HTMLElement | undefined;
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeIndex, isRunning]);

  const progressPct =
    steps.length === 0 ? 0 :
    isDone ? 100 :
    Math.round((activeIndex / steps.length) * 100);

  return (
    <div
      className={`relative rounded-2xl border bg-surface-900 overflow-hidden transition-all duration-500 ${
        STATUS_SHADOW[status]
      } ${
        isRunning ? 'border-brand-500/30' :
        isPaused  ? 'border-warn-400/20' :
        isDone    ? 'border-accent-500/20' : 'border-gray-800'
      }`}
    >
      <TraceOrb active={isRunning} />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            Request Trace
          </span>
          <AnimatePresence mode="wait">
            {isRunning && (
              <motion.span
                key="running"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="flex items-center gap-1.5 text-xs font-mono text-brand-400"
              >
                <motion.span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400"
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.75, repeat: Infinity }}
                />
                RUNNING
              </motion.span>
            )}
            {isPaused && (
              <motion.span
                key="paused"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="text-xs font-mono text-warn-400"
              >
                PAUSED
              </motion.span>
            )}
            {isDone && (
              <motion.span
                key="done"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="text-xs font-mono text-accent-400"
              >
                COMPLETE
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {isRunning && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={onPause}
              className="px-3 py-1 rounded-lg border border-warn-400/30 bg-warn-400/5 text-xs font-mono text-warn-400 hover:bg-warn-400/10 transition-colors"
            >
              Pause
            </motion.button>
          )}
          {isPaused && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={onResume}
              className="px-3 py-1 rounded-lg border border-brand-500/30 bg-brand-500/5 text-xs font-mono text-brand-400 hover:bg-brand-500/10 transition-colors"
            >
              Resume
            </motion.button>
          )}
          {(isDone || isPaused) && (
            <button
              onClick={onReset}
              className="px-3 py-1 rounded-lg border border-gray-800 text-xs font-mono text-gray-500 hover:text-gray-300 hover:border-gray-700 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-px bg-gray-800 relative overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full"
          style={{ background: 'linear-gradient(to right, #6366f1, #34d399)' }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Step list */}
      <div
        ref={scrollRef}
        className="relative p-5 max-h-[520px] overflow-y-auto"
      >
        {steps.map((step, i) => {
          const nodeState =
            isDone || i < activeIndex   ? 'done'   :
            i === activeIndex && !isDone ? 'active' : 'pending';

          return (
            <div key={i} data-trace-node>
              <TraceNode
                step={step}
                index={i}
                state={nodeState}
                isLast={i === steps.length - 1}
              />
            </div>
          );
        })}

        {/* Final response node */}
        {isDone && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3, ease: 'easeOut' }}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center shrink-0">
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{ backgroundColor: '#10b981', borderColor: '#34d399' }}
              >
                <span className="text-[8px] font-bold leading-none text-white">OK</span>
              </div>
            </div>
            <div className="flex-1 mb-2 rounded-xl border border-accent-500/30 bg-accent-500/5 px-4 py-3">
              <p className="text-sm font-semibold text-accent-400">Response returned</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                All steps completed. Mock response below.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RequestLab() {
  const { repoId } = useParams<{ repoId: string }>();
  const { activeRepo, setActiveRepo } = useRepo();

  // Sync URL param with context
  useEffect(() => {
    if (repoId && repoId !== activeRepo.id) {
      setActiveRepo(repoId);
    }
  }, [repoId, activeRepo.id, setActiveRepo]);

  const endpoints = activeRepo.endpoints;

  const [selectedId, setSelectedId] = useState<string>(endpoints[0]?.id ?? '');
  const selected: Endpoint | undefined = useMemo(
    () => endpoints.find(e => e.id === selectedId) ?? endpoints[0],
    [endpoints, selectedId],
  );

  // Trace state
  const [traceStatus, setTraceStatus] = useState<TraceStatus>('idle');
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedAtRef = useRef(0);

  const steps: RequestStep[] = useMemo(() => selected?.steps ?? [], [selected]);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Recursive step advancer
  const advanceStep = useCallback(
    (from: number) => {
      const next = from + 1;
      if (next >= steps.length) {
        setActiveStepIndex(steps.length);
        setTraceStatus('done');
        return;
      }
      timerRef.current = setTimeout(() => {
        setActiveStepIndex(next);
        advanceStep(next);
      }, STEP_DELAY_MS);
    },
    [steps.length],
  );

  const fire = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveStepIndex(0);
    setTraceStatus('running');
    timerRef.current = setTimeout(() => advanceStep(0), STEP_DELAY_MS);
  };

  const pause = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    pausedAtRef.current = activeStepIndex;
    setTraceStatus('paused');
  };

  const resume = () => {
    setTraceStatus('running');
    advanceStep(pausedAtRef.current);
  };

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTraceStatus('idle');
    setActiveStepIndex(0);
  };

  const selectEndpoint = (ep: Endpoint) => {
    reset();
    setSelectedId(ep.id);
  };

  const isRunning = traceStatus === 'running';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Badge color="warn">Request Lab</Badge>
          <Badge color="gray">{activeRepo.shortLabel}</Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Interactive API Explorer
        </h1>
        <p className="text-gray-400 max-w-xl">
          Select an endpoint, fire it, and watch the request trace through
          each layer step by step.
        </p>
      </motion.div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Endpoint list */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-3">
            Endpoints ({endpoints.length})
          </p>
          {endpoints.map((ep, i) => (
            <motion.button
              key={ep.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.28, ease: 'easeOut' }}
              onClick={() => selectEndpoint(ep)}
              className={`w-full text-left rounded-xl border p-3 transition-all duration-200 ${
                selected?.id === ep.id
                  ? 'border-brand-500/40 bg-brand-500/5'
                  : 'border-gray-800 bg-surface-900 hover:border-gray-700 hover:bg-surface-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <MethodBadge method={ep.method} />
                <span className="text-xs font-mono text-gray-400 truncate">{ep.path}</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                {ep.summary}
              </p>
            </motion.button>
          ))}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-5">

          {/* Endpoint header card */}
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="rounded-2xl border border-gray-800 bg-surface-900 overflow-hidden"
              >
                {/* URL bar */}
                <div className="border-b border-gray-800 px-5 py-3 flex items-center gap-3">
                  <MethodBadge method={selected.method} />
                  <code className="text-sm text-gray-200 font-mono flex-1 truncate">
                    {selected.path}
                  </code>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: isRunning ? 1 : 1.04 }}
                    onClick={fire}
                    disabled={isRunning}
                    className={`shrink-0 px-4 py-1.5 rounded-lg text-white text-xs font-semibold transition-all ${
                      isRunning
                        ? 'bg-brand-600/40 cursor-not-allowed opacity-60'
                        : 'bg-brand-500 hover:bg-brand-600'
                    }`}
                  >
                    {isRunning ? 'Running…' : 'Fire →'}
                  </motion.button>
                </div>

                {/* Description */}
                <div className="px-5 py-4">
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {selected.description}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trace panel */}
          <AnimatePresence>
            {traceStatus !== 'idle' && steps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <TracePanel
                  steps={steps}
                  status={traceStatus}
                  activeIndex={activeStepIndex}
                  onPause={pause}
                  onResume={resume}
                  onReset={reset}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Idle placeholder */}
          {traceStatus === 'idle' && selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-dashed border-gray-800 bg-surface-950/40 px-6 py-12 flex flex-col items-center gap-4 text-center"
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="text-3xl select-none"
              >
                ⚡
              </motion.div>
              <p className="text-sm text-gray-500">
                Press{' '}
                <span className="text-gray-300 font-mono">Fire →</span>
                {' '}to step through the request trace layer by layer.
              </p>
              {steps.length > 0 && (
                <p className="text-xs font-mono text-gray-700">
                  {steps.length} steps &middot; {STEP_DELAY_MS}ms between each
                </p>
              )}
            </motion.div>
          )}

          {/* Mock request + response + breakdown — shown after trace completes */}
          <AnimatePresence>
            {traceStatus === 'done' && selected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="space-y-5"
              >
                {/* Mock request */}
                {selected.mockRequest && (
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">
                      Mock Request
                    </p>
                    <CodeBlock
                      code={JSON.stringify(selected.mockRequest, null, 2)}
                      filename="request.json"
                    />
                  </div>
                )}

                {/* Mock response */}
                {selected.mockResponse !== undefined && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-accent-400 border border-accent-500/30 bg-accent-500/5 px-2 py-0.5 rounded">
                        200 OK
                      </span>
                      <span className="text-xs text-gray-600">
                        application/json · simulated
                      </span>
                    </div>
                    <CodeBlock
                      code={JSON.stringify(selected.mockResponse, null, 2)}
                      filename="response.json"
                    />
                  </div>
                )}

                {/* Breakdown */}
                {selected.breakdown.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">
                      What happens inside
                    </p>
                    <div className="space-y-1.5">
                      {selected.breakdown.map((line, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.22, ease: 'easeOut' }}
                          className="flex items-start gap-3 rounded-lg border border-gray-800 bg-surface-900 px-4 py-3"
                        >
                          <span className="text-xs font-mono text-gray-700 w-5 shrink-0 mt-0.5 tabular-nums">
                            {i + 1}
                          </span>
                          <p className="text-xs text-gray-300 leading-relaxed">{line}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
