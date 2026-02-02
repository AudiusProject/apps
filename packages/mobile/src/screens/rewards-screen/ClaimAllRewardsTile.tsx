import { useCallback, useMemo } from 'react'

import { useCurrentAccount, useCurrentAccountUser } from '@audius/common/api'
import { useChallengeCooldownSchedule } from '@audius/common/hooks'
import type { CommonState } from '@audius/common/store'
import { challengesSelectors, modalsActions } from '@audius/common/store'
import { formatNumberCommas } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

import {
  Button,
  Divider,
  Flex,
  IconArrowRight,
  Paper,
  Text
} from '@audius/harmony-native'
import { TooltipInfoIcon } from 'app/components/buy-sell/TooltipInfoIcon'

const { getOptimisticUserChallenges } = challengesSelectors

const { setVisibility } = modalsActions

const messages = {
  pending: 'Pending',
  claimAllRewards: 'Claim All Rewards',
  moreInfo: 'More Info',
  available: '$AUDIO available',
  now: 'now!',
  totalReadyToClaim: 'Ready to Claim',
  availableMessage: (summaryItems: any[]) => {
    const filteredSummaryItems = summaryItems.filter(Boolean)
    const summaryItem = filteredSummaryItems.pop()
    const { value, label, claimableDate, isClose } = summaryItem ?? {}
    if (isClose) {
      return `${value} ${messages.available} ${label}`
    }
    return (
      <Text>
        {value} {messages.available} {label}&nbsp;
        <Text color='subdued'>{claimableDate.format('(M/D)')}</Text>
      </Text>
    )
  }
}

export const ClaimAllRewardsTile = () => {
  const dispatch = useDispatch()
  const { cooldownAmount, claimableAmount, isEmpty } =
    useChallengeCooldownSchedule({ multiple: true })
  const { data: currentAccount } = useCurrentAccount()
  const { data: currentUser } = useCurrentAccountUser()
  const optimisticUserChallenges = useSelector((state: CommonState) =>
    getOptimisticUserChallenges(state, currentAccount, currentUser)
  )

  // Calculate total claimed amount
  const totalClaimed = useMemo(() => {
    return Object.values(optimisticUserChallenges).reduce(
      (sum, challenge) => sum + (challenge?.disbursed_amount ?? 0),
      0
    )
  }, [optimisticUserChallenges])

  // Pending amount is the cooldown amount
  const pendingAmount = cooldownAmount

  const openClaimAllModal = useCallback(() => {
    dispatch(setVisibility({ modal: 'ClaimAllRewards', visible: true }))
  }, [dispatch])

  if (isEmpty) return null

  const tooltipMessages = {
    totalClaimed: 'Total amount of $AUDIO you have claimed from all rewards',
    pending: 'Amount of $AUDIO pending in cooldown period',
    readyToClaim: 'Amount of $AUDIO ready to claim now'
  }

  return (
    <Paper shadow='near' border='strong' p='l' style={{ gap: 16 }}>
      <Text variant='heading' color='accent' size='m'>
        Your Rewards
      </Text>
      <Flex column style={{ gap: 16, width: '100%' }}>
        {/* First row: Total Claimed and Pending */}
        <Flex row alignItems='stretch' style={{ gap: 32, width: '100%' }}>
          <Flex column flex={1} style={{ gap: 4 }}>
            <Flex row alignItems='center' style={{ gap: 4 }}>
              <Text variant='title' size='l' color='default'>
                {formatNumberCommas(totalClaimed)}
              </Text>
              <Text variant='body' size='l' strength='strong' color='subdued'>
                $AUDIO
              </Text>
            </Flex>
            <Flex row alignItems='center' style={{ gap: 4 }}>
              <Text variant='label' size='xs' color='default'>
                TOTAL CLAIMED
              </Text>
              <TooltipInfoIcon
                title='Total Claimed'
                message={tooltipMessages.totalClaimed}
              />
            </Flex>
          </Flex>
          <Divider orientation='vertical' />
          <Flex column flex={1} style={{ gap: 4 }}>
            <Flex row alignItems='center' style={{ gap: 4 }}>
              <Text variant='title' size='l' color='default'>
                {formatNumberCommas(pendingAmount)}
              </Text>
              <Text variant='body' size='l' strength='strong' color='subdued'>
                $AUDIO
              </Text>
            </Flex>
            <Flex row alignItems='center' style={{ gap: 4 }}>
              <Text variant='label' size='xs' color='default'>
                PENDING
              </Text>
              <TooltipInfoIcon
                title='Pending'
                message={tooltipMessages.pending}
              />
            </Flex>
          </Flex>
        </Flex>
        {/* Second row: Ready to Claim */}
        <Flex column style={{ gap: 4, width: '100%' }}>
          <Flex row alignItems='center' style={{ gap: 4 }}>
            <Text variant='title' size='l' color='default'>
              {formatNumberCommas(claimableAmount)}
            </Text>
            <Text variant='body' size='l' strength='strong' color='subdued'>
              $AUDIO
            </Text>
          </Flex>
          <Flex row alignItems='center' style={{ gap: 4 }}>
            <Text variant='label' size='xs' color='default'>
              READY TO CLAIM
            </Text>
            <TooltipInfoIcon
              title='Ready To Claim'
              message={tooltipMessages.readyToClaim}
            />
          </Flex>
        </Flex>
      </Flex>
      {claimableAmount > 0 ? (
        <Button
          onPress={openClaimAllModal}
          iconRight={IconArrowRight}
          variant='primary'
          size='small'
        >
          Claim All
        </Button>
      ) : null}
    </Paper>
  )
}
