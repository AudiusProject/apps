import { useEffect } from 'react'

import { walletMessages } from '@audius/common/messages'
import {
  withdrawUSDCSelectors,
  useCoinflowWithdrawModal,
  WithdrawUSDCModalPages,
  useWithdrawUSDCModal,
  CoinflowWithdrawState,
  AMOUNT,
  type WithdrawUSDCFormValues as WithdrawFormValues
} from '@audius/common/store'
import { filterDecimalString } from '@audius/common/utils'
import { useField } from 'formik'
import { Image } from 'react-native'
import { useSelector } from 'react-redux'

import { Flex, LoadingSpinner, spacing, Text } from '@audius/harmony-native'
import EmojiRaisedHands from 'app/assets/images/emojis/raised-hand.png'

const { getCoinflowState } = withdrawUSDCSelectors

export const PrepareTransfer = () => {
  const coinflowState = useSelector(getCoinflowState)
  const { onOpen } = useCoinflowWithdrawModal()
  const { setData } = useWithdrawUSDCModal()
  const [{ value: amountValue }] =
    useField<WithdrawFormValues[typeof AMOUNT]>(AMOUNT)

  useEffect(() => {
    if (coinflowState === CoinflowWithdrawState.READY_FOR_WITHDRAWAL) {
      setData({ page: WithdrawUSDCModalPages.COINFLOW_TRANSFER })
      const amountCents = filterDecimalString(amountValue as string).value
      onOpen({ amount: amountCents / 100.0 })
    }
  }, [coinflowState, setData, onOpen, amountValue])

  return (
    <Flex gap='xl' alignItems='center' justifyContent='center' p='xl'>
      <LoadingSpinner
        style={{ height: spacing.unit10, width: spacing.unit10 }}
      />
      <Flex gap='m' alignItems='center' justifyContent='center'>
        <Flex row gap='m' alignItems='center' justifyContent='center'>
          <Image
            source={EmojiRaisedHands}
            style={{ width: spacing.unit12, height: spacing.unit12 }}
          />

          <Text variant='heading' size='xl' textAlign='center'>
            {walletMessages.holdOn}
          </Text>
        </Flex>
        <Text variant='body' textAlign='center'>
          {walletMessages.preparingTransfer}
        </Text>
      </Flex>
    </Flex>
  )
}
