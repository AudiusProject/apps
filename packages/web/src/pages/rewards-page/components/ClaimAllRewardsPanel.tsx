import { useCallback, useMemo } from 'react'

import { useCurrentAccount, useCurrentAccountUser } from '@audius/common/api'
import { useChallengeCooldownSchedule } from '@audius/common/hooks'
import { challengesSelectors, CommonState } from '@audius/common/store'
import { formatNumberCommas } from '@audius/common/utils'
import {
  Button,
  Divider,
  Flex,
  IconArrowRight as IconArrow,
  IconInfo,
  Paper,
  Text,
  Tooltip
} from '@audius/harmony'
import { useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import { useIsMobile } from 'hooks/useIsMobile'

const { getOptimisticUserChallenges } = challengesSelectors

const messages = {
  yourRewards: 'Your Rewards',
  totalClaimed: 'Total Claimed',
  pending: 'Pending',
  readyToClaim: 'Ready to Claim',
  claimAll: 'Claim All'
}

export const ClaimAllRewardsPanel = () => {
  const isMobile = useIsMobile() || window.innerWidth < 1080
  const { cooldownAmount, claimableAmount, isEmpty } =
    useChallengeCooldownSchedule({ multiple: true })
  const [, setClaimAllRewardsVisibility] = useModalState('ClaimAllRewards')
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

  const onClickClaimAllRewards = useCallback(() => {
    setClaimAllRewardsVisibility(true)
  }, [setClaimAllRewardsVisibility])

  if (isEmpty) return null

  const tooltipMessages = {
    totalClaimed: 'Total amount of $AUDIO you have claimed from all rewards',
    pending: 'Amount of $AUDIO pending in cooldown period',
    readyToClaim: 'Amount of $AUDIO ready to claim now'
  }

  if (isMobile) {
    return (
      <Paper
        border='strong'
        p='l'
        mt='l'
        css={{
          padding: '24px',
          gap: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start'
        }}
      >
        <Text variant='heading' size='m' color='accent'>
          {messages.yourRewards}
        </Text>
        <Flex column gap='l' w='100%' css={{ gap: '16px' }}>
          {/* First row: Total Claimed and Pending */}
          <Flex gap='l' alignItems='stretch' w='100%' css={{ gap: '32px' }}>
            <Flex column gap='xs' flex={1} css={{ gap: '4px' }}>
              <Flex gap='xs' alignItems='center' css={{ gap: '4px' }}>
                <Text variant='title' size='l' color='default'>
                  {formatNumberCommas(totalClaimed)}
                </Text>
                <Text variant='body' size='l' strength='strong' color='subdued'>
                  $AUDIO
                </Text>
              </Flex>
              <Flex gap='xs' alignItems='center' css={{ gap: '4px' }}>
                <Text variant='label' size='xs' color='default'>
                  {messages.totalClaimed}
                </Text>
                <Tooltip text={tooltipMessages.totalClaimed} mount='body'>
                  <IconInfo size='xs' color='subdued' />
                </Tooltip>
              </Flex>
            </Flex>
            <Divider orientation='vertical' />
            <Flex column gap='xs' flex={1} css={{ gap: '4px' }}>
              <Flex gap='xs' alignItems='center' css={{ gap: '4px' }}>
                <Text variant='title' size='l' color='default'>
                  {formatNumberCommas(pendingAmount)}
                </Text>
                <Text variant='body' size='l' strength='strong' color='subdued'>
                  $AUDIO
                </Text>
              </Flex>
              <Flex gap='xs' alignItems='center' css={{ gap: '4px' }}>
                <Text variant='label' size='xs' color='default'>
                  {messages.pending}
                </Text>
                <Tooltip text={tooltipMessages.pending} mount='body'>
                  <IconInfo size='xs' color='subdued' />
                </Tooltip>
              </Flex>
            </Flex>
          </Flex>
          {/* Second row: Ready to Claim */}
          <Flex column gap='xs' w='100%' css={{ gap: '4px' }}>
            <Flex gap='xs' alignItems='center' css={{ gap: '4px' }}>
              <Text variant='title' size='l' color='default'>
                {formatNumberCommas(claimableAmount)}
              </Text>
              <Text variant='body' size='l' strength='strong' color='subdued'>
                $AUDIO
              </Text>
            </Flex>
            <Flex gap='xs' alignItems='center' css={{ gap: '4px' }}>
              <Text variant='label' size='xs' color='default'>
                {messages.readyToClaim}
              </Text>
              <Tooltip text={tooltipMessages.readyToClaim} mount='body'>
                <IconInfo size='xs' color='subdued' />
              </Tooltip>
            </Flex>
          </Flex>
        </Flex>
        {claimableAmount > 0 ? (
          <Button
            onClick={onClickClaimAllRewards}
            iconRight={IconArrow}
            fullWidth
          >
            {messages.claimAll}
          </Button>
        ) : null}
      </Paper>
    )
  }

  return (
    <Paper
      border='strong'
      p='xl'
      css={{
        padding: '24px',
        gap: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
      }}
    >
      <Text variant='heading' size='m' color='accent'>
        {messages.yourRewards}
      </Text>
      <Flex
        gap='l'
        alignItems='center'
        justifyContent='space-between'
        w='100%'
        css={{
          gap: '32px'
        }}
      >
        <Flex gap='l' alignItems='center' flex={1} css={{ gap: '32px' }}>
          <Flex column gap='xs' css={{ gap: '4px' }}>
            <Flex gap='xs' alignItems='center' css={{ gap: '4px' }}>
              <Text variant='title' size='l' color='default'>
                {formatNumberCommas(totalClaimed)}
              </Text>
              <Text variant='body' size='l' strength='strong' color='subdued'>
                $AUDIO
              </Text>
            </Flex>
            <Flex gap='xs' alignItems='center' css={{ gap: '4px' }}>
              <Text variant='label' size='xs' color='default'>
                {messages.totalClaimed}
              </Text>
              <Tooltip text={tooltipMessages.totalClaimed} mount='body'>
                <IconInfo size='xs' color='subdued' />
              </Tooltip>
            </Flex>
          </Flex>
          <Divider orientation='vertical' />
          <Flex column gap='xs' css={{ gap: '4px' }}>
            <Flex gap='xs' alignItems='center' css={{ gap: '4px' }}>
              <Text variant='title' size='l' color='default'>
                {formatNumberCommas(pendingAmount)}
              </Text>
              <Text variant='body' size='l' strength='strong' color='subdued'>
                $AUDIO
              </Text>
            </Flex>
            <Flex gap='xs' alignItems='center' css={{ gap: '4px' }}>
              <Text variant='label' size='xs' color='default'>
                {messages.pending}
              </Text>
              <Tooltip text={tooltipMessages.pending} mount='body'>
                <IconInfo size='xs' color='subdued' />
              </Tooltip>
            </Flex>
          </Flex>
          <Divider orientation='vertical' />
          <Flex
            column
            gap='xs'
            flex={1}
            css={{ gap: '4px', minWidth: '300px' }}
          >
            <Flex gap='2xl' alignItems='center' w='100%'>
              <Flex column gap='xs' css={{ gap: '4px' }}>
                <Flex gap='xs' alignItems='center' css={{ gap: '4px' }}>
                  <Text variant='title' size='l' color='default'>
                    {formatNumberCommas(claimableAmount)}
                  </Text>
                  <Text
                    variant='body'
                    size='l'
                    strength='strong'
                    color='subdued'
                  >
                    $AUDIO
                  </Text>
                </Flex>
                <Flex gap='xs' alignItems='center' css={{ gap: '4px' }}>
                  <Text variant='label' size='xs' color='default'>
                    {messages.readyToClaim}
                  </Text>
                  <Tooltip text={tooltipMessages.readyToClaim} mount='body'>
                    <IconInfo size='xs' color='subdued' />
                  </Tooltip>
                </Flex>
              </Flex>
              {claimableAmount > 0 ? (
                <Button
                  onClick={onClickClaimAllRewards}
                  iconRight={IconArrow}
                  css={{ flex: '1 1 0' }}
                >
                  {messages.claimAll}
                </Button>
              ) : null}
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Paper>
  )
}
