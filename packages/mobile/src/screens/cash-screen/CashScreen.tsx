import React from 'react'

import { Flex, IconWallet } from '@audius/harmony-native'
import { Screen, ScreenContent, ScrollView } from 'app/components/core'
import { CashWallet } from 'app/screens/wallet-screen/components/CashWallet'

const messages = {
  title: 'CASH'
}

export const CashScreen = () => {
  return (
    <Screen
      url='/cash'
      variant='secondary'
      title={messages.title}
      icon={IconWallet}
    >
      <ScreenContent>
        <ScrollView>
          <Flex gap='xl' ph='s' pv='2xl'>
            <CashWallet />
          </Flex>
        </ScrollView>
      </ScreenContent>
    </Screen>
  )
}
