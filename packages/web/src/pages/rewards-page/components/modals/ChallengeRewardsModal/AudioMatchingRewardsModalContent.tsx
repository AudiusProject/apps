import { useCallback } from 'react'

import { ChallengeName } from '@audius/common/models'
import { audioRewardsPageSelectors, ClaimStatus } from '@audius/common/store'
import {
  challengeRewardsConfig,
  getChallengeStatusLabel,
  route
} from '@audius/common/utils'
import {
  Button,
  ButtonProps,
  Flex,
  IconArrowRight,
  IconCloudUpload,
  Text
} from '@audius/harmony'
import { useSelector } from 'react-redux'

import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { ChallengeRewardsLayout } from './ChallengeRewardsLayout'
import { ClaimButton } from './ClaimButton'
import { CooldownSummaryTable } from './CooldownSummaryTable'
import { ProgressDescription } from './ProgressDescription'
import { ProgressReward } from './ProgressReward'
import { type AudioMatchingChallengeProps } from './types'

const { EXPLORE_PAGE, UPLOAD_PAGE } = route

const { getUndisbursedUserChallenges, getClaimStatus } =
  audioRewardsPageSelectors

const messages = {
  rewardMapping: {
    [ChallengeName.AudioMatchingBuy]: '$AUDIO Every Dollar Spent',
    [ChallengeName.AudioMatchingSell]: '$AUDIO Every Dollar Earned'
  },
  descriptionSubtext: {
    [ChallengeName.AudioMatchingBuy]:
      'Note: There is a 7 day waiting period between when you purchase and when you can claim your reward.',
    [ChallengeName.AudioMatchingSell]:
      'Note: There is a 7 day waiting period between when your track is purchased and when you can claim your reward.'
  },
  viewPremiumTracks: 'View Premium Tracks',
  uploadTrack: 'Upload Track',
  totalClaimed: (amount: string) => `Total $AUDIO Claimed: ${amount}`
}

const ctaButtonProps: {
  [k in
    | ChallengeName.AudioMatchingBuy
    | ChallengeName.AudioMatchingSell]: Partial<ButtonProps>
} = {
  [ChallengeName.AudioMatchingBuy]: {
    iconRight: IconArrowRight,
    children: messages.viewPremiumTracks
  },
  [ChallengeName.AudioMatchingSell]: {
    iconLeft: IconCloudUpload,
    children: messages.uploadTrack
  }
}

export const AudioMatchingRewardsModalContent = ({
  challenge,
  challengeName,
  onNavigateAway,
  errorContent
}: AudioMatchingChallengeProps) => {
  const navigateToPage = useNavigateToPage()
  const { fullDescription } = challengeRewardsConfig[challengeName]
  const undisbursedUserChallenges = useSelector(getUndisbursedUserChallenges)
  const claimStatus = useSelector(getClaimStatus)
  const claimInProgress =
    claimStatus === ClaimStatus.CLAIMING ||
    claimStatus === ClaimStatus.WAITING_FOR_RETRY

  const progressStatusLabel = (
    <Flex
      alignItems='center'
      border='strong'
      w='100%'
      justifyContent='center'
      ph='xl'
      pv='unit5'
      borderRadius='s'
      backgroundColor='surface1'
    >
      <Flex alignItems='center' gap='s'>
        <Text variant='label' size='l' strength='strong' color='subdued'>
          {getChallengeStatusLabel(challenge, challengeName)}
        </Text>
      </Flex>
    </Flex>
  )

  const progressDescription = (
    <ProgressDescription
      description={
        <Flex column gap='m'>
          <Text variant='body'>{fullDescription?.(challenge)}</Text>
          <Text variant='body' color='subdued'>
            {messages.descriptionSubtext[challengeName]}
          </Text>
        </Flex>
      }
    />
  )

  const progressReward = (
    <ProgressReward
      amount={challenge?.amount}
      subtext={messages.rewardMapping[challengeName]}
    />
  )

  const handleClickCTA = useCallback(() => {
    const route =
      challengeName === ChallengeName.AudioMatchingBuy
        ? EXPLORE_PAGE
        : UPLOAD_PAGE
    navigateToPage(route)
    onNavigateAway()
  }, [challengeName, onNavigateAway, navigateToPage])

  return (
    <ChallengeRewardsLayout
      description={progressDescription}
      reward={progressReward}
      progress={progressStatusLabel}
      additionalContent={
        challenge?.cooldown_days ? (
          <CooldownSummaryTable challengeId={challenge.challenge_id} />
        ) : null
      }
      actions={
        challenge?.claimableAmount ? (
          <ClaimButton
            challenge={challenge}
            undisbursedChallenges={undisbursedUserChallenges}
            claimInProgress={claimInProgress}
            onClose={onNavigateAway}
          />
        ) : (
          <Button
            variant='secondary'
            fullWidth
            {...ctaButtonProps[challengeName]}
            onClick={handleClickCTA}
          />
        )
      }
      errorContent={errorContent}
    />
  )
}
