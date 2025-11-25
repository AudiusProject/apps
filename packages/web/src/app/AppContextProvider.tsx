import { ReactNode, useMemo } from 'react'

import { AppContext } from '@audius/common/context'
import { useAsync } from 'react-use'

import * as analytics from 'services/analytics'
import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'
import { audiusSdk } from 'services/audius-sdk'
import { localStorage } from 'services/local-storage'
import { remoteConfigInstance } from 'services/remote-config/remote-config-instance'
import { trackDownload } from 'services/track-download'
import { generatePlaylistArtwork } from 'utils/imageProcessingUtil'
type AppContextProviderProps = {
  children: ReactNode
}

export const AppContextProvider = (props: AppContextProviderProps) => {
  const { children } = props

  const { value: sdk } = useAsync(audiusSdk)

  const value = useMemo(
    () => ({
      analytics,
      localStorage,
      imageUtils: {
        generatePlaylistArtwork
      },
      getHostUrl: () =>
        typeof window !== 'undefined' ? window.location.origin : '',
      audiusSdk: sdk,
      audiusBackend: audiusBackendInstance,
      remoteConfig: remoteConfigInstance,
      trackDownload
    }),
    [sdk]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
