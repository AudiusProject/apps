import type { CommonStoreContext } from '@audius/common/store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { setTag, getCurrentScope } from '@sentry/react-native'

import * as analytics from 'app/services/analytics'
import { audioPlayer } from 'app/services/audio-player'
import { audiusBackendInstance } from 'app/services/audius-backend-instance'
import { env } from 'app/services/env'
import { explore } from 'app/services/explore'
import { fingerprintClient } from 'app/services/fingerprint'
import { localStorage } from 'app/services/local-storage'
import { queryClient } from 'app/services/query-client'
import {
  getFeatureEnabled,
  remoteConfigInstance
} from 'app/services/remote-config'
import { audiusSdk } from 'app/services/sdk/audius-sdk'
import { authService, solanaWalletService } from 'app/services/sdk/auth'
import { identityService } from 'app/services/sdk/identity'
import { trackDownload } from 'app/services/track-download'
import { walletClient } from 'app/services/wallet-client'
import {
  connect,
  signAndSendTransaction
} from 'app/store/utils/phantomWalletConnect'
import { generatePlaylistArtwork } from 'app/utils/generatePlaylistArtwork'
import { reportToSentry } from 'app/utils/reportToSentry'
import share from 'app/utils/share'

export const storeContext: CommonStoreContext = {
  getLocalStorageItem: async (key) => AsyncStorage.getItem(key),
  setLocalStorageItem: async (key, value) => AsyncStorage.setItem(key, value),
  removeLocalStorageItem: async (key) => AsyncStorage.removeItem(key),
  getFeatureEnabled,
  getHostUrl: () => {
    return `${env.PUBLIC_PROTOCOL}//${env.PUBLIC_HOSTNAME}`
  },
  analytics,
  remoteConfigInstance,
  audiusBackendInstance,
  fingerprintClient,
  walletClient,
  localStorage,
  isNativeMobile: true,
  isElectron: false,
  env,
  explore,
  nftClient: null,
  sentry: { setTag, getCurrentScope },
  reportToSentry,
  // Shim in main, but defined in native-reloaded branch
  audioPlayer,
  trackDownload,
  instagramAppId: env.INSTAGRAM_APP_ID,
  instagramRedirectUrl: env.INSTAGRAM_REDIRECT_URL,
  share: (url: string, message?: string) => share({ url, message }),
  audiusSdk,
  authService,
  identityService,
  solanaWalletService,
  imageUtils: {
    generatePlaylistArtwork
  },
  isMobile: true,
  queryClient,
  mobileWalletActions: {
    connect,
    signAndSendTransaction
  },
  // @ts-ignore dispatch will be populated in store.ts
  dispatch: undefined
}
