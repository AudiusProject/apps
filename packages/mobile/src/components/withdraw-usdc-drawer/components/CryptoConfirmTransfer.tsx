import React, { useCallback, useState } from 'react'

import { walletMessages } from '@audius/common/messages'
import {
  useWithdrawUSDCModal,
  WithdrawUSDCModalPages,
  AMOUNT,
  CONFIRM,
  type WithdrawUSDCFormValues as WithdrawFormValues
} from '@audius/common/store'
import { css } from '@emotion/native'
import { useFormikContext, useField } from 'formik'

import { Button, Divider, Flex, Text } from '@audius/harmony-native'
import { CashBalanceSection } from 'app/components/add-funds-drawer/CashBalanceSection'
import { Switch } from 'app/components/core'

export const CryptoConfirmTransfer = () => {
  const { submitForm, values } = useFormikContext<WithdrawFormValues>()
  const { setData } = useWithdrawUSDCModal()
  const [{ value: amountValue }] = useField(AMOUNT)
  const [{ value: confirmValue }, , { setValue: setConfirmValue }] =
    useField(CONFIRM)

  const [touchedContinue, setTouchedContinue] = useState(false)

  const handleGoBack = useCallback(() => {
    setData({ page: WithdrawUSDCModalPages.ENTER_TRANSFER_DETAILS })
  }, [setData])

  const handleConfirm = useCallback(() => {
    setTouchedContinue(true)
    if (confirmValue) {
      setData({ page: WithdrawUSDCModalPages.TRANSFER_IN_PROGRESS })
      submitForm()
    }
  }, [submitForm, confirmValue, setData])

  return (
    <Flex gap='xl'>
      <CashBalanceSection />
      <Divider orientation='horizontal' />
      <Flex gap='s'>
        <Text variant='heading' size='s' color='subdued'>
          {walletMessages.amountToWithdraw}
        </Text>
        <Text variant='heading' size='s'>
          {walletMessages.minus}${amountValue}
        </Text>
      </Flex>

      <Divider orientation='horizontal' />
      <Flex gap='s'>
        <Text variant='heading' size='s' color='subdued'>
          {walletMessages.destination}
        </Text>
        <Text variant='body'>{values.address}</Text>
      </Flex>

      <Flex
        p='l'
        gap='s'
        border='strong'
        borderRadius='m'
        backgroundColor='surface1'
      >
        <Text variant='title'>{walletMessages.reviewDetails}</Text>
        <Text variant='body' size='s'>
          {walletMessages.disclaimer}
        </Text>
        <Flex row gap='xl' alignItems='center'>
          <Switch
            value={confirmValue}
            onValueChange={(value) => {
              setConfirmValue(value)
            }}
          />
          <Text variant='body' size='s' style={css({ flex: 1 })}>
            {walletMessages.iHaveReviewed}
          </Text>
        </Flex>
        {touchedContinue && !confirmValue ? (
          <Text variant='body' size='s' color='danger'>
            {walletMessages.errors.pleaseConfirm}
          </Text>
        ) : null}
      </Flex>

      <Flex row gap='s'>
        <Button variant='secondary' onPress={handleGoBack} style={{ flex: 1 }}>
          {walletMessages.back}
        </Button>
        <Button onPress={handleConfirm} style={{ flex: 1 }}>
          {walletMessages.withdraw}
        </Button>
      </Flex>
    </Flex>
  )
}
