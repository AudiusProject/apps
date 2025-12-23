import { useCallback } from 'react'

import { useUSDCBalance } from '@audius/common/api'
import { Name } from '@audius/common/models'
import { withdrawUSDCSelectors, WithdrawMethod } from '@audius/common/store'
import {
  decimalIntegerToHumanReadable,
  makeSolanaTransactionLink
} from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'
import {
  Button,
  Flex,
  IconExternalLink,
  Text,
  PlainButton,
  IconValidationCheck,
  Divider
} from '@audius/harmony'
import { useField } from 'formik'
import { useSelector } from 'react-redux'

import { CashBalanceSection } from 'components/add-cash/CashBalanceSection'
import { make, track } from 'services/analytics'

import { ADDRESS, AMOUNT, METHOD } from '../types'

const { getWithdrawTransaction } = withdrawUSDCSelectors

const messages = {
  newBalance: 'New Balance',
  amountWithdrawn: 'Amount Withdrawn',
  destinationAddress: 'Destination Address',
  viewOn: 'View On Solana Block Explorer',
  success: 'Your transaction is complete!',
  done: 'Done'
}

const openExplorer = (signature: string) => {
  window.open(
    makeSolanaTransactionLink(signature),
    '_blank',
    'noreferrer,noopener'
  )
}

export const TransferSuccessful = ({
  onClickDone
}: {
  onClickDone: () => void
}) => {
  const { data: balance } = useUSDCBalance()
  const signature = useSelector(getWithdrawTransaction)

  const [{ value: methodValue }] = useField<string>(METHOD)
  const [{ value: amountValue }] = useField<number>(AMOUNT)
  const [{ value: addressValue }] = useField<string>(ADDRESS)

  const handleClickTransactionLink = useCallback(() => {
    if (!signature) return
    openExplorer(signature)
    const balanceNumber = Number(
      USDC(balance ?? 0)
        .floor(2)
        .toString()
    )
    track(
      make({
        eventName: Name.WITHDRAW_USDC_TRANSACTION_LINK_CLICKED,
        currentBalance: balanceNumber,
        amount: amountValue / 100,
        destinationAddress: addressValue,
        signature
      })
    )
  }, [signature, balance, amountValue, addressValue])

  return (
    <Flex column gap='xl'>
      <CashBalanceSection />
      <Divider css={{ margin: 0 }} />
      <Flex alignItems='center' justifyContent='space-between'>
        <Text variant='heading' size='s' color='subdued'>
          {messages.amountWithdrawn}
        </Text>
        <Text variant='heading' size='s'>
          {`-$${decimalIntegerToHumanReadable(amountValue)}`}
        </Text>
      </Flex>
      {methodValue === WithdrawMethod.MANUAL_TRANSFER && signature ? (
        <>
          <Divider css={{ margin: 0 }} />
          <Flex column gap='s' alignItems='flex-start'>
            <Text variant='heading' size='s' color='subdued'>
              {messages.destinationAddress}
            </Text>
            <Text variant='body' size='m'>
              {addressValue}
            </Text>
            <PlainButton
              css={{ padding: 0 }}
              onClick={handleClickTransactionLink}
              iconRight={IconExternalLink}
              variant='subdued'
              size='default'
            >
              {messages.viewOn}
            </PlainButton>
          </Flex>
        </>
      ) : null}
      <Flex alignItems='center' gap='s' pv='m'>
        <IconValidationCheck size='m' />
        <Text variant='heading' size='s'>
          {messages.success}
        </Text>
      </Flex>
      <Button fullWidth variant='primary' onClick={onClickDone}>
        {messages.done}
      </Button>
    </Flex>
  )
}
