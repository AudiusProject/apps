import React from 'react'

import { ClaimStatus } from '@audius/common/store'
import {
  challengeRewardsConfig,
  getChallengeStatusLabel
} from '@audius/common/utils'

import { Text, Button, IconCheck, Flex } from '@audius/harmony-native'

import { ChallengeRewardsLayout } from './ChallengeRewardsLayout'
import { ClaimError } from './ClaimError'
import type { ChallengeContentProps } from './types'

const messages = {
  audio: '$AUDIO',
  claim: 'Claim This Reward',
  claimableAmountLabel: (amount: number) => `Claim ${amount} $AUDIO`,
  claiming: 'Claiming',
  close: 'Close'
}

export const DefaultChallengeContent = ({
  challenge,
  challengeName,
  claimStatus,
  onClaim,
  onClose,
  children
}: ChallengeContentProps) => {
  const config = challengeRewardsConfig[challengeName] ?? {
    fullDescription: () => '',
    completedLabel: '',
    progressLabel: ''
  }
  const { fullDescription } = config

  const hasCompleted =
    challenge?.state === 'completed' || challenge?.state === 'disbursed'
  const isClaimable =
    challenge?.claimableAmount && challenge.claimableAmount > 0

  const claimInProgress =
    claimStatus === ClaimStatus.CLAIMING ||
    claimStatus === ClaimStatus.WAITING_FOR_RETRY
  const claimError = claimStatus === ClaimStatus.ERROR

  const showProgressBar =
    challenge?.max_steps &&
    challenge.max_steps > 1 &&
    challenge.challenge_type !== 'aggregate'

  const statusText = challenge
    ? getChallengeStatusLabel(challenge, challengeName)
    : ''

  const statusLabel = (
    <Flex
      w='100%'
      ph='xl'
      border='default'
      borderRadius='s'
      backgroundColor='surface1'
    >
      <Flex
        row
        w='100%'
        alignItems='center'
        justifyContent='center'
        gap='s'
        pv='l'
      >
        {hasCompleted ? <IconCheck size='s' color='subdued' /> : null}
        <Flex mt='unitHalf'>
          <Text variant='label' size='l' color='subdued'>
            {statusText}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  )

  const actions =
    isClaimable && onClaim ? (
      <Button
        variant='primary'
        isLoading={claimInProgress}
        onPress={onClaim}
        fullWidth
      >
        {claimInProgress
          ? messages.claiming
          : messages.claimableAmountLabel(challenge?.claimableAmount ?? 0)}
      </Button>
    ) : (
      <Button variant='secondary' onPress={onClose} fullWidth>
        {messages.close}
      </Button>
    )

  return (
    <ChallengeRewardsLayout
      description={challenge ? fullDescription?.(challenge) : ''}
      amount={challenge?.amount}
      rewardSubtext={messages.audio}
      showProgressBar={!!showProgressBar}
      progressValue={challenge?.current_step_count}
      progressMax={challenge?.max_steps}
      statusLabel={statusLabel}
      actions={children ?? actions}
      errorContent={claimError ? <ClaimError /> : null}
      isCooldownChallenge={!!challenge?.cooldown_days}
    />
  )
}
