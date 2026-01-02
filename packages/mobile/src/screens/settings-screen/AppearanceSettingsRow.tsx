import { useCallback } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { settingsMessages as messages } from '@audius/common/messages'
import { Name, Theme } from '@audius/common/models'
import {
  useTierAndVerifiedForUser,
  themeActions,
  themeSelectors
} from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { IconAppearance } from '@audius/harmony-native'
import { SegmentedControl } from 'app/components/core'
import { make, track } from 'app/services/analytics'

import { SettingsRowLabel } from './SettingRowLabel'
import { SettingsRow } from './SettingsRow'
import { SettingsRowContent } from './SettingsRowContent'
import { SettingsRowDescription } from './SettingsRowDescription'
const { setTheme } = themeActions
const { getTheme } = themeSelectors

export const AppearanceSettingsRow = () => {
  const theme = useSelector(getTheme)
  const { data: accountId } = useCurrentUserId()
  const dispatch = useDispatch()

  const { tier } = useTierAndVerifiedForUser(accountId)

  const appearanceOptions = [
    { key: Theme.DEFAULT, text: messages.lightMode },
    { key: Theme.AUTO, text: messages.autoMode },
    { key: Theme.DARK, text: messages.darkMode }
  ]

  if (tier === 'gold' || tier === 'platinum') {
    appearanceOptions.push({ key: Theme.MATRIX, text: messages.matrixMode })
  }

  const handleSetTheme = useCallback(
    (theme: Theme) => {
      dispatch(setTheme({ theme }))

      const recordedTheme =
        theme === Theme.DEFAULT ? 'light' : theme.toLocaleLowerCase()

      const trackEvent = make({
        eventName: Name.SETTINGS_CHANGE_THEME,
        mode: recordedTheme as 'dark' | 'light' | 'matrix' | 'auto'
      })

      track(trackEvent)
    },
    [dispatch]
  )

  return (
    <SettingsRow>
      <SettingsRowLabel
        label={messages.appearanceTitle}
        icon={IconAppearance}
      />
      <SettingsRowDescription>
        {messages.appearanceDescription}
      </SettingsRowDescription>
      <SettingsRowContent>
        <SegmentedControl
          fullWidth
          options={appearanceOptions}
          defaultSelected={theme ?? Theme.DEFAULT}
          onSelectOption={handleSetTheme}
        />
      </SettingsRowContent>
    </SettingsRow>
  )
}
