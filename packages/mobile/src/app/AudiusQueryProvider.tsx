import type { ReactNode } from 'react'

import { QueryContext } from '@audius/common/api'

import * as analytics from 'app/services/analytics'
import { audiusBackendInstance } from 'app/services/audius-backend-instance'
import { env } from 'app/services/env'
import {
  getFeatureEnabled,
  remoteConfigInstance
} from 'app/services/remote-config'
import { audiusSdk } from 'app/services/sdk/audius-sdk'
import { authService, solanaWalletService } from 'app/services/sdk/auth'
import { identityService } from 'app/services/sdk/identity'
import { store } from 'app/store'
import { generatePlaylistArtwork } from 'app/utils/generatePlaylistArtwork'
import { reportToSentry } from 'app/utils/reportToSentry'

type AudiusQueryProviderProps = {
  children: ReactNode
}

export const queryContext = {
  audiusBackend: audiusBackendInstance,
  audiusSdk,
  authService,
  identityService,
  solanaWalletService,
  dispatch: store.dispatch,
  reportToSentry,
  env,
  fetch,
  remoteConfigInstance,
  getFeatureEnabled,
  analytics,
  nftClient: null,
  imageUtils: {
    generatePlaylistArtwork
  }
}

export const AudiusQueryProvider = (props: AudiusQueryProviderProps) => {
  const { children } = props
  return (
    <QueryContext.Provider value={queryContext}>
      {children}
    </QueryContext.Provider>
  )
}
