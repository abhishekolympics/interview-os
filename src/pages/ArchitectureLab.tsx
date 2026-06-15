import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRepo } from '../contexts/RepoContext'
import type { GraphNode, GraphEdge } from '../types/repo'

// ── Node style by type ───────────────────────────────────────────────────────

const NODE_STYLES: Record<
  GraphNode['type'],
  { bg: string; border: string; text: string; shape: string }
> = {
  module:     { bg: 'bg-brand-500/15',   border: 'border-brand-500',   text: 'text-brand-300',   shape: 'rounded-xl' },
  controller: { bg: 'bg-accent-400/15',  border: 'border-accent-400',  text: 'text-accent-300',  shape: 'rounded-lg' },
  service:    { bg: 'bg-emerald-500/15', border: 'border-emerald-500', text: 'text-emerald-300', shape: 'rounded-full' },
  provider:   { bg: 'bg-amber-500/15',   border: 'border-amber-500',   text: 'text-amber-300',   shape: 'rounded-md rotate-45' },
  mapper:     { bg: 'bg-pink-500/15',    border: 'border-pink-500',    text: 'text-pink-300',    shape: 'rounded-2xl' },
}

const EDGE_COLORS: Record<GraphEdge['flowType'], string> = {
  dependency: '#4b5563',   // gray-600
  injection:  '#6366f1',   // indigo
  dataflow:   '#10b981',   // emerald
}

// ── Request trace path for bonus-shifts ─────────────────────────────────────
// wc → ws → ss → ps (back to ws) → wks → ps (back to ws) → sm → response
const TRACE_STEPS: Array<{ from: string; to: string; label: string }> = [
  { from: 'wc',  to: 'ws',  label: 'call getBonusShifts()' },
  { from: 'ws',  to: 'ss',  label: 'Q1: count shifts' },
  { from: 'ss',  to: 'ps',  label: 'prisma.shift.findMany' },
  { from: 'ps',  to: 'ws',  label: 'Q1 results' },
  { from: 'ws',  to: 'wks', label: 'Q2: fetch bonus rates' },
  { from: 'wks', to: 'ps',  label: 'prisma.workplace.findMany' },
  { from: 'ps',  to: 'ws',  label: 'Q2 results' },
  { from: 'ws',  to: 'sm',  label: 'toBonusShiftDTO()' },
  { from: 'sm',  to: 'wc',  label: 'BonusShiftDTO[]' },
]

// ── SVG canvas dimensions ────────────────────────────────────────────────────
const CANVAS_W = 820
const CANVAS_H = 560

interface TracePacket {
  stepIndex: number
  progress: number  // 0..1 for current edge
  active: boolean
}

export default function ArchitectureLab() {
  const { activeRepo } = useRepo()
  const graph = activeRepo.architectureGraph

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [edgeLengths, setEdgeLengths] = useState<Record<string, number>>({})
  const [trace, setTrace] = useState<TracePacket | null>(null)
  const [traceHighlights, setTraceHighlights] = useState<Set<string>>(new Set())
  const [traceEdgeId, setTraceEdgeId] = useState<string | null>(null)
  const edgeRefs = useRef<Record<string, SVGLineElement | null>>({})
  const traceRAF = useRef<number | null>(null)
  const traceStartTime = useRef<number>(0)

  // Measure edge SVG lengths after mount
  useEffect(() => {
    const lengths: Record<string, number> = {}
    for (const edge of graph.edges) {
      const el = edgeRefs.current[edge.id]
      if (el) {
        lengths[edge.id] = el.getTotalLength?.() ?? 80
      }
    }
    setEdgeLengths(lengths)
  }, [graph.edges])

  // Build a lookup from edge id to edge for trace
  const edgeById = useCallback(
    (id: string) => graph.edges.find(e => e.id === id),
    [graph.edges]
  )

  // Get edge connecting two nodes
  const findEdge = useCallback(
    (fromId: string, toId: string): GraphEdge | undefined => {
      return graph.edges.find(
        e => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
      )
    },
    [graph.edges]
  )

  // ── Trace animation ──────────────────────────────────────────────────────────
  const STEP_DURATION = 800 // ms per edge

  const runTrace = useCallback(() => {
    if (traceRAF.current) cancelAnimationFrame(traceRAF.current)
    setTrace({ stepIndex: 0, progress: 0, active: true })
    setTraceHighlights(new Set([TRACE_STEPS[0].from]))
    setTraceEdgeId(null)
    traceStartTime.current = performance.now()

    const totalSteps = TRACE_STEPS.length

    function tick(now: number) {
      const elapsed = now - traceStartTime.current
      const stepF = elapsed / STEP_DURATION
      const stepIndex = Math.floor(stepF)

      if (stepIndex >= totalSteps) {
        // Trace complete
        setTrace(null)
        setTraceHighlights(new Set())
        setTraceEdgeId(null)
        return
      }

      const progress = stepF - stepIndex
      const step = TRACE_STEPS[stepIndex]
      const edge = findEdge(step.from, step.to)

      setTrace({ stepIndex, progress, active: true })
      setTraceHighlights(new Set([step.from, step.to]))
      setTraceEdgeId(edge?.id ?? null)

      traceRAF.current = requestAnimationFrame(tick)
    }

    traceRAF.current = requestAnimationFrame(tick)
  }, [findEdge])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (traceRAF.current) cancelAnimationFrame(traceRAF.current)
    }
  }, [])

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const selectedNode = selectedId ? graph.nodes.find(n => n.id === selectedId) : null

  // Connections to/from selected node
  const connectedIds = selectedId
    ? new Set(
        graph.edges
          .filter(e => e.from === selectedId || e.to === selectedId)
          .flatMap(e => [e.from, e.to])
      )
    : new Set<string>()

  const isNodeDimmed = (nodeId: string) => {
    if (!selectedId) return false
    return !connectedIds.has(nodeId)
  }

  const getNodeOpacity = (nodeId: string) => {
    if (trace?.active) {
      return traceHighlights.has(nodeId) ? 1 : 0.25
    }
    return isNodeDimmed(nodeId) ? 0.25 : 1
  }

  // Connected edges for selected node
  const selectedEdges = selectedId
    ? graph.edges.filter(e => e.from === selectedId || e.to === selectedId)
    : []

  // Packet position along current trace edge
  const getPacketPos = () => {
    if (!trace?.active || trace.stepIndex >= TRACE_STEPS.length) return null
    const step = TRACE_STEPS[trace.stepIndex]
    const fromNode = graph.nodes.find(n => n.id === step.from)
    const toNode = graph.nodes.find(n => n.id === step.to)
    if (!fromNode || !toNode) return null
    const t = trace.progress
    return {
      x: fromNode.x + (toNode.x - fromNode.x) * t,
      y: fromNode.y + (toNode.y - fromNode.y) * t,
    }
  }

  const packet = getPacketPos()

  // ── Node renderer ─────────────────────────────────────────────────────────
  const renderNode = (node: GraphNode, index: number) => {
    const isSelected = selectedId === node.id
    const opacity = getNodeOpacity(node.id)
    const isTraceHighlit = trace?.active && traceHighlights.has(node.id)
    const isProvider = node.type === 'provider'

    // Provider is a diamond — different layout
    if (isProvider) {
      const size = 64
      return (
        <motion.g
          key={node.id}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity, scale: isSelected ? 1.08 : 1 }}
          transition={
            isSelected
              ? { type: 'spring', stiffness: 300, damping: 20 }
              : { delay: index * 0.05, type: 'spring', stiffness: 200, damping: 25 }
          }
          style={{ cursor: 'pointer' }}
          onClick={() => setSelectedId(selectedId === node.id ? null : node.id)}
        >
          {/* Glow when trace highlight */}
          {isTraceHighlit && (
            <motion.polygon
              points={`${node.x},${node.y - size * 0.72} ${node.x + size * 0.72},${node.y} ${node.x},${node.y + size * 0.72} ${node.x - size * 0.72},${node.y}`}
              fill="rgba(245,158,11,0.18)"
              stroke="#f59e0b"
              strokeWidth={3}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            />
          )}
          <polygon
            points={`${node.x},${node.y - size * 0.65} ${node.x + size * 0.65},${node.y} ${node.x},${node.y + size * 0.65} ${node.x - size * 0.65},${node.y}`}
            fill={isSelected ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.1)'}
            stroke={isSelected ? '#f59e0b' : 'rgba(245,158,11,0.5)'}
            strokeWidth={isSelected ? 2 : 1.5}
          />
          <text
            x={node.x}
            y={node.y - 6}
            textAnchor="middle"
            fontSize={9}
            fontFamily="monospace"
            fontWeight="600"
            fill="#fcd34d"
          >
            {node.label}
          </text>
          <text
            x={node.x}
            y={node.y + 8}
            textAnchor="middle"
            fontSize={8}
            fontFamily="monospace"
            fill="rgba(252,211,77,0.5)"
          >
            {node.type}
          </text>
        </motion.g>
      )
    }

    // service is a circle
    if (node.type === 'service') {
      const r = 36
      const fillColor = {
        emerald: 'rgba(16,185,129,0.12)',
        green: 'rgba(16,185,129,0.12)',
      }['emerald']
      const strokeColor = isSelected ? '#10b981' : 'rgba(16,185,129,0.5)'
      return (
        <motion.g
          key={node.id}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity, scale: isSelected ? 1.08 : 1 }}
          transition={
            isSelected
              ? { type: 'spring', stiffness: 300, damping: 20 }
              : { delay: index * 0.05, type: 'spring', stiffness: 200, damping: 25 }
          }
          style={{ cursor: 'pointer' }}
          onClick={() => setSelectedId(selectedId === node.id ? null : node.id)}
        >
          {isTraceHighlit && (
            <motion.circle
              cx={node.x} cy={node.y} r={r + 10}
              fill="rgba(16,185,129,0.15)"
              stroke="#10b981"
              strokeWidth={2}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            />
          )}
          <circle
            cx={node.x} cy={node.y} r={r}
            fill={isSelected ? 'rgba(16,185,129,0.22)' : fillColor}
            stroke={strokeColor}
            strokeWidth={isSelected ? 2 : 1.5}
          />
          <text
            x={node.x} y={node.y - 4}
            textAnchor="middle"
            fontSize={9}
            fontFamily="monospace"
            fontWeight="600"
            fill="#6ee7b7"
          >
            {node.label}
          </text>
          <text
            x={node.x} y={node.y + 10}
            textAnchor="middle"
            fontSize={8}
            fontFamily="monospace"
            fill="rgba(110,231,183,0.5)"
          >
            {node.type}
          </text>
        </motion.g>
      )
    }

    // module / controller / mapper — rectangular with rounded corners
    const nodeColors = {
      module:     { fill: isSelected ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.1)',  stroke: isSelected ? '#818cf8' : 'rgba(129,140,248,0.45)', textFill: '#a5b4fc', typeFill: 'rgba(165,180,252,0.45)', glow: '#818cf8', glowAlpha: 0.18 },
      controller: { fill: isSelected ? 'rgba(167,139,250,0.25)' : 'rgba(167,139,250,0.1)', stroke: isSelected ? '#c084fc' : 'rgba(192,132,252,0.45)', textFill: '#d8b4fe', typeFill: 'rgba(216,180,254,0.45)', glow: '#c084fc', glowAlpha: 0.18 },
      mapper:     { fill: isSelected ? 'rgba(236,72,153,0.25)' : 'rgba(236,72,153,0.1)',  stroke: isSelected ? '#f472b6' : 'rgba(244,114,182,0.45)', textFill: '#fbcfe8', typeFill: 'rgba(251,207,232,0.45)', glow: '#f472b6', glowAlpha: 0.18 },
    }[node.type as 'module' | 'controller' | 'mapper'] ?? {
      fill: 'rgba(99,102,241,0.1)', stroke: 'rgba(129,140,248,0.45)', textFill: '#a5b4fc', typeFill: 'rgba(165,180,252,0.45)', glow: '#818cf8', glowAlpha: 0.18,
    }

    const hw = 54
    const hh = 24

    return (
      <motion.g
        key={node.id}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity, scale: isSelected ? 1.08 : 1 }}
        transition={
          isSelected
            ? { type: 'spring', stiffness: 300, damping: 20 }
            : { delay: index * 0.05, type: 'spring', stiffness: 200, damping: 25 }
        }
        style={{ cursor: 'pointer' }}
        onClick={() => setSelectedId(selectedId === node.id ? null : node.id)}
      >
        {isTraceHighlit && (
          <motion.rect
            x={node.x - hw - 8} y={node.y - hh - 8}
            width={(hw + 8) * 2} height={(hh + 8) * 2}
            rx={14} ry={14}
            fill={`rgba(${nodeColors.glow.replace('#', '').match(/.{2}/g)?.map(h => parseInt(h, 16)).join(',') ?? '99,102,241'},${nodeColors.glowAlpha})`}
            stroke={nodeColors.glow}
            strokeWidth={2}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
          />
        )}
        <rect
          x={node.x - hw} y={node.y - hh}
          width={hw * 2} height={hh * 2}
          rx={node.type === 'module' ? 12 : node.type === 'controller' ? 8 : 16}
          fill={nodeColors.fill}
          stroke={nodeColors.stroke}
          strokeWidth={isSelected ? 2 : 1.5}
        />
        <text
          x={node.x} y={node.y - 4}
          textAnchor="middle"
          fontSize={9}
          fontFamily="monospace"
          fontWeight="600"
          fill={nodeColors.textFill}
        >
          {node.label}
        </text>
        <text
          x={node.x} y={node.y + 10}
          textAnchor="middle"
          fontSize={8}
          fontFamily="monospace"
          fill={nodeColors.typeFill}
        >
          {node.type}
        </text>
      </motion.g>
    )
  }

  // ── Principles & endpoints data (preserved from Architecture.tsx) ─────────
  const principles = [
    { title: 'Thin Controllers', desc: 'No business logic — routing, param extraction, response shaping only.' },
    { title: 'Fat Services',     desc: 'All business logic and DB queries live in services.' },
    { title: 'Mapper Separation',desc: 'Model → DTO conversion in dedicated *.mapper.ts files.' },
    { title: 'Schema Separation',desc: 'Zod schemas and TypeScript types in *.schemas.ts files.' },
    { title: 'Shared Utilities', desc: 'Pagination logic in shared/pagination.ts, types in shared/shared.types.ts.' },
  ]

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      {/* Ambient orb */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
      >
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 600,
            height: 600,
            top: '5%',
            left: '30%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 400,
            height: 400,
            bottom: '10%',
            right: '10%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      {/* Header */}
      <motion.div
        className="relative z-10 px-6 pt-8 pb-4 border-b border-gray-800"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-gray-500 border border-gray-700 px-2 py-0.5 rounded">
                Architecture Lab
              </span>
              <span className="font-mono text-xs text-brand-400/60">{activeRepo.shortLabel}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Module Dependency Graph</h1>
            <p className="text-sm text-gray-400">Click any node to explore. Hover edges for flow details.</p>
          </div>

          {/* Trace button */}
          <motion.button
            onClick={runTrace}
            disabled={trace?.active}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-300 font-mono text-sm font-semibold hover:bg-brand-500/20 hover:border-brand-500/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.span
              className="inline-block w-2 h-2 rounded-full bg-brand-400"
              animate={trace?.active ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
            />
            {trace?.active ? (
              <span>Tracing: step {trace.stepIndex + 1}/{TRACE_STEPS.length}</span>
            ) : (
              <span>Animate: GET /bonus-shifts</span>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Main layout: graph + sidebar */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-4 py-6 flex gap-6 flex-col xl:flex-row">
        {/* ── Left: SVG graph ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Legend */}
          <div className="mb-4 flex flex-wrap gap-3 items-center">
            {(Object.keys(NODE_STYLES) as GraphNode['type'][]).map(type => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-sm ${NODE_STYLES[type].bg} border ${NODE_STYLES[type].border}`} />
                <span className="font-mono text-xs text-gray-500">{type}</span>
              </div>
            ))}
            <div className="ml-auto flex gap-3 items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-px bg-gray-600" />
                <span className="font-mono text-xs text-gray-600">dependency</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-px bg-indigo-500" />
                <span className="font-mono text-xs text-gray-600">injection</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-px bg-emerald-500" />
                <span className="font-mono text-xs text-gray-600">dataflow</span>
              </div>
            </div>
          </div>

          {/* SVG canvas */}
          <div className="relative rounded-2xl border border-gray-800 bg-surface-900/60 overflow-hidden shadow-2xl">
            <svg
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              width="100%"
              style={{ display: 'block', minHeight: 340 }}
            >
              <defs>
                <marker id="arrow-dep" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#4b5563" />
                </marker>
                <marker id="arrow-inj" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#6366f1" />
                </marker>
                <marker id="arrow-flow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#10b981" />
                </marker>
                <filter id="glow-packet">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Edges */}
              {graph.edges.map((edge, i) => {
                const fromNode = graph.nodes.find(n => n.id === edge.from)
                const toNode = graph.nodes.find(n => n.id === edge.to)
                if (!fromNode || !toNode) return null

                const color = EDGE_COLORS[edge.flowType]
                const isHovered = hoveredEdgeId === edge.id
                const isTrace = traceEdgeId === edge.id
                const isRelated =
                  selectedId &&
                  (edge.from === selectedId || edge.to === selectedId)

                const edgeOpacity = trace?.active
                  ? isTrace ? 1 : 0.12
                  : selectedId
                  ? isRelated ? 1 : 0.12
                  : 0.55

                const len = edgeLengths[edge.id] ?? 80

                const arrowMarker =
                  edge.flowType === 'dependency'
                    ? 'url(#arrow-dep)'
                    : edge.flowType === 'injection'
                    ? 'url(#arrow-inj)'
                    : 'url(#arrow-flow)'

                return (
                  <g key={edge.id}>
                    {/* Invisible fat hit area */}
                    <line
                      x1={fromNode.x} y1={fromNode.y}
                      x2={toNode.x}   y2={toNode.y}
                      stroke="transparent"
                      strokeWidth={18}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredEdgeId(edge.id)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                    />
                    {/* Actual edge line */}
                    <line
                      ref={el => { edgeRefs.current[edge.id] = el }}
                      x1={fromNode.x} y1={fromNode.y}
                      x2={toNode.x}   y2={toNode.y}
                      stroke={color}
                      strokeWidth={isHovered || isTrace ? 2.5 : 1.5}
                      strokeOpacity={edgeOpacity}
                      markerEnd={arrowMarker}
                      strokeDasharray={len}
                      strokeDashoffset={len}
                      style={{
                        animation: `draw-edge 1s ease-out ${i * 0.06}s forwards`,
                      }}
                    />
                  </g>
                )
              })}

              {/* Nodes */}
              {graph.nodes.map((node, i) => renderNode(node, i))}

              {/* Trace packet */}
              <AnimatePresence>
                {packet && (
                  <motion.circle
                    key="trace-packet"
                    cx={packet.x}
                    cy={packet.y}
                    r={7}
                    fill="#818cf8"
                    filter="url(#glow-packet)"
                    initial={{ opacity: 0, r: 3 }}
                    animate={{ opacity: 1, r: 7 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  />
                )}
              </AnimatePresence>

              {/* Edge hover tooltip (rendered as SVG foreignObject) */}
              <AnimatePresence>
                {hoveredEdgeId && (() => {
                  const edge = edgeById(hoveredEdgeId)
                  if (!edge) return null
                  const fromNode = graph.nodes.find(n => n.id === edge.from)
                  const toNode = graph.nodes.find(n => n.id === edge.to)
                  if (!fromNode || !toNode) return null
                  const mx = (fromNode.x + toNode.x) / 2
                  const my = (fromNode.y + toNode.y) / 2
                  return (
                    <foreignObject
                      key="edge-tooltip"
                      x={mx - 70} y={my - 30}
                      width={140} height={52}
                      style={{ pointerEvents: 'none', overflow: 'visible' }}
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          background: 'rgba(15,15,20,0.92)',
                          border: `1px solid ${EDGE_COLORS[edge.flowType]}55`,
                          borderRadius: 8,
                          padding: '5px 10px',
                          color: '#e5e7eb',
                          fontSize: 10,
                          fontFamily: 'monospace',
                          textAlign: 'center',
                          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <div style={{ color: EDGE_COLORS[edge.flowType], fontWeight: 700, fontSize: 9 }}>
                          {edge.flowType.toUpperCase()}
                        </div>
                        <div>{edge.label}</div>
                      </motion.div>
                    </foreignObject>
                  )
                })()}
              </AnimatePresence>

              {/* Trace step label */}
              <AnimatePresence>
                {trace?.active && trace.stepIndex < TRACE_STEPS.length && (() => {
                  const step = TRACE_STEPS[trace.stepIndex]
                  return (
                    <foreignObject
                      key="trace-label"
                      x={CANVAS_W / 2 - 120}
                      y={CANVAS_H - 44}
                      width={240}
                      height={38}
                      style={{ pointerEvents: 'none', overflow: 'visible' }}
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{
                          background: 'rgba(99,102,241,0.15)',
                          border: '1px solid rgba(129,140,248,0.4)',
                          borderRadius: 10,
                          padding: '6px 14px',
                          color: '#c7d2fe',
                          fontSize: 10,
                          fontFamily: 'monospace',
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ opacity: 0.6 }}>{step.from} → {step.to}:</span>{' '}
                        {step.label}
                      </motion.div>
                    </foreignObject>
                  )
                })()}
              </AnimatePresence>
            </svg>

            {/* CSS for edge draw animation */}
            <style>{`
              @keyframes draw-edge {
                to { stroke-dashoffset: 0; }
              }
            `}</style>
          </div>

          {/* Design Principles (preserved from Architecture.tsx) */}
          <motion.div
            className="mt-6 space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Design Principles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {principles.map((p, i) => (
                <motion.div
                  key={p.title}
                  className="rounded-lg border border-gray-800 bg-surface-900/60 p-4 space-y-1 hover:border-gray-700 transition-colors"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.06, duration: 0.4 }}
                >
                  <p className="text-sm font-semibold text-white">{p.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{p.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Right: detail panel ─────────────────────────────────────── */}
        <div className="w-full xl:w-80 shrink-0">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                className="sticky top-6 rounded-2xl border border-gray-700 bg-surface-900/80 backdrop-blur-md overflow-hidden shadow-2xl"
              >
                {/* Node type accent bar */}
                <div
                  className={`h-1 w-full ${
                    selectedNode.type === 'module'     ? 'bg-gradient-to-r from-brand-500 to-indigo-500' :
                    selectedNode.type === 'controller' ? 'bg-gradient-to-r from-accent-400 to-purple-500' :
                    selectedNode.type === 'service'    ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                    selectedNode.type === 'provider'   ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                                                         'bg-gradient-to-r from-pink-500 to-rose-400'
                  }`}
                />

                <div className="p-5 space-y-5">
                  {/* Header */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${NODE_STYLES[selectedNode.type].bg} ${NODE_STYLES[selectedNode.type].border} ${NODE_STYLES[selectedNode.type].text}`}>
                        {selectedNode.type}
                      </span>
                      <motion.button
                        onClick={() => setSelectedId(null)}
                        className="ml-auto text-gray-600 hover:text-gray-300 text-xs font-mono"
                        whileHover={{ scale: 1.1 }}
                      >
                        ✕ clear
                      </motion.button>
                    </div>
                    <h2 className={`text-lg font-bold font-mono ${NODE_STYLES[selectedNode.type].text}`}>
                      {selectedNode.label}
                    </h2>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {selectedNode.description}
                  </p>

                  {/* Files */}
                  {selectedNode.files && selectedNode.files.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Files</p>
                      <div className="space-y-1">
                        {selectedNode.files.map(f => (
                          <div
                            key={f}
                            className="font-mono text-xs text-gray-400 bg-gray-800/60 px-3 py-1.5 rounded-lg border border-gray-700/50"
                          >
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Connected edges */}
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Connections</p>
                    <div className="space-y-1.5">
                      {selectedEdges.map(edge => {
                        const otherNodeId = edge.from === selectedId ? edge.to : edge.from
                        const otherNode = graph.nodes.find(n => n.id === otherNodeId)
                        const direction = edge.from === selectedId ? '→' : '←'
                        return (
                          <motion.button
                            key={edge.id}
                            onClick={() => setSelectedId(otherNodeId)}
                            className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700/50 hover:border-gray-600 bg-gray-800/40 hover:bg-gray-800/70 transition-all"
                            whileHover={{ x: 2 }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: EDGE_COLORS[edge.flowType] }}
                            />
                            <span className="font-mono text-xs text-gray-400">{direction}</span>
                            <span className={`font-mono text-xs font-semibold ${NODE_STYLES[otherNode?.type ?? 'module'].text}`}>
                              {otherNode?.label ?? otherNodeId}
                            </span>
                            <span className="ml-auto font-mono text-[10px] text-gray-600">{edge.label}</span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="sticky top-6 rounded-2xl border border-gray-800 border-dashed bg-surface-900/40 p-8 flex flex-col items-center justify-center text-center space-y-4"
                style={{ minHeight: 300 }}
              >
                {/* Animated compass icon */}
                <motion.div
                  className="w-14 h-14 rounded-2xl border border-gray-700 bg-gray-800/60 flex items-center justify-center text-2xl"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  🏙️
                </motion.div>
                <div className="space-y-2">
                  <p className="text-white font-semibold text-sm">Explore the city</p>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Click any node to see its files, description, and connections.
                  </p>
                  <p className="text-gray-600 text-xs">
                    Press "Animate: GET /bonus-shifts" to watch a request travel through the graph.
                  </p>
                </div>
                <div className="w-full pt-2 border-t border-gray-800 space-y-2">
                  <p className="text-xs text-gray-600 font-mono uppercase tracking-wider">Node types</p>
                  {(Object.keys(NODE_STYLES) as GraphNode['type'][]).map(type => (
                    <div key={type} className="flex items-center gap-2 text-left">
                      <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 border ${NODE_STYLES[type].bg} ${NODE_STYLES[type].border}`} />
                      <span className={`font-mono text-xs font-semibold ${NODE_STYLES[type].text}`}>{type}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trace log */}
          <AnimatePresence>
            {trace?.active && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="mt-4 rounded-xl border border-brand-500/30 bg-brand-500/5 p-4 space-y-2"
              >
                <p className="font-mono text-xs text-brand-300 font-semibold uppercase tracking-wider">
                  Request Trace
                </p>
                <div className="space-y-1">
                  {TRACE_STEPS.map((step, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 font-mono text-[10px] py-0.5 transition-all duration-200 ${
                        i < trace.stepIndex
                          ? 'text-gray-600 line-through'
                          : i === trace.stepIndex
                          ? 'text-brand-300 font-bold'
                          : 'text-gray-700'
                      }`}
                    >
                      <span className="shrink-0">
                        {i < trace.stepIndex ? '✓' : i === trace.stepIndex ? '▶' : '·'}
                      </span>
                      <span>{step.from} → {step.to}</span>
                      <span className="ml-auto opacity-60">{step.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
