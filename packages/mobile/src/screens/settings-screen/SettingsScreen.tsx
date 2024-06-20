import { useCallback } from 'react'

import { Image, Platform } from 'react-native'

import {
  IconCloudDownload,
  IconInfo,
  IconMessage,
  IconNotificationOn,
  IconSettings
} from '@audius/harmony-native'
import audiusLogoHorizontal from 'app/assets/images/Horizontal-Logo-Full-Color.png'
import { Screen, ScreenContent, ScrollView } from 'app/components/core'
import { useShowManagerModeNotAvailable } from 'app/components/manager-mode-drawer/useShowManagerModeNotAvailable'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'
import { Theme } from 'app/utils/theme'

import type { ProfileTabScreenParamList } from '../app-screen/ProfileTabScreen'

import { AccountSettingsRow } from './AccountSettingsRow'
import { AppearanceSettingsRow } from './AppearanceSettingsRow'
import { CastSettingsRow } from './CastSettingsRow'
import { Divider } from './Divider'
import { SettingsRowLabel } from './SettingRowLabel'
import { SettingsRow } from './SettingsRow'
import { SettingsRowDescription } from './SettingsRowDescription'

const IS_IOS = Platform.OS === 'ios'

const messages = {
  title: 'Settings',
  inbox: 'Inbox Settings',
  inboxDescription: 'Configure who is able to send messages to your inbox.',
  notifications: 'Configure Notifications',
  notificationsDescription: 'Review your notification preferences.',
  downloads: 'Download Settings',
  about: 'About'
}

const useStyles = makeStyles(({ spacing, palette, type }) => ({
  logo: {
    width: 200,
    height: 48,
    marginVertical: spacing(6),
    alignSelf: 'center',
    resizeMode: 'contain',
    tintColor: type === Theme.DEFAULT ? undefined : palette.staticWhite
  }
}))

const IconProps = { height: 28, width: 28, style: { marginRight: 4 } }

export const SettingsScreen = () => {
  const styles = useStyles()
  const navigation = useNavigation<ProfileTabScreenParamList>()

  useShowManagerModeNotAvailable()

  const handlePressInbox = useCallback(() => {
    navigation.push('InboxSettingsScreen')
  }, [navigation])

  const handlePressDownloads = useCallback(() => {
    navigation.push('DownloadSettingsScreen')
  }, [navigation])

  const handlePressNotifications = useCallback(() => {
    navigation.push('NotificationSettingsScreen')
  }, [navigation])

  const handlePressAbout = useCallback(() => {
    navigation.push('AboutScreen')
  }, [navigation])

  return (
    <Screen
      variant='secondary'
      title={messages.title}
      icon={IconSettings}
      IconProps={IconProps}
      url='/settings'
      topbarRight={null}
    >
      <ScreenContent isOfflineCapable>
        <ScrollView>
          <Image source={audiusLogoHorizontal} style={styles.logo} />
          <AccountSettingsRow />
          <Divider />
          <AppearanceSettingsRow />
          <SettingsRow onPress={handlePressInbox}>
            <SettingsRowLabel label={messages.inbox} icon={IconMessage} />
            <SettingsRowDescription>
              {messages.inboxDescription}
            </SettingsRowDescription>
          </SettingsRow>
          <SettingsRow onPress={handlePressNotifications}>
            <SettingsRowLabel
              label={messages.notifications}
              icon={IconNotificationOn}
            />
            <SettingsRowDescription>
              {messages.notificationsDescription}
            </SettingsRowDescription>
          </SettingsRow>
          {IS_IOS ? <CastSettingsRow /> : null}
          <SettingsRow onPress={handlePressDownloads}>
            <SettingsRowLabel
              label={messages.downloads}
              icon={IconCloudDownload}
            />
          </SettingsRow>
          <Divider />
          <SettingsRow onPress={handlePressAbout}>
            <SettingsRowLabel label={messages.about} icon={IconInfo} />
          </SettingsRow>
          <Divider />
        </ScrollView>
      </ScreenContent>
    </Screen>
  )
}
