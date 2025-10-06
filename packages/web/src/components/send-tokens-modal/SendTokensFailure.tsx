import {
  useArtistCoin,
  useTokenBalance,
  transformArtistCoinToTokenInfo
} from '@audius/common/api'
import { FixedDecimal } from '@audius/fixed-decimal'
import {
  Button,
  Text,
  Flex,
  Divider,
  CompletionCheck,
  IconExternalLink,
  PlainButton,
  useMedia
} from '@audius/harmony'

import { CryptoBalanceSection } from 'components/buy-sell-modal/CryptoBalanceSection'

interface SendTokensFailureProps {
  mint: string
  amount: bigint
  destinationAddress: string
  error: string
  onTryAgain: () => void
  onClose: () => void
}

const messages = {
  failed: 'Failed',
  destinationAddress: 'Destination Address',
  viewOnSolana: 'View On Solana Block Explorer',
  transactionFailed: 'Your transaction failed to complete.',
  tryAgain: 'Try Again',
  close: 'Close'
}

const SendTokensFailure = ({
  mint,
  amount,
  destinationAddress,
  error,
  onTryAgain,
  onClose
}: SendTokensFailureProps) => {
  const { isMobile } = useMedia()
  // Get token data and balance using the same hooks as ReceiveTokensModal
  const { data: coin } = useArtistCoin(mint)
  const { data: tokenBalance } = useTokenBalance({
    mint,
    includeExternalWallets: false,
    includeStaked: false
  })
  const tokenInfo = coin ? transformArtistCoinToTokenInfo(coin) : undefined
  const currentBalance = tokenBalance?.balance
    ? tokenBalance.balance.value
    : BigInt(0)

  const formatAmount = (amount: bigint) => {
    return new FixedDecimal(amount, tokenInfo?.decimals).toLocaleString(
      'en-US',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }
    )
  }

  const formatBalance = (balance: bigint) => {
    return new FixedDecimal(balance, tokenInfo?.decimals).toLocaleString(
      'en-US',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )
  }

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
        amount={formatBalance(currentBalance)}
      />

      <Divider orientation='horizontal' color='default' />

      {/* Amount Info */}
      <Flex
        direction={isMobile ? 'column' : 'row'}
        gap='m'
        justifyContent='space-between'
      >
        <Text variant='heading' size='s' color='subdued'>
          {messages.failed}
        </Text>
        <Text variant='heading' size='s' color='default'>
          -{formatAmount(amount)} ${tokenInfo.symbol}
        </Text>
      </Flex>

      <Divider orientation='horizontal' color='default' />

      {/* Address Container */}
      <Flex direction='column' gap='m'>
        <Text variant='heading' size='s' color='subdued'>
          {messages.destinationAddress}
        </Text>
        <Text
          variant='body'
          size='m'
          color='default'
          css={{ wordBreak: 'break-all' }}
        >
          {destinationAddress}
        </Text>
        <PlainButton
          variant='subdued'
          css={{ alignSelf: 'flex-start' }}
          onClick={() => {
            window.open(
              `https://explorer.solana.com/address/${destinationAddress}`,
              '_blank'
            )
          }}
          iconRight={IconExternalLink}
        >
          {messages.viewOnSolana}
        </PlainButton>
      </Flex>

      {/* Error Message */}
      <Flex gap='s' alignItems='center'>
        <CompletionCheck value='error' />
        <Text variant='heading' size='s' color='default'>
          {messages.transactionFailed}
        </Text>
      </Flex>

      {/* Error Details */}
      {error && (
        <Flex direction='column' gap='s'>
          <Text variant='body' size='s' color='danger'>
            {error}
          </Text>
        </Flex>
      )}

      {/* Action Buttons */}
      <Flex gap='s' direction='row'>
        <Button variant='secondary' onClick={onClose} fullWidth>
          {messages.close}
        </Button>
        <Button variant='primary' onClick={onTryAgain} fullWidth>
          {messages.tryAgain}
        </Button>
      </Flex>
    </Flex>
  )
}

export default SendTokensFailure
