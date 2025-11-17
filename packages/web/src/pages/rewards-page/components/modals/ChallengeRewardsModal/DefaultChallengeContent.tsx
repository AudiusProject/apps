import { ReactNode, useCallback } from 'react'

import { ChallengeName } from '@audius/common/models'
import { audioRewardsPageSelectors, ClaimStatus } from '@audius/common/store'
import {
  challengeRewardsConfig,
  getChallengeStatusLabel
} from '@audius/common/utils'
import { Button, Flex, IconCheck, Text } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { push as pushRoute } from 'utils/navigation'

import { ChallengeRewardsLayout } from './ChallengeRewardsLayout'
import { ClaimButton } from './ClaimButton'
import { CooldownSummaryTable } from './CooldownSummaryTable'
import { MobileInstallContent } from './MobileInstallContent'
import { ProfileChecks } from './ProfileChecks'
import { type DefaultChallengeProps } from './types'

const { getClaimStatus, getUndisbursedUserChallenges } =
  audioRewardsPageSelectors

const messages = {
  audio: '$AUDIO',
  cooldownDescription:
    'Note: There is a 7 day waiting period from completion until you can claim your reward.'
}

export const DefaultChallengeContent = ({
  challenge,
  challengeName,
  onNavigateAway,
  errorContent
}: DefaultChallengeProps) => {
  const dispatch = useDispatch()
  const claimStatus = useSelector(getClaimStatus)
  const claimInProgress =
    claimStatus === ClaimStatus.CLAIMING ||
    claimStatus === ClaimStatus.WAITING_FOR_RETRY
  const undisbursedUserChallenges = useSelector(getUndisbursedUserChallenges)

  const config = challengeRewardsConfig[challengeName as ChallengeName] ?? {
    fullDescription: () => '',
    completedLabel: ''
  }
  const { fullDescription, completedLabel } = config

  const isProgressBarVisible =
    challenge &&
    challenge.max_steps &&
    challenge.max_steps > 1 &&
    challenge.challenge_type !== 'aggregate'

  const progressDescription = (
    <Flex column gap='m' w='100%'>
      <Text variant='body'>{fullDescription?.(challenge)}</Text>
      {challenge?.cooldown_days ? (
        <Text variant='body' color='subdued'>
          {messages.cooldownDescription}
        </Text>
      ) : null}
    </Flex>
  )

  const isChallengeCompleted =
    challenge?.state === 'completed' ||
    challenge?.state === 'disbursed' ||
    (challenge?.claimableAmount ?? 0) > 0

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
        {isChallengeCompleted ? <IconCheck size='s' color='subdued' /> : null}
        <Text variant='label' size='l' strength='strong' color='subdued'>
          {getChallengeStatusLabel(challenge, challengeName)}
        </Text>
      </Flex>
    </Flex>
  )

  const goToRoute = useCallback(
    (route: string) => {
      dispatch(pushRoute(route))
      onNavigateAway()
    },
    [dispatch, onNavigateAway]
  )

  const buttonLink =
    challenge && 'buttonLink' in challenge
      ? (challenge.buttonLink as string)
      : null
  const buttonLabel =
    challenge && 'buttonLabel' in challenge
      ? (challenge.buttonLabel as string)
      : null

  const renderAdditionalContent = () => {
    const contents: ReactNode[] = []

    switch (challengeName) {
      case ChallengeName.ProfileCompletion:
        contents.push(<ProfileChecks key='profile-checks' />)
        break
      case ChallengeName.MobileInstall:
        contents.push(<MobileInstallContent key='mobile-install' />)
        break
      default:
        if (challenge?.cooldown_days && challenge.cooldown_days > 0) {
          contents.push(
            <CooldownSummaryTable
              key='cooldown-summary'
              challengeId={challenge.challenge_id}
            />
          )
        }
        break
    }

    return contents.length > 0 ? (
      <Flex w='100%' column gap='2xl'>
        {contents}
      </Flex>
    ) : null
  }

  return (
    <ChallengeRewardsLayout
      description={progressDescription}
      amount={challenge?.totalAmount}
      rewardSubtext={messages.audio}
      progressStatusLabel={progressStatusLabel}
      progressValue={
        isProgressBarVisible
          ? (challenge?.current_step_count ?? undefined)
          : undefined
      }
      progressMax={
        isProgressBarVisible ? (challenge?.max_steps ?? undefined) : undefined
      }
      additionalContent={renderAdditionalContent()}
      actions={
        buttonLink ? (
          <Button
            variant='primary'
            fullWidth
            onClick={() => goToRoute(buttonLink)}
          >
            {challenge?.state === 'disbursed' ? completedLabel : buttonLabel}
          </Button>
        ) : (
          <ClaimButton
            challenge={challenge}
            claimInProgress={claimInProgress}
            undisbursedChallenges={undisbursedUserChallenges}
            onClose={onNavigateAway}
          />
        )
      }
      errorContent={errorContent}
    />
  )
}
