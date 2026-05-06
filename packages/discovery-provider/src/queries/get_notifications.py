import logging
from collections import defaultdict
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, TypedDict, Union

from sqlalchemy import bindparam, text
from sqlalchemy.orm.session import Session

from src.models.tracks.track import Track

logger = logging.getLogger(__name__)

notification_groups_sql = text(
    """
--- Create Intervals of user seen
WITH user_seen as (
  SELECT
    LAG(seen_at, 1, now()::timestamp) OVER ( ORDER BY seen_at desc ) AS seen_at,
    seen_at as prev_seen_at
  FROM
    notification_seen
  WHERE
    user_id = :user_id
  ORDER BY
    seen_at desc
), user_created_at as (
  SELECT
    created_at
  FROM
    users
  WHERE
    user_id =  :user_id
  AND is_current
)
SELECT
    n.type,
    n.group_id as group_id,
    array_agg(n.id),
    CASE 
      WHEN user_seen.seen_at is not NULL THEN now()::timestamp != user_seen.seen_at
      ELSE EXISTS(SELECT 1 from notification_seen where user_id = :user_id)
    END as is_seen,
    CASE 
      WHEN user_seen.seen_at is not NULL THEN user_seen.seen_at
      ELSE (
        SELECT seen_at from notification_seen
        WHERE user_id = :user_id
        ORDER BY seen_at ASC
        limit 1
      )
    END as seen_at,
    user_seen.prev_seen_at,
    count(n.group_id),
    max(n.timestamp) as latest_timestamp
FROM
    notification n
LEFT JOIN user_seen on
  user_seen.seen_at >= n.timestamp and user_seen.prev_seen_at < n.timestamp
WHERE
  ((ARRAY[:user_id] && n.user_ids) OR (n.type = 'announcement' AND n.timestamp > (SELECT created_at FROM user_created_at))) AND
  (:valid_types is NOT NULL AND n.type in :valid_types) AND
  (
    (:timestamp_offset is NULL AND :group_id_offset is NULL) OR
    (:timestamp_offset is NULL AND :group_id_offset is NOT NULL AND n.group_id < :group_id_offset) OR
    (:timestamp_offset is NOT NULL AND n.timestamp < :timestamp_offset) OR
    (
        :group_id_offset is NOT NULL AND :timestamp_offset is NOT NULL AND 
        (n.timestamp = :timestamp_offset AND n.group_id < :group_id_offset)
    )
  )
GROUP BY
  n.type, n.group_id, user_seen.seen_at, user_seen.prev_seen_at
ORDER BY
  user_seen.seen_at desc NULLS LAST,
  max(n.timestamp) desc,
  n.group_id desc
limit :limit;
"""
)
notification_groups_sql = notification_groups_sql.bindparams(
    bindparam("valid_types", expanding=True)
)

unread_notification_count_sql = text(
    """
--- Create Intervals of user seen
WITH user_created_at as (
  SELECT
    created_at
  FROM
    users
  WHERE
    user_id = :user_id
  AND is_current
)
SELECT
    count(*)
FROM (
   select n.type, n.group_id
   from
       notification n
  WHERE
    ((ARRAY[:user_id] && n.user_ids) OR (n.type = 'announcement' AND n.timestamp > (SELECT created_at FROM user_created_at))) AND
    (:valid_types is NOT NULL AND n.type in :valid_types) AND
    n.timestamp > COALESCE((
        SELECT
            seen_at
        FROM
            notification_seen
        WHERE
            user_id = :user_id
        ORDER BY seen_at desc
        LIMIT 1
    ), '2016-01-01'::timestamp)
  GROUP BY
    n.type, n.group_id
) user_notifications;
"""
)
unread_notification_count_sql = unread_notification_count_sql.bindparams(
    bindparam("valid_types", expanding=True)
)


MAX_LIMIT = 50
DEFAULT_LIMIT = 20


class NotificationGroup(TypedDict):
    type: str
    group_id: str
    notification_ids: List[int]
    is_seen: bool
    seen_at: datetime
    prev_seen_at: datetime
    count: int


class NotificationType(str, Enum):
    ANNOUNCEMENT = "announcement"
    FOLLOW = "follow"
    REPOST = "repost"
    SAVE = "save"
    REMIX = "remix"
    COSIGN = "cosign"
    CREATE = "create"
    TIP_RECEIVE = "tip_receive"
    TIP_SEND = "tip_send"
    CHALLENGE_REWARD = "challenge_reward"
    REPOST_OF_REPOST = "repost_of_repost"
    SAVE_OF_REPOST = "save_of_repost"
    TASTEMAKER = "tastemaker"
    REACTION = "reaction"
    SUPPORTER_DETRONED = "supporter_dethroned"
    SUPPORTER_RANK_UP = "supporter_rank_up"
    SUPPORTING_RANK_UP = "supporting_rank_up"
    MILESTONE = "milestone"
    TRACK_MILESTONE = "track_milestone"
    TRACK_ADDED_TO_PLAYLIST = "track_added_to_playlist"
    PLAYLIST_MILSTONE = "playlist_milestone"
    TIER_CHANGE = "tier_change"
    TRENDING = "trending"
    TRENDING_PLAYLIST = "trending_playlist"
    TRENDING_UNDERGROUND = "trending_underground"
    USDC_PURCHASE_BUYER = "usdc_purchase_buyer"
    USDC_PURCHASE_SELLER = "usdc_purchase_seller"
    TRACK_ADDED_TO_PURCHASED_ALBUM = "track_added_to_purchased_album"
    REQUEST_MANAGER = "request_manager"
    APPROVE_MANAGER_REQUEST = "approve_manager_request"
    CLAIMABLE_REWARD = "claimable_reward"
    COMMENT = "comment"
    COMMENT_THREAD = "comment_thread"
    COMMENT_MENTION = "comment_mention"
    COMMENT_REACTION = "comment_reaction"
    LISTEN_STREAK_REMINDER = "listen_streak_reminder"
    FAN_REMIX_CONTEST_STARTED = "fan_remix_contest_started"
    FAN_REMIX_CONTEST_ENDED = "fan_remix_contest_ended"
    FAN_REMIX_CONTEST_ENDING_SOON = "fan_remix_contest_ending_soon"
    FAN_REMIX_CONTEST_WINNERS_SELECTED = "fan_remix_contest_winners_selected"
    ARTIST_REMIX_CONTEST_ENDED = "artist_remix_contest_ended"
    ARTIST_REMIX_CONTEST_ENDING_SOON = "artist_remix_contest_ending_soon"
    ARTIST_REMIX_CONTEST_SUBMISSIONS = "artist_remix_contest_submissions"
    # Indexer/pedalboard emit these types but they were missing from the
    # enum, so the parser's `oneof` validation rejected them as
    # `valid_types` args and the default list below couldn't include
    # them. Add the missing members so the frontend can opt in/out and
    # the default-all path returns them.
    FAN_REMIX_CONTEST_SUBMISSION = "fan_remix_contest_submission"
    FAN_CLUB_TEXT_POST = "fan_club_text_post"
    REMIX_CONTEST_UPDATE = "remix_contest_update"

    def __str__(self) -> str:
        return str.__str__(self)


# Default-on notification types when the client doesn't enumerate them
# explicitly (or sends an empty list). The set mirrors the Go API's
# `oneof=...` whitelist on /v1/notifications (api.audius.co repo,
# api/v1_notifications.go) which is the canonical source of truth for
# "types the frontend knows how to render". Adding a new user-facing
# notification type means appending it here AND to the Go API
# whitelist; deprecated/broken types are owned by the Go API's
# `unsupportedNotificationTypes` deny-list and intentionally omitted
# here too.
default_valid_notification_types = [
    NotificationType.ANNOUNCEMENT,
    NotificationType.FOLLOW,
    NotificationType.REPOST,
    NotificationType.SAVE,
    NotificationType.COSIGN,
    NotificationType.CREATE,
    NotificationType.TIP_RECEIVE,
    NotificationType.TIP_SEND,
    NotificationType.CHALLENGE_REWARD,
    NotificationType.REPOST_OF_REPOST,
    NotificationType.SAVE_OF_REPOST,
    NotificationType.TASTEMAKER,
    NotificationType.REACTION,
    NotificationType.SUPPORTER_DETRONED,
    NotificationType.SUPPORTER_RANK_UP,
    NotificationType.SUPPORTING_RANK_UP,
    NotificationType.MILESTONE,
    NotificationType.TRACK_ADDED_TO_PLAYLIST,
    NotificationType.TIER_CHANGE,
    NotificationType.TRENDING,
    NotificationType.TRENDING_PLAYLIST,
    NotificationType.TRENDING_UNDERGROUND,
    NotificationType.USDC_PURCHASE_BUYER,
    NotificationType.USDC_PURCHASE_SELLER,
    NotificationType.TRACK_ADDED_TO_PURCHASED_ALBUM,
    NotificationType.REQUEST_MANAGER,
    NotificationType.APPROVE_MANAGER_REQUEST,
    NotificationType.CLAIMABLE_REWARD,
    NotificationType.COMMENT,
    NotificationType.COMMENT_THREAD,
    NotificationType.COMMENT_MENTION,
    NotificationType.COMMENT_REACTION,
    NotificationType.LISTEN_STREAK_REMINDER,
    NotificationType.FAN_REMIX_CONTEST_STARTED,
    NotificationType.FAN_REMIX_CONTEST_ENDED,
    NotificationType.FAN_REMIX_CONTEST_ENDING_SOON,
    NotificationType.FAN_REMIX_CONTEST_WINNERS_SELECTED,
    NotificationType.FAN_REMIX_CONTEST_SUBMISSION,
    NotificationType.ARTIST_REMIX_CONTEST_ENDED,
    NotificationType.ARTIST_REMIX_CONTEST_ENDING_SOON,
    NotificationType.ARTIST_REMIX_CONTEST_SUBMISSIONS,
    NotificationType.FAN_CLUB_TEXT_POST,
    NotificationType.REMIX_CONTEST_UPDATE,
]


class GetNotificationArgs(TypedDict):
    user_id: int
    timestamp: Optional[datetime]
    group_id: Optional[str]
    limit: Optional[int]
    valid_types: Optional[List[NotificationType]]


def get_notification_groups(session: Session, args: GetNotificationArgs):
    """
    Gets the user's notifications in the database
    """
    valid_types = args.get("valid_types", default_valid_notification_types)
    limit = args.get("limit") or DEFAULT_LIMIT
    limit = min(limit, MAX_LIMIT)  # type: ignore

    rows = session.execute(
        notification_groups_sql,
        {
            "user_id": args["user_id"],
            "limit": limit,
            "timestamp_offset": args.get("timestamp", None),
            "group_id_offset": args.get("group_id", None),
            "valid_types": valid_types,
        },
    )

    res: List[NotificationGroup] = [
        {
            "type": r[0],
            "group_id": r[1],
            "notification_ids": r[2],
            "is_seen": r[3] if r[3] != None else False,
            "seen_at": r[4],
            "prev_seen_at": r[5],
            "count": r[6],
        }
        for r in rows
    ]

    return res


class FollowNotification(TypedDict):
    follower_user_id: int
    followee_user_id: int


class RepostNotification(TypedDict):
    type: str
    user_id: int
    repost_item_id: int


class RepostOfRepostNotification(TypedDict):
    type: str
    user_id: int
    repost_of_repost_item_id: int


class SaveOfRepostNotification(TypedDict):
    type: str
    user_id: int
    save_of_repost_item_id: int


class TastemakerNotification(TypedDict):
    tastemaker_item_id: int
    tastemaker_item_owner_id: int
    action: str
    tastemaker_item_type: str
    tastemaker_user_id: int


class SaveNotification(TypedDict):
    type: str
    user_id: int
    save_item_id: int


class RemixNotification(TypedDict):
    parent_track_id: int
    track_id: int


class CosignRemixNotification(TypedDict):
    parent_track_id: int
    track_owner_id: int
    track_id: int


class CreateTrackNotification(TypedDict):
    track_id: int


class CreatePlaylistNotification(TypedDict):
    is_album: bool
    playlist_id: int


class TipReceiveNotification(TypedDict):
    amount: int
    sender_user_id: int
    receiver_user_id: int
    tx_signature: str
    reaction_value: Optional[int]


class TipSendNotification(TypedDict):
    amount: int
    sender_user_id: int
    receiver_user_id: int
    tx_signature: str


class ChallengeRewardNotification(TypedDict):
    amount: int
    specifier: str
    challenge_id: str
    listen_streak: Optional[int]


class ClaimableRewardNotification(TypedDict):
    amount: int
    specifier: str
    challenge_id: str


class ReactionNotification(TypedDict):
    reacted_to: str
    reaction_type: str
    reaction_value: int
    sender_wallet: str
    receiver_user_id: int
    sender_user_id: int
    tip_amount: int


class SupporterRankUpNotification(TypedDict):
    rank: int
    sender_user_id: int
    receiver_user_id: int


class SupportingRankUpNotification(TypedDict):
    rank: int
    sender_user_id: int
    receiver_user_id: int


class SupporterDethronedNotification(TypedDict):
    sender_user_id: int
    receiver_user_id: int
    dethroned_user_id: int


class FollowerMilestoneNotification(TypedDict):
    type: str
    user_id: int
    threshold: int


class TrackMilestoneNotification(TypedDict):
    type: str
    track_id: int
    threshold: int


class PlaylistMilestoneNotification(TypedDict):
    type: str
    playlist_id: int
    threshold: int
    is_album: bool


class TierChangeNotification(TypedDict):
    new_tier: str
    new_tier_value: int
    current_value: str


class TrackAddedToPlaylistNotification(TypedDict):
    track_id: int
    playlist_id: int
    playlist_owner_id: int


class TrackAddedToPurchasedAlbumNotification(TypedDict):
    track_id: int
    playlist_id: int
    playlist_owner_id: int


class TrendingNotification(TypedDict):
    rank: int
    genre: str
    track_id: int
    time_range: str


class TrendingPlaylistNotification(TypedDict):
    rank: int
    genre: str
    playlist_id: int
    time_range: str


class TrendingUndergroundNotification(TypedDict):
    rank: int
    genre: str
    track_id: int
    time_range: str


class UsdcPurchaseSellerNotification(TypedDict):
    content_type: str
    content_id: int
    buyer_user_id: int
    seller_user_id: int
    amount: int
    extra_amount: int


class UsdcPurchaseBuyerNotification(TypedDict):
    content_type: str
    content_id: int
    buyer_user_id: int
    seller_user_id: int
    amount: int
    extra_amount: int


class RequestManagerNotification(TypedDict):
    user_id: int
    grantee_user_id: int
    grantee_address: str


class ApproveManagerNotification(TypedDict):
    user_id: int
    grantee_user_id: int
    grantee_address: str


class AnnouncementNotification(TypedDict):
    title: str
    short_description: str
    long_description: Optional[str]


class CommentNotification(TypedDict):
    type: str
    entity_id: int
    comment_user_id: int
    comment_id: Optional[int]


class CommentThreadNotification(TypedDict):
    type: str
    entity_id: int
    entity_user_id: int
    comment_user_id: int
    comment_id: Optional[int]


class CommentMentionNotification(TypedDict):
    type: str
    entity_id: int
    entity_user_id: int
    comment_user_id: int
    comment_id: Optional[int]


class CommentReactionNotification(TypedDict):
    type: str
    entity_id: int
    entity_user_id: int
    reacter_user_id: int
    comment_id: Optional[int]


class ListenStreakReminderNotification(TypedDict):
    streak: int


class FanRemixContestStartedNotification(TypedDict):
    entity_user_id: int
    entity_id: int


class FanRemixContestEndedNotification(TypedDict):
    entity_user_id: int
    entity_id: int


class FanRemixContestEndingSoonNotification(TypedDict):
    entity_user_id: int
    entity_id: int


class FanRemixContestWinnersSelectedNotification(TypedDict):
    entity_user_id: int
    entity_id: int


class ArtistRemixContestEndedNotification(TypedDict):
    entity_id: int


class ArtistRemixContestEndingSoonNotification(TypedDict):
    entity_user_id: int
    entity_id: int


class ArtistRemixContestSubmissionsNotification(TypedDict):
    event_id: int
    milestone: int
    entity_id: int


NotificationData = Union[
    AnnouncementNotification,
    FollowNotification,
    RepostNotification,
    RepostOfRepostNotification,
    SaveOfRepostNotification,
    SaveNotification,
    RemixNotification,
    CosignRemixNotification,
    CreateTrackNotification,
    CreatePlaylistNotification,
    TastemakerNotification,
    TipReceiveNotification,
    TipSendNotification,
    TrackAddedToPlaylistNotification,
    ChallengeRewardNotification,
    ReactionNotification,
    SupporterRankUpNotification,
    SupportingRankUpNotification,
    SupporterDethronedNotification,
    FollowerMilestoneNotification,
    TrackMilestoneNotification,
    PlaylistMilestoneNotification,
    TierChangeNotification,
    TrendingNotification,
    UsdcPurchaseBuyerNotification,
    UsdcPurchaseSellerNotification,
    CommentNotification,
    CommentThreadNotification,
    CommentMentionNotification,
    CommentReactionNotification,
    ListenStreakReminderNotification,
    FanRemixContestStartedNotification,
    FanRemixContestEndedNotification,
    FanRemixContestEndingSoonNotification,
    FanRemixContestWinnersSelectedNotification,
    ArtistRemixContestEndedNotification,
    ArtistRemixContestEndingSoonNotification,
    ArtistRemixContestSubmissionsNotification,
]


class NotificationAction(TypedDict):
    specifier: str
    type: str
    group_id: str
    timestamp: datetime
    data: NotificationData


class Notification(TypedDict):
    type: str
    group_id: str
    is_seen: bool
    seen_at: datetime
    actions: List[NotificationAction]


notifications_sql = text(
    """
SELECT
    id,
    type,
    specifier,
    timestamp,
    data,
    group_id
FROM notification n
WHERE n.id in :notification_ids
"""
)
notifications_sql = notifications_sql.bindparams(
    bindparam("notification_ids", expanding=True)
)


def get_notifications(session: Session, args: GetNotificationArgs):
    args["valid_types"] = args.get("valid_types", []) + default_valid_notification_types  # type: ignore

    notifications = get_notification_groups(session, args)
    notification_ids = []
    for notification in notifications:
        notification_ids.extend(notification["notification_ids"])

    rows = session.execute(notifications_sql, {"notification_ids": notification_ids})

    notification_id_data: Dict[int, NotificationAction] = defaultdict()
    for row in rows:
        notification_id_data[row[0]] = {
            "type": row[1],
            "specifier": row[2],
            "timestamp": row[3],
            "data": row[4],
            "group_id": row[5],
        }

    notifications_and_actions = [
        {
            **notification,
            "actions": sorted(
                [notification_id_data[id] for id in notification["notification_ids"]],
                key=lambda x: x["specifier"],
            ),
        }
        for notification in notifications
    ]

    # TODO(PAY-1880): Remove this check after launch
    if NotificationType.USDC_PURCHASE_BUYER not in args["valid_types"]:  # type: ignore
        # Filter out usdc create tracks
        filtered: List[NotificationGroup] = []
        for notification in notifications_and_actions:
            is_track = "track_id" in notification["actions"][0]["data"]
            if notification["type"] == NotificationType.CREATE and is_track:
                res = (
                    session.query(Track).filter(
                        Track.track_id == notification["actions"][0]["data"]["track_id"]
                    )
                ).one_or_none()
                if (
                    res
                    and res.stream_conditions
                    and "usdc_purchase" in res.stream_conditions
                ):
                    # Filter out the notification
                    continue
            filtered.append(notification)
        return filtered

    return notifications_and_actions


class GetUnreadNotificationCount(TypedDict):
    user_id: int
    valid_types: Optional[List[NotificationType]]


def get_unread_notification_count(session: Session, args: GetUnreadNotificationCount):
    args["valid_types"] = args.get("valid_types", []) + default_valid_notification_types  # type: ignore
    resultproxy = session.execute(
        unread_notification_count_sql,
        {"user_id": args["user_id"], "valid_types": args.get("valid_types", None)},
    )
    unread_count = 0
    for rowproxy in resultproxy:
        unread_count = rowproxy[0]
    return unread_count
