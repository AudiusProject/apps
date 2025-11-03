import { useCallback } from 'react'

import { useIsManagedAccount } from '@audius/common/hooks'
import {
  BrowserNotificationSetting,
  EmailFrequency,
  Notifications
} from '@audius/common/store'
import {
  Text,
  Modal,
  Switch,
  SegmentedControl,
  ModalTitle,
  ModalHeader,
  ModalContent,
  Flex,
  Divider
} from '@audius/harmony'

import { Permission } from 'utils/browserNotifications'
import { isElectron } from 'utils/clientUtil'

const messages = {
  title: 'NOTIFICATIONS',
  browserPushNotifications: 'Browser Push Notifications',
  milestonesAndAchievements: 'Milestones and Achievements',
  followers: 'New Followers',
  reposts: 'Reposts',
  favorites: 'Favorites',
  remixes: 'Remixes of My Tracks',
  messages: 'Messages',
  comments: 'Comments',
  mentions: 'Mentions',
  reactions: 'Reactions',
  emailFrequency: "'What You Missed' Email Frequency",
  enablePermissions:
    'Notifications for Audius are blocked. Please enable in your browser settings and reload the page.'
}

const ToggleNotification = ({
  text,
  isOn,
  type,
  onToggle,
  isDisabled
}: any) => {
  const handleToggle = useCallback(() => {
    onToggle(type, !isOn)
  }, [isOn, onToggle, type])
  return (
    <Flex justifyContent='space-between' alignItems='center' w='100%'>
      <Text color={isDisabled ? 'subdued' : 'default'}>{text}</Text>
      <Switch checked={isOn} onChange={handleToggle} disabled={isDisabled} />
    </Flex>
  )
}

type NotificationSettingsModalProps = {
  settings: Notifications
  emailFrequency: EmailFrequency
  isOpen: boolean
  toggleNotificationSetting: (
    notificationType: BrowserNotificationSetting,
    isOn: boolean
  ) => void
  toggleBrowserPushNotificationPermissions: (
    notificationType: BrowserNotificationSetting,
    isOn: boolean
  ) => void
  updateEmailFrequency: (frequency: EmailFrequency) => void
  onClose: () => void
}

const NotificationSettingsModal = (props: NotificationSettingsModalProps) => {
  const isManagedAccount = useIsManagedAccount()
  const browserPushEnabled =
    props.settings[BrowserNotificationSetting.BrowserPush]

  const notificationToggles = [
    {
      text: messages.milestonesAndAchievements,
      isOn:
        browserPushEnabled &&
        props.settings[BrowserNotificationSetting.MilestonesAndAchievements],
      type: BrowserNotificationSetting.MilestonesAndAchievements
    },
    {
      text: messages.followers,
      isOn:
        browserPushEnabled &&
        props.settings[BrowserNotificationSetting.Followers],
      type: BrowserNotificationSetting.Followers
    },
    {
      text: messages.reposts,
      isOn:
        browserPushEnabled &&
        props.settings[BrowserNotificationSetting.Reposts],
      type: BrowserNotificationSetting.Reposts
    },
    {
      text: messages.favorites,
      isOn:
        browserPushEnabled &&
        props.settings[BrowserNotificationSetting.Favorites],
      type: BrowserNotificationSetting.Favorites
    },
    {
      text: messages.remixes,
      isOn:
        browserPushEnabled &&
        props.settings[BrowserNotificationSetting.Remixes],
      type: BrowserNotificationSetting.Remixes
    },
    {
      text: messages.messages,
      isOn:
        browserPushEnabled &&
        props.settings[BrowserNotificationSetting.Messages],
      type: BrowserNotificationSetting.Messages
    },
    {
      text: messages.comments,
      isOn:
        browserPushEnabled &&
        props.settings[BrowserNotificationSetting.Comments],
      type: BrowserNotificationSetting.Comments
    },
    {
      text: messages.mentions,
      isOn:
        browserPushEnabled &&
        props.settings[BrowserNotificationSetting.Mentions],
      type: BrowserNotificationSetting.Mentions
    },
    {
      text: messages.reactions,
      isOn:
        browserPushEnabled &&
        props.settings[BrowserNotificationSetting.Reactions],
      type: BrowserNotificationSetting.Reactions
    }
  ]

  const emailOptions = [
    { key: EmailFrequency.Live, text: 'Live' },
    { key: EmailFrequency.Daily, text: 'Daily' },
    { key: EmailFrequency.Weekly, text: 'Weekly' },
    { key: EmailFrequency.Off, text: 'Off' }
  ]

  const permissionDenied =
    props.settings[BrowserNotificationSetting.Permission] === Permission.DENIED

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} size='small'>
      <ModalHeader>
        <ModalTitle title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <Flex column gap='l'>
          {!isElectron() && !isManagedAccount ? (
            <>
              <ToggleNotification
                onToggle={props.toggleBrowserPushNotificationPermissions}
                text={messages.browserPushNotifications}
                isOn={browserPushEnabled}
                type={BrowserNotificationSetting.BrowserPush}
              />
              {permissionDenied && (
                <Text size='s' color='danger'>
                  {messages.enablePermissions}
                </Text>
              )}
              {notificationToggles.map((notification) => (
                <ToggleNotification
                  key={notification.type}
                  onToggle={props.toggleNotificationSetting}
                  isDisabled={!browserPushEnabled}
                  {...notification}
                />
              ))}
              <Divider />
            </>
          ) : null}
          <Text textAlign='center'>{messages.emailFrequency}</Text>
          <SegmentedControl
            selected={props.emailFrequency}
            onSelectOption={props.updateEmailFrequency}
            options={emailOptions}
          />
        </Flex>
      </ModalContent>
    </Modal>
  )
}

export default NotificationSettingsModal
