import {
  useArtistCoin,
  transformArtistCoinToTokenInfo
} from '@audius/common/api'
import { User, SquareSizes } from '@audius/common/models'
import { walletMessages } from '@audius/common/messages'
import { FixedDecimal } from '@audius/fixed-decimal'

import { Button, Flex, Text, Divider, Avatar } from '@audius/harmony-native'
import { BalanceSection, SegmentedControl } from 'app/components/core'
import { TokenIcon } from 'app/components/core'
import { UserLink } from 'app/components/user-link'
import { useProfilePicture } from 'app/hooks/useProfilePicture'

type RecipientType = 'user' | 'wallet'

type SendTokensConfirmationProps = {
  mint: string
  amount: bigint
  destinationAddress: string
  selectedUser: User | null
  recipientType: RecipientType
  onConfirm: () => void
  onBack: () => void
  onClose: () => void
}

const messages = {
  sending: 'Sending',
  toRecipient: 'To Recipient',
  toDestinationAddress: 'To Destination Address',
  recipient: 'Recipient',
  destinationAddress: 'Destination Address',
  user: 'User',
  wallet: 'Wallet',
  pleaseReview:
    'Please review your transaction details. This action cannot be undone.',
  back: 'Back',
  confirm: 'Confirm'
}

export const SendTokensConfirmation = ({
  mint,
  amount,
  destinationAddress,
  selectedUser,
  recipientType,
  onConfirm,
  onBack
}: SendTokensConfirmationProps) => {
  // Get token data
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
      {/* Segmented Control (not clickable) */}
      <SegmentedControl
        options={[
          { key: 'user', text: messages.user },
          { key: 'wallet', text: messages.wallet }
        ]}
        selected={recipientType}
        onSelectOption={() => {
          // Intentionally empty - not clickable on confirmation screen
        }}
      />

      {/* Please Review Text */}
      <Text variant='body' size='s' color='subdued'>
        {messages.pleaseReview}
      </Text>

      <Divider />

      {/* Sending Section */}
      <Flex gap='l'>
        <Text variant='heading' size='s' color='subdued'>
          {messages.sending}
        </Text>
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
      </Flex>

      <Divider />

      {/* To Recipient/Destination Address Section */}
      <Flex gap='l'>
        <Text variant='heading' size='s' color='subdued'>
          {recipientType === 'user'
            ? messages.toRecipient
            : messages.toDestinationAddress}
        </Text>
        {selectedUser ? (
          <Flex row alignItems='center' gap='s'>
            <Avatar
              h={64}
              w={64}
              src={profilePicture}
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

      {/* Action Buttons */}
      <Flex gap='s' row>
        <Button variant='secondary' onPress={onBack} fullWidth>
          {messages.back}
        </Button>
        <Button variant='primary' onPress={onConfirm} fullWidth>
          {messages.confirm}
        </Button>
      </Flex>
    </Flex>
  )
}
