import React, { useMemo } from 'react'

import { useCurrentAccount, useCurrentAccountUser } from '@audius/common/api'
import { ChallengeName } from '@audius/common/models'
import {
  challengesSelectors,
  audioRewardsPageSelectors,
  ClaimStatus,
  CommonState
} from '@audius/common/store'
import {
  challengeRewardsConfig,
  getChallengeStatusLabel
} from '@audius/common/utils'
import { Box, Flex, Text, IconCheck } from '@audius/harmony'
import { useSelector } from 'react-redux'

import { useIsMobile } from 'hooks/useIsMobile'

import { ChallengeRewardsLayout } from './ChallengeRewardsLayout'
import { ClaimButton } from './ClaimButton'
import { CooldownSummaryTable } from './CooldownSummaryTable'
import { ChallengeContentProps } from './types'

const { getOptimisticUserChallenges } = challengesSelectors
const { getUndisbursedUserChallenges, getClaimStatus } =
  audioRewardsPageSelectors

const messages = {
  title250: '250 PLAYS',
  title1000: '1,000 PLAYS',
  title10000: '10,000 PLAYS',
  description250:
    challengeRewardsConfig[ChallengeName.PlayCount250].description(),
  description1000:
    challengeRewardsConfig[ChallengeName.PlayCount1000].description(),
  description10000:
    challengeRewardsConfig[ChallengeName.PlayCount10000].description(),
  progressLabel: 'PLAYS',
  close: 'Close'
}

export const PlayCountMilestoneContent = ({
  challengeName,
  onNavigateAway,
  errorContent
}: ChallengeContentProps) => {
  const isMobile = useIsMobile()
  const { data: currentAccount } = useCurrentAccount()
  const { data: currentUser } = useCurrentAccountUser()
  const userChallenges = useSelector((state: CommonState) =>
    getOptimisticUserChallenges(state, currentAccount, currentUser)
  )
  const challenge = userChallenges[challengeName]
  const undisbursedUserChallenges = useSelector(getUndisbursedUserChallenges)
  const claimStatus = useSelector(getClaimStatus)
  const claimInProgress =
    claimStatus === ClaimStatus.CLAIMING ||
    claimStatus === ClaimStatus.WAITING_FOR_RETRY

  const { description, targetPlays, currentPlays } = useMemo(() => {
    let description = ''

    switch (challengeName) {
      case ChallengeName.PlayCount250:
        description = messages.description250
        break
      case ChallengeName.PlayCount1000:
        description = messages.description1000
        break
      case ChallengeName.PlayCount10000:
        description = messages.description10000
        break
      default:
        description = messages.description250
    }

    const targetPlays =
      challengeName === ChallengeName.PlayCount250
        ? 250
        : challengeName === ChallengeName.PlayCount1000
          ? 1000
          : challengeName === ChallengeName.PlayCount10000
            ? 10000
            : 250

    const currentPlays = challenge?.current_step_count || 0

    return { description, targetPlays, currentPlays }
  }, [challengeName, challenge])

  const statusText = challenge
    ? getChallengeStatusLabel(challenge, challengeName)
    : ''

  const isClaimable =
    challenge?.claimableAmount && challenge.claimableAmount > 0

  const descriptionContent = (
    <Box>
      <Text variant='body' strength='default'>
        {description}
      </Text>
    </Box>
  )

  const progressStatusLabel = (
    <Flex
      ph='xl'
      backgroundColor='surface1'
      border='default'
      borderRadius='s'
      column={isMobile}
    >
      <Flex pv='l' gap='s' w='100%' justifyContent='center' alignItems='center'>
        {isClaimable ? <IconCheck size='s' color='subdued' /> : null}
        <Text variant='label' size='l' color='subdued'>
          {statusText}
        </Text>
      </Flex>
    </Flex>
  )

  const additionalContent = challenge?.cooldown_days ? (
    <CooldownSummaryTable challengeId={challengeName} />
  ) : null

  const actions = (
    <ClaimButton
      challenge={challenge}
      claimInProgress={claimInProgress}
      onClose={onNavigateAway}
      undisbursedChallenges={undisbursedUserChallenges}
    />
  )

  return (
    <ChallengeRewardsLayout
      description={descriptionContent}
      errorContent={errorContent}
      amount={challenge?.amount}
      progressValue={currentPlays}
      progressMax={targetPlays}
      progressStatusLabel={progressStatusLabel}
      additionalContent={additionalContent}
      actions={actions}
    />
  )
}
