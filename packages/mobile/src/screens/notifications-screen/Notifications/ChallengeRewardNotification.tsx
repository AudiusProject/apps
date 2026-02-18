import { useCallback, useMemo } from 'react'

import { ChallengeName } from '@audius/common/models'
import type { ChallengeRewardNotification as ChallengeRewardNotificationType } from '@audius/common/store'
import {
  challengeRewardsConfig,
  formatNumberCommas
} from '@audius/common/utils'
import type { FixedDecimal } from '@audius/fixed-decimal'
import { AUDIO } from '@audius/fixed-decimal'
import { Image } from 'react-native'

import { IconAudiusLogo } from '@audius/harmony-native'
import { useNotificationNavigation } from 'app/hooks/useNotificationNavigation'
import { getChallengeConfig } from 'app/utils/challenges'

import {
  NotificationTile,
  NotificationHeader,
  NotificationText,
  NotificationTitle,
  NotificationXButton
} from '../Notification'

const formatNumber = (amount: FixedDecimal) => {
  return formatNumberCommas(Number(amount.trunc().toString()))
}

const messages = {
  amountEarned: (amount: FixedDecimal) =>
    `You've earned ${formatNumber(amount)} $AUDIO`,
  referredText: 'for being referred! Invite your friends to join to earn more!',
  challengeCompleteText: 'for completing this challenge!',
  xShareText: 'I earned $AUDIO for completing challenges on @audius',
  streakMilestone: (amountEarned: number, listenStreak: number) =>
    `You've earned ${amountEarned} $AUDIO for hitting Day ${listenStreak} of your listening streak! You'll now earn an additional $AUDIO reward for every day you keep your streak going!`,
  streakMaintenance: (amountEarned: number) =>
    `You've earned ${amountEarned} $AUDIO for maintaining your listening streak! Keep your streak going to continue earning daily rewards!`
}

type ChallengeRewardNotificationProps = {
  notification: ChallengeRewardNotificationType
}

const trendingChallengeIdMapping = {
  tt: 'trending-track',
  tut: 'trending-underground-track'
}

export const ChallengeRewardNotification = (
  props: ChallengeRewardNotificationProps
) => {
  const { notification } = props
  const { challengeId, listenStreak } = notification
  // Skip deprecated trending-playlist (tp) notifications
  if (challengeId === 'tp' || challengeId === 'trending-playlist') {
    return null
  }

  const mappedChallengeRewardsConfigKey =
    challengeId in trendingChallengeIdMapping
      ? trendingChallengeIdMapping[challengeId]
      : challengeId

  const info = challengeRewardsConfig[mappedChallengeRewardsConfigKey]
  const icon = getChallengeConfig(challengeId)?.icon
  const amount = AUDIO(BigInt(notification.amount))
  const navigation = useNotificationNavigation()

  const handlePress = useCallback(() => {
    navigation.navigate(notification)
  }, [navigation, notification])

  const title = useMemo(() => {
    if (challengeId === ChallengeName.ListenStreakEndless && listenStreak) {
      return `${info?.title}: Day ${listenStreak}`
    } else {
      return info?.title
    }
  }, [challengeId, listenStreak, info])

  const notificationText = useMemo(() => {
    const amountEarned = Number(formatNumber(amount))
    switch (challengeId) {
      case ChallengeName.ListenStreakEndless:
        if (amountEarned > 1) {
          return messages.streakMilestone(amountEarned, listenStreak ?? 0)
        }
        return messages.streakMaintenance(amountEarned)
      default:
        return `${messages.amountEarned(amount)} ${messages.challengeCompleteText}`
    }
  }, [challengeId, amount, listenStreak])

  if (!info) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader
        icon={IconAudiusLogo}
        emoji={
          icon ? (
            <Image source={icon} style={{ width: 32, height: 32 }} />
          ) : undefined
        }
      >
        <NotificationTitle>{title}</NotificationTitle>
      </NotificationHeader>
      <NotificationText>{notificationText}</NotificationText>
      <NotificationXButton type='static' shareText={messages.xShareText} />
    </NotificationTile>
  )
}
