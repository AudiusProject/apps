import {
  buyUSDCSagas,
  castSagas,
  chatSagas,
  reachabilitySagas,
  remoteConfigSagas,
  deletePlaylistConfirmationModalUISagas as deletePlaylistConfirmationModalSagas,
  duplicateAddConfirmationModalUISagas as duplicateAddConfirmationModalSagas,
  mobileOverflowMenuUISagas as overflowMenuSagas,
  shareModalUISagas as shareModalSagas,
  stripeModalUISagas,
  toastSagas,
  searchUsersModalSagas,
  modalsSagas,
  playerSagas as commonPlayerSagas,
  playbackPositionSagas,
  gatedContentSagas,
  purchaseContentSagas,
  withdrawUSDCSagas,
  confirmerSagas
} from '@audius/common/store'
import { sagaWithErrorHandler } from '@audius/common/utils'
import addToCollectionSagas from 'common/store/add-to-collection/sagas'
import analyticsSagas from 'common/store/analytics/sagas'
import backendSagas from 'common/store/backend/sagas'
import tracksSagas from 'common/store/cache/tracks/sagas'
import changePasswordSagas from 'common/store/change-password/sagas'
import rewardsPageSagas from 'common/store/pages/audio-rewards/sagas'
import collectionPageSagas from 'common/store/pages/collection/sagas'
import deactivateAccountSagas from 'common/store/pages/deactivate-account/sagas'
import exclusiveTracksSagas from 'common/store/pages/exclusive-tracks/sagas'
import feedPageSagas from 'common/store/pages/feed/sagas'
import historySagas from 'common/store/pages/history/sagas'
import librarySagas from 'common/store/pages/library/sagas'
import premiumTracksSagas from 'common/store/pages/premium-tracks/sagas'
import remixesSagas from 'common/store/pages/remixes-page/sagas'
import searchTracksLineupSagas from 'common/store/pages/search-page/lineups/tracks/sagas'
import signOnSagas from 'common/store/pages/signon/sagas'
import tokenDashboardSagas from 'common/store/pages/token-dashboard/sagas'
import trackPageSagas from 'common/store/pages/track/sagas'
import trendingPageSagas from 'common/store/pages/trending/sagas'
import trendingPlaylistSagas from 'common/store/pages/trending-playlists/sagas'
import trendingUndergroundSagas from 'common/store/pages/trending-underground/sagas'
import playerSagas from 'common/store/player/sagas'
import playlistLibrarySagas from 'common/store/playlist-library/sagas'
import profileSagas from 'common/store/profile/sagas'
import queueSagas from 'common/store/queue/sagas'
import recoveryEmailSagas from 'common/store/recovery-email/sagas'
import savedCollectionsSagas from 'common/store/saved-collections/sagas'
import socialSagas from 'common/store/social/sagas'
import tippingSagas from 'common/store/tipping/sagas'
import uploadSagas from 'common/store/upload/sagas'
import { all, spawn } from 'typed-redux-saga'

import collectionsSagas from 'app/store/cache/collections/sagas'

import accountSagas from './account/sagas'
import mobileChatSagas from './chat/sagas'
import initKeyboardEvents from './keyboard/sagas'
import oauthSagas from './oauth/sagas'
import offlineDownloadSagas from './offline-downloads/sagas'
import rateCtaSagas from './rate-cta/sagas'
import settingsSagas from './settings/sagas'
import signOutSagas from './sign-out/sagas'
import signUpSagas from './sign-up/sagas'
import themeSagas from './theme/sagas'
import walletsSagas from './wallet-connect/sagas'

export default function* rootSaga() {
  const sagas = [
    // Config
    ...backendSagas(),
    ...analyticsSagas(),
    ...confirmerSagas(),

    // Account
    ...accountSagas(),
    ...recoveryEmailSagas(),
    ...playlistLibrarySagas(),

    // Cache
    ...collectionsSagas(),
    ...tracksSagas(),
    ...savedCollectionsSagas(),

    // Playback
    ...commonPlayerSagas(),
    ...playerSagas(),
    ...queueSagas(),
    ...playbackPositionSagas(),

    // Sign in / Sign out
    ...signOnSagas(),
    ...signOutSagas(),

    // Sign up
    ...signUpSagas(),

    // Tipping
    ...tippingSagas(),

    // Premium content
    ...gatedContentSagas(),
    ...purchaseContentSagas(),
    ...buyUSDCSagas(),
    ...withdrawUSDCSagas(),
    ...stripeModalUISagas(),

    // Search Users
    ...searchUsersModalSagas(),

    ...modalsSagas(),

    // Pages
    ...trackPageSagas(),
    ...chatSagas(),
    ...mobileChatSagas(),
    ...collectionPageSagas(),
    ...feedPageSagas(),
    ...trendingPageSagas(),
    ...trendingPlaylistSagas(),
    ...trendingUndergroundSagas(),
    ...librarySagas(),
    ...profileSagas(),
    ...socialSagas(),
    ...historySagas(),
    ...rewardsPageSagas(),
    ...settingsSagas(),
    ...premiumTracksSagas(),
    ...exclusiveTracksSagas(),
    ...searchTracksLineupSagas(),

    // Cast
    ...castSagas(),
    ...remixesSagas(),

    // Application
    ...addToCollectionSagas(),
    ...changePasswordSagas(),

    ...overflowMenuSagas(),
    ...rateCtaSagas(),
    ...deactivateAccountSagas(),
    ...deletePlaylistConfirmationModalSagas(),
    ...duplicateAddConfirmationModalSagas(),
    ...shareModalSagas(),
    ...themeSagas(),
    ...tokenDashboardSagas(),
    ...uploadSagas(),
    ...offlineDownloadSagas(),
    ...reachabilitySagas(),
    ...toastSagas(),

    initKeyboardEvents,
    ...remoteConfigSagas(),
    ...oauthSagas(),
    ...walletsSagas()
  ]

  yield* all(sagas.map((saga) => spawn(sagaWithErrorHandler, saga)))
}
