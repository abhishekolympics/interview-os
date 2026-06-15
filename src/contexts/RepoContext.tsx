import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { RepoConfig } from '../types/repo'
import { bonusShiftsRepo } from '../data/repos/fqai9cn3'
import { bonusShiftsInterviewRepo } from '../data/repos/fqai9cn3_interview'
import { topWorkplacesRepo } from '../data/repos/ncdz1yed'

export const ALL_REPOS: RepoConfig[] = [bonusShiftsRepo, bonusShiftsInterviewRepo, topWorkplacesRepo]

interface RepoContextValue {
  activeRepo: RepoConfig
  repos: RepoConfig[]
  setActiveRepo: (id: string) => void
}

const RepoContext = createContext<RepoContextValue | null>(null)

export function RepoProvider({ children }: { children: ReactNode }) {
  const [activeRepoId, setActiveRepoId] = useState<string>(
    () => localStorage.getItem('last_repo') ?? 'fqai9cn3'
  )

  const activeRepo = ALL_REPOS.find(r => r.id === activeRepoId) ?? ALL_REPOS[0]

  const setActiveRepo = (id: string) => {
    localStorage.setItem('last_repo', id)
    setActiveRepoId(id)
  }

  return (
    <RepoContext.Provider value={{ activeRepo, repos: ALL_REPOS, setActiveRepo }}>
      {children}
    </RepoContext.Provider>
  )
}

export function useRepo() {
  const ctx = useContext(RepoContext)
  if (!ctx) throw new Error('useRepo must be used within RepoProvider')
  return ctx
}
