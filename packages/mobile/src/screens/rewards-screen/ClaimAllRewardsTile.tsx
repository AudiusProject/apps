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

const { getOptimisticUserChallenges } = challengesSelectors

const { setVisibility } = modalsActions

const messages = {
  yourRewards: 'Your Rewards',
  totalClaimed: 'TOTAL CLAIMED',
  pending: 'PENDING',
  readyToClaim: 'READY TO CLAIM',
  claimAll: 'Claim All',
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

  return (
    <Paper shadow='near' border='strong' p='l' style={{ gap: 16 }}>
      <Text variant='heading' color='accent' size='m'>
        {messages.yourRewards}
      </Text>
      <Flex column style={{ gap: 16, width: '100%' }}>
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
            <Text variant='label' size='xs' color='default'>
              {messages.totalClaimed}
            </Text>
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
            <Text variant='label' size='xs' color='default'>
              {messages.pending}
            </Text>
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
          <Text variant='label' size='xs' color='default'>
            {messages.readyToClaim}
          </Text>
        </Flex>
      </Flex>
      {claimableAmount > 0 ? (
        <Button
          onPress={openClaimAllModal}
          iconRight={IconArrowRight}
          variant='primary'
          size='small'
        >
          {messages.claimAll}
        </Button>
      ) : null}
    </Paper>
  )
}
