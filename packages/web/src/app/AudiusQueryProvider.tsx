import { ReactNode } from 'react'

import { QueryContext } from '@audius/common/api'
import { useDispatch } from 'react-redux'

import * as analytics from 'services/analytics'
import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'
import {
  audiusSdk,
  authService,
  identityService,
  solanaWalletService
} from 'services/audius-sdk'
import { env } from 'services/env'
import { localStorage } from 'services/local-storage'
import { getFeatureEnabled } from 'services/remote-config/featureFlagHelpers'
import { remoteConfigInstance } from 'services/remote-config/remote-config-instance'
import { generatePlaylistArtwork } from 'utils/imageProcessingUtil'

type AudiusQueryProviderProps = {
  children: ReactNode
}

export const AudiusQueryProvider = (props: AudiusQueryProviderProps) => {
  const { children } = props
  const dispatch = useDispatch()
  return (
    <QueryContext.Provider
      value={{
        audiusBackend: audiusBackendInstance,
        audiusSdk,
        authService,
        identityService,
        solanaWalletService,
        dispatch,
        env,
        fetch,
        localStorage,
        remoteConfigInstance,
        getFeatureEnabled,
        analytics,
        nftClient: null,
        imageUtils: {
          generatePlaylistArtwork
        }
      }}
    >
      {children}
    </QueryContext.Provider>
  )
}
