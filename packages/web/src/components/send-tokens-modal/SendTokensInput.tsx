import { ChangeEvent, useCallback, useState } from 'react'

import {
  useArtistCoin,
  useCoinBalance,
  transformArtistCoinToTokenInfo,
  useCurrentUserId
} from '@audius/common/api'
import { User } from '@audius/common/models'
import { isValidSolAddress } from '@audius/common/store'
import { FixedDecimal } from '@audius/fixed-decimal'
import {
  Button,
  IconValidationX,
  TokenAmountInput,
  Text,
  Flex,
  Divider,
  SegmentedControl
} from '@audius/harmony'

import { CryptoBalanceSection } from 'components/buy-sell-modal/CryptoBalanceSection'

import { UserSearchAutocomplete } from './UserSearchAutocomplete'
import WalletInput from './WalletInput'

type RecipientType = 'user' | 'wallet'

interface SendTokensInputProps {
  mint: string
  onContinue: (
    amount: bigint,
    destinationAddress: string,
    selectedUser: User | null
  ) => void
  initialAmount?: string
  initialDestinationAddress?: string
  initialSelectedUser?: User | null
  initialRecipientType?: RecipientType
}

const messages = {
  amount: 'Amount',
  amountToSend: 'Amount to Send',
  amountDescription: 'How much {symbol} would you like to send?',
  recipient: 'Recipient',
  recipientDescriptionUser: 'Search for an Audius user by name or handle.',
  recipientDescriptionWallet: 'The Solana wallet address to receive funds.',
  user: 'User',
  wallet: 'Wallet',
  continue: 'Continue',
  insufficientBalance: 'Insufficient balance',
  validWalletAddressRequired: 'A valid wallet address is required.',
  amountRequired: 'Amount is required',
  amountTooLow: 'Amount is too low to send',
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

const SendTokensInput = ({
  mint,
  onContinue,
  initialAmount = '',
  initialDestinationAddress = '',
  initialSelectedUser = null,
  initialRecipientType = 'user'
}: SendTokensInputProps) => {
  const [recipientType, setRecipientType] =
    useState<RecipientType>(initialRecipientType)
  const [amount, setAmount] = useState(initialAmount)
  const [destinationAddress, setDestinationAddress] = useState(
    initialDestinationAddress
  )
  const [selectedUser, setSelectedUser] = useState<User | null>(
    initialSelectedUser
  )
  const [amountError, setAmountError] = useState<ValidationError | null>(null)
  const [addressError, setAddressError] = useState<ValidationError | null>(null)

  // Get the coin data and balance using the same hooks as ReceiveTokensModal
  const { data: coin } = useArtistCoin(mint)
  const { data: tokenBalance } = useCoinBalance({
    mint,
    includeExternalWallets: false,
    includeStaked: false
  })
  const { data: currentUserId } = useCurrentUserId()
  const tokenInfo = coin ? transformArtistCoinToTokenInfo(coin) : undefined
  const formattedBalance =
    tokenBalance?.balance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) ?? ''

  const handleAmountChange = useCallback((value: string, weiAmount: bigint) => {
    setAmount(value)
    setAmountError(null)
  }, [])

  const handleAddressChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setDestinationAddress(e.target.value)
      setAddressError(null)
    },
    []
  )

  const handleUserChange = useCallback((user: User | null) => {
    setSelectedUser(user)
    setAddressError(null)
    // When sending to a user, we derive their user-bank ATA from their ETH address on the backend
    // But we still set spl_wallet for display purposes in the UI
    if (user?.spl_wallet) {
      setDestinationAddress(user.spl_wallet)
    } else {
      setDestinationAddress('')
    }
  }, [])

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
      } else if (amountWei < BigInt(1000)) {
        // Minimum amount
        setAmountError('AMOUNT_TOO_LOW')
        isValid = false
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
        recipientType === 'user' ? selectedUser : null
      )
    }
  }

  const getAmountDescription = () => {
    return messages.amountDescription.replace(
      '{symbol}',
      tokenInfo?.symbol ? `$${tokenInfo.symbol}` : 'tokens'
    )
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
  if (!tokenInfo) {
    return (
      <Flex direction='column' gap='xl' p='xl' alignItems='center'>
        <Text variant='body' size='l' color='subdued'>
          Loading token information...
        </Text>
      </Flex>
    )
  }

  return (
    <Flex direction='column' gap='xl' p='xl'>
      {/* Token Balance Section */}
      <CryptoBalanceSection
        tokenInfo={tokenInfo}
        name={tokenInfo.name}
        amount={formattedBalance}
      />

      <Divider orientation='horizontal' color='default' />

      {/* Amount Section */}
      <Flex direction='column' gap='m'>
        <Flex direction='column' gap='xs'>
          <Text variant='heading' size='s' color='subdued'>
            {messages.amountToSend}
          </Text>
          <Text variant='body' size='s' color='default'>
            {getAmountDescription()}
          </Text>
        </Flex>

        <TokenAmountInput
          label={messages.amount}
          value={amount}
          onChange={handleAmountChange}
          tokenLabel={`$${tokenInfo.symbol}`}
          error={!!amountError}
          decimals={tokenInfo.decimals}
        />

        {amountError && (
          <Flex gap='xs' alignItems='center'>
            <IconValidationX size='s' color='danger' />
            <Text variant='body' size='xs' color='danger'>
              {getErrorText(amountError)}
            </Text>
          </Flex>
        )}
      </Flex>

      <Divider orientation='horizontal' color='default' />

      {/* Recipient Section */}
      <Flex direction='column' gap='m'>
        <Flex direction='column' gap='xs'>
          <Text variant='heading' size='s' color='subdued'>
            {messages.recipient}
          </Text>
          <Text variant='body' size='s' color='default'>
            {recipientType === 'user'
              ? messages.recipientDescriptionUser
              : messages.recipientDescriptionWallet}
          </Text>
        </Flex>

        {/* Recipient Type Tabs */}
        <SegmentedControl
          options={[
            { key: 'user', text: messages.user },
            { key: 'wallet', text: messages.wallet }
          ]}
          selected={recipientType}
          onSelectOption={(value) =>
            handleRecipientTypeChange(value as RecipientType)
          }
        />

        {/* User or Wallet Input */}
        {recipientType === 'user' ? (
          <UserSearchAutocomplete
            value={selectedUser}
            onChange={handleUserChange}
            error={!!addressError}
            helperText={addressError ? getErrorText(addressError) : undefined}
            excludedUserIds={currentUserId ? [currentUserId] : undefined}
          />
        ) : (
          <WalletInput
            label={messages.walletAddress}
            value={destinationAddress}
            onChange={handleAddressChange}
            error={!!addressError}
            helperText={addressError ? getErrorText(addressError) : undefined}
          />
        )}
      </Flex>

      {/* Continue Button */}
      <Button
        variant='primary'
        onClick={handleContinue}
        disabled={!!hasErrors}
        fullWidth
      >
        {messages.continue}
      </Button>
    </Flex>
  )
}

export default SendTokensInput
