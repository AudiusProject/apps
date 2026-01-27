import { useCurrentAccount, useCurrentAccountUser } from '@audius/common/api'
import {
  audioRewardsPageSelectors,
  challengesSelectors,
  ClaimStatus
} from '@audius/common/store'
import {
  formatNumberCommas,
  challengeRewardsConfig,
  getChallengeStatusLabel
} from '@audius/common/utils'
import { Flex, IconCheck, Text } from '@audius/harmony'
import { useSelector } from 'react-redux'

import { useIsMobile } from 'hooks/useIsMobile'
import { AppState } from 'store/types'

import { ChallengeRewardsLayout } from './ChallengeRewardsLayout'
import { ClaimButton } from './ClaimButton'
import { CooldownSummaryTable } from './CooldownSummaryTable'
import { type DefaultChallengeProps } from './types'

const { getOptimisticUserChallenges } = challengesSelectors
const { getUndisbursedUserChallenges, getClaimStatus } =
  audioRewardsPageSelectors

const messages = {
  rewardSubtext: '$AUDIO/Contest Win',
  totalClaimed: (amount: string) =>
    `${formatNumberCommas(amount)} $AUDIO Claimed`
}

export const RemixContestWinnerChallengeModalContent = ({
  challenge,
  challengeName,
  onNavigateAway,
  errorContent
}: DefaultChallengeProps) => {
  const isMobile = useIsMobile()
  const { data: currentAccount } = useCurrentAccount()
  const { data: currentUser } = useCurrentAccountUser()
  const userChallenge = useSelector((state: AppState) =>
    getOptimisticUserChallenges(state, currentAccount, currentUser)
  )[challengeName]
  const undisbursedUserChallenges = useSelector(getUndisbursedUserChallenges)

  const claimStatus = useSelector(getClaimStatus)
  const claimInProgress =
    claimStatus === ClaimStatus.CLAIMING ||
    claimStatus === ClaimStatus.WAITING_FOR_RETRY

  const modifiedChallenge = challenge
    ? {
        ...challenge,
        totalAmount: challenge?.amount ?? 0
      }
    : undefined

  const { fullDescription } = challengeRewardsConfig[challengeName]

  const progressStatusLabel = userChallenge ? (
    <Flex
      ph='xl'
      backgroundColor='surface1'
      border='default'
      borderRadius='s'
      column={isMobile}
    >
      <Flex
        pv='l'
        gap='s'
        w='100%'
        justifyContent={
          isMobile || !userChallenge.disbursed_amount ? 'center' : 'flex-start'
        }
        alignItems='center'
      >
        {userChallenge?.claimableAmount ? (
          <IconCheck size='s' color='subdued' />
        ) : null}
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
  ) : null

  return (
    <ChallengeRewardsLayout
      description={
        <Text variant='body'>{fullDescription?.(modifiedChallenge)}</Text>
      }
      amount={modifiedChallenge?.totalAmount}
      rewardSubtext={messages.rewardSubtext}
      progressStatusLabel={progressStatusLabel}
      additionalContent={
        challenge?.cooldown_days ? (
          <CooldownSummaryTable challengeId={challenge.challenge_id} />
        ) : null
      }
      actions={
        <ClaimButton
          challenge={modifiedChallenge}
          claimInProgress={claimInProgress}
          undisbursedChallenges={undisbursedUserChallenges}
          onClose={onNavigateAway}
        />
      }
      errorContent={errorContent}
    />
  )
}
