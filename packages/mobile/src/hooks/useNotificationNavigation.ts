import { useCallback, useMemo } from 'react'

import { getEventQueryKey, getTrackQueryKey } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { ShareSource } from '@audius/common/models'
import type { ID } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
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
  TrendingUndergroundNotification,
  TrendingPushFields,
  ShareMilestoneStat,
  ChallengeRewardNotification,
  TierChangeNotification,
  AddTrackToPlaylistNotification,
  AddTrackToPlaylistPushFields,
  AddTrackToPlaylistPushNotification,
  MessagePushNotification,
  MessageReactionPushNotification,
  USDCPurchaseBuyerNotification,
  USDCPurchaseSellerNotification,
  RequestManagerNotification,
  ApproveManagerRequestNotification,
  TrackCollaboratorInviteNotification,
  TrackCollaboratorAcceptNotification,
  CommentNotification,
  CommentMentionNotification,
  CommentThreadNotification,
  CommentReactionNotification,
  AnnouncementPushNotification,
  FanClubTextPostNotification,
  FanRemixContestStartedNotification,
  FanRemixContestEndingSoonNotification,
  FanRemixContestEndedNotification,
  FanRemixContestWinnersSelectedNotification,
  RemixContestUpdateNotification,
  FanRemixContestSubmissionNotification,
  ArtistRemixContestEndedNotification,
  ArtistRemixContestEndingSoonNotification,
  ArtistRemixContestSubmissionsNotification,
  WeeklyRotationFeaturedNotification,
  WeeklyRotationFeaturedPushNotification
} from '@audius/common/store'
import {
  NotificationType,
  PushNotificationType,
  Entity,
  Achievement,
  getFeaturedPlaylistName,
  shareModalUIActions
} from '@audius/common/store'
import { OptionalId } from '@audius/sdk'
import { useLinkTo } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useNavigation } from './useNavigation'

/**
 * Navigator for notifications
 *
 * Uses the useNavigation hook under the hood
 */
export const useNotificationNavigation = () => {
  const navigation = useNavigation()
  const linkTo = useLinkTo()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { isEnabled: isManagerModeEnabled } = useFeatureFlag(
    FeatureFlags.MOBILE_MANAGER_MODE
  )

  // Pushes flagged with shareCard open the stat card over the track
  const openShareCard = useCallback(
    (trackId: ID, stat: ShareMilestoneStat) => {
      dispatch(
        shareModalUIActions.requestOpen({
          type: 'milestone',
          trackId,
          stat,
          source: ShareSource.NOTIFICATION
        })
      )
    },
    [dispatch]
  )

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
      if (!isManagerModeEnabled) {
        navigation.navigate('Profile', { id: notification.userId })
      } else if (notification.type === NotificationType.RequestManager) {
        navigation.navigate('AccountsYouManageScreen')
      } else {
        navigation.navigate('AccountsManagingYouScreen')
      }
    },
    [navigation, isManagerModeEnabled]
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
        const commentId =
          type.startsWith('Comment') && 'commentId' in notification
            ? OptionalId.parse(notification.commentId)
            : undefined

        navigation.navigate('Track', {
          trackId: entityId,
          canBeUnlisted: false,
          showComments: type.startsWith('Comment'),
          commentId
        })
      } else if (
        entityType === Entity.Album ||
        entityType === Entity.Playlist
      ) {
        navigation.navigate('Collection', { id: entityId })
      } else if (entityType === Entity.Event) {
        // Event-typed comment notifications carry entityId = event_id.
        // The Contest screen takes a track id (or handle/slug), so chase
        // the cached event to find its underlying parent track. The row
        // that triggered this navigation already mounted
        // `useNotificationEntity`, which primes the event cache via
        // `useEvent`, so this read is synchronous in the common case.
        const cachedEvent = queryClient.getQueryData(
          getEventQueryKey(entityId)
        ) as { entityId?: number | null } | undefined
        const trackId = cachedEvent?.entityId ?? null
        if (trackId != null) {
          navigation.navigate('Contest', { trackId })
        }
      }
    },
    [navigation, queryClient]
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
        } else if (notification.entityType === Entity.Track) {
          navigation.navigate('Track', {
            trackId: notification.entityId,
            canBeUnlisted: false
          })
        } else {
          navigation.navigate('Collection', {
            id: notification.entityId,
            canBeUnlisted: false
          })
        }
      } else if (notification.type === PushNotificationType.MilestoneFollow) {
        navigation.navigate('Profile', { id: notification.initiator })
      } else if (notification.actions[0].actionEntityType === Entity.Track) {
        // The push sends this id as a string, and iOS delivers it as is
        const trackId = Number(notification.entityId)
        navigation.navigate('Track', {
          trackId,
          canBeUnlisted: false
        })
        if (
          notification.type === PushNotificationType.MilestoneListen &&
          notification.shareCard &&
          notification.threshold
        ) {
          openShareCard(trackId, {
            kind: 'listens',
            count: notification.threshold
          })
        }
      } else {
        navigation.navigate('Collection', {
          id: notification.entityId,
          canBeUnlisted: false
        })
      }
    },
    [navigation, openShareCard]
  )

  const trendingHandler = useCallback(
    (
      notification: (
        | TrendingTrackNotification
        | TrendingUndergroundNotification
      ) &
        TrendingPushFields
    ) => {
      navigation.navigate('Track', {
        trackId: notification.entityId,
        canBeUnlisted: false
      })
      if (notification.shareCard && notification.rank) {
        openShareCard(notification.entityId, {
          kind:
            notification.type === NotificationType.TrendingUnderground
              ? 'underground'
              : 'trending',
          rank: notification.rank
        })
      }
    },
    [navigation, openShareCard]
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

  const announcementHandler = useCallback(
    (notification: AnnouncementNotification | AnnouncementPushNotification) => {
      if (!notification.route) {
        // fallback to linking to the coins explore screen
        // TODO: Update this later, this will eventually be a bug
        navigation.navigate('CoinExploreScreen')
      } else {
        linkTo(notification.route)
      }
    },
    [navigation, linkTo]
  )

  // All contest-related notifications carry the contest's host track in
  // `entityId` and should land on that contest's screen. The Contest
  // screen accepts `{ trackId }` and resolves its own event/comments.
  const contestHandler = useCallback(
    (
      notification:
        | FanRemixContestStartedNotification
        | FanRemixContestEndingSoonNotification
        | FanRemixContestEndedNotification
        | FanRemixContestWinnersSelectedNotification
        | RemixContestUpdateNotification
        | ArtistRemixContestEndedNotification
        | ArtistRemixContestEndingSoonNotification
        | ArtistRemixContestSubmissionsNotification
    ) => {
      navigation.navigate('Contest', { trackId: notification.entityId })
    },
    [navigation]
  )

  const notificationTypeHandlerMap = useMemo(
    () => ({
      [NotificationType.AddTrackToPlaylist]: (
        notification: (
          | AddTrackToPlaylistNotification
          | AddTrackToPlaylistPushNotification
        ) &
          AddTrackToPlaylistPushFields
      ) => {
        const playlistId =
          'playlistId' in notification
            ? notification.playlistId
            : notification.metadata.playlistId
        navigation.navigate('Collection', { id: playlistId })
        const playlistName = getFeaturedPlaylistName(playlistId)
        if (notification.shareCard && notification.trackId && playlistName) {
          openShareCard(notification.trackId, {
            kind: 'featured',
            playlistName
          })
        }
      },
      // Will handle NotificationType.Announcement and PushNotificationType.Announcement
      [NotificationType.Announcement]: announcementHandler,
      [NotificationType.ChallengeReward]: (
        notification: ChallengeRewardNotification
      ) => {
        navigation.navigate('RewardsScreen')
      },
      // Handles both the in-app tile and the push payload (`type:
      // 'WeeklyRotation'`); neither carries an entity, the mix is fetched on
      // demand for the signed-in user.
      [NotificationType.WeeklyRotation]: () => {
        navigation.navigate('WeeklyRotationScreen')
      },
      // The push carries no entity; the full recap is in Notifications.
      [NotificationType.WeeklyArtistRecap]: () => {
        navigation.navigate('notifications', { screen: 'Notifications' })
      },
      // One featured track opens it; several open the artist's profile. The
      // push says which via entityType. The tile only has the top track, so
      // read its owner from the cache that its useNotificationEntity primed.
      [NotificationType.WeeklyRotationFeatured]: (
        notification:
          | WeeklyRotationFeaturedNotification
          | WeeklyRotationFeaturedPushNotification
      ) => {
        const { entityType, entityId } = notification
        if (entityType === Entity.User) {
          navigation.navigate('Profile', { id: entityId })
          return
        }
        if ('trackCount' in notification && notification.trackCount > 1) {
          const cachedTrack = queryClient.getQueryData(
            getTrackQueryKey(entityId)
          ) as { owner_id?: number } | undefined
          if (cachedTrack?.owner_id) {
            navigation.navigate('Profile', { id: cachedTrack.owner_id })
            return
          }
        }
        navigation.navigate('Track', {
          trackId: entityId,
          canBeUnlisted: false
        })
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
      [NotificationType.TierChange]: (notification: TierChangeNotification) => {
        navigation.navigate('AudioScreen')
      },
      [NotificationType.TrendingTrack]: trendingHandler,
      [NotificationType.TrendingUnderground]: trendingHandler,
      [NotificationType.UserSubscription]: (
        notification: UserSubscriptionNotification
      ) => {
        // TODO: Need to handle the payload from identity
        const multiUpload = notification.entityIds.length > 1

        if (notification.entityType === Entity.Track && multiUpload) {
          navigation.navigate('Profile', { id: notification.userId })
        } else if (notification.entityType === Entity.Track) {
          navigation.navigate('Track', {
            trackId: notification.entityIds[0],
            canBeUnlisted: false
          })
        } else {
          navigation.navigate('Collection', {
            id: notification.entityIds[0],
            canBeUnlisted: false
          })
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
      [NotificationType.TrackCollaboratorInvite]: (
        notification: TrackCollaboratorInviteNotification
      ) => {
        navigation.navigate('Track', {
          trackId: notification.trackId,
          canBeUnlisted: false
        })
      },
      [NotificationType.TrackCollaboratorAccept]: (
        notification: TrackCollaboratorAcceptNotification
      ) => {
        navigation.navigate('Track', {
          trackId: notification.trackId,
          canBeUnlisted: false
        })
      },
      [PushNotificationType.Message]: messagesHandler,
      [PushNotificationType.MessageReaction]: messagesHandler,
      [NotificationType.Comment]: entityHandler,
      [NotificationType.CommentMention]: entityHandler,
      [NotificationType.CommentThread]: entityHandler,
      [NotificationType.CommentReaction]: entityHandler,
      [NotificationType.FanRemixContestStarted]: contestHandler,
      [NotificationType.FanRemixContestEnded]: contestHandler,
      [NotificationType.FanRemixContestEndingSoon]: contestHandler,
      [NotificationType.FanRemixContestWinnersSelected]: contestHandler,
      [NotificationType.RemixContestUpdate]: contestHandler,
      [NotificationType.FanRemixContestSubmission]: (
        notification: FanRemixContestSubmissionNotification
      ) => {
        // The submission notification fires when a fan's remix is submitted
        // to a contest — landing on the submitted track (not the contest)
        // matches the web destination and lets the recipient play it.
        navigation.navigate('Track', {
          trackId: notification.submissionTrackId,
          canBeUnlisted: false
        })
      },
      [NotificationType.ArtistRemixContestEnded]: contestHandler,
      [NotificationType.ArtistRemixContestEndingSoon]: contestHandler,
      [NotificationType.ArtistRemixContestSubmissions]: contestHandler,
      [NotificationType.FanClubTextPost]: (
        notification: FanClubTextPostNotification & { ticker?: string }
      ) => {
        if (notification.ticker) {
          navigation.navigate('CoinDetailsScreen', {
            ticker: notification.ticker
          })
        } else {
          navigation.navigate('Profile', { id: notification.entityUserId })
        }
      }
    }),
    [
      announcementHandler,
      socialActionHandler,
      entityHandler,
      contestHandler,
      milestoneHandler,
      trendingHandler,
      userIdHandler,
      messagesHandler,
      openShareCard,
      navigation,
      queryClient
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
