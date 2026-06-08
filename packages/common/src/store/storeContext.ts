import type { AudiusSdkWithServices } from '@audius/sdk'
import { VersionedTransaction } from '@solana/web3.js'
import { QueryClient } from '@tanstack/react-query'
import { Dispatch } from 'redux'
import nacl from 'tweetnacl'

import { AuthService, IdentityService } from '~/services'
import { SolanaWalletService } from '~/services/solana'

import {
  AllTrackingEvents,
  AnalyticsEvent,
  IdentifyTraits
} from '../models'
import { AudioPlayer } from '../services/audio-player'
import { AudiusBackend } from '../services/audius-backend'
import { Env } from '../services/env'
import { Explore } from '../services/explore'
import { LocalStorage } from '../services/local-storage'
import { FeatureFlags, RemoteConfigInstance } from '../services/remote-config'
import { TrackDownload } from '../services/track-download'
import { WalletClient } from '../services/wallet-client'

export type CommonStoreContext = {
  getLocalStorageItem: (key: string) => Promise<string | null>
  setLocalStorageItem: (key: string, value: string) => Promise<void>
  removeLocalStorageItem: (key: string) => Promise<void>
  getFeatureEnabled: (
    flag: FeatureFlags,
    fallbackFlag?: FeatureFlags
  ) => Promise<boolean>
  analytics: {
    init: (isMobile: boolean) => Promise<void>
    track: (event: AnalyticsEvent, callback?: () => void) => Promise<void>
    identify: (
      traits?: IdentifyTraits,
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
  getHostUrl: () => string
  remoteConfigInstance: RemoteConfigInstance
  audiusBackendInstance: AudiusBackend
  walletClient: WalletClient
  localStorage: LocalStorage
  isNativeMobile: boolean
  isElectron: boolean
  env: Env
  explore: Explore
  audioPlayer: AudioPlayer
  nftClient: null
  trackDownload: TrackDownload
  instagramAppId?: string
  instagramRedirectUrl?: string
  share: (url: string, message?: string) => Promise<void> | void
  audiusSdk: () => Promise<AudiusSdkWithServices>
  authService: AuthService
  identityService: IdentityService
  solanaWalletService: SolanaWalletService
  imageUtils: {
    generatePlaylistArtwork: (
      urls: string[]
    ) => Promise<{ file: File; url: string }>
  }
  isMobile: boolean
  dispatch: Dispatch<any>
  queryClient: QueryClient
  mobileWalletActions?: {
    connect: (dappKeyPair: nacl.BoxKeyPair) => void
    signAndSendTransaction: (params: {
      transaction: VersionedTransaction
      session: string
      sharedSecret: Uint8Array
      dappKeyPair: nacl.BoxKeyPair
    }) => void
  }
}
