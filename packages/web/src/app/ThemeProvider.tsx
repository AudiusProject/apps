import { ReactNode, useEffect, useMemo } from 'react'

import {
  useCurrentAccountUser,
  selectIsAccountComplete
} from '@audius/common/api'
import { Theme, SystemAppearance } from '@audius/common/models'
import { themeActions, themeSelectors } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { ThemeProvider as HarmonyThemeProvider } from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { useLocation } from 'react-router-dom'

import { AppState } from 'store/types'
import { useSelector } from 'utils/reducer'
import { PREFERS_DARK_MEDIA_QUERY } from 'utils/theme/theme'

const { setSystemAppearance } = themeActions

const { getTheme, getSystemAppearance } = themeSelectors

const {
  SIGN_IN_PAGE,
  SIGN_IN_CONFIRM_EMAIL_PAGE,
  SIGN_UP_PAGE,
  SIGN_UP_EMAIL_PAGE,
  SIGN_UP_PASSWORD_PAGE,
  SIGN_UP_CREATE_LOGIN_DETAILS,
  SIGN_UP_HANDLE_PAGE,
  SIGN_UP_REVIEW_HANDLE_PAGE,
  SIGN_UP_FINISH_PROFILE_PAGE,
  SIGN_UP_GENRES_PAGE,
  SIGN_UP_ARTISTS_PAGE,
  SIGN_UP_APP_CTA_PAGE,
  SIGN_UP_LOADING_PAGE,
  SIGN_UP_COMPLETED_REDIRECT,
  SIGN_UP_COMPLETED_REFERRER_REDIRECT,
  SIGN_ON_ALIASES,
  OAUTH_LOGIN_PAGE
} = route

// Routes where light mode should be forced
const SIGN_ON_ROUTES = [
  SIGN_IN_PAGE,
  SIGN_IN_CONFIRM_EMAIL_PAGE,
  SIGN_UP_PAGE,
  SIGN_UP_EMAIL_PAGE,
  SIGN_UP_PASSWORD_PAGE,
  SIGN_UP_CREATE_LOGIN_DETAILS,
  SIGN_UP_HANDLE_PAGE,
  SIGN_UP_REVIEW_HANDLE_PAGE,
  SIGN_UP_FINISH_PROFILE_PAGE,
  SIGN_UP_GENRES_PAGE,
  SIGN_UP_ARTISTS_PAGE,
  SIGN_UP_APP_CTA_PAGE,
  SIGN_UP_LOADING_PAGE,
  SIGN_UP_COMPLETED_REDIRECT,
  SIGN_UP_COMPLETED_REFERRER_REDIRECT,
  OAUTH_LOGIN_PAGE,
  ...SIGN_ON_ALIASES
]

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

type ThemeProviderProps = {
  children: ReactNode
}

export const ThemeProvider = (props: ThemeProviderProps) => {
  const { children } = props
  const harmonyTheme = useSelector(selectHarmonyTheme)
  const dispatch = useDispatch()
  const location = useLocation()

  // Check if user is on sign-in/sign-up flow
  const isOnSignOnFlow = useMemo(
    () => SIGN_ON_ROUTES.includes(location.pathname),
    [location.pathname]
  )

  // Check if user is signed out or incomplete account
  const { data: isAccountComplete = false } = useCurrentAccountUser({
    select: selectIsAccountComplete
  })

  // Force light mode when signed out or in sign-up flow
  const effectiveTheme =
    !isAccountComplete || isOnSignOnFlow ? 'day' : harmonyTheme

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }
    const mediaQuery = window.matchMedia(PREFERS_DARK_MEDIA_QUERY)

    // Function to update state based on media query
    const handleSystemAppearanceChange = (e: MediaQueryListEvent) => {
      dispatch(
        setSystemAppearance({
          systemAppearance: e.matches
            ? SystemAppearance.DARK
            : SystemAppearance.LIGHT
        })
      )
    }

    mediaQuery.addListener(handleSystemAppearanceChange)

    return () => {
      mediaQuery.removeListener(handleSystemAppearanceChange)
    }
  }, [dispatch])

  return (
    <HarmonyThemeProvider theme={effectiveTheme}>
      {children}
    </HarmonyThemeProvider>
  )
}
