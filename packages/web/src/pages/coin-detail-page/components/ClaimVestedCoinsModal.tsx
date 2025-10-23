import { useState } from 'react'

import { coinDetailsMessages } from '@audius/common/messages'
import {
  Button,
  Divider,
  Flex,
  IconInfo,
  spacing,
  Text,
  TextInput
} from '@audius/harmony'

import ResponsiveModal from '../../../components/modal/ResponsiveModal'
import Tooltip from '../../../components/tooltip/Tooltip'

const messages = coinDetailsMessages.claimVestedCoinsModal

const DEFAULT_REWARDS_POOL_PERCENT = 50

type ClaimVestedCoinsModalProps = {
  /**
   * Whether the modal is open
   */
  isOpen: boolean
  /**
   * Callback to close the modal
   */
  onClose: () => void
  /**
   * The ticker symbol of the coin
   */
  ticker: string
  /**
   * Total unlocked coins available
   */
  unlockedCoins: number
  /**
   * Callback when user confirms the claim
   */
  onClaim: (rewardsPoolPercentage: number) => void
  /**
   * Whether the claim is in progress
   */
  isClaimPending?: boolean
}

export const ClaimVestedCoinsModal = ({
  isOpen,
  onClose,
  ticker,
  unlockedCoins,
  onClaim,
  isClaimPending = false
}: ClaimVestedCoinsModalProps) => {
  const [rewardsPoolPercentage, setRewardsPoolPercentage] = useState(
    DEFAULT_REWARDS_POOL_PERCENT
  )

  const yourSharePercentage = 100 - rewardsPoolPercentage
  const yourShareAmount = Math.floor(
    (unlockedCoins * yourSharePercentage) / 100
  )
  const rewardsPoolAmount = Math.floor(
    (unlockedCoins * rewardsPoolPercentage) / 100
  )

  const handlePercentageChange = (value: string) => {
    // Remove % symbol if present and any non-digit characters
    const cleanValue = value.replace(/[^\d]/g, '')

    if (cleanValue === '') {
      setRewardsPoolPercentage(0)
      return
    }

    const numValue = parseInt(cleanValue, 10)
    // Clamp between 0 and 100
    const clampedValue = Math.max(0, Math.min(100, numValue))
    setRewardsPoolPercentage(clampedValue)
  }

  const handleClaim = () => {
    onClaim(rewardsPoolPercentage)
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={messages.title}
      showDismissButton
      size='s'
    >
      <Flex column gap='l' p='l'>
        {/* Rewards Pool Allocation Section */}
        <Flex gap='l' alignItems='flex-start'>
          <Flex column gap='s' flex={1}>
            <Flex alignItems='center' gap='s'>
              <Text variant='body' size='s' strength='strong' color='subdued'>
                {messages.rewardsPoolAllocation}
              </Text>
              <Tooltip text={messages.tooltips.rewardsPoolAllocation}>
                <IconInfo size='s' color='subdued' />
              </Tooltip>
            </Flex>
            <Text variant='body' size='m' color='default'>
              {messages.rewardsPoolDescription}
            </Text>
          </Flex>
          <Flex
            column
            alignItems='center'
            justifyContent='center'
            css={{ width: spacing.unit24 }}
          >
            <TextInput
              label=''
              hideLabel
              value={rewardsPoolPercentage.toString()}
              onChange={(e) => handlePercentageChange(e.target.value)}
              type='text'
              inputMode='numeric'
              endAdornmentText='%'
              css={{
                textAlign: 'center'
              }}
            />
          </Flex>
        </Flex>

        <Divider />

        {/* Unlocked Coins */}
        <Flex alignItems='center' justifyContent='space-between'>
          <Flex alignItems='center' gap='s'>
            <Text variant='body' size='s' strength='strong' color='subdued'>
              {messages.unlockedCoins}
            </Text>
            <Tooltip text={messages.tooltips.unlockedCoins}>
              <IconInfo size='s' color='subdued' />
            </Tooltip>
          </Flex>
          <Text variant='body' size='s' color='default'>
            {unlockedCoins.toLocaleString()} ${ticker}
          </Text>
        </Flex>

        {/* Your Share */}
        <Flex alignItems='center' justifyContent='space-between'>
          <Flex alignItems='center' gap='s'>
            <Text variant='body' size='s' strength='strong' color='subdued'>
              {messages.yourShare}
            </Text>
            <Tooltip text={messages.tooltips.yourShare}>
              <IconInfo size='s' color='subdued' />
            </Tooltip>
          </Flex>
          <Flex alignItems='center' gap='s'>
            <Text variant='body' size='s' color='subdued'>
              ({yourSharePercentage}%)
            </Text>
            <Text variant='body' size='s' color='default'>
              {yourShareAmount.toLocaleString()} ${ticker}
            </Text>
          </Flex>
        </Flex>

        {/* Rewards Pool */}
        <Flex alignItems='center' justifyContent='space-between'>
          <Flex alignItems='center' gap='s'>
            <Text variant='body' size='s' strength='strong' color='subdued'>
              {messages.rewardsPool}
            </Text>
            <Tooltip text={messages.tooltips.rewardsPool}>
              <IconInfo size='s' color='subdued' />
            </Tooltip>
          </Flex>
          <Flex alignItems='center' gap='s'>
            <Text variant='body' size='s' color='subdued'>
              ({rewardsPoolPercentage}%)
            </Text>
            <Text variant='body' size='s' color='default'>
              {rewardsPoolAmount.toLocaleString()} ${ticker}
            </Text>
          </Flex>
        </Flex>

        <Button
          variant='primary'
          onClick={handleClaim}
          fullWidth
          disabled={isClaimPending}
          isLoading={isClaimPending}
        >
          {messages.claim}
        </Button>
      </Flex>
    </ResponsiveModal>
  )
}
