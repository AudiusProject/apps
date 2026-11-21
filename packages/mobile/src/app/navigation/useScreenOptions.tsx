import { createContext, useContext } from 'react'

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'

import { AudiusHomeLink } from './AudiusHomeLink'
import { BackButton } from './BackButton'

export const defaultScreenOptions: NativeStackNavigationOptions = {
  animation: 'default',
  fullScreenGestureEnabled: true,
  headerShadowVisible: false,
  headerTitleAlign: 'center',
  headerBackVisible: false,
  headerLeft: (props) => {
    const { canGoBack } = props
    if (canGoBack) return <BackButton />
    return null
  },
  title: '',
  headerTitle: () => <AudiusHomeLink />
}

export const ScreenOptionsContext = createContext<{
  options: NativeStackNavigationOptions
  updateOptions: (options?: NativeStackNavigationOptions) => void
}>({ options: defaultScreenOptions, updateOptions: () => {} })

export const useScreenOptions = () => {
  const { options, updateOptions } = useContext(ScreenOptionsContext) ?? {}
  return { options, updateOptions }
}
