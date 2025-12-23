import { useCallback, useMemo } from 'react'

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
  getChallengeStatusLabel,
  fillString
} from '@audius/common/utils'
import { Button, Flex, Text, IconLink } from '@audius/harmony'
import { useSelector } from 'react-redux'

import Toast from 'components/toast/Toast'
import { useIsMobile } from 'hooks/useIsMobile'
import { copyToClipboard, getCopyableLink } from 'utils/clipboardUtil'

import { ChallengeRewardsLayout } from './ChallengeRewardsLayout'
import { ClaimButton } from './ClaimButton'
import { CooldownSummaryTable } from './CooldownSummaryTable'
import { ProgressDescription } from './ProgressDescription'
import { ProgressReward } from './ProgressReward'
import { type ReferralsChallengeProps } from './types'

const { getOptimisticUserChallenges } = challengesSelectors
const { getUndisbursedUserChallenges, getClaimStatus } =
  audioRewardsPageSelectors

const inviteLink = getCopyableLink('/signup?rf=%0')

const messages = {
  rewardSubtext: '$AUDIO/invite',
  descriptionSubtext:
    "Invite your friends to join Audius and earn $AUDIO for each friend who joins with your link (and they'll get $AUDIO too).",
  totalClaimed: (amount: string) => `${amount} $AUDIO Claimed`,
  inviteButtonText: 'Copy Invite To Clipboard',
  readyToClaim: 'Ready to claim!',
  copiedLabel: 'Copied to Clipboard',
  inviteLabel: 'Copy Invite to Clipboard',
  inviteLink
}

export const InviteLink = () => {
  const { data: userHandle } = useCurrentAccountUser({
    select: (user) => user?.handle
  })
  const inviteLink = useMemo(
    () => (userHandle ? fillString(messages.inviteLink, userHandle) : ''),
    [userHandle]
  )

  const handleClick = useCallback(() => {
    copyToClipboard(inviteLink)
  }, [inviteLink])

  return (
    <Toast
      text={messages.copiedLabel}
      delay={2000}
      anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
      transformOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      portalLocation={
        typeof document !== 'undefined'
          ? document.getElementById('page') || document.body
          : undefined
      }
    >
      <Button
        variant='secondary'
        iconLeft={IconLink}
        onClick={handleClick}
        fullWidth
      >
        {messages.inviteLabel}
      </Button>
    </Toast>
  )
}

export const ReferralsChallengeModalContent = ({
  challenge,
  challengeName,
  onNavigateAway,
  errorContent
}: ReferralsChallengeProps) => {
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
    <Flex
      column={isMobile}
      ph='xl'
      backgroundColor='surface2'
      border='default'
      borderRadius='s'
      alignItems='center'
    >
      <Flex
        pv='l'
        gap='s'
        w='100%'
        justifyContent={
          isMobile
            ? 'center'
            : userChallenge.disbursed_amount
              ? 'flex-start'
              : 'center'
        }
        alignItems='center'
      >
        <Text variant='label' size='l' color='subdued'>
          {getChallengeStatusLabel(userChallenge, challengeName)}
        </Text>
      </Flex>
      {userChallenge.disbursed_amount ? (
        <Flex
          pv='l'
          w='100%'
          alignItems='center'
          justifyContent={isMobile ? 'center' : 'flex-end'}
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
      description={progressDescription}
      reward={progressReward}
      progress={progressStatusLabel}
      additionalContent={
        challenge?.cooldown_days && challenge.cooldown_days > 0 ? (
          <CooldownSummaryTable challengeId={challenge.challenge_id} />
        ) : null
      }
      actions={
        <Flex gap='l' w='100%' direction={isMobile ? 'column-reverse' : 'row'}>
          <ClaimButton
            challenge={challenge}
            claimInProgress={claimInProgress}
            undisbursedChallenges={undisbursedUserChallenges}
            onClose={onNavigateAway}
          />
          <InviteLink />
        </Flex>
      }
      errorContent={errorContent}
    />
  )
}
