import { useCurrentAccount, useCurrentAccountUser } from '@audius/common/api'
import {
  audioRewardsPageSelectors,
  challengesSelectors,
  ClaimStatus,
  CommonState
} from '@audius/common/store'
import {
  challengeRewardsConfig,
  getChallengeStatusLabel
} from '@audius/common/utils'
import { Flex, Text } from '@audius/harmony'
import { useSelector } from 'react-redux'

import { ChallengeRewardsLayout } from './ChallengeRewardsLayout'
import { ClaimButton } from './ClaimButton'
import { type DefaultChallengeProps } from './types'

const { getOptimisticUserChallenges } = challengesSelectors
const { getUndisbursedUserChallenges, getClaimStatus } =
  audioRewardsPageSelectors

export const TrendingRewardsModalContent = ({
  challenge,
  challengeName,
  onNavigateAway,
  errorContent
}: DefaultChallengeProps) => {
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

  const { fullDescription } = challengeRewardsConfig[challengeName] ?? {
    fullDescription: () => ''
  }

  const progressStatusLabel = (
    <Flex
      ph='xl'
      backgroundColor='surface1'
      border='default'
      borderRadius='s'
      pv='l'
      w='100%'
      justifyContent='center'
      alignItems='center'
    >
      <Text variant='label' size='l' color='subdued'>
        {userChallenge
          ? getChallengeStatusLabel(userChallenge, challengeName)
          : 'AVAILABLE'}
      </Text>
    </Flex>
  )

  return (
    <ChallengeRewardsLayout
      description={
        <Text variant='body'>
          {fullDescription?.(userChallenge ?? challenge)}
        </Text>
      }
      amount={userChallenge?.totalAmount ?? challenge?.totalAmount}
      progressStatusLabel={progressStatusLabel}
      actions={
        <ClaimButton
          challenge={userChallenge ?? challenge}
          claimInProgress={claimInProgress}
          undisbursedChallenges={undisbursedUserChallenges}
          onClose={onNavigateAway}
        />
      }
      errorContent={errorContent}
    />
  )
}
