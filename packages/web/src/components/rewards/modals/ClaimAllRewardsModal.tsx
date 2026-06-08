import { useCallback, useContext, useEffect, useState } from 'react'

import {
  formatCooldownChallenges,
  useChallengeCooldownSchedule
} from '@audius/common/hooks'
import { registerNiceModalId } from '@audius/common/services'
import {
  ClaimStatus,
  audioRewardsPageActions,
  audioRewardsPageSelectors,
  musicConfettiActions
} from '@audius/common/store'
import { formatNumberCommas } from '@audius/common/utils'
import {
  Box,
  Button,
  Flex,
  IconArrowRight,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ProgressBar,
  Text
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { useDispatch, useSelector } from 'react-redux'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { SummaryTable } from 'components/summary-table'
import { ToastContext } from 'components/toast/ToastContext'
import { CLAIM_REWARD_TOAST_TIMEOUT_MILLIS } from 'utils/constants'

const messages = {
  upcomingRewards: 'Upcoming Rewards',
  claimAudio: (amount: string) => `Claim ${amount} $AUDIO`,
  claiming: 'Claiming $AUDIO',
  rewardsClaimed: 'All rewards claimed successfully!',
  rewards: 'Rewards',
  audio: '$AUDIO',
  description: 'You can check and claim all your upcoming rewards here.',
  done: 'Done'
}

const { show: showConfetti } = musicConfettiActions
const { claimAllChallengeRewards, resetAndCancelClaimReward } =
  audioRewardsPageActions
const { getClaimStatus } = audioRewardsPageSelectors

export const ClaimAllRewardsModal = NiceModal.create(() => {
  const dispatch = useDispatch()
  const { toast } = useContext(ToastContext)
  const modal = useModal()
  const isOpen = modal.visible
  const setOpen = useCallback(
    (open: boolean) => {
      if (!open) modal.hide()
    },
    [modal]
  )
  const claimStatus = useSelector(getClaimStatus)
  const { claimableAmount, claimableChallenges, cooldownChallenges, summary } =
    useChallengeCooldownSchedule({
      multiple: true
    })
  const claimInProgress = claimStatus === ClaimStatus.CUMULATIVE_CLAIMING
  const hasClaimed = claimStatus === ClaimStatus.CUMULATIVE_SUCCESS

  const [totalClaimableAmount, setTotalClaimableAmount] =
    useState(claimableAmount)
  const [totalClaimableCount, setTotalClaimableCount] = useState(
    claimableChallenges.length
  )
  useEffect(() => {
    setTotalClaimableAmount((totalClaimableAmount) =>
      Math.max(totalClaimableAmount, claimableAmount)
    )
    setTotalClaimableCount((totalClaimableCount) =>
      Math.max(totalClaimableCount, claimableChallenges.length)
    )
  }, [
    claimableAmount,
    claimableChallenges.length,
    setTotalClaimableAmount,
    setTotalClaimableCount
  ])

  useEffect(() => {
    if (hasClaimed) {
      toast(messages.rewardsClaimed, CLAIM_REWARD_TOAST_TIMEOUT_MILLIS)
      dispatch(showConfetti())
    }
  }, [toast, dispatch, hasClaimed])

  const onClaimRewardClicked = useCallback(() => {
    const claims = claimableChallenges.map((challenge) => ({
      challengeId: challenge.challenge_id,
      specifiers: [
        { specifier: challenge.specifier, amount: challenge.amount }
      ],
      amount: challenge.amount
    }))
    dispatch(claimAllChallengeRewards({ claims }))
  }, [dispatch, claimableChallenges])

  const handleClose = useCallback(() => {
    dispatch(resetAndCancelClaimReward())
    setOpen(false)
  }, [dispatch, setOpen])

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

  return (
    <Modal size='medium' isOpen={isOpen} onClose={handleClose}>
      <ModalHeader onClose={handleClose}>
        <ModalTitle title={messages.rewards} />
      </ModalHeader>
      <ModalContent>
        <Flex direction='column' gap='2xl' mt='s'>
          <Text variant='body' textAlign='left'>
            {messages.description}
          </Text>
          <SummaryTable
            title={messages.upcomingRewards}
            items={formatCooldownChallenges(cooldownChallenges).map(
              formatLabel
            )}
            summaryItem={summary}
            secondaryTitle={messages.audio}
            summaryLabelColor='accent'
            summaryValueColor='default'
          />
          {claimInProgress && totalClaimableCount > 1 ? (
            <Flex
              direction='column'
              backgroundColor='surface1'
              gap='l'
              borderRadius='s'
              border='strong'
              p='l'
            >
              <Flex justifyContent='space-between'>
                <Text variant='label' size='s' color='default'>
                  {messages.claiming}
                </Text>
                <Flex gap='l'>
                  <Text variant='label' size='s' color='default'>
                    {`${formatNumberCommas(
                      totalClaimableAmount - claimableAmount
                    )}/${formatNumberCommas(totalClaimableAmount)}`}
                  </Text>
                  <Box h='unit4' w='unit4'>
                    <LoadingSpinner />
                  </Box>
                </Flex>
              </Flex>
              <ProgressBar
                min={0}
                max={totalClaimableAmount}
                value={totalClaimableAmount - claimableAmount}
              />
            </Flex>
          ) : null}
          {claimableAmount > 0 && !hasClaimed ? (
            <Button
              disabled={claimInProgress}
              isLoading={claimInProgress}
              onClick={onClaimRewardClicked}
              iconRight={IconArrowRight}
              fullWidth
            >
              {claimInProgress
                ? messages.claiming
                : messages.claimAudio(formatNumberCommas(claimableAmount))}
            </Button>
          ) : (
            <Button variant='primary' fullWidth onClick={() => setOpen(false)}>
              {messages.done}
            </Button>
          )}
        </Flex>
      </ModalContent>
    </Modal>
  )
})

NiceModal.register('ClaimAllRewards', ClaimAllRewardsModal)
registerNiceModalId('ClaimAllRewards')
