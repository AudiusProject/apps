// import collectionsErrorSagas from 'common/store/cache/collections/errorSagas'
// import collectionsSagas from 'common/store/cache/collections/sagas'
// import cacheSagas from 'common/store/cache/sagas'
// import tracksSagas from 'common/store/cache/tracks/sagas'
// import usersSagas from 'common/store/cache/users/sagas'
// import recoveryEmailSagas from 'common/store/recovery-email/sagas'
// import signOutSagas from 'common/store/sign-out/sagas'

import { accountSagas } from '~/store/account'
import { buyUSDCSagas } from '~/store/buy-usdc'
import { sagas as castSagas } from '~/store/cast/sagas'
import { gatedContentSagas } from '~/store/gated-content'
import { chatSagas } from '~/store/pages/chat'
import { playbackPositionSagas } from '~/store/playback-position'
import { playerSagas } from '~/store/player'
import { purchaseContentSagas } from '~/store/purchase-content'
import remoteConfigSagas from '~/store/remote-config/sagas'
import {
  searchUsersModalSagas,
  toastSagas,
  deletePlaylistConfirmationModalUISagas,
  duplicateAddConfirmationModalUISagas,
  mobileOverflowMenuUISagas,
  shareModalUISagas,
  stripeModalUISagas,
  withdrawUSDCSagas,
  modalsSagas
} from '~/store/ui'

import { playlistUpdatesSagas } from './playlist-updates'
import { CommonStoreContext } from './storeContext'

/**
 * A function that creates common sagas. The function takes
 * a CommonStoreContext as input such that platforms (native and web)
 * may specify system-level APIs, e.g. local storage.
 * @param ctx
 * @returns an object of all sagas to be yielded
 */
export const sagas = (_ctx: CommonStoreContext) => ({
  account: accountSagas,
  buyUSDC: buyUSDCSagas,
  remoteConfig: remoteConfigSagas,
  cast: castSagas,
  gatedContent: gatedContentSagas,
  purchaseContent: purchaseContentSagas,
  chat: chatSagas,
  searchUsers: searchUsersModalSagas,
  toast: toastSagas,
  shareModalUI: shareModalUISagas,
  stripeModalUI: stripeModalUISagas,
  mobileOverflowMenuUI: mobileOverflowMenuUISagas,
  modals: modalsSagas,
  deletePlaylistConfirmationModalUI: deletePlaylistConfirmationModalUISagas,
  duplidateAddConfirmationModalUI: duplicateAddConfirmationModalUISagas,
  player: playerSagas,
  playbackPosition: playbackPositionSagas,
  playlistUpdates: playlistUpdatesSagas,
  withdrawUSDC: withdrawUSDCSagas

  // signOut: signOutSagas
  // recoveryEmail: recoveryEmailSagas
  // TODO:
  // pull in the following from web
  // once AudiusBackend and dependencies are migrated
  // ./pages/explore/exploreCollections/sagas.ts
  // ./pages/explore/sagas.ts
  // components/add-to-collection/store/sagas.ts
  // components/share-sound-to-tiktok-modal/store/sagas.ts
  // store/social/tracks/sagas.ts
  // store/social/users/sagas.ts
  // store/social/collections/sagas.ts
  // pages/audio-rewards-page/store/sagas.ts
  // store/wallet/sagas.ts
  // store/lineup/sagas.js
  // pages/feed/store/lineups/feed/sagas.js
  // pages/feed/store/sagas.js
  // pages/collection/store/lineups/tracks/sagas.js
  // pages/collection/store/sagas.js
  // pages/track/store/lineups/tracks/sagas.js
  // pages/track/store/sagas.js
  // store/ui/stemsUpload/sagas.ts
  // pages/user-list/followers/sagas.ts
  // pages/user-list/following/sagas.ts
  // pages/user-list/reposts/sagas.ts
  // pages/user-list/favorites/sagas.ts
  // pages/user-list/mutuals/sagas.ts
  // pages/user-list/supporting/sagas.ts
  // pages/user-list/top-supporters/sagas.ts
  // pages/search-explore-page/store/sagas.ts
  // pages/search-explore-page/store/exploreCollections/sagas.ts
  // store/solana/sagas.ts
  // pages/trending-page/store/sagas.ts
  // pages/trending-page/store/lineups/trending/sagas.ts
  // pages/trending-underground-page/store/lineups/tracks/sagas.ts
  // pages/trending-underground-page/store/sagas.ts
  // pages/premium-tracks/sagas.ts
  // pages/premium-tracks/lineups/tracks/sagas.ts
  // pages/smart-collection/store/sagas.ts
  // store/application/ui/theme/sagas.ts
  // pages/search-page/store/sagas.ts
  // pages/search-page/store/lineups/tracks/sagas.ts
  // notifications/store/sagas.ts
  // notifications/store/mobileSagas.ts
  // pages/remixes-page/store/sagas.ts
  // pages/remixes-page/store/lineups/tracks/sagas.ts
  //
  // pull in the following from web
  // once the player and dependencies are migrated
  // store/queue/sagas.ts
})
