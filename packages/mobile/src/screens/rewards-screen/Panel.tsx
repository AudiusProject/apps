import { useCurrentAccountUser } from '@audius/common/api'
import { useFormattedProgressLabel } from '@audius/common/hooks'
import type { OptimisticUserChallenge } from '@audius/common/models'
import { useTierAndVerifiedForUser } from '@audius/common/store/wallet/utils'
import type { ChallengeRewardsInfo } from '@audius/common/utils'
import { isRewardOpenToAll } from '@audius/common/utils'
import { useNavigation } from '@react-navigation/native'
import type { ProfileTabScreenParamList } from 'app/screens/app-screen/types'
import { Platform } from 'react-native'
import { TouchableOpacity, View } from 'react-native-gesture-handler'
import LinearGradient from 'react-native-linear-gradient'

import {
  Flex,
  IconCheck,
  IconLock,
  PlainButton,
  Text,
  useTheme
} from '@audius/harmony-native'
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
  const navigation = useNavigation<ProfileTabScreenParamList>()
  const { data: currentUser } = useCurrentAccountUser()
  const { isVerified } = useTierAndVerifiedForUser(currentUser?.user_id)
  const isOpenToAll = isRewardOpenToAll(id)
  const requiresVerification = !isOpenToAll && !isVerified

  const maxStepCount = challenge?.max_steps ?? 0
  const hasDisbursed = challenge?.state === 'disbursed'
  const shouldShowProgressBar =
    maxStepCount > 1 &&
    challenge?.challenge_type !== 'aggregate' &&
    !hasDisbursed
  const needsDisbursement = challenge && challenge.claimableAmount > 0

  const shouldShowProgressLabel = !!progressLabel

  const formattedProgressLabel: string = useFormattedProgressLabel({
    challenge,
    progressLabel,
    remainingLabel
  })

  const handlePress = () => {
    if (requiresVerification) {
      navigation.push('AccountSettingsScreen')
      return
    }
    onPress()
  }

  return (
    <TouchableOpacity
      onPress={requiresVerification ? undefined : handlePress}
      activeOpacity={requiresVerification ? 1 : 0.7}
    >
      <Flex
        border='default'
        borderRadius='l'
        pb='unit10'
        style={{ position: 'relative' }}
      >
        {requiresVerification ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: spacing.l,
              zIndex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              padding: spacing.l,
              gap: spacing.l
            }}
          >
            <IconLock size='3xl' color='subdued' />
            <Text variant='body' size='m' textAlign='center' strength='strong'>
              Get verified to start earning rewards!
            </Text>
            <PlainButton
              onPress={() => {
                navigation.push('AccountSettingsScreen')
              }}
            >
              Settings &gt;
            </PlainButton>
          </View>
        ) : null}
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
            {shortDescription || description(challenge)}
          </Text>
          <Flex mt='l' gap='l'>
            {shouldShowProgressLabel ? (
              <Flex row alignItems='center' gap='xs'>
                {hasDisbursed ? (
                  <IconCheck fill={neutralLight4} size='s' />
                ) : null}
                <Flex row alignItems='center'>
                  <Text
                    variant='label'
                    size='l'
                    color='subdued'
                    // iOS has a bug where emojis are not vertically aligned with the text
                    style={{
                      lineHeight: Platform.OS === 'ios' ? 0 : undefined
                    }}
                  >
                    {formattedProgressLabel}
                  </Text>
                </Flex>
              </Flex>
            ) : null}
            {shouldShowProgressBar ? (
              <Flex
                w='100%'
                h={spacing.unit6}
                borderRadius='3xl'
                backgroundColor='neutral.n50'
                style={{
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <LinearGradient
                  {...color.special.coinGradient}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        ((challenge?.current_step_count ?? 0) / maxStepCount) *
                          100
                      )
                    )}%`,
                    height: '100%',
                    borderRadius: spacing['3xl'],
                    position: 'absolute',
                    left: 0,
                    top: 0
                  }}
                />
              </Flex>
            ) : null}
          </Flex>
        </Flex>
      </Flex>
    </TouchableOpacity>
  )
}
