import json
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Literal, Optional, Set, Tuple, TypedDict, Union

from eth_account.messages import defunct_hash_message
from multiformats import CID, multihash
from sqlalchemy.orm.session import Session
from web3 import Web3
from web3.datastructures import AttributeDict

from src.challenges.challenge_event_bus import ChallengeEventBus
from src.exceptions import IndexingValidationError
from src.models.comments.comment import Comment
from src.models.comments.comment_mention import CommentMention
from src.models.comments.comment_reaction import CommentReaction
from src.models.comments.comment_report import CommentReport
from src.models.comments.comment_thread import CommentThread
from src.models.dashboard_wallet_user.dashboard_wallet_user import DashboardWalletUser
from src.models.events.event import Event, EventType
from src.models.grants.developer_app import DeveloperApp
from src.models.grants.grant import Grant
from src.models.indexing.cid_data import CIDData
from src.models.moderation.muted_user import MutedUser
from src.models.notifications.notification import (
    Notification,
    NotificationSeen,
    PlaylistSeen,
)
from src.models.playlists.playlist import Playlist
from src.models.playlists.playlist_route import PlaylistRoute
from src.models.social.follow import Follow
from src.models.social.repost import Repost
from src.models.social.save import Save
from src.models.social.share import Share
from src.models.social.subscription import Subscription
from src.models.tracks.track import Track
from src.models.tracks.track_route import TrackRoute
from src.models.users.associated_wallet import AssociatedWallet
from src.models.users.user import User
from src.solana.solana_client_manager import SolanaClientManager
from src.tasks.metadata import (
    add_associated_wallet_metadata_format,
    comment_metadata_format,
    encrypted_email_metadata_format,
    event_metadata_format,
    playlist_metadata_format,
    remove_associated_wallet_metadata_format,
    track_comment_notification_setting_format,
    track_download_metadata_format,
    track_metadata_format,
    user_metadata_format,
)
from src.utils import helpers, web3_provider
from src.utils.eth_manager import EthManager
from src.utils.structured_logger import StructuredLogger

utils_logger = StructuredLogger(__name__)

PLAYLIST_ID_OFFSET = 400_000
TRACK_ID_OFFSET = 2_000_000
USER_ID_OFFSET = 3_000_000
COMMENT_ID_OFFSET = 4_000_000
# limits
CHARACTER_LIMIT_USER_BIO = 256
CHARACTER_LIMIT_DESCRIPTION = 2500
PLAYLIST_TRACK_LIMIT = 5000
COMMENT_BODY_LIMIT = 400


class Action(str, Enum):
    CREATE = "Create"
    UPDATE = "Update"
    DELETE = "Delete"
    FOLLOW = "Follow"
    UNFOLLOW = "Unfollow"
    SAVE = "Save"
    UNSAVE = "Unsave"
    REPOST = "Repost"
    UNREPOST = "Unrepost"
    VERIFY = "Verify"
    SUBSCRIBE = "Subscribe"
    UNSUBSCRIBE = "Unsubscribe"
    VIEW = "View"
    VIEW_PLAYLIST = "ViewPlaylist"
    APPROVE = "Approve"
    REJECT = "Reject"
    DOWNLOAD = "Download"
    REACT = "React"
    UNREACT = "Unreact"
    PIN = "Pin"
    UNPIN = "Unpin"
    MUTE = "Mute"
    UNMUTE = "Unmute"
    ADD_EMAIL = "AddEmail"
    REPORT = "Report"
    SHARE = "Share"

    def __str__(self) -> str:
        return str.__str__(self)


class EntityType(str, Enum):
    PLAYLIST = "Playlist"
    TRACK = "Track"
    USER = "User"
    DASHBOARD_WALLET_USER = "DashboardWalletUser"
    USER_WALLET = "UserWallet"
    FOLLOW = "Follow"
    SAVE = "Save"
    REPOST = "Repost"
    SUBSCRIPTION = "Subscription"
    NOTIFICATION_SEEN = "NotificationSeen"
    NOTIFICATION = "Notification"
    PLAYLIST_SEEN = "PlaylistSeen"
    DEVELOPER_APP = "DeveloperApp"
    GRANT = "Grant"
    ASSOCIATED_WALLET = "AssociatedWallet"
    USER_EVENT = "UserEvent"
    STEM = "Stem"
    REMIX = "Remix"
    TRACK_ROUTE = "TrackRoute"
    PLAYLIST_ROUTE = "PlaylistRoute"
    TIP = "Tip"
    COMMENT = "Comment"
    COMMENT_REACTION = "CommentReaction"
    COMMENT_REPORT = "CommentReport"
    COMMENT_THREAD = "CommentThread"
    COMMENT_MENTION = "CommentMention"
    MUTED_USER = "MutedUser"
    COMMENT_NOTIFICATION_SETTING = "CommentNotificationSetting"
    ENCRYPTED_EMAIL = "EncryptedEmail"
    EMAIL_ACCESS = "EmailAccess"
    EVENT = "Event"
    SHARE = "Share"

    def __str__(self) -> str:
        return str.__str__(self)


EntityTypeLiteral = Literal[
    "Playlist",
    "Track",
    "User",
    "Follow",
    "Save",
    "Repost",
    "Subscription",
    "PlaylistSeen",
    "DeveloperApp",
    "Grant",
    "DashboardWalletUser",
    "UserWallet",
]


class RecordDict(TypedDict):
    Playlist: Dict[int, List[Playlist]]
    Track: Dict[int, List[Track]]
    User: Dict[int, List[User]]
    Follow: Dict[Tuple, List[Follow]]
    Save: Dict[Tuple, List[Save]]
    Repost: Dict[Tuple, List[Repost]]
    Share: Dict[Tuple, List[Share]]
    Subscription: Dict[Tuple, List[Subscription]]
    NotificationSeen: Dict[Tuple, List[NotificationSeen]]
    Notification: Dict[Tuple, List[Notification]]
    PlaylistSeen: Dict[Tuple, List[PlaylistSeen]]
    DeveloperApp: Dict[str, List[DeveloperApp]]
    DashboardWalletUser: Dict[str, List[DashboardWalletUser]]
    Grant: Dict[Tuple, List[Grant]]
    Comment: Dict[int, List[Comment]]
    CommentReaction: Dict[Tuple, List[CommentReaction]]
    Event: Dict[int, List[Event]]


class ExistingRecordDict(TypedDict):
    AssociatedWallet: Dict[str, AssociatedWallet]
    Playlist: Dict[int, Playlist]
    Track: Dict[int, Track]
    UserWallet: Dict[str, User]
    User: Dict[int, User]
    Follow: Dict[Tuple, Follow]
    Save: Dict[Tuple, Save]
    Repost: Dict[Tuple, Repost]
    Share: Dict[Tuple, Share]
    Subscription: Dict[Tuple, Subscription]
    PlaylistSeen: Dict[Tuple, PlaylistSeen]
    DeveloperApp: Dict[str, DeveloperApp]
    DashboardWalletUser: Dict[str, DashboardWalletUser]
    Grant: Dict[Tuple, Grant]
    TrackRoute: Dict[int, TrackRoute]
    PlaylistRoute: Dict[int, PlaylistRoute]
    Comment: Dict[int, Comment]
    CommentReaction: Dict[Tuple, CommentReaction]
    CommentReport: Dict[Tuple, CommentReport]
    CommentMention: Dict[Tuple, CommentMention]
    CommentThread: Dict[Tuple, CommentThread]
    MutedUser: Dict[Tuple, MutedUser]
    Event: Dict[int, Event]


class EntitiesToFetchDict(TypedDict):
    Playlist: Set[int]
    Track: Set[int]
    User: Set[int]
    Follow: Set[Tuple]
    Save: Set[Tuple]
    Repost: Set[Tuple]
    Share: Set[Tuple]
    Subscription: Set[Tuple]
    PlaylistSeen: Set[Tuple]
    Grant: Set[Tuple]
    DeveloperApp: Set[str]
    DashboardWalletUser: Set[str]
    TrackRoute: Set[int]
    PlaylistRoute: Set[int]
    UserEvent: Set[int]
    AssociatedWallet: Set[int]
    UserWallet: Set[str]
    Comment: Set[int]
    CommentReaction: Set[Tuple]
    CommentThread: Set[Tuple]
    CommentMention: Set[Tuple]
    CommentNotificationSetting: Set[Tuple]
    MutedUser: Set[Tuple]
    CommentReport: Set[Tuple]
    EncryptedEmail: Set[int]
    EmailAccess: Set[Tuple[int, int, int]]  # (email_owner_id, receiving_id, grantor_id)
    Event: Set[int]


MANAGE_ENTITY_EVENT_TYPE = "ManageEntity"


class ManageEntityParameters:
    """
    A set of parameters for processing a single transactions.

    Most importantly,
    event: the decoded transaction
    new_records: compiles new records based on all transactions in this block
    existing_records: a view of current records relevant to this block

    """

    def __init__(
        self,
        session: Session,
        redis,
        challenge_bus: ChallengeEventBus,
        event: AttributeDict,
        new_records: RecordDict,
        existing_records: ExistingRecordDict,
        pending_track_routes: List[TrackRoute],
        pending_playlist_routes: List[PlaylistRoute],
        eth_manager: EthManager,
        web3: Web3,
        solana_client_manager: SolanaClientManager,
        block_timestamp: int,
        block_number: int,
        event_blockhash: str,
        txhash: str,
        logger: StructuredLogger,
    ):
        self.user_id = helpers.get_tx_arg(event, "_userId")
        self.entity_id = helpers.get_tx_arg(event, "_entityId")
        self.entity_type: EntityTypeLiteral = helpers.get_tx_arg(event, "_entityType")
        self.action = helpers.get_tx_arg(event, "_action")
        self.signer = helpers.get_tx_arg(event, "_signer")
        self.block_datetime = datetime.utcfromtimestamp(block_timestamp)
        self.block_integer_time = int(block_timestamp)

        self.session = session
        self.redis = redis
        self.challenge_bus = challenge_bus
        self.web3 = web3
        self.eth_manager = eth_manager
        self.solana_client_manager = solana_client_manager
        self.pending_track_routes = pending_track_routes
        self.pending_playlist_routes = pending_playlist_routes

        self.event = event
        self.metadata, self.metadata_cid = parse_metadata(
            helpers.get_tx_arg(event, "_metadata"), self.action, self.entity_type
        )
        self.block_number = block_number
        self.event_blockhash = event_blockhash
        self.txhash = txhash
        self.new_records = new_records
        self.existing_records = existing_records
        self.logger = logger  # passed in with EM context

    def add_record(self, key, record, record_type=None):
        if not record_type:
            record_type = self.entity_type
        # add to new records to insert
        self.new_records[record_type][key].append(record)  # type: ignore

        # overwrite the current version of this record
        self.existing_records[record_type][key] = record  # type: ignore

    def add_notification_seen_record(
        self,
        key: Tuple[int, datetime],
        record: NotificationSeen,
    ):
        # notification_seen does not have is_current
        if key not in self.new_records[EntityType.NOTIFICATION_SEEN]:  # type: ignore
            self.new_records[EntityType.NOTIFICATION_SEEN][key].append(record)  # type: ignore
        # If key exists, do nothing

    def add_notification_record(
        self,
        key: datetime,
        record: Notification,
    ):
        if key not in self.new_records[EntityType.NOTIFICATION]:  # type: ignore
            self.new_records[EntityType.NOTIFICATION][key].append(record)  # type: ignore
        # If key exists, do nothing

    def add_playlist_seen_record(
        self,
        key: Tuple[int, int],
        record: PlaylistSeen,
    ):
        if key not in self.new_records[EntityType.PLAYLIST_SEEN]:  # type: ignore
            self.new_records[EntityType.PLAYLIST_SEEN][key].append(record)  # type: ignore
            self.existing_records[EntityType.PLAYLIST_SEEN][key] = record  # type: ignore
        # If key exists, do nothing


# Whether to expect valid metadata json based on the action and entity type
def expect_cid_metadata_json(metadata, action, entity_type):
    # TODO after single tx sign up is fully rolled out, expect metadata
    # for CREATE USER txs, so remove this clause
    if action == Action.CREATE and entity_type == EntityType.USER:
        return False
    # TODO(michelle) validate metadata for notification, developer app,
    # and grant types here
    if entity_type in [
        EntityType.NOTIFICATION,
        EntityType.GRANT,
        EntityType.DEVELOPER_APP,
        EntityType.DASHBOARD_WALLET_USER,
    ]:
        return False
    if action in [
        Action.REPOST,
        Action.UNREPOST,
        Action.SAVE,
        Action.UNSAVE,
        Action.FOLLOW,
        Action.UNFOLLOW,
        Action.SUBSCRIBE,
        Action.UNSUBSCRIBE,
        Action.APPROVE,
        Action.REJECT,
    ]:
        return False
    if not metadata:
        return False
    return True


# Returns metadata_type, metadata_format
def get_metadata_type_and_format(entity_type, action=None):
    if entity_type == EntityType.PLAYLIST:
        metadata_type = "playlist_data"
        metadata_format = playlist_metadata_format
    elif entity_type == EntityType.TRACK:
        metadata_type = "track"
        if action == Action.MUTE or action == Action.UNMUTE:
            metadata_format = track_comment_notification_setting_format
        elif action == Action.DOWNLOAD:
            metadata_format = track_download_metadata_format
        else:
            metadata_format = track_metadata_format
    elif entity_type == EntityType.USER:
        metadata_type = "user"
        metadata_format = user_metadata_format
    elif entity_type == EntityType.COMMENT:
        metadata_type = "comment"
        metadata_format = comment_metadata_format
    elif entity_type == EntityType.ENCRYPTED_EMAIL:
        metadata_type = "encrypted_email"
        metadata_format = encrypted_email_metadata_format
    elif (
        entity_type == EntityType.ASSOCIATED_WALLET
        and action == Action.CREATE
        or action == Action.DELETE
    ):
        metadata_type = "associated_wallet"
        metadata_format = (
            add_associated_wallet_metadata_format
            if action == Action.CREATE
            else remove_associated_wallet_metadata_format
        )
    elif entity_type == EntityType.EVENT:
        metadata_type = "event"
        metadata_format = event_metadata_format
    else:
        raise IndexingValidationError(f"Unknown metadata type ${entity_type}")
    return metadata_type, metadata_format


def get_metadata_from_json(default_metadata_fields, resp_json):
    metadata = {}
    for parameter, value in default_metadata_fields.items():
        metadata[parameter] = (
            resp_json.get(parameter) if resp_json.get(parameter) is not None else value
        )
    return metadata


def sanitize_json(json_resp):
    sanitized_data = (
        json.dumps(json_resp, ensure_ascii=False)
        .encode("utf-8", "ignore")
        .decode("utf-8", "ignore")
    )
    return json.loads(sanitized_data)


# Returns metadata, cid
def parse_metadata(metadata: str, action: str, entity_type: str):
    if not expect_cid_metadata_json(metadata, action, entity_type):
        return metadata, None
    try:
        data = sanitize_json(json.loads(metadata))
        if "cid" not in data.keys() or "data" not in data.keys():
            raise IndexingValidationError("required keys missing in metadata")

        cid = data["cid"]
        metadata_json = data["data"]

        # Don't format metadata for UPDATEs
        # This is to support partial updates
        # Individual entities are responsible for updating existing records with metadata
        if action != Action.UPDATE:
            _, metadata_format = get_metadata_type_and_format(entity_type, action)
            formatted_json = get_metadata_from_json(metadata_format, metadata_json)

            # Only index valid changes
            if formatted_json == metadata_format:
                raise IndexingValidationError("no valid metadata changes detected")
        else:
            formatted_json = metadata_json

        return formatted_json, cid
    except Exception as e:
        utils_logger.info(
            f"entity_manager.py | utils.py | error deserializing metadata {metadata}: {e}"
        )
        raise IndexingValidationError(e)


def save_cid_metadata(
    session: Session, cid_metadata: Dict[str, Dict], cid_type: Dict[str, str]
):
    if not cid_metadata:
        return

    for cid, val in cid_metadata.items():
        cid_data = CIDData(cid=cid, type=cid_type[cid], data=val)
        session.merge(cid_data)


def get_record_key(user_id: int, entity_type: str, entity_id: int):
    return (user_id, entity_type.capitalize(), entity_id)


def copy_record(
    old_record: Union[
        User,
        Track,
        Playlist,
        DeveloperApp,
        Grant,
        DashboardWalletUser,
        Comment,
        CommentReaction,
        CommentMention,
        MutedUser,
        Event,
    ],
    block_number: int,
    event_blockhash: str,
    txhash: str,
    block_datetime: datetime,
):
    old_user_attributes = old_record.get_attributes_dict()
    record_copy = type(old_record)()
    for key, value in old_user_attributes.items():
        if key == "is_current":
            setattr(record_copy, key, False)
        elif key == "updated_at":
            setattr(record_copy, key, block_datetime)
        elif key == "blocknumber":
            setattr(record_copy, key, block_number)
        elif key == "blockhash":
            setattr(record_copy, key, event_blockhash)
        elif key == "txhash":
            setattr(record_copy, key, txhash)
        else:
            setattr(record_copy, key, value)
    return record_copy


# Resets all context fields attached to last processed event.
def reset_entity_manager_event_tx_context(logger: StructuredLogger, eventArgs: dict):
    logger.update_context(eventArgs)
    logger.reset_context_key("isApp")
    logger.reset_context_key("appName")
    logger.reset_context_key("userHandle")


def validate_signer(params: ManageEntityParameters, user_override=None):
    # Ensure the signer is either the user or authorized to perform action for the user
    user = user_override or (
        params.existing_records["User"][params.user_id]
        if params.user_id in params.existing_records["User"]
        else None
    )
    if not user:
        raise IndexingValidationError(f"User {params.user_id} does not exist")
    wallet = user.wallet
    signer = params.signer.lower()
    signer_matches_user = wallet and wallet.lower() == signer
    if signer_matches_user:
        params.logger.set_context("isApp", "false")
    else:
        params.logger.set_context("isApp", "unknown")
        grant_key = (signer, user.user_id)
        grant_exists = grant_key in params.existing_records["Grant"]
        if grant_exists:
            grant = params.existing_records["Grant"][grant_key]
            developer_app = (
                None
                if not params.existing_records["DeveloperApp"]
                else params.existing_records["DeveloperApp"].get(signer, None)
            )  # applicable if user-to-app grant
            user_grantee = (
                None
                if not params.existing_records["UserWallet"]
                else params.existing_records["UserWallet"].get(signer, None)
            )  # applicable if user-to-user grant, e.g. manager mode
            is_valid_developer_app = (
                not (not developer_app) and not developer_app.is_delete
            )

            is_valid_user_grantee = (
                not (not user_grantee) and not user_grantee.is_deactivated
            )

            is_grant_approved = grant.is_approved == True or is_valid_developer_app

            if (
                (not is_valid_developer_app and not is_valid_user_grantee)
                or grant.is_revoked
                or not is_grant_approved
            ):
                raise IndexingValidationError(
                    f"Signer is not authorized to perform action for user {user.user_id}"
                )
            if (
                is_valid_developer_app and developer_app
            ):  # have to include redundant `and developer_app` because mypy can't work properly without it
                params.logger.set_context("isApp", "true")
                params.logger.set_context(
                    "appName",
                    developer_app.name,
                )
            elif (
                is_valid_user_grantee and user_grantee
            ):  # have to include redundant `and user_grantee` because mypy can't work properly without it
                params.logger.set_context("isApp", "true - user to user")
                params.logger.set_context("appName", user_grantee.handle)
            params.logger.set_context(
                "userHandle",
                user.handle,
            )
        else:
            raise IndexingValidationError(
                f"Signer does not match user {user.user_id} or an authorized wallet"
            )


# Generate a cid from a json object
def generate_metadata_cid_v1(metadata: object):
    encoded_metadata = json.dumps(metadata).encode("utf-8")
    bytes = bytearray(encoded_metadata)
    hash = multihash.digest(bytes, "sha2-256")
    return CID("base32", 1, "json", hash)


# Signature should be of the form: { signature: string, message: string }
def get_address_from_signature(signature):
    web3 = web3_provider.get_eth_web3()
    message_hash = defunct_hash_message(text=signature["message"])
    app_address = web3.eth.account._recover_hash(
        message_hash, signature=signature["signature"]
    )
    return app_address.lower()


def parse_release_date(release_date_str):
    # try various time formats
    if not release_date_str:
        return None

    try:
        return datetime.strptime(
            release_date_str, "%a %b %d %Y %H:%M:%S GMT%z"
        ).astimezone(timezone.utc)
    except ValueError:
        pass

    try:
        return datetime.strptime(release_date_str, "%Y-%m-%dT%H:%M:%S.%fZ").astimezone(
            timezone.utc
        )
    except ValueError:
        pass

    try:
        return datetime.fromtimestamp(int(release_date_str)).astimezone(timezone.utc)
    except (ValueError, TypeError):
        pass

    return None


def convert_legacy_purchase_access_gate(owner_id: int, access_gate: dict):
    """Converts the legacy splits in a purchase gate to the new array format"""
    if access_gate and "usdc_purchase" in access_gate:
        # Legacy purchase gates have a split dictionary instead of array
        if isinstance(access_gate["usdc_purchase"]["splits"], dict):
            # Legacy client uploads only have one split, and it's to the owner
            access_gate["usdc_purchase"]["splits"] = [
                {"user_id": owner_id, "percentage": 100.0}
            ]
    return access_gate


def safe_add_notification(session: Session, notification: Notification):
    """Add a notification to the session if an identical one doesn't already exist.

    Args:
        session: The database session
        notification: The notification to add
    """
    group_id = notification.group_id
    specifier = notification.specifier
    notification_type = notification.type

    existing_notification = (
        session.query(Notification)
        .filter_by(type=notification_type, group_id=group_id, specifier=specifier)
        .first()
    )

    if existing_notification is None:
        session.add(notification)


def create_remix_contest_notification(
    session: Session,
    track: Track,
    block_number: Optional[int] = None,
    block_datetime: Optional[datetime] = None,
):
    """Create notifications for followers and favoriters when a track with a remix contest becomes public.
    This is the base function used by both the entity manager and scheduled release flows.

    Args:
        session: The database session
        track: The track that became public
        block_number: Optional block number for the notification (used by entity manager)
        block_datetime: Optional block datetime for the notification (used by entity manager)
    """
    # Check for an active remix contest event for this track
    remix_contest_event = (
        session.query(Event)
        .filter(
            Event.event_type == EventType.remix_contest,
            Event.entity_id == track.track_id,
            Event.is_deleted == False,
        )
        .first()
    )

    if not remix_contest_event:
        return

    # Get all followers of the event creator
    follower_user_ids = (
        session.query(Follow.follower_user_id)
        .filter(
            Follow.followee_user_id == remix_contest_event.user_id,
            Follow.is_current == True,
            Follow.is_delete == False,
        )
        .all()
    )

    # Get all users who favorited the track
    save_user_ids = (
        session.query(Save.user_id)
        .filter(
            Save.save_item_id == track.track_id,
            Save.save_type == "track",
            Save.is_current == True,
            Save.is_delete == False,
        )
        .all()
    )

    # Combine and deduplicate user IDs
    user_ids = list(
        set(
            [user_id for (user_id,) in follower_user_ids]
            + [user_id for (user_id,) in save_user_ids]
        )
    )

    if not user_ids:
        return

    # Use provided block info or fall back to track info
    notification_block_number = (
        block_number if block_number is not None else track.blocknumber
    )
    notification_timestamp = (
        block_datetime if block_datetime is not None else track.updated_at
    )
    utils_logger.info(
        f"Creating fan remix contest started notification for track {track.track_id} by user {remix_contest_event.user_id}"
    )
    utils_logger.info(
        f"group_id: fan_remix_contest_started:{track.track_id}:user:{remix_contest_event.user_id}"
    )

    # Create individual notification for each user
    for user_id in user_ids:
        notification = Notification(
            blocknumber=notification_block_number,
            user_ids=[user_id],
            timestamp=notification_timestamp,
            type="fan_remix_contest_started",
            specifier=str(user_id),
            group_id=f"fan_remix_contest_started:{track.track_id}:user:{remix_contest_event.user_id}",
            data={
                "entity_user_id": track.owner_id,
                "entity_id": track.track_id,
            },
        )
        safe_add_notification(session, notification)
