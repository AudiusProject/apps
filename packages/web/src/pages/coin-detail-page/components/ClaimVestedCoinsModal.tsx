import { useState } from 'react'

import { coinDetailsMessages } from '@audius/common/messages'
import { useClaimVestedCoinsModal } from '@audius/common/store'
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

export const ClaimVestedCoinsModal = () => {
  const { isOpen, onClose, data } = useClaimVestedCoinsModal()
  const { ticker, claimable, onClaim, isClaimPending } = data ?? {}

  const [rewardsPoolPercentage, setRewardsPoolPercentage] = useState(
    DEFAULT_REWARDS_POOL_PERCENT
  )

  const yourSharePercentage = 100 - rewardsPoolPercentage
  const yourShareAmount = claimable
    ? Math.floor((claimable * yourSharePercentage) / 100)
    : 0
  const rewardsPoolAmount = claimable
    ? Math.floor((claimable * rewardsPoolPercentage) / 100)
    : 0

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
    onClaim?.(rewardsPoolPercentage)
  }

  if (!ticker || !claimable || !onClaim) {
    return null
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={messages.title}
      showDismissButton
      size='m'
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
              {messages.claimable}
            </Text>
            <Tooltip text={messages.tooltips.claimable}>
              <IconInfo size='s' color='subdued' />
            </Tooltip>
          </Flex>
          <Text variant='body' size='s' color='default'>
            {claimable.toLocaleString()} ${ticker}
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
