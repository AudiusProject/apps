import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { PortalHost } from '@gorhom/portal'
import { useRoute } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

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
