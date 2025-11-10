import { EntityState, PayloadAction } from '@reduxjs/toolkit'

import { ChallengeRewardID } from '~/models/AudioRewards'
import { BadgeTier } from '~/models/BadgeTier'
import { Collection } from '~/models/Collection'
import { ID } from '~/models/Identifiers'
import { Status } from '~/models/Status'
import { Track } from '~/models/Track'
import { User } from '~/models/User'
import { StringUSDC, StringWei } from '~/models/Wallet'
import { Nullable } from '~/utils'

export enum NotificationType {
  Announcement = 'Announcement',
  UserSubscription = 'UserSubscription',
  Follow = 'Follow',
  Favorite = 'Favorite',
  Repost = 'Repost',
  RepostOfRepost = 'RepostOfRepost',
  FavoriteOfRepost = 'FavoriteOfRepost',
  Milestone = 'Milestone',
  RemixCreate = 'RemixCreate',
  RemixCosign = 'RemixCosign',
  FanRemixContestStarted = 'FanRemixContestStarted',
  FanRemixContestEnded = 'FanRemixContestEnded',
  FanRemixContestEndingSoon = 'FanRemixContestEndingSoon',
  FanRemixContestWinnersSelected = 'FanRemixContestWinnersSelected',
  Tastemaker = 'Tastemaker',
  TrendingTrack = 'TrendingTrack',
  TrendingPlaylist = 'TrendingPlaylist',
  TrendingUnderground = 'TrendingUnderground',
  ChallengeReward = 'ChallengeReward',
  ClaimableReward = 'ClaimableReward',
  TierChange = 'TierChange',
  Reaction = 'Reaction',
  TipReceive = 'TipReceive',
  TipSend = 'TipSend',
  SupporterRankUp = 'SupporterRankUp',
  SupportingRankUp = 'SupportingRankUp',
  AddTrackToPlaylist = 'AddTrackToPlaylist',
  TrackAddedToPurchasedAlbum = 'TrackAddedToPurchasedAlbum',
  SupporterDethroned = 'SupporterDethroned',
  USDCPurchaseSeller = 'USDCPurchaseSeller',
  USDCPurchaseBuyer = 'USDCPurchaseBuyer',
  RequestManager = 'RequestManager',
  ApproveManagerRequest = 'ApproveManagerRequest',
  Comment = 'Comment',
  CommentThread = 'CommentThread',
  CommentMention = 'CommentMention',
  CommentReaction = 'CommentReaction',
  ListenStreakReminder = 'ListenStreakReminder',
  ArtistRemixContestEnded = 'ArtistRemixContestEnded',
  ArtistRemixContestEndingSoon = 'ArtistRemixContestEndingSoon',
  ArtistRemixContestSubmissions = 'ArtistRemixContestSubmissions'
}

export enum PushNotificationType {
  Follow = 'Follow',
  FavoriteTrack = 'FavoriteTrack',
  FavoritePlaylist = 'FavoritePlaylist',
  FavoriteAlbum = 'FavoriteAlbum',
  RepostTrack = 'RepostTrack',
  RepostPlaylist = 'RepostPlaylist',
  RepostAlbum = 'RepostAlbum',
  RepostOfRepostTrack = 'RepostOfRepostTrack',
  RepostOfRepostPlaylist = 'RepostOfRepostPlaylist',
  RepostOfRepostAlbum = 'RepostOfRepostAlbum',
  FavoriteOfRepostTrack = 'FavoriteOfRepostTrack',
  FavoriteOfRepostPlaylist = 'FavoriteOfRepostPlaylist',
  FavoriteOfRepostAlbum = 'FavoriteOfRepostAlbum',
  MilestoneListen = 'MilestoneListen',
  MilestoneRepost = 'MilestoneRepost',
  MilestoneFavorite = 'MilestoneFavorite',
  MilestoneFollow = 'MilestoneFollow',
  CreateTrack = 'CreateTrack',
  CreatePlaylist = 'CreatePlaylist',
  CreateAlbum = 'CreateAlbum',
  Announcement = 'Announcement',
  RemixCreate = 'RemixCreate',
  RemixCosign = 'RemixCosign',
  TrendingTrack = 'TrendingTrack',
  ChallengeReward = 'ChallengeReward',
  Tastemaker = 'Tastemaker',
  TierChange = 'TierChange',
  PlaylistUpdate = 'PlaylistUpdate',
  Tip = 'Tip',
  TipReceive = 'TipReceive',
  TipSend = 'TipSend',
  Reaction = 'Reaction',
  SupporterRankUp = 'SupporterRankUp',
  SupportingRankUp = 'SupportingRankUp',
  SupporterDethroned = 'SupporterDethroned',
  AddTrackToPlaylist = 'AddTrackToPlaylist',
  TrackAddedToPurchasedAlbum = 'TrackAddedToPurchasedAlbum',
  Message = 'Message',
  MessageReaction = 'MessageReaction',
  RequestManager = 'RequestManager',
  ApproveManagerRequest = 'ApproveManagerRequest',
  Comment = 'Comment',
  CommentThread = 'CommentThread',
  CommentMention = 'CommentMention',
  CommentReaction = 'CommentReaction',
  ListenStreakReminder = 'ListenStreakReminder'
}

export enum Entity {
  Track = 'Track',
  Playlist = 'Playlist',
  Album = 'Album',
  User = 'User'
}

export type TrackEntity = Track & { user: Nullable<User> }

export type CollectionEntity = Collection & { user: Nullable<User> }

export type EntityType = TrackEntity | CollectionEntity

export type TrendingRange = 'week' | 'month' | 'year'

export type BaseNotification = {
  id: string
  isViewed: boolean
  timestamp: number
  timeLabel?: string
  // group id is a part of the notifications v2 spec
  groupId?: string
}

export type AnnouncementNotification = BaseNotification & {
  type: NotificationType.Announcement
  title: string
  shortDescription: string
  longDescription?: string
  route: string
}

export type AnnouncementPushNotification = {
  type: PushNotificationType.Announcement
  title: string
  shortDescription: string
  longDescription?: string
  route: string
}

export type UserSubscriptionNotification = BaseNotification & {
  type: NotificationType.UserSubscription
  userId: ID
  entityIds: ID[]
  entityType: Entity
}

export type FollowNotification = BaseNotification & {
  type: NotificationType.Follow
  userIds: ID[]
}

export type FollowPushNotification = {
  type: PushNotificationType.Follow
  actions: [
    {
      blocknumber: number
      actionEntityId: ID
      actionEntityType: Entity.User
    }
  ]
  initiator: ID
  blocknumber: ID
  timestamp: string
  metadata: {
    followee_user_id: ID
    follower_user_id: ID
  }
}

export type RepostNotification = BaseNotification & {
  type: NotificationType.Repost
  entityId: ID
  userIds: ID[]
  entityType: Entity.Playlist | Entity.Album | Entity.Track
}

export type RepostPushNotification = {
  blocknumber: number
  entityId: ID
  initiator: ID
  timestamp: string
  type:
    | PushNotificationType.RepostAlbum
    | PushNotificationType.RepostPlaylist
    | PushNotificationType.RepostTrack
  actions: [
    {
      blocknumber: number
      actionEntityId: ID
      actionEntityType: Entity.User
    }
  ]
  metadata: {
    entity_owner_id: ID
    entity_type: Entity.Album | Entity.Playlist | Entity.Track
    entity_id: ID
  }
}

export type RepostOfRepostNotification = BaseNotification & {
  type: NotificationType.RepostOfRepost
  entityId: ID
  userIds: ID[]
  entityType: Entity.Playlist | Entity.Album | Entity.Track
}

export type RepostOfRepostPushNotification = {
  blocknumber: number
  entityId: ID
  initiator: ID
  timestamp: string
  type:
    | PushNotificationType.RepostOfRepostAlbum
    | PushNotificationType.RepostOfRepostPlaylist
    | PushNotificationType.RepostOfRepostTrack
  actions: [
    {
      blocknumber: number
      actionEntityId: ID
      actionEntityType: Entity.User
    }
  ]
  metadata: {
    entity_owner_id: ID
    entity_type: Entity.Album | Entity.Playlist | Entity.Track
    entity_id: ID
  }
}

export type FavoriteOfRepostNotification = BaseNotification & {
  type: NotificationType.FavoriteOfRepost
  entityId: ID
  userIds: ID[]
  entityType: Entity.Playlist | Entity.Album | Entity.Track
}

export type FavoriteOfRepostPushNotification = {
  blocknumber: number
  entityId: ID
  initiator: ID
  timestamp: string
  type:
    | PushNotificationType.FavoriteOfRepostAlbum
    | PushNotificationType.FavoriteOfRepostPlaylist
    | PushNotificationType.FavoriteOfRepostTrack
  actions: [
    {
      blocknumber: number
      actionEntityId: ID
      actionEntityType: Entity.User
    }
  ]
  metadata: {
    entity_owner_id: ID
    entity_type: Entity.Album | Entity.Playlist | Entity.Track
    entity_id: ID
  }
}

export type FavoriteNotification = BaseNotification & {
  type: NotificationType.Favorite
  entityId: ID
  userIds: ID[]
  entityType: Entity.Playlist | Entity.Album | Entity.Track
}

export type FavoritePushNotification = {
  blocknumber: number
  entityId: ID
  initiator: ID
  timestamp: string
  type:
    | PushNotificationType.FavoriteAlbum
    | PushNotificationType.FavoritePlaylist
    | PushNotificationType.FavoriteTrack
  actions: [
    {
      blocknumber: number
      actionEntityId: ID
      actionEntityType: Entity.User
    }
  ]
  metadata: {
    entity_owner_id: ID
    entity_type: Entity.Album | Entity.Playlist | Entity.Track
    entity_id: ID
  }
}

export enum Achievement {
  Listens = 'Listens',
  Favorites = 'Favorites',
  Reposts = 'Reposts',
  Trending = 'Trending',
  Followers = 'Followers'
}

export type MilestoneNotification = BaseNotification &
  (
    | {
        type: NotificationType.Milestone
        entityType: Entity
        entityId: ID
        achievement: Achievement
        value: number
      }
    | {
        type: NotificationType.Milestone
        entityId: ID
        achievement: Achievement.Followers
        value: number
      }
  )

export type MilestoneFollowPushNotification = {
  // TODO: Not the full structure. Need to verify the fields that come back from identity
  initiator: ID
  slot: number
  type: PushNotificationType.MilestoneFollow
}

export type MilestoneListenPushNotification = {
  actions: [
    {
      // NOTE: This is actually the milestone value, not the id
      actionEntityId: number
      actionEntityType: Entity.Track | Entity.Album | Entity.Playlist
    }
  ]
  initiator: ID
  entityId: ID
  slot: number
  type: PushNotificationType.MilestoneListen
  metadata: {
    threshold: number
    entity_type: Entity
    entity_id: ID
  }
}

export type MilestoneRepostPushNotification = {
  actions: [
    {
      // NOTE: This is actually the milestone value, not the id
      actionEntityId: number
      actionEntityType: Entity.Track | Entity.Album | Entity.Playlist
    }
  ]
  initiator: ID
  entityId: ID
  slot: number
  type: PushNotificationType.MilestoneRepost
  metadata: {
    threshold: number
    entity_type: Entity
    entity_id: ID
  }
}

export type MilestoneFavoritePushNotification = {
  actions: [
    {
      // NOTE: This is actually the milestone value, not the id
      actionEntityId: number
      actionEntityType: Entity.Track | Entity.Album | Entity.Playlist
    }
  ]
  initiator: ID
  entityId: ID
  slot: number
  type: PushNotificationType.MilestoneFavorite
  metadata: {
    threshold: number
    entity_type: Entity
    entity_id: ID
  }
}

export type RemixCreateNotification = BaseNotification & {
  type: NotificationType.RemixCreate
  userId: ID
  parentTrackId: ID
  childTrackId: ID
  entityType: Entity.Track
}

export type RemixCreatePushNotification = {
  type: PushNotificationType.RemixCreate
  entityId: ID
  actions: [
    // Parent Track User
    {
      actionEntityType: Entity.User
      actionEntityId: ID
      blocknumber: number
    },
    // Remixed Track
    {
      actionEntityType: Entity.Track
      actionEntityId: ID
      blocknumber: number
    },
    // Parent Track
    {
      actionEntityType: Entity.Track
      actionEntityId: ID
      blocknumber: number
    }
  ]
}

export type RemixCosignNotification = BaseNotification & {
  type: NotificationType.RemixCosign
  userId: ID
  parentTrackUserId: ID
  childTrackId: ID
  entityType: Entity.Track
  entityIds: ID[]
}

export type RemixCosignPushNotification = {
  type: PushNotificationType.RemixCosign
  entityId: ID
  actions: [
    {
      actionEntityType: Entity.User
      actionEntityId: ID
      blocknumber: number
    },
    {
      actionEntityType: Entity.Track
      actionEntityId: ID
      blocknumber: number
    }
  ]
}

export type TrendingPlaylistNotification = BaseNotification & {
  type: NotificationType.TrendingPlaylist
  rank: number
  genre: string
  time: 'week' | 'month' | 'year'
  entityType: Entity.Playlist
  entityId: ID
}

export type TrendingTrackNotification = BaseNotification & {
  type: NotificationType.TrendingTrack
  rank: number
  genre: string
  time: 'week' | 'month' | 'year'
  entityType: Entity.Track
  entityId: ID
}

export type TrendingUndergroundNotification = BaseNotification & {
  type: NotificationType.TrendingUnderground
  rank: number
  genre: string
  time: 'week' | 'month' | 'year'
  entityType: Entity.Track
  entityId: ID
}

export type TastemakerNotification = BaseNotification & {
  type: NotificationType.Tastemaker
  entityType: Entity.Track
  entityId: ID
  userId: ID // track owner id
}

export type ChallengeRewardNotification = BaseNotification & {
  type: NotificationType.ChallengeReward
  challengeId: ChallengeRewardID
  entityType: string
  amount: StringWei
  listenStreak?: number
}

export type ClaimableRewardNotification = BaseNotification & {
  type: NotificationType.ClaimableReward
  challengeId: ChallengeRewardID
  entityType: string
}

export type TierChangeNotification = BaseNotification & {
  type: NotificationType.TierChange
  userId: ID
  tier: BadgeTier
}

// TODO: when we support multiple reaction types, reactedToEntity type
// should differ in a discrimated union reactionType
export type ReactionNotification = BaseNotification & {
  type: NotificationType.Reaction
  entityId: ID
  entityType: Entity.User
  reactionValue: number
  reactionType: string
  reactedToEntity: {
    tx_signature: string
    amount: StringWei
    tip_sender_id: ID
  }
}

export type ReactionPushNotification = {
  type: PushNotificationType.Reaction
  initiator: ID
  slot: number
  metadata: {
    // TODO: Need to verify camelCase vs snake_case
    reaction_value: number
    reacted_to_entity: {
      tx_signature: string
      tip_sender_id: ID
      amount: string
    }
    reaction_type: string
  }
}

export type TipReceiveNotification = BaseNotification & {
  type: NotificationType.TipReceive
  amount: StringWei
  reactionValue: number
  entityId: ID
  entityType: Entity.User
  tipTxSignature: string
}

export type TipReceivePushNotification = {
  type: PushNotificationType.TipReceive
  slot: number
  initiator: ID
  metadata: {
    entity_id: ID
    entity_type: Entity.User
    amount: StringWei
    tx_signature: string
  }
}

export type TipSendNotification = BaseNotification & {
  type: NotificationType.TipSend
  amount: StringWei
  entityId: ID
  entityType: Entity.User
}

export type TipSendPushNotification = {
  type: PushNotificationType.TipSend
  slot: number
  initiator: ID
  metadata: {
    // TODO: Need to verify camelCase vs snake_case
    entityId: ID
    entityType: Entity.User
    amount: StringWei
    tipTxSignature: string
  }
}

export type SupporterRankUpNotification = BaseNotification & {
  type: NotificationType.SupporterRankUp
  rank: number
  entityId: ID
  entityType: Entity.User
}

export type SupporterRankUpPushNotification = {
  initiator: ID
  slot: number
  type: PushNotificationType.SupporterRankUp
  metadata: {
    rank: number
    entity_type: Entity.User
    entity_id: ID
  }
}

export type SupportingRankUpNotification = BaseNotification & {
  type: NotificationType.SupportingRankUp
  rank: number
  entityId: ID
  entityType: Entity.User
}

export type SupportingRankUpPushNotification = {
  initiator: ID
  slot: number
  type: PushNotificationType.SupportingRankUp
  metadata: {
    rank: number
    entity_type: Entity.User
    entity_id: ID
  }
}

export type SupporterDethronedNotification = BaseNotification & {
  type: NotificationType.SupporterDethroned
  entityType: Entity.User
  entityId: ID // The usurping user
  supportedUserId: ID
  // Not currently used:
  // newAmount	"3000000000000000000"
  // oldAmount	"2000000000000000000"
}

export type AddTrackToPlaylistNotification = BaseNotification & {
  type: NotificationType.AddTrackToPlaylist
  trackId: ID
  playlistId: ID
  playlistOwnerId: ID
}

export type TrackAddedToPurchasedAlbumNotification = BaseNotification & {
  type: NotificationType.TrackAddedToPurchasedAlbum
  trackId: ID
  playlistId: ID
  playlistOwnerId: ID
}

export type AddTrackToPlaylistPushNotification = {
  type: PushNotificationType.AddTrackToPlaylist
  entityId: ID
  metadata: {
    // TODO: Need to verify camelCase vs snake_case
    playlistId: ID
    trackOwnerId: ID
    playlistOwnerId: ID
  }
}

export type TrackAddedToPurchasedAlbumPushNotification = {
  type: PushNotificationType.TrackAddedToPurchasedAlbum
  entityId: ID
  metadata: {
    // TODO: Need to verify camelCase vs snake_case
    playlistId: ID
    trackOwnerId: ID
    playlistOwnerId: ID
  }
}

export type USDCPurchaseSellerNotification = BaseNotification & {
  type: NotificationType.USDCPurchaseSeller
  entityId: ID
  userIds: ID[]
  entityType: Entity.Track | Entity.Album
  amount: StringUSDC
  extraAmount: StringUSDC
}

export type USDCPurchaseBuyerNotification = BaseNotification & {
  type: NotificationType.USDCPurchaseBuyer
  entityId: ID
  userIds: ID[]
  entityType: Entity.Track | Entity.Album
}

export type RequestManagerNotification = BaseNotification & {
  type: NotificationType.RequestManager
  userId: ID
}

export type ApproveManagerRequestNotification = BaseNotification & {
  type: NotificationType.ApproveManagerRequest
  userId: ID
}

export type CommentNotification = BaseNotification & {
  type: NotificationType.Comment
  entityId: ID
  userIds: ID[]
  entityType: Entity.Playlist | Entity.Album | Entity.Track
  commentId?: ID
}

export type CommentThreadNotification = BaseNotification & {
  type: NotificationType.CommentThread
  entityId: ID
  entityUserId: ID
  userIds: ID[]
  entityType: Entity.Playlist | Entity.Album | Entity.Track
  commentId?: ID
}

export type CommentMentionNotification = BaseNotification & {
  type: NotificationType.CommentMention
  entityId: ID
  entityUserId: ID
  userIds: ID[]
  entityType: Entity.Playlist | Entity.Album | Entity.Track
  commentId?: ID
}

export type CommentReactionNotification = BaseNotification & {
  type: NotificationType.CommentReaction
  entityId: ID
  entityUserId: ID
  userIds: ID[]
  entityType: Entity.Playlist | Entity.Album | Entity.Track
  commentId?: ID
}

export type ListenStreakReminderNotification = BaseNotification & {
  type: NotificationType.ListenStreakReminder
  streak: number
}

export type FanRemixContestStartedNotification = BaseNotification & {
  type: NotificationType.FanRemixContestStarted
  entityId: ID
  entityUserId: ID
  entityType: Entity.Track
}

export type FanRemixContestEndingSoonNotification = BaseNotification & {
  type: NotificationType.FanRemixContestEndingSoon
  entityId: ID
  entityUserId: ID
  entityType: Entity.Track
}

export type ArtistRemixContestEndedNotification = BaseNotification & {
  type: NotificationType.ArtistRemixContestEnded
  entityId: ID
  entityType: Entity.Track
}

export type FanRemixContestEndedNotification = BaseNotification & {
  type: NotificationType.FanRemixContestEnded
  entityId: ID
  entityUserId: ID
}

export type FanRemixContestWinnersSelectedNotification = BaseNotification & {
  type: NotificationType.FanRemixContestWinnersSelected
  entityId: ID
  entityUserId: ID
  entityType: Entity.Track
}

export type ArtistRemixContestEndingSoonNotification = BaseNotification & {
  type: NotificationType.ArtistRemixContestEndingSoon
  entityId: ID
  entityUserId: ID
}

export type ArtistRemixContestSubmissionsNotification = BaseNotification & {
  type: NotificationType.ArtistRemixContestSubmissions
  eventId: ID
  milestone: number
  entityId: ID
  entityType: Entity.Track
}

export type Notification =
  | AnnouncementNotification
  | UserSubscriptionNotification
  | FollowNotification
  | RepostNotification
  | RepostOfRepostNotification
  | FavoriteOfRepostNotification
  | FavoriteNotification
  | MilestoneNotification
  | RemixCreateNotification
  | RemixCosignNotification
  | FanRemixContestStartedNotification
  | FanRemixContestEndingSoonNotification
  | TastemakerNotification
  | TrendingPlaylistNotification
  | TrendingTrackNotification
  | TrendingUndergroundNotification
  | ChallengeRewardNotification
  | ClaimableRewardNotification
  | TierChangeNotification
  | ReactionNotification
  | TipReceiveNotification
  | TipSendNotification
  | SupporterRankUpNotification
  | SupportingRankUpNotification
  | SupporterDethronedNotification
  | AddTrackToPlaylistNotification
  | TrackAddedToPurchasedAlbumNotification
  | USDCPurchaseSellerNotification
  | USDCPurchaseBuyerNotification
  | RequestManagerNotification
  | ApproveManagerRequestNotification
  | CommentNotification
  | CommentThreadNotification
  | CommentMentionNotification
  | CommentReactionNotification
  | ListenStreakReminderNotification
  | ArtistRemixContestEndedNotification
  | FanRemixContestEndedNotification
  | FanRemixContestWinnersSelectedNotification
  | ArtistRemixContestEndingSoonNotification
  | ArtistRemixContestSubmissionsNotification

export type IdentityNotification = Omit<Notification, 'timestamp'> & {
  timestamp: string
}

export type NotificationsState = EntityState<Notification> & {
  status: Status
  hasMore: boolean
  totalUnviewed: number
}

export type AddNotificationsAction = PayloadAction<{
  notifications: Notification[]
  totalUnviewed: number
  hasMore: boolean
}>

export type UpdateNotificationsAction = PayloadAction<{
  notifications: Notification[]
  totalUnviewed: number
  hasMore: boolean
}>

export type FetchNotificationsAction = PayloadAction<
  | undefined
  | {
      pageSize?: number
    }
>

export type FetchNotificationsFailedAction = PayloadAction<{
  message: string
  shouldReport?: boolean
}>

export type MessagePushNotification = {
  chatId: string
}

export type MessageReactionPushNotification = {
  chatId: string
  messageId: string
}
