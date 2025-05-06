import type { Notification } from '@audius/common/store'
import { NotificationType } from '@audius/common/store'

import { NotificationErrorBoundary } from './NotificationErrorBoundary'
import {
  FavoriteNotification,
  FollowNotification,
  RepostNotification,
  ChallengeRewardNotification,
  ClaimableRewardNotification,
  RemixCreateNotification,
  UserSubscriptionNotification,
  RemixCosignNotification,
  MilestoneNotification,
  AnnouncementNotification,
  TierChangeNotification,
  TrackAddedToPurchasedAlbumNotification,
  TrendingPlaylistNotification,
  TrendingTrackNotification,
  TrendingUndergroundNotification,
  TopSupporterNotification,
  TopSupportingNotification,
  TipReactionNotification,
  TipSentNotification,
  TipReceivedNotification,
  AddTrackToPlaylistNotification,
  SupporterDethronedNotification,
  RepostOfRepostNotification,
  FavoriteOfRepostNotification,
  TastemakerNotification,
  USDCPurchaseSellerNotification,
  USDCPurchaseBuyerNotification,
  ApproveManagerRequestNotification,
  RequestManagerNotification,
  CommentNotification,
  CommentThreadNotification,
  CommentMentionNotification,
  CommentReactionNotification
} from './Notifications'
import { ListenStreakReminderNotification } from './Notifications/ListenStreakReminderNotification'
import { RemixContestEndedNotification } from './Notifications/RemixContestEndedNotification'
import { RemixContestStartedNotification } from './Notifications/RemixContestStartedNotification'

type NotificationListItemProps = {
  notification: Notification
  isVisible: boolean
}
export const NotificationListItem = (props: NotificationListItemProps) => {
  const { notification, isVisible } = props

  const renderNotification = () => {
    switch (notification.type) {
      case NotificationType.Announcement:
        return <AnnouncementNotification notification={notification} />
      case NotificationType.ChallengeReward:
        return <ChallengeRewardNotification notification={notification} />
      case NotificationType.ClaimableReward:
        return <ClaimableRewardNotification notification={notification} />
      case NotificationType.Favorite:
        return <FavoriteNotification notification={notification} />
      case NotificationType.Follow:
        return <FollowNotification notification={notification} />
      case NotificationType.Milestone:
        return <MilestoneNotification notification={notification} />
      case NotificationType.RemixCosign:
        return <RemixCosignNotification notification={notification} />
      case NotificationType.RemixCreate:
        return <RemixCreateNotification notification={notification} />
      case NotificationType.Repost:
        return <RepostNotification notification={notification} />
      case NotificationType.RepostOfRepost:
        return <RepostOfRepostNotification notification={notification} />
      case NotificationType.FavoriteOfRepost:
        return <FavoriteOfRepostNotification notification={notification} />
      case NotificationType.Tastemaker:
        return <TastemakerNotification notification={notification} />
      case NotificationType.TierChange:
        return <TierChangeNotification notification={notification} />
      case NotificationType.Reaction:
        return (
          <TipReactionNotification
            notification={notification}
            isVisible={isVisible}
          />
        )
      case NotificationType.TipReceive:
        return (
          <TipReceivedNotification
            notification={notification}
            isVisible={props.isVisible}
          />
        )
      case NotificationType.TipSend:
        return <TipSentNotification notification={notification} />
      case NotificationType.SupporterRankUp:
        return <TopSupporterNotification notification={notification} />
      case NotificationType.SupportingRankUp:
        return <TopSupportingNotification notification={notification} />
      case NotificationType.TrendingPlaylist:
        return <TrendingPlaylistNotification notification={notification} />
      case NotificationType.TrendingTrack:
        return <TrendingTrackNotification notification={notification} />
      case NotificationType.TrendingUnderground:
        return <TrendingUndergroundNotification notification={notification} />
      case NotificationType.UserSubscription:
        return <UserSubscriptionNotification notification={notification} />
      case NotificationType.AddTrackToPlaylist:
        return <AddTrackToPlaylistNotification notification={notification} />
      case NotificationType.TrackAddedToPurchasedAlbum:
        return (
          <TrackAddedToPurchasedAlbumNotification notification={notification} />
        )
      case NotificationType.SupporterDethroned:
        return <SupporterDethronedNotification notification={notification} />
      case NotificationType.USDCPurchaseSeller:
        return <USDCPurchaseSellerNotification notification={notification} />
      case NotificationType.USDCPurchaseBuyer:
        return <USDCPurchaseBuyerNotification notification={notification} />
      case NotificationType.RequestManager:
        return <RequestManagerNotification notification={notification} />
      case NotificationType.ApproveManagerRequest:
        return <ApproveManagerRequestNotification notification={notification} />
      case NotificationType.Comment:
        return <CommentNotification notification={notification} />
      case NotificationType.CommentThread:
        return <CommentThreadNotification notification={notification} />
      case NotificationType.CommentMention:
        return <CommentMentionNotification notification={notification} />
      case NotificationType.CommentReaction:
        return <CommentReactionNotification notification={notification} />
      case NotificationType.ListenStreakReminder:
        return <ListenStreakReminderNotification notification={notification} />
      case NotificationType.RemixContestStarted:
        return <RemixContestStartedNotification notification={notification} />
      case NotificationType.RemixContestEnded:
        return <RemixContestEndedNotification notification={notification} />
      default:
        return null
    }
  }

  return (
    <NotificationErrorBoundary>
      {renderNotification()}
    </NotificationErrorBoundary>
  )
}
