import { useCallback, useEffect } from 'react'

import { useCurrentAccount, useCurrentAccountUser } from '@audius/common/api'
import type { ChallengeName } from '@audius/common/models'
import {
  challengesSelectors,
  audioRewardsPageSelectors,
  audioRewardsPageActions,
  ClaimStatus,
  modalsActions
} from '@audius/common/store'
import type { CommonState } from '@audius/common/store'
import { getClaimableChallengeSpecifiers } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

import { AppDrawer } from 'app/components/drawer'
import { useToast } from 'app/hooks/useToast'
import { getChallengeConfig } from 'app/utils/challenges'

import { getChallengeContent } from './challengeContentRegistry'
import type { Challenge } from './types'

const {
  getClaimStatus,
  getUndisbursedUserChallenges,
  getChallengeRewardsModalType
} = audioRewardsPageSelectors
const {
  claimChallengeReward,
  resetAndCancelClaimReward,
  setChallengeRewardsModalType
} = audioRewardsPageActions
const { getOptimisticUserChallenges } = challengesSelectors
const { setVisibility } = modalsActions

const MODAL_NAME = 'ChallengeRewards'

const messages = {
  claimSuccessMessage: 'Reward successfully claimed!'
}

export const ChallengeRewardsDrawer = () => {
  const dispatch = useDispatch()
  const modalType = useSelector(getChallengeRewardsModalType)
  const challengeName = modalType as unknown as ChallengeName
  const { data: currentAccount } = useCurrentAccount()
  const { data: currentUser } = useCurrentAccountUser()
  const userChallenges = useSelector((state: CommonState) =>
    getOptimisticUserChallenges(state, currentAccount, currentUser, true)
  )
  const undisbursedUserChallenges = useSelector(getUndisbursedUserChallenges)
  const claimStatus = useSelector(getClaimStatus)
  const { toast } = useToast()

  const handleClose = useCallback(() => {
    dispatch(resetAndCancelClaimReward())
    dispatch(setVisibility({ modal: MODAL_NAME, visible: 'closing' }))
  }, [dispatch])

  const handleClosed = useCallback(() => {
    dispatch(setVisibility({ modal: MODAL_NAME, visible: false }))
    dispatch(setChallengeRewardsModalType({ modalType: 'track-upload' }))
  }, [dispatch])

  const onClaim = useCallback(
    (challenge: NonNullable<Challenge>) => {
      if (!challengeName) return
      dispatch(
        claimChallengeReward({
          claim: {
            challengeId: challengeName,
            specifiers:
              challenge.challenge_type === 'aggregate'
                ? getClaimableChallengeSpecifiers(
                    challenge.undisbursedSpecifiers,
                    undisbursedUserChallenges
                  )
                : [
                    { specifier: challenge.specifier, amount: challenge.amount }
                  ],
            amount: challenge?.claimableAmount ?? 0
          },
          retryOnFailure: true
        })
      )
    },
    [dispatch, challengeName, undisbursedUserChallenges]
  )

  useEffect(() => {
    if (claimStatus === ClaimStatus.SUCCESS) {
      toast({ content: messages.claimSuccessMessage, type: 'info' })
    }
  }, [toast, claimStatus])

  // Bail if not on challenges page/challenges aren't loaded
  if (!challengeName) return null

  const challenge = userChallenges ? userChallenges[challengeName] : null
  if (!challenge) return null

  const config = getChallengeConfig(challengeName)

  // Get the appropriate content component from the registry
  const ContentComponent = getChallengeContent(challengeName)

  return (
    <AppDrawer
      modalName={MODAL_NAME}
      onClose={handleClose}
      onClosed={handleClosed}
      isFullscreen
      isGestureSupported={false}
      title={config?.shortTitle ?? config?.title}
    >
      <ContentComponent
        challenge={challenge}
        challengeName={challengeName}
        claimStatus={claimStatus}
        onClaim={() => onClaim(challenge)}
        onClose={handleClose}
      />
    </AppDrawer>
  )
}
