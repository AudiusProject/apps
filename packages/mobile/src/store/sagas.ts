import { niceModalBridgeSagas } from '@audius/common/services'
import {
  buyUSDCSagas,
  castSagas,
  chatSagas,
  reachabilitySagas,
  deletePlaylistConfirmationModalUISagas as deletePlaylistConfirmationModalSagas,
  duplicateAddConfirmationModalUISagas as duplicateAddConfirmationModalSagas,
  mobileOverflowMenuUISagas as overflowMenuSagas,
  shareModalUISagas as shareModalSagas,
  stripeModalUISagas,
  toastSagas,
  modalsSagas,
  gatedContentSagas,
  purchaseContentSagas,
  withdrawUSDCSagas,
  confirmerSagas,
  tokenDashboardPageActions
} from '@audius/common/store'
import { lazySagas, sagaWithErrorHandler } from '@audius/common/utils'
import addToCollectionSagas from 'common/store/add-to-collection/sagas'
import analyticsSagas from 'common/store/analytics/sagas'
import backendSagas from 'common/store/backend/sagas'
import rewardsPageSagas from 'common/store/pages/audio-rewards/sagas'
import collectionPageSagas from 'common/store/pages/collection/sagas'
import deactivateAccountSagas from 'common/store/pages/deactivate-account/sagas'
import signOnSagas from 'common/store/pages/signon/sagas'
import trackPageSagas from 'common/store/pages/track/sagas'
import playbackEngineSagas from 'common/store/playback/sagas'
import profileSagas from 'common/store/profile/sagas'
import savedCollectionsSagas from 'common/store/saved-collections/sagas'
import socialSagas from 'common/store/social/sagas'
import { all, spawn } from 'typed-redux-saga'

import collectionsSagas from 'app/store/cache/collections/sagas'

import accountSagas from './account/sagas'
import mobileChatSagas from './chat/sagas'
import initKeyboardEvents from './keyboard/sagas'
import offlineDownloadSagas from './offline-downloads/sagas'
import rateCtaSagas from './rate-cta/sagas'
import settingsSagas from './settings/sagas'
import signOutSagas from './sign-out/sagas'
import signUpSagas from './sign-up/sagas'
import themeSagas from './theme/sagas'
import {
  connect as connectWallet,
  connectNewWallet,
  signMessage
} from './wallet-connect/slice'

const tokenDashboardSagas = lazySagas({
  pattern: [
    tokenDashboardPageActions.fetchAssociatedWallets.type,
    tokenDashboardPageActions.confirmRemoveWallet.type
  ],
  load: () => import('common/store/pages/token-dashboard/sagas')
})
const walletsSagas = lazySagas({
  pattern: [connectWallet.type, connectNewWallet.type, signMessage.type],
  load: () => import('./wallet-connect/sagas')
})

export default function* rootSaga() {
  const sagas = [
    ...backendSagas(),
    ...analyticsSagas(),
    ...confirmerSagas(),

    ...accountSagas(),

    ...collectionsSagas(),
    ...savedCollectionsSagas(),

    ...playbackEngineSagas(),

    ...signOnSagas(),
    ...signOutSagas(),

    ...signUpSagas(),

    ...gatedContentSagas(),
    ...purchaseContentSagas(),
    ...buyUSDCSagas(),
    ...withdrawUSDCSagas(),
    ...stripeModalUISagas(),

    ...modalsSagas(),
    ...niceModalBridgeSagas(),

    ...trackPageSagas(),
    ...chatSagas(),
    ...mobileChatSagas(),
    ...collectionPageSagas(),
    ...profileSagas(),
    ...socialSagas(),
    ...rewardsPageSagas(),
    ...settingsSagas(),

    ...castSagas(),

    ...addToCollectionSagas(),

    ...overflowMenuSagas(),
    ...rateCtaSagas(),
    ...deactivateAccountSagas(),
    ...deletePlaylistConfirmationModalSagas(),
    ...duplicateAddConfirmationModalSagas(),
    ...shareModalSagas(),
    ...themeSagas(),
    tokenDashboardSagas,
    ...offlineDownloadSagas(),
    ...reachabilitySagas(),
    ...toastSagas(),

    initKeyboardEvents,
    walletsSagas
  ]

  yield* all(sagas.map((saga) => spawn(sagaWithErrorHandler, saga)))
}
