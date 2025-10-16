import { FeatureFlags } from '@audius/common/services'
import { CommonStoreContext } from '@audius/common/store'
import { setTag, getCurrentScope } from '@sentry/browser'

import * as analytics from 'services/analytics'
import { audioPlayer } from 'services/audio-player'
import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'
import {
  audiusSdk,
  authService,
  solanaWalletService
} from 'services/audius-sdk'
import { identityService } from 'services/audius-sdk/identity'
import { env } from 'services/env'
import { explore } from 'services/explore'
import { fingerprintClient } from 'services/fingerprint'
import { localStorage } from 'services/local-storage'
import { queryClient } from 'services/query-client'
import { getFeatureEnabled } from 'services/remote-config/featureFlagHelpers'
import { remoteConfigInstance } from 'services/remote-config/remote-config-instance'
import { trackDownload } from 'services/track-download'
import { walletClient } from 'services/wallet-client'
import { isElectron } from 'utils/clientUtil'
import { generatePlaylistArtwork } from 'utils/imageProcessingUtil'
import { getShare } from 'utils/share'

import { reportToSentry } from './errors/reportToSentry'
import { getLineupSelectorForRoute } from './lineup/lineupForRoute'

export const buildStoreContext = ({
  isMobile,
  isTest
}: {
  isMobile: boolean
  isTest: boolean | undefined
}): CommonStoreContext => {
  return {
    getLocalStorageItem: async (key: string) =>
      window?.localStorage?.getItem(key),
    setLocalStorageItem: async (key: string, value: string) =>
      window?.localStorage?.setItem(key, value),
    removeLocalStorageItem: async (key: string) =>
      window?.localStorage?.removeItem(key),
    // Note: casting return type to Promise<boolean> to maintain pairity with mobile, but
    // it may be best to update mobile to not be async
    getFeatureEnabled: getFeatureEnabled as unknown as (
      flag: FeatureFlags
    ) => Promise<boolean>,
    getHostUrl: () => window.location.origin,
    analytics,
    remoteConfigInstance,
    audiusBackendInstance,
    fingerprintClient,
    walletClient,
    localStorage,
    isNativeMobile: false,
    isElectron: isElectron(),
    env,
    explore,
    // @ts-ignore js file
    getLineupSelectorForRoute,
    audioPlayer: audioPlayer!,
    nftClient: null,
    sentry: { setTag, getCurrentScope },
    reportToSentry,
    trackDownload,
    instagramAppId: env.INSTAGRAM_APP_ID,
    instagramRedirectUrl: env.INSTAGRAM_REDIRECT_URL,
    share: getShare(isMobile),
    // The test SDK imports vitest which we're not able to use in browser
    audiusSdk: isTest
      ? () =>
          Promise.resolve(import('../test/mocks/audiusSdk')).then((m) =>
            m.audiusSdk()
          )
      : audiusSdk,
    solanaWalletService,
    authService,
    identityService,
    imageUtils: {
      generatePlaylistArtwork
    },
    isMobile,
    queryClient,
    // @ts-ignore dispatch will be populated in configureStore
    dispatch: undefined
  }
}
