import {
  useArtistCoin,
  useCoinBalance,
  transformArtistCoinToTokenInfo
} from '@audius/common/api'
import { User, SquareSizes } from '@audius/common/models'
import { makeSolanaTransactionLink } from '@audius/common/utils'
import { AUDIO, FixedDecimal } from '@audius/fixed-decimal'
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
import { env } from 'services/env'

import { SendTokensSuccessSkeleton } from './SendTokensConfirmationSkeleton'

interface SendTokensSuccessProps {
  mint: string
  amount: bigint
  destinationAddress: string
  selectedUser: User | null
  signature: string
  onClose: () => void
}

const messages = {
  sent: 'Sent',
  recipient: 'Recipient',
  destinationAddress: 'Destination Address',
  viewOnSolana: 'View On Solana Block Explorer',
  transactionComplete: 'Your transaction is complete!',
  done: 'Done'
}

const SendTokensSuccess = ({
  mint,
  amount,
  destinationAddress,
  selectedUser,
  signature,
  onClose
}: SendTokensSuccessProps) => {
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
  const isAudio = mint === env.WAUDIO_MINT_ADDRESS

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
    if (isAudio) {
      return AUDIO(balance).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }
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
    return <SendTokensSuccessSkeleton />
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

      {/* Sent Section */}
      <Flex column gap='s'>
        <Text variant='heading' size='s' color='subdued'>
          {messages.sent}
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
          <Text
            variant='body'
            size='m'
            color='default'
            css={{ wordBreak: 'break-all' }}
          >
            {destinationAddress}
          </Text>
        )}
      </Flex>

      <PlainButton
        variant='subdued'
        css={{ alignSelf: 'flex-start' }}
        onClick={() => {
          window.open(makeSolanaTransactionLink(signature), '_blank')
        }}
        iconRight={IconExternalLink}
      >
        {messages.viewOnSolana}
      </PlainButton>

      <Flex gap='s' alignItems='center'>
        <CompletionCheck value='complete' />
        <Text variant='heading' size='s' color='default'>
          {messages.transactionComplete}
        </Text>
      </Flex>

      <Button variant='primary' onClick={onClose} fullWidth>
        {messages.done}
      </Button>
    </Flex>
  )
}

export default SendTokensSuccess
