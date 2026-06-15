import { useState } from 'react';
import { bonusShiftsFlow, claimFlow, cancelFlow, type FlowStep } from '../data/requestFlow';
import CodeBlock from '../components/CodeBlock';
import Badge from '../components/Badge';

const layerMeta: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  http:       { label: 'HTTP',       color: 'text-gray-400',   bg: 'bg-gray-600/10 border-gray-600/30',   dot: 'bg-gray-500' },
  controller: { label: 'Controller', color: 'text-brand-400',  bg: 'bg-brand-500/10 border-brand-500/30', dot: 'bg-brand-400' },
  service:    { label: 'Service',    color: 'text-accent-400', bg: 'bg-accent-500/10 border-accent-500/30', dot: 'bg-accent-400' },
  db:         { label: 'Database',   color: 'text-warn-400',   bg: 'bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-400' },
  response:   { label: 'Response',   color: 'text-gray-400',   bg: 'bg-gray-600/10 border-gray-600/30',   dot: 'bg-gray-500' },
};

const noteColor: Record<string, string> = {
  warn:   'border-yellow-500/30 bg-yellow-500/5 text-yellow-300',
  info:   'border-brand-500/30 bg-brand-500/5 text-brand-300',
  danger: 'border-danger-400/30 bg-danger-400/5 text-red-300',
};
const noteIcon: Record<string, string> = {
  warn: '⚠',
  info: 'ℹ',
  danger: '⚡',
};

function FlowViewer({ steps, title }: { steps: FlowStep[]; title: string }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-5 top-6 bottom-6 w-px bg-gray-800" />

        <div className="space-y-2">
          {steps.map((step) => {
            const meta = layerMeta[step.layer];
            const isOpen = expanded.has(step.id);

            return (
              <div key={step.id} className="relative pl-12">
                {/* Step dot */}
                <button
                  onClick={() => toggle(step.id)}
                  className="absolute left-3.5 top-3 w-3 h-3 rounded-full border-2 border-surface-950 transition-all duration-200"
                  style={{ backgroundColor: isOpen ? '' : '' }}
                >
                  <span className={`absolute inset-0 rounded-full ${meta.dot} ${isOpen ? 'opacity-100' : 'opacity-60'}`} />
                </button>

                {/* Step card */}
                <button
                  onClick={() => toggle(step.id)}
                  className={`w-full text-left rounded-xl border transition-all duration-200 ${
                    isOpen ? meta.bg : 'border-gray-800 bg-surface-900 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xs font-mono text-gray-600 w-4 shrink-0">{step.id}</span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${meta.color} bg-current/10 shrink-0`}>
                        {meta.label}
                      </span>
                      <span className="text-sm font-medium text-gray-200 truncate">{step.title}</span>
                    </div>
                    {step.file && (
                      <span className="text-xs font-mono text-gray-600 hidden sm:inline shrink-0">
                        {step.file}{step.lines ? `:${step.lines}` : ''}
                      </span>
                    )}
                    <span className={`text-gray-500 text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-800/60 px-4 pb-4 pt-3 space-y-3" onClick={e => e.stopPropagation()}>
                      <p className="text-sm text-gray-300">{step.description}</p>
                      {step.code && (
                        <CodeBlock code={step.code} filename={step.file} lines={step.lines} />
                      )}
                      {step.note && step.noteType && (
                        <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${noteColor[step.noteType]}`}>
                          <span className="shrink-0 font-bold">{noteIcon[step.noteType]}</span>
                          <span>{step.note}</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const TABS = ['bonus-shifts', 'claim', 'cancel'] as const;
type Tab = typeof TABS[number];

const tabLabel: Record<Tab, string> = {
  'bonus-shifts': 'GET /bonus-shifts',
  'claim': 'POST /claim',
  'cancel': 'POST /cancel',
};

export default function RequestFlow() {
  const [tab, setTab] = useState<Tab>('bonus-shifts');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      <div className="space-y-3">
        <Badge color="gray">Request Flow</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">Trace the Request</h1>
        <p className="text-gray-400 max-w-xl">
          Every hop from HTTP to database and back. Click any step to expand the code.
        </p>
      </div>

      {/* Layer legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(layerMeta).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
            <span className={`text-xs font-mono ${meta.color}`}>{meta.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tabLabel[t]}
          </button>
        ))}
      </div>

      {/* Flow viewer */}
      {tab === 'bonus-shifts' && (
        <FlowViewer
          steps={bonusShiftsFlow}
          title="GET /workers/:id/bonus-shifts — 10 Steps"
        />
      )}
      {tab === 'claim' && (
        <FlowViewer
          steps={claimFlow}
          title="POST /shifts/:id/claim — Claim a shift"
        />
      )}
      {tab === 'cancel' && (
        <FlowViewer
          steps={cancelFlow}
          title="POST /shifts/:id/cancel — Soft delete"
        />
      )}

    </div>
  );
}
