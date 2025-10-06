import { useCallback, useState, useEffect } from 'react'

import {
  useArtistCoin,
  transformArtistCoinToTokenInfo
} from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import { FixedDecimal } from '@audius/fixed-decimal'
import { Keyboard } from 'react-native'

import { Button, Divider, Flex, Text, TextInput } from '@audius/harmony-native'
import { BalanceSection } from 'app/components/core'

type SendTokensInputProps = {
  mint: string
  onContinue: (amount: bigint, destinationAddress: string) => void
  initialAmount: bigint
  initialDestinationAddress: string
}

export const SendTokensInput = ({
  mint,
  onContinue,
  initialAmount,
  initialDestinationAddress
}: SendTokensInputProps) => {
  const { data: coin } = useArtistCoin(mint)
  const tokenInfo = coin ? transformArtistCoinToTokenInfo(coin) : undefined

  const [amount, setAmount] = useState(
    initialAmount > 0
      ? new FixedDecimal(initialAmount, tokenInfo?.decimals).toString()
      : ''
  )
  const [destinationAddress, setDestinationAddress] = useState(
    initialDestinationAddress
  )
  const [errors, setErrors] = useState({
    amount: '',
    address: ''
  })
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  // Listen to keyboard events to adjust content height
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      'keyboardWillShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height)
      }
    )

    const keyboardWillHideListener = Keyboard.addListener(
      'keyboardWillHide',
      () => {
        setKeyboardHeight(0)
      }
    )

    return () => {
      keyboardWillShowListener.remove()
      keyboardWillHideListener.remove()
    }
  }, [])

  const validateInputs = useCallback(() => {
    const newErrors = { amount: '', address: '' }

    // Validate amount
    if (!amount || amount === '0') {
      newErrors.amount = walletMessages.sendTokensAmountRequired
    } else {
      try {
        const parsedAmount = new FixedDecimal(amount, tokenInfo?.decimals || 0)
        if (parsedAmount.value <= 0) {
          newErrors.amount = walletMessages.sendTokensAmountInsufficient
        }
      } catch (error) {
        newErrors.amount = walletMessages.sendTokensInvalidAmount
      }
    }

    // Validate address
    if (!destinationAddress.trim()) {
      newErrors.address = walletMessages.sendTokensInvalidAddress
    } else if (destinationAddress.length < 32) {
      newErrors.address = walletMessages.sendTokensInvalidAddress
    }

    setErrors(newErrors)
    return !newErrors.amount && !newErrors.address
  }, [amount, destinationAddress, tokenInfo?.decimals])

  const handleContinue = useCallback(() => {
    if (validateInputs() && tokenInfo) {
      try {
        const parsedAmount = new FixedDecimal(amount, tokenInfo.decimals)
        onContinue(parsedAmount.value, destinationAddress.trim())
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          amount: walletMessages.sendTokensInvalidAmount
        }))
      }
    }
  }, [validateInputs, tokenInfo, amount, destinationAddress, onContinue])

  return (
    <Flex
      gap='xl'
      ph='xl'
      pb='xl'
      // Ensure the keyboard doesn't cover the input
      style={{ minHeight: keyboardHeight > 0 ? keyboardHeight + 400 : 'auto' }}
    >
      <BalanceSection mint={mint} />
      <Divider />

      <Flex gap='l' flex={1}>
        <Flex gap='m'>
          <Flex gap='xs'>
            <Text variant='heading' size='s' color='subdued'>
              {walletMessages.sendTokensAmountToSend}
            </Text>
          </Flex>
          <TextInput
            label={walletMessages.sendTokensAmount}
            value={amount}
            onChangeText={setAmount}
            placeholder={walletMessages.sendTokensAmount}
            keyboardType='decimal-pad'
            error={!!errors.amount}
            helperText={errors.amount}
            endAdornmentText={`$${tokenInfo?.symbol}`}
          />
        </Flex>
        <Divider />

        <Flex gap='m'>
          <Text variant='heading' size='s' color='subdued'>
            {walletMessages.sendTokensDestinationAddress}
          </Text>
          <TextInput
            label={walletMessages.sendTokensWalletAddress}
            value={destinationAddress}
            onChangeText={setDestinationAddress}
            placeholder={walletMessages.sendTokensWalletAddress}
            error={!!errors.address}
            helperText={errors.address}
          />
        </Flex>
      </Flex>

      <Button
        variant='primary'
        fullWidth
        onPress={handleContinue}
        disabled={!amount || !destinationAddress}
      >
        {walletMessages.continue}
      </Button>
    </Flex>
  )
}
