import { useCallback, useMemo } from 'react'

import { useDestinationUsdcAccountCheck } from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import {
  WithdrawUSDCModalPages,
  useWithdrawUSDCModal,
  WithdrawMethod,
  AMOUNT,
  METHOD,
  ADDRESS,
  type WithdrawUSDCFormValues as WithdrawFormValues
} from '@audius/common/store'
import {
  decimalIntegerToHumanReadable,
  filterDecimalString
} from '@audius/common/utils'
import { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { useField, useFormikContext } from 'formik'

import { Button, Flex, Text, Divider, spacing } from '@audius/harmony-native'
import { CashBalanceSection } from 'app/components/add-funds-drawer/CashBalanceSection'
import { SegmentedControl } from 'app/components/core'
import { TextField } from 'app/components/fields'

export const EnterTransferDetails = ({
  balanceNumberCents
}: {
  balanceNumberCents: number
}) => {
  const { validateForm, setFieldError } = useFormikContext<WithdrawFormValues>()
  const [
    { value: amountValue },
    { error: amountError, touched: amountTouched },
    { setValue: setAmount, setTouched: setAmountTouched }
  ] = useField(AMOUNT)
  const [{ value: addressValue }, { error: addressError }, { setTouched: setAddressTouched }] =
    useField(ADDRESS)

  const { data: destinationUsdcStatus } = useDestinationUsdcAccountCheck(
    methodValue === WithdrawMethod.MANUAL_TRANSFER ? addressValue : null
  )

  const { setData } = useWithdrawUSDCModal()
  const [{ value: methodValue }, _ignoredMethodMeta, { setValue: setMethod }] =
    useField<WithdrawMethod>(METHOD)

  const isInsufficientForAtaFee = useMemo(() => {
    if (
      methodValue !== WithdrawMethod.MANUAL_TRANSFER ||
      !destinationUsdcStatus ||
      destinationUsdcStatus.hasUsdcAccount
    ) {
      return false
    }
    const amountCents =
      typeof amountValue === 'string'
        ? filterDecimalString(amountValue).value
        : amountValue
    const feeCents = Math.ceil(
      destinationUsdcStatus.ataCreationFeeUsdc * 100
    )
    return (
      amountCents < feeCents || amountCents + feeCents > balanceNumberCents
    )
  }, [
    methodValue,
    destinationUsdcStatus,
    amountValue,
    balanceNumberCents
  ])

  const onContinuePress = useCallback(async () => {
    setAmountTouched(true)
    if (methodValue === WithdrawMethod.MANUAL_TRANSFER) {
      setAddressTouched(true)
    }
    const errors = await validateForm()
    if (errors[AMOUNT] || errors[ADDRESS]) return

    if (methodValue === WithdrawMethod.MANUAL_TRANSFER && destinationUsdcStatus) {
      if (!destinationUsdcStatus.hasUsdcAccount) {
        const feeCents = Math.ceil(
          destinationUsdcStatus.ataCreationFeeUsdc * 100
        )
        const amountCents =
          typeof amountValue === 'string'
            ? filterDecimalString(amountValue).value
            : amountValue
        if (
          amountCents < feeCents ||
          amountCents + feeCents > balanceNumberCents
        ) {
          setFieldError(
            AMOUNT,
            walletMessages.errors.ataCreationFeeRequired(
              destinationUsdcStatus.ataCreationFeeUsdc.toFixed(2)
            )
          )
          return
        }
      }
    }

    setData({
      page: WithdrawUSDCModalPages.CONFIRM_TRANSFER_DETAILS,
      ...(destinationUsdcStatus && !destinationUsdcStatus.hasUsdcAccount
        ? {
            ataCreationFeeUsdc: destinationUsdcStatus.ataCreationFeeUsdc
          }
        : {})
    })
  }, [
    validateForm,
    setData,
    setAmountTouched,
    setAddressTouched,
    setFieldError,
    methodValue,
    destinationUsdcStatus,
    amountValue,
    balanceNumberCents
  ])

  const handleMaxPress = useCallback(() => {
    const maxCents =
      destinationUsdcStatus && !destinationUsdcStatus.hasUsdcAccount
        ? Math.max(
            0,
            balanceNumberCents -
              Math.ceil(destinationUsdcStatus.ataCreationFeeUsdc * 100)
          )
        : balanceNumberCents
    const maxHumanized = decimalIntegerToHumanReadable(maxCents)
    setAmount(maxHumanized)
  }, [balanceNumberCents, destinationUsdcStatus, setAmount])

  const handleAmountFocus = useCallback(() => {
    // Clear the field if it contains the default value
    if (amountValue === '0.00' || amountValue === '0') {
      setAmount('')
    }
  }, [amountValue, setAmount])

  return (
    <Flex gap='xl'>
      <CashBalanceSection />
      <Divider orientation='horizontal' />
      <Flex gap='m'>
        <Flex gap='s'>
          <Text variant='heading' size='s' color='subdued'>
            {walletMessages.amountToWithdraw}
          </Text>
          <Text variant='body'>{walletMessages.howMuch}</Text>
        </Flex>
        <Flex gap='s'>
          <Flex row gap='s' alignItems='center'>
            <Flex style={{ flex: 1 }}>
              <TextField
                label={walletMessages.amountToWithdrawLabel}
                placeholder='0.00'
                keyboardType='numeric'
                name={AMOUNT}
                startAdornmentText={walletMessages.dollarSign}
                TextInputComponent={BottomSheetTextInput as any}
                noGutter
                errorBeforeSubmit
                required
                shouldShowError={false}
                onFocus={handleAmountFocus}
              />
            </Flex>
            <Button
              variant='secondary'
              onPress={handleMaxPress}
              style={{
                height: '100%',
                paddingVertical: spacing.l,
                paddingHorizontal: spacing.xl
              }}
            >
              {walletMessages.max}
            </Button>
          </Flex>
          {amountTouched &&
          (amountError ||
            (isInsufficientForAtaFee && destinationUsdcStatus)) ? (
            <Text variant='body' size='s' color='danger'>
              {amountError ??
                walletMessages.errors.ataCreationFeeRequired(
                  destinationUsdcStatus!.ataCreationFeeUsdc.toFixed(2)
                )}
            </Text>
          ) : null}
        </Flex>
      </Flex>
      <Divider orientation='horizontal' />
      <SegmentedControl
        options={[
          {
            key: WithdrawMethod.COINFLOW,
            text: walletMessages.bankAccount
          },
          {
            key: WithdrawMethod.MANUAL_TRANSFER,
            text: walletMessages.crypto
          }
        ]}
        selected={methodValue}
        onSelectOption={(method) => setMethod(method)}
        fullWidth
        equalWidth
      />
      {methodValue === WithdrawMethod.COINFLOW && (
        <Text variant='body'>{walletMessages.transferDescription}</Text>
      )}
      {methodValue === WithdrawMethod.MANUAL_TRANSFER && (
        <Flex gap='m'>
          <Flex gap='s'>
            <Text variant='heading' size='s' color='subdued'>
              {walletMessages.destination}
            </Text>
            <Text variant='body'>{walletMessages.destinationDescription}</Text>
          </Flex>
          <TextField
            label={walletMessages.destination}
            placeholder={walletMessages.destination}
            name={ADDRESS}
            TextInputComponent={BottomSheetTextInput as any}
            keyboardType='default'
            autoCapitalize='none'
            autoCorrect={false}
            noGutter
            errorBeforeSubmit
            required
          />
          {destinationUsdcStatus && !destinationUsdcStatus.hasUsdcAccount ? (
            <Text variant='body' size='s' color='warning'>
              {walletMessages.errors.noUsdcAccountFound(
                !amountError && !isInsufficientForAtaFee
                  ? destinationUsdcStatus.ataCreationFeeUsdc.toFixed(2)
                  : undefined
              )}
            </Text>
          ) : null}
        </Flex>
      )}

      <Button onPress={onContinuePress} fullWidth>
        {walletMessages.continue}
      </Button>
    </Flex>
  )
}
