import React, { ChangeEvent, useState } from 'react'

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
  Hint,
  Checkbox,
  useTheme,
  Avatar
} from '@audius/harmony'

import { CryptoBalanceSection } from 'components/buy-sell-modal/CryptoBalanceSection'
import UserBadges from 'components/user-badges/UserBadges'
import { useProfilePicture } from 'hooks/useProfilePicture'

interface SendTokensConfirmationProps {
  mint: string
  amount: bigint
  destinationAddress: string
  selectedUser: User | null
  onConfirm: () => void
  onBack: () => void
  onClose: () => void
}

const messages = {
  sendTitle: 'SEND',
  sending: 'Sending',
  toRecipient: 'To Recipient',
  recipient: 'Recipient',
  destinationAddress: 'Destination Address',
  reviewDetails: 'Review Details Carefully',
  reviewDescription:
    'By proceeding, you accept full responsibility for any errors, including the risk of irreversible loss of funds. Transfers are final and cannot be reversed.',
  confirmationText:
    'I have reviewed the information and understand that transfers are final.',
  back: 'Back',
  confirm: 'Confirm',
  loadingTokenInformation: 'Loading token information...'
}

const SendTokensConfirmation = ({
  mint,
  amount,
  destinationAddress,
  selectedUser,
  onConfirm,
  onBack
}: SendTokensConfirmationProps) => {
  const { color } = useTheme()
  const [isConfirmed, setIsConfirmed] = useState(false)

  // Get token data and balance using the same hooks as ReceiveTokensModal
  const { data: coin } = useArtistCoin(mint)
  const { data: tokenBalance } = useCoinBalance({
    mint,
    includeExternalWallets: false,
    includeStaked: false
  })
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

  const formattedBalance =
    tokenBalance?.balance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) ?? ''

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIsConfirmed(event.target.checked)
  }

  // Show loading state if we don't have tokenInfo yet
  if (!tokenInfo) {
    return (
      <Flex direction='column' gap='xl' p='xl' alignItems='center'>
        <Text variant='body' size='l' color='subdued'>
          {messages.loadingTokenInformation}
        </Text>
      </Flex>
    )
  }

  return (
    <Flex column gap='xl' p='xl'>
      {/* Token Balance Section */}
      <CryptoBalanceSection
        tokenInfo={tokenInfo}
        name={tokenInfo.name}
        amount={formattedBalance}
      />

      <Divider orientation='horizontal' />

      {/* Sending Section */}
      <Flex column gap='s'>
        <Text variant='heading' size='s' color='subdued'>
          {messages.sending}
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

      <Divider orientation='horizontal' />

      {/* To Recipient Section */}
      <Flex column gap='s'>
        <Text variant='heading' size='s' color='subdued'>
          {messages.toRecipient}
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
          <Flex column gap='xs'>
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
          </Flex>
        )}
      </Flex>

      {/* Review Details Hint */}
      <Hint noIcon>
        <Flex column gap='s'>
          <Text variant='title' color='default'>
            {messages.reviewDetails}
          </Text>
          <Text variant='body' size='s'>
            {messages.reviewDescription}
          </Text>
          <Flex gap='xl' alignItems='center'>
            <Checkbox checked={isConfirmed} onChange={handleCheckboxChange} />
            <Text variant='body' size='s' css={{ color: color.neutral.n600 }}>
              {messages.confirmationText}
            </Text>
          </Flex>
        </Flex>
      </Hint>

      {/* Action Buttons */}
      <Flex gap='s' row>
        <Button variant='secondary' onClick={onBack} fullWidth>
          {messages.back}
        </Button>
        <Button
          variant='primary'
          onClick={onConfirm}
          disabled={!isConfirmed}
          fullWidth
        >
          {messages.confirm}
        </Button>
      </Flex>
    </Flex>
  )
}

export default SendTokensConfirmation
