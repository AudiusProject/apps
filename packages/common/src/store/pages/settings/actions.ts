import { Permission } from '~/utils/browserNotifications'

import {
  BrowserNotificationSetting,
  EmailFrequency,
  PushNotifications,
  PushNotificationSetting
} from './types'

export const TOGGLE_NOTIFICATION_SETTING =
  'SETTINGS_PAGE/TOGGLE_NOTIFICATION_SETTING'
export const TOGGLE_PUSH_NOTIFICATION_SETTING =
  'SETTINGS_PAGE/TOGGLE_PUSH_NOTIFICATION_SETTING'
export const TOGGLE_PUSH_NOTIFICATION_SETTING_FAILED =
  'SETTINGS_PAGE/TOGGLE_PUSH_NOTIFICATION_SETTING_FAILED'

export const REQUEST_PUSH_NOTIFICATION_PERMISSIONS =
  'SETTINGS_PAGE/REQUEST_PUSH_NOTIFICATION_PERMISSIONS'

export const UPDATE_EMAIL_FREQUENCY = 'SETTINGS_PAGE/UPDATE_EMAIL_FREQUENCY'

export const GET_NOTIFICATION_SETTINGS =
  'SETTINGS_PAGE/GET_NOTIFICATION_SETTINGS'
export const GET_NOTIFICATION_SETTINGS_FAILED =
  'SETTINGS_PAGE/GET_NOTIFICATION_SETTINGS_FAILED'
export const GET_PUSH_NOTIFICATION_SETTINGS =
  'SETTINGS_PAGE/GET_PUSH_NOTIFICATION_SETTINGS'
export const GET_PUSH_NOTIFICATION_SETTINGS_FAILED =
  'SETTINGS_PAGE/GET_PUSH_NOTIFICATION_SETTINGS_FAILED'

export const SET_NOTIFICATION_SETTINGS =
  'SETTINGS_PAGE/SET_NOTIFICATION_SETTINGS'
export const SET_PUSH_NOTIFICATION_SETTINGS =
  'SETTINGS_PAGE/SET_PUSH_NOTIFICATION_SETTINGS'

export const SET_BROWSER_NOTIFICATION_PERMISSION =
  'SETTINGS/SET_BROWSER_NOTIFICATION_PERMISSION'
export const SET_BROWSER_NOTIFICATION_ENABLED =
  'SETTINGS/SET_BROWSER_NOTIFICATION_ENABLED'
export const SET_BROWSER_NOTIFICATION_SETTINGS_ON =
  'SETTINGS/SET_BROWSER_NOTIFICATION_SETTINGS_ON'
export const SET_BROWSER_NOTIFICATION_SETTINGS_OFF =
  'SETTINGS/SET_BROWSER_NOTIFICATION_SETTINGS_OFF'

export const BROWSER_PUSH_NOTIFICATION_FAILED =
  'SETTINGS/BROWSER_PUSH_NOTIFICATION_FAILED'

export function getNotificationSettings() {
  return { type: GET_NOTIFICATION_SETTINGS }
}

export function getNotificationSettingsFailed(error: string) {
  return { type: GET_NOTIFICATION_SETTINGS_FAILED, error }
}

export function getPushNotificationSettings() {
  return { type: GET_PUSH_NOTIFICATION_SETTINGS }
}

export function getPushNotificationSettingsFailed(error: string) {
  return { type: GET_PUSH_NOTIFICATION_SETTINGS_FAILED, error }
}

export function setNotificationSettings(settings: Record<string, any>) {
  return { type: SET_NOTIFICATION_SETTINGS, settings }
}

export function setPushNotificationSettings(settings: PushNotifications) {
  return { type: SET_PUSH_NOTIFICATION_SETTINGS, settings }
}

export function toggleNotificationSetting(
  notificationType: BrowserNotificationSetting,
  isOn?: boolean
) {
  return { type: TOGGLE_NOTIFICATION_SETTING, notificationType, isOn }
}

export function togglePushNotificationSetting(
  notificationType: PushNotificationSetting,
  isOn?: boolean
) {
  return { type: TOGGLE_PUSH_NOTIFICATION_SETTING, notificationType, isOn }
}

export function togglePushNotificationSettingFailed(
  notificationType: PushNotificationSetting,
  isOn?: boolean
) {
  return {
    type: TOGGLE_PUSH_NOTIFICATION_SETTING_FAILED,
    notificationType,
    isOn
  }
}

export function requestPushNotificationPermissions() {
  return {
    type: REQUEST_PUSH_NOTIFICATION_PERMISSIONS
  }
}

export function updateEmailFrequency(
  frequency: EmailFrequency,
  updateServer = true
) {
  return { type: UPDATE_EMAIL_FREQUENCY, frequency, updateServer }
}

export function setBrowserNotificationPermission(permission: Permission) {
  return { type: SET_BROWSER_NOTIFICATION_PERMISSION, permission }
}

export function setBrowserNotificationEnabled(
  enabled: boolean,
  updateServer = true
) {
  return { type: SET_BROWSER_NOTIFICATION_ENABLED, enabled, updateServer }
}

export function setBrowserNotificationSettingsOn() {
  return { type: SET_BROWSER_NOTIFICATION_SETTINGS_ON }
}

export function setBrowserNotificationSettingsOff() {
  return { type: SET_BROWSER_NOTIFICATION_SETTINGS_OFF }
}

export function browserPushNotificationFailed(error: string) {
  return { type: BROWSER_PUSH_NOTIFICATION_FAILED, error }
}

export type ToggleNotificationSetting = ReturnType<
  typeof toggleNotificationSetting
>
export type TogglePushNotificationSetting = ReturnType<
  typeof togglePushNotificationSetting
>
export type TogglePushNotificationSettingFailed = ReturnType<
  typeof togglePushNotificationSettingFailed
>

export type RequestPushNotificationPermissions = ReturnType<
  typeof requestPushNotificationPermissions
>

export type UpdateEmailFrequency = ReturnType<typeof updateEmailFrequency>

export type GetNotificationSettings = ReturnType<typeof getNotificationSettings>
export type GetNotificationSettingsFailed = ReturnType<
  typeof getNotificationSettingsFailed
>
export type SetNotificationSettings = ReturnType<typeof setNotificationSettings>
export type GetPushNotificationSettings = ReturnType<
  typeof getPushNotificationSettings
>
export type GetPushNotificationSettingsFailed = ReturnType<
  typeof getPushNotificationSettingsFailed
>
export type SetPushNotificationSettings = ReturnType<
  typeof setPushNotificationSettings
>

export type SetBrowserNotificationPermission = ReturnType<
  typeof setBrowserNotificationPermission
>
export type SetBrowserNotificationEnabled = ReturnType<
  typeof setBrowserNotificationEnabled
>
export type SetBrowserNotificationSettingsOn = ReturnType<
  typeof setBrowserNotificationSettingsOn
>
export type SetBrowserNotificationSettingsOff = ReturnType<
  typeof setBrowserNotificationSettingsOff
>
export type BrowserPushNotificationFailed = ReturnType<
  typeof browserPushNotificationFailed
>

export type SettingActions =
  | RequestPushNotificationPermissions
  | ToggleNotificationSetting
  | TogglePushNotificationSetting
  | TogglePushNotificationSettingFailed
  | UpdateEmailFrequency
  | GetNotificationSettings
  | GetNotificationSettingsFailed
  | GetPushNotificationSettings
  | GetPushNotificationSettingsFailed
  | SetNotificationSettings
  | SetPushNotificationSettings
  | SetBrowserNotificationPermission
  | SetBrowserNotificationEnabled
  | SetBrowserNotificationSettingsOn
  | SetBrowserNotificationSettingsOff
  | BrowserPushNotificationFailed
