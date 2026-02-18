import { useCallback, useMemo } from 'react'

import { ChallengeName, ChallengeRewardID, Name } from '@audius/common/models'
import { ChallengeRewardNotification as ChallengeRewardNotificationType } from '@audius/common/store'
import { formatNumberCommas, route } from '@audius/common/utils'
import { AUDIO, FixedDecimal } from '@audius/fixed-decimal'
import { useDispatch } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import { XShareButton } from 'components/x-share-button/XShareButton'
import { getChallengeConfig } from 'pages/rewards-page/config'
import { env } from 'services/env'
import { push } from 'utils/navigation'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { IconRewards } from './components/icons'

const { REWARDS_PAGE } = route

const formatNumber = (amount: FixedDecimal) => {
  return formatNumberCommas(Number(amount.trunc().toString()))
}

const messages = {
  amountEarned: (amount: FixedDecimal) =>
    `You've earned ${formatNumber(amount)} $AUDIO`,
  referredText:
    ' for being referred! Invite your friends to join to earn more!',
  challengeCompleteText: ' for completing this challenge!',
  xShareText: 'I earned $AUDIO for completing challenges on @audius',
  streakMilestone: (amountEarned: number, listenStreak: number) =>
    `You've earned ${amountEarned} $AUDIO for hitting Day ${listenStreak} of your listening streak! You'll now earn an additional $AUDIO reward for every day you keep your streak going!`,
  streakMaintenance: (amountEarned: number) =>
    `You've earned ${amountEarned} $AUDIO for maintaining your listening streak! Keep your streak going to continue earning daily rewards!`
}

type ChallengeRewardNotificationProps = {
  notification: ChallengeRewardNotificationType
}

const trendingChallengeIdMapping: {
  [key in ChallengeRewardID]?: ChallengeRewardID
} = {
  tt: 'trending-track',
  tut: 'trending-underground'
}

export const ChallengeRewardNotification = (
  props: ChallengeRewardNotificationProps
) => {
  const { notification } = props
  const { challengeId, timeLabel, isViewed, type, listenStreak } = notification
  const dispatch = useDispatch()
  const record = useRecord()
  // Skip deprecated trending-playlist (tp) notifications
  if (challengeId === 'tp' || challengeId === 'trending-playlist') {
    return null
  }

  const mappedChallengeRewardsConfigKey =
    trendingChallengeIdMapping[challengeId] ?? challengeId

  const { title, icon } = getChallengeConfig(mappedChallengeRewardsConfigKey)
  const amount = AUDIO(BigInt(notification.amount))
  const handleClick = useCallback(() => {
    dispatch(push(REWARDS_PAGE))
    record(
      make(Name.NOTIFICATIONS_CLICK_TILE, { kind: type, link_to: REWARDS_PAGE })
    )
  }, [dispatch, record, type])

  const notificationTitle = useMemo(() => {
    if (challengeId === ChallengeName.ListenStreakEndless) {
      return `${title}: Day ${listenStreak}`
    }
    return title
  }, [challengeId, listenStreak, title])

  const amountEarnedText = useMemo(() => {
    switch (challengeId) {
      case ChallengeName.ListenStreakEndless: {
        const amountEarned = Number(formatNumber(amount))
        if (amountEarned > 1) {
          return messages.streakMilestone(amountEarned, listenStreak ?? 0)
        }
        return messages.streakMaintenance(amountEarned)
      }
      default:
        return messages.amountEarned(amount) + messages.challengeCompleteText
    }
  }, [challengeId, amount, listenStreak])

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconRewards>{icon}</IconRewards>}>
        <NotificationTitle>{notificationTitle}</NotificationTitle>
      </NotificationHeader>
      <NotificationBody>{amountEarnedText}</NotificationBody>
      <XShareButton
        type='static'
        url={env.AUDIUS_URL}
        shareText={messages.xShareText}
      />
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
