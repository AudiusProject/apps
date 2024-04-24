import { useCallback, useEffect, useContext, useMemo } from 'react'

import {
  formatCooldownChallenges,
  useChallengeCooldownSchedule,
  useFeatureFlag
} from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import {
  accountSelectors,
  challengesSelectors,
  audioRewardsPageSelectors,
  audioRewardsPageActions,
  ClaimStatus,
  musicConfettiActions,
  ChallengeRewardsModalType
} from '@audius/common/store'
import {
  fillString,
  formatNumberCommas,
  getAAOErrorEmojis,
  challengeRewardsConfig,
  isAudioMatchingChallenge,
  getClaimableChallengeSpecifiers
} from '@audius/common/utils'
import {
  ModalContent,
  IconCopy,
  IconValidationCheck,
  IconCheck,
  IconVerified,
  IconTwitter as IconTwitterBird,
  SocialButton,
  Button,
  Text,
  ProgressBar,
  Flex
} from '@audius/harmony'
import cn from 'classnames'
import { push as pushRoute } from 'connected-react-router'
import { useDispatch, useSelector } from 'react-redux'

import QRCode from 'assets/img/imageQR.png'
import { useModalState } from 'common/hooks/useModalState'
import { SummaryTable } from 'components/summary-table'
import Toast from 'components/toast/Toast'
import { ToastContext } from 'components/toast/ToastContext'
import Tooltip from 'components/tooltip/Tooltip'
import { ComponentPlacement, MountPlacement } from 'components/types'
import { useIsMobile } from 'hooks/useIsMobile'
import { useWithMobileStyle } from 'hooks/useWithMobileStyle'
import { getChallengeConfig } from 'pages/audio-rewards-page/config'
import { copyToClipboard, getCopyableLink } from 'utils/clipboardUtil'
import { CLAIM_REWARD_TOAST_TIMEOUT_MILLIS } from 'utils/constants'
import { openTwitterLink } from 'utils/tweet'

import ModalDrawer from '../ModalDrawer'

import { AudioMatchingRewardsModalContent } from './AudioMatchingRewardsModalContent'
import { ProgressDescription } from './ProgressDescription'
import { ProgressReward } from './ProgressReward'
import styles from './styles.module.css'

const { show: showConfetti } = musicConfettiActions
const {
  getAAOErrorCode,
  getChallengeRewardsModalType,
  getClaimStatus,
  getUndisbursedUserChallenges
} = audioRewardsPageSelectors
const {
  setChallengeRewardsModalType,
  resetAndCancelClaimReward,
  claimChallengeReward
} = audioRewardsPageActions
const { getOptimisticUserChallenges, getCompletionStages } = challengesSelectors
const getUserHandle = accountSelectors.getUserHandle

export const useRewardsModalType = (): [
  ChallengeRewardsModalType,
  (type: ChallengeRewardsModalType) => void
] => {
  const dispatch = useDispatch()
  const modalType = useSelector(getChallengeRewardsModalType)
  const setModalType = useCallback(
    (type: ChallengeRewardsModalType) => {
      dispatch(setChallengeRewardsModalType({ modalType: type }))
    },
    [dispatch]
  )
  return [modalType, setModalType]
}
const inviteLink = getCopyableLink('/signup?ref=%0')

const messages = {
  audio: '$AUDIO',
  everyDollarSpent: ' Every Dollar Spent',
  copyLabel: 'Copy to Clipboard',
  copiedLabel: 'Copied to Clipboard',
  inviteLabel: 'Copy Invite to Clipboard',
  inviteLink,
  qrText: 'Download the App',
  qrSubtext: 'Scan This QR Code with Your Phone Camera',
  rewardClaimed: 'Reward claimed successfully!',
  rewardAlreadyClaimed: 'Reward already claimed!',
  claimError:
    'Something has gone wrong, not all your rewards were claimed. Please try again or contact support@audius.co.',
  claimErrorAAO:
    'Your account is unable to claim rewards at this time. Please try again later or contact support@audius.co. ',
  claimYourReward: 'Claim This Reward',
  twitterShare: (modalType: 'referrals' | 'ref-v') =>
    `Share Invite With Your ${modalType === 'referrals' ? 'Friends' : 'Fans'}`,
  twitterCopy: `Come support me on @audius! Use my link and we both earn $AUDIO when you sign up.\n\n #audius #audiorewards\n\n`,
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
  profileCheckFollow: 'Follow Five People'
}

type InviteLinkProps = {
  className?: string
  inviteLink: string
}

export const InviteLink = ({ className, inviteLink }: InviteLinkProps) => {
  const wm = useWithMobileStyle(styles.mobile)

  const onButtonClick = useCallback(() => {
    copyToClipboard(inviteLink)
  }, [inviteLink])

  return (
    <Tooltip text={messages.copyLabel} placement={'top'} mount={'parent'}>
      <div className={wm(styles.toastContainer, { [className!]: !!className })}>
        <Toast
          text={messages.copiedLabel}
          delay={2000}
          placement={ComponentPlacement.TOP}
          mount={MountPlacement.PARENT}
        >
          <div className={wm(styles.inviteButtonContainer)}>
            <Button
              variant='primary'
              iconRight={IconCopy}
              onClick={onButtonClick}
              fullWidth
            >
              {messages.inviteLabel}
            </Button>
          </div>
        </Toast>
      </div>
    </Tooltip>
  )
}

type TwitterShareButtonProps = {
  modalType: 'referrals' | 'ref-v'
  inviteLink: string
}

const TwitterShareButton = ({
  modalType,
  inviteLink
}: TwitterShareButtonProps) => {
  const isMobile = useIsMobile()

  return (
    <SocialButton
      socialType='twitter'
      iconLeft={IconTwitterBird}
      onClick={() => openTwitterLink(inviteLink, messages.twitterCopy)}
      aria-label={messages.twitterReferralLabel}
      fullWidth={isMobile}
    >
      {messages.twitterShare(modalType)}
    </SocialButton>
  )
}

const ProfileChecks = () => {
  const completionStages = useSelector(getCompletionStages)
  const wm = useWithMobileStyle(styles.mobile)

  const config: Record<string, boolean> = {
    [messages.profileCheckNameAndHandle]: completionStages.hasNameAndHandle,
    [messages.profileCheckProfilePicture]: completionStages.hasProfilePicture,
    [messages.profileCheckCoverPhoto]: completionStages.hasCoverPhoto,
    [messages.profileCheckProfileDescription]:
      completionStages.hasProfileDescription,
    [messages.profileCheckFavorite]: completionStages.hasFavoritedItem,
    [messages.profileCheckRepost]: !!completionStages.hasReposted,
    [messages.profileCheckFollow]: completionStages.hasFollowedAccounts
  }

  return (
    <div className={wm(styles.profileTaskContainer)}>
      {Object.keys(config).map((key) => (
        <div className={wm(styles.profileTask)} key={key}>
          {config[key] ? (
            <IconValidationCheck />
          ) : (
            <div className={styles.profileTaskCircle} />
          )}
          <p className={cn({ [styles.completeText]: config[key] })}>{key}</p>
        </div>
      ))}
    </div>
  )
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
  const { isEnabled: isRewardsCooldownEnabled } = useFeatureFlag(
    FeatureFlags.REWARDS_COOLDOWN
  )
  const { toast } = useContext(ToastContext)
  const claimStatus = useSelector(getClaimStatus)
  const aaoErrorCode = useSelector(getAAOErrorCode)
  const claimInProgress =
    claimStatus === ClaimStatus.CLAIMING ||
    claimStatus === ClaimStatus.WAITING_FOR_RETRY
  const undisbursedUserChallenges = useSelector(getUndisbursedUserChallenges)
  const [modalType] = useRewardsModalType()
  const userHandle = useSelector(getUserHandle)
  const dispatch = useDispatch()
  const wm = useWithMobileStyle(styles.mobile)
  const isMobile = useIsMobile()
  const userChallenges = useSelector(getOptimisticUserChallenges)
  const challenge = userChallenges[modalType]
  const isCooldownChallenge = challenge && challenge.cooldown_days > 0
  const currentStepCount = challenge?.current_step_count || 0
  const { fullDescription, progressLabel, isVerifiedChallenge } =
    challengeRewardsConfig[modalType]
  const { modalButtonInfo } = getChallengeConfig(modalType)
  const {
    cooldownChallenges,
    summary,
    isEmpty: isCooldownChallengesEmpty
  } = useChallengeCooldownSchedule({ challengeId: challenge?.challenge_id })

  // We could just depend on undisbursedAmount here
  // But DN may have not indexed the challenge so check for client-side completion too
  // Note that we can't handle aggregate challenges optimistically
  let audioToClaim = 0
  let audioClaimedSoFar = 0
  if (challenge?.challenge_type === 'aggregate') {
    audioToClaim = challenge.claimableAmount
    audioClaimedSoFar = challenge.disbursed_amount
  } else if (challenge?.state === 'completed') {
    audioToClaim = challenge.totalAmount
    audioClaimedSoFar = 0
  } else if (challenge?.state === 'disbursed') {
    audioToClaim = 0
    audioClaimedSoFar = challenge.totalAmount
  }

  let linkType: 'complete' | 'inProgress' | 'incomplete'
  if (challenge?.state === 'completed') {
    linkType = 'complete'
  } else if (challenge?.state === 'in_progress') {
    linkType = 'inProgress'
  } else {
    linkType = 'incomplete'
  }
  const buttonInfo = modalButtonInfo?.[linkType] ?? null
  const buttonLink = buttonInfo?.link(userHandle)

  const showProgressBar =
    challenge &&
    challenge.max_steps > 1 &&
    challenge.challenge_type !== 'aggregate'

  const progressDescriptionLabel = isVerifiedChallenge ? (
    <div className={styles.verifiedChallenge}>
      <IconVerified />
      {messages.verifiedChallenge}
    </div>
  ) : (
    'Task'
  )
  const progressDescription = isRewardsCooldownEnabled ? (
    <div className={styles.audioMatchingDescription}>
      <Text variant='body'>{fullDescription?.(challenge)}</Text>
      {isCooldownChallenge ? (
        <Text variant='body' color='subdued'>
          {messages.cooldownDescription}
        </Text>
      ) : null}
    </div>
  ) : (
    fullDescription?.(challenge)
  )

  const renderProgressStatusLabel = () => (
    <div
      className={cn(styles.progressStatus, {
        [styles.incomplete]: challenge?.state === 'incomplete',
        [styles.inProgress]: challenge?.state === 'in_progress',
        [styles.complete]:
          challenge?.state === 'completed' || challenge?.state === 'disbursed'
      })}
    >
      {challenge?.state === 'incomplete' ? (
        <h3 className={styles.incomplete}>Incomplete</h3>
      ) : null}
      {challenge?.state === 'completed' || challenge?.state === 'disbursed' ? (
        <Flex gap='s' justifyContent='center' alignItems='center'>
          <IconCheck width={16} height={16} color='subdued' />
          <h3 className={styles.complete}>Complete</h3>
        </Flex>
      ) : null}
      {challenge?.state === 'in_progress' && progressLabel ? (
        <h3 className={styles.inProgress}>
          {fillString(
            progressLabel,
            formatNumberCommas(currentStepCount.toString()),
            formatNumberCommas(challenge?.max_steps?.toString() ?? '')
          )}
        </h3>
      ) : null}
    </div>
  )

  const inviteLink = useMemo(
    () => (userHandle ? fillString(messages.inviteLink, userHandle) : ''),
    [userHandle]
  )

  const errorContent =
    claimStatus === ClaimStatus.ERROR ? (
      <div className={styles.claimError}>{getErrorMessage(aaoErrorCode)}</div>
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

  const onClaimRewardClicked = useCallback(() => {
    if (challenge) {
      dispatch(
        claimChallengeReward({
          claim: {
            challengeId: challenge.challenge_id,
            specifiers:
              challenge.challenge_type === 'aggregate'
                ? getClaimableChallengeSpecifiers(
                    challenge.undisbursedSpecifiers,
                    undisbursedUserChallenges
                  )
                : [
                    { specifier: challenge.specifier, amount: challenge.amount }
                  ],
            amount: challenge.claimableAmount
          },
          retryOnFailure: true
        })
      )
    }
  }, [challenge, dispatch, undisbursedUserChallenges])

  const goToRoute = useCallback(() => {
    if (!buttonLink) return
    dispatch(pushRoute(buttonLink))
    dismissModal()
  }, [buttonLink, dispatch, dismissModal])

  const formatLabel = useCallback((item: any) => {
    const { label, claimableDate, isClose } = item
    const formattedLabel = isClose ? (
      label
    ) : (
      <Text>
        {label}&nbsp;
        <Text color='subdued'>{claimableDate.format('(M/D)')}</Text>
      </Text>
    )
    return {
      ...item,
      label: formattedLabel
    }
  }, [])

  const renderCooldownSummaryTable = () => {
    if (
      isRewardsCooldownEnabled &&
      isCooldownChallenge &&
      !isCooldownChallengesEmpty
    ) {
      return (
        <SummaryTable
          title={messages.upcomingRewards}
          items={formatCooldownChallenges(cooldownChallenges).map(formatLabel)}
          summaryItem={summary}
          secondaryTitle={messages.audio}
          summaryLabelColor='accent'
          summaryValueColor='default'
        />
      )
    }
    return null
  }

  const renderProgressBar = () => {
    if (showProgressBar) {
      return (
        <div className={wm(styles.progressBarSection)}>
          {isMobile ? (
            <h3>Progress</h3>
          ) : modalType === 'profile-completion' ? (
            <ProfileChecks />
          ) : null}
          <ProgressBar
            className={wm(styles.progressBar)}
            value={currentStepCount}
            max={challenge?.max_steps}
          />
        </div>
      )
    }
    return null
  }

  const renderReferralContent = () => {
    if (userHandle && (modalType === 'referrals' || modalType === 'ref-v')) {
      return (
        <div className={wm(styles.buttonContainer)}>
          <TwitterShareButton modalType={modalType} inviteLink={inviteLink} />
          <div className={styles.buttonSpacer} />
          <InviteLink inviteLink={inviteLink} />
        </div>
      )
    }
    return null
  }

  const renderMobileInstallContent = () => {
    if (modalType === 'mobile-install') {
      return (
        <div className={wm(styles.qrContainer)}>
          <img className={styles.qr} src={QRCode} alt='QR Code' />
          <div className={styles.qrTextContainer}>
            <h2 className={styles.qrText}>{messages.qrText}</h2>
            <h3 className={styles.qrSubtext}>{messages.qrSubtext}</h3>
          </div>
        </div>
      )
    }
    return null
  }

  const renderClaimButton = () => {
    if (audioToClaim > 0) {
      return (
        <>
          <div className={styles.claimRewardAmountLabel}>
            {`${audioToClaim} ${messages.claimAmountLabel}`}
          </div>
          <Button
            variant='primary'
            isLoading={claimInProgress}
            iconRight={IconCheck}
            onClick={onClaimRewardClicked}
          >
            {messages.claimYourReward}
          </Button>
        </>
      )
    }
    return null
  }

  const renderClaimedSoFarContent = () => {
    if (audioClaimedSoFar > 0 && challenge?.state !== 'disbursed') {
      return (
        <div className={styles.claimRewardClaimedAmountLabel}>
          {`${formatNumberCommas(audioClaimedSoFar)} ${messages.claimedSoFar}`}
        </div>
      )
    }
    return null
  }

  if (isAudioMatchingChallenge(modalType)) {
    return (
      <AudioMatchingRewardsModalContent
        errorContent={errorContent}
        onNavigateAway={dismissModal}
        onClaimRewardClicked={onClaimRewardClicked}
        claimInProgress={claimInProgress}
        challenge={challenge}
        challengeName={modalType}
      />
    )
  } else {
    return (
      <div className={wm(styles.container)}>
        {isMobile ? (
          <>
            <ProgressDescription
              label={progressDescriptionLabel}
              description={progressDescription}
            />
            <div className={wm(styles.progressCard)}>
              <div className={wm(styles.progressInfo)}>
                <ProgressReward
                  amount={formatNumberCommas(challenge?.totalAmount ?? '')}
                  subtext={messages.audio}
                />
                {renderProgressBar()}
              </div>
              {renderProgressStatusLabel()}
            </div>
            {modalType === 'profile-completion' ? <ProfileChecks /> : null}
          </>
        ) : (
          <>
            <div className={styles.progressCard}>
              <div className={styles.progressInfo}>
                <ProgressDescription
                  label={progressDescriptionLabel}
                  description={progressDescription}
                />
                <ProgressReward
                  amount={formatNumberCommas(challenge?.totalAmount ?? '')}
                  subtext={messages.audio}
                />
              </div>
              {renderProgressBar()}
              {renderProgressStatusLabel()}
            </div>
            {renderCooldownSummaryTable()}
          </>
        )}
        {renderReferralContent()}
        {renderMobileInstallContent()}
        {buttonLink && challenge?.state !== 'completed' ? (
          <Button
            variant='primary'
            fullWidth={isMobile}
            onClick={goToRoute}
            iconLeft={buttonInfo?.leftIcon}
            iconRight={buttonInfo?.rightIcon}
          >
            {buttonInfo?.label}
          </Button>
        ) : null}
        {audioToClaim > 0 ||
        (audioClaimedSoFar > 0 && challenge?.state !== 'disbursed') ? (
          <div className={wm(styles.claimRewardWrapper)}>
            {renderClaimButton()}
            {renderClaimedSoFarContent()}
          </div>
        ) : null}
        {errorContent}
      </div>
    )
  }
}

export const ChallengeRewardsModal = () => {
  const [modalType] = useRewardsModalType()
  const [isOpen, setOpen] = useModalState('ChallengeRewardsExplainer')
  const dispatch = useDispatch()
  const wm = useWithMobileStyle(styles.mobile)
  const onClose = useCallback(() => {
    setOpen(false)
    // Cancel any claims on close so that the state is fresh for other rewards
    dispatch(resetAndCancelClaimReward())
  }, [dispatch, setOpen])
  const [isHCaptchaModalOpen] = useModalState('HCaptcha')

  const { title, icon } = getChallengeConfig(modalType)

  return (
    <ModalDrawer
      title={
        <>
          {icon}
          {title}
        </>
      }
      showTitleHeader
      isOpen={isOpen}
      onClose={onClose}
      isFullscreen={true}
      useGradientTitle={false}
      titleClassName={wm(styles.title)}
      headerContainerClassName={styles.header}
      showDismissButton={!isHCaptchaModalOpen}
      dismissOnClickOutside={!isHCaptchaModalOpen}
    >
      <ModalContent>
        <ChallengeRewardsBody dismissModal={onClose} />
      </ModalContent>
    </ModalDrawer>
  )
}
