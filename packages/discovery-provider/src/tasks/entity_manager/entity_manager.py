import json
import time
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Set, Tuple, cast

from eth_utils import to_hex
from sqlalchemy import and_, func, literal_column, or_
from sqlalchemy.orm.session import Session
from web3.types import TxReceipt

from src.challenges.challenge_event_bus import ChallengeEventBus
from src.database_task import DatabaseTask
from src.exceptions import IndexingValidationError
from src.models.comments.comment import Comment
from src.models.comments.comment_mention import CommentMention
from src.models.comments.comment_notification_setting import CommentNotificationSetting
from src.models.comments.comment_reaction import CommentReaction
from src.models.comments.comment_report import CommentReport
from src.models.comments.comment_thread import CommentThread
from src.models.dashboard_wallet_user.dashboard_wallet_user import DashboardWalletUser
from src.models.events.event import Event, EventEntityType
from src.models.grants.developer_app import DeveloperApp
from src.models.grants.grant import Grant
from src.models.indexing.revert_block import RevertBlock
from src.models.indexing.skipped_transaction import SkippedTransaction
from src.models.moderation.muted_user import MutedUser
from src.models.notifications.notification import NotificationSeen, PlaylistSeen
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
from src.models.users.email import EmailAccess, EncryptedEmail
from src.models.users.user import User
from src.models.users.user_events import UserEvent
from src.tasks.entity_manager.entities.comment import (
    create_comment,
    delete_comment,
    pin_comment,
    react_comment,
    report_comment,
    unpin_comment,
    unreact_comment,
    update_comment,
    update_comment_notification_setting,
)
from src.tasks.entity_manager.entities.dashboard_wallet_user import (
    create_dashboard_wallet_user,
    delete_dashboard_wallet_user,
)
from src.tasks.entity_manager.entities.developer_app import (
    create_developer_app,
    delete_developer_app,
    update_developer_app,
)
from src.tasks.entity_manager.entities.email import (
    create_encrypted_email,
    grant_email_access,
)
from src.tasks.entity_manager.entities.event import (
    create_event,
    delete_event,
    update_event,
)
from src.tasks.entity_manager.entities.grant import (
    approve_grant,
    create_grant,
    reject_grant,
    revoke_grant,
)
from src.tasks.entity_manager.entities.muted_user import mute_user, unmute_user
from src.tasks.entity_manager.entities.notification import (
    create_notification,
    view_notification,
    view_playlist,
)
from src.tasks.entity_manager.entities.playlist import (
    create_playlist,
    delete_playlist,
    update_playlist,
)
from src.tasks.entity_manager.entities.social_features import (
    action_to_record_types,
    create_social_action_types,
    create_social_record,
    delete_social_action_types,
    delete_social_record,
)
from src.tasks.entity_manager.entities.tip_reactions import tip_reaction
from src.tasks.entity_manager.entities.track import (
    create_track,
    delete_track,
    download_track,
    update_track,
)
from src.tasks.entity_manager.entities.user import (
    add_associated_wallet,
    create_user,
    remove_associated_wallet,
    update_user,
    verify_user,
)
from src.tasks.entity_manager.utils import (
    Action,
    EntitiesToFetchDict,
    EntityType,
    ManageEntityParameters,
    RecordDict,
    expect_cid_metadata_json,
    get_address_from_signature,
    get_record_key,
    parse_metadata,
    reset_entity_manager_event_tx_context,
    save_cid_metadata,
)
from src.utils import helpers
from src.utils.config import shared_config
from src.utils.indexing_errors import IndexingError
from src.utils.prometheus_metric import PrometheusMetric, PrometheusMetricNames
from src.utils.structured_logger import StructuredLogger

logger = StructuredLogger(__name__)

# Please toggle below variable to true for development
ENABLE_DEVELOPMENT_FEATURES = True

environment = shared_config["discprov"]["env"]

entity_type_table_mapping = {
    "Save": Save.__tablename__,
    "Repost": Repost.__tablename__,
    "Share": Share.__tablename__,
    "Follow": Follow.__tablename__,
    "Subscription": Subscription.__tablename__,
    "Playlist": Playlist.__tablename__,
    "Track": Track.__tablename__,
    "User": User.__tablename__,
    "AssociatedWallet": AssociatedWallet.__tablename__,
    "UserEvent": UserEvent.__tablename__,
    "TrackRoute": TrackRoute.__tablename__,
    "PlaylistRoute": PlaylistRoute.__tablename__,
    "NotificationSeen": NotificationSeen.__tablename__,
    "PlaylistSeen": PlaylistSeen.__tablename__,
    "DashboardWalletUser": DashboardWalletUser.__tablename__,
    "DeveloperApp": DeveloperApp.__tablename__,
    "Grant": Grant.__tablename__,
    "Comment": Comment.__tablename__,
    "CommentMention": CommentMention.__tablename__,
    "CommentReaction": CommentReaction.__tablename__,
    "MutedUser": MutedUser.__tablename__,
    "CommentNotificationSetting": CommentNotificationSetting.__tablename__,
    "EncryptedEmail": EncryptedEmail.__tablename__,
    "EmailAccess": EmailAccess.__tablename__,
}


def get_record_columns(record) -> List[str]:
    columns = [str(m.key) for m in record.__table__.columns]
    return columns


def entity_manager_update(
    update_task: DatabaseTask,
    session: Session,
    entity_manager_txs: List[TxReceipt],
    block_number: int,
    block_timestamp: int,
    block_hash: str,
) -> Tuple[int, Dict[str, Set[(int)]]]:
    """
    Process a block of EM transactions.

    1. Fetch relevant entities for all transactions.
    2. Process transactions based on type and action.
    3. Validate transaction.
    4. Create new database record based on a transaction.
    5. Bulk insert new records.
    """
    try:
        update_start_time = time.time()
        challenge_bus: ChallengeEventBus = update_task.challenge_event_bus

        with challenge_bus.use_scoped_dispatch_queue():
            num_total_changes = 0

            changed_entity_ids: Dict[str, Set[(int)]] = defaultdict(set)
            if not entity_manager_txs:
                return num_total_changes, changed_entity_ids

            metric_latency = PrometheusMetric(
                PrometheusMetricNames.ENTITY_MANAGER_UPDATE_DURATION_SECONDS
            )
            metric_num_changed = PrometheusMetric(
                PrometheusMetricNames.ENTITY_MANAGER_UPDATE_CHANGED_LATEST
            )

            # collect events by entity type and action
            entities_to_fetch = collect_entities_to_fetch(
                update_task, entity_manager_txs
            )
            # fetch existing tracks and playlists
            existing_records, existing_records_in_json = fetch_existing_entities(
                session, entities_to_fetch
            )
            # copy original record since existing_records will be modified
            original_records = copy_original_records(existing_records)

            new_records: RecordDict = cast(
                RecordDict, defaultdict(lambda: defaultdict(list))
            )

            pending_track_routes: List[TrackRoute] = []
            pending_playlist_routes: List[PlaylistRoute] = []

            # cid -> metadata type
            cid_type: Dict[str, str] = {}
            # cid -> metadata
            cid_metadata: Dict[str, Dict] = {}

            # process in tx order and populate records_to_save
            for tx_receipt in entity_manager_txs:
                indexing_start_time = time.perf_counter()
                txhash = to_hex(tx_receipt["transactionHash"])
                logger.set_context("tx_hash", txhash)
                entity_manager_event_tx = get_entity_manager_events_tx(
                    update_task, tx_receipt
                )

                for event in entity_manager_event_tx:
                    try:
                        params = ManageEntityParameters(
                            session,
                            update_task.redis,
                            challenge_bus,
                            event,
                            new_records,  # actions below populate these records
                            existing_records,
                            pending_track_routes,
                            pending_playlist_routes,
                            update_task.eth_manager,
                            update_task.web3,
                            update_task.solana_client_manager,
                            block_timestamp,
                            block_number,
                            block_hash,
                            txhash,
                            logger,
                        )

                        # update logger context with this tx event
                        reset_entity_manager_event_tx_context(logger, event["args"])

                        if (
                            params.action == Action.CREATE
                            and params.entity_type == EntityType.PLAYLIST
                        ):
                            create_playlist(params)
                        elif (
                            params.action == Action.UPDATE
                            and params.entity_type == EntityType.PLAYLIST
                        ):
                            update_playlist(params)
                        elif (
                            params.action == Action.DELETE
                            and params.entity_type == EntityType.PLAYLIST
                        ):
                            delete_playlist(params)
                        elif (
                            params.action == Action.CREATE
                            and params.entity_type == EntityType.TRACK
                            and ENABLE_DEVELOPMENT_FEATURES
                        ):
                            create_track(params)
                        elif (
                            params.action == Action.UPDATE
                            and params.entity_type == EntityType.TRACK
                            and ENABLE_DEVELOPMENT_FEATURES
                        ):
                            update_track(params)

                        elif (
                            params.action == Action.DELETE
                            and params.entity_type == EntityType.TRACK
                            and ENABLE_DEVELOPMENT_FEATURES
                        ):
                            delete_track(params)
                        elif (
                            params.action == Action.DOWNLOAD
                            and params.entity_type == EntityType.TRACK
                        ):
                            download_track(params)
                        elif (
                            params.action == Action.MUTE
                            or params.action == Action.UNMUTE
                        ) and params.entity_type == EntityType.TRACK:
                            update_comment_notification_setting(params)
                        elif params.action in create_social_action_types:
                            create_social_record(params)
                        elif params.action in delete_social_action_types:
                            delete_social_record(params)
                        elif (
                            params.action == Action.CREATE
                            and params.entity_type == EntityType.USER
                            and ENABLE_DEVELOPMENT_FEATURES
                        ):
                            create_user(params)
                        elif (
                            params.action == Action.UPDATE
                            and params.entity_type == EntityType.USER
                            and ENABLE_DEVELOPMENT_FEATURES
                        ):
                            update_user(params)
                        elif (
                            params.action == Action.VERIFY
                            and params.entity_type == EntityType.USER
                            and ENABLE_DEVELOPMENT_FEATURES
                        ):
                            verify_user(params)
                        elif (
                            params.action == Action.MUTE
                            and params.entity_type == EntityType.USER
                        ):
                            mute_user(params)
                        elif (
                            params.action == Action.UNMUTE
                            and params.entity_type == EntityType.USER
                        ):
                            unmute_user(params)
                        elif (
                            params.action == Action.VIEW
                            and params.entity_type == EntityType.NOTIFICATION
                            and ENABLE_DEVELOPMENT_FEATURES
                        ):
                            view_notification(params)
                        elif (
                            params.action == Action.CREATE
                            and params.entity_type == EntityType.NOTIFICATION
                            and ENABLE_DEVELOPMENT_FEATURES
                        ):
                            create_notification(params)
                        elif (
                            params.action == Action.VIEW_PLAYLIST
                            and params.entity_type == EntityType.NOTIFICATION
                            and ENABLE_DEVELOPMENT_FEATURES
                        ):
                            view_playlist(params)
                        elif (
                            params.action == Action.CREATE
                            and params.entity_type == EntityType.DEVELOPER_APP
                        ):
                            create_developer_app(params)
                        elif (
                            params.action == Action.UPDATE
                            and params.entity_type == EntityType.DEVELOPER_APP
                        ):
                            update_developer_app(params)
                        elif (
                            params.action == Action.DELETE
                            and params.entity_type == EntityType.DEVELOPER_APP
                        ):
                            delete_developer_app(params)
                        elif (
                            params.action == Action.CREATE
                            and params.entity_type == EntityType.GRANT
                        ):
                            create_grant(params)
                        elif (
                            params.action == Action.DELETE
                            and params.entity_type == EntityType.GRANT
                        ):
                            revoke_grant(params)
                        elif (
                            params.action == Action.APPROVE
                            and params.entity_type == EntityType.GRANT
                        ):
                            approve_grant(params)
                        elif (
                            params.action == Action.REJECT
                            and params.entity_type == EntityType.GRANT
                        ):
                            reject_grant(params)
                        elif (
                            params.action == Action.CREATE
                            and params.entity_type == EntityType.DASHBOARD_WALLET_USER
                        ):
                            create_dashboard_wallet_user(params)
                        elif (
                            params.action == Action.DELETE
                            and params.entity_type == EntityType.DASHBOARD_WALLET_USER
                        ):
                            delete_dashboard_wallet_user(params)
                        elif (
                            params.action == Action.UPDATE
                            and params.entity_type == EntityType.TIP
                        ):
                            tip_reaction(params)
                        elif (
                            params.action == Action.CREATE
                            and params.entity_type == EntityType.COMMENT
                        ):
                            create_comment(params)
                        elif (
                            params.action == Action.UPDATE
                            and params.entity_type == EntityType.COMMENT
                        ):
                            update_comment(params)
                        elif (
                            params.action == Action.DELETE
                            and params.entity_type == EntityType.COMMENT
                        ):
                            delete_comment(params)
                        elif (
                            params.action == Action.REACT
                            and params.entity_type == EntityType.COMMENT
                        ):
                            react_comment(params)
                        elif (
                            params.action == Action.UNREACT
                            and params.entity_type == EntityType.COMMENT
                        ):
                            unreact_comment(params)
                        elif (
                            params.action == Action.PIN
                            and params.entity_type == EntityType.COMMENT
                        ):
                            pin_comment(params)
                        elif (
                            params.action == Action.UNPIN
                            and params.entity_type == EntityType.COMMENT
                        ):
                            unpin_comment(params)
                        elif (
                            params.action == Action.REPORT
                            and params.entity_type == EntityType.COMMENT
                        ):
                            report_comment(params)
                        elif (
                            params.action == Action.MUTE
                            or params.action == Action.UNMUTE
                        ) and params.entity_type == EntityType.COMMENT:
                            update_comment_notification_setting(params)
                        elif (
                            params.action == Action.ADD_EMAIL
                            and params.entity_type == EntityType.ENCRYPTED_EMAIL
                        ):
                            create_encrypted_email(params)
                        elif (
                            params.action == Action.UPDATE
                            and params.entity_type == EntityType.EMAIL_ACCESS
                        ):
                            grant_email_access(params)
                        elif (
                            params.action == Action.CREATE
                            and params.entity_type == EntityType.ASSOCIATED_WALLET
                        ):
                            add_associated_wallet(params)
                        elif (
                            params.action == Action.DELETE
                            and params.entity_type == EntityType.ASSOCIATED_WALLET
                        ):
                            remove_associated_wallet(params)
                        elif (
                            params.action == Action.CREATE
                            and params.entity_type == EntityType.EVENT
                        ):
                            create_event(params)
                        elif (
                            params.action == Action.UPDATE
                            and params.entity_type == EntityType.EVENT
                        ):
                            update_event(params)
                        elif (
                            params.action == Action.DELETE
                            and params.entity_type == EntityType.EVENT
                        ):
                            delete_event(params)

                        logger.debug("process transaction")  # log event context
                    except IndexingValidationError as e:
                        # swallow exception to keep indexing
                        logger.error(f"failed to process transaction error {e}")
                    except Exception as e:
                        indexing_error = IndexingError(
                            "tx-failure",
                            block_number,
                            block_hash,
                            txhash,
                            str(e),
                        )
                        logger.error(
                            f"entity_manager.py | Indexing error {e}", exc_info=True
                        )
                        create_and_raise_indexing_error(indexing_error, session)
                        logger.error(f"skipping transaction hash {indexing_error}")

                indexing_duration = time.perf_counter() - indexing_start_time
                logger.info(f"Entity manager tx indexed in {indexing_duration:.3f}s")

            # compile records_to_save
            save_new_records(
                block_timestamp,
                block_number,
                new_records,
                original_records,
                existing_records_in_json,
                session,
            )

            num_total_changes += len(new_records)
            # update metrics
            metric_latency.save_time(
                {"scope": "entity_manager_update"},
                start_time=update_start_time,
            )
            metric_num_changed.save(
                len(new_records["Playlist"]), {"entity_type": EntityType.PLAYLIST.value}
            )
            metric_num_changed.save(
                len(new_records["Track"]), {"entity_type": EntityType.TRACK.value}
            )

            logger.debug(
                f"entity_manager.py | Completed with {num_total_changes} total changes"
            )

            # bulk save to metadata to cid_data
            if cid_metadata:
                save_cid_metadata_time = time.time()
                save_cid_metadata(session, cid_metadata, cid_type)
                metric_latency.save_time(
                    {"scope": "save_cid_metadata"},
                    start_time=save_cid_metadata_time,
                )
                logger.debug(
                    f"entity_manager.py | save_cid_metadata in {time.time() - save_cid_metadata_time}s"
                )
    except Exception as e:
        logger.error(f"entity_manager.py | Exception occurred {e}", exc_info=True)
        raise e
    return num_total_changes, changed_entity_ids


def save_new_records(
    block_timestamp: int,
    block_number: int,
    new_records: RecordDict,
    original_records: dict,
    existing_records_in_json: dict[str, dict],
    session: Session,
):
    prev_records: Dict[str, List] = defaultdict(list)
    records_to_update = []
    for record_type, record_dict in new_records.items():
        # This is actually a dict, but python has a hard time inferring.
        casted_record_dict = cast(dict, record_dict)
        for entity_id, records in casted_record_dict.items():
            if not records:
                continue
            record_to_delete = None
            records_to_add = []
            # invalidate old records
            if (
                record_type in original_records
                and entity_id in original_records[record_type]
                and (
                    "is_current"
                    not in get_record_columns(original_records[record_type][entity_id])
                    or original_records[record_type][entity_id].is_current
                )
            ):
                if record_type == "PlaylistRoute" or record_type == "TrackRoute":
                    # these are an exception since we want to keep is_current false to preserve old slugs
                    original_records[record_type][entity_id].is_current = False
                else:
                    record_to_delete = original_records[record_type][entity_id]
                # add the json record for revert blocks
                prev_records[entity_type_table_mapping[record_type]].append(
                    existing_records_in_json[record_type][entity_id]
                )
            # invalidate all new records except the last
            for record in records:
                if "is_current" in get_record_columns(record):
                    record.is_current = False

                if "updated_at" in get_record_columns(record):
                    record.updated_at = datetime.utcfromtimestamp(block_timestamp)
            if "is_current" in get_record_columns(records[-1]):
                records[-1].is_current = True
            if record_type == "PlaylistRoute" or record_type == "TrackRoute":
                records_to_add.extend(records)
            else:
                records_to_add.append(records[-1])
            records_to_update.append((record_to_delete, records_to_add))
    if prev_records:
        revert_block = RevertBlock(blocknumber=block_number, prev_records=prev_records)
        session.add(revert_block)
        session.flush()
    for record_to_delete, records_to_add in records_to_update:
        if record_to_delete:
            session.delete(record_to_delete)
        session.flush()
        session.add_all(records_to_add)


def copy_original_records(existing_records):
    original_records = {}
    for entity_type in existing_records:
        original_records[entity_type] = {}
        for entity_id, entity in existing_records[entity_type].items():
            original_records[entity_type][entity_id] = entity
    return original_records


entity_types_to_fetch = set(
    [
        EntityType.USER,
        EntityType.TRACK,
        EntityType.PLAYLIST,
        EntityType.COMMENT,
        EntityType.ENCRYPTED_EMAIL,
    ]
)


def collect_entities_to_fetch(update_task, entity_manager_txs):
    entities_to_fetch: Dict[EntityType, Set] = defaultdict(set)

    for tx_receipt in entity_manager_txs:
        entity_manager_event_tx = get_entity_manager_events_tx(update_task, tx_receipt)
        for event in entity_manager_event_tx:
            entity_id = helpers.get_tx_arg(event, "_entityId")
            entity_type = helpers.get_tx_arg(event, "_entityType")
            action = helpers.get_tx_arg(event, "_action")
            user_id = helpers.get_tx_arg(event, "_userId")
            metadata = helpers.get_tx_arg(event, "_metadata")
            signer = helpers.get_tx_arg(event, "_signer")

            if entity_type in entity_types_to_fetch:
                entities_to_fetch[entity_type].add(entity_id)
            if entity_type == EntityType.USER:
                entities_to_fetch[EntityType.USER_EVENT].add(user_id)
                if action == Action.MUTE or action == Action.UNMUTE:
                    entities_to_fetch[EntityType.MUTED_USER].add((user_id, entity_id))
                    entities_to_fetch[EntityType.USER].add(entity_id)

            if entity_type == EntityType.TRACK:
                entities_to_fetch[EntityType.TRACK_ROUTE].add(entity_id)
                if action == Action.MUTE or action == Action.UNMUTE:
                    entities_to_fetch[EntityType.COMMENT_NOTIFICATION_SETTING].add(
                        (user_id, entity_id, entity_type)
                    )
            if entity_type == EntityType.PLAYLIST:
                entities_to_fetch[EntityType.PLAYLIST_ROUTE].add(entity_id)
            if entity_type == EntityType.EVENT:
                entities_to_fetch[EntityType.EVENT].add(entity_id)
                entities_to_fetch[EntityType.USER].add(user_id)

                if action != Action.DELETE:
                    try:
                        json_metadata = json.loads(metadata)
                    except Exception as e:
                        logger.error(
                            f"tasks | entity_manager.py | Exception deserializing {action} {entity_type} event metadata: {e}"
                        )
                        # skip invalid metadata
                        continue

                    event_entity_type = json_metadata.get("data", {}).get("entity_type")
                    if event_entity_type == EventEntityType.track:
                        event_entity_id = json_metadata.get("data", {}).get("entity_id")
                        entities_to_fetch[EntityType.TRACK].add(event_entity_id)

            if entity_type == EntityType.COMMENT:
                if (
                    action == Action.CREATE
                    or action == Action.UPDATE
                    or action == Action.PIN
                    or action == Action.UNPIN
                    or action == Action.REACT
                ):
                    try:
                        json_metadata = json.loads(metadata)
                    except Exception as e:
                        logger.error(
                            f"tasks | entity_manager.py | Exception deserializing {action} {entity_type} event metadata: {e}"
                        )
                        # skip invalid metadata
                        continue
                    track_id = json_metadata.get("data", {}).get("entity_id")
                    entities_to_fetch[EntityType.TRACK].add(track_id)
                    entities_to_fetch[EntityType.COMMENT_NOTIFICATION_SETTING].add(
                        (user_id, entity_id, entity_type)
                    )

                    parent_comment_id = json_metadata.get("data", {}).get(
                        "parent_comment_id"
                    )
                    if parent_comment_id:
                        entities_to_fetch[EntityType.COMMENT].add(parent_comment_id)
                        entities_to_fetch[EntityType.COMMENT_THREAD].add(
                            (parent_comment_id, entity_id)
                        )
                if action == Action.UPDATE:
                    entities_to_fetch[EntityType.COMMENT_MENTION].add(entity_id)
                elif action == Action.REACT or action == Action.UNREACT:
                    entities_to_fetch[EntityType.COMMENT_REACTION].add(
                        (user_id, entity_id)
                    )
                elif action == Action.REPORT:
                    entities_to_fetch[EntityType.COMMENT_REPORT].add(
                        (user_id, entity_id)
                    )
                elif action == Action.MUTE or action == Action.UNMUTE:
                    entities_to_fetch[EntityType.COMMENT_NOTIFICATION_SETTING].add(
                        (user_id, entity_id, entity_type)
                    )

            if (
                entity_type == EntityType.NOTIFICATION
                and action == Action.VIEW_PLAYLIST
            ):
                entities_to_fetch[EntityType.PLAYLIST_SEEN].add((user_id, entity_id))
                entities_to_fetch[EntityType.PLAYLIST].add(entity_id)
            if user_id:
                entities_to_fetch[EntityType.USER].add(user_id)
            if signer:
                entities_to_fetch[EntityType.GRANT].add((signer.lower(), user_id))
                entities_to_fetch[EntityType.DEVELOPER_APP].add(signer.lower())
                entities_to_fetch[EntityType.USER_WALLET].add(signer.lower())
            if entity_type == EntityType.DEVELOPER_APP:
                try:
                    json_metadata = json.loads(metadata)
                except Exception as e:
                    logger.error(
                        f"tasks | entity_manager.py | Exception deserializing {action} {entity_type} event metadata: {e}"
                    )
                    # skip invalid metadata
                    continue

                raw_address = json_metadata.get("address", None)
                if raw_address:
                    entities_to_fetch[EntityType.DEVELOPER_APP].add(raw_address.lower())
                else:
                    try:
                        address_from_signature = get_address_from_signature(
                            json_metadata.get("app_signature", {})
                        )
                        entities_to_fetch[EntityType.DEVELOPER_APP].add(
                            address_from_signature
                        )
                        if action == Action.CREATE:
                            entities_to_fetch[EntityType.USER_WALLET].add(
                                address_from_signature
                            )
                    except:
                        logger.error(
                            "tasks | entity_manager.py | Missing address or valid app signature in metadata required for add developer app tx"
                        )
            if entity_type == EntityType.GRANT:
                try:
                    json_metadata = json.loads(metadata)
                except Exception as e:
                    logger.error(
                        f"tasks | entity_manager.py | Exception deserializing {action} {entity_type} event metadata: {e}"
                    )
                    # skip invalid metadata
                    continue

                raw_grantee_address = json_metadata.get("grantee_address", None)
                if raw_grantee_address:
                    entities_to_fetch[EntityType.GRANT].add(
                        (raw_grantee_address.lower(), user_id)
                    )
                    entities_to_fetch[EntityType.DEVELOPER_APP].add(
                        raw_grantee_address.lower()
                    )
                    entities_to_fetch[EntityType.USER_WALLET].add(
                        raw_grantee_address.lower()
                    )
                    if action == Action.DELETE and signer:
                        entities_to_fetch[EntityType.GRANT].add(
                            (signer.lower(), raw_grantee_address.lower())
                        )
                        entities_to_fetch[EntityType.GRANT].add(
                            (signer.lower(), user_id)
                        )
                raw_grantor_user_id = json_metadata.get("grantor_user_id", None)
                if raw_grantor_user_id and signer:
                    entities_to_fetch[EntityType.GRANT].add(
                        (user_id, raw_grantor_user_id)
                    )
                    entities_to_fetch[EntityType.GRANT].add(
                        (signer.lower(), raw_grantor_user_id)
                    )
            if entity_type == EntityType.DASHBOARD_WALLET_USER:
                try:
                    json_metadata = json.loads(metadata)
                except Exception as e:
                    logger.error(
                        f"tasks | entity_manager.py | Exception deserializing {action} {entity_type} event metadata: {e}"
                    )
                    # skip invalid metadata
                    continue

                raw_wallet = json_metadata.get("wallet", None)
                if raw_wallet:
                    entities_to_fetch[EntityType.DASHBOARD_WALLET_USER].add(
                        raw_wallet.lower()
                    )
                else:
                    logger.error(
                        "tasks | entity_manager.py | Missing wallet in metadata required for create dashboard wallet user tx"
                    )

            # Query social operations as needed
            if action in action_to_record_types.keys():
                record_types = action_to_record_types[action]
                for record_type in record_types:
                    entity_key = get_record_key(user_id, entity_type, entity_id)
                    entities_to_fetch[record_type].add(entity_key)

            if expect_cid_metadata_json(metadata, action, entity_type):
                try:
                    json_metadata, _ = parse_metadata(metadata, action, entity_type)
                except Exception:
                    # skip invalid metadata
                    continue

                # Add playlist track ids in entities to fetch
                # to prevent playlists from including gated tracks
                playlist_contents = json_metadata.get("playlist_contents")
                if playlist_contents:
                    if isinstance(playlist_contents, dict):
                        tracks = playlist_contents.get("track_ids", [])
                    else:
                        tracks = playlist_contents

                    for track in tracks:
                        track_id = track.get("track") or track.get("track_id")
                        if track_id:
                            entities_to_fetch[EntityType.TRACK].add(track_id)

                if entity_type == EntityType.TRACK:
                    user_id = json_metadata.get("ai_attribution_user_id")
                    if user_id:
                        entities_to_fetch[EntityType.USER].add(user_id)

                if entity_type == EntityType.ASSOCIATED_WALLET:
                    wallet = json_metadata.get("wallet_address")
                    if wallet:
                        entities_to_fetch[EntityType.ASSOCIATED_WALLET].add(wallet)
                    entities_to_fetch[EntityType.USER].add(user_id)

            if entity_type == EntityType.ENCRYPTED_EMAIL:
                try:
                    json_metadata = json.loads(metadata)
                except Exception as e:
                    logger.error(
                        f"tasks | entity_manager.py | Exception deserializing {action} {entity_type} event metadata: {e}"
                    )
                    # skip invalid metadata
                    continue

                # Add email owner's record to fetch
                email_owner_user_id = json_metadata.get("email_owner_user_id")
                if email_owner_user_id:
                    entities_to_fetch[EntityType.ENCRYPTED_EMAIL].add(
                        email_owner_user_id
                    )

            if entity_type == EntityType.EMAIL_ACCESS and action == Action.UPDATE:
                try:
                    json_metadata = json.loads(metadata)
                except Exception as e:
                    logger.error(
                        f"tasks | entity_manager.py | Exception deserializing {action} {entity_type} event metadata: {e}"
                    )
                    # skip invalid metadata
                    continue

                # Add email access record to fetch
                email_owner_user_id = json_metadata.get("email_owner_user_id")
                for access_grant in json_metadata.get("access_grants", []):
                    receiving_user_id = access_grant.get("receiving_user_id")
                    grantor_user_id = access_grant.get("grantor_user_id")
                    if all([email_owner_user_id, receiving_user_id, grantor_user_id]):
                        entities_to_fetch[EntityType.EMAIL_ACCESS].add(
                            (email_owner_user_id, receiving_user_id, grantor_user_id)
                        )
                        # Also fetch the email record
                        entities_to_fetch[EntityType.ENCRYPTED_EMAIL].add(
                            email_owner_user_id
                        )

    return entities_to_fetch


def fetch_existing_entities(session: Session, entities_to_fetch: EntitiesToFetchDict):
    existing_entities: Dict[EntityType, Dict] = defaultdict(dict)
    existing_entities_in_json: Dict[EntityType, Dict] = defaultdict(dict)

    # PLAYLISTS
    if entities_to_fetch["Playlist"]:
        playlists: List[Tuple[Playlist, dict]] = (
            session.query(
                Playlist, literal_column(f"row_to_json({Playlist.__tablename__})")
            )
            .filter(
                Playlist.playlist_id.in_(entities_to_fetch["Playlist"]),
                Playlist.is_current == True,
            )
            .all()
        )
        existing_entities[EntityType.PLAYLIST] = {
            playlist.playlist_id: playlist for playlist, _ in playlists
        }
        existing_entities_in_json[EntityType.PLAYLIST] = {
            playlist_json["playlist_id"]: playlist_json
            for _, playlist_json in playlists
        }

    # TRACKS
    if entities_to_fetch["Track"]:
        tracks: List[Tuple[Track, dict]] = (
            session.query(Track, literal_column(f"row_to_json({Track.__tablename__})"))
            .filter(
                Track.track_id.in_(entities_to_fetch["Track"]),
                Track.is_current == True,
            )
            .all()
        )
        existing_entities[EntityType.TRACK] = {
            track.track_id: track for track, _ in tracks
        }
        existing_entities_in_json[EntityType.TRACK] = {
            track_json["track_id"]: track_json for _, track_json in tracks
        }

    if entities_to_fetch["TrackRoute"]:
        track_routes: List[Tuple[TrackRoute, dict]] = (
            session.query(
                TrackRoute, literal_column(f"row_to_json({TrackRoute.__tablename__})")
            )
            .filter(
                TrackRoute.track_id.in_(entities_to_fetch["TrackRoute"]),
                TrackRoute.is_current == True,
            )
            .all()
        )
        existing_entities[EntityType.TRACK_ROUTE] = {
            track_route.track_id: track_route for track_route, _ in track_routes
        }
        existing_entities_in_json[EntityType.TRACK_ROUTE] = {
            track_route_json["track_id"]: track_route_json
            for _, track_route_json in track_routes
        }

    if entities_to_fetch["PlaylistRoute"]:
        playlist_routes: List[Tuple[PlaylistRoute, dict]] = (
            session.query(
                PlaylistRoute,
                literal_column(f"row_to_json({PlaylistRoute.__tablename__})"),
            )
            .filter(
                PlaylistRoute.playlist_id.in_(entities_to_fetch["PlaylistRoute"]),
                PlaylistRoute.is_current == True,
            )
            .all()
        )
        existing_entities[EntityType.PLAYLIST_ROUTE] = {
            playlist_route.playlist_id: playlist_route
            for playlist_route, _ in playlist_routes
        }
        existing_entities_in_json[EntityType.PLAYLIST_ROUTE] = {
            playlist_route_json["playlist_id"]: playlist_route_json
            for _, playlist_route_json in playlist_routes
        }

    # USERS
    if entities_to_fetch["User"]:
        users: List[Tuple[User, dict]] = (
            session.query(User, literal_column(f"row_to_json({User.__tablename__})"))
            .filter(
                User.user_id.in_(entities_to_fetch["User"]),
                User.is_current == True,
            )
            .all()
        )
        existing_entities[EntityType.USER] = {user.user_id: user for user, _ in users}
        existing_entities_in_json[EntityType.USER] = {
            user_json["user_id"]: user_json for _, user_json in users
        }

    if entities_to_fetch["UserEvent"]:
        user_events: List[Tuple[UserEvent, dict]] = (
            session.query(
                UserEvent, literal_column(f"row_to_json({UserEvent.__tablename__})")
            )
            .filter(
                UserEvent.user_id.in_(entities_to_fetch["UserEvent"]),
                UserEvent.is_current == True,
            )
            .all()
        )
        existing_entities[EntityType.USER_EVENT] = {
            user_event.user_id: user_event for user_event, _ in user_events
        }
        existing_entities_in_json[EntityType.USER_EVENT] = {
            user_event_json["user_id"]: user_event_json
            for _, user_event_json in user_events
        }

    if entities_to_fetch["AssociatedWallet"]:
        associated_wallets: List[Tuple[AssociatedWallet, dict]] = (
            session.query(
                AssociatedWallet,
                literal_column(f"row_to_json({AssociatedWallet.__tablename__})"),
            )
            .filter(
                AssociatedWallet.wallet.in_(entities_to_fetch["AssociatedWallet"]),
                AssociatedWallet.is_current == True,
            )
            .all()
        )
        existing_entities[EntityType.ASSOCIATED_WALLET] = {
            wallet.wallet: [wallet for wallet, _ in associated_wallets]
            for wallet, _ in associated_wallets
        }
        existing_entities_in_json[EntityType.ASSOCIATED_WALLET] = {
            wallet_json["wallet"]: [
                wallet_json for _, wallet_json in associated_wallets
            ]
            for _, wallet_json in associated_wallets
        }

    # FOLLOWS
    if entities_to_fetch["Follow"]:
        follow_ops_to_fetch: Set[Tuple] = entities_to_fetch["Follow"]
        and_queries = []
        for follow_to_fetch in follow_ops_to_fetch:
            follower = follow_to_fetch[0]
            # follows does not need entity type in follow_to_fetch[1]
            followee = follow_to_fetch[2]
            and_queries.append(
                and_(
                    Follow.followee_user_id == followee,
                    Follow.follower_user_id == follower,
                    Follow.is_current == True,
                )
            )
        follows: List[Tuple[Follow, dict]] = (
            session.query(
                Follow, literal_column(f"row_to_json({Follow.__tablename__})")
            )
            .filter(or_(*and_queries))
            .all()
        )
        existing_entities[EntityType.FOLLOW] = {
            get_record_key(
                follow.follower_user_id, EntityType.USER, follow.followee_user_id
            ): follow
            for follow, _ in follows
        }
        existing_entities_in_json[EntityType.FOLLOW] = {
            get_record_key(
                follow_json["follower_user_id"],
                EntityType.USER,
                follow_json["followee_user_id"],
            ): follow_json
            for _, follow_json in follows
        }

    # SAVES
    if entities_to_fetch["Save"]:
        saves_to_fetch: Set[Tuple] = entities_to_fetch["Save"]
        and_queries = []
        for save_to_fetch in saves_to_fetch:
            user_id = save_to_fetch[0]
            entity_type = save_to_fetch[1]
            entity_id = save_to_fetch[2]
            and_queries.append(
                and_(
                    Save.user_id == user_id,
                    Save.save_type == entity_type.lower(),
                    Save.save_item_id == entity_id,
                    Save.is_current == True,
                )
            )
        saves: List[Tuple[Save, dict]] = (
            session.query(Save, literal_column(f"row_to_json({Save.__tablename__})"))
            .filter(or_(*and_queries))
            .all()
        )
        existing_entities[EntityType.SAVE] = {
            get_record_key(save.user_id, save.save_type, save.save_item_id): save
            for save, _ in saves
        }
        existing_entities_in_json[EntityType.SAVE] = {
            get_record_key(
                save_json["user_id"], save_json["save_type"], save_json["save_item_id"]
            ): save_json
            for _, save_json in saves
        }

    # REPOSTS
    if entities_to_fetch["Repost"]:
        reposts_to_fetch: Set[Tuple] = entities_to_fetch["Repost"]
        and_queries = []
        for repost_to_fetch in reposts_to_fetch:
            user_id = repost_to_fetch[0]
            entity_type = repost_to_fetch[1]
            entity_id = repost_to_fetch[2]
            and_queries.append(
                and_(
                    Repost.user_id == user_id,
                    Repost.repost_type == entity_type.lower(),
                    Repost.repost_item_id == entity_id,
                    Repost.is_current == True,
                )
            )
        reposts: List[Tuple[Repost, dict]] = (
            session.query(
                Repost, literal_column(f"row_to_json({Repost.__tablename__})")
            )
            .filter(or_(*and_queries))
            .all()
        )
        existing_entities[EntityType.REPOST] = {
            get_record_key(
                repost.user_id, repost.repost_type, repost.repost_item_id
            ): repost
            for repost, _ in reposts
        }
        existing_entities_in_json[EntityType.REPOST] = {
            get_record_key(
                respost_json["user_id"],
                respost_json["repost_type"],
                respost_json["repost_item_id"],
            ): respost_json
            for _, respost_json in reposts
        }

    # SHARES
    if entities_to_fetch["Share"]:
        shares_to_fetch: Set[Tuple] = entities_to_fetch["Share"]
        and_queries = []
        for share_to_fetch in shares_to_fetch:
            user_id = share_to_fetch[0]
            entity_type = share_to_fetch[1]
            entity_id = share_to_fetch[2]
            and_queries.append(
                and_(
                    Share.user_id == user_id,
                    Share.share_type == entity_type.lower(),
                    Share.share_item_id == entity_id,
                )
            )
        shares: List[Tuple[Share, dict]] = (
            session.query(Share, literal_column(f"row_to_json({Share.__tablename__})"))
            .filter(or_(*and_queries))
            .all()
        )
        existing_entities[EntityType.SHARE] = {
            get_record_key(share.user_id, share.share_type, share.share_item_id): share
            for share, _ in shares
        }
        existing_entities_in_json[EntityType.SHARE] = {
            get_record_key(
                share_json["user_id"],
                share_json["share_type"],
                share_json["share_item_id"],
            ): share_json
            for _, share_json in shares
        }

    # SUBSCRIPTIONS
    if entities_to_fetch["Subscription"]:
        subscriptions_to_fetch: Set[Tuple] = entities_to_fetch["Subscription"]
        and_queries = []
        for subscription_to_fetch in subscriptions_to_fetch:
            user_id = subscription_to_fetch[0]
            # subscriptions does not need entity type in subscription_to_fetch[1]
            entity_id = subscription_to_fetch[2]
            and_queries.append(
                and_(
                    Subscription.subscriber_id == user_id,
                    Subscription.user_id == entity_id,
                    Subscription.is_current == True,
                )
            )
        subscriptions: List[Tuple[Subscription, dict]] = (
            session.query(
                Subscription,
                literal_column(f"row_to_json({Subscription.__tablename__})"),
            )
            .filter(or_(*and_queries))
            .all()
        )
        existing_entities[EntityType.SUBSCRIPTION] = {
            get_record_key(
                subscription.subscriber_id, EntityType.USER, subscription.user_id
            ): subscription
            for subscription, _ in subscriptions
        }
        existing_entities_in_json[EntityType.SUBSCRIPTION] = {
            get_record_key(
                sub_json["subscriber_id"], EntityType.USER, sub_json["user_id"]
            ): sub_json
            for _, sub_json in subscriptions
        }

    # PLAYLIST SEEN
    if entities_to_fetch["PlaylistSeen"]:
        playlist_seen_to_fetch: Set[Tuple] = entities_to_fetch["PlaylistSeen"]
        and_queries = []
        for playlist_seen in playlist_seen_to_fetch:
            user_id = playlist_seen[0]
            playlist_id = playlist_seen[1]
            and_queries.append(
                and_(
                    PlaylistSeen.user_id == user_id,
                    PlaylistSeen.playlist_id == playlist_id,
                    PlaylistSeen.is_current == True,
                )
            )

        playlist_seens: List[Tuple[PlaylistSeen, dict]] = (
            session.query(
                PlaylistSeen,
                literal_column(f"row_to_json({PlaylistSeen.__tablename__})"),
            )
            .filter(or_(*and_queries))
            .all()
        )
        existing_entities[EntityType.PLAYLIST_SEEN] = {
            (playlist_seen.user_id, playlist_seen.playlist_id): playlist_seen
            for playlist_seen, _ in playlist_seens
        }
        existing_entities_in_json[EntityType.PLAYLIST_SEEN] = {
            (seen_json["user_id"], seen_json["playlist_id"]): seen_json
            for _, seen_json in playlist_seens
        }
    # USERS BY WALLET
    if entities_to_fetch["UserWallet"]:
        users_by_wallet: List[User] = (
            session.query(User)
            .filter(
                func.lower(User.wallet).in_(entities_to_fetch["UserWallet"]),
                User.is_current == True,
            )
            .all()
        )
        existing_entities[EntityType.USER_WALLET] = {
            (cast(str, user.wallet)).lower(): user for user in users_by_wallet
        }
    # GRANTS
    if entities_to_fetch["Grant"]:
        grants_to_fetch: Set[Tuple] = entities_to_fetch["Grant"]
        and_queries = []
        for grant_key in grants_to_fetch:
            grantee_address_or_user_id = grant_key[0]
            if isinstance(grantee_address_or_user_id, int):
                try:
                    grantee_address = existing_entities[EntityType.USER][
                        grantee_address_or_user_id
                    ].wallet.lower()
                    if not grantee_address:
                        continue
                except:
                    continue
            else:
                grantee_address = grantee_address_or_user_id

            grantor_address_or_user_id = grant_key[1]
            if isinstance(grantor_address_or_user_id, str):
                try:
                    grantor_user_id = existing_entities[EntityType.USER_WALLET][
                        grantor_address_or_user_id
                    ].user_id
                    if not grantor_user_id:
                        continue
                except:
                    continue
            else:
                grantor_user_id = grantor_address_or_user_id
            and_queries.append(
                and_(
                    Grant.user_id == grantor_user_id,
                    func.lower(Grant.grantee_address) == grantee_address,
                    Grant.is_current == True,
                )
            )

        grants: List[Tuple[Grant, dict]] = (
            session.query(Grant, literal_column(f"row_to_json({Grant.__tablename__})"))
            .filter(or_(*and_queries))
            .all()
        )
        existing_entities[EntityType.GRANT] = {
            (grant.grantee_address.lower(), grant.user_id): grant for grant, _ in grants
        }
        existing_entities_in_json[EntityType.GRANT] = {
            (grant_json["grantee_address"].lower(), grant_json["user_id"]): grant_json
            for _, grant_json in grants
        }
        for grant, _ in grants:
            entities_to_fetch["DeveloperApp"].add(grant.grantee_address.lower())
    # APP DEVELOPER APPS
    if entities_to_fetch["DeveloperApp"]:
        developer_apps: List[Tuple[DeveloperApp, dict]] = (
            session.query(
                DeveloperApp,
                literal_column(f"row_to_json({DeveloperApp.__tablename__})"),
            )
            .filter(
                func.lower(DeveloperApp.address).in_(entities_to_fetch["DeveloperApp"]),
                DeveloperApp.is_current == True,
            )
            .all()
        )
        existing_entities[EntityType.DEVELOPER_APP] = {
            developer_app.address.lower(): developer_app
            for developer_app, _ in developer_apps
        }
        existing_entities_in_json[EntityType.DEVELOPER_APP] = {
            app_json["address"].lower(): app_json for _, app_json in developer_apps
        }

    # DASHBOARD WALLETS
    if entities_to_fetch["DashboardWalletUser"]:
        dashboard_wallets: List[Tuple[DashboardWalletUser, dict]] = (
            session.query(
                DashboardWalletUser,
                literal_column(f"row_to_json({DashboardWalletUser.__tablename__})"),
            )
            .filter(
                func.lower(DashboardWalletUser.wallet).in_(
                    entities_to_fetch["DashboardWalletUser"]
                )
            )
            .all()
        )
        existing_entities[EntityType.DASHBOARD_WALLET_USER] = {
            dashboard_wallet.wallet.lower(): dashboard_wallet
            for dashboard_wallet, _ in dashboard_wallets
        }
        existing_entities_in_json[EntityType.DASHBOARD_WALLET_USER] = {
            dashboard_wallet_json["wallet"].lower(): dashboard_wallet_json
            for _, dashboard_wallet_json in dashboard_wallets
        }

    if entities_to_fetch["Event"]:
        events: List[Tuple[Event, dict]] = (
            session.query(Event, literal_column(f"row_to_json({Event.__tablename__})"))
            .filter(Event.event_id.in_(entities_to_fetch["Event"]))
            .all()
        )
        existing_entities[EntityType.EVENT] = {
            event.event_id: event for event, _ in events
        }
        existing_entities_in_json[EntityType.EVENT] = {
            event_json["event_id"]: event_json for _, event_json in events
        }

    if entities_to_fetch["Comment"]:
        comments: List[Tuple[Comment, dict]] = (
            session.query(
                Comment,
                literal_column(f"row_to_json({Comment.__tablename__})"),
            )
            .filter(Comment.comment_id.in_(entities_to_fetch["Comment"]))
            .all()
        )
        existing_entities[EntityType.COMMENT] = {
            comment.comment_id: comment for comment, _ in comments
        }
        existing_entities_in_json[EntityType.COMMENT] = {
            comment_json["comment_id"]: comment_json for _, comment_json in comments
        }
    if entities_to_fetch[EntityType.COMMENT_REACTION.value]:
        comment_reaction_to_fetch: Set[Tuple] = entities_to_fetch[
            EntityType.COMMENT_REACTION.value
        ]
        or_queries = []
        for comment_reaction in comment_reaction_to_fetch:
            user_id, comment_id = comment_reaction
            or_queries.append(
                or_(
                    CommentReaction.user_id == user_id,
                    CommentReaction.comment_id == comment_id,
                )
            )

        comment_reactions: List[Tuple[CommentReaction, dict]] = (
            session.query(
                CommentReaction,
                literal_column(f"row_to_json({CommentReaction.__tablename__})"),
            )
            .filter(or_(*or_queries))
            .all()
        )
        existing_entities[EntityType.COMMENT_REACTION] = {
            (comment_reaction.user_id, comment_reaction.comment_id): comment_reaction
            for comment_reaction, _ in comment_reactions
        }
        existing_entities_in_json[EntityType.COMMENT_REACTION] = {
            (comment_json["user_id"], comment_json["comment_id"]): comment_json
            for _, comment_json in comment_reactions
        }
    if entities_to_fetch[EntityType.COMMENT_THREAD.value]:
        comment_threads_to_fetch: Set[Tuple] = entities_to_fetch[
            EntityType.COMMENT_THREAD.value
        ]

        or_queries = []
        for comment_thread in comment_threads_to_fetch:
            parent_comment_id, comment_id = comment_thread
            or_queries.append(
                or_(
                    CommentThread.parent_comment_id == parent_comment_id,
                    CommentThread.comment_id == comment_id,
                )
            )

        comment_threads = session.query(CommentThread).filter(or_(*or_queries)).all()

        existing_entities[EntityType.COMMENT_THREAD] = {
            (
                comment_thread.parent_comment_id,
                comment_thread.comment_id,
            ): comment_thread
            for comment_thread in comment_threads
        }
    if entities_to_fetch[EntityType.COMMENT_MENTION.value]:
        comment_ids = entities_to_fetch[EntityType.COMMENT_MENTION.value]

        or_queries = []
        for comment_id in comment_ids:
            or_queries.append(or_(CommentMention.comment_id == comment_id))

        comment_mentions = (
            session.query(
                CommentMention,
                literal_column(f"row_to_json({CommentMention.__tablename__})"),
            )
            .filter(or_(*or_queries))
            .all()
        )

        existing_entities[EntityType.COMMENT_MENTION] = {
            (comment_mention.comment_id, comment_mention.user_id): comment_mention
            for comment_mention, _ in comment_mentions
        }
        existing_entities_in_json[EntityType.COMMENT_MENTION] = {
            (comment_json["comment_id"], comment_json["user_id"]): comment_json
            for _, comment_json in comment_mentions
        }

    if entities_to_fetch[EntityType.MUTED_USER.value]:
        muted_users_to_fetch: Set[Tuple] = entities_to_fetch[
            EntityType.MUTED_USER.value
        ]
        or_queries = []
        for muted_user in muted_users_to_fetch:
            user_id, muted_user_id = muted_user
            or_queries.append(
                or_(
                    MutedUser.user_id == user_id,
                    MutedUser.muted_user_id == muted_user_id,
                )
            )

        muted_users: List[Tuple[MutedUser, dict]] = (
            session.query(
                MutedUser,
                literal_column(f"row_to_json({MutedUser.__tablename__})"),
            )
            .filter(or_(*or_queries))
            .all()
        )
        existing_entities[EntityType.MUTED_USER] = {
            (muted_user.user_id, muted_user.muted_user_id): muted_user
            for muted_user, _ in muted_users
        }
        existing_entities_in_json[EntityType.MUTED_USER] = {
            (
                muted_user_json["user_id"],
                muted_user_json["muted_user_id"],
            ): muted_user_json
            for _, muted_user_json in muted_users
        }
    if entities_to_fetch[EntityType.COMMENT_REPORT.value]:
        comment_reports_to_fetch: Set[Tuple] = entities_to_fetch[
            EntityType.COMMENT_REPORT.value
        ]
        or_queries = []
        for comment_report in comment_reports_to_fetch:
            user_id, comment_id = comment_report
            or_queries.append(
                or_(
                    CommentReport.user_id == user_id,
                    CommentReport.comment_id == comment_id,
                )
            )

        comment_reports: List[Tuple[CommentReport, dict]] = (
            session.query(
                CommentReport,
                literal_column(f"row_to_json({CommentReport.__tablename__})"),
            )
            .filter(or_(*or_queries))
            .all()
        )
        existing_entities[EntityType.COMMENT_REPORT] = {
            (
                comment_reports.user_id,
                comment_reports.comment_id,
            ): comment_reports
            for comment_reports, _ in comment_reports
        }
        existing_entities_in_json[EntityType.COMMENT_REPORT] = {
            (
                comment_report_json["user_id"],
                comment_report_json["comment_id"],
            ): comment_report_json
            for _, comment_report_json in comment_reports
        }

    if entities_to_fetch[EntityType.COMMENT_NOTIFICATION_SETTING.value]:
        comment_notification_settings_to_fetch: Set[Tuple] = entities_to_fetch[
            EntityType.COMMENT_NOTIFICATION_SETTING.value
        ]
        or_queries = []
        for comment_notification_setting in comment_notification_settings_to_fetch:
            user_id, entity_id, entity_type = comment_notification_setting
            or_queries.append(
                or_(
                    CommentNotificationSetting.user_id == user_id,
                    CommentNotificationSetting.entity_id == entity_id,
                    CommentNotificationSetting.entity_type == entity_type,
                )
            )

        comment_notification_settings: List[Tuple[CommentNotificationSetting, dict]] = (
            session.query(
                CommentNotificationSetting,
                literal_column(
                    f"row_to_json({CommentNotificationSetting.__tablename__})"
                ),
            )
            .filter(or_(*or_queries))
            .all()
        )
        existing_entities[EntityType.COMMENT_NOTIFICATION_SETTING] = {
            (
                comment_notification_setting.user_id,
                comment_notification_setting.entity_id,
                comment_notification_setting.entity_type,
            ): comment_notification_setting
            for comment_notification_setting, _ in comment_notification_settings
        }
        existing_entities_in_json[EntityType.COMMENT_NOTIFICATION_SETTING] = {
            (
                comment_notification_setting["user_id"],
                comment_notification_setting["entity_id"],
                comment_notification_setting["entity_type"],
            ): comment_notification_setting
            for _, comment_notification_setting in comment_notification_settings
        }

    # Add new email-related entity fetching
    if entities_to_fetch[EntityType.ENCRYPTED_EMAIL.value]:
        encrypted_emails: List[Tuple[EncryptedEmail, dict]] = (
            session.query(
                EncryptedEmail,
                literal_column(f"row_to_json({EncryptedEmail.__tablename__})"),
            )
            .filter(
                EncryptedEmail.email_owner_user_id.in_(
                    entities_to_fetch[EntityType.ENCRYPTED_EMAIL.value]
                )
            )
            .all()
        )
        existing_entities[EntityType.ENCRYPTED_EMAIL] = {
            encrypted_email.email_owner_user_id: encrypted_email
            for encrypted_email, _ in encrypted_emails
        }
        existing_entities_in_json[EntityType.ENCRYPTED_EMAIL] = {
            encrypted_email_json["email_owner_user_id"]: encrypted_email_json
            for _, encrypted_email_json in encrypted_emails
        }

    if entities_to_fetch[EntityType.EMAIL_ACCESS.value]:
        access_grants_to_fetch: Set[Tuple[int, int, int]] = entities_to_fetch[
            EntityType.EMAIL_ACCESS.value
        ]
        or_queries = []
        for access_grant in access_grants_to_fetch:
            email_owner_id, receiving_id, grantor_id = access_grant
            or_queries.append(
                and_(
                    EmailAccess.email_owner_user_id == email_owner_id,
                    EmailAccess.receiving_user_id == receiving_id,
                    EmailAccess.grantor_user_id == grantor_id,
                )
            )

        access_grants: List[Tuple[EmailAccess, dict]] = (
            session.query(
                EmailAccess,
                literal_column(f"row_to_json({EmailAccess.__tablename__})"),
            )
            .filter(or_(*or_queries))
            .all()
        )
        existing_entities[EntityType.EMAIL_ACCESS] = {
            (
                grant.email_owner_user_id,
                grant.receiving_user_id,
                grant.grantor_user_id,
            ): grant
            for grant, _ in access_grants
        }
        existing_entities_in_json[EntityType.EMAIL_ACCESS] = {
            (
                grant_json["email_owner_user_id"],
                grant_json["receiving_user_id"],
                grant_json["grantor_user_id"],
            ): grant_json
            for _, grant_json in access_grants
        }

    return existing_entities, existing_entities_in_json


def get_entity_manager_events_tx(update_task, tx_receipt: TxReceipt):
    return [tx_receipt]


def create_and_raise_indexing_error(err, session):
    logger.error(
        f"Error in the indexing task at"
        f" block={err.blocknumber} and hash={err.txhash}"
    )

    # Record skipped transaction to db
    skipped_tx = SkippedTransaction(
        blocknumber=err.blocknumber,
        blockhash=err.blockhash,
        txhash=err.txhash,
    )
    session.add(skipped_tx)
