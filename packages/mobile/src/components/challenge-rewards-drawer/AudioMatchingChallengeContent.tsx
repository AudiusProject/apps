import React from 'react'

import { ChallengeName } from '@audius/common/models'
import { ClaimStatus } from '@audius/common/store'
import {
  formatNumberCommas,
  getChallengeStatusLabel
} from '@audius/common/utils'

import {
  IconArrowRight,
  IconCloudUpload,
  Button,
  Text,
  Flex,
  IconCheck
} from '@audius/harmony-native'
import { getChallengeConfig } from 'app/utils/challenges'

import { ChallengeRewardsLayout } from './ChallengeRewardsLayout'
import { ClaimError } from './ClaimError'
import { CooldownSummaryTable } from './CooldownSummaryTable'
import type { ChallengeContentProps } from './types'

const messages = {
  rewardSubtext: '$AUDIO/Dollar',
  viewPremiumTracks: 'View Premium Tracks',
  uploadTrack: 'Upload Track',
  totalClaimed: (amount: string) => `Total $AUDIO Claimed: ${amount}`,
  claimAudio: (amount: string) => `Claim ${amount} $AUDIO`
}

type AudioMatchingChallengeName =
  | ChallengeName.AudioMatchingBuy
  | ChallengeName.AudioMatchingSell

export const AudioMatchingChallengeContent = ({
  challenge,
  challengeName,
  claimStatus,
  onClaim,
  onClose
}: ChallengeContentProps & { challengeName: AudioMatchingChallengeName }) => {
  if (!challenge) return null

  const config = getChallengeConfig(challengeName)
  const claimInProgress =
    claimStatus === ClaimStatus.CLAIMING ||
    claimStatus === ClaimStatus.WAITING_FOR_RETRY
  const claimError = claimStatus === ClaimStatus.ERROR
  const isClaimable = challenge.claimableAmount > 0
  const statusText = getChallengeStatusLabel(challenge, challengeName)

  const description = (
    <Text variant='body' size='l'>
      {config.description(challenge)}
    </Text>
  )

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
        {isClaimable ? <IconCheck size='s' color='subdued' /> : null}
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
        disabled={claimInProgress}
        variant='primary'
        onPress={onClaim}
        isLoading={claimInProgress}
        iconRight={IconArrowRight}
        fullWidth
      >
        {messages.claimAudio(formatNumberCommas(challenge.claimableAmount))}
      </Button>
    ) : (
      <Button
        {...(challengeName === ChallengeName.AudioMatchingBuy
          ? {
              iconRight: IconArrowRight,
              children: messages.viewPremiumTracks
            }
          : {
              iconLeft: IconCloudUpload,
              children: messages.uploadTrack
            })}
        variant='secondary'
        onPress={onClose}
        fullWidth
      />
    )

  const additionalContent = (
    <Flex gap='2xl' w='100%'>
      {challenge.disbursed_amount > 0 ? (
        <Flex
          w='100%'
          ph='xl'
          pv='l'
          border='default'
          borderRadius='s'
          backgroundColor='surface1'
        >
          <Text
            variant='label'
            size='s'
            strength='strong'
            textTransform='uppercase'
            textAlign='center'
          >
            {messages.totalClaimed(
              formatNumberCommas(challenge.disbursed_amount)
            )}
          </Text>
        </Flex>
      ) : null}
      <CooldownSummaryTable challengeId={challengeName} />
    </Flex>
  )

  return (
    <ChallengeRewardsLayout
      description={description}
      amount={challenge.amount}
      rewardSubtext={messages.rewardSubtext}
      statusLabel={statusLabel}
      additionalContent={additionalContent}
      actions={actions}
      errorContent={claimError ? <ClaimError /> : null}
      isCooldownChallenge
    />
  )
}
