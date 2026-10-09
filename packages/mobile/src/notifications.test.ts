const mockMessaging = {
  getAPNSToken: jest.fn(),
  getInitialNotification: jest.fn(),
  getToken: jest.fn(),
  isDeviceRegisteredForRemoteMessages: jest.fn(),
  onNotificationOpenedApp: jest.fn(),
  onTokenRefresh: jest.fn(),
  registerDeviceForRemoteMessages: jest.fn(),
  requestPermission: jest.fn()
}
const mockNotifee = {
  onForegroundEvent: jest.fn(),
  onBackgroundEvent: jest.fn(),
  setBadgeCount: jest.fn()
}
const mockStorage: Record<string, string> = {}

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: () => 'messaging',
  getAPNSToken: (...args: any[]) => mockMessaging.getAPNSToken(...args),
  getInitialNotification: (...args: any[]) =>
    mockMessaging.getInitialNotification(...args),
  getToken: (...args: any[]) => mockMessaging.getToken(...args),
  isDeviceRegisteredForRemoteMessages: (...args: any[]) =>
    mockMessaging.isDeviceRegisteredForRemoteMessages(...args),
  onNotificationOpenedApp: (...args: any[]) =>
    mockMessaging.onNotificationOpenedApp(...args),
  onTokenRefresh: (...args: any[]) => mockMessaging.onTokenRefresh(...args),
  registerDeviceForRemoteMessages: (...args: any[]) =>
    mockMessaging.registerDeviceForRemoteMessages(...args),
  requestPermission: (...args: any[]) =>
    mockMessaging.requestPermission(...args)
}))
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: mockNotifee,
  EventType: { PRESS: 1, DISMISSED: 0 }
}))
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (key: string) => mockStorage[key] ?? null,
  setItem: async (key: string, value: string) => {
    mockStorage[key] = value
  },
  removeItem: async (key: string) => {
    delete mockStorage[key]
  }
}))
jest.mock('react-native-permissions', () => ({
  requestNotifications: jest.fn()
}))
jest.mock('@audius/common/api', () => ({
  getCurrentAccountQueryKey: () => ['account']
}))
jest.mock('app/services/analytics', () => ({
  track: jest.fn(),
  make: (e: any) => e
}))
jest.mock('app/services/audius-backend-instance', () => ({
  audiusBackendInstance: {}
}))
jest.mock('app/services/query-client', () => ({
  queryClient: { getQueryData: () => undefined }
}))
jest.mock('app/services/sdk/audius-sdk', () => ({ audiusSdk: jest.fn() }))
jest.mock('app/types/analytics', () => ({
  EventNames: { NOTIFICATIONS_OPEN_PUSH_NOTIFICATION: 'open' }
}))

const loadNotifications = (os: 'ios' | 'android') => {
  let mod: any
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({ Platform: { OS: os } }))
    mod = require('./notifications').default
  })
  return mod
}

const iosPress = (data: Record<string, any>) => ({
  type: 1,
  detail: { notification: { title: 't', body: 'b', data } }
})

describe('PushNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(mockStorage)) delete mockStorage[key]
  })

  describe('ios', () => {
    it('registers the lowercase APNs token, not an FCM token', async () => {
      mockMessaging.isDeviceRegisteredForRemoteMessages.mockReturnValue(false)
      mockMessaging.getAPNSToken.mockResolvedValue('ABCDEF0123')
      const notifications = loadNotifications('ios')

      const token = await notifications.getToken()

      expect(mockMessaging.registerDeviceForRemoteMessages).toHaveBeenCalled()
      expect(mockMessaging.getToken).not.toHaveBeenCalled()
      expect(token).toEqual({ token: 'abcdef0123', os: 'ios' })
      expect(JSON.parse(mockStorage['@device-token'])).toEqual(token)
    })

    it('falls back to the stored token when APNs has none', async () => {
      mockMessaging.isDeviceRegisteredForRemoteMessages.mockReturnValue(true)
      mockMessaging.getAPNSToken.mockResolvedValue(null)
      mockStorage['@device-token'] = JSON.stringify({
        token: 'stored',
        os: 'ios'
      })
      const notifications = loadNotifications('ios')

      expect(await notifications.getToken()).toEqual({
        token: 'stored',
        os: 'ios'
      })
    })

    it('holds a cold-start tap until navigation is ready, then navigates once', async () => {
      const notifications = loadNotifications('ios')
      const navigate = jest.fn()
      const onForeground = mockNotifee.onForegroundEvent.mock.calls[0][0]

      onForeground(
        iosPress({ data: { type: 'Follow', id: 1 }, 'media-url': 'x' })
      )
      notifications.setNavigation({ navigate })
      expect(navigate).not.toHaveBeenCalled()

      await notifications.openInitialNotification()
      expect(navigate).toHaveBeenCalledTimes(1)
      expect(navigate).toHaveBeenCalledWith({ type: 'Follow', id: 1 })
      expect(mockMessaging.getInitialNotification).not.toHaveBeenCalled()

      // A later remount must not replay it
      await notifications.openInitialNotification()
      expect(navigate).toHaveBeenCalledTimes(1)
    })

    it('navigates immediately on a tap once ready, ignoring other events', async () => {
      const notifications = loadNotifications('ios')
      const navigate = jest.fn()
      notifications.setNavigation({ navigate })
      await notifications.openInitialNotification()
      const onBackground = mockNotifee.onBackgroundEvent.mock.calls[0][0]

      await onBackground({ type: 0, detail: { notification: { data: {} } } })
      expect(navigate).not.toHaveBeenCalled()

      await onBackground(iosPress({ data: { type: 'Repost', id: 2 } }))
      expect(navigate).toHaveBeenCalledWith({ type: 'Repost', id: 2 })
    })

    it('requests permission through firebase and sets the badge', async () => {
      const notifications = loadNotifications('ios')
      await notifications.requestPermission()
      expect(mockMessaging.requestPermission).toHaveBeenCalled()
      notifications.setBadgeCount(0)
      expect(mockNotifee.setBadgeCount).toHaveBeenCalledWith(0)
    })
  })

  describe('android', () => {
    it('registers the FCM token', async () => {
      mockMessaging.getToken.mockResolvedValue('fcm:Token')
      const notifications = loadNotifications('android')

      expect(await notifications.getToken()).toEqual({
        token: 'fcm:Token',
        os: 'android'
      })
      expect(mockMessaging.getAPNSToken).not.toHaveBeenCalled()
    })

    it('opens the launch notification with parsed data', async () => {
      mockMessaging.getInitialNotification.mockResolvedValue({
        notification: { title: 't', body: 'b' },
        data: { type: 'Follow', id: '12', userIds: '[1,2]' }
      })
      const notifications = loadNotifications('android')
      const navigate = jest.fn()
      notifications.setNavigation({ navigate })

      await notifications.openInitialNotification()
      expect(navigate).toHaveBeenCalledTimes(1)
      expect(navigate).toHaveBeenCalledWith({
        type: 'Follow',
        id: 12,
        userIds: [1, 2]
      })
      expect(mockNotifee.onForegroundEvent).not.toHaveBeenCalled()
    })

    it('opens a tap from the background', async () => {
      mockMessaging.getInitialNotification.mockResolvedValue(null)
      const notifications = loadNotifications('android')
      const navigate = jest.fn()
      notifications.setNavigation({ navigate })
      await notifications.openInitialNotification()

      const onOpened = mockMessaging.onNotificationOpenedApp.mock.calls[0][1]
      onOpened({ data: { type: 'Repost', id: '3' } })
      expect(navigate).toHaveBeenCalledWith({ type: 'Repost', id: 3 })
    })

    it('does not touch the iOS badge', () => {
      const notifications = loadNotifications('android')
      notifications.setBadgeCount(0)
      expect(mockNotifee.setBadgeCount).not.toHaveBeenCalled()
    })
  })
})
