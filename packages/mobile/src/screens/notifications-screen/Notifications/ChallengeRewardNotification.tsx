import { useCallback, useMemo } from 'react'

import type { BNAudio } from '@audius/common/models'
import { ChallengeName } from '@audius/common/models'
import type { ChallengeRewardNotification as ChallengeRewardNotificationType } from '@audius/common/store'
import {
  challengeRewardsConfig,
  formatNumberCommas,
  stringWeiToAudioBN
} from '@audius/common/utils'
import { Platform, Image } from 'react-native'

import { IconAudiusLogo } from '@audius/harmony-native'
import { useNotificationNavigation } from 'app/hooks/useNotificationNavigation'
import { getChallengeConfig } from 'app/utils/challenges'

import {
  NotificationTile,
  NotificationHeader,
  NotificationText,
  NotificationTitle,
  NotificationTwitterButton
} from '../Notification'

const formatNumber = (amount: BNAudio) => {
  return formatNumberCommas(Number(amount.toString()))
}

const messages = {
  amountEarned: (amount: BNAudio) =>
    `You've earned ${formatNumber(amount)} $AUDIO`,
  referredText: 'for being referred! Invite your friends to join to earn more!',
  challengeCompleteText: 'for completing this challenge!',
  twitterShareText:
    'I earned $AUDIO for completing challenges on @audius #AudioRewards',
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
  tp: 'trending-playlist',
  tut: 'trending-underground-track'
}

export const ChallengeRewardNotification = (
  props: ChallengeRewardNotificationProps
) => {
  const { notification } = props
  const { challengeId, listenStreak } = notification
  const mappedChallengeRewardsConfigKey =
    challengeId in trendingChallengeIdMapping
      ? trendingChallengeIdMapping[challengeId]
      : challengeId

  const info = challengeRewardsConfig[mappedChallengeRewardsConfigKey]
  const icon = getChallengeConfig(challengeId)?.icon
  const amount = stringWeiToAudioBN(notification.amount)
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
        <NotificationTitle>
          {Platform.OS === 'ios' && title.includes('Tip')
            ? title.replace('Tip', '$AUDIO')
            : title}
        </NotificationTitle>
      </NotificationHeader>
      <NotificationText>{notificationText}</NotificationText>
      <NotificationTwitterButton
        type='static'
        shareText={messages.twitterShareText}
      />
    </NotificationTile>
  )
}
