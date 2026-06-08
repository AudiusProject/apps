import { useContext } from 'react'

import { useNavigation } from 'app/hooks/useNavigation'

import { AppTabNavigationContext } from './AppTabNavigationProvider'

export const useAppTabNavigation = () => {
  const { navigation: contextNavigation } = useContext(AppTabNavigationContext)
  return useNavigation({ customNavigation: contextNavigation })
}
