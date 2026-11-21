import { ReactNode } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { Provider as ReduxProvider } from 'react-redux'
import { createStore } from 'redux'

import { AudiusQueryProvider } from 'app/AudiusQueryProvider'
import { queryClient } from 'services/query-client'

const minimalReducer = (state: object = {}) => state
const minimalStore = createStore(minimalReducer as any)

type PublicSiteProvidersProps = {
  children: ReactNode
}

export const PublicSiteProviders = (props: PublicSiteProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ReduxProvider store={minimalStore}>
        <AudiusQueryProvider>{props.children}</AudiusQueryProvider>
      </ReduxProvider>
    </QueryClientProvider>
  )
}
