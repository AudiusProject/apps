import { useCallback } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { ClaimStatus, useUserCompletionStages } from '@audius/common/store'
import { getChallengeStatusLabel } from '@audius/common/utils'
import { View } from 'react-native'

import {
  Button,
  IconArrowRight,
  IconValidationCheck,
  Text,
  Flex
} from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import type { ProfileTabScreenParamList } from 'app/screens/app-screen/ProfileTabScreen'
import { makeStyles } from 'app/styles'
import { getChallengeConfig } from 'app/utils/challenges'

import { ChallengeRewardsLayout } from './ChallengeRewardsLayout'
import { ClaimError } from './ClaimError'
import type { ChallengeContentProps } from './types'

const messages = {
  audio: '$AUDIO',
  claim: 'Claim This Reward',
  claimableAmountLabel: (amount: number) => `Claim ${amount} $AUDIO`,
  claiming: 'Claiming',
  close: 'Close',
  viewProfile: 'View Your Profile',
  // Profile completion checks
  profileCheckNameAndHandle: 'Name & Handle',
  profileCheckProfilePicture: 'Profile Picture',
  profileCheckCoverPhoto: 'Cover Photo',
  profileCheckProfileDescription: 'Profile Description',
  profileCheckFavorite: 'Favorite Track/Playlist',
  profileCheckRepost: 'Repost Track/Playlist',
  profileCheckFollow: 'Follow Five People'
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  columnContainer: {
    marginBottom: spacing(8),
    display: 'flex',
    flexDirection: 'column',
    gap: spacing(4)
  },
  checkContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkText: {
    marginLeft: spacing(3)
  },
  checkTextDone: {
    textDecorationLine: 'line-through'
  },
  checkCircle: {
    height: spacing(5),
    width: spacing(5),
    borderRadius: spacing(2.5),
    borderWidth: 1,
    borderColor: palette.neutralLight4
  }
}))

export const ProfileCompletionChallengeContent = ({
  challenge,
  challengeName,
  claimStatus,
  onClaim,
  onClose
}: ChallengeContentProps) => {
  const styles = useStyles()
  const { data: currentUserHandle } = useCurrentAccountUser({
    select: (account) => account?.handle
  })
  const completionStages = useUserCompletionStages()
  const navigation = useNavigation<ProfileTabScreenParamList>()

  const config = getChallengeConfig(challengeName)
  const claimInProgress =
    claimStatus === ClaimStatus.CLAIMING ||
    claimStatus === ClaimStatus.WAITING_FOR_RETRY
  const claimError = claimStatus === ClaimStatus.ERROR
  const isClaimable =
    challenge?.claimableAmount && challenge.claimableAmount > 0
  const hasCompleted =
    challenge?.state === 'completed' || challenge?.state === 'disbursed'

  const goToProfile = useCallback(() => {
    onClose()
    if (currentUserHandle) {
      navigation.navigate('Profile', { handle: currentUserHandle })
    }
  }, [currentUserHandle, onClose, navigation])

  if (!currentUserHandle || !challenge) return null

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

  const completionChecks = (
    <Flex alignSelf='flex-start' gap='xs' ph='l'>
      {[
        {
          key: messages.profileCheckNameAndHandle,
          completed: completionStages.hasNameAndHandle
        },
        {
          key: messages.profileCheckProfilePicture,
          completed: completionStages.hasProfilePicture
        },
        {
          key: messages.profileCheckCoverPhoto,
          completed: completionStages.hasCoverPhoto
        },
        {
          key: messages.profileCheckProfileDescription,
          completed: completionStages.hasProfileDescription
        },
        {
          key: messages.profileCheckFavorite,
          completed: completionStages.hasFavoritedItem
        },
        {
          key: messages.profileCheckRepost,
          completed: completionStages.hasReposted
        },
        {
          key: messages.profileCheckFollow,
          completed: completionStages.hasFollowedAccounts
        }
      ].map(({ key, completed }) => (
        <Flex key={key} row alignItems='center'>
          {completed ? (
            <IconValidationCheck fill='white' />
          ) : (
            <View style={styles.checkCircle} />
          )}
          <Text
            style={[styles.checkText, completed ? styles.checkTextDone : {}]}
          >
            {key}
          </Text>
        </Flex>
      ))}
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
      <Button
        variant={hasCompleted ? 'secondary' : 'primary'}
        iconRight={IconArrowRight}
        onPress={goToProfile}
        fullWidth
      >
        {messages.viewProfile}
      </Button>
    )

  return (
    <ChallengeRewardsLayout
      description={description}
      amount={challenge.amount}
      rewardSubtext={messages.audio}
      showProgressBar={true}
      progressValue={challenge.current_step_count}
      progressMax={challenge.max_steps}
      statusLabel={statusLabel}
      additionalContent={completionChecks}
      actions={actions}
      errorContent={claimError ? <ClaimError /> : null}
      isCooldownChallenge={false}
    />
  )
}
