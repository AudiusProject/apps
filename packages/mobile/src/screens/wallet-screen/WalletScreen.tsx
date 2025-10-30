import React from 'react'

import { Flex, IconWallet } from '@audius/harmony-native'
import { AccountBalance } from 'app/components/account-balance'
import { Screen, ScreenContent, ScrollView } from 'app/components/core'

import {
  LinkedWallets,
  WalletRowOverflowMenu
} from './components/LinkedWallets'
import { YourCoins } from './components/YourCoins'

const messages = {
  title: 'WALLET'
}

export const WalletScreen = () => {
  return (
    <Screen
      url='/wallet'
      variant='secondary'
      title={messages.title}
      icon={IconWallet}
    >
      <ScreenContent>
        <ScrollView>
          <Flex gap='xl' ph='s' pv='2xl'>
            <AccountBalance />
            <YourCoins />
            <LinkedWallets />
          </Flex>
        </ScrollView>
        <WalletRowOverflowMenu />
      </ScreenContent>
    </Screen>
  )
}
