import { useCurrentAccount, useCurrentAccountUser } from '@audius/common/api'
import { useFormattedProgressLabel } from '@audius/common/hooks'
import {
  ChallengeName,
  ChallengeRewardID,
  Name,
  OptimisticUserChallenge
} from '@audius/common/models'
import { AIRDROP_PAGE } from '@audius/common/src/utils/route'
import {
  ChallengeRewardsModalType,
  CommonState,
  challengesSelectors
} from '@audius/common/store'
import { isNewChallenge } from '@audius/common/utils'
import {
  Box,
  Flex,
  IconCheck,
  IconHeadphones,
  Paper,
  ProgressBar,
  Text,
  useTheme
} from '@audius/harmony'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router'
import { useEffectOnce } from 'react-use'

import { make, track } from 'services/analytics'
import { doesMatchRoute } from 'utils/route'

import { StatusPill } from './StatusPill'

const { getOptimisticUserChallenges } = challengesSelectors

const PANEL_HEIGHT = 200
const PANEL_WIDTH = 320

type RewardPanelProps = {
  title: string
  description: (challenge?: OptimisticUserChallenge) => string
  progressLabel?: string
  remainingLabel?: string
  openModal: (modalType: ChallengeRewardsModalType) => void
  id: ChallengeRewardID
}

export const RewardPanel = ({
  id,
  title,
  description,
  openModal,
  progressLabel,
  remainingLabel
}: RewardPanelProps) => {
  const { color, spacing } = useTheme()
  const { data: currentAccount } = useCurrentAccount()
  const { data: currentUser } = useCurrentAccountUser()
  const userChallenges = useSelector((state: CommonState) =>
    getOptimisticUserChallenges(state, currentAccount, currentUser)
  )
  const location = useLocation()

  const openRewardModal = () => {
    openModal(id)
    track(
      make({ eventName: Name.REWARDS_CLAIM_DETAILS_OPENED, challengeId: id })
    )
  }
  useEffectOnce(() => {
    const match = doesMatchRoute(location, AIRDROP_PAGE)
    if (match) {
      openModal(ChallengeName.OneShot)
    }
  })

  const challenge = userChallenges[id]
  const hasDisbursed =
    challenge?.state === 'disbursed' ||
    (challenge?.challenge_id === ChallengeName.OneShot &&
      challenge?.disbursed_amount > 0)
  const needsDisbursement = Boolean(challenge && challenge.claimableAmount > 0)
  const shouldShowProgressBar =
    challenge &&
    challenge.max_steps &&
    challenge.max_steps > 1 &&
    challenge.challenge_type !== 'aggregate' &&
    !hasDisbursed
  const shouldShowNewChallengePill =
    (challenge?.challenge_id &&
      isNewChallenge(challenge?.challenge_id) &&
      !needsDisbursement) ??
    false

  const formattedProgressLabel: string = useFormattedProgressLabel({
    challenge,
    progressLabel,
    remainingLabel
  })

  return (
    <Paper
      onClick={openRewardModal}
      flex={`1 1 calc(50% - ${spacing.unit4}px)`}
      column
      m='s'
      shadow='flat'
      border='strong'
      css={{
        minWidth: PANEL_WIDTH,
        minHeight: PANEL_HEIGHT,
        backgroundColor: hasDisbursed ? color.neutral.n25 : undefined
      }}
    >
      <Flex column h='100%'>
        <Flex
          justifyContent='flex-end'
          p='s'
          w='100%'
          css={{ position: 'absolute' }}
        >
          <StatusPill
            shouldShowClaimPill={!!needsDisbursement}
            shouldShowNewChallengePill={shouldShowNewChallengePill}
          />
        </Flex>
        <Flex column h='100%' gap='l' ph='xl' pv='unit9'>
          <Flex column alignItems='flex-start' w='100%' gap='s'>
            <Text variant='heading' size='s' textAlign='left'>
              {title}
            </Text>
            <Flex css={{ minHeight: 40 }}>
              <Text variant='body' textAlign='left'>
                {description(challenge)}
              </Text>
            </Flex>
          </Flex>
          <Flex alignItems='center' gap='s'>
            {challenge?.challenge_id === ChallengeName.ListenStreakEndless ? (
              <IconHeadphones size='s' color='subdued' />
            ) : needsDisbursement ? (
              <IconCheck size='s' color='subdued' />
            ) : null}
            <Box mr='l'>
              <Text variant='label' size='l' color='subdued'>
                {formattedProgressLabel}
              </Text>
            </Box>
            {shouldShowProgressBar && challenge.max_steps && (
              <Box flex='1 1 0'>
                <ProgressBar
                  value={challenge?.current_step_count ?? 0}
                  max={challenge?.max_steps}
                />
              </Box>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Paper>
  )
}
