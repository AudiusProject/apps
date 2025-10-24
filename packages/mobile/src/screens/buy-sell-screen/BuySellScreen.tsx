import React from 'react'

import { buySellMessages as messages } from '@audius/common/messages'
import { css } from '@emotion/native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Flex, Paper, spacing } from '@audius/harmony-native'
import { Screen, ScreenContent } from 'app/components/core'
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

  const handleClose = () => {
    navigation.goBack()
  }

  const flowData = BuySellFlow({
    onClose: handleClose,
    initialTab: params?.initialTab,
    coinTicker: params?.coinTicker
  })

  return (
    <Screen title={messages.title} variant='white' url='/buy-sell'>
      <ScreenContent>
        <KeyboardAwareScrollView
          bottomOffset={spacing['2xl']}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          <PoweredByJupiter />
          <Flex mt='xl' p='l' style={{ flex: 1 }}>
            {flowData.content}
          </Flex>
        </KeyboardAwareScrollView>
        {/* Render footer outside scrollview so it doesn't move around when we adjust padding */}
        <Paper
          p='l'
          justifyContent='center'
          gap='s'
          alignItems='center'
          direction='column'
          shadow='midInverted'
          style={css({
            position: 'absolute',
            bottom: 0,
            width: '100%',
            borderRadius: 0,
            paddingBottom: insets.bottom === 0 ? spacing.l : insets.bottom
          })}
        >
          {flowData.footer}
        </Paper>
      </ScreenContent>
    </Screen>
  )
}
