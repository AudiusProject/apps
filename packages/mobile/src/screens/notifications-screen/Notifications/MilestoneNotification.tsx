import React, { useCallback } from 'react'

import {
  useCurrentAccountUser,
  useNotificationEntity
} from '@audius/common/api'
import type { User } from '@audius/common/models'
import type {
  EntityType,
  MilestoneNotification as MilestoneNotificationType,
  ShareMilestoneStat
} from '@audius/common/store'
import { Achievement, Entity } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import { formatCount, isEntityHidden, route } from '@audius/common/utils'

import { IconTrophy } from '@audius/harmony-native'
import { useNotificationNavigation } from 'app/hooks/useNotificationNavigation'

import {
  EntityLink,
  NotificationHeader,
  NotificationText,
  NotificationTile,
  NotificationTitle,
  NotificationShareCardButton,
  NotificationXButton
} from '../Notification'
import { getEntityRoute } from '../Notification/utils'

const AUDIUS_URL = 'https://audius.co'

const messages = {
  title: 'Milestone Reached!',
  follows: 'You have reached over',
  your: 'Your',
  reached: 'has reached over',
  followerAchievementText: (followersCount: number) =>
    `I just hit over ${followersCount} followers on @audius! $AUDIO`,
  achievementText: (
    type: string,
    name: string,
    value: number,
    achievement: string
  ) => {
    const achievementText =
      achievement === Achievement.Listens ? 'plays' : achievement
    return `My ${type} ${name} has more than ${value} ${achievementText} on @audius\nCheck it out! $AUDIO`
  }
}

const getXShareData = (
  notification: MilestoneNotificationType,
  entity?: Nullable<EntityType>,
  user?: Nullable<User>
) => {
  const { achievement, value } = notification
  switch (achievement) {
    case Achievement.Followers: {
      if (user) {
        const link = `${AUDIUS_URL}${route.profilePage(user.handle)}`
        const text = messages.followerAchievementText(value)
        return { text, link }
      }
      return { text: '', link: '' }
    }
    case Achievement.Favorites:
    case Achievement.Listens:
    case Achievement.Reposts: {
      if (entity && !isEntityHidden(entity)) {
        const { entityType } = notification
        const link = getEntityRoute(entity, true)
        const text = messages.achievementText(
          entityType,
          'title' in entity ? entity.title : entity.playlist_name,
          value,
          achievement
        )
        return { text, link }
      }
      return { text: '', link: '' }
    }
    default: {
      return { text: '', link: '' }
    }
  }
}

const statKinds: Partial<Record<Achievement, 'listens' | 'reposts' | 'favorites'>> =
  {
    [Achievement.Listens]: 'listens',
    [Achievement.Reposts]: 'reposts',
    [Achievement.Favorites]: 'favorites'
  }

// Track milestones get a stat card; collection and follower milestones keep X
const getShareCardStat = (
  notification: MilestoneNotificationType,
  entity?: Nullable<EntityType>
): Nullable<ShareMilestoneStat> => {
  const kind = statKinds[notification.achievement]
  if (
    !kind ||
    !('entityType' in notification) ||
    notification.entityType !== Entity.Track ||
    !entity ||
    isEntityHidden(entity)
  ) {
    return null
  }
  return { kind, count: notification.value }
}

type MilestoneNotificationProps = {
  notification: MilestoneNotificationType
}

export const MilestoneNotification = (props: MilestoneNotificationProps) => {
  const { notification } = props
  const { achievement } = notification
  const entity = useNotificationEntity(notification)
  const { data: user } = useCurrentAccountUser()
  const navigation = useNotificationNavigation()

  const handlePress = useCallback(() => {
    navigation.navigate(notification)
  }, [navigation, notification])

  const renderBody = () => {
    const { achievement, value } = notification
    if (achievement === Achievement.Followers) {
      return `${messages.follows} ${formatCount(value)} ${achievement}`
    } else if (entity) {
      const { entityType } = notification
      const achievementText =
        achievement === Achievement.Listens ? 'plays' : achievement

      return (
        <>
          {messages.your} {entityType} <EntityLink entity={entity} />{' '}
          {messages.reached} {formatCount(value)} {achievementText}
        </>
      )
    }
    return null
  }

  const isMissingRequiredUser = achievement === Achievement.Followers && !user
  const isMissingRequiredEntity =
    achievement !== Achievement.Followers && !entity

  if (isMissingRequiredUser || isMissingRequiredEntity) {
    return null
  }

  const { link, text } = getXShareData(notification, entity, user)
  const shareCardStat = getShareCardStat(notification, entity)

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconTrophy}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationText>{renderBody()}</NotificationText>
      {shareCardStat ? (
        <NotificationShareCardButton
          trackId={notification.entityId}
          stat={shareCardStat}
        />
      ) : link && text ? (
        <NotificationXButton type='static' url={link} shareText={text} />
      ) : null}
    </NotificationTile>
  )
}
