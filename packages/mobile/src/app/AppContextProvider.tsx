import { useMemo, type ReactNode } from 'react'

import { AppContext } from '@audius/common/context'
import RNRestart from 'react-native-restart'
import { useAsync } from 'react-use'

import * as analytics from 'app/services/analytics'
import { audiusBackendInstance } from 'app/services/audius-backend-instance'
import { env } from 'app/services/env'
import { localStorage } from 'app/services/local-storage'
import { remoteConfigInstance } from 'app/services/remote-config/remote-config-instance'
import { audiusSdk } from 'app/services/sdk/audius-sdk'
import { trackDownload } from 'app/services/track-download'
import { generatePlaylistArtwork } from 'app/utils/generatePlaylistArtwork'
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
      getHostUrl: () => {
        return `${env.PUBLIC_PROTOCOL}//${env.PUBLIC_HOSTNAME}`
      },
      imageUtils: { generatePlaylistArtwork },
      audiusSdk: sdk,
      audiusBackend: audiusBackendInstance,
      trackDownload,
      remoteConfig: remoteConfigInstance,
      reloadApp: () => RNRestart.Restart()
    }),
    [sdk]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
