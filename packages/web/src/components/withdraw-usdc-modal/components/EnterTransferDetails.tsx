import {
  ChangeEventHandler,
  FocusEventHandler,
  useCallback,
  useMemo,
  useState
} from 'react'

import {
  useUSDCBalance,
  useDestinationUsdcAccountCheck
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import {
  WithdrawUSDCModalPages,
  useWithdrawUSDCModal,
  WithdrawMethod
} from '@audius/common/store'
import {
  filterDecimalString,
  padDecimalValue,
  decimalIntegerToHumanReadable
} from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'
import { Button, Flex, SegmentedControl, Text, Divider } from '@audius/harmony'
import { useField, useFormikContext } from 'formik'

import { CashBalanceSection } from 'components/add-cash/CashBalanceSection'
import { TextField } from 'components/form-fields'
import { make, track } from 'services/analytics'

import { ADDRESS, AMOUNT, METHOD, WithdrawFormValues } from '../types'

const messages = {
  currentBalance: 'Current Balance',
  solanaWallet: 'USDC Wallet (Solana)',
  dollars: '$'
}

const WithdrawMethodOptions = [
  { key: WithdrawMethod.COINFLOW, text: walletMessages.bankAccount },
  { key: WithdrawMethod.MANUAL_TRANSFER, text: walletMessages.crypto }
]

export const EnterTransferDetails = () => {
  const { validateForm, setFieldError } = useFormikContext<WithdrawFormValues>()
  const { data: balance } = useUSDCBalance()
  const { setData } = useWithdrawUSDCModal()

  const { isEnabled: isCoinflowEnabled } = useFeatureFlag(
    FeatureFlags.COINFLOW_OFFRAMP_ENABLED
  )

  const balanceNumberCents = Math.floor(
    Number(
      USDC(balance ?? 0)
        .floor(2)
        .toString()
    ) * 100
  )
  const analyticsBalance = balanceNumberCents / 100

  const [
    { value },
    { error: amountError, touched: amountTouched },
    { setValue: setAmount, setTouched: setAmountTouched }
  ] = useField(AMOUNT)
  const [{ value: methodValue }, _ignoredMethodMeta, { setValue: setMethod }] =
    useField<WithdrawMethod>(METHOD)
  const [
    { value: addressValue },
    _ignoredAddressMeta,
    { setTouched: setAddressTouched }
  ] = useField(ADDRESS)

  const { data: destinationUsdcStatus } = useDestinationUsdcAccountCheck(
    methodValue === WithdrawMethod.MANUAL_TRANSFER ? addressValue : null
  )

  const isInsufficientForAtaFee = useMemo(() => {
    if (
      methodValue !== WithdrawMethod.MANUAL_TRANSFER ||
      !destinationUsdcStatus ||
      destinationUsdcStatus.hasUsdcAccount
    ) {
      return false
    }
    const amountCents =
      typeof value === 'string' ? filterDecimalString(value).value : value
    const feeCents = Math.ceil(destinationUsdcStatus.ataCreationFeeUsdc * 100)
    return amountCents < feeCents || amountCents > balanceNumberCents
  }, [methodValue, destinationUsdcStatus, value, balanceNumberCents])

  const [humanizedValue, setHumanizedValue] = useState(
    value ? decimalIntegerToHumanReadable(value) : '0'
  )
  const handleAmountChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const { human, value } = filterDecimalString(e.target.value)
      setHumanizedValue(human)
      setAmount(value)
    },
    [setAmount, setHumanizedValue]
  )
  const handleAmountBlur: FocusEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setHumanizedValue(padDecimalValue(e.target.value))
      setAmountTouched(true)
    },
    [setHumanizedValue, setAmountTouched]
  )

  const handleMaxPress = useCallback(() => {
    setHumanizedValue(decimalIntegerToHumanReadable(balanceNumberCents))
    setAmount(balanceNumberCents)
  }, [balanceNumberCents, setAmount, setHumanizedValue])

  const handlePasteAddress = useCallback(
    (event: React.ClipboardEvent) => {
      const pastedAddress = event.clipboardData.getData('text/plain')
      track(
        make({
          eventName: Name.WITHDRAW_USDC_ADDRESS_PASTED,
          destinationAddress: pastedAddress,
          currentBalance: analyticsBalance
        })
      )
    },
    [analyticsBalance]
  )

  const handleContinue = useCallback(async () => {
    setAmountTouched(true)
    if (methodValue === WithdrawMethod.MANUAL_TRANSFER) {
      setAddressTouched(true)
    }
    const errors = await validateForm()
    if (errors[AMOUNT] || errors[ADDRESS]) return

    if (
      methodValue === WithdrawMethod.MANUAL_TRANSFER &&
      destinationUsdcStatus
    ) {
      if (!destinationUsdcStatus.hasUsdcAccount) {
        const feeCents = Math.ceil(
          destinationUsdcStatus.ataCreationFeeUsdc * 100
        )
        const amountCents =
          typeof value === 'string' ? filterDecimalString(value).value : value
        if (amountCents < feeCents || amountCents > balanceNumberCents) {
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
    setData,
    methodValue,
    validateForm,
    setAmountTouched,
    setAddressTouched,
    setFieldError,
    destinationUsdcStatus,
    value,
    balanceNumberCents
  ])

  return (
    <Flex column gap='xl'>
      <CashBalanceSection />
      <Divider css={{ margin: 0 }} />
      <Flex column gap='l'>
        <Flex column gap='s'>
          <Text variant='heading' size='s' color='subdued'>
            {walletMessages.amountToWithdraw}
          </Text>
        </Flex>
        <Flex column gap='s'>
          <Flex gap='s' alignItems='center'>
            <TextField
              title={walletMessages.amountToWithdrawLabel}
              label={walletMessages.amountToWithdrawLabel}
              aria-label={walletMessages.amountToWithdrawLabel}
              name={AMOUNT}
              value={humanizedValue}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              startAdornmentText={messages.dollars}
              error={
                amountTouched &&
                !!(
                  amountError ||
                  (isInsufficientForAtaFee && destinationUsdcStatus)
                )
              }
              helperText={
                amountTouched &&
                (amountError ||
                  (isInsufficientForAtaFee && destinationUsdcStatus))
                  ? (amountError ??
                    (destinationUsdcStatus &&
                    !destinationUsdcStatus.hasUsdcAccount
                      ? walletMessages.errors.ataCreationFeeRequired(
                          destinationUsdcStatus.ataCreationFeeUsdc.toFixed(2)
                        )
                      : undefined))
                  : undefined
              }
            />
            <Button variant='secondary' onClick={handleMaxPress} size='large'>
              {walletMessages.max}
            </Button>
          </Flex>
        </Flex>
      </Flex>
      <Divider css={{ margin: 0 }} />
      {isCoinflowEnabled ? (
        <SegmentedControl
          fullWidth
          label={walletMessages.transferMethod}
          options={WithdrawMethodOptions}
          onSelectOption={setMethod}
          selected={methodValue}
        />
      ) : null}
      {methodValue === WithdrawMethod.COINFLOW ? (
        <Text variant='body' size='m'>
          {walletMessages.cashTransferDescription}
        </Text>
      ) : (
        <Flex column gap='l'>
          <Flex column gap='s'>
            <Text variant='heading' size='s' color='subdued'>
              {walletMessages.destination}
            </Text>
            <Text variant='body'>{walletMessages.destinationDescription}</Text>
          </Flex>
          <TextField
            title={walletMessages.destination}
            onPaste={handlePasteAddress}
            label={messages.solanaWallet}
            aria-label={walletMessages.destination}
            name={ADDRESS}
            placeholder=''
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
      <Button variant='primary' fullWidth onClick={handleContinue}>
        {walletMessages.continue}
      </Button>
    </Flex>
  )
}
