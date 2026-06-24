import { getCurrentAccountQueryKey } from '@audius/common/api'
import { MobileOS } from '@audius/common/models'
import type { AccountState } from '@audius/common/store'
import notifee from '@notifee/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import messaging from '@react-native-firebase/messaging'
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging'
import { Platform } from 'react-native'
import { requestNotifications } from 'react-native-permissions'

import { track, make } from 'app/services/analytics'
import { audiusBackendInstance } from 'app/services/audius-backend-instance'
import { queryClient } from 'app/services/query-client'
import { audiusSdk } from 'app/services/sdk/audius-sdk'
import { EventNames } from 'app/types/analytics'

import { DEVICE_TOKEN } from './constants/storage-keys'

/**
 * Firebase Cloud Messaging delivers every `data` payload value as a string on
 * both platforms. This means numeric IDs like `initiator` and `entityId`
 * arrive as "123" instead of 123, and nested objects/arrays arrive as
 * stringified JSON. This function restores the original types so notification
 * handlers can navigate correctly.
 */
function parseNotificationData(data: Record<string, any>): any {
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

function extractNotificationCampaignId(
  data: Record<string, any> | undefined
): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  // The navigation payload may live at the top level of `data` or nested under
  // a `data` key, so check both.
  const candidates = [data, (data as Record<string, unknown>).data].filter(
    (d) => d && typeof d === 'object'
  ) as Record<string, unknown>[]
  for (const o of candidates) {
    const v = o.notification_campaign_id ?? o.notificationCampaignId
    if (typeof v === 'string' && v.length > 0) return v
  }
  return undefined
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

// Singleton class
class PushNotifications {
  lastId: number
  token: Token | null
  navigation: NotificationNavigation | null
  private unsubscribeOpened: (() => void) | null = null
  private unsubscribeTokenRefresh: (() => void) | null = null

  constructor() {
    this.lastId = 0
    this.token = null
    this.navigation = null
    this.configure()
  }

  setNavigation = (navigation: NotificationNavigation) => {
    this.navigation = navigation
  }

  // Called when the user taps a remote push notification (firebase RemoteMessage)
  onNotificationOpened = (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ) => {
    console.info(`Received notification ${JSON.stringify(remoteMessage)}`)
    const title = remoteMessage.notification?.title
    const body = remoteMessage.notification?.body
    // FCM delivers all `data` values as strings on both platforms, breaking
    // numeric ID fields and nested objects. Parse them back to native types.
    const data = parseNotificationData(remoteMessage.data ?? {})
    const notificationCampaignId = extractNotificationCampaignId(data)
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
    // The navigation payload may be nested under a `data` key
    const navigationData = data?.data ?? data
    this.navigation?.navigate(navigationData)
  }

  // Method used to open the push notification that the user pressed while the app was closed
  openInitialNotification = async () => {
    const remoteMessage = await messaging().getInitialNotification()
    if (remoteMessage) {
      this.onNotificationOpened(remoteMessage)
    }
  }

  private persistToken = async (fcmToken: string) => {
    const token = { token: fcmToken, os: Platform.OS }
    this.token = token
    await AsyncStorage.setItem(DEVICE_TOKEN, JSON.stringify(token))
    return token
  }

  async deregister() {
    await AsyncStorage.removeItem(DEVICE_TOKEN)
    this.token = null
    try {
      await messaging().deleteToken()
    } catch (e) {
      console.error('Failed to delete FCM token', e)
    }
  }

  async configure() {
    // Handle notification taps that bring the app from background to foreground
    this.unsubscribeOpened = messaging().onNotificationOpenedApp(
      (remoteMessage) => {
        if (remoteMessage) {
          this.onNotificationOpened(remoteMessage)
        }
      }
    )

    // Keep the persisted token in sync when FCM rotates it
    this.unsubscribeTokenRefresh = messaging().onTokenRefresh((fcmToken) => {
      this.persistToken(fcmToken).catch((e) =>
        console.error('Failed to persist refreshed FCM token', e)
      )
    })

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
    const status = await messaging().hasPermission()
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    )
  }

  async requestPermission() {
    if (Platform.OS === MobileOS.ANDROID) {
      // Android 13+ needs POST_NOTIFICATIONS. Use requestNotifications — PERMISSIONS.ANDROID
      // does not expose POST_NOTIFICATIONS in react-native-permissions v5, so request(undefined) crashed native code.
      await requestNotifications()
    }

    await messaging().requestPermission()
  }

  async cancelNotif() {
    await notifee.cancelNotification(String(this.lastId))
  }

  async cancelAll() {
    await notifee.cancelAllNotifications()
  }

  setBadgeCount(count: number) {
    notifee.setBadgeCount(count)
  }

  async getToken() {
    try {
      const fcmToken = await messaging().getToken()
      return await this.persistToken(fcmToken)
    } catch (e) {
      console.error('Failed to fetch FCM token', e)
      // Fall back to a previously persisted token, if any
      const token = await AsyncStorage.getItem(DEVICE_TOKEN)
      if (token) {
        return JSON.parse(token)
      }
      return {}
    }
  }
}

const notifications = new PushNotifications()

export default notifications
