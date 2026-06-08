import { queryAccountUser, selectIsGuestAccount } from '@audius/common/api'
import {
  accountActions,
  accountSagas as commonAccountSagas,
  settingsPageActions,
  modalsActions,
  getSDK
} from '@audius/common/store'
import { call, delay, getContext, put, takeEvery } from 'typed-redux-saga'

import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'
import {
  Permission,
  isPushManagerAvailable,
  isSafariPushAvailable,
  getPushManagerPermission,
  getPushManagerBrowserSubscription,
  getSafariPushBrowser,
  subscribePushManagerBrowser,
  setHasRequestedBrowserPermission,
  shouldRequestBrowserPermission,
  removeHasRequestedBrowserPermission
} from 'utils/browserNotifications'
import { isElectron } from 'utils/clientUtil'

const { setVisibility } = modalsActions
const {
  setBrowserNotificationPermission,
  setBrowserNotificationEnabled,
  setBrowserNotificationSettingsOn
} = settingsPageActions
const PASSWORD_RESET_REQUIRED_KEY = 'password-reset-required'

const setBrowerPushPermissionConfirmationModal = setVisibility({
  modal: 'BrowserPushPermissionConfirmation',
  visible: true
})

const hasPendingPasswordReset = () => {
  if (typeof window === 'undefined') return false
  return Boolean(window.localStorage.getItem(PASSWORD_RESET_REQUIRED_KEY))
}

/**
 * Determine if the push notification modal should appear
 */
function* showPushNotificationConfirmation() {
  while (hasPendingPasswordReset()) {
    yield* delay(500)
  }

  const isMobile = yield* getContext('isMobile')
  const accountUser = yield* queryAccountUser()
  const hasAccount = Boolean(accountUser?.handle && accountUser?.name)
  const isGuest = yield* call(selectIsGuestAccount, accountUser)

  if (isMobile || isElectron() || !shouldRequestBrowserPermission() || isGuest)
    return
  setHasRequestedBrowserPermission()
  if (!hasAccount) return
  const sdk = yield* getSDK()
  const browserPermission = yield* call(fetchBrowserPushNotificationStatus)
  if (browserPermission === Permission.DEFAULT) {
    yield* put(setBrowerPushPermissionConfirmationModal)
  } else if (browserPermission === Permission.GRANTED) {
    if (isPushManagerAvailable) {
      const subscription = yield* call(getPushManagerBrowserSubscription)
      const enabled = yield* call(
        audiusBackendInstance.getBrowserPushSubscription,
        { sdk, pushEndpoint: subscription.endpoint }
      )
      if (!enabled) {
        yield* put(setBrowerPushPermissionConfirmationModal)
      }
    } else if (isSafariPushAvailable) {
      try {
        const safariPushBrowser = yield* call(getSafariPushBrowser)
        const enabled = yield* call(
          audiusBackendInstance.getBrowserPushSubscription,
          { sdk, pushEndpoint: safariPushBrowser.deviceToken }
        )
        if (!enabled) {
          yield* put(setBrowerPushPermissionConfirmationModal)
        }
      } catch (err) {
        console.error(err)
      }
    }
  }
}

function* fetchBrowserPushNotificationStatus() {
  const isMobile = yield* getContext('isMobile')
  if (isElectron() || isMobile) return
  if (isPushManagerAvailable) {
    const permission = yield* call(getPushManagerPermission)
    return permission
  } else if (isSafariPushAvailable) {
    const safariSubscription = yield* call(getSafariPushBrowser)
    return safariSubscription.permission
  }
}

function* subscribeBrowserPushNotifications() {
  const sdk = yield* getSDK()
  if (isPushManagerAvailable) {
    const pushManagerSubscription = yield* call(
      getPushManagerBrowserSubscription
    )
    if (pushManagerSubscription) {
      yield* put(setBrowserNotificationPermission(Permission.GRANTED))
      yield* put(setBrowserNotificationEnabled(true, false))
      yield call(audiusBackendInstance.updateBrowserNotifications, {
        sdk,
        subscription: pushManagerSubscription,
        enabled: true
      })
      yield* put(setBrowserNotificationSettingsOn())
    } else if (
      window.Notification &&
      window.Notification.permission !== Permission.DENIED
    ) {
      const subscription = yield* call(subscribePushManagerBrowser)
      const enabled = !!subscription
      if (enabled) {
        yield* put(setBrowserNotificationPermission(Permission.GRANTED))
        yield* put(setBrowserNotificationEnabled(true, false))
        yield* call(audiusBackendInstance.updateBrowserNotifications, {
          sdk,
          subscription,
          enabled: true
        })
      } else {
        yield* put(setBrowserNotificationPermission(Permission.DENIED))
      }
    }
  }
  // Note: you cannot request safari permission from saga
  // it must be initiated from a user action (in the component)
  if (isSafariPushAvailable) {
    const safariSubscription = yield* call(getSafariPushBrowser)
    if (safariSubscription.permission === Permission.GRANTED) {
      yield* call(audiusBackendInstance.registerDeviceToken, {
        sdk,
        deviceToken: safariSubscription.deviceToken,
        deviceType: 'safari'
      })
      yield* put(setBrowserNotificationEnabled(true, false))
      yield* put(setBrowserNotificationSettingsOn())
    }
  }
}

function* unsubscribeBrowserPushNotifications() {
  const sdk = yield* getSDK()
  removeHasRequestedBrowserPermission()
  const browserPushSubscriptionStatus = yield* call(
    fetchBrowserPushNotificationStatus
  )
  if (
    browserPushSubscriptionStatus === Permission.GRANTED &&
    isPushManagerAvailable
  ) {
    const subscription = yield* call(getPushManagerBrowserSubscription)
    yield* call(audiusBackendInstance.disableBrowserNotifications, {
      sdk,
      subscription
    })
  } else if (
    browserPushSubscriptionStatus === Permission.GRANTED &&
    isSafariPushAvailable
  ) {
    const safariSubscription = yield* call(getSafariPushBrowser)
    if (safariSubscription.permission === Permission.GRANTED) {
      yield* call(audiusBackendInstance.deregisterDeviceToken, {
        sdk,
        deviceToken: safariSubscription.deviceToken
      })
    }
  }
}

function* getBrowserPushNotifications() {
  yield* takeEvery(
    accountActions.fetchBrowserPushNotifications.type,
    fetchBrowserPushNotificationStatus
  )
}

function* watchShowPushNotificationConfirmation() {
  yield* takeEvery(
    accountActions.showPushNotificationConfirmation.type,
    showPushNotificationConfirmation
  )
}

function* subscribeBrowserPushNotification() {
  yield* takeEvery(
    accountActions.subscribeBrowserPushNotifications.type,
    subscribeBrowserPushNotifications
  )
}

function* unsubscribeBrowserPushNotification() {
  yield* takeEvery(
    accountActions.unsubscribeBrowserPushNotifications.type,
    unsubscribeBrowserPushNotifications
  )
}

export default function sagas() {
  return [
    ...commonAccountSagas(),
    watchShowPushNotificationConfirmation,
    getBrowserPushNotifications,
    subscribeBrowserPushNotification,
    unsubscribeBrowserPushNotification
  ]
}
