import { useCallback, useMemo } from 'react'

import type {
  AnnouncementNotification,
  UserSubscriptionNotification,
  FollowNotification,
  FollowPushNotification,
  RepostNotification,
  RepostPushNotification,
  RepostOfRepostNotification,
  RepostOfRepostPushNotification,
  FavoriteOfRepostNotification,
  FavoriteNotification,
  FavoritePushNotification,
  MilestoneNotification,
  MilestoneFollowPushNotification,
  MilestoneListenPushNotification,
  MilestoneRepostPushNotification,
  MilestoneFavoritePushNotification,
  RemixCreateNotification,
  RemixCreatePushNotification,
  RemixCosignNotification,
  RemixCosignPushNotification,
  TrendingTrackNotification,
  ChallengeRewardNotification,
  TierChangeNotification,
  ReactionNotification,
  ReactionPushNotification,
  TipReceiveNotification,
  TipReceivePushNotification,
  TipSendNotification,
  TipSendPushNotification,
  SupporterRankUpNotification,
  SupporterRankUpPushNotification,
  SupportingRankUpNotification,
  SupportingRankUpPushNotification,
  SupporterDethronedNotification,
  AddTrackToPlaylistNotification,
  AddTrackToPlaylistPushNotification,
  MessagePushNotification,
  MessageReactionPushNotification,
  USDCPurchaseBuyerNotification,
  USDCPurchaseSellerNotification,
  RequestManagerNotification,
  ApproveManagerRequestNotification,
  CommentNotification,
  CommentMentionNotification,
  CommentThreadNotification,
  CommentReactionNotification
} from '@audius/common/store'
import {
  NotificationType,
  PushNotificationType,
  Entity,
  Achievement,
  tippingActions
} from '@audius/common/store'
import type { AppState } from '@audius/web/src/store/types'
import { useDispatch, useStore } from 'react-redux'

import { useNavigation } from './useNavigation'

const { beginTip } = tippingActions

/**
 * Navigator for notifications
 *
 * Uses the useNavigation hook under the hood
 */
export const useNotificationNavigation = () => {
  const navigation = useNavigation()
  const dispatch = useDispatch()
  const store = useStore<AppState>()

  const socialActionHandler = useCallback(
    (
      notification:
        | FollowNotification
        | FollowPushNotification
        | RepostNotification
        | RepostPushNotification
        | RepostOfRepostNotification
        | RepostOfRepostPushNotification
        | FavoriteNotification
        | FavoritePushNotification
    ) => {
      if ('userIds' in notification) {
        const { userIds } = notification
        const firstUserId = userIds[0]
        const isMultiUser = userIds.length > 1

        if (!isMultiUser) {
          navigation.navigate('NotificationUsers', { notification })
        } else if (firstUserId) {
          navigation.navigate('Profile', { id: firstUserId })
        }
      } else {
        // TODO: Need to handle the payload from identity when there are multiple users
        navigation.navigate('Profile', { id: notification.initiator })
      }
    },
    [navigation]
  )

  const userIdHandler = useCallback(
    (
      notification:
        | ApproveManagerRequestNotification
        | RequestManagerNotification
    ) => {
      navigation.navigate('Profile', { id: notification.userId })
    },
    [navigation]
  )

  const entityHandler = useCallback(
    (
      notification:
        | RepostOfRepostNotification
        | FavoriteOfRepostNotification
        | USDCPurchaseBuyerNotification
        | USDCPurchaseSellerNotification
        | CommentNotification
        | CommentMentionNotification
        | CommentThreadNotification
        | CommentReactionNotification
    ) => {
      const { entityType, entityId, type, userIds } = notification
      const isMultiUser = userIds.length > 1
      if (isMultiUser) {
        navigation.navigate('NotificationUsers', { notification })
      } else if (entityType === Entity.Track) {
        navigation.navigate('Track', {
          trackId: entityId,
          canBeUnlisted: false,
          showComments: type.startsWith('Comment')
        })
      } else if (
        entityType === Entity.Album ||
        entityType === Entity.Playlist
      ) {
        navigation.navigate('Collection', { id: entityId })
      }
    },
    [navigation]
  )

  const milestoneHandler = useCallback(
    (
      notification:
        | MilestoneNotification
        | MilestoneFollowPushNotification
        | MilestoneListenPushNotification
        | MilestoneFavoritePushNotification
        | MilestoneRepostPushNotification
    ) => {
      if (notification.type === NotificationType.Milestone) {
        if (notification.achievement === Achievement.Followers) {
          navigation.navigate('Profile', { id: notification.entityId })
        } else {
          navigation.navigate(
            notification.entityType === Entity.Track ? 'Track' : 'Collection',
            { id: notification.entityId, canBeUnlisted: false }
          )
        }
      } else if (notification.type === PushNotificationType.MilestoneFollow) {
        navigation.navigate('Profile', { id: notification.initiator })
      } else {
        navigation.navigate(
          notification.actions[0].actionEntityType === Entity.Track
            ? 'Track'
            : 'Collection',
          { id: notification.entityId, canBeUnlisted: false }
        )
      }
    },
    [navigation]
  )

  const profileHandler = useCallback(
    (
      notification:
        | ReactionNotification
        | ReactionPushNotification
        | SupporterRankUpNotification
        | SupporterRankUpPushNotification
        | SupportingRankUpNotification
        | SupportingRankUpPushNotification
        | TipReceiveNotification
        | TipReceivePushNotification
        | TipSendNotification
        | TipSendPushNotification
    ) => {
      navigation.navigate('Profile', {
        id:
          'entityId' in notification
            ? notification.entityId
            : notification.initiator
      })
    },
    [navigation]
  )

  const messagesHandler = useCallback(
    (
      notification: MessagePushNotification | MessageReactionPushNotification
    ) => {
      navigation.navigate('Chat', {
        chatId: notification.chatId
      })
    },
    [navigation]
  )

  const notificationTypeHandlerMap = useMemo(
    () => ({
      [NotificationType.AddTrackToPlaylist]: (
        notification:
          | AddTrackToPlaylistNotification
          | AddTrackToPlaylistPushNotification
      ) => {
        navigation.navigate('Collection', {
          id:
            'playlistId' in notification
              ? notification.playlistId
              : notification.metadata.playlistId
        })
      },
      [NotificationType.Announcement]: (
        notification: AnnouncementNotification
      ) => {
        navigation.navigate('Feed')
      },
      [NotificationType.ChallengeReward]: (
        notification: ChallengeRewardNotification
      ) => {
        navigation.navigate('RewardsScreen')
      },
      [PushNotificationType.FavoriteAlbum]: socialActionHandler,
      [PushNotificationType.FavoritePlaylist]: socialActionHandler,
      [PushNotificationType.FavoriteTrack]: socialActionHandler,
      [NotificationType.Favorite]: socialActionHandler,
      [NotificationType.FavoriteOfRepost]: entityHandler,
      [NotificationType.Follow]: socialActionHandler,
      [PushNotificationType.MilestoneFavorite]: milestoneHandler,
      [PushNotificationType.MilestoneFollow]: milestoneHandler,
      [PushNotificationType.MilestoneListen]: milestoneHandler,
      [PushNotificationType.MilestoneRepost]: milestoneHandler,
      [NotificationType.Milestone]: milestoneHandler,
      [NotificationType.Reaction]: profileHandler,
      [NotificationType.RemixCosign]: (
        notification: RemixCosignNotification | RemixCosignPushNotification
      ) => {
        navigation.navigate('Track', {
          trackId:
            'childTrackId' in notification
              ? notification.childTrackId
              : notification.entityId,
          canBeUnlisted: false
        })
      },
      [NotificationType.RemixCreate]: (
        notification: RemixCreateNotification | RemixCreatePushNotification
      ) => {
        navigation.navigate('Track', {
          trackId:
            'childTrackId' in notification
              ? notification.childTrackId
              : notification.entityId,
          canBeUnlisted: false
        })
      },
      [PushNotificationType.RepostAlbum]: socialActionHandler,
      [PushNotificationType.RepostPlaylist]: socialActionHandler,
      [PushNotificationType.RepostTrack]: socialActionHandler,
      [PushNotificationType.RepostOfRepostAlbum]: socialActionHandler,
      [PushNotificationType.RepostOfRepostPlaylist]: socialActionHandler,
      [PushNotificationType.RepostOfRepostTrack]: socialActionHandler,
      [NotificationType.Repost]: socialActionHandler,
      [NotificationType.RepostOfRepost]: entityHandler,
      [NotificationType.SupporterDethroned]: (
        notification: SupporterDethronedNotification
      ) => {
        // TODO: Need to handle the payload from identity
        const { supportedUserId } = notification
        const supportedUser = store.getState().users.entries[supportedUserId]

        dispatch(
          beginTip({ user: supportedUser?.metadata, source: 'dethroned' })
        )
        navigation.navigate('TipArtist')
      },
      [NotificationType.SupporterRankUp]: profileHandler,
      [NotificationType.SupportingRankUp]: profileHandler,
      [NotificationType.TierChange]: (notification: TierChangeNotification) => {
        navigation.navigate('AudioScreen')
      },
      [NotificationType.TipReceive]: profileHandler,
      [NotificationType.TipSend]: profileHandler,
      [NotificationType.TrendingTrack]: (
        notification: TrendingTrackNotification
      ) => {
        navigation.navigate('Track', {
          trackId: notification.entityId,
          canBeUnlisted: false
        })
      },
      [NotificationType.UserSubscription]: (
        notification: UserSubscriptionNotification
      ) => {
        // TODO: Need to handle the payload from identity
        const multiUpload = notification.entityIds.length > 1

        if (notification.entityType === Entity.Track && multiUpload) {
          navigation.navigate('Profile', { id: notification.userId })
        } else {
          navigation.navigate(
            notification.entityType === Entity.Track ? 'Track' : 'Collection',
            { id: notification.entityIds[0], canBeUnlisted: false }
          )
        }
      },
      [NotificationType.Tastemaker]: entityHandler,
      [NotificationType.USDCPurchaseBuyer]: entityHandler,
      [NotificationType.USDCPurchaseSeller]: entityHandler,
      [NotificationType.TrackAddedToPurchasedAlbum]: (
        notification: AddTrackToPlaylistNotification
      ) => {
        navigation.navigate('Collection', {
          id: notification.playlistId,
          canBeUnlisted: false
        })
      },
      [NotificationType.ApproveManagerRequest]: userIdHandler,
      [NotificationType.RequestManager]: userIdHandler,
      [PushNotificationType.Message]: messagesHandler,
      [PushNotificationType.MessageReaction]: messagesHandler,
      [NotificationType.Comment]: entityHandler,
      [NotificationType.CommentMention]: entityHandler,
      [NotificationType.CommentThread]: entityHandler,
      [NotificationType.CommentReaction]: entityHandler,
      [NotificationType.RemixContestStarted]: entityHandler,
      [NotificationType.RemixContestEnded]: entityHandler
    }),
    [
      dispatch,
      milestoneHandler,
      navigation,
      profileHandler,
      socialActionHandler,
      entityHandler,
      messagesHandler,
      userIdHandler,
      store
    ]
  )

  const handleNavigate = useCallback(
    (notification: any) => {
      if (!notification) return
      notificationTypeHandlerMap[notification.type]?.(notification)
    },
    [notificationTypeHandlerMap]
  )

  return useMemo(() => ({ navigate: handleNavigate }), [handleNavigate])
}
