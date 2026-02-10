import {
  ChallengeId,
  EntityType,
  DMEntityType
} from '../email/notifications/types'
import { NotificationRow } from './dn'

export type DMNotification = {
  chat_id: string
  sender_user_id: number
  receiver_user_id: number
  timestamp: Date
}

export type DMReactionNotification = {
  chat_id: string
  message_id: string
  sender_user_id: number
  receiver_user_id: number
  reaction: string
  timestamp: Date
}

export type DMEmailNotification = {
  type: DMEntityType
  sender_user_id: number
  receiver_user_id: number
  multiple?: boolean
}

export type AppEmailNotification = {
  receiver_user_id: number
} & NotificationRow

export type EmailNotification = AppEmailNotification | DMEmailNotification

export type EmailUser = {
  user_id: number
  name: string
  profile_picture_sizes: string
  profile_picture: string
  creator_node_endpoint: string
  imageUrl: string
}

export type FollowNotification = {
  follower_user_id: number
  followee_user_id: number
}

export type FollowNotificationEmail = {
  type: 'follow'
  data: FollowNotification
  followerUser: EmailUser
}

export type TastemakerNotification = {
  tastemaker_item_id: number
  tastemaker_item_owner_id: number
  tastemaker_user_id: number
  tastemaker_item_type: string
}

export type RepostNotification = {
  type: EntityType
  user_id: number
  repost_item_id: number
}

export type RepostOfRepostNotification = {
  type: EntityType
  user_id: number
  repost_of_repost_item_id: number
}

export type SaveNotification = {
  type: EntityType
  user_id: number
  save_item_id: number
}

export type SaveOfRepostNotification = {
  type: EntityType
  user_id: number
  save_of_repost_item_id: number
}

export type MilestoneNotification = {
  type: EntityType
  threshold: number
}

export type RemixNotification = {
  parent_track_id: number
  track_id: number
}

export type CosignRemixNotification = {
  parent_track_id: number
  track_id: number
  track_owner_id: number
}

export type CreateTrackNotification = {
  track_id: number
}

export type CreatePlaylistNotification = {
  is_album: boolean
  playlist_id: number
}

export type TipReceiveNotification = {
  amount: number
  sender_user_id: number
  receiver_user_id: number
}

export type TipSendNotification = {
  amount: number
  sender_user_id: number
  receiver_user_id: number
}

export type ChallengeRewardNotification = {
  amount: number
  specifier: string
  challenge_id: ChallengeId
  listen_streak?: number
}

export type ClaimableRewardNotification = {
  amount: number
  specifier: string
  challenge_id: ChallengeId
}

export type ReactionNotification = {
  reacted_to: string
  reaction_type: string
  reaction_value: number
  sender_wallet: string
  receiver_user_id: number
  sender_user_id: number
  tip_amount: string
}

export type RequestManagerNotification = {
  grantee_user_id: number
  grantee_address: string
  user_id: number
}

export type ApproveManagerNotification = {
  grantee_user_id: number
  grantee_address: string
  user_id: number
}

export type RewardInCooldownNotification = {
  amount: number
  specifier: string
  challenge_id: ChallengeId
}

export type SupporterRankUpNotification = {
  rank: number
  sender_user_id: number
  receiver_user_id: number
}

export type SupportingRankUpNotification = {
  rank: number
  sender_user_id: number
  receiver_user_id: number
}

export type SupporterDethronedNotification = {
  sender_user_id: number
  receiver_user_id: number
  dethroned_user_id: number
}

export enum MilestoneType {
  FOLLOWER_COUNT = 'FOLLOWER_COUNT',
  TRACK_REPOST_COUNT = 'TRACK_REPOST_COUNT',
  TRACK_SAVE_COUNT = 'TRACK_SAVE_COUNT',
  PLAYLIST_REPOST_COUNT = 'PLAYLIST_REPOST_COUNT',
  PLAYLIST_SAVE_COUNT = 'PLAYLIST_SAVE_COUNT',
  LISTEN_COUNT = 'LISTEN_COUNT'
}

export type AddTrackToPlaylistNotification = {
  track_id: number
  playlist_id: number
}

export type TrackAddedToPurchasedAlbumNotification = {
  track_id: number
  playlist_id: number
  playlist_owner_id: number
}

export type FollowerMilestoneNotification = {
  type: MilestoneType.FOLLOWER_COUNT
  user_id: number
  threshold: number
}

export type TrackMilestoneNotification = {
  type:
    | MilestoneType.TRACK_REPOST_COUNT
    | MilestoneType.TRACK_SAVE_COUNT
    | MilestoneType.LISTEN_COUNT
  track_id: number
  threshold: number
}

export type PlaylistMilestoneNotification = {
  type: MilestoneType.PLAYLIST_REPOST_COUNT | MilestoneType.PLAYLIST_SAVE_COUNT
  playlist_id: number
  threshold: number
}

export type ListenCountMilestoneNotifications = {
  type: MilestoneType.LISTEN_COUNT
  track_id: number
  threshold: number
}

export type TierChangeNotification = {
  new_tier: string
  new_tier_value: number
  current_value: string
}

export type TrendingTrackNotification = {
  track_id: number
  rank: number
  genre: string
  time_range: string
}

export type TrendingUndergroundNotification = {
  track_id: number
  rank: number
  genre: string
  time_range: string
}

export type AnnouncementNotification = {
  title: string
  short_description: string
  long_description?: string
  push_body?: string
}

export type USDCPurchaseBuyerNotification = {
  content_type: string
  buyer_user_id: number
  seller_user_id: number
  amount: number
  extra_amount: number
  content_id: number
  vendor: string
}

export type USDCPurchaseSellerNotification = {
  content_type: string
  buyer_user_id: number
  seller_user_id: number
  amount: number
  extra_amount: number
  content_id: number
}

export type USDCTransferNotification = {
  user_id: number
  signature: string
  change: number
  receiver_account: string
}

export type USDCWithdrawalNotification = {
  user_id: number
  signature: string
  change: number
  receiver_account: string
}

export type CommentNotification = {
  type: EntityType
  entity_id: number
  comment_user_id: number
  comment_id: number
}

export type CommentThreadNotification = {
  type: EntityType
  entity_id: number
  entity_user_id: number
  comment_user_id: number
  comment_id: number
}

export type CommentMentionNotification = {
  type: EntityType
  entity_id: number
  entity_user_id: number
  comment_user_id: number
  comment_id: number
}

export type CommentReactionNotification = {
  type: EntityType
  entity_id: number
  entity_user_id: number
  comment_id: number
  comment_user_id: number
  reacter_user_id: number
}

export type ListenStreakReminderNotification = {
  streak: number
}

export type ArtistRemixContestEndedNotification = {
  entityId: number
}

export type FanRemixContestEndedNotification = {
  entityId: number
  entityUserId: number
}

export type FanRemixContestEndingSoonNotification = {
  entityId: number
  entityUserId: number
}

export type FanRemixContestStartedNotification = {
  entityId: number
  entityUserId: number
}

export type FanRemixContestWinnersSelectedNotification = {
  entityId: number
  entityUserId: number
}

export type ArtistRemixContestEndingSoonNotification = {
  entityId: number
  entityUserId: number
}

export type ArtistRemixContestSubmissionsNotification = {
  entityId: number
  eventId: number
  milestone: number
}

export type NotificationData =
  | DMNotification
  | DMReactionNotification
  | FollowNotification
  | RepostNotification
  | RepostOfRepostNotification
  | SaveNotification
  | SaveOfRepostNotification
  | MilestoneNotification
  | RemixNotification
  | CosignRemixNotification
  | CreateTrackNotification
  | CreatePlaylistNotification
  | TipReceiveNotification
  | TipSendNotification
  | ChallengeRewardNotification
  | ReactionNotification
  | SupporterRankUpNotification
  | SupportingRankUpNotification
  | FollowerMilestoneNotification
  | TrackMilestoneNotification
  | PlaylistMilestoneNotification
  | TierChangeNotification
  | SupporterDethronedNotification
  | AddTrackToPlaylistNotification
  | TrackAddedToPurchasedAlbumNotification
  | AnnouncementNotification
  | TastemakerNotification
  | TrendingTrackNotification
  | TrendingUndergroundNotification
  | CommentNotification
  | CommentThreadNotification
  | CommentMentionNotification
  | CommentReactionNotification
  | ListenStreakReminderNotification
  | ArtistRemixContestEndedNotification
  | FanRemixContestEndedNotification
  | FanRemixContestEndingSoonNotification
  | FanRemixContestStartedNotification
  | FanRemixContestWinnersSelectedNotification
  | ArtistRemixContestEndingSoonNotification
  | ArtistRemixContestSubmissionsNotification

export class RequiresRetry extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RequiresRetry'
  }
}
