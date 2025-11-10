import { full, HashId, OptionalHashId } from '@audius/sdk'
import dayjs from 'dayjs'

import { BadgeTier, type ID } from '~/models'
import type { ChallengeRewardID } from '~/models/AudioRewards'
import type { StringUSDC, StringWei } from '~/models/Wallet'
import {
  Achievement,
  Entity,
  NotificationType,
  type Notification
} from '~/store/notifications/types'
import { removeNullable } from '~/utils/typeUtils'

const getTimeAgo = (date: number) => {
  const now = dayjs()
  const notifDate = dayjs.unix(date)
  const weeksAgo = now.diff(notifDate, 'week')
  if (weeksAgo) return `${weeksAgo} Week${weeksAgo > 1 ? 's' : ''} ago`
  const daysAgo = now.diff(notifDate, 'day')
  if (daysAgo) return `${daysAgo} Day${daysAgo > 1 ? 's' : ''} ago`
  const hoursAgo = now.diff(notifDate, 'hour')
  if (hoursAgo) return `${hoursAgo} Hour${hoursAgo > 1 ? 's' : ''} ago`
  const minutesAgo = now.diff(notifDate, 'minute')
  if (minutesAgo) return `${minutesAgo} Minute${minutesAgo > 1 ? 's' : ''} ago`
  return 'A few moments ago'
}

function formatBaseNotification(notification: full.Notification) {
  const timestamp = notification.actions[0].timestamp
  return {
    groupId: notification.groupId,
    timestamp,
    isViewed: !!notification.seenAt,
    id: `timestamp:${timestamp}:group_id:${notification.groupId}`,
    timeLabel: getTimeAgo(timestamp)
  }
}

const toEntityType = (
  type:
    | full.SaveOfRepostNotificationActionDataTypeEnum
    | full.SaveNotificationActionDataTypeEnum
    | full.RepostNotificationActionDataTypeEnum
    | full.RepostOfRepostNotificationActionDataTypeEnum
    | full.SaveOfRepostNotificationActionDataTypeEnum
) => {
  if (type === 'track') {
    return Entity.Track
  }
  if (type === 'album') {
    return Entity.Album
  }
  return Entity.Playlist
}

/**
 * Maps the SDK notifications type to the type that the UI expects,
 * decoding hashIds and in some cases extracting userId from the groupId
 * and other nuanced things on a per notification basis.
 */
export const notificationFromSDK = (
  notification: full.Notification
): Notification | undefined => {
  switch (notification.type) {
    case 'follow': {
      const userIds = notification.actions.map((action) => {
        const data = action.data
        return HashId.parse(data.followerUserId)
      })
      return {
        type: NotificationType.Follow,
        userIds,
        ...formatBaseNotification(notification)
      }
    }
    case 'repost': {
      let entityId = 0
      let entityType = Entity.Track
      const userIds = notification.actions
        .map((action) => {
          const data = action.data
          entityId = HashId.parse(data.repostItemId)
          entityType = toEntityType(data.type)
          return HashId.parse(data.userId)
        })
        .filter(removeNullable)
      return {
        type: NotificationType.Repost,
        userIds,
        entityId,
        entityType,
        ...formatBaseNotification(notification)
      }
    }
    case 'save': {
      let entityId = 0
      let entityType = Entity.Track
      const userIds = notification.actions
        .map((action) => {
          const data = action.data
          entityId = HashId.parse(data.saveItemId)
          entityType = toEntityType(data.type)
          return HashId.parse(data.userId)
        })
        .filter(removeNullable)
      return {
        type: NotificationType.Favorite,
        userIds,
        entityId,
        entityType,
        ...formatBaseNotification(notification)
      }
    }
    case 'tip_send': {
      const data = notification.actions[0].data
      const amount = data.amount
      const receiverUserId = HashId.parse(data.receiverUserId)
      return {
        type: NotificationType.TipSend,
        entityId: receiverUserId,
        entityType: Entity.User,
        amount: amount!.toString() as StringWei,
        ...formatBaseNotification(notification)
      }
    }
    case 'tip_receive': {
      const data = notification.actions[0].data
      const amount = data.amount
      const senderUserId = HashId.parse(data.senderUserId)
      return {
        type: NotificationType.TipReceive,
        entityId: senderUserId,
        amount: amount!.toString() as StringWei,
        entityType: Entity.User,
        tipTxSignature: data.tipTxSignature,
        reactionValue: data.reactionValue,
        ...formatBaseNotification(notification)
      }
    }
    case 'track_added_to_purchased_album': {
      let trackId = 0
      let playlistId = 0
      let playlistOwnerId = 0
      notification.actions.filter(removeNullable).forEach((action) => {
        const { data } = action
        if (data.trackId && data.playlistId && data.playlistOwnerId) {
          trackId = HashId.parse(data.trackId) as ID
          playlistId = HashId.parse(data.playlistId) as ID
          playlistOwnerId = HashId.parse(data.playlistOwnerId) as ID
        }
      })
      return {
        type: NotificationType.TrackAddedToPurchasedAlbum,
        trackId,
        playlistId,
        playlistOwnerId,
        ...formatBaseNotification(notification)
      }
    }
    case 'track_added_to_playlist': {
      let trackId = 0
      let playlistId = 0
      let playlistOwnerId = 0
      notification.actions.filter(removeNullable).forEach((action) => {
        const { data } = action
        if (data.trackId && data.playlistId && data.playlistOwnerId) {
          trackId = HashId.parse(data.trackId) as ID
          playlistId = HashId.parse(data.playlistId) as ID
          playlistOwnerId = HashId.parse(data.playlistOwnerId) as ID
        }
      })
      return {
        type: NotificationType.AddTrackToPlaylist,
        trackId,
        playlistId,
        playlistOwnerId,
        ...formatBaseNotification(notification)
      }
    }
    case 'tastemaker': {
      const data = notification.actions[0].data
      return {
        type: NotificationType.Tastemaker,
        entityType: Entity.Track,
        entityId: HashId.parse(data.tastemakerItemId),
        userId: HashId.parse(data.tastemakerItemOwnerId), // owner of the tastemaker track
        ...formatBaseNotification(notification)
      }
    }
    case 'supporter_rank_up': {
      const data = notification.actions[0].data
      const senderUserId = HashId.parse(data.senderUserId)
      return {
        type: NotificationType.SupporterRankUp,
        entityId: senderUserId,
        rank: data.rank,
        entityType: Entity.User,
        ...formatBaseNotification(notification)
      }
    }
    case 'supporting_rank_up': {
      const data = notification.actions[0].data
      const receiverUserId = HashId.parse(data.receiverUserId)
      return {
        type: NotificationType.SupportingRankUp,
        entityId: receiverUserId,
        rank: data.rank,
        entityType: Entity.User,
        ...formatBaseNotification(notification)
      }
    }
    case 'supporter_dethroned': {
      const data = notification.actions[0].data
      return {
        type: NotificationType.SupporterDethroned,
        entityType: Entity.User,
        entityId: HashId.parse(data.senderUserId),
        supportedUserId: HashId.parse(data.receiverUserId),
        ...formatBaseNotification(notification)
      }
    }
    case 'challenge_reward': {
      const data = notification.actions[0].data
      const challengeId = data.challengeId as ChallengeRewardID
      return {
        type: NotificationType.ChallengeReward,
        challengeId,
        entityType: Entity.User,
        amount: data.amount as StringWei,
        listenStreak: data.listenStreak,
        ...formatBaseNotification(notification)
      }
    }
    case 'claimable_reward': {
      const data = notification.actions[0].data
      const challengeId = data.challengeId as ChallengeRewardID
      return {
        type: NotificationType.ClaimableReward,
        challengeId,
        entityType: Entity.User,
        ...formatBaseNotification(notification)
      }
    }
    case 'tier_change': {
      const data = notification.actions[0].data
      const tier = data.newTier as BadgeTier
      const userId = HashId.parse(notification.actions[0].specifier)
      return {
        type: NotificationType.TierChange,
        tier,
        userId,
        ...formatBaseNotification(notification)
      }
    }
    case 'create': {
      let entityType: Entity = Entity.Track
      const entityIds = notification.actions
        .map((action) => {
          const data = action.data
          if (full.instanceOfCreatePlaylistNotificationActionData(data)) {
            entityType = data.isAlbum ? Entity.Album : Entity.Playlist
            // Future proofing for when playlistId is fixed to be a string
            return HashId.parse(
              Array.isArray(data.playlistId)
                ? data.playlistId[0]!
                : data.playlistId
            )
          }
          entityType = Entity.Track
          return HashId.parse(data.trackId)
        })
        .flat()
        .filter(removeNullable)
      // playlist owner ids are the specifier of the playlist create notif
      const userId =
        entityType === Entity.Track
          ? // track create notifs store track owner id in the group id
            parseInt(notification.groupId.split(':')[3])
          : // album/playlist create notifications store album owner
            // id as the specifier
            HashId.parse(notification.actions[0].specifier)
      return {
        type: NotificationType.UserSubscription,
        userId,
        entityIds,
        entityType,
        ...formatBaseNotification(notification)
      }
    }
    case 'remix': {
      let childTrackId = 0
      let parentTrackId = 0
      let trackOwnerId = 0
      notification.actions.forEach((action) => {
        const data = action.data
        childTrackId = HashId.parse(data.trackId)
        parentTrackId = HashId.parse(data.parentTrackId)
        trackOwnerId = HashId.parse(action.specifier)
      })
      return {
        type: NotificationType.RemixCreate,
        entityType: Entity.Track,
        parentTrackId,
        childTrackId,
        userId: trackOwnerId,
        ...formatBaseNotification(notification)
      }
    }
    case 'cosign': {
      const data = notification.actions[0].data
      const entityType = Entity.Track
      const childTrackId = HashId.parse(data.trackId)
      const entityIds = [HashId.parse(data.parentTrackId), childTrackId]
      const parentTrackUserId = HashId.parse(notification.actions[0].specifier)
      const userId = HashId.parse(data.trackOwnerId)

      return {
        type: NotificationType.RemixCosign,
        userId,
        entityType,
        entityIds,
        parentTrackUserId,
        childTrackId,
        ...formatBaseNotification(notification)
      }
    }
    case 'trending_playlist': {
      const data = notification.actions[0].data

      return {
        type: NotificationType.TrendingPlaylist,
        rank: data.rank,
        genre: data.genre,
        time: data.timeRange,
        entityType: Entity.Playlist,
        entityId: HashId.parse(data.playlistId),
        ...formatBaseNotification(notification)
      }
    }
    case 'trending': {
      const data = notification.actions[0].data

      return {
        type: NotificationType.TrendingTrack,
        rank: data.rank,
        genre: data.genre,
        time: data.timeRange,
        entityType: Entity.Track,
        entityId: HashId.parse(data.trackId),
        ...formatBaseNotification(notification)
      }
    }
    case 'trending_underground': {
      const data = notification.actions[0].data

      return {
        type: NotificationType.TrendingUnderground,
        rank: data.rank,
        genre: data.genre,
        time: data.timeRange,
        entityType: Entity.Track,
        entityId: HashId.parse(data.trackId),
        ...formatBaseNotification(notification)
      }
    }
    case 'milestone': {
      const data = notification.actions[0].data
      if (full.instanceOfTrackMilestoneNotificationActionData(data)) {
        let achievement: Achievement
        if (data.type === 'track_repost_count') {
          achievement = Achievement.Reposts
        } else if (data.type === 'track_save_count') {
          achievement = Achievement.Favorites
        } else {
          achievement = Achievement.Listens
        }
        return {
          type: NotificationType.Milestone,
          entityType: Entity.Track,
          entityId: HashId.parse(data.trackId),
          value: data.threshold,
          achievement,
          ...formatBaseNotification(notification)
        }
      } else if (full.instanceOfPlaylistMilestoneNotificationActionData(data)) {
        let achievement: Achievement
        if (data.type === 'playlist_repost_count') {
          achievement = Achievement.Reposts
        } else {
          achievement = Achievement.Favorites
        }
        return {
          type: NotificationType.Milestone,
          entityType: data.isAlbum ? Entity.Album : Entity.Playlist,
          entityId: HashId.parse(data.playlistId),
          value: data.threshold,
          achievement,
          ...formatBaseNotification(notification)
        }
      } else {
        return {
          type: NotificationType.Milestone,
          entityType: Entity.User,
          entityId: HashId.parse(data.userId),
          achievement: Achievement.Followers,
          value: data.threshold,
          ...formatBaseNotification(notification)
        }
      }
    }
    case 'announcement': {
      const data = notification.actions[0].data

      return {
        type: NotificationType.Announcement,
        title: data.title,
        shortDescription: data.shortDescription,
        longDescription: data.longDescription,
        route: data.route,
        ...formatBaseNotification(notification)
      }
    }
    case 'reaction': {
      const data = notification.actions[0].data
      return {
        type: NotificationType.Reaction,
        entityId: HashId.parse(data.receiverUserId),
        entityType: Entity.User,
        reactionValue: data.reactionValue,
        reactionType: data.reactionType,
        reactedToEntity: {
          tx_signature: data.reactedTo,
          amount: data.tipAmount as StringWei,
          tip_sender_id: HashId.parse(data.senderUserId)
        },
        ...formatBaseNotification(notification)
      }
    }
    case 'repost_of_repost': {
      let entityId = 0
      let entityType = Entity.Track
      const userIds = notification.actions
        .map((action) => {
          const data = action.data
          entityId = HashId.parse(data.repostOfRepostItemId)
          entityType = toEntityType(data.type)
          return HashId.parse(data.userId)
        })
        .filter(removeNullable)
      return {
        type: NotificationType.RepostOfRepost,
        userIds,
        entityId,
        entityType,
        ...formatBaseNotification(notification)
      }
    }
    case 'save_of_repost': {
      let entityId = 0
      let entityType = Entity.Track
      const userIds = notification.actions
        .map((action) => {
          const data = action.data
          entityId = HashId.parse(data.saveOfRepostItemId)
          entityType = toEntityType(data.type)
          return HashId.parse(data.userId)
        })
        .filter(removeNullable)
      return {
        type: NotificationType.FavoriteOfRepost,
        userIds,
        entityId,
        entityType,
        ...formatBaseNotification(notification)
      }
    }
    case 'usdc_purchase_seller': {
      let entityId = 0
      let entityType = Entity.Track
      let amount = '' as StringUSDC
      let extraAmount = '' as StringUSDC
      const userIds = notification.actions
        .map((action) => {
          const data = action.data
          entityId = HashId.parse(data.contentId)
          entityType =
            data.contentType === 'track' ? Entity.Track : Entity.Album
          amount = data.amount as StringUSDC
          extraAmount = data.extraAmount as StringUSDC
          return HashId.parse(data.buyerUserId)
        })
        .filter(removeNullable)
      return {
        type: NotificationType.USDCPurchaseSeller,
        userIds,
        entityId,
        entityType,
        amount,
        extraAmount,
        ...formatBaseNotification(notification)
      }
    }
    case 'usdc_purchase_buyer': {
      let entityId = 0
      let entityType = Entity.Track
      const userIds = notification.actions
        .map((action) => {
          const data = action.data
          entityId = HashId.parse(data.contentId)
          entityType =
            data.contentType === 'track' ? Entity.Track : Entity.Album
          return HashId.parse(data.sellerUserId)
        })
        .filter(removeNullable)
      return {
        type: NotificationType.USDCPurchaseBuyer,
        userIds,
        entityId,
        entityType,
        ...formatBaseNotification(notification)
      }
    }
    case 'request_manager': {
      const data = notification.actions[0].data

      return {
        type: NotificationType.RequestManager,
        userId: HashId.parse(data.userId)!,
        ...formatBaseNotification(notification)
      }
    }
    case 'approve_manager_request': {
      const data = notification.actions[0].data

      return {
        type: NotificationType.ApproveManagerRequest,
        userId: HashId.parse(data.granteeUserId)!,
        ...formatBaseNotification(notification)
      }
    }
    case 'comment': {
      let entityId = 0
      let entityType = Entity.Track
      let commentId: ID | undefined
      const userIds = Array.from(
        new Set(
          notification.actions
            .map((action) => {
              const data = action.data
              entityId = HashId.parse(data.entityId)
              commentId = OptionalHashId.parse(data.commentId)
              // @ts-ignore
              entityType = data.type
              return HashId.parse(data.commentUserId)
            })
            .filter(removeNullable)
        )
      )
      return {
        type: NotificationType.Comment,
        userIds,
        entityId,
        entityType,
        ...(commentId && { commentId }),
        ...formatBaseNotification(notification)
      }
    }
    case 'comment_thread': {
      let entityId = 0
      let entityType = Entity.Track
      let entityUserId = 0
      let commentId: ID | undefined
      const userIds = Array.from(
        new Set(
          notification.actions
            .map((action) => {
              const data = action.data
              entityId = HashId.parse(data.entityId)
              entityUserId = HashId.parse(data.entityUserId)
              commentId = OptionalHashId.parse(data.commentId)
              // @ts-ignore
              entityType = data.type
              return HashId.parse(data.commentUserId)
            })
            .filter(removeNullable)
        )
      )
      return {
        type: NotificationType.CommentThread,
        userIds,
        entityId,
        entityType,
        entityUserId,
        ...(commentId && { commentId }),
        ...formatBaseNotification(notification)
      }
    }
    case 'comment_mention': {
      let entityId = 0
      let entityType = Entity.Track
      let entityUserId = 0
      let commentId: ID | undefined
      const userIds = notification.actions
        .map((action) => {
          const data = action.data
          entityId = HashId.parse(data.entityId)
          entityUserId = HashId.parse(data.entityUserId)
          commentId = OptionalHashId.parse(data.commentId)
          // @ts-ignore
          entityType = data.type
          return HashId.parse(data.commentUserId)
        })
        .filter(removeNullable)
      return {
        type: NotificationType.CommentMention,
        userIds,
        entityId,
        entityType,
        entityUserId,
        ...(commentId && { commentId }),
        ...formatBaseNotification(notification)
      }
    }
    case 'comment_reaction': {
      let entityId = 0
      let entityType = Entity.Track
      let entityUserId = 0
      let commentId: ID | undefined
      const userIds = notification.actions
        .map((action) => {
          const data = action.data
          entityId = HashId.parse(data.entityId)
          entityUserId = HashId.parse(data.entityUserId)
          commentId = OptionalHashId.parse(data.commentId)
          // @ts-ignore
          entityType = data.type
          return HashId.parse(data.reacterUserId)
        })
        .filter(removeNullable)
      return {
        type: NotificationType.CommentReaction,
        userIds,
        entityId,
        entityType,
        entityUserId,
        ...(commentId && { commentId }),
        ...formatBaseNotification(notification)
      }
    }
    case 'listen_streak_reminder': {
      const data = notification.actions[0].data
      return {
        type: NotificationType.ListenStreakReminder,
        streak: data.streak,
        ...formatBaseNotification(notification)
      }
    }
    case 'fan_remix_contest_ended': {
      const data = notification.actions[0].data
      return {
        type: NotificationType.FanRemixContestEnded,
        entityId: HashId.parse(data.entityId),
        entityUserId: HashId.parse(data.entityUserId),
        ...formatBaseNotification(notification)
      }
    }
    case 'artist_remix_contest_ended': {
      const data = notification.actions[0].data
      return {
        type: NotificationType.ArtistRemixContestEnded,
        entityId: HashId.parse(data.entityId),
        entityType: Entity.Track,
        ...formatBaseNotification(notification)
      }
    }
    case 'artist_remix_contest_ending_soon': {
      const data = notification.actions[0].data
      return {
        type: NotificationType.ArtistRemixContestEndingSoon,
        entityId: HashId.parse(data.entityId),
        entityUserId: HashId.parse(data.entityUserId),
        ...formatBaseNotification(notification)
      }
    }
    case 'fan_remix_contest_ending_soon': {
      const data = notification.actions[0].data
      return {
        type: NotificationType.FanRemixContestEndingSoon,
        entityId: HashId.parse(data.entityId),
        entityUserId: HashId.parse(data.entityUserId),
        entityType: Entity.Track,
        ...formatBaseNotification(notification)
      }
    }
    case 'fan_remix_contest_winners_selected': {
      const data = notification.actions[0].data
      return {
        type: NotificationType.FanRemixContestWinnersSelected,
        entityId: HashId.parse(data.entityId),
        entityUserId: HashId.parse(data.entityUserId),
        entityType: Entity.Track,
        ...formatBaseNotification(notification)
      }
    }
    case 'fan_remix_contest_started': {
      const data = notification.actions[0].data
      return {
        type: NotificationType.FanRemixContestStarted,
        entityId: HashId.parse(data.entityId),
        entityType: Entity.Track,
        entityUserId: HashId.parse(data.entityUserId),
        ...formatBaseNotification(notification)
      }
    }
    case 'artist_remix_contest_submissions': {
      const data = notification.actions[0].data as {
        eventId: string
        milestone: number
        entityId: string
      }
      return {
        type: NotificationType.ArtistRemixContestSubmissions,
        eventId: HashId.parse(data.eventId),
        milestone: data.milestone,
        entityId: HashId.parse(data.entityId),
        entityType: Entity.Track,
        ...formatBaseNotification(notification)
      }
    }
  }
}
