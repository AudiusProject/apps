import React from 'react'

import { ChallengeName } from '@audius/common/models'
import { ClaimStatus } from '@audius/common/store'
import {
  formatNumberCommas,
  getChallengeStatusLabel
} from '@audius/common/utils'
import { Platform } from 'react-native'

import { Flex, IconArrowRight, Button, Text } from '@audius/harmony-native'
import { getChallengeConfig } from 'app/utils/challenges'

import { ChallengeRewardsLayout } from './ChallengeRewardsLayout'
import { ClaimError } from './ClaimError'
import { CooldownSummaryTable } from './CooldownSummaryTable'
import type { ChallengeContentProps } from './types'

const messages = {
  totalClaimed: (amount: number) =>
    `${formatNumberCommas(amount)} $AUDIO Claimed`,
  claimAudio: (amount: number) => `Claim ${formatNumberCommas(amount)} $AUDIO`,
  close: 'Close'
}

export const TastemakerChallengeContent = ({
  challenge,
  challengeName,
  claimStatus,
  onClaim,
  onClose
}: ChallengeContentProps) => {
  const config = getChallengeConfig(ChallengeName.Tastemaker)
  const claimInProgress =
    claimStatus === ClaimStatus.CLAIMING ||
    claimStatus === ClaimStatus.WAITING_FOR_RETRY
  const claimError = claimStatus === ClaimStatus.ERROR

  const description = challenge ? config.description(challenge) : ''
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
        <Text
          variant='label'
          size='l'
          color='subdued'
          // iOS has a bug where emojis are not vertically aligned with the text
          style={{ lineHeight: Platform.OS === 'ios' ? 0 : undefined }}
        >
          {statusText}
        </Text>
      </Flex>
      {challenge?.disbursed_amount ? (
        <Flex
          w='100%'
          row
          justifyContent='center'
          alignItems='center'
          borderTop='default'
          pv='l'
        >
          <Text
            variant='label'
            size='l'
            textTransform='uppercase'
            color='subdued'
          >
            {messages.totalClaimed(challenge.disbursed_amount)}
          </Text>
        </Flex>
      ) : null}
    </Flex>
  )

  const actions =
    challenge?.claimableAmount && onClaim ? (
      <Button
        disabled={claimInProgress}
        variant='primary'
        onPress={onClaim}
        isLoading={claimInProgress}
        iconRight={IconArrowRight}
        fullWidth
      >
        {messages.claimAudio(challenge.claimableAmount)}
      </Button>
    ) : (
      <Button variant='secondary' onPress={onClose} fullWidth>
        {messages.close}
      </Button>
    )

  return (
    <ChallengeRewardsLayout
      description={description}
      amount={challenge?.amount ?? 0}
      statusLabel={statusLabel}
      actions={actions}
      additionalContent={
        challenge?.cooldown_days ? (
          <CooldownSummaryTable challengeId={challenge.challenge_id} />
        ) : null
      }
      errorContent={claimError ? <ClaimError /> : null}
      isCooldownChallenge={Boolean(challenge?.cooldown_days)}
    />
  )
}
