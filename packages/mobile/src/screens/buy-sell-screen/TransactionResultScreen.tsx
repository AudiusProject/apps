import React from 'react'

import { buySellMessages as baseMessages } from '@audius/common/messages'
import type { SuccessDisplayData } from '@audius/common/store'
import { useCoinAmountFormatting } from '@audius/common/store'
import { formatCurrencyWithSubscript } from '@audius/common/utils'

import {
  Button,
  CompletionCheck,
  Divider,
  Flex,
  Text
} from '@audius/harmony-native'
import {
  Screen,
  ScreenContent,
  FixedFooter,
  FixedFooterContent
} from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'

import { SwapBalanceSection } from '../../components/buy-sell'

const messages = {
  ...baseMessages,
  priceEach: (price: number) => {
    const formatted = formatCurrencyWithSubscript(price)
    return `(${formatted} ea.)`
  }
}

type TransactionResult = {
  status: 'success' | 'error'
  data?: SuccessDisplayData
  error?: { message?: string }
}

type TransactionResultScreenProps = {
  route: {
    params: {
      result: TransactionResult
    }
  }
}

export const TransactionResultScreen = ({
  route
}: TransactionResultScreenProps) => {
  const navigation = useNavigation()
  const { result } = route.params

  // Always call hooks at the top level to avoid conditional hook calls
  const successData = result.status === 'success' ? result.data : null

  const { formattedAmount: formattedPayAmount } = useCoinAmountFormatting({
    amount: successData?.payAmount || 0,
    availableBalance: successData?.payAmount || 0,
    isStablecoin: !!successData?.payTokenInfo.isStablecoin,
    decimals: successData?.payTokenInfo.decimals || 6
  })

  const { formattedAmount: formattedReceiveAmount } = useCoinAmountFormatting({
    amount: successData?.receiveAmount || 0,
    availableBalance: successData?.receiveAmount || 0,
    isStablecoin: !!successData?.receiveTokenInfo.isStablecoin,
    decimals: successData?.receiveTokenInfo.decimals || 6
  })

  const handleDone = () => {
    // Close the modal and navigate back to the wallet screen
    navigation.getParent()?.goBack()
    navigation.navigate('wallet')
  }

  if (result.status === 'success' && successData) {
    const { payTokenInfo, receiveTokenInfo, exchangeRate } = successData

    if (!formattedPayAmount || !formattedReceiveAmount) return null

    return (
      <Screen
        title={messages.modalSuccessTitle}
        variant='white'
        url='/buy-sell/success'
      >
        <ScreenContent>
          <FixedFooterContent>
            <Flex direction='column' gap='xl' p='l'>
              <Divider flex={1} />
              <Flex direction='row' gap='s' alignItems='center' mb='xl'>
                <CompletionCheck value='complete' />
                <Text variant='heading' size='s' color='default'>
                  {messages.transactionComplete}
                </Text>
              </Flex>
              <Flex direction='column' gap='xl'>
                <SwapBalanceSection
                  title={messages.youPaid}
                  tokenInfo={payTokenInfo}
                  amount={formattedPayAmount}
                />
                <Divider flex={1} />
                <SwapBalanceSection
                  title={messages.youReceived}
                  tokenInfo={receiveTokenInfo}
                  amount={formattedReceiveAmount}
                />
              </Flex>
              {exchangeRate ? (
                <Flex row gap='xs' alignItems='center' pt='s'>
                  <Text variant='body' size='s' color='subdued'>
                    {messages.exchangeRateLabel}
                  </Text>
                  <Text variant='body' size='s' color='default'>
                    {messages.exchangeRateValue(
                      payTokenInfo.symbol,
                      receiveTokenInfo.symbol,
                      exchangeRate
                    )}
                  </Text>
                </Flex>
              ) : null}
            </Flex>
          </FixedFooterContent>

          <FixedFooter>
            <Button variant='primary' fullWidth onPress={handleDone}>
              {messages.done}
            </Button>
          </FixedFooter>
        </ScreenContent>
      </Screen>
    )
  }

  return null
}
