import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'

import type { ID } from '@audius/common/models'

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
