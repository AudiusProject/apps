import React from 'react'

import { buySellMessages as messages } from '@audius/common/messages'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Flex } from '@audius/harmony-native'
import {
  Screen,
  ScreenContent,
  FixedFooter,
  ScrollView,
  KeyboardAvoidingView
} from 'app/components/core'
// import { FIXED_FOOTER_HEIGHT } from 'app/components/core/FixedFooter'
import { useNavigation } from 'app/hooks/useNavigation'

import type { BuySellScreenParams } from '../../types/navigation'

import { BuySellFlow } from './BuySellFlow'
import { PoweredByJupiter } from './components/PoweredByJupiter'

type BuySellScreenProps = {
  route: {
    params?: BuySellScreenParams
  }
}

export const BuySellScreen = ({ route }: BuySellScreenProps) => {
  const navigation = useNavigation()
  const { params } = route
  const insets = useSafeAreaInsets()
  // const { keyboardHeight, keyboardShown } = useKeyboard()

  const handleClose = () => {
    navigation.goBack()
  }

  const flowData = BuySellFlow({
    onClose: handleClose,
    initialTab: params?.initialTab,
    coinTicker: params?.coinTicker
  })

  // We need to account for the FixedFooter's height and the safe area insets.
  // Additionally, when the keyboard is shown, we need to add the keyboard height
  // so the content scrolls above the keyboard.
  // const dynamicPaddingBottom =
  //   insets.bottom + (keyboardShown ? keyboardHeight : 0)
  return (
    <Screen title={messages.title} variant='white' url='/buy-sell'>
      <ScreenContent>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1
          }}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior='padding'
            keyboardShowingOffset={insets.bottom}
          >
            <PoweredByJupiter />
            <Flex mt='xl' p='l'>
              {flowData.content}
            </Flex>
          </KeyboardAvoidingView>
        </ScrollView>
        <FixedFooter>{flowData.footer}</FixedFooter>
      </ScreenContent>
      {/* <FixedFooter avoidKeyboard>{flowData.footer}</FixedFooter> */}
    </Screen>
  )
}
