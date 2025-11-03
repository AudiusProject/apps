import {
  settingsPageActions,
  PushNotificationSetting
} from '@audius/common/store'
import { useDispatch } from 'react-redux'
import { useEffectOnce } from 'react-use'

import { Screen, ScreenContent, ScrollView } from 'app/components/core'

import { EmailFrequencyControlRow } from './EmailFrequencyControlRow'
import { NotificationRow } from './NotificationRow'
import { SettingsDivider } from './SettingsDivider'

const { getPushNotificationSettings, getNotificationSettings } =
  settingsPageActions

const messages = {
  title: 'Notifications',
  enablePn: 'Enable Push Notifications',
  milestones: 'Milestones and Achievements',
  followers: 'New Followers',
  reposts: 'Reposts',
  favorites: 'Favorites',
  remixes: 'Remixes of My Tracks',
  messages: 'Messages',
  comments: 'Comments',
  mentions: 'Mentions',
  reactions: 'Reactions'
}

export const NotificationSettingsScreen = () => {
  const dispatch = useDispatch()

  useEffectOnce(() => {
    dispatch(getPushNotificationSettings())
    dispatch(getNotificationSettings())
  })

  return (
    <Screen title={messages.title} variant='secondary' topbarRight={null}>
      <ScreenContent>
        <ScrollView>
          <SettingsDivider />
          <NotificationRow
            label={messages.enablePn}
            type={PushNotificationSetting.MobilePush}
          />
          <NotificationRow
            label={messages.milestones}
            type={PushNotificationSetting.MilestonesAndAchievements}
          />
          <NotificationRow
            label={messages.followers}
            type={PushNotificationSetting.Followers}
          />
          <NotificationRow
            label={messages.reposts}
            type={PushNotificationSetting.Reposts}
          />
          <NotificationRow
            label={messages.favorites}
            type={PushNotificationSetting.Favorites}
          />
          <NotificationRow
            label={messages.remixes}
            type={PushNotificationSetting.Remixes}
          />
          <NotificationRow
            label={messages.messages}
            type={PushNotificationSetting.Messages}
          />
          <NotificationRow
            label={messages.comments}
            type={PushNotificationSetting.Comments}
          />
          <NotificationRow
            label={messages.mentions}
            type={PushNotificationSetting.Mentions}
          />
          <NotificationRow
            label={messages.reactions}
            type={PushNotificationSetting.Reactions}
          />
          <SettingsDivider />
          <EmailFrequencyControlRow />
        </ScrollView>
      </ScreenContent>
    </Screen>
  )
}
