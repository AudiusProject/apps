import { ChangeEvent, useCallback, useState } from 'react'

import {
  useArtistCoin,
  useTokenBalance,
  transformArtistCoinToTokenInfo
} from '@audius/common/api'
import { isValidSolAddress } from '@audius/common/store'
import { FixedDecimal } from '@audius/fixed-decimal'
import {
  Button,
  IconValidationX,
  TokenAmountInput,
  Text,
  Flex,
  Divider
} from '@audius/harmony'

import { CryptoBalanceSection } from 'components/buy-sell-modal/CryptoBalanceSection'

import WalletInput from './WalletInput'

interface SendTokensInputProps {
  mint: string
  onContinue: (amount: bigint, destinationAddress: string) => void
  initialAmount?: string
  initialDestinationAddress?: string
}

const messages = {
  amount: 'Amount',
  amountToSend: 'Amount to Send',
  amountDescription: 'How much {symbol} would you like to send?',
  destinationAddress: 'Destination Address',
  destinationDescription: 'The Solana wallet address to receive funds.',
  continue: 'Continue',
  insufficientBalance: 'Insufficient balance',
  validWalletAddressRequired: 'A valid wallet address is required.',
  amountRequired: 'Amount is required',
  amountTooLow: 'Amount is too low to send',
  walletAddress: 'Wallet Address'
}

type ValidationError =
  | 'INSUFFICIENT_BALANCE'
  | 'INVALID_ADDRESS'
  | 'AMOUNT_REQUIRED'
  | 'AMOUNT_TOO_LOW'

const SendTokensInput = ({
  mint,
  onContinue,
  initialAmount = '',
  initialDestinationAddress = ''
}: SendTokensInputProps) => {
  const [amount, setAmount] = useState(initialAmount)
  const [destinationAddress, setDestinationAddress] = useState(
    initialDestinationAddress
  )
  const [amountError, setAmountError] = useState<ValidationError | null>(null)
  const [addressError, setAddressError] = useState<ValidationError | null>(null)

  // Get the coin data and balance using the same hooks as ReceiveTokensModal
  const { data: coin } = useArtistCoin(mint)
  const { data: tokenBalance } = useTokenBalance({
    mint,
    includeExternalWallets: false,
    includeStaked: false
  })
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

    // Validate address
    if (!destinationAddress) {
      setAddressError('INVALID_ADDRESS')
      isValid = false
    } else if (!isValidSolAddress(destinationAddress as any)) {
      setAddressError('INVALID_ADDRESS')
      isValid = false
    }

    return isValid
  }

  const handleContinue = () => {
    if (validateInputs()) {
      const amountWei = new FixedDecimal(amount, tokenInfo?.decimals).value
      onContinue(amountWei, destinationAddress)
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

      {/* Destination Address Section */}
      <Flex direction='column' gap='m'>
        <Flex direction='column' gap='xs'>
          <Text variant='heading' size='s' color='subdued'>
            {messages.destinationAddress}
          </Text>
          <Text variant='body' size='s' color='default'>
            {messages.destinationDescription}
          </Text>
        </Flex>

        <WalletInput
          label={messages.walletAddress}
          value={destinationAddress}
          onChange={handleAddressChange}
          error={!!addressError}
          helperText={addressError ? getErrorText(addressError) : undefined}
        />
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
