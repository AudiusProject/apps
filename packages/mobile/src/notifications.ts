import { getCurrentAccountQueryKey } from '@audius/common/api'
import { MobileOS } from '@audius/common/models'
import type { AccountState } from '@audius/common/store'
import notifee, { EventType } from '@notifee/react-native'
import type { Event as NotifeeEvent } from '@notifee/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getAPNSToken,
  getInitialNotification,
  getMessaging,
  getToken as getFcmToken,
  isDeviceRegisteredForRemoteMessages,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission
} from '@react-native-firebase/messaging'
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
  payload: Record<string, any> | undefined
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

// A tapped push, normalized across platforms. `payload` matches what
// react-native-notifications used to hand us: the APNs userInfo minus `aps` on
// iOS, the FCM data map on Android.
type OpenedNotification = {
  title?: string
  body?: string
  payload: Record<string, any>
}

const fromRemoteMessage = (
  message: FirebaseMessagingTypes.RemoteMessage
): OpenedNotification => ({
  title: message.notification?.title,
  body: message.notification?.body,
  payload: message.data ?? {}
})

// Our iOS pushes go straight to APNs through SNS, not through FCM, so
// @react-native-firebase/messaging ignores taps on them. Notifee reports them
// as PRESS events instead (AppDelegate makes sure it sees them).
const fromNotifeeEvent = ({
  type,
  detail
}: NotifeeEvent): OpenedNotification | null => {
  if (type !== EventType.PRESS || !detail.notification) return null
  return {
    title: detail.notification.title,
    body: detail.notification.body,
    payload: (detail.notification.data ?? {}) as Record<string, any>
  }
}

// Singleton class
class PushNotifications {
  token: Token | null
  navigation: NotificationNavigation | null
  // A tap that arrived before navigation was ready (cold start)
  private pendingOpen: OpenedNotification | null
  private isNavigationReady: boolean

  constructor() {
    this.token = null
    this.navigation = null
    this.pendingOpen = null
    this.isNavigationReady = false
    this.configure()
  }

  setNavigation = (navigation: NotificationNavigation) => {
    this.navigation = navigation
  }

  private handleOpened = (notification: OpenedNotification | null) => {
    if (!notification) return
    if (!this.isNavigationReady) {
      this.pendingOpen = notification
      return
    }
    this.onNotification(notification)
  }

  onNotification = (notification: OpenedNotification) => {
    console.info(`Received notification ${JSON.stringify(notification)}`)
    const { title, body, payload } = notification
    const notificationCampaignId =
      extractNotificationCampaignIdFromPayload(payload)
    let data = payload?.data?.data ?? payload?.data ?? payload
    // On Android, FCM delivers all data values as strings, breaking
    // numeric ID fields and nested objects. Parse them back.
    if (Platform.OS === MobileOS.ANDROID && data && typeof data === 'object') {
      data = parseAndroidNotificationData(data)
    }
    track(
      make({
        eventName: EventNames.NOTIFICATIONS_OPEN_PUSH_NOTIFICATION,
        title,
        body,
        notificationCampaignId,
        type: typeof data?.type === 'string' ? data.type : undefined,
        id: data?.id != null ? `${data.id}` : undefined
      })
    )
    if (notificationCampaignId) {
      Promise.resolve(
        reportNotificationCampaignPushOpen(notificationCampaignId)
      ).catch(() => {})
    }
    this.navigation?.navigate(data)
  }

  // Called once navigation is ready. Opens the push the user tapped to launch
  // the app, if any.
  openInitialNotification = async () => {
    this.isNavigationReady = true
    if (Platform.OS === MobileOS.ANDROID) {
      const message = await getInitialNotification(getMessaging())
      if (message) {
        this.pendingOpen = fromRemoteMessage(message)
      }
    }
    const notification = this.pendingOpen
    this.pendingOpen = null
    if (notification) {
      this.onNotification(notification)
    }
  }

  private async persistToken(deviceToken: string) {
    const token = { token: deviceToken, os: Platform.OS }
    this.token = token
    await AsyncStorage.setItem(DEVICE_TOKEN, JSON.stringify(token))
    return token
  }

  // identity-service registers iOS tokens with an SNS APNs platform app, so iOS
  // must send the raw APNs token, not an FCM token. Lowercase hex matches what
  // react-native-notifications sent, so existing rows and endpoints are reused.
  private async fetchDeviceToken() {
    if (Platform.OS === MobileOS.IOS) {
      const messaging = getMessaging()
      if (!isDeviceRegisteredForRemoteMessages(messaging)) {
        await registerDeviceForRemoteMessages(messaging)
      }
      const apnsToken = await getAPNSToken(messaging)
      return apnsToken ? apnsToken.toLowerCase() : null
    }
    return await getFcmToken(getMessaging())
  }

  deregister() {
    AsyncStorage.removeItem(DEVICE_TOKEN)
  }

  async configure() {
    if (Platform.OS === MobileOS.IOS) {
      notifee.onForegroundEvent((event) =>
        this.handleOpened(fromNotifeeEvent(event))
      )
      notifee.onBackgroundEvent(async (event) =>
        this.handleOpened(fromNotifeeEvent(event))
      )
    } else {
      const messaging = getMessaging()
      onNotificationOpenedApp(messaging, (message) =>
        this.handleOpened(fromRemoteMessage(message))
      )
      onTokenRefresh(messaging, (token) => {
        this.persistToken(token).catch(() => {})
      })
    }

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

  async requestPermission() {
    if (Platform.OS === MobileOS.ANDROID) {
      // Android 13+ needs POST_NOTIFICATIONS. Use requestNotifications — PERMISSIONS.ANDROID
      // does not expose POST_NOTIFICATIONS in react-native-permissions v5, so request(undefined) crashed native code.
      await requestNotifications()
    } else {
      await requestPermission(getMessaging())
    }
  }

  setBadgeCount(count: number) {
    if (Platform.OS === MobileOS.IOS) {
      notifee.setBadgeCount(count)
    }
  }

  async getToken() {
    try {
      const deviceToken = await this.fetchDeviceToken()
      if (deviceToken) {
        return await this.persistToken(deviceToken)
      }
    } catch (e) {
      console.error('Failed to fetch push token', e)
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
