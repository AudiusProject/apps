import { useCallback } from 'react'

import { useChallengeCooldownSchedule } from '@audius/common/hooks'
import { route, formatNumberCommas } from '@audius/common/utils'
import {
  Button,
  Flex,
  IconArrowRight,
  Paper,
  PlainButton,
  Text
} from '@audius/harmony'
import { useNavigate } from 'react-router'

import { useModalState } from 'common/hooks/useModalState'

const { REWARDS_PAGE } = route

const messages = {
  yourRewards: 'Your Rewards',
  readyToClaim: 'Ready to Claim',
  claimAll: 'Claim All',
  viewAll: 'View All Rewards'
}

export const RewardsSummaryCard = () => {
  const { claimableAmount, isEmpty } = useChallengeCooldownSchedule({
    multiple: true
  })
  const [, setClaimAllRewardsVisibility] = useModalState('ClaimAllRewards')
  const navigate = useNavigate()

  const onClickClaim = useCallback(() => {
    setClaimAllRewardsVisibility(true)
  }, [setClaimAllRewardsVisibility])

  const onClickViewAll = useCallback(() => {
    navigate(REWARDS_PAGE)
  }, [navigate])

  if (isEmpty) return null

  return (
    <Paper border='strong' p='l' direction='column' gap='m'>
      <Flex justifyContent='space-between' alignItems='center' w='100%'>
        <Text variant='heading' size='s' color='accent'>
          {messages.yourRewards}
        </Text>
        <PlainButton
          onClick={onClickViewAll}
          iconRight={IconArrowRight}
          variant='subdued'
        >
          {messages.viewAll}
        </PlainButton>
      </Flex>
      <Flex gap='l' alignItems='center' justifyContent='space-between' w='100%'>
        <Flex column gap='xs'>
          <Flex gap='xs' alignItems='baseline'>
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
        {claimableAmount > 0 ? (
          <Button onClick={onClickClaim} iconRight={IconArrowRight}>
            {messages.claimAll}
          </Button>
        ) : null}
      </Flex>
    </Paper>
  )
}
