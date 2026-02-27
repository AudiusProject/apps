import { useCallback, useMemo, useState, useEffect } from 'react'

import {
  useArtistCoin,
  useCoinBalance,
  transformArtistCoinToTokenInfo,
  useCurrentUserId,
  useTradeableCoins
} from '@audius/common/api'
import { useOwnedCoins } from '@audius/common/hooks'
import { buySellMessages } from '@audius/common/messages'
import type { User } from '@audius/common/models'
import { isValidSolAddress } from '@audius/common/store'
import { FixedDecimal } from '@audius/fixed-decimal'
import { Keyboard } from 'react-native'

import { Button, Divider, Flex, Text, TextInput } from '@audius/harmony-native'
import { BalanceSection, SegmentedControl } from 'app/components/core'
import Skeleton from 'app/components/skeleton'

import { UserSearchAutocomplete } from './UserSearchAutocomplete'

type RecipientType = 'user' | 'wallet'

type SendTokensInputProps = {
  mint: string
  onContinue: (
    amount: bigint,
    destinationAddress: string,
    selectedUser: User | null,
    selectedMint: string,
    recipientType: RecipientType,
    amountString: string
  ) => void
  initialAmount?: string
  initialDestinationAddress?: string
  initialSelectedUser?: User | null
  initialRecipientType?: RecipientType
  onBeforeUserSelectionNavigate?: () => void
  onUserChange?: (user: User | null) => void
}

const messages = {
  sending: 'Sending',
  destinationAddress: 'Destination Address',
  recipient: 'Recipient',
  user: 'User',
  wallet: 'Wallet',
  continue: 'Continue',
  insufficientBalance: 'Insufficient balance',
  validWalletAddressRequired: 'A valid wallet address is required.',
  amountRequired: 'Amount is required',
  amountTooLow: 'Amount must be at least $0.50',
  walletAddress: 'Wallet Address',
  userRequired: 'Please select a user',
  userNoWallet:
    'This user does not have a wallet address set up. Please send to a different user or use a wallet address instead.'
}

type ValidationError =
  | 'INSUFFICIENT_BALANCE'
  | 'INVALID_ADDRESS'
  | 'AMOUNT_REQUIRED'
  | 'AMOUNT_TOO_LOW'
  | 'USER_REQUIRED'
  | 'USER_NO_WALLET'

export const SendTokensInput = ({
  mint: initialMint,
  onContinue,
  initialAmount = '',
  initialDestinationAddress = '',
  initialSelectedUser = null,
  initialRecipientType = 'user',
  onBeforeUserSelectionNavigate,
  onUserChange
}: SendTokensInputProps) => {
  const [recipientType, setRecipientType] =
    useState<RecipientType>(initialRecipientType)
  const [selectedMint, setSelectedMint] = useState<string>(initialMint)
  const [amount, setAmount] = useState(initialAmount)
  const [destinationAddress, setDestinationAddress] = useState(
    initialDestinationAddress
  )
  const [selectedUser, setSelectedUser] = useState<User | null>(
    initialSelectedUser
  )
  const [amountError, setAmountError] = useState<ValidationError | null>(null)
  const [addressError, setAddressError] = useState<ValidationError | null>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  // Sync state when initial props change (e.g., when navigating back from confirmation)
  useEffect(() => {
    setSelectedMint(initialMint)
  }, [initialMint])

  useEffect(() => {
    setAmount(initialAmount)
    setAmountError(null)
  }, [initialAmount])

  useEffect(() => {
    setDestinationAddress(initialDestinationAddress)
    setAddressError(null)
  }, [initialDestinationAddress])

  useEffect(() => {
    setSelectedUser(initialSelectedUser)
    setAddressError(null)
  }, [initialSelectedUser])

  useEffect(() => {
    setRecipientType(initialRecipientType)
  }, [initialRecipientType])

  const { data: currentUserId } = useCurrentUserId()

  // Get available tokens
  const { coinsArray: availableCoins, isLoading: coinsLoading } =
    useTradeableCoins({
      includeSol: false
    })
  const { ownedCoins, isLoading: isOwnedCoinsLoading } =
    useOwnedCoins(availableCoins)

  // Get the coin data and balance for selected token
  const { data: coin } = useArtistCoin(selectedMint)
  const { data: tokenBalance } = useCoinBalance({
    mint: selectedMint,
    includeExternalWallets: false,
    includeStaked: false
  })
  const tokenInfo = coin ? transformArtistCoinToTokenInfo(coin) : undefined

  // Calculate USD value for display
  const usdValueInfo = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0 || !coin) return null
    const price =
      coin.price === 0 ? coin.dynamicBondingCurve?.priceUSD : coin.price
    if (!price || price <= 0) return null
    const amountNum = parseFloat(amount)
    const usdValue = amountNum * price
    return {
      usdValue,
      isBelowMinimum: usdValue < 0.5
    }
  }, [amount, coin])

  // Find the selected token in owned coins for the dropdown
  const selectedToken = useMemo(() => {
    const ownedToken = ownedCoins.find(
      (token) => token.address === selectedMint
    )
    if (ownedToken) return ownedToken
    // Fallback to available coins if not in owned coins yet (during initial load)
    return availableCoins.find((token) => token.address === selectedMint)
  }, [ownedCoins, availableCoins, selectedMint])

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
  const handleAmountChange = useCallback((value: string) => {
    // Only allow numbers and a single decimal point
    const numericValue = value.replace(/[^0-9.]/g, '')
    // Ensure only one decimal point
    const parts = numericValue.split('.')
    const filteredValue =
      parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue
    setAmount(filteredValue)
    setAmountError(null)
  }, [])

  const handleAddressChange = useCallback((text: string) => {
    setDestinationAddress(text)
    setAddressError(null)
  }, [])

  const handleUserChange = useCallback(
    (user: User | null) => {
      setSelectedUser(user)
      setAddressError(null)
      // When sending to a user, we derive their user-bank ATA from their ETH address on the backend
      // But we still set spl_wallet for display purposes in the UI
      if (user?.spl_wallet) {
        setDestinationAddress(user.spl_wallet)
      } else {
        setDestinationAddress('')
      }
      // Notify parent component of user change
      onUserChange?.(user)
    },
    [onUserChange]
  )

  const handleRecipientTypeChange = useCallback((type: RecipientType) => {
    setRecipientType(type)
    setSelectedUser(null)
    setDestinationAddress('')
    setAddressError(null)
  }, [])

  const validateInputs = (): boolean => {
    let isValid = true

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      setAmountError('AMOUNT_REQUIRED')
      isValid = false
    } else {
      const currentBalance = tokenBalance?.balance
        ? tokenBalance.balance.value
        : BigInt(0)
      const amountWei = new FixedDecimal(amount, tokenBalance?.decimals).value
      if (amountWei > currentBalance) {
        setAmountError('INSUFFICIENT_BALANCE')
        isValid = false
      } else {
        // Check minimum USD value ($0.50)
        const price =
          coin?.price === 0 ? coin?.dynamicBondingCurve?.priceUSD : coin?.price
        if (price && price > 0) {
          const amountNum = parseFloat(amount)
          const usdValue = amountNum * price
          if (usdValue < 0.5) {
            setAmountError('AMOUNT_TOO_LOW')
            isValid = false
          }
        } else if (amountWei < BigInt(1000)) {
          // Fallback to minimum token amount if price is not available
          setAmountError('AMOUNT_TOO_LOW')
          isValid = false
        }
      }
    }

    // Validate recipient based on type
    if (recipientType === 'user') {
      if (!selectedUser) {
        setAddressError('USER_REQUIRED')
        isValid = false
      } else if (!selectedUser.spl_wallet) {
        setAddressError('USER_NO_WALLET')
        isValid = false
      }
    } else {
      // Validate wallet address
      if (!destinationAddress) {
        setAddressError('INVALID_ADDRESS')
        isValid = false
      } else if (!isValidSolAddress(destinationAddress as any)) {
        setAddressError('INVALID_ADDRESS')
        isValid = false
      }
    }

    return isValid
  }

  const handleContinue = () => {
    if (validateInputs()) {
      const amountWei = new FixedDecimal(amount, tokenInfo?.decimals).value
      // Use wallet address from user if sending to user, otherwise use input address
      const finalAddress =
        recipientType === 'user' && selectedUser?.spl_wallet
          ? selectedUser.spl_wallet
          : destinationAddress
      onContinue(
        amountWei,
        finalAddress,
        recipientType === 'user' ? selectedUser : null,
        selectedMint,
        recipientType,
        amount
      )
    }
  }

  const getErrorText = (error: ValidationError | null) => {
    switch (error) {
      case 'INSUFFICIENT_BALANCE':
        return messages.insufficientBalance
      case 'INVALID_ADDRESS':
        return messages.validWalletAddressRequired
      case 'AMOUNT_REQUIRED':
        return messages.amountRequired
      case 'AMOUNT_TOO_LOW':
        return messages.amountTooLow
      case 'USER_REQUIRED':
        return messages.userRequired
      case 'USER_NO_WALLET':
        return messages.userNoWallet
      default:
        return ''
    }
  }

  const hasErrors = amountError || addressError

  // Show loading state if we don't have tokenInfo yet
  // Use skeleton layout matching final content to prevent layout shift
  if (selectedMint && (!tokenInfo || coinsLoading || isOwnedCoinsLoading)) {
    return (
      <Flex gap='xl' ph='xl' pb='xl'>
        {/* Segmented control skeleton */}
        <Flex row gap='xs' style={{ width: '100%' }}>
          <Skeleton height={40} style={{ flex: 1, borderRadius: 8 }} />
          <Skeleton height={40} style={{ flex: 1, borderRadius: 8 }} />
        </Flex>
        <BalanceSection mint={selectedMint} internalWalletOnly />
        <Divider />
        {/* Sending section skeleton */}
        <Flex gap='m'>
          <Skeleton width={80} height={20} />
          <Skeleton width='100%' height={56} style={{ borderRadius: 8 }} />
        </Flex>
        <Divider />
        {/* Recipient section skeleton */}
        <Flex gap='m'>
          <Skeleton width={100} height={20} />
          <Skeleton width='100%' height={56} style={{ borderRadius: 8 }} />
        </Flex>
        {/* Terms skeleton */}
        <Flex gap='xs'>
          <Skeleton width='100%' height={16} />
          <Skeleton width={140} height={16} />
        </Flex>
        {/* Button skeleton */}
        <Skeleton width='100%' height={48} style={{ borderRadius: 8 }} />
      </Flex>
    )
  }

  // If no mint is selected, show error state
  if (!selectedMint) {
    return (
      <Flex gap='xl' ph='xl' pb='xl'>
        <BalanceSection mint={selectedMint} internalWalletOnly />
        <Divider />
        <Flex gap='l' flex={1}>
          <Text variant='body' color='subdued'>
            Please select a token to send.
          </Text>
        </Flex>
      </Flex>
    )
  }

  if (!selectedToken) {
    return (
      <Flex gap='xl' ph='xl' pb='xl'>
        <BalanceSection mint={selectedMint} internalWalletOnly />
        <Divider />
        <Flex gap='l' flex={1}>
          <Text variant='body' color='subdued'>
            Token not found. Please try again.
          </Text>
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex
      gap='xl'
      ph='xl'
      pb='xl'
      style={{ minHeight: keyboardHeight > 0 ? keyboardHeight + 400 : 'auto' }}
    >
      {/* User/Wallet Segmented Control at Top */}
      <SegmentedControl
        fullWidth
        options={[
          { key: 'user', text: messages.user },
          { key: 'wallet', text: messages.wallet }
        ]}
        selected={recipientType}
        onSelectOption={(value) =>
          handleRecipientTypeChange(value as RecipientType)
        }
      />

      <BalanceSection mint={selectedMint} internalWalletOnly />
      <Divider />

      {/* Sending Section */}
      <Flex gap='m'>
        <Text variant='title' size='l' color='default'>
          {messages.sending}
        </Text>
        <Flex gap='s'>
          <TextInput
            label={tokenInfo?.symbol ?? ''}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder='0.00'
            keyboardType='decimal-pad'
            error={!!amountError}
            helperText={amountError ? getErrorText(amountError) : undefined}
            endAdornmentText={
              tokenInfo?.symbol ? `$${tokenInfo.symbol}` : undefined
            }
          />
          {usdValueInfo && (
            <Text
              variant='body'
              size='s'
              color={usdValueInfo.isBelowMinimum ? 'danger' : 'subdued'}
            >
              ≈ ${usdValueInfo.usdValue.toFixed(2)} USD
              {usdValueInfo.isBelowMinimum && ' (minimum $0.50)'}
            </Text>
          )}
        </Flex>
      </Flex>

      <Divider />

      {/* Destination Address/Recipient Section */}
      <Flex gap='m'>
        <Text variant='title' size='l' color='default'>
          {recipientType === 'user'
            ? messages.recipient
            : messages.destinationAddress}
        </Text>

        {/* User or Wallet Input */}
        {recipientType === 'user' ? (
          <UserSearchAutocomplete
            value={selectedUser}
            onChange={handleUserChange}
            error={!!addressError}
            helperText={addressError ? getErrorText(addressError) : undefined}
            excludedUserIds={currentUserId ? [currentUserId] : undefined}
            onBeforeNavigate={onBeforeUserSelectionNavigate}
          />
        ) : (
          <TextInput
            label={messages.walletAddress}
            value={destinationAddress}
            onChangeText={handleAddressChange}
            error={!!addressError}
            helperText={addressError ? getErrorText(addressError) : undefined}
          />
        )}
      </Flex>

      {/* Terms of Use Link */}
      <Text variant='body' size='s' color='default'>
        {buySellMessages.termsAgreement}{' '}
        <Text
          variant='body'
          size='s'
          color='accent'
          onPress={() => {
            // TODO: Open terms of service link
          }}
        >
          {buySellMessages.termsOfUse}
        </Text>
      </Text>

      {/* Continue Button */}
      <Button
        variant='primary'
        onPress={handleContinue}
        disabled={!!hasErrors}
        fullWidth
      >
        {messages.continue}
      </Button>
    </Flex>
  )
}
