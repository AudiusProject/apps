import { useCallback } from 'react'

import {
  formatCooldownChallenges,
  useChallengeCooldownSchedule
} from '@audius/common/hooks'
import { modalsActions } from '@audius/common/store'
import { Image, View } from 'react-native'
import { useDispatch } from 'react-redux'

import {
  Button,
  Flex,
  Text,
  Paper,
  IconArrowRight
} from '@audius/harmony-native'
import TokenStill from 'app/assets/images/tokenSpinStill.png'
import { makeStyles } from 'app/styles'

const { setVisibility } = modalsActions

const messages = {
  pending: 'Pending',
  claimAllRewards: 'Claim All Rewards',
  moreInfo: 'More Info',
  available: '$AUDIO available',
  now: 'now!',
  totalReadyToClaim: 'Ready to Claim',
  availableMessage: (summaryItems: any[]) => {
    const filteredSummaryItems = summaryItems.filter(Boolean)
    const summaryItem = filteredSummaryItems.pop()
    const { value, label, claimableDate, isClose } = summaryItem ?? {}
    if (isClose) {
      return `${value} ${messages.available} ${label}`
    }
    return (
      <Text>
        {value} {messages.available} {label}&nbsp;
        <Text color='subdued'>{claimableDate.format('(M/D)')}</Text>
      </Text>
    )
  }
}

const useStyles = makeStyles(({ spacing, typography }) => ({
  pillContainer: {
    height: spacing(6),
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start'
  },
  pillMessage: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    fontSize: typography.fontSize.small,
    fontFamily: typography.fontByWeight.demiBold,
    lineHeight: spacing(4),
    borderWidth: 1,
    borderRadius: 12,
    borderColor: 'rgba(133,129,153,0.1)',
    overflow: 'hidden'
  },
  readyToClaimPill: {
    backgroundColor: 'rgba(133,129,153,0.1)'
  },
  token: {
    width: 24,
    height: 24
  }
}))

export const ClaimAllRewardsTile = () => {
  const styles = useStyles()
  const dispatch = useDispatch()
  const { cooldownChallenges, cooldownAmount, claimableAmount, isEmpty } =
    useChallengeCooldownSchedule({ multiple: true })

  const openClaimAllModal = useCallback(() => {
    dispatch(setVisibility({ modal: 'ClaimAllRewards', visible: true }))
  }, [dispatch])

  if (isEmpty) return null

  return (
    <Paper shadow='near' border='strong' p='l' gap='l'>
      <Flex direction='row' justifyContent='flex-start' gap='s'>
        {claimableAmount > 0 ? (
          <Image style={styles.token} source={TokenStill} />
        ) : null}
        <Text variant='heading' color='accent' size='s'>
          {messages.totalReadyToClaim}
        </Text>
      </Flex>
      {cooldownAmount > 0 ? (
        <View style={styles.pillContainer}>
          <Text style={[styles.pillMessage, styles.readyToClaimPill]}>
            {cooldownAmount} {messages.pending}
          </Text>
        </View>
      ) : null}
      <Text size='s' variant='body'>
        {claimableAmount > 0
          ? `${claimableAmount} ${messages.available} ${messages.now}`
          : messages.availableMessage(
              formatCooldownChallenges(cooldownChallenges)
            )}
      </Text>
      <Flex mt='s'>
        {claimableAmount > 0 ? (
          <Button
            onPress={openClaimAllModal}
            iconRight={IconArrowRight}
            size='small'
          >
            {messages.claimAllRewards}
          </Button>
        ) : cooldownAmount > 0 ? (
          <Button
            variant='secondary'
            onPress={openClaimAllModal}
            iconRight={IconArrowRight}
            size='small'
          >
            {messages.moreInfo}
          </Button>
        ) : null}
      </Flex>
    </Paper>
  )
}
