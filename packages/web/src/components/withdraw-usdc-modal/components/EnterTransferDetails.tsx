import {
  ChangeEventHandler,
  FocusEventHandler,
  useCallback,
  useState
} from 'react'

import { useUSDCBalance } from '@audius/common/api'
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
  const { validateForm } = useFormikContext<WithdrawFormValues>()
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
    { error: amountError },
    { setValue: setAmount, setTouched: setAmountTouched }
  ] = useField(AMOUNT)
  const [{ value: methodValue }, _ignoredMethodMeta, { setValue: setMethod }] =
    useField<WithdrawMethod>(METHOD)
  const [, { error: addressError }, { setTouched: setAddressTouched }] =
    useField(ADDRESS)
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
    },
    [setHumanizedValue]
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
    setData({ page: WithdrawUSDCModalPages.CONFIRM_TRANSFER_DETAILS })
  }, [setData, methodValue, validateForm, setAmountTouched, setAddressTouched])

  return (
    <Flex column gap='xl'>
      <CashBalanceSection />
      <Divider css={{ margin: 0 }} />
      <Flex column gap='l'>
        <Flex column gap='s'>
          <Text variant='heading' size='s' color='subdued'>
            {walletMessages.amountToWithdraw}
          </Text>
          <Text variant='body'>{walletMessages.destinationDescription}</Text>
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
            />
            <Button variant='secondary' onClick={handleMaxPress} size='large'>
              {walletMessages.max}
            </Button>
          </Flex>
          {amountError && (
            <Text variant='body' size='s' color='danger'>
              {amountError}
            </Text>
          )}
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
        </Flex>
      )}
      <Button
        variant='primary'
        fullWidth
        disabled={!!addressError || !!amountError}
        onClick={handleContinue}
      >
        {walletMessages.continue}
      </Button>
    </Flex>
  )
}
