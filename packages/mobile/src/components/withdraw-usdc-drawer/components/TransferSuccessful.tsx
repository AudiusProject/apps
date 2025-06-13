import React from 'react'

import { walletMessages } from '@audius/common/messages'
import { withdrawUSDCSelectors } from '@audius/common/store'
import {
  decimalIntegerToHumanReadable,
  makeSolanaTransactionLink
} from '@audius/common/utils'
import { useField } from 'formik'
import { useSelector } from 'react-redux'

import {
  Button,
  Divider,
  Flex,
  Text,
  IconValidationCheck,
  IconExternalLink
} from '@audius/harmony-native'
import { CashBalanceSection } from 'app/components/add-funds-drawer/CashBalanceSection'
import { ExternalLink } from 'app/harmony-native/components/TextLink/ExternalLink'

import type { WithdrawFormValues } from '../types'
import { ADDRESS, AMOUNT } from '../types'

const { getWithdrawTransaction } = withdrawUSDCSelectors

type TransferSuccessfulProps = {
  onDone: () => void
}

export const TransferSuccessful = ({ onDone }: TransferSuccessfulProps) => {
  const signature = useSelector(getWithdrawTransaction)

  const [{ value: amountValue }] =
    useField<WithdrawFormValues[typeof AMOUNT]>(AMOUNT)
  const [{ value: addressValue }] =
    useField<WithdrawFormValues[typeof ADDRESS]>(ADDRESS)

  return (
    <Flex gap='xl'>
      <CashBalanceSection />
      <Divider orientation='horizontal' />

      <Flex gap='s'>
        <Text variant='heading' size='s' color='subdued'>
          {walletMessages.amountWithdrawn}
        </Text>
        <Text variant='heading' size='s'>
          -${decimalIntegerToHumanReadable(amountValue)}
        </Text>
      </Flex>

      <Divider orientation='horizontal' />
      <Flex alignItems='flex-start' gap='s'>
        <Text variant='heading' size='s' color='subdued'>
          {walletMessages.destination}
        </Text>
        <Text variant='body'>{addressValue}</Text>
        {signature && (
          <ExternalLink url={makeSolanaTransactionLink(signature)}>
            <Flex row gap='xs' alignItems='center'>
              <Text variant='title' size='s' color='subdued'>
                {walletMessages.viewOnExplorer}
              </Text>
              <IconExternalLink color='subdued' size='s' />
            </Flex>
          </ExternalLink>
        )}
      </Flex>

      <Flex row gap='s' alignItems='center'>
        <IconValidationCheck size='s' />
        <Text variant='heading' size='s'>
          {walletMessages.transactionComplete}
        </Text>
      </Flex>

      <Button onPress={onDone} fullWidth>
        {walletMessages.done}
      </Button>
    </Flex>
  )
}
