import { useCallback, useMemo } from 'react'

import { useCurrentAccount, useCurrentAccountUser } from '@audius/common/api'
import {
  formatCooldownChallenges,
  useChallengeCooldownSchedule
} from '@audius/common/hooks'
import { challengesSelectors, modalsActions, CommonState } from '@audius/common/store'
import { formatNumberCommas } from '@audius/common/utils'
import { Image, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  Button,
  Divider,
  Flex,
  IconArrowRight,
  IconInfo,
  Paper,
  Text
} from '@audius/harmony-native'
import { TooltipInfoIcon } from 'app/components/buy-sell/TooltipInfoIcon'
import TokenStill from 'app/assets/images/tokenSpinStill.png'
import { makeStyles } from 'app/styles'

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

const useStyles = makeStyles(({ spacing, typography }) => ({
  pillContainer: {
    height: spacing(6),
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start'
  },
  pillMessage: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    fontSize: typography.fontSize.small,
    fontFamily: typography.fontByWeight.demiBold,
    lineHeight: spacing(4),
    borderWidth: 1,
    borderRadius: 12,
    borderColor: 'rgba(133,129,153,0.1)',
    overflow: 'hidden'
  },
  readyToClaimPill: {
    backgroundColor: 'rgba(133,129,153,0.1)'
  },
  token: {
    width: 24,
    height: 24
  }
}))

export const ClaimAllRewardsTile = () => {
  const styles = useStyles()
  const dispatch = useDispatch()
  const { cooldownChallenges, cooldownAmount, claimableAmount, isEmpty } =
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
    <Paper shadow='near' border='strong' p='l' gap='l'>
      <Text variant='heading' color='accent' size='s'>
        Your Rewards
      </Text>
      <Flex column gap='l'>
        {/* First row: Total Claimed and Pending */}
        <Flex gap='l' alignItems='stretch'>
          <Flex column gap='xs' flex={1}>
            <Flex gap='xs' alignItems='center'>
              <Text variant='title' size='m' color='default'>
                {formatNumberCommas(totalClaimed)}
              </Text>
              <Text variant='body' size='m' color='subdued' strength='demi'>
                $AUDIO
              </Text>
            </Flex>
            <Flex gap='xs' alignItems='center'>
              <Text variant='label' size='s' color='default' strength='strong'>
                TOTAL CLAIMED
              </Text>
              <TooltipInfoIcon
                title='Total Claimed'
                message={tooltipMessages.totalClaimed}
              />
            </Flex>
          </Flex>
          <Divider orientation='vertical' />
          <Flex column gap='xs' flex={1}>
            <Flex gap='xs' alignItems='center'>
              <Text variant='title' size='m' color='default'>
                {formatNumberCommas(pendingAmount)}
              </Text>
              <Text variant='body' size='m' color='subdued' strength='demi'>
                $AUDIO
              </Text>
            </Flex>
            <Flex gap='xs' alignItems='center'>
              <Text variant='label' size='s' color='default' strength='strong'>
                PENDING
              </Text>
              <TooltipInfoIcon title='Pending' message={tooltipMessages.pending} />
            </Flex>
          </Flex>
        </Flex>
        {/* Second row: Ready to Claim */}
        <Flex column gap='xs'>
          <Flex gap='xs' alignItems='center'>
            <Text variant='title' size='m' color='default'>
              {formatNumberCommas(claimableAmount)}
            </Text>
            <Text variant='body' size='m' color='subdued' strength='demi'>
              $AUDIO
            </Text>
          </Flex>
          <Flex gap='xs' alignItems='center'>
            <Text variant='label' size='s' color='default' strength='strong'>
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
          size='small'
        >
          Claim All
        </Button>
      ) : null}
    </Paper>
  )
}
