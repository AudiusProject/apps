import { useCurrentAccount, useCurrentAccountUser } from '@audius/common/api'
import {
  audioRewardsPageSelectors,
  challengesSelectors,
  ClaimStatus,
  CommonState
} from '@audius/common/store'
import {
  formatNumberCommas,
  challengeRewardsConfig,
  getChallengeStatusLabel
} from '@audius/common/utils'
import { Flex, IconHeadphones, Text } from '@audius/harmony'
import { useSelector } from 'react-redux'

import { useIsMobile } from 'hooks/useIsMobile'

import { ChallengeRewardsLayout } from './ChallengeRewardsLayout'
import { ClaimButton } from './ClaimButton'
import { CooldownSummaryTable } from './CooldownSummaryTable'
import { ProgressDescription } from './ProgressDescription'
import { ProgressReward } from './ProgressReward'
import { type ListenStreakChallengeProps } from './types'

const { getOptimisticUserChallenges } = challengesSelectors
const { getUndisbursedUserChallenges, getClaimStatus } =
  audioRewardsPageSelectors

const messages = {
  rewardSubtext: '$AUDIO/day',
  totalClaimed: (amount: string) => `${amount} $AUDIO Claimed`
}

export const ListenStreakChallengeModalContent = ({
  challenge,
  challengeName,
  onNavigateAway,
  errorContent
}: ListenStreakChallengeProps) => {
  const isMobile = useIsMobile()
  const { fullDescription } = challengeRewardsConfig[challengeName]
  const { data: currentAccount } = useCurrentAccount()
  const { data: currentUser } = useCurrentAccountUser()
  const userChallenge = useSelector((state: CommonState) =>
    getOptimisticUserChallenges(state, currentAccount, currentUser)
  )[challengeName]
  const undisbursedUserChallenges = useSelector(getUndisbursedUserChallenges)
  const claimStatus = useSelector(getClaimStatus)
  const claimInProgress =
    claimStatus === ClaimStatus.CLAIMING ||
    claimStatus === ClaimStatus.WAITING_FOR_RETRY
  const progressDescription = (
    <ProgressDescription
      description={<Text variant='body'>{fullDescription?.(challenge)}</Text>}
    />
  )

  const progressReward = (
    <ProgressReward
      amount={userChallenge?.amount}
      subtext={messages.rewardSubtext}
    />
  )

  const progressStatusLabel = userChallenge ? (
    <Flex column gap='l'>
      <Flex
        ph='xl'
        backgroundColor='surface2'
        border='default'
        borderRadius='s'
        column={isMobile}
      >
        <Flex
          pv='l'
          gap='s'
          w='100%'
          justifyContent={isMobile ? 'center' : 'flex-start'}
          alignItems='center'
        >
          <IconHeadphones size='m' color='subdued' />
          <Text variant='label' size='l' color='subdued'>
            {getChallengeStatusLabel(userChallenge, challengeName)}
          </Text>
        </Flex>
        {userChallenge.disbursed_amount ? (
          <Flex
            pv='l'
            w='100%'
            justifyContent={isMobile ? 'center' : 'flex-end'}
            alignItems='center'
            borderTop={isMobile ? 'default' : undefined}
          >
            <Text variant='label' size='l' color='subdued'>
              {messages.totalClaimed(
                formatNumberCommas(userChallenge.disbursed_amount.toString())
              )}
            </Text>
          </Flex>
        ) : null}
      </Flex>
    </Flex>
  ) : null

  return (
    <ChallengeRewardsLayout
      description={progressDescription}
      reward={progressReward}
      progress={progressStatusLabel}
      additionalContent={
        challenge?.cooldown_days && challenge.cooldown_days > 0 ? (
          <CooldownSummaryTable challengeId={challenge.challenge_id} />
        ) : null
      }
      actions={
        <ClaimButton
          challenge={challenge}
          claimInProgress={claimInProgress}
          undisbursedChallenges={undisbursedUserChallenges}
          onClose={onNavigateAway}
        />
      }
      errorContent={errorContent}
    />
  )
}
