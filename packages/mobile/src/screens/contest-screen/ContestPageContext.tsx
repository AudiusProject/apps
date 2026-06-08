import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'

import type { ID } from '@audius/common/models'

/**
 * Shared state for a contest page's tab bodies. The outer
 * `ContestScreen` fetches everything once (track, user, contest
 * event, follow state, downloadable flag) and hands the pre-resolved
 * values to tab components through this provider instead of having
 * each tab re-run the same hooks. This keeps the tabs pure
 * presentational — they consume the context via `useContestPage()`
 * — and lets us swap the screen shell to `CollapsibleTabNavigator`
 * (where each tab is its own React tree) without each tab needing
 * to know about navigation params.
 */
export type ContestPageContextValue = {
  trackId: ID
  eventId: ID
  eventOwnerUserId: ID
  userId: ID
  contestTitle: string
  description: string | undefined
  hasDownloads: boolean
  followerCount: number
}

const ContestPageContext = createContext<ContestPageContextValue | null>(null)

export const ContestPageProvider = ({
  value,
  children
}: {
  value: ContestPageContextValue
  children: ReactNode
}) => {
  return (
    <ContestPageContext.Provider value={value}>
      {children}
    </ContestPageContext.Provider>
  )
}

export const useContestPage = (): ContestPageContextValue => {
  const ctx = useContext(ContestPageContext)
  if (!ctx) {
    throw new Error('useContestPage must be used inside a ContestPageProvider')
  }
  return ctx
}
