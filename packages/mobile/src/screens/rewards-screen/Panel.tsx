import { useMemo } from 'react'

import { useFormattedProgressLabel } from '@audius/common/hooks'
import type { OptimisticUserChallenge } from '@audius/common/models'
import type { ChallengeRewardsInfo } from '@audius/common/utils'
import { getChallengeStatusLabel } from '@audius/common/utils'
import { Platform } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'

import { Flex, IconCheck, Text, useTheme } from '@audius/harmony-native'
import { ProgressBar } from 'app/components/progress-bar/ProgressBar'
import type { MobileChallengeConfig } from 'app/utils/challenges'
import { useThemeColors } from 'app/utils/theme'

const messages = {
  completeLabel: 'COMPLETE',
  claimReward: 'Claim This Reward',
  readyToClaim: 'Ready to Claim',
  pendingRewards: 'Reward Pending',
  viewDetails: 'View Details'
}

type PanelProps = {
  onPress: () => void
  challenge?: OptimisticUserChallenge
} & ChallengeRewardsInfo &
  MobileChallengeConfig

export const Panel = ({
  id,
  onPress,
  shortTitle,
  title,
  shortDescription,
  description,
  progressLabel,
  remainingLabel,
  challenge
}: PanelProps) => {
  const { neutralLight4 } = useThemeColors()
  const { spacing, color } = useTheme()

  const maxStepCount = challenge?.max_steps ?? 0
  const hasDisbursed = challenge?.state === 'disbursed'
  const shouldShowProgressBar =
    maxStepCount > 1 &&
    challenge?.challenge_type !== 'aggregate' &&
    !hasDisbursed
  const needsDisbursement = challenge && challenge.claimableAmount > 0

  const formattedProgressLabel: string = useFormattedProgressLabel({
    challenge,
    progressLabel,
    remainingLabel
  })

  const displayLabel = useMemo(() => {
    if (shouldShowProgressBar || needsDisbursement) {
      return formattedProgressLabel
    }

    if (!formattedProgressLabel || formattedProgressLabel.trim() === '') {
      return getChallengeStatusLabel(challenge, id)
    }

    return formattedProgressLabel
  }, [
    formattedProgressLabel,
    shouldShowProgressBar,
    needsDisbursement,
    challenge,
    id
  ])

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Flex
        border='default'
        borderRadius='l'
        pb='unit10'
        style={{ position: 'relative' }}
      >
        <Flex
          row
          justifyContent='flex-end'
          m='s'
          h={spacing.unit6}
          style={{ zIndex: 2 }}
        >
          {needsDisbursement ? (
            <Flex
              row
              alignItems='center'
              ph='s'
              borderRadius='circle'
              backgroundColor='default'
              border='default'
            >
              <Text size='s' strength='strong' color='accent'>
                {messages.readyToClaim}
              </Text>
            </Flex>
          ) : null}
        </Flex>
        <Flex ph='unit5' gap='s'>
          <Text variant='heading' size='s'>
            {shortTitle ?? title}
          </Text>
          <Text numberOfLines={2}>
            {shortDescription ?? (description ? description(challenge) : '')}
          </Text>
          <Flex mt='l' gap='l'>
            <Flex row alignItems='center' gap='xs'>
              {hasDisbursed ? (
                <IconCheck fill={neutralLight4} size='s' />
              ) : null}
              <Flex row alignItems='center'>
                <Text
                  variant='label'
                  size='l'
                  color='subdued'
                  style={{
                    lineHeight: Platform.OS === 'ios' ? 0 : undefined
                  }}
                >
                  {displayLabel}
                </Text>
              </Flex>
            </Flex>
            {shouldShowProgressBar ? (
              <ProgressBar
                progress={challenge?.current_step_count ?? 0}
                max={maxStepCount}
                variant='coin'
                style={{
                  root: {
                    backgroundColor: color.neutral.n50,
                    height: spacing.unit6,
                    borderRadius: spacing['3xl']
                  }
                }}
              />
            ) : null}
          </Flex>
        </Flex>
      </Flex>
    </TouchableOpacity>
  )
}
