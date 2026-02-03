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
  IconExternalLink,
  Avatar
} from '@audius/harmony-native'
import { TokenIcon } from 'app/components/core'
import { useProfilePicture } from 'app/components/image/UserImage'
import { UserLink } from 'app/components/user-link'
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
  sentSuccessfully: 'Sent successfully',
  recipient: 'Recipient',
  destinationAddress: 'Destination Address',
  viewOnSolana: 'View On Solana Block Explorer',
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
      {/* Sent Successfully Message */}
      <Text variant='title' size='l' color='default'>
        {messages.sentSuccessfully}
      </Text>

      {/* Sent Amount Section */}
      <Flex row alignItems='center' gap='s'>
        <TokenIcon logoURI={tokenInfo.logoURI} size={64} />
        <Flex direction='column' gap='xs'>
          <Text variant='heading' size='s'>
            {tokenInfo.name}
          </Text>
          <Flex row gap='xs' alignItems='center'>
            <Text variant='title' size='l'>
              {formatAmount(amount)}
            </Text>
            <Text variant='title' size='l' color='subdued'>
              ${tokenInfo.symbol}
            </Text>
          </Flex>
        </Flex>
      </Flex>

      {/* Recipient Section */}
      <Flex gap='l'>
        <Flex row alignItems='center' gap='l'>
          <Text variant='heading' size='s'>
            {messages.recipient}
          </Text>
          <Divider w='100%' />
        </Flex>
        {selectedUser ? (
          <Flex row alignItems='center' gap='s'>
            <Avatar
              source={profilePicture.source}
              borderWidth='thin'
              style={{ flexShrink: 0 }}
            />
            <Flex direction='column' flex={1} style={{ minWidth: 0 }} gap='xs'>
              <UserLink userId={selectedUser.user_id} />
              <Text variant='body' size='l' numberOfLines={1}>
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

      {/* View on Block Explorer */}
      <ExternalLink url={makeSolanaTransactionLink(signature)}>
        <Flex row gap='xs' alignItems='center'>
          <Text variant='title' size='s' color='subdued'>
            {messages.viewOnSolana}
          </Text>
          <IconExternalLink color='subdued' size='s' />
        </Flex>
      </ExternalLink>

      {/* Done Button */}
      <Button variant='primary' onPress={onDone} fullWidth>
        {messages.done}
      </Button>
    </Flex>
  )
}
