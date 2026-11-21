import type { ParamListBase } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { AppTabScreen } from './AppTabScreen'

export const createAppTabScreenStack = <StackParamList extends ParamListBase>(
  baseScreen: (
    Stack: ReturnType<typeof createNativeStackNavigator>
  ) => React.ReactNode
) => {
  const Stack = createNativeStackNavigator<StackParamList>()
  return () => <AppTabScreen Stack={Stack} baseScreen={baseScreen} />
}
