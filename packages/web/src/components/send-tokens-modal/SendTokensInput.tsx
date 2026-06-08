import { ChangeEvent, useCallback, useMemo, useState } from 'react'

import {
  useFanClub,
  useCoinBalance,
  transformFanClubToTokenInfo,
  useCurrentUserId,
  useTradeableCoins
} from '@audius/common/api'
import { useOwnedCoins } from '@audius/common/hooks'
import { buySellMessages } from '@audius/common/messages'
import { User } from '@audius/common/models'
import { isValidSolAddress } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { FixedDecimal } from '@audius/fixed-decimal'
import {
  Button,
  TokenAmountInput,
  Text,
  Flex,
  Divider,
  SegmentedControl,
  TextLink,
  useTheme
} from '@audius/harmony'

import { appkitModal } from 'app/ReownAppKitModal'
import { CurrentWalletBanner } from 'components/buy-sell-modal/components/CurrentWalletBanner'
import { StaticTokenDisplay } from 'components/buy-sell-modal/components/StaticTokenDisplay'
import { TokenDropdown } from 'components/buy-sell-modal/components/TokenDropdown'

import { SendTokensInputSkeleton } from './SendTokensConfirmationSkeleton'
import { UserSearchAutocomplete } from './UserSearchAutocomplete'
import WalletInput from './WalletInput'

type RecipientType = 'user' | 'wallet'

interface SendTokensInputProps {
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
}

const messages = {
  sending: 'Sending',
  destinationAddress: 'Destination Address',
  recipient: 'Recipient',
  recipientDescriptionUser: 'Search for an Audius user by name or handle.',
  recipientDescriptionWallet: 'The Solana wallet address to receive funds.',
  user: 'User',
  wallet: 'Wallet',
  continue: 'Continue',
  insufficientBalance: 'Insufficient balance',
  validWalletAddressRequired: 'A valid wallet address is required.',
  amountRequired: 'Amount is required',
  amountTooLow: 'Amount must be at least $0.50',
  walletAddress: 'Wallet Address',
  userRequired: 'Please select a user'
}

const { TERMS_OF_SERVICE } = route

type ValidationError =
  | 'INSUFFICIENT_BALANCE'
  | 'INVALID_ADDRESS'
  | 'AMOUNT_REQUIRED'
  | 'AMOUNT_TOO_LOW'
  | 'USER_REQUIRED'

const SendTokensInput = ({
  mint: initialMint,
  onContinue,
  initialAmount = '',
  initialDestinationAddress = '',
  initialSelectedUser = null,
  initialRecipientType = 'user'
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

  const { spacing } = useTheme()
  const externalWalletAccount = appkitModal.getAccount('solana')
  const isUsingExternalWallet = !!externalWalletAccount?.address

  // Get available tokens
  const { coinsArray: availableCoins, isLoading: coinsLoading } =
    useTradeableCoins({
      includeSol: isUsingExternalWallet
    })
  const { ownedCoins, isLoading: isOwnedCoinsLoading } = useOwnedCoins(
    availableCoins,
    externalWalletAccount?.address
  )

  // Get the coin data and balance for selected token
  const { data: coin } = useFanClub(selectedMint)
  const { data: tokenBalance } = useCoinBalance({
    mint: selectedMint,
    includeExternalWallets: false, // CurrentWalletBanner handles external wallet balance
    includeStaked: false
  })
  const { data: currentUserId } = useCurrentUserId()
  const tokenInfo = coin ? transformFanClubToTokenInfo(coin) : undefined

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
  // If not found in owned coins, try to find it in available coins (for initial load)
  const selectedToken = useMemo(() => {
    const ownedToken = ownedCoins.find(
      (token) => token.address === selectedMint
    )
    if (ownedToken) return ownedToken
    // Fallback to available coins if not in owned coins yet (during initial load)
    return availableCoins.find((token) => token.address === selectedMint)
  }, [ownedCoins, availableCoins, selectedMint])

  const handleTokenChange = useCallback((token: typeof selectedToken) => {
    if (token) {
      setSelectedMint(token.address)
      setAmount('') // Reset amount when changing token
      setAmountError(null)
    }
  }, [])

  const handleAmountChange = useCallback((value: string, weiAmount: bigint) => {
    // Only allow numbers and a single decimal point
    const numericValue = value.replace(/[^0-9.]/g, '')
    // Ensure only one decimal point
    const parts = numericValue.split('.')
    const filteredValue =
      parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue
    setAmount(filteredValue)
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
      default:
        return ''
    }
  }

  const hasErrors = amountError || addressError

  // Show loading state if we don't have tokenInfo yet
  if (!tokenInfo || coinsLoading || isOwnedCoinsLoading) {
    return <SendTokensInputSkeleton />
  }

  if (!selectedToken) {
    return (
      <Flex direction='column' gap='xl' p='xl' alignItems='center'>
        <Text variant='body' size='l' color='subdued'>
          Token not found. Please try again.
        </Text>
      </Flex>
    )
  }

  return (
    <Flex direction='column' gap='xl' p='xl'>
      {/* User/Wallet Segmented Control at Top */}
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

      {/* Trade with Section */}
      <CurrentWalletBanner
        inputToken={{
          mint: selectedToken.address,
          symbol: selectedToken.symbol
        }}
      />

      <Divider orientation='horizontal' color='default' />

      {/* Sending Section */}
      <Flex direction='column' gap='m'>
        <Flex justifyContent='space-between' alignItems='center'>
          <Text variant='title' size='l' color='default'>
            {messages.sending}
          </Text>
        </Flex>

        <Flex direction='column' gap='s'>
          <Flex alignItems='center' gap='s'>
            <Flex flex={1}>
              <TokenAmountInput
                label={tokenInfo.symbol}
                value={amount}
                onChange={handleAmountChange}
                tokenLabel={`$${tokenInfo.symbol}`}
                error={!!amountError}
                decimals={tokenInfo.decimals}
                placeholder='0.00'
              />
            </Flex>

            {ownedCoins.length > 1 ? (
              <Flex css={{ minWidth: spacing.unit15 }}>
                <TokenDropdown
                  selectedToken={selectedToken}
                  availableTokens={ownedCoins}
                  onTokenChange={handleTokenChange}
                />
              </Flex>
            ) : (
              <Flex css={{ minWidth: spacing.unit15 }}>
                <StaticTokenDisplay tokenInfo={selectedToken} />
              </Flex>
            )}
          </Flex>

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

          {amountError && (
            <Text variant='body' size='s' color='danger'>
              {getErrorText(amountError)}
            </Text>
          )}
        </Flex>
      </Flex>

      <Divider orientation='horizontal' color='default' />

      {/* Destination Address/Recipient Section */}
      <Flex direction='column' gap='m'>
        <Flex direction='column' gap='xs'>
          <Text variant='heading' size='s' color='subdued'>
            {recipientType === 'user'
              ? messages.recipient
              : messages.destinationAddress}
          </Text>
          <Text variant='body' size='s' color='default'>
            {recipientType === 'user'
              ? messages.recipientDescriptionUser
              : messages.recipientDescriptionWallet}
          </Text>
        </Flex>

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

      {/* Terms of Use Link */}
      <Text variant='body' size='s' color='subdued'>
        {buySellMessages.termsAgreement}{' '}
        <TextLink href={TERMS_OF_SERVICE} variant='visible' isExternal>
          {buySellMessages.termsOfUse}
        </TextLink>
      </Text>

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
