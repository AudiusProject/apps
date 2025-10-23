import type { ReactNode } from 'react'
import { useEffect } from 'react'

import {
  useCurrentAccountUser,
  selectIsAccountComplete
} from '@audius/common/api'
import { Theme, SystemAppearance } from '@audius/common/models'
import { themeActions, themeSelectors } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigationState } from '@react-navigation/native'
import { useAppState } from '@react-native-community/hooks'
import { useDarkMode } from 'react-native-dynamic'
import { useDispatch, useSelector } from 'react-redux'
import { useAsync } from 'react-use'

import { ThemeProvider as HarmonyThemeProvider } from '@audius/harmony-native'
import { THEME_STORAGE_KEY } from 'app/constants/storage-keys'
import type { AppState } from 'app/store'

const { getTheme, getSystemAppearance } = themeSelectors
const { setTheme, setSystemAppearance } = themeActions

type ThemeProviderProps = {
  children: ReactNode
}

const selectHarmonyTheme = (state: AppState) => {
  const theme = getTheme(state)
  const systemAppearance = getSystemAppearance(state)

  switch (theme) {
    case Theme.DEFAULT:
      return 'day'
    case Theme.DARK:
      return 'dark'
    case Theme.MATRIX:
      return 'matrix'
    case Theme.AUTO:
      switch (systemAppearance) {
        case SystemAppearance.DARK:
          return 'dark'
        case SystemAppearance.LIGHT:
          return 'day'
        default:
          return 'day'
      }
    default:
      return 'day'
  }
}

export const ThemeProvider = (props: ThemeProviderProps) => {
  const { children } = props
  const isDarkMode = useDarkMode()
  const dispatch = useDispatch()
  const appState = useAppState()
  const theme = useSelector(selectHarmonyTheme)

  // Check if user is on sign-in/sign-up flow by checking navigation state
  const isOnSignOnFlow = useNavigationState((state) => {
    if (!state) return false
    // Check if the current root screen is SignOnStack or ResetPassword
    const currentRoute = state.routes[state.index]
    return (
      currentRoute?.name === 'SignOnStack' ||
      currentRoute?.name === 'ResetPassword'
    )
  })

  // Check if user is signed out or incomplete account
  const { data: isAccountComplete = false } = useCurrentAccountUser({
    select: selectIsAccountComplete
  })

  // Force light mode when signed out or in sign-up flow
  const effectiveTheme = !isAccountComplete || isOnSignOnFlow ? 'day' : theme

  useAsync(async () => {
    const savedTheme = (await AsyncStorage.getItem(
      THEME_STORAGE_KEY
    )) as Nullable<Theme>

    dispatch(setTheme({ theme: savedTheme ?? Theme.DEFAULT }))
  }, [dispatch])

  useEffect(() => {
    // react-native-dynamic incorrectly sets dark-mode when in background
    if (appState === 'active') {
      dispatch(
        setSystemAppearance({
          systemAppearance: isDarkMode
            ? SystemAppearance.DARK
            : SystemAppearance.LIGHT
        })
      )
    }
  }, [isDarkMode, dispatch, appState])

  return (
    <HarmonyThemeProvider themeName={effectiveTheme}>
      {children}
    </HarmonyThemeProvider>
  )
}
