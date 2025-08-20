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

import { SendTokensSuccessProps } from './types'

const messages = {
  sent: 'Sent',
  destinationAddress: 'Destination Address',
  viewOnSolana: 'View On Solana Block Explorer',
  transactionComplete: 'Your transaction is complete!',
  done: 'Done'
}

const SendTokensSuccess = ({
  mint,
  amount,
  destinationAddress,
  onDone,
  onClose
}: SendTokensSuccessProps) => {
  const { isMobile } = useMedia()
  // Get token data and balance using the same hooks as ReceiveTokensModal
  const { data: coin } = useArtistCoin({ mint })
  const { data: tokenBalance } = useTokenBalance({ mint })
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
          {messages.sent}
        </Text>
        <Text variant='heading' size='s' color='default'>
          -{formatAmount(amount)} {tokenInfo.symbol}
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

      {/* Success Message */}
      <Flex gap='s' alignItems='center'>
        <CompletionCheck value='complete' />
        <Text variant='heading' size='s' color='default'>
          {messages.transactionComplete}
        </Text>
      </Flex>

      {/* Action Button */}
      <Button variant='primary' onClick={onDone} fullWidth>
        {messages.done}
      </Button>
    </Flex>
  )
}

export default SendTokensSuccess
