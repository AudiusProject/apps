import { createContext, useContext } from 'react'

import type { AudiusSdk } from '@audius/sdk'
import type { Dispatch } from 'redux'
import { getContext } from 'typed-redux-saga'

import type { AuthService, IdentityService } from '~/services/auth'
import {
  AudiusBackend,
  Env,
  FeatureFlags,
  RemoteConfigInstance,
  SolanaWalletService
} from '~/services/index'

import {
  AllTrackingEvents,
  AnalyticsEvent,
  IdentifyTraits,
  ReportToSentryArgs
} from '../../../models'

export type QueryContextType = {
  audiusSdk: () => Promise<AudiusSdk>
  audiusBackend: AudiusBackend
  authService: AuthService
  solanaWalletService: SolanaWalletService
  identityService: IdentityService
  dispatch: Dispatch
  reportToSentry: (args: ReportToSentryArgs) => void
  env: Env
  fetch: typeof fetch
  remoteConfigInstance: RemoteConfigInstance
  getFeatureEnabled: (
    flag: FeatureFlags,
    fallbackFlag?: FeatureFlags
  ) => Promise<boolean> | boolean
  analytics: {
    init: (isMobile: boolean) => Promise<void>
    track: (event: AnalyticsEvent, callback?: () => void) => Promise<void>
    identify: (
      traits: IdentifyTraits,
      options?: Record<string, unknown>,
      callback?: () => void
    ) => Promise<void>
    make: <T extends AllTrackingEvents>(
      event: T
    ) => {
      eventName: string
      properties: any
    }
  }
  nftClient: null
  imageUtils: {
    generatePlaylistArtwork: (
      urls: string[]
    ) => Promise<{ url: string; file: File }>
  }
}

export const QueryContext = createContext<QueryContextType>(null as any)

export const useQueryContext = () => {
  const queryContext = useContext(QueryContext)

  if (!queryContext) {
    throw new Error(
      'useQueryContext has to be used within <QueryContext.Provider>'
    )
  }

  return queryContext
}

export function* getQueryContext(): Generator<any, QueryContextType, any> {
  // We can't use common typed `getContext` here because of circular dependency
  return {
    audiusBackend: yield* getContext<QueryContextType['audiusBackend']>(
      'audiusBackendInstance'
    ),
    authService:
      yield* getContext<QueryContextType['authService']>('authService'),
    identityService:
      yield* getContext<QueryContextType['identityService']>('identityService'),
    audiusSdk: yield* getContext<QueryContextType['audiusSdk']>('audiusSdk'),
    solanaWalletService: yield* getContext<
      QueryContextType['solanaWalletService']
    >('solanaWalletService'),
    dispatch: yield* getContext<QueryContextType['dispatch']>('dispatch'),
    env: yield* getContext<QueryContextType['env']>('env'),
    fetch,
    getFeatureEnabled:
      yield* getContext<QueryContextType['getFeatureEnabled']>(
        'getFeatureEnabled'
      ),
    remoteConfigInstance: yield* getContext<
      QueryContextType['remoteConfigInstance']
    >('remoteConfigInstance'),
    reportToSentry:
      yield* getContext<QueryContextType['reportToSentry']>('reportToSentry'),
    analytics: yield* getContext<QueryContextType['analytics']>('analytics'),
    nftClient: null,
    imageUtils: yield* getContext<QueryContextType['imageUtils']>('imageUtils')
  }
}
