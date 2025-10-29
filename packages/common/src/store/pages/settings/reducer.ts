import { ActionsMap } from '~/utils/reducer'

import {
  ToggleNotificationSetting,
  TOGGLE_NOTIFICATION_SETTING,
  UPDATE_EMAIL_FREQUENCY,
  SET_NOTIFICATION_SETTINGS,
  SettingActions,
  SET_PUSH_NOTIFICATION_SETTINGS,
  TOGGLE_PUSH_NOTIFICATION_SETTING,
  TogglePushNotificationSetting,
  SET_BROWSER_NOTIFICATION_PERMISSION,
  SET_BROWSER_NOTIFICATION_ENABLED
} from './actions'
import {
  SettingsPageState,
  BrowserNotificationSetting,
  emailFrequency,
  EmailFrequency,
  PushNotificationSetting
} from './types'

export const initialState = {
  browserNotifications: {
    [BrowserNotificationSetting.Permission]: null,
    [BrowserNotificationSetting.BrowserPush]: false,
    [BrowserNotificationSetting.MilestonesAndAchievements]: true,
    [BrowserNotificationSetting.Followers]: true,
    [BrowserNotificationSetting.Reposts]: true,
    [BrowserNotificationSetting.Favorites]: true,
    [BrowserNotificationSetting.Remixes]: true,
    [BrowserNotificationSetting.Messages]: true,
    [BrowserNotificationSetting.Comments]: true,
    [BrowserNotificationSetting.Mentions]: true,
    [BrowserNotificationSetting.Reactions]: true
  },
  pushNotifications: {
    [PushNotificationSetting.MobilePush]: true,
    [PushNotificationSetting.MilestonesAndAchievements]: true,
    [PushNotificationSetting.Followers]: true,
    [PushNotificationSetting.Reposts]: true,
    [PushNotificationSetting.Remixes]: true,
    [PushNotificationSetting.Favorites]: true,
    [PushNotificationSetting.Messages]: true,
    [PushNotificationSetting.Comments]: true,
    [PushNotificationSetting.Mentions]: true,
    [PushNotificationSetting.Reactions]: true
  },
  [emailFrequency]: EmailFrequency.Daily
}

const actionsMap: ActionsMap<SettingsPageState> = {
  [SET_NOTIFICATION_SETTINGS](state, action) {
    if (!action.settings) return state
    return {
      ...state,
      browserNotifications: {
        ...state.browserNotifications,
        [BrowserNotificationSetting.MilestonesAndAchievements]:
          action.settings.milestonesAndAchievements,
        [BrowserNotificationSetting.Followers]: action.settings.followers,
        [BrowserNotificationSetting.Reposts]: action.settings.reposts,
        [BrowserNotificationSetting.Favorites]: action.settings.favorites,
        [BrowserNotificationSetting.Remixes]: action.settings.remixes,
        [BrowserNotificationSetting.Messages]: action.settings.messages,
        [BrowserNotificationSetting.Comments]: action.settings.comments,
        [BrowserNotificationSetting.Mentions]: action.settings.mentions
      }
    }
  },
  [SET_PUSH_NOTIFICATION_SETTINGS](state, action) {
    if (!action.settings) return state
    return {
      ...state,
      pushNotifications: {
        ...state.pushNotifications,
        [PushNotificationSetting.MobilePush]: action.settings.mobilePush,
        [PushNotificationSetting.MilestonesAndAchievements]:
          action.settings.milestonesAndAchievements,
        [PushNotificationSetting.Followers]: action.settings.followers,
        [PushNotificationSetting.Reposts]: action.settings.reposts,
        [PushNotificationSetting.Remixes]: action.settings.remixes,
        [PushNotificationSetting.Favorites]: action.settings.favorites,
        [PushNotificationSetting.Messages]: action.settings.messages,
        [PushNotificationSetting.Comments]: action.settings.comments,
        [PushNotificationSetting.Mentions]: action.settings.mentions
      }
    }
  },
  [SET_BROWSER_NOTIFICATION_PERMISSION](state, action) {
    return {
      ...state,
      browserNotifications: {
        ...state.browserNotifications,
        [BrowserNotificationSetting.Permission]: action.permission
      }
    }
  },
  [SET_BROWSER_NOTIFICATION_ENABLED](state, action) {
    return {
      ...state,
      browserNotifications: {
        ...state.browserNotifications,
        [BrowserNotificationSetting.BrowserPush]: action.enabled
      }
    }
  },
  [TOGGLE_NOTIFICATION_SETTING](
    state: SettingsPageState,
    action: ToggleNotificationSetting
  ) {
    // If the browser push notifications are turned off, don't allow toggle other settings
    if (!state.browserNotifications[BrowserNotificationSetting.BrowserPush])
      return state
    return {
      ...state,
      browserNotifications: {
        ...state.browserNotifications,
        [action.notificationType]:
          typeof action.isOn === 'boolean'
            ? action.isOn
            : !state.browserNotifications[action.notificationType]
      }
    }
  },
  [TOGGLE_PUSH_NOTIFICATION_SETTING](
    state: SettingsPageState,
    action: TogglePushNotificationSetting
  ) {
    return {
      ...state,
      pushNotifications: {
        ...state.pushNotifications,
        [action.notificationType]:
          typeof action.isOn === 'boolean'
            ? action.isOn
            : !state.pushNotifications[action.notificationType]
      }
    }
  },
  [UPDATE_EMAIL_FREQUENCY](state, action) {
    return {
      ...state,
      [emailFrequency]: action.frequency
    }
  }
}

export default function search(state = initialState, action: SettingActions) {
  const matchingReduceFunction = actionsMap[action.type]
  if (!matchingReduceFunction) return state
  return matchingReduceFunction(state, action)
}
