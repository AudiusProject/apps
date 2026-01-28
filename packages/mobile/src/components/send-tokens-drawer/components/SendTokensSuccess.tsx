import {
  useArtistCoin,
  transformArtistCoinToTokenInfo
} from '@audius/common/api'
import type { User } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { makeSolanaTransactionLink } from '@audius/common/utils'
import { FixedDecimal } from '@audius/fixed-decimal'

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
import { useProfilePicture } from 'app/components/image/UserImage'
import { UserBadges } from 'app/components/user-badges'
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
  const tokenInfo = coin ? transformArtistCoinToTokenInfo(coin) : undefined

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
              source={profilePicture.source}
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
                <UserBadges userId={selectedUser.user_id} badgeSize='xs' />
              </Flex>
              <Text variant='body' size='s' color='subdued' numberOfLines={1}>
                @{selectedUser.handle}
              </Text>
            </Flex>
          </Flex>
        ) : (
          <Text variant='body' size='m' color='default' numberOfLines={0}>
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
