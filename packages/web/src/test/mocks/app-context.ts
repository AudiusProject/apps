import { FeatureFlags, LocalStorage } from '@audius/common/services'

import { createMockLocalStorage } from './local-storage'
import { createMockRemoteConfig } from './remote-config'

export const createMockAppContext = (
  featureFlags: Partial<Record<FeatureFlags, boolean>> = {}
) => ({
  analytics: {
    track: async () => {},
    make: () => ({ eventName: '', properties: {} })
  },
  imageUtils: {
    generatePlaylistArtwork: async () => ({ url: '', file: new File([], '') })
  },
  getHostUrl: () => 'http://localhost:3000',
  audiusBackend: {} as any,
  trackDownload: {} as any,
  audiusSdk: undefined,
  remoteConfig: createMockRemoteConfig(featureFlags),
  localStorage: createMockLocalStorage() as unknown as LocalStorage
})
