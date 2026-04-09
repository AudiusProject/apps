import { useFanClub, transformFanClubToTokenInfo } from '@audius/common/api'
import type { User } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
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

type SendTokensFailureProps = {
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

export const SendTokensFailure = ({
  mint,
  amount,
  destinationAddress,
  selectedUser,
  error,
  onTryAgain,
  onClose
}: SendTokensFailureProps) => {
  // Get token data
  const { data: coin } = useFanClub(mint)
  const tokenInfo = coin ? transformFanClubToTokenInfo(coin) : undefined

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

      {/* Failed Section */}
      <Flex column gap='s'>
        <Text variant='heading' size='s' color='subdued'>
          {messages.failed}
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
          <>
            <Text variant='body' size='m' color='default' numberOfLines={0}>
              {destinationAddress}
            </Text>
            <ExternalLink
              url={`https://explorer.solana.com/address/${destinationAddress}`}
            >
              <Flex row gap='xs' alignItems='center'>
                <Text variant='title' size='s' color='subdued'>
                  {messages.viewOnSolana}
                </Text>
                <IconExternalLink color='subdued' size='s' />
              </Flex>
            </ExternalLink>
          </>
        )}
      </Flex>

      {/* Error Message */}
      <Flex row gap='s' alignItems='center'>
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
        <Button variant='secondary' onPress={onClose} fullWidth>
          {messages.close}
        </Button>
        <Button variant='primary' onPress={onTryAgain} fullWidth>
          {messages.tryAgain}
        </Button>
      </Flex>
    </Flex>
  )
}
