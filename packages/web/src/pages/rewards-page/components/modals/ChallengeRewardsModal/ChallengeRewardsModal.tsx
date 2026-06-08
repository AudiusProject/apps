import { useCallback, useEffect, useContext } from 'react'

import { useCurrentAccountUser, useCurrentAccount } from '@audius/common/api'
import { ChallengeName } from '@audius/common/models'
import { registerNiceModalId } from '@audius/common/services'
import {
  challengesSelectors,
  audioRewardsPageSelectors,
  audioRewardsPageActions,
  ClaimStatus,
  musicConfettiActions,
  CommonState
} from '@audius/common/store'
import { ModalContent, Text } from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { useDispatch, useSelector } from 'react-redux'

import ModalDrawer from 'components/modal-drawer/ModalDrawer'
import { ToastContext } from 'components/toast/ToastContext'
import { useWithMobileStyle } from 'hooks/useWithMobileStyle'
import { getChallengeConfig } from 'pages/rewards-page/config'
import { CLAIM_REWARD_TOAST_TIMEOUT_MILLIS } from 'utils/constants'

import { getChallengeContent } from './challengeContentRegistry'
import styles from './styles.module.css'

const { show: showConfetti } = musicConfettiActions
const { getChallengeRewardsModalType, getClaimStatus } =
  audioRewardsPageSelectors
const { resetAndCancelClaimReward } = audioRewardsPageActions
const { getOptimisticUserChallenges } = challengesSelectors

const messages = {
  close: 'Close',
  rewardClaimed: 'Reward claimed successfully!',
  rewardAlreadyClaimed: 'Reward already claimed!',
  claimError:
    'Something went wrong while claiming your rewards. Please try again and contact support@audius.co.',
  claimableAmountLabel: (amount: number) => `Claim $${amount} AUDIO`,
  xShare: (
    modalType:
      | 'referrals'
      | 'ref-v'
      | ChallengeName.Referrals
      | ChallengeName.ReferralsVerified
  ) =>
    `Share Invite With Your ${
      modalType === 'referrals' || modalType === ChallengeName.Referrals
        ? 'Friends'
        : 'Fans'
    }`,
  twitterCopy: `Come support me on @audius! Use my link and we both earn $AUDIO when you sign up.\n\n`,
  twitterReferralLabel: 'Share referral link on Twitter',
  verifiedChallenge: 'VERIFIED CHALLENGE',
  claimAmountLabel: '$AUDIO available to claim',
  claimedSoFar: '$AUDIO claimed so far',
  upcomingRewards: 'Upcoming Rewards',
  cooldownDescription:
    'Note: There is a 7 day waiting period from completion until you can claim your reward.',

  // Profile checks
  profileCheckNameAndHandle: 'Name & Handle',
  profileCheckProfilePicture: 'Profile Picture',
  profileCheckCoverPhoto: 'Cover Photo',
  profileCheckProfileDescription: 'Profile Description',
  profileCheckFavorite: 'Favorite Track/Playlist',
  profileCheckRepost: 'Repost Track/Playlist',
  profileCheckFollow: 'Follow Five People',
  progress: 'Progress',
  taskDetails: 'Task Details',
  complete: 'Complete',
  incomplete: 'Incomplete',
  ineligible: 'Ineligible'
}

type BodyProps = {
  dismissModal: () => void
}

const ChallengeRewardsBody = ({ dismissModal }: BodyProps) => {
  const { toast } = useContext(ToastContext)
  const dispatch = useDispatch()
  const claimStatus = useSelector(getClaimStatus)
  const modalType = useSelector(getChallengeRewardsModalType) as ChallengeName
  const { data: currentAccount } = useCurrentAccount()
  const { data: currentUser } = useCurrentAccountUser()
  const userChallenges = useSelector((state: CommonState) =>
    getOptimisticUserChallenges(state, currentAccount, currentUser)
  )
  const challenge = userChallenges[modalType]

  const errorContent =
    claimStatus === ClaimStatus.ERROR ? (
      <Text size='s' color='danger'>
        {messages.claimError}
      </Text>
    ) : null

  useEffect(() => {
    if (claimStatus === ClaimStatus.SUCCESS) {
      toast(messages.rewardClaimed, CLAIM_REWARD_TOAST_TIMEOUT_MILLIS)
      dispatch(showConfetti())
    }
    if (claimStatus === ClaimStatus.ALREADY_CLAIMED) {
      toast(messages.rewardAlreadyClaimed, CLAIM_REWARD_TOAST_TIMEOUT_MILLIS)
    }
  }, [claimStatus, toast, dispatch])

  const ChallengeContent = getChallengeContent(modalType)

  return (
    <ChallengeContent
      challenge={challenge}
      challengeName={modalType}
      onNavigateAway={dismissModal}
      errorContent={errorContent}
    />
  )
}

export const ChallengeRewardsModal = NiceModal.create(() => {
  const modalType = useSelector(getChallengeRewardsModalType) as ChallengeName
  const modal = useModal()
  const dispatch = useDispatch()
  const wm = useWithMobileStyle(styles.mobile)
  const onClose = useCallback(() => {
    modal.hide()
    dispatch(resetAndCancelClaimReward())
  }, [dispatch, modal])

  const { title } = getChallengeConfig(modalType)

  return (
    <ModalDrawer
      title={<>{title}</>}
      showTitleHeader
      isOpen={modal.visible}
      onClose={onClose}
      isFullscreen={true}
      titleClassName={wm(styles.title)}
      headerContainerClassName={styles.header}
      showDismissButton
      dismissOnClickOutside
    >
      <ModalContent>
        <ChallengeRewardsBody dismissModal={onClose} />
      </ModalContent>
    </ModalDrawer>
  )
})

NiceModal.register('ChallengeRewards', ChallengeRewardsModal)
registerNiceModalId('ChallengeRewards')
