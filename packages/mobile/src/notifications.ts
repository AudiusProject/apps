import { MobileOS } from '@audius/common/models'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { Notifications } from 'react-native-notifications'
import type { Registered, Notification } from 'react-native-notifications'
import { PERMISSIONS, request } from 'react-native-permissions'

import { track, make } from 'app/services/analytics'
import { EventNames } from 'app/types/analytics'

import { DEVICE_TOKEN } from './constants/storage-keys'

type Token = {
  token: string
  os: string
}

type NotificationNavigation = { navigate: (notification: any) => void }

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
    track(
      make({
        eventName: EventNames.NOTIFICATIONS_OPEN_PUSH_NOTIFICATION,
        title,
        body
      })
    )
    this.navigation?.navigate(payload?.data?.data ?? payload?.data ?? payload)
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
      // For android, Notifications.registerRemoteNotifications is supposed to prompt user for permission but its currently not
      // @ts-expect-error POST_NOTIFICATIONS might not be in types for this version but exists at runtime for Android 13+
      await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS)
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
