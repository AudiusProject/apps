import { useEffect } from 'react'

import { modalsSelectors } from '@audius/common/store'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { PortalHost } from '@gorhom/portal'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NavigationProp, ParamListBase } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useSelector } from 'react-redux'

import { ModalScreen } from 'app/components/core'

import { useAppScreenOptions } from '../app-screen/useAppScreenOptions'

import { BuySellScreen } from './BuySellScreen'
import { ConfirmSwapScreen } from './ConfirmSwapScreen'
import { TransactionResultScreen } from './TransactionResultScreen'

const Stack = createNativeStackNavigator()

const screenOptionOverrides = { headerRight: () => null }

export const BuySellModalScreen = () => {
  const screenOptions = useAppScreenOptions(screenOptionOverrides)
  const { params } = useRoute()
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const stripeModalState = useSelector((state) =>
    modalsSelectors.getModalVisibility(state, 'StripeOnRamp')
  )
  const isStripeModalVisible = stripeModalState === true

  useEffect(() => {
    if (isStripeModalVisible && navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [isStripeModalVisible, navigation])

  return (
    <ModalScreen>
      <BottomSheetModalProvider>
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen
            name='BuySellMain'
            component={BuySellScreen}
            initialParams={params}
          />
          <Stack.Screen
            name='ConfirmSwapScreen'
            component={ConfirmSwapScreen}
            options={{ gestureEnabled: false, headerLeft: () => null }}
          />
          <Stack.Screen
            name='TransactionResultScreen'
            component={TransactionResultScreen}
            options={{ gestureEnabled: false, headerLeft: () => null }}
          />
        </Stack.Navigator>
        <PortalHost name='BuySellModalScreenDrawerPortal' />
      </BottomSheetModalProvider>
    </ModalScreen>
  )
}
