import { useCallback } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { settingsMessages as messages } from '@audius/common/messages'
import { Name, Theme, ThemeMode, ThemePalette } from '@audius/common/models'
import {
  useTierAndVerifiedForUser,
  themeActions,
  themeSelectors,
  musicConfettiActions
} from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { IconAppearance, Flex } from '@audius/harmony-native'
import { SegmentedControl } from 'app/components/core'
import { make, track } from 'app/services/analytics'

import { SettingsRowLabel } from './SettingRowLabel'
import { SettingsRow } from './SettingsRow'
import { SettingsRowContent } from './SettingsRowContent'
import { SettingsRowDescription } from './SettingsRowDescription'

const { setTheme, setThemePalette, setThemeMode } = themeActions
const { show: showMusicConfetti } = musicConfettiActions
const { getTheme, getThemePalette, getThemeMode } = themeSelectors

export const AppearanceSettingsRow = () => {
  const theme = useSelector(getTheme)
  const themePalette = useSelector(getThemePalette)
  const themeMode = useSelector(getThemeMode)
  const { data: accountId } = useCurrentUserId()
  const dispatch = useDispatch()
  const { tier } = useTierAndVerifiedForUser(accountId)

  const showMatrix =
    tier === 'gold' ||
    tier === 'platinum' ||
    process.env.NODE_ENV === 'development'

  const effectivePalette =
    themePalette ??
    (theme === Theme.MATRIX ? ThemePalette.MATRIX : ThemePalette.DEFAULT)
  const effectiveMode =
    themeMode ??
    (theme === Theme.LIGHT
      ? ThemeMode.LIGHT
      : theme === Theme.DARK
        ? ThemeMode.DARK
        : ThemeMode.AUTO)

  const paletteOptions = [
    { key: ThemePalette.DEFAULT, text: messages.defaultPalette },
    { key: ThemePalette.CLASSIC, text: messages.classicPalette },
    ...(showMatrix
      ? [{ key: ThemePalette.MATRIX, text: messages.matrixMode }]
      : [])
  ]

  const modeOptions = [
    { key: ThemeMode.AUTO, text: messages.autoMode },
    { key: ThemeMode.LIGHT, text: messages.lightMode },
    { key: ThemeMode.DARK, text: messages.darkMode }
  ]

  const handlePaletteChange = useCallback(
    (value: ThemePalette) => {
      dispatch(setThemePalette({ themePalette: value }))
      if (value === ThemePalette.MATRIX) {
        dispatch(setTheme({ theme: Theme.MATRIX }))
        dispatch(showMusicConfetti())
      }
      track(
        make({
          eventName: Name.SETTINGS_CHANGE_THEME,
          mode: 'palette',
          palette: value
        } as any)
      )
    },
    [dispatch]
  )

  const handleModeChange = useCallback(
    (option: ThemeMode) => {
      dispatch(setThemeMode({ themeMode: option }))
      const themeValue =
        option === ThemeMode.LIGHT
          ? Theme.LIGHT
          : option === ThemeMode.DARK
            ? Theme.DARK
            : Theme.AUTO
      dispatch(setTheme({ theme: themeValue }))
      track(
        make({
          eventName: Name.SETTINGS_CHANGE_THEME,
          mode: option.toLowerCase() as 'dark' | 'light' | 'auto'
        })
      )
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
        <Flex direction='column' gap='l'>
          <SegmentedControl
            fullWidth
            options={paletteOptions}
            selected={effectivePalette}
            onSelectOption={handlePaletteChange}
          />
          {effectivePalette !== ThemePalette.MATRIX ? (
            <SegmentedControl
              fullWidth
              options={modeOptions}
              selected={effectiveMode}
              onSelectOption={handleModeChange}
              key={`mode-${effectivePalette}`}
            />
          ) : null}
        </Flex>
      </SettingsRowContent>
    </SettingsRow>
  )
}
