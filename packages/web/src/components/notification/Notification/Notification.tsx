import {
  NotificationType,
  Notification as Notifications
} from '@audius/common/store'

import ErrorWrapper from 'components/error-wrapper/ErrorWrapper'

import { AddTrackToPlaylistNotification } from './AddTrackToPlaylistNotification'
import { AnnouncementNotification } from './AnnouncementNotification'
import { ApproveManagerNotification } from './ApproveManagerRequestNotification'
import { ArtistRemixContestEndedNotification } from './ArtistRemixContestEndedNotification'
import { ArtistRemixContestEndingSoonNotification } from './ArtistRemixContestEndingSoonNotification'
import { ArtistRemixContestSubmissionsNotification } from './ArtistRemixContestSubmissionsNotification'
import { ChallengeRewardNotification } from './ChallengeRewardNotification'
import { ClaimableRewardNotification } from './ClaimableRewardNotification'
import { CommentMentionNotification } from './CommentMentionNotification'
import { CommentNotification } from './CommentNotification'
import { CommentReactionNotification } from './CommentReactionNotification'
import { CommentThreadNotification } from './CommentThreadNotification'
import { FanRemixContestEndedNotification } from './FanRemixContestEndedNotification'
import { FanRemixContestEndingSoonNotification } from './FanRemixContestEndingSoonNotification'
import { FanRemixContestStartedNotification } from './FanRemixContestStartedNotification'
import { FanRemixContestWinnersSelectedNotification } from './FanRemixContestWinnersSelectedNotification'
import { FavoriteNotification } from './FavoriteNotification'
import { FavoriteOfRepostNotification } from './FavoriteOfRepostNotification'
import { FollowNotification } from './FollowNotification'
import { ListenStreakReminderNotification } from './ListenStreakReminderNotification'
import { MilestoneNotification } from './MilestoneNotification'
import { RemixCosignNotification } from './RemixCosignNotification'
import { RemixCreateNotification } from './RemixCreateNotification'
import { RepostNotification } from './RepostNotification'
import { RepostOfRepostNotification } from './RepostOfRepostNotification'
import { RequestManagerNotification } from './RequestManagerNotification'
import { TastemakerNotification } from './TastemakerNotification'
import { TierChangeNotification } from './TierChangeNotification'
import { TrackAddedToPurchasedAlbumNotification } from './TrackAddedToPurchasedAlbumNotification'
import { TrendingTrackNotification } from './TrendingTrackNotification'
import { TrendingUndergroundNotification } from './TrendingUndergroundNotification'
import { USDCPurchaseBuyerNotification } from './USDCPurchaseBuyerNotification'
import { USDCPurchaseSellerNotification } from './USDCPurchaseSellerNotification'
import { UserSubscriptionNotification } from './UserSubscriptionNotification'

type NotificationProps = {
  notification: Notifications
}

export const Notification = (props: NotificationProps) => {
  const { notification } = props

  const getNotificationElement = () => {
    switch (notification.type) {
      case NotificationType.Announcement: {
        return <AnnouncementNotification notification={notification} />
      }
      case NotificationType.ChallengeReward: {
        return <ChallengeRewardNotification notification={notification} />
      }
      case NotificationType.ClaimableReward: {
        return <ClaimableRewardNotification notification={notification} />
      }
      case NotificationType.Favorite: {
        return <FavoriteNotification notification={notification} />
      }
      case NotificationType.Follow: {
        return <FollowNotification notification={notification} />
      }
      case NotificationType.Milestone: {
        return <MilestoneNotification notification={notification} />
      }
      case NotificationType.RemixCosign: {
        return <RemixCosignNotification notification={notification} />
      }
      case NotificationType.RemixCreate: {
        return <RemixCreateNotification notification={notification} />
      }
      case NotificationType.Repost: {
        return <RepostNotification notification={notification} />
      }
      case NotificationType.RepostOfRepost: {
        return <RepostOfRepostNotification notification={notification} />
      }
      case NotificationType.Tastemaker: {
        return <TastemakerNotification notification={notification} />
      }
      case NotificationType.FavoriteOfRepost: {
        return <FavoriteOfRepostNotification notification={notification} />
      }
      case NotificationType.TierChange: {
        return <TierChangeNotification notification={notification} />
      }
      case NotificationType.TrendingTrack: {
        return <TrendingTrackNotification notification={notification} />
      }
      case NotificationType.TrendingUnderground: {
        return <TrendingUndergroundNotification notification={notification} />
      }
      case NotificationType.UserSubscription: {
        return <UserSubscriptionNotification notification={notification} />
      }
      case NotificationType.USDCPurchaseSeller: {
        return <USDCPurchaseSellerNotification notification={notification} />
      }
      case NotificationType.USDCPurchaseBuyer: {
        return <USDCPurchaseBuyerNotification notification={notification} />
      }
      case NotificationType.RequestManager: {
        return <RequestManagerNotification notification={notification} />
      }
      case NotificationType.ApproveManagerRequest: {
        return <ApproveManagerNotification notification={notification} />
      }
      case NotificationType.AddTrackToPlaylist: {
        return <AddTrackToPlaylistNotification notification={notification} />
      }
      case NotificationType.TrackAddedToPurchasedAlbum: {
        return (
          <TrackAddedToPurchasedAlbumNotification notification={notification} />
        )
      }
      case NotificationType.Comment: {
        return <CommentNotification notification={notification} />
      }
      case NotificationType.CommentThread: {
        return <CommentThreadNotification notification={notification} />
      }
      case NotificationType.CommentMention: {
        return <CommentMentionNotification notification={notification} />
      }
      case NotificationType.CommentReaction: {
        return <CommentReactionNotification notification={notification} />
      }
      case NotificationType.ListenStreakReminder: {
        return <ListenStreakReminderNotification notification={notification} />
      }
      case NotificationType.FanRemixContestEndingSoon: {
        return (
          <FanRemixContestEndingSoonNotification notification={notification} />
        )
      }
      case NotificationType.ArtistRemixContestEndingSoon: {
        return (
          <ArtistRemixContestEndingSoonNotification
            notification={notification}
          />
        )
      }
      case NotificationType.ArtistRemixContestEnded: {
        return (
          <ArtistRemixContestEndedNotification notification={notification} />
        )
      }
      case NotificationType.FanRemixContestStarted: {
        return (
          <FanRemixContestStartedNotification notification={notification} />
        )
      }
      case NotificationType.FanRemixContestEnded: {
        return <FanRemixContestEndedNotification notification={notification} />
      }
      case NotificationType.ArtistRemixContestSubmissions: {
        return (
          <ArtistRemixContestSubmissionsNotification
            notification={notification}
          />
        )
      }
      case NotificationType.FanRemixContestWinnersSelected: {
        return (
          <FanRemixContestWinnersSelectedNotification
            notification={notification}
          />
        )
      }
      default: {
        return null
      }
    }
  }

  return (
    <ErrorWrapper
      errorMessage={`Could not render notification ${notification.id}`}
    >
      {getNotificationElement()}
    </ErrorWrapper>
  )
}
