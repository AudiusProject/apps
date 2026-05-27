import { niceModalBridgeSagas } from '@audius/common/services'
import {
  buyUSDCSagas,
  castSagas,
  chatSagas,
  reachabilitySagas as commonReachabilitySagas,
  deletePlaylistConfirmationModalUISagas as deletePlaylistConfirmationModalSagas,
  duplicateAddConfirmationModalUISagas as duplicateAddConfirmationModalSagas,
  mobileOverflowMenuUISagas as overflowMenuSagas,
  shareModalUISagas as shareModalSagas,
  stripeModalUISagas as stripeModalSagas,
  toastSagas,
  modalsSagas,
  gatedContentSagas,
  purchaseContentSagas,
  confirmerSagas,
  withdrawUSDCSagas
} from '@audius/common/store'
import { sagaWithErrorHandler } from '@audius/common/utils'
import { all, spawn } from 'typed-redux-saga'

import addToCollectionSagas from 'common/store/add-to-collection/sagas'
import analyticsSagas from 'common/store/analytics/sagas'
import backendSagas from 'common/store/backend/sagas'
import collectionsSagas from 'common/store/cache/collections/webSagas'
import rewardsPageSagas from 'common/store/pages/audio-rewards/sagas'
import collectionSagas from 'common/store/pages/collection/sagas'
import deactivateAccountSagas from 'common/store/pages/deactivate-account/sagas'
import signOnSaga from 'common/store/pages/signon/sagas'
import trackPageSagas from 'common/store/pages/track/sagas'
import playbackEngineSagas from 'common/store/playback/sagas'
import profileSagas from 'common/store/profile/sagas'
import savedCollectionsSagas from 'common/store/saved-collections/sagas'
import socialSagas from 'common/store/social/sagas'
import firstUploadModalSagas from 'components/first-upload-modal/store/sagas'
import passwordResetSagas from 'components/password-reset/store/sagas'
import settingsSagas from 'pages/settings-page/store/sagas'
import accountSagas from 'store/account/sagas'
import webAnalyticsSagas from 'store/analytics/sagas'
import chatWebSagas from 'store/application/ui/chat/sagas'
import scrollLockSagas from 'store/application/ui/scrollLock/sagas'
import stemUploadSagas from 'store/application/ui/stemsUpload/sagas'
import userListModalSagas from 'store/application/ui/userListModal/sagas'
import errorSagas from 'store/errors/sagas'
import reachabilitySagas from 'store/reachability/sagas'
import reloadSagas from 'store/reload/sagas'
import routingSagas from 'store/routing/sagas'
import signOutSagas from 'store/sign-out/sagas'

export default function* rootSaga() {
  const sagas = ([] as (() => Generator<any, void, any>)[]).concat(
    // Config
    analyticsSagas(),
    webAnalyticsSagas(),
    backendSagas(),
    confirmerSagas(),

    reachabilitySagas(),
    routingSagas(),

    // Account
    accountSagas(),
    signOutSagas(),

    // Pages
    collectionSagas(),
    chatSagas(),
    passwordResetSagas(),
    profileSagas(),
    rewardsPageSagas(),
    settingsSagas(),
    signOnSaga(),
    socialSagas(),
    trackPageSagas(),

    modalsSagas(),
    niceModalBridgeSagas(),

    // Cache
    collectionsSagas(),
    savedCollectionsSagas(),

    // Playback
    playbackEngineSagas(),

    // Cast
    castSagas(),

    // Application
    addToCollectionSagas(),
    chatWebSagas(),
    deactivateAccountSagas(),
    deletePlaylistConfirmationModalSagas(),
    duplicateAddConfirmationModalSagas(),
    firstUploadModalSagas(),
    scrollLockSagas(),
    shareModalSagas(),
    stripeModalSagas(),
    overflowMenuSagas(),
    toastSagas(),

    stemUploadSagas(),
    userListModalSagas(),
    commonReachabilitySagas(),

    // Gated content
    gatedContentSagas(),
    buyUSDCSagas(),
    purchaseContentSagas(),
    withdrawUSDCSagas(),

    // Error
    errorSagas(),

    // Version refresh
    reloadSagas()
  )
  yield* all(sagas.map((saga) => spawn(sagaWithErrorHandler, saga)))
}

export function* testRootSaga() {
  const sagas = ([] as (() => Generator<any, void, any>)[]).concat(
    // Config
    backendSagas(),
    confirmerSagas(),
    routingSagas(),

    // Account
    // accountSagas(),
    // playlistUpdatesSagas(),
    // recoveryEmailSagas(),
    // signOutSagas(),

    // Pages
    // collectionSagas(),
    // chatSagas(),
    // historySagas(),
    // passwordResetSagas(),
    profileSagas(),
    // reactionSagas(),
    // rewardsPageSagas(),
    // savedSagas(),
    // searchResultsSagas(),
    // settingsSagas(),
    // signOnSaga(),
    // socialSagas(),
    // trackPageSagas(),
    // trendingPageSagas(),
    // trendingUndergroundSagas(),
    // uploadSagas(),
    // premiumTracksSagas(),

    modalsSagas(),

    // Cache
    collectionsSagas(),
    savedCollectionsSagas(),

    // Application
    // addToCollectionSagas(),
    // buyAudioSagas(),
    // chatWebSagas(),
    // deactivateAccountSagas(),
    // deletedSagas(),
    // deletePlaylistConfirmationModalSagas(),
    // duplicateAddConfirmationModalSagas(),
    // firstUploadModalSagas(),
    // remixesSagas(),
    // scrollLockSagas(),
    // shareModalSagas(),
    // stripeModalSagas(),
    // overflowMenuSagas(),
    // toastSagas(),

    // stemUploadSagas(),
    // userListModalSagas(),
    // commonReachabilitySagas(),

    // Remote config
    // remoteConfigSagas(),

    // Tipping
    // tippingSagas(),

    // Gated content
    // gatedContentSagas(),
    // buyUSDCSagas(),
    // purchaseContentSagas(),
    // withdrawUSDCSagas(),

    // Error
    errorSagas()

    // Version refresh
    // reloadSagas()
  )
  yield* all(sagas.map((saga) => spawn(sagaWithErrorHandler, saga)))
}
