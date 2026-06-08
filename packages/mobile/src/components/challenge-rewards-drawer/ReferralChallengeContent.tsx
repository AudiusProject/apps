import React from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { ClaimStatus } from '@audius/common/store'
import { getChallengeStatusLabel } from '@audius/common/utils'

import { Button, IconValidationCheck, Text, Flex } from '@audius/harmony-native'
import { getChallengeConfig } from 'app/utils/challenges'

import { ChallengeRewardsLayout } from './ChallengeRewardsLayout'
import { ClaimError } from './ClaimError'
import { ReferralLinkCopyButton } from './ReferralLinkCopyButton'
import { XShareButton } from './XShareButton'
import type { ChallengeContentProps } from './types'

const messages = {
  audio: '$AUDIO / Invite',
  claim: 'Claim This Reward',
  claimableAmountLabel: (amount: number) => `Claim ${amount} $AUDIO`,
  claiming: 'Claiming',
  close: 'Close'
}

export const ReferralChallengeContent = ({
  challenge,
  challengeName,
  claimStatus,
  onClaim,
  onClose
}: ChallengeContentProps) => {
  const { data: handle } = useCurrentAccountUser({
    select: (user) => user?.handle
  })
  const inviteUrl = `audius.co/signup?rf=${handle}`

  const config = getChallengeConfig(challengeName)
  const claimInProgress =
    claimStatus === ClaimStatus.CLAIMING ||
    claimStatus === ClaimStatus.WAITING_FOR_RETRY
  const claimError = claimStatus === ClaimStatus.ERROR
  const isClaimable =
    challenge?.claimableAmount && challenge.claimableAmount > 0
  const hasCompleted =
    challenge?.state === 'completed' || challenge?.state === 'disbursed'

  if (!handle || !challenge) return null

  const description = (
    <Text variant='body' size='l'>
      {config.description(challenge)}
    </Text>
  )

  const statusText = getChallengeStatusLabel(challenge, challengeName)

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
        {hasCompleted ? <IconValidationCheck size='s' color='subdued' /> : null}
        <Flex mt='unitHalf'>
          <Text variant='label' size='l' color='subdued'>
            {statusText}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  )

  const referralContent = (
    <Flex gap='m' w='100%'>
      <XShareButton
        inviteUrl={inviteUrl}
        isVerified={config.isVerifiedChallenge ?? false}
      />
      <ReferralLinkCopyButton inviteUrl={inviteUrl} />
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
          : messages.claimableAmountLabel(challenge.claimableAmount)}
      </Button>
    ) : (
      <Button variant='secondary' onPress={onClose} fullWidth>
        {messages.close}
      </Button>
    )

  return (
    <ChallengeRewardsLayout
      description={description}
      amount={challenge.amount}
      rewardSubtext={messages.audio}
      progressValue={challenge.current_step_count}
      progressMax={challenge.max_steps}
      statusLabel={statusLabel}
      additionalContent={referralContent}
      actions={actions}
      errorContent={claimError ? <ClaimError /> : null}
      isCooldownChallenge={false}
    />
  )
}
