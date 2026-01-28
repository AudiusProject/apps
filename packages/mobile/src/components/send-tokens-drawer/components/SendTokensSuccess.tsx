import {
  useArtistCoin,
  useCoinBalance,
  transformArtistCoinToTokenInfo
} from '@audius/common/api'
import { User, SquareSizes } from '@audius/common/models'
import { walletMessages } from '@audius/common/messages'
import { makeSolanaTransactionLink } from '@audius/common/utils'
import { AUDIO, FixedDecimal } from '@audius/fixed-decimal'
import { env } from '@audius/common/store'

import {
  Button,
  Flex,
  Text,
  Divider,
  CompletionCheck,
  IconExternalLink,
  Avatar
} from '@audius/harmony-native'
import { BalanceSection } from 'app/components/core'
import { UserLink } from 'app/components/user-link'
import { UserBadges } from 'app/components/user-badges'
import { useProfilePicture } from 'app/hooks/useProfilePicture'
import { ExternalLink } from 'app/harmony-native/components/TextLink/ExternalLink'

type SendTokensSuccessProps = {
  mint: string
  amount: bigint
  destinationAddress: string
  selectedUser: User | null
  signature: string
  onDone: () => void
}

const messages = {
  sent: 'Sent',
  recipient: 'Recipient',
  destinationAddress: 'Destination Address',
  viewOnSolana: 'View On Solana Block Explorer',
  transactionComplete: 'Your transaction is complete!',
  done: 'Done'
}

export const SendTokensSuccess = ({
  mint,
  amount,
  destinationAddress,
  selectedUser,
  signature,
  onDone
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
    return (
      <Flex gap='xl' ph='xl' pb='xl'>
        <BalanceSection mint={mint} internalWalletOnly />
        <Divider />
        <Flex gap='l' flex={1}>
          <Text variant='body' color='subdued'>
            Loading...
          </Text>
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex gap='xl' ph='xl' pb='xl'>
      {/* Token Balance Section */}
      <BalanceSection mint={mint} internalWalletOnly />

      <Divider />

      {/* Sent Section */}
      <Flex column gap='s'>
        <Text variant='heading' size='s' color='subdued'>
          {messages.sent}
        </Text>
        <Flex direction='column' gap='xs'>
          <Text variant='body' size='m' color='default' strength='strong'>
            {tokenInfo.name}
          </Text>
          <Text variant='heading' size='s' color='default'>
            {formatAmount(amount)} ${tokenInfo.symbol}
          </Text>
        </Flex>
      </Flex>

      <Divider />

      {/* To Recipient Section */}
      <Flex direction='column' gap='s'>
        <Text variant='heading' size='s' color='subdued'>
          {messages.recipient}
        </Text>
        {selectedUser ? (
          <Flex row alignItems='center' gap='s'>
            <Avatar
              h={32}
              w={32}
              src={profilePicture}
              borderWidth='thin'
              style={{ flexShrink: 0 }}
            />
            <Flex direction='column' flex={1} style={{ minWidth: 0 }}>
              <Flex row alignItems='center' gap='xs' style={{ minWidth: 0 }}>
                <Text
                  variant='body'
                  size='m'
                  color='default'
                  numberOfLines={1}
                  strength='strong'
                >
                  {selectedUser.name}
                </Text>
                <UserBadges userId={selectedUser.user_id} size='xs' inline />
              </Flex>
              <Text variant='body' size='s' color='subdued' numberOfLines={1}>
                @{selectedUser.handle}
              </Text>
            </Flex>
          </Flex>
        ) : (
          <Text
            variant='body'
            size='m'
            color='default'
            style={{ wordBreak: 'break-all' }}
          >
            {destinationAddress}
          </Text>
        )}
      </Flex>

      <ExternalLink url={makeSolanaTransactionLink(signature)}>
        <Flex row gap='xs' alignItems='center'>
          <Text variant='title' size='s' color='subdued'>
            {messages.viewOnSolana}
          </Text>
          <IconExternalLink color='subdued' size='s' />
        </Flex>
      </ExternalLink>

      <Flex row gap='s' alignItems='center'>
        <CompletionCheck value='complete' />
        <Text variant='heading' size='s' color='default'>
          {messages.transactionComplete}
        </Text>
      </Flex>

      <Button variant='primary' onPress={onDone} fullWidth>
        {messages.done}
      </Button>
    </Flex>
  )
}
