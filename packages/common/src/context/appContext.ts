import { createContext, useContext } from 'react'

import type { AudiusSdkWithServices } from '@audius/sdk/services'

import { AnalyticsEvent, AllTrackingEvents } from '~/models/Analytics'
import { AudiusBackend } from '~/services/audius-backend'
import { LocalStorage } from '~/services/local-storage'
import { RemoteConfigInstance } from '~/services/remote-config'
import { TrackDownload } from '~/services/track-download'
type AppContextType = {
  analytics: {
    track: (event: AnalyticsEvent, callback?: () => void) => Promise<void>
    make: <T extends AllTrackingEvents>(
      event: T
    ) => {
      eventName: string
      properties: any
    }
  }
  imageUtils: {
    generatePlaylistArtwork: (
      imageUrls: string[]
    ) => Promise<{ url: string; file: File }>
  }
  getHostUrl: () => string
  audiusBackend: AudiusBackend
  trackDownload: TrackDownload
  audiusSdk?: AudiusSdkWithServices
  remoteConfig: RemoteConfigInstance
  localStorage: LocalStorage
}

export const AppContext = createContext<AppContextType | null>(null)

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext has to be used within <AppContext.Provider>')
  }

  return context
}
