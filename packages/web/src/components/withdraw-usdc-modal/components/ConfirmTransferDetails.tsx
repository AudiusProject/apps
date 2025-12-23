import { useCallback, useState } from 'react'

import { walletMessages } from '@audius/common/messages'
import {
  WithdrawUSDCModalPages,
  useWithdrawUSDCModal,
  WithdrawMethod
} from '@audius/common/store'
import { decimalIntegerToHumanReadable } from '@audius/common/utils'
import {
  Button,
  Text,
  Flex,
  Checkbox,
  HelperText,
  Divider
} from '@audius/harmony'
import { useField, useFormikContext } from 'formik'

import { CashBalanceSection } from 'components/add-cash/CashBalanceSection'

import { ADDRESS, AMOUNT, CONFIRM, METHOD } from '../types'

const messages = {
  currentBalance: 'Current Balance',
  amountToWithdraw: 'Amount to Withdraw',
  destinationAddress: 'Destination Address',
  review: 'Review Details Carefully',
  byProceeding:
    'By proceeding, you accept full responsibility for any errors, including the risk of irreversible loss of funds. Transfers are final and cannot be reversed.',
  haveCarefully:
    'I have reviewed the information and understand that transfers are final.',
  back: 'Back',
  withdraw: 'Withdraw'
}

export const ConfirmTransferDetails = () => {
  const { submitForm } = useFormikContext()
  const { setData } = useWithdrawUSDCModal()
  const [{ value: amountValue }] = useField(AMOUNT)
  const [{ value: addressValue }] = useField(ADDRESS)
  const [{ value: methodValue }] = useField(METHOD)
  const [confirmField, { error: confirmError }] = useField({
    name: CONFIRM,
    type: 'checkbox'
  })

  const handleGoBack = useCallback(() => {
    setData({ page: WithdrawUSDCModalPages.ENTER_TRANSFER_DETAILS })
  }, [setData])

  const [touchedContinue, setTouchedContinue] = useState(false)
  const handleContinue = useCallback(() => {
    setTouchedContinue(true)
    if (!confirmError) {
      setData({
        page:
          methodValue === WithdrawMethod.COINFLOW
            ? WithdrawUSDCModalPages.PREPARE_TRANSFER
            : WithdrawUSDCModalPages.TRANSFER_IN_PROGRESS
      })
      submitForm()
    }
  }, [methodValue, setData, submitForm, confirmError])

  return (
    <Flex column gap='xl'>
      <CashBalanceSection />
      <Divider css={{ margin: 0 }} />
      <Flex justifyContent='space-between'>
        <Text variant='heading' size='s'>
          {messages.amountToWithdraw}
        </Text>
        <Text variant='heading' size='s'>
          {walletMessages.minus}${decimalIntegerToHumanReadable(amountValue)}
        </Text>
      </Flex>
      {methodValue === WithdrawMethod.COINFLOW ? (
        <Text variant='body' size='m'>
          {walletMessages.cashTransferDescription}
        </Text>
      ) : (
        <>
          <Flex column gap='s'>
            <Text variant='heading' size='s' color='subdued'>
              {messages.destinationAddress}
            </Text>
            <Text variant='body'>{addressValue}</Text>
          </Flex>
          <Flex
            column
            p='l'
            gap='s'
            backgroundColor='surface1'
            border='default'
            borderRadius='m'
          >
            <Text variant='title' size='m'>
              {messages.review}
            </Text>
            <Text variant='body' size='s'>
              {messages.byProceeding}
            </Text>
            <Flex alignItems='center' gap='xl'>
              <Checkbox {...confirmField} />
              <Text variant='body' size='s' color='subdued'>
                {messages.haveCarefully}
              </Text>
            </Flex>
            {touchedContinue && confirmError ? (
              <HelperText error>{confirmError}</HelperText>
            ) : null}
          </Flex>
        </>
      )}
      <Flex gap='s' w='100%'>
        <Button variant='secondary' onClick={handleGoBack} fullWidth>
          {messages.back}
        </Button>
        <Button variant='primary' onClick={handleContinue} fullWidth>
          {messages.withdraw}
        </Button>
      </Flex>
    </Flex>
  )
}
