import { useMemo } from 'react'

import { SLIPPAGE_BPS } from '@audius/common/api'
import { useBuySellAnalytics } from '@audius/common/hooks'
import { buySellMessages as baseMessages } from '@audius/common/messages'
import {
  CoinInfo,
  getSwapTokens,
  CoinPair,
  useCoinAmountFormatting
} from '@audius/common/store'
import { formatCurrencyWithSubscript } from '@audius/common/utils'
import { Button, Flex, Text } from '@audius/harmony'

import { SwapBalanceSection } from './SwapBalanceSection'

const messages = {
  ...baseMessages,
  priceEach: (price: number) => {
    const formatted = formatCurrencyWithSubscript(price)
    return `(${formatted} ea.)`
  }
}

type ConfirmSwapScreenProps = {
  payTokenInfo: CoinInfo
  receiveTokenInfo: CoinInfo
  payAmount: number
  receiveAmount: number
  pricePerBaseToken: number
  baseTokenSymbol: string
  exchangeRate?: number | null
  onBack: () => void
  onConfirm: () => void
  isConfirming: boolean
  activeTab: 'buy' | 'sell' | 'convert'
  selectedPair: CoinPair
}

export const ConfirmSwapScreen = (props: ConfirmSwapScreenProps) => {
  const {
    payTokenInfo,
    receiveTokenInfo,
    payAmount,
    receiveAmount,
    pricePerBaseToken,
    baseTokenSymbol,
    exchangeRate,
    onBack,
    onConfirm,
    isConfirming,
    activeTab,
    selectedPair
  } = props

  const { trackSwapConfirmed } = useBuySellAnalytics()

  const swapTokens = useMemo(
    () => getSwapTokens(activeTab, selectedPair),
    [activeTab, selectedPair]
  )

  // balance isn't needed so we pass 0
  const { formattedAmount: formattedPayAmount } = useCoinAmountFormatting({
    amount: payAmount,
    isStablecoin: !!payTokenInfo.isStablecoin,
    decimals: payTokenInfo.decimals
  })

  const { formattedAmount: formattedReceiveAmount } = useCoinAmountFormatting({
    amount: receiveAmount,
    isStablecoin: !!receiveTokenInfo.isStablecoin,
    decimals: receiveTokenInfo.decimals
  })

  const isReceivingBaseToken = receiveTokenInfo.symbol === baseTokenSymbol
  const priceLabel = isReceivingBaseToken
    ? messages.priceEach(pricePerBaseToken)
    : undefined

  const handleConfirm = () => {
    trackSwapConfirmed({
      activeTab,
      inputToken: swapTokens.inputToken,
      outputToken: swapTokens.outputToken,
      inputAmount: payAmount,
      outputAmount: receiveAmount,
      exchangeRate,
      slippageBps: SLIPPAGE_BPS
    })

    onConfirm()
  }

  if (!formattedPayAmount || !formattedReceiveAmount) {
    return null
  }

  return (
    <Flex column gap='l'>
      <Text variant='body' size='m'>
        {messages.confirmReview}
      </Text>
      <Flex column gap='xl'>
        <SwapBalanceSection
          title={messages.youPay}
          tokenInfo={payTokenInfo}
          amount={formattedPayAmount}
        />
        <SwapBalanceSection
          title={messages.youReceive}
          tokenInfo={receiveTokenInfo}
          amount={formattedReceiveAmount}
          priceLabel={priceLabel}
        />
      </Flex>

      {exchangeRate ? (
        <Flex gap='xs' alignItems='center' mt='l'>
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

      <Flex gap='s' mt='xl'>
        <Button variant='secondary' fullWidth onClick={onBack}>
          {messages.back}
        </Button>
        <Button
          variant='primary'
          fullWidth
          onClick={handleConfirm}
          isLoading={isConfirming}
        >
          {messages.confirm}
        </Button>
      </Flex>
    </Flex>
  )
}
