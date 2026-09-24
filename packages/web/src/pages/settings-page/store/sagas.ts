import { queryHasAccount } from '@audius/common/api'
import {
  settingsPageSelectors,
  settingsPageActions as actions,
  BrowserNotificationSetting,
  getContext,
  getSDK
} from '@audius/common/store'
import { getErrorMessage } from '@audius/common/utils'
import { select, call, put, takeEvery } from 'typed-redux-saga'

import commonSettingsSagas from 'common/store/pages/settings/sagas'
import {
  Permission,
  isPushManagerAvailable,
  isSafariPushAvailable,
  isBrowserPushAvailable,
  getPushManagerPermission,
  getPushManagerBrowserSubscription,
  getSafariPushBrowser
} from 'utils/browserNotifications'
import { isElectron } from 'utils/clientUtil'

const { getBrowserNotificationSettings } = settingsPageSelectors

function* watchGetSettings() {
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  yield* takeEvery(actions.GET_NOTIFICATION_SETTINGS, function* () {
    try {
      const hasAccount = yield* call(queryHasAccount)

      if (!isBrowserPushAvailable || !hasAccount) return

      const sdk = yield* getSDK()
      const settings = yield* call(
        audiusBackendInstance.getBrowserPushNotificationSettings,
        { sdk }
      )
      // If settings exist, set them in the store, else leave it at the defaults.
      if (settings) yield* put(actions.setNotificationSettings(settings))
      if (!isElectron()) {
        if (isPushManagerAvailable) {
          const permission = yield* call(getPushManagerPermission)
          if (permission) {
            yield* put(actions.setBrowserNotificationPermission(permission))
            if (permission === Permission.GRANTED) {
              const subscription = yield* call(
                getPushManagerBrowserSubscription
              )
              const enabled = yield* call(
                audiusBackendInstance.getBrowserPushSubscription,
                { sdk, pushEndpoint: subscription.endpoint }
              )
              yield* put(actions.setBrowserNotificationEnabled(enabled, false))
            }
          }
        } else if (isSafariPushAvailable) {
          const permissionData = yield* call(getSafariPushBrowser)
          yield* put(
            actions.setBrowserNotificationPermission(permissionData.permission)
          )
          if (permissionData.permission === Permission.GRANTED) {
            const enabled = yield* call(
              audiusBackendInstance.getSafariBrowserPushEnabled,
              { sdk, deviceToken: permissionData.deviceToken }
            )
            yield* put(actions.setBrowserNotificationEnabled(enabled, false))
          }
        }
      }
    } catch (error) {
      yield* put(actions.getNotificationSettingsFailed(getErrorMessage(error)))
    }
  })
}

function* watchToogleBrowserPushNotification() {
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const sdk = yield* getSDK()
  yield* takeEvery(
    actions.SET_BROWSER_NOTIFICATION_ENABLED,
    function* (action: actions.SetBrowserNotificationEnabled) {
      try {
        const hasAccount = yield* call(queryHasAccount)
        if (!hasAccount) return

        if (isPushManagerAvailable) {
          const subscription = yield* call(getPushManagerBrowserSubscription)
          if (subscription) {
            if (action.updateServer) {
              yield* call(audiusBackendInstance.updateBrowserNotifications, {
                sdk,
                enabled: action.enabled,
                subscription
              })
            }
          }
        } else if (isSafariPushAvailable) {
          const pushPermission = getSafariPushBrowser()
          if (
            action.enabled &&
            pushPermission.permission === Permission.GRANTED
          ) {
            if (action.updateServer) {
              yield* call(audiusBackendInstance.registerDeviceToken, {
                sdk,
                deviceToken: pushPermission.deviceToken,
                deviceType: 'safari'
              })
            }
          } else if (
            !action.enabled &&
            pushPermission.permission === Permission.GRANTED
          ) {
            if (action.updateServer) {
              yield* call(audiusBackendInstance.deregisterDeviceToken, {
                sdk,
                deviceToken: pushPermission.deviceToken
              })
            }
          }
        }
      } catch (error) {
        yield* put(
          actions.browserPushNotificationFailed(getErrorMessage(error))
        )
      }
    }
  )
}

function* watchSetBrowserNotificationSettingsOn() {
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const sdk = yield* getSDK()
  yield* takeEvery(
    actions.SET_BROWSER_NOTIFICATION_SETTINGS_ON,
    function* (action: actions.SetBrowserNotificationSettingsOn) {
      try {
        const updatedSettings = {
          [BrowserNotificationSetting.MilestonesAndAchievements]: true,
          [BrowserNotificationSetting.Followers]: true,
          [BrowserNotificationSetting.Reposts]: true,
          [BrowserNotificationSetting.Favorites]: true,
          [BrowserNotificationSetting.Remixes]: true,
          [BrowserNotificationSetting.Messages]: true,
          [BrowserNotificationSetting.Comments]: true,
          [BrowserNotificationSetting.Mentions]: true,
          [BrowserNotificationSetting.Reactions]: true
        }
        yield* put(actions.setNotificationSettings(updatedSettings))
        yield* call(audiusBackendInstance.updateNotificationSettings, {
          sdk,
          settings: updatedSettings
        })
      } catch (error) {
        yield* put(
          actions.browserPushNotificationFailed(getErrorMessage(error))
        )
      }
    }
  )
}

function* watchSetBrowserNotificationSettingsOff() {
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const sdk = yield* getSDK()
  yield* takeEvery(
    actions.SET_BROWSER_NOTIFICATION_SETTINGS_OFF,
    function* (action: actions.SetBrowserNotificationSettingsOff) {
      try {
        const updatedSettings = {
          [BrowserNotificationSetting.MilestonesAndAchievements]: false,
          [BrowserNotificationSetting.Followers]: false,
          [BrowserNotificationSetting.Reposts]: false,
          [BrowserNotificationSetting.Favorites]: false,
          [BrowserNotificationSetting.Remixes]: false,
          [BrowserNotificationSetting.Messages]: false,
          [BrowserNotificationSetting.Comments]: false,
          [BrowserNotificationSetting.Mentions]: false,
          [BrowserNotificationSetting.Reactions]: false
        }
        yield* put(actions.setNotificationSettings(updatedSettings))
        yield* call(audiusBackendInstance.updateNotificationSettings, {
          sdk,
          settings: updatedSettings
        })
      } catch (error) {
        yield* put(
          actions.browserPushNotificationFailed(getErrorMessage(error))
        )
      }
    }
  )
}

function* watchUpdateNotificationSettings() {
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const sdk = yield* getSDK()
  yield* takeEvery(
    actions.TOGGLE_NOTIFICATION_SETTING,
    function* (action: actions.ToggleNotificationSetting) {
      try {
        const hasAccount = yield* call(queryHasAccount)
        if (!hasAccount) return

        let isOn: boolean | null | undefined | Permission = action.isOn
        if (isOn === undefined) {
          const notificationSettings = yield* select(
            getBrowserNotificationSettings
          )
          isOn = notificationSettings[action.notificationType]
        }
        yield* call(audiusBackendInstance.updateNotificationSettings, {
          sdk,
          settings: { [action.notificationType]: isOn }
        })
      } catch (error) {
        console.error(error)
        yield* put(
          actions.browserPushNotificationFailed(getErrorMessage(error))
        )
      }
    }
  )
}

export default function sagas() {
  return [
    ...commonSettingsSagas(),
    watchGetSettings,
    watchSetBrowserNotificationSettingsOn,
    watchSetBrowserNotificationSettingsOff,
    watchToogleBrowserPushNotification,
    watchUpdateNotificationSettings
  ]
}
