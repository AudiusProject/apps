import type { ReactNode } from 'react'
import { useMemo, createContext } from 'react'

import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import type { NavigationProp } from '@react-navigation/native'

type AppDrawerContextType = {
  drawerHelpers: DrawerContentComponentProps['navigation']
  drawerNavigation?: NavigationProp<any>
  gesturesDisabled?: boolean
  setGesturesDisabled?: (gestureDisabled: boolean) => void
}

type AppDrawerContextValue = AppDrawerContextType | Record<string, never>

export const AppDrawerContext = createContext<AppDrawerContextValue>({})

type AppDrawerContextProviderProps = AppDrawerContextType & {
  children: ReactNode
}

export const AppDrawerContextProvider = (
  props: AppDrawerContextProviderProps
) => {
  const {
    children,
    drawerHelpers,
    drawerNavigation,
    gesturesDisabled,
    setGesturesDisabled
  } = props

  const context = useMemo(
    () => ({
      drawerHelpers,
      drawerNavigation,
      gesturesDisabled,
      setGesturesDisabled
    }),
    [drawerHelpers, drawerNavigation, gesturesDisabled, setGesturesDisabled]
  )
  return (
    <AppDrawerContext.Provider value={context}>
      {children}
    </AppDrawerContext.Provider>
  )
}
