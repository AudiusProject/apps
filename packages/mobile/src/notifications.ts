import { getCurrentAccountQueryKey } from '@audius/common/api'
import { MobileOS } from '@audius/common/models'
import type { AccountState } from '@audius/common/store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { Notifications } from 'react-native-notifications'
import type { Registered, Notification } from 'react-native-notifications'
import { requestNotifications } from 'react-native-permissions'

import { track, make } from 'app/services/analytics'
import { audiusBackendInstance } from 'app/services/audius-backend-instance'
import { queryClient } from 'app/services/query-client'
import { audiusSdk } from 'app/services/sdk/audius-sdk'
import { EventNames } from 'app/types/analytics'

import { DEVICE_TOKEN } from './constants/storage-keys'

/**
 * On Android, FCM delivers all `data` payload values as strings.
 * This means numeric IDs like `initiator` and `entityId` arrive as "123"
 * instead of 123, and nested objects/arrays arrive as stringified JSON.
 * This function restores the original types so notification handlers
 * can navigate correctly.
 */
function parseAndroidNotificationData(data: Record<string, any>): any {
  const parsed: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'string') {
      parsed[key] = value
      continue
    }
    // Try parsing stringified JSON (for nested objects/arrays like actions, metadata)
    if (
      (value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))
    ) {
      try {
        parsed[key] = JSON.parse(value)
        continue
      } catch {
        // Not valid JSON, keep as string
      }
    }
    // Convert pure numeric strings to numbers (for IDs like initiator, entityId)
    if (/^\d+$/.test(value)) {
      parsed[key] = Number(value)
      continue
    }
    parsed[key] = value
  }
  return parsed
}

function extractNotificationCampaignIdFromPayload(
  payload: Notification['payload']
): string | undefined {
  const target = payload?.data?.data ?? payload?.data ?? payload ?? undefined
  if (!target || typeof target !== 'object') return undefined
  const o = target as Record<string, unknown>
  const v = o.notification_campaign_id ?? o.notificationCampaignId
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

type Token = {
  token: string
  os: string
}

type NotificationNavigation = { navigate: (notification: any) => void }

/** First-party Discovery campaign open — mobile remote push opens only. */
async function reportNotificationCampaignPushOpen(
  campaignId: string
): Promise<void> {
  const account = queryClient.getQueryData(getCurrentAccountQueryKey()) as
    | AccountState
    | undefined
  const userId = account?.userId
  if (userId == null) {
    return
  }
  const sdk = await audiusSdk()
  await audiusBackendInstance.reportNotificationCampaignPushOpen({
    sdk,
    userId,
    campaignId
  })
}

// Set to true while the push notification service is registering with the os
let isRegistering = false

// Singleton class
class PushNotifications {
  lastId: number
  token: Token | null
  navigation: NotificationNavigation | null

  // onNotification is a function passed in that is to be called when a
  // notification is to be emitted.
  constructor() {
    this.configure()
    this.lastId = 0
    this.token = null
    this.navigation = null
  }

  setNavigation = (navigation: NotificationNavigation) => {
    this.navigation = navigation
  }

  onNotification = (notification: Notification) => {
    console.info(`Received notification ${JSON.stringify(notification)}`)
    const { title, body, payload } = notification
    const notificationCampaignId =
      extractNotificationCampaignIdFromPayload(payload)
    track(
      make({
        eventName: EventNames.NOTIFICATIONS_OPEN_PUSH_NOTIFICATION,
        title,
        body,
        notificationCampaignId
      })
    )
    if (notificationCampaignId) {
      Promise.resolve(
        reportNotificationCampaignPushOpen(notificationCampaignId)
      ).catch(() => {})
    }
    let data = payload?.data?.data ?? payload?.data ?? payload
    // On Android, FCM delivers all data values as strings, breaking
    // numeric ID fields and nested objects. Parse them back.
    if (Platform.OS === MobileOS.ANDROID && data && typeof data === 'object') {
      data = parseAndroidNotificationData(data)
    }
    this.navigation?.navigate(data)
  }

  // Method used to open the push notification that the user pressed while the app was closed
  openInitialNotification = async () => {
    const notification = await Notifications.getInitialNotification()
    if (notification) {
      this.onNotification(notification)
    }
  }

  async onRegister(event: Registered) {
    const token = { token: event.deviceToken, os: Platform.OS }
    this.token = token
    await AsyncStorage.setItem(DEVICE_TOKEN, JSON.stringify(token))
    isRegistering = false
  }

  deregister() {
    AsyncStorage.removeItem(DEVICE_TOKEN)
  }

  async configure() {
    Notifications.events().registerRemoteNotificationsRegistered(
      this.onRegister
    )
    Notifications.events().registerNotificationOpened(this.onNotification)

    try {
      const token = await AsyncStorage.getItem(DEVICE_TOKEN)
      if (token) {
        this.token = JSON.parse(token)
      } else {
        console.info(`Device token not found`)
      }
    } catch (e) {
      console.error(`Device token read error`)
    }
  }

  async hasPermission(): Promise<boolean> {
    return await Notifications.isRegisteredForRemoteNotifications()
  }

  async requestPermission() {
    isRegistering = true

    if (Platform.OS === MobileOS.ANDROID) {
      // Android 13+ needs POST_NOTIFICATIONS. Use requestNotifications — PERMISSIONS.ANDROID
      // does not expose POST_NOTIFICATIONS in react-native-permissions v5, so request(undefined) crashed native code.
      await requestNotifications()
    }

    Notifications.registerRemoteNotifications()
  }

  cancelNotif() {
    Notifications.cancelLocalNotification(this.lastId)
  }

  cancelAll() {
    Notifications.ios.cancelAllLocalNotifications()
  }

  setBadgeCount(count: number) {
    Notifications.ios.setBadgeCount(count)
  }

  async getToken() {
    // Wait until the device token and OS are persisted to async storage
    // isRegistering modified as global
    // eslint-disable-next-line no-unmodified-loop-condition
    while (isRegistering) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    const token = await AsyncStorage.getItem(DEVICE_TOKEN)
    if (token) {
      return JSON.parse(token)
    }
    return {}
  }
}

const notifications = new PushNotifications()

export default notifications
