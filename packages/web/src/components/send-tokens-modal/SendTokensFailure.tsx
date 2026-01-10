import {
  useArtistCoin,
  useCoinBalance,
  transformArtistCoinToTokenInfo
} from '@audius/common/api'
import { User, SquareSizes } from '@audius/common/models'
import { FixedDecimal } from '@audius/fixed-decimal'
import {
  Button,
  Text,
  Flex,
  Divider,
  CompletionCheck,
  IconExternalLink,
  PlainButton,
  Avatar
} from '@audius/harmony'

import { CryptoBalanceSection } from 'components/buy-sell-modal/CryptoBalanceSection'
import UserBadges from 'components/user-badges/UserBadges'
import { useProfilePicture } from 'hooks/useProfilePicture'

interface SendTokensFailureProps {
  mint: string
  amount: bigint
  destinationAddress: string
  selectedUser: User | null
  error: string
  onTryAgain: () => void
  onClose: () => void
}

const messages = {
  failed: 'Failed',
  recipient: 'Recipient',
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
  selectedUser,
  error,
  onTryAgain,
  onClose
}: SendTokensFailureProps) => {
  // Get token data and balance using the same hooks as ReceiveTokensModal
  const { data: coin } = useArtistCoin(mint)
  const { data: tokenBalance } = useCoinBalance({
    mint,
    includeExternalWallets: false,
    includeStaked: false
  })
  const tokenInfo = coin ? transformArtistCoinToTokenInfo(coin) : undefined
  const currentBalance = tokenBalance?.balance
    ? tokenBalance.balance.value
    : BigInt(0)

  const profilePicture = useProfilePicture({
    userId: selectedUser?.user_id,
    size: SquareSizes.SIZE_150_BY_150
  })

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

      {/* Failed Section */}
      <Flex column gap='s'>
        <Text variant='heading' size='s' color='subdued'>
          {messages.failed}
        </Text>
        <Flex alignItems='center' gap='s'>
          {/* Token logo would go here */}
          <Flex direction='column' gap='xs'>
            <Text variant='body' size='m' color='default' strength='strong'>
              {tokenInfo.name}
            </Text>
            <Text variant='heading' size='s' color='default'>
              {formatAmount(amount)} ${tokenInfo.symbol}
            </Text>
          </Flex>
        </Flex>
      </Flex>

      <Divider orientation='horizontal' color='default' />

      {/* To Recipient Section */}
      <Flex direction='column' gap='s'>
        <Text variant='heading' size='s' color='subdued'>
          {messages.recipient}
        </Text>
        {selectedUser ? (
          <Flex alignItems='center' gap='s'>
            <Avatar
              h={32}
              w={32}
              src={profilePicture}
              borderWidth='thin'
              css={{ flexShrink: 0 }}
            />
            <Flex direction='column' flex={1} css={{ minWidth: 0 }}>
              <Flex alignItems='center' gap='xs' css={{ minWidth: 0 }}>
                <Text
                  variant='body'
                  size='m'
                  color='default'
                  ellipses
                  strength='strong'
                >
                  {selectedUser.name}
                </Text>
                <UserBadges userId={selectedUser.user_id} size='xs' inline />
              </Flex>
              <Text variant='body' size='s' color='subdued' ellipses>
                @{selectedUser.handle}
              </Text>
            </Flex>
          </Flex>
        ) : (
          <>
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
          </>
        )}
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
