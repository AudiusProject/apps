import { buySellMessages as baseMessages } from '@audius/common/messages'
import { useCoinAmountFormatting, CoinInfo } from '@audius/common/store'
import { formatCurrencyWithSubscript } from '@audius/common/utils'
import { Button, CompletionCheck, Flex, Text } from '@audius/harmony'

import { SwapBalanceSection } from './SwapBalanceSection'

const messages = {
  ...baseMessages,
  priceEach: (price: number) => {
    const formatted = formatCurrencyWithSubscript(price)
    return `(${formatted} ea.)`
  }
}

type TransactionSuccessScreenProps = {
  payTokenInfo: CoinInfo
  receiveTokenInfo: CoinInfo
  payAmount: number
  receiveAmount: number
  pricePerBaseToken?: number
  baseTokenSymbol: string
  exchangeRate?: number | null
  onDone: () => void
  hideUSDCTooltip?: boolean
}

export const TransactionSuccessScreen = (
  props: TransactionSuccessScreenProps
) => {
  const {
    payTokenInfo,
    receiveTokenInfo,
    payAmount,
    receiveAmount,
    pricePerBaseToken,
    baseTokenSymbol,
    exchangeRate,
    onDone,
    hideUSDCTooltip
  } = props

  // Follow same pattern as ConfirmSwapScreen - call hooks first
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
  const priceLabel =
    isReceivingBaseToken && pricePerBaseToken
      ? messages.priceEach(pricePerBaseToken)
      : undefined

  if (!formattedPayAmount || !formattedReceiveAmount) {
    return null
  }

  return (
    <Flex direction='column' gap='xl'>
      <Flex direction='row' gap='s' alignItems='center'>
        <CompletionCheck value='complete' />
        <Text variant='heading' size='s' color='default'>
          {messages.transactionComplete}
        </Text>
      </Flex>
      <Flex direction='column' gap='xl' w='100%'>
        <SwapBalanceSection
          title={messages.youPaid}
          tokenInfo={payTokenInfo}
          amount={formattedPayAmount}
          hideUSDCTooltip={hideUSDCTooltip}
        />
        <SwapBalanceSection
          title={messages.youReceived}
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

      <Flex>
        <Button variant='primary' fullWidth onClick={onDone}>
          {messages.done}
        </Button>
      </Flex>
    </Flex>
  )
}
