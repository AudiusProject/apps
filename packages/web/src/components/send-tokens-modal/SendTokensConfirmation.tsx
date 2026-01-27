import React from 'react'

import {
  useArtistCoin,
  transformArtistCoinToTokenInfo
} from '@audius/common/api'
import { User, SquareSizes } from '@audius/common/models'
import { FixedDecimal } from '@audius/fixed-decimal'
import {
  Button,
  Text,
  Flex,
  Divider,
  Avatar,
  SegmentedControl
} from '@audius/harmony'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { UserLink } from 'components/link'
import { useProfilePicture } from 'hooks/useProfilePicture'

import { SendTokensConfirmationSkeleton } from './SendTokensConfirmationSkeleton'

type RecipientType = 'user' | 'wallet'

interface SendTokensConfirmationProps {
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

const SendTokensConfirmation = ({
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
    return <SendTokensConfirmationSkeleton />
  }

  return (
    <Flex column gap='xl' p='xl'>
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
        disabled
      />

      {/* Please Review Text */}
      <Text variant='body' size='s' color='subdued'>
        {messages.pleaseReview}
      </Text>

      <Divider orientation='horizontal' />

      {/* Sending Section - using CryptoBalanceSection format */}
      <Flex column gap='l'>
        <Text variant='heading' size='s' color='subdued'>
          {messages.sending}
        </Text>
        <Flex alignItems='center' gap='s'>
          <TokenIcon
            logoURI={tokenInfo.logoURI}
            icon={tokenInfo.icon}
            w='4xl'
            h='4xl'
            hex
          />
          <Flex direction='column' gap='xs'>
            <Text variant='heading' size='s'>
              {tokenInfo.name}
            </Text>
            <Flex gap='xs' alignItems='center'>
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

      <Divider orientation='horizontal' />

      {/* To Recipient/Destination Address Section */}
      <Flex column gap='l'>
        <Text variant='heading' size='s' color='subdued'>
          {recipientType === 'user'
            ? messages.toRecipient
            : messages.toDestinationAddress}
        </Text>
        {selectedUser ? (
          <Flex alignItems='center' gap='s'>
            <Avatar
              h='4xl'
              w='4xl'
              src={profilePicture}
              borderWidth='thin'
              css={{ flexShrink: 0 }}
            />
            <Flex direction='column' flex={1} css={{ minWidth: 0 }} gap='xs'>
              <UserLink
                textVariant='heading'
                size='s'
                userId={selectedUser.user_id}
              />
              <Text variant='body' size='l' ellipses>
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

      {/* Action Buttons */}
      <Flex gap='s' row>
        <Button variant='secondary' onClick={onBack} fullWidth>
          {messages.back}
        </Button>
        <Button variant='primary' onClick={onConfirm} fullWidth>
          {messages.confirm}
        </Button>
      </Flex>
    </Flex>
  )
}

export default SendTokensConfirmation
