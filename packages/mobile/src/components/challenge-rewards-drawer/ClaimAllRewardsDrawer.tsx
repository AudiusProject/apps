import { useCallback, useEffect, useState } from 'react'

import {
  formatCooldownChallenges,
  useChallengeCooldownSchedule
} from '@audius/common/hooks'
import {
  ClaimStatus,
  audioRewardsPageActions,
  audioRewardsPageSelectors
} from '@audius/common/store'
import { formatNumberCommas } from '@audius/common/utils'
import { ScrollView, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { Flex, Text, Button, IconArrowRight } from '@audius/harmony-native'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'
import { formatLabel } from 'app/utils/challenges'

import { AppDrawer, useDrawerState } from '../drawer/AppDrawer'
import LoadingSpinner from '../loading-spinner'
import { ProgressBar } from '../progress-bar'
import { SummaryTable } from '../summary-table'

const { claimAllChallengeRewards, resetAndCancelClaimReward } =
  audioRewardsPageActions
const { getClaimStatus } = audioRewardsPageSelectors

const messages = {
  claimSuccessMessage: 'All rewards successfully claimed!',
  pending: (amount: number) => `${formatNumberCommas(amount)} Pending`,
  claimAudio: (amount: number) => `Claim ${formatNumberCommas(amount)} $AUDIO`,
  claiming: 'Claiming $AUDIO',
  done: 'Done'
}

const MODAL_NAME = 'ClaimAllRewards'

const useStyles = makeStyles(({ spacing, palette, typography }) => ({
  button: {
    width: '100%' as const
  },
  stickyClaimRewardsContainer: {
    borderTopWidth: 1,
    borderTopColor: palette.borderDefault,
    paddingBottom: spacing(10),
    paddingHorizontal: spacing(4),
    paddingTop: spacing(4),
    width: '100%'
  },
  progressBar: {
    height: spacing(1),
    marginVertical: 0,
    paddingVertical: 0
  },
  spinner: {
    width: spacing(4),
    height: spacing(4)
  }
}))
const config = {
  id: 'rewards',
  title: 'Rewards',
  description: 'You can check and claim all your upcoming rewards here.'
}

export const ClaimAllRewardsDrawer = () => {
  const styles = useStyles()

  const dispatch = useDispatch()
  const { toast } = useToast()
  const claimStatus = useSelector(getClaimStatus)
  const { onClose } = useDrawerState(MODAL_NAME)
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
      toast({ content: messages.claimSuccessMessage, type: 'info' })
    }
  }, [hasClaimed, toast])

  const handleClose = useCallback(() => {
    dispatch(resetAndCancelClaimReward())
    onClose()
  }, [dispatch, onClose])

  const onClaim = useCallback(() => {
    const claims = claimableChallenges.map((challenge) => ({
      challengeId: challenge.challenge_id,
      specifiers: [
        { specifier: challenge.specifier, amount: challenge.amount }
      ],
      amount: challenge.amount
    }))
    dispatch(claimAllChallengeRewards({ claims }))
  }, [dispatch, claimableChallenges])

  return (
    <AppDrawer
      modalName={MODAL_NAME}
      onClose={handleClose}
      isFullscreen
      isGestureSupported={false}
      title={config.title}
    >
      <ScrollView>
        <Flex pv='xl' ph='l' gap='xl'>
          <Text variant='body' size='m'>
            {config.description}
          </Text>
          <SummaryTable
            title={'Rewards'}
            secondaryTitle={'AUDIO'}
            summaryLabelColor='accent'
            summaryValueColor='default'
            items={formatCooldownChallenges(cooldownChallenges).map(
              formatLabel
            )}
            summaryItem={summary}
          />
          {claimInProgress && totalClaimableCount > 1 ? (
            <Flex
              backgroundColor='surface1'
              gap='l'
              borderRadius='s'
              border='strong'
              p='l'
            >
              <Flex direction='row' justifyContent='space-between'>
                <Text variant='label' size='s' color='default'>
                  {messages.claiming}
                </Text>
                <Flex direction='row' gap='l'>
                  <Text variant='label' size='s' color='default'>
                    {`${formatNumberCommas(
                      totalClaimableAmount - claimableAmount
                    )}/${formatNumberCommas(totalClaimableAmount)}`}
                  </Text>
                  <LoadingSpinner style={styles.spinner} />
                </Flex>
              </Flex>
              <ProgressBar
                style={{
                  root: styles.progressBar
                }}
                max={totalClaimableAmount}
                progress={totalClaimableAmount - claimableAmount}
              />
            </Flex>
          ) : null}
        </Flex>
      </ScrollView>
      <View style={styles.stickyClaimRewardsContainer}>
        {claimableAmount > 0 && !hasClaimed ? (
          <Button
            disabled={claimInProgress}
            isLoading={claimInProgress}
            variant='primary'
            onPress={onClaim}
            iconRight={IconArrowRight}
            fullWidth
          >
            {messages.claimAudio(claimableAmount)}
          </Button>
        ) : (
          <Button variant='primary' onPress={handleClose} fullWidth>
            {messages.done}
          </Button>
        )}
      </View>
    </AppDrawer>
  )
}
