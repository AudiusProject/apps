import { useEffect, useState } from 'react'

import { route } from '@audius/common/utils'
import { COPYRIGHT_TEXT } from '@audius/web/src/utils/copyright'
import CodePush from '@bravemobile/react-native-code-push'
import { View, Image } from 'react-native'

import {
  IconMessage,
  IconDiscord,
  IconInstagram,
  IconX,
  IconUserGroup
} from '@audius/harmony-native'
import appIcon from 'app/assets/images/appIcon.png'
import { Screen, ScreenContent, Text } from 'app/components/core'
import { makeStyles } from 'app/styles'

import packageInfo from '../../../package.json'

import { SettingsRowLabel } from './SettingRowLabel'
import { SettingsDivider } from './SettingsDivider'
import { SettingsRow } from './SettingsRow'

const { version: appVersion } = packageInfo

const messages = {
  title: 'About',
  appName: 'Audius Music',
  version: 'Audius Version',
  /** Shown after app version when a CodePush OTA bundle is running (e.g. " · OTA v3"). */
  ota: 'OTA',
  copyright: COPYRIGHT_TEXT,
  discord: 'Join our community on Discord',
  x: 'Follow us on X',
  instagram: 'Follow us on Instagram',
  contact: 'Contact Us',
  careers: 'Careers at Audius',
  help: 'Help / FAQ',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy'
}

const useStyles = makeStyles(({ spacing }) => ({
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing(6)
  },
  appIcon: {
    height: 84,
    width: 84,
    marginRight: spacing(4)
  }
}))

export const AboutScreen = () => {
  const styles = useStyles()
  const [otaLabel, setOtaLabel] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadOtaLabel = async () => {
      try {
        const pkg = await CodePush.getUpdateMetadata(
          CodePush.UpdateState.RUNNING
        )
        if (!cancelled && pkg?.label) {
          setOtaLabel(pkg.label)
        }
      } catch {
        // CodePush may be unavailable in some environments; keep base version only.
      }
    }
    loadOtaLabel().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const versionLine =
    otaLabel != null
      ? `${messages.version} ${appVersion} · ${messages.ota} ${otaLabel}`
      : `${messages.version} ${appVersion}`

  return (
    <Screen variant='secondary' title={messages.title} topbarRight={null}>
      <ScreenContent isOfflineCapable>
        <View style={styles.header}>
          <Image source={appIcon} style={styles.appIcon} />
          <View>
            <Text variant='h2'>{messages.appName}</Text>
            <Text variant='body2'>{versionLine}</Text>
            <Text variant='body2'>{messages.copyright}</Text>
          </View>
        </View>
        <SettingsRow url={route.AUDIUS_DISCORD_LINK} firstItem>
          <SettingsRowLabel label={messages.discord} icon={IconDiscord} />
        </SettingsRow>
        <SettingsRow url={route.AUDIUS_X_LINK}>
          <SettingsRowLabel label={messages.x} icon={IconX} />
        </SettingsRow>
        <SettingsRow url={route.AUDIUS_INSTAGRAM_LINK}>
          <SettingsRowLabel label={messages.instagram} icon={IconInstagram} />
        </SettingsRow>
        <SettingsRow url={route.AUDIUS_HELP_LINK}>
          <SettingsRowLabel label={messages.contact} icon={IconMessage} />
        </SettingsRow>
        <SettingsRow url={route.AUDIUS_CAREERS_LINK}>
          <SettingsRowLabel label={messages.careers} icon={IconUserGroup} />
        </SettingsRow>
        <SettingsDivider />
        <SettingsRow url={route.AUDIUS_HELP_LINK}>
          <SettingsRowLabel label={messages.help} />
        </SettingsRow>
        <SettingsRow url={`https://audius.co${route.TERMS_OF_SERVICE}`}>
          <SettingsRowLabel label={messages.terms} />
        </SettingsRow>
        <SettingsRow url={`https://audius.co${route.PRIVACY_POLICY}`}>
          <SettingsRowLabel label={messages.privacy} />
        </SettingsRow>
      </ScreenContent>
    </Screen>
  )
}
