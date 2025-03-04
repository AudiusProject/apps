import { useCallback, useEffect, useContext } from 'react'

import { ChallengeName } from '@audius/common/models'
import {
  challengesSelectors,
  audioRewardsPageSelectors,
  audioRewardsPageActions,
  ClaimStatus,
  musicConfettiActions
} from '@audius/common/store'
import { getAAOErrorEmojis } from '@audius/common/utils'
import { ModalContent, Text } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import ModalDrawer from 'components/modal-drawer/ModalDrawer'
import { ToastContext } from 'components/toast/ToastContext'
import { useWithMobileStyle } from 'hooks/useWithMobileStyle'
import { getChallengeConfig } from 'pages/rewards-page/config'
import { CLAIM_REWARD_TOAST_TIMEOUT_MILLIS } from 'utils/constants'

import { getChallengeContent } from './challengeContentRegistry'
import styles from './styles.module.css'

const { show: showConfetti } = musicConfettiActions
const { getAAOErrorCode, getChallengeRewardsModalType, getClaimStatus } =
  audioRewardsPageSelectors
const { resetAndCancelClaimReward } = audioRewardsPageActions
const { getOptimisticUserChallenges } = challengesSelectors

const messages = {
  close: 'Close',
  rewardClaimed: 'Reward claimed successfully!',
  rewardAlreadyClaimed: 'Reward already claimed!',
  claimError:
    'Something has gone wrong, not all your rewards were claimed. Please try again or contact support@audius.co.',
  claimErrorAAO:
    'Your account is unable to claim rewards at this time. Please try again later or contact support@audius.co. ',
  claimableAmountLabel: (amount: number) => `Claim $${amount} AUDIO`,
  twitterShare: (
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
  twitterCopy: `Come support me on @audius! Use my link and we both earn $AUDIO when you sign up.\n\n #Audius #AudioRewards\n\n`,
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

const getErrorMessage = (aaoErrorCode?: number) => {
  if (aaoErrorCode !== undefined) {
    return (
      <>
        {messages.claimErrorAAO}
        {getAAOErrorEmojis(aaoErrorCode)}
      </>
    )
  }
  return <>{messages.claimError}</>
}

type BodyProps = {
  dismissModal: () => void
}

const ChallengeRewardsBody = ({ dismissModal }: BodyProps) => {
  const { toast } = useContext(ToastContext)
  const dispatch = useDispatch()
  const claimStatus = useSelector(getClaimStatus)
  const aaoErrorCode = useSelector(getAAOErrorCode)
  const modalType = useSelector(getChallengeRewardsModalType) as ChallengeName
  const userChallenges = useSelector(getOptimisticUserChallenges)
  const challenge = userChallenges[modalType]

  const errorContent =
    claimStatus === ClaimStatus.ERROR ? (
      <Text>{getErrorMessage(aaoErrorCode)}</Text>
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

export const ChallengeRewardsModal = () => {
  const modalType = useSelector(getChallengeRewardsModalType) as ChallengeName
  const [isOpen, setOpen] = useModalState('ChallengeRewards')
  const dispatch = useDispatch()
  const wm = useWithMobileStyle(styles.mobile)
  const onClose = useCallback(() => {
    setOpen(false)
    dispatch(resetAndCancelClaimReward())
  }, [dispatch, setOpen])

  const { title } = getChallengeConfig(modalType)

  return (
    <ModalDrawer
      title={<>{title}</>}
      showTitleHeader
      isOpen={isOpen}
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
}
