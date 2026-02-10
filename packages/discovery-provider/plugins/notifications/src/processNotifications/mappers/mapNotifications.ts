import { Knex } from 'knex'

import { logger } from '../../logger'
import { NotificationRow } from '../../types/dn'
import { DMEntityType } from '../../email/notifications/types'
import {
  EmailNotification,
  DMEmailNotification,
  FollowNotification,
  RepostNotification,
  SaveNotification,
  SaveOfRepostNotification,
  RepostOfRepostNotification,
  RemixNotification,
  CosignRemixNotification,
  SupporterRankUpNotification,
  MilestoneNotification,
  ReactionNotification,
  TipSendNotification,
  TipReceiveNotification,
  TastemakerNotification,
  USDCPurchaseSellerNotification,
  SupporterDethronedNotification,
  SupportingRankUpNotification,
  ChallengeRewardNotification,
  AddTrackToPlaylistNotification,
  CreateTrackNotification,
  CreatePlaylistNotification,
  AnnouncementNotification,
  TrendingTrackNotification,
  TrendingUndergroundNotification,
  USDCPurchaseBuyerNotification,
  USDCWithdrawalNotification,
  USDCTransferNotification,
  TrackAddedToPurchasedAlbumNotification,
  RequestManagerNotification,
  ApproveManagerNotification,
  ClaimableRewardNotification,
  RewardInCooldownNotification,
  CommentNotification,
  CommentThreadNotification,
  CommentMentionNotification,
  CommentReactionNotification,
  ListenStreakReminderNotification,
  ArtistRemixContestEndedNotification,
  FanRemixContestEndedNotification,
  FanRemixContestEndingSoonNotification,
  FanRemixContestStartedNotification,
  ArtistRemixContestEndingSoonNotification,
  ArtistRemixContestSubmissionsNotification,
  FanRemixContestWinnersSelectedNotification
} from '../../types/notifications'
import { ApproveManagerRequest } from './approveManagerRequest'
import { Follow } from './follow'
import { Repost } from './repost'
import { RepostOfRepost } from './repostOfRepost'
import { Save } from './save'
import { Remix } from './remix'
import { CosignRemix } from './cosign'
import { SupporterRankUp } from './supporterRankUp'
import { MessageEmail } from './messageEmail'
import { Milestone } from './milestone'
import { Reaction } from './reaction'
import { TipSend } from './tipSend'
import { TipReceive } from './tipReceive'
import { SupporterDethroned } from './supporterDethroned'
import { SupportingRankUp } from './supportingRankUp'
import { ChallengeReward } from './challengeReward'
import { AddTrackToPlaylist } from './addTrackToPlaylist'
import { Create } from './create'
import { Announcement } from './announcement'
import { TrendingTrack } from './trendingTrack'
import { Tastemaker } from './tastemaker'
import { SaveOfRepost } from './saveOfRepost'
import { TrendingUnderground } from './trendingUnderground'
import { USDCPurchaseSeller } from './usdcPurchaseSeller'
import { USDCPurchaseBuyer } from './usdcPurchaseBuyer'
import { USDCWithdrawal } from './usdcWithdrawal'
import { USDCTransfer } from './usdcTransfer'
import { RequestManager } from './requestManager'
import { TrackAddedToPurchasedAlbum } from './trackAddedToPurchasedAlbum'
import { RewardInCooldown } from './rewardInCooldown'
import { ClaimableReward } from './claimableReward'
import { Comment } from './comment'
import { CommentThread } from './commentThread'
import { CommentMention } from './commentMention'
import { CommentReaction } from './commentReaction'
import { ListenStreakReminder } from './listenStreakReminder'
import { ArtistRemixContestEnded } from './artistRemixContestEnded'
import { FanRemixContestEnded } from './fanRemixContestEnded'
import { FanRemixContestEndingSoon } from './fanRemixContestEndingSoon'
import { FanRemixContestStarted } from './fanRemixContestStarted'
import { ArtistRemixContestEndingSoon } from './artistRemixContestEndingSoon'
import { ArtistRemixContestSubmissions } from './artistRemixContestSubmissions'
import { FanRemixContestWinnersSelected } from './fanRemixContestWinnersSelected'

export const mapNotifications = (
  notifications: (NotificationRow | EmailNotification)[],
  dnDb: Knex,
  identityDb: Knex
) => {
  return notifications
    .map((notification) => mapNotification(notification, dnDb, identityDb))
    .filter(Boolean)
}

const mapNotification = (
  notification: NotificationRow | EmailNotification,
  dnDb: Knex,
  identityDb: Knex
) => {
  if (notification.type == 'follow') {
    const followNotification = notification as NotificationRow & {
      data: FollowNotification
    }
    return new Follow(dnDb, identityDb, followNotification)
  } else if (notification.type == 'repost') {
    const repostNotification = notification as NotificationRow & {
      data: RepostNotification
    }
    return new Repost(dnDb, identityDb, repostNotification)
  } else if (notification.type == 'repost_of_repost') {
    const repostOfRepostNotification = notification as NotificationRow & {
      data: RepostOfRepostNotification
    }
    return new RepostOfRepost(dnDb, identityDb, repostOfRepostNotification)
  } else if (notification.type == 'save_of_repost') {
    const saveOfRepostNotification = notification as NotificationRow & {
      data: SaveOfRepostNotification
    }
    return new SaveOfRepost(dnDb, identityDb, saveOfRepostNotification)
  } else if (notification.type == 'save') {
    const saveNotification = notification as NotificationRow & {
      data: SaveNotification
    }
    return new Save(dnDb, identityDb, saveNotification)
  } else if (
    notification.type == 'milestone' ||
    notification.type === 'milestone_follower_count'
  ) {
    const milestoneNotification = notification as NotificationRow & {
      data: MilestoneNotification
    }
    return new Milestone(dnDb, identityDb, milestoneNotification)
  } else if (notification.type == 'remix') {
    const remixNotification = notification as NotificationRow & {
      data: RemixNotification
    }
    return new Remix(dnDb, identityDb, remixNotification)
  } else if (notification.type == 'cosign') {
    const cosignNotification = notification as NotificationRow & {
      data: CosignRemixNotification
    }
    return new CosignRemix(dnDb, identityDb, cosignNotification)
  } else if (notification.type == 'supporter_rank_up') {
    const supporterRankUpNotification = notification as NotificationRow & {
      data: SupporterRankUpNotification
    }
    return new SupporterRankUp(dnDb, identityDb, supporterRankUpNotification)
  } else if (notification.type == 'supporting_rank_up') {
    const supportingRankUp = notification as NotificationRow & {
      data: SupportingRankUpNotification
    }
    return new SupportingRankUp(dnDb, identityDb, supportingRankUp)
  } else if (notification.type == 'supporter_dethroned') {
    const supporterDethronedNotification = notification as NotificationRow & {
      data: SupporterDethronedNotification
    }
    return new SupporterDethroned(
      dnDb,
      identityDb,
      supporterDethronedNotification
    )
  } else if (notification.type == 'tip_receive') {
    const tipReceiveNotification = notification as NotificationRow & {
      data: TipReceiveNotification
    }
    return new TipReceive(dnDb, identityDb, tipReceiveNotification)
  } else if (notification.type == 'tip_send') {
    const tipSendNotification = notification as NotificationRow & {
      data: TipSendNotification
    }
    return new TipSend(dnDb, identityDb, tipSendNotification)
  } else if (notification.type == 'challenge_reward') {
    const challengeRewardNotification = notification as NotificationRow & {
      data: ChallengeRewardNotification
    }
    return new ChallengeReward(dnDb, identityDb, challengeRewardNotification)
  } else if (notification.type == 'usdc_purchase_seller') {
    const usdcPurchaseSellerNotification = notification as NotificationRow & {
      data: USDCPurchaseSellerNotification
    }
    return new USDCPurchaseSeller(
      dnDb,
      identityDb,
      usdcPurchaseSellerNotification
    )
  } else if (notification.type == 'usdc_purchase_buyer') {
    const usdcPurchaseBuyerNotification = notification as NotificationRow & {
      data: USDCPurchaseBuyerNotification
    }
    return new USDCPurchaseBuyer(
      dnDb,
      identityDb,
      usdcPurchaseBuyerNotification
    )
  } else if (notification.type == 'usdc_transfer') {
    const usdcTransferNotification = notification as NotificationRow & {
      data: USDCTransferNotification
    }
    return new USDCTransfer(dnDb, identityDb, usdcTransferNotification)
  } else if (notification.type == 'usdc_withdrawal') {
    const usdcWithdrawalNotification = notification as NotificationRow & {
      data: USDCWithdrawalNotification
    }
    return new USDCWithdrawal(dnDb, identityDb, usdcWithdrawalNotification)
  } else if (notification.type == 'track_added_to_playlist') {
    const addTrackToPlaylistNotification = notification as NotificationRow & {
      data: AddTrackToPlaylistNotification
    }
    return new AddTrackToPlaylist(
      dnDb,
      identityDb,
      addTrackToPlaylistNotification
    )
  } else if (notification.type == 'track_added_to_purchased_album') {
    const trackAddedToPurchasedAlbumNotification =
      notification as NotificationRow & {
        data: TrackAddedToPurchasedAlbumNotification
      }
    return new TrackAddedToPurchasedAlbum(
      dnDb,
      identityDb,
      trackAddedToPurchasedAlbumNotification
    )
  } else if (notification.type == 'create') {
    const createNotification = notification as NotificationRow & {
      data: CreateTrackNotification | CreatePlaylistNotification
    }
    return new Create(dnDb, identityDb, createNotification)
  } else if (notification.type == 'trending') {
    const trendingNotification = notification as NotificationRow & {
      data: TrendingTrackNotification
    }
    return new TrendingTrack(dnDb, identityDb, trendingNotification)
  } else if (notification.type == 'trending_underground') {
    const trendingNotification = notification as NotificationRow & {
      data: TrendingUndergroundNotification
    }
    return new TrendingUnderground(dnDb, identityDb, trendingNotification)
  } else if (notification.type == 'tastemaker') {
    const tastemakerNotification = notification as NotificationRow & {
      data: TastemakerNotification
    }
    return new Tastemaker(dnDb, identityDb, tastemakerNotification)
  } else if (notification.type == 'announcement') {
    const announcementNotification = notification as NotificationRow & {
      data: AnnouncementNotification
    }
    return new Announcement(dnDb, identityDb, announcementNotification)
  } else if (notification.type == 'reaction') {
    const reactionNotification = notification as NotificationRow & {
      data: ReactionNotification
    }
    return new Reaction(dnDb, identityDb, reactionNotification)
  } else if (notification.type == 'request_manager') {
    const requestManagerNotification = notification as NotificationRow & {
      data: RequestManagerNotification
    }
    return new RequestManager(dnDb, identityDb, requestManagerNotification)
  } else if (notification.type === 'approve_manager_request') {
    const approveManagerNotification = notification as NotificationRow & {
      data: ApproveManagerNotification
    }
    return new ApproveManagerRequest(
      dnDb,
      identityDb,
      approveManagerNotification
    )
  } else if (notification.type === 'claimable_reward') {
    const challengeCooldownCompleteNotification =
      notification as NotificationRow & {
        data: ClaimableRewardNotification
      }
    return new ClaimableReward(
      dnDb,
      identityDb,
      challengeCooldownCompleteNotification
    )
  } else if (notification.type === 'reward_in_cooldown') {
    const challengeCooldownNotification = notification as NotificationRow & {
      data: RewardInCooldownNotification
    }
    return new RewardInCooldown(dnDb, identityDb, challengeCooldownNotification)
  } else if (
    notification.type == DMEntityType.Message ||
    notification.type == DMEntityType.Reaction
  ) {
    const messageEmailNotification = notification as DMEmailNotification
    return new MessageEmail(dnDb, identityDb, messageEmailNotification)
  } else if (notification.type == 'comment') {
    const saveNotification = notification as NotificationRow & {
      data: CommentNotification
    }
    return new Comment(dnDb, identityDb, saveNotification)
  } else if (notification.type == 'comment_thread') {
    const saveNotification = notification as NotificationRow & {
      data: CommentThreadNotification
    }
    return new CommentThread(dnDb, identityDb, saveNotification)
  } else if (notification.type == 'comment_mention') {
    const saveNotification = notification as NotificationRow & {
      data: CommentMentionNotification
    }
    return new CommentMention(dnDb, identityDb, saveNotification)
  } else if (notification.type == 'comment_reaction') {
    const saveNotification = notification as NotificationRow & {
      data: CommentReactionNotification
    }
    return new CommentReaction(dnDb, identityDb, saveNotification)
  } else if (notification.type == 'listen_streak_reminder') {
    const ListenStreakReminderNotification = notification as NotificationRow & {
      data: ListenStreakReminderNotification
    }
    return new ListenStreakReminder(
      dnDb,
      identityDb,
      ListenStreakReminderNotification
    )
  } else if (notification.type == 'artist_remix_contest_ended') {
    const artistRemixContestEndedNotification =
      notification as NotificationRow & {
        data: ArtistRemixContestEndedNotification
      }
    return new ArtistRemixContestEnded(
      dnDb,
      identityDb,
      artistRemixContestEndedNotification
    )
  } else if (notification.type == 'fan_remix_contest_ended') {
    const fanRemixContestEndedNotification = notification as NotificationRow & {
      data: FanRemixContestEndedNotification
    }
    return new FanRemixContestEnded(
      dnDb,
      identityDb,
      fanRemixContestEndedNotification
    )
  } else if (notification.type == 'fan_remix_contest_ending_soon') {
    const fanRemixContestEndingSoonNotification =
      notification as NotificationRow & {
        data: FanRemixContestEndingSoonNotification
      }
    return new FanRemixContestEndingSoon(
      dnDb,
      identityDb,
      fanRemixContestEndingSoonNotification
    )
  } else if (notification.type == 'fan_remix_contest_started') {
    const fanRemixContestStartedNotification =
      notification as NotificationRow & {
        data: FanRemixContestStartedNotification
      }
    return new FanRemixContestStarted(
      dnDb,
      identityDb,
      fanRemixContestStartedNotification
    )
  } else if (notification.type == 'artist_remix_contest_ending_soon') {
    const artistRemixContestEndingSoonNotification =
      notification as NotificationRow & {
        data: ArtistRemixContestEndingSoonNotification
      }
    return new ArtistRemixContestEndingSoon(
      dnDb,
      identityDb,
      artistRemixContestEndingSoonNotification
    )
  } else if (notification.type == 'artist_remix_contest_submissions') {
    const artistRemixContestSubmissionsNotification =
      notification as NotificationRow & {
        data: ArtistRemixContestSubmissionsNotification
      }
    return new ArtistRemixContestSubmissions(
      dnDb,
      identityDb,
      artistRemixContestSubmissionsNotification
    )
  } else if (notification.type == 'fan_remix_contest_winners_selected') {
    const fanRemixContestWinnersSelectedNotification =
      notification as NotificationRow & {
        data: FanRemixContestWinnersSelectedNotification
      }
    return new FanRemixContestWinnersSelected(
      dnDb,
      identityDb,
      fanRemixContestWinnersSelectedNotification
    )
  }
  logger.info(`Notification type: ${notification.type} has no handler`)
}
