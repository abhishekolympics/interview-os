// src/types/repo.ts
export interface Flashcard {
  id: string
  deck: number
  deckName: string
  type: 'basic' | 'cloze'
  front: string
  back: string
  source: string
  topic: string
  relevance: number
  clozeSentence?: string
  clozeAnswer?: string
  clozeDistractors?: string[]
}

export interface DeckDefinition {
  id: number
  name: string
  description: string
}

export interface RequestStep {
  label: string
  detail: string
  code?: string
  file?: string
  lines?: string
}

export interface Endpoint {
  id: string
  method: string
  path: string
  summary: string
  description: string
  breakdown: string[]
  steps: RequestStep[]
  mockRequest?: Record<string, unknown>
  mockResponse?: unknown
}

export interface GraphNode {
  id: string
  label: string
  type: 'module' | 'controller' | 'service' | 'provider' | 'mapper'
  files?: string[]
  description: string
  x: number
  y: number
  color?: string
}

export interface GraphEdge {
  id: string
  from: string
  to: string
  label: string
  flowType: 'dependency' | 'dataflow' | 'injection'
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface CodeWalkStop {
  id: string
  step: number
  title: string
  file: string
  lines?: string
  explanation: string
  why: string
  codeSnippet?: string
  connectsTo?: string
}

export interface GoldenBullet {
  id: string
  title: string
  category: 'core' | 'gotcha' | 'math' | 'trap'
  summary: string
  detail: string
  source?: string
  info?: Array<{ label: string; value: string }>
}

export interface StefanScript {
  id: string
  difficulty: 'warmup' | 'standard' | 'brutal' | 'catch'
  topic: string
  setup: string
  questions: string[]
  hints?: string[]
  keyPoints: string[]
}

export interface RepoConfig {
  id: string
  label: string
  shortLabel: string
  description: string
  character: string
  color: 'blue' | 'purple' | 'amber'
  badge: string
  flashcards: Flashcard[]
  decks: DeckDefinition[]
  endpoints: Endpoint[]
  architectureGraph: GraphData
  codeWalk: CodeWalkStop[]
  goldenBullets: GoldenBullet[]
  stefanScripts: StefanScript[]
}
